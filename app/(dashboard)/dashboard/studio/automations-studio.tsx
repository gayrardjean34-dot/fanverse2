'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import useSWR, { mutate } from 'swr';
import {
  Loader2,
  Send,
  Download,
  ImagePlus,
  X,
  Coins,
  AlertTriangle,
  Upload as UploadIcon,
  Lock,
  ShieldAlert,
  CheckSquare,
  Square,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type UserData = {
  id: number;
  unlockedAutomations?: string[];
  freeUnlockUsed?: boolean;
};

// Compress image client-side to stay under Vercel's 4.5MB limit
function compressImage(file: File, maxWidth = 2048, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    if (file.size < 2 * 1024 * 1024) {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Compression failed')); return; }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

// Automation definitions
const AUTOMATIONS = {
  'infinite-selfies': {
    id: 'infinite-selfies',
    name: 'Infinite Selfies',
    icon: '📸',
    description: 'Generate unlimited selfies from a reference photo',
    creditPerImage: 22,
    requiresRefImage: true,
    maxQuantity: 50,
    modelFilter: 'automation-selfie',
  },
  'face-swap': {
    id: 'face-swap',
    name: 'EZ Face Swap',
    icon: '🔄',
    description: 'Swap faces from a reference photo onto up to 15 target images',
    creditPerImage: 22,
    requiresRefImage: true,
    maxQuantity: 15,
    modelFilter: 'automation-faceswap',
  },
  'ez-face-swap-uncensored': {
    id: 'ez-face-swap-uncensored',
    name: 'EZ Face Swap Semi-Uncensored (beta)',
    icon: '🚀',
    description: 'Advanced face swap with fewer restrictions - beta version',
    creditPerImage: 25,
    requiresRefImage: true,
    maxQuantity: 15,
    modelFilter: 'automation-faceswap-uncensored',
  },
} as const;

type AutomationId = keyof typeof AUTOMATIONS;
const AUTOMATION_IDS = Object.keys(AUTOMATIONS) as AutomationId[];

type Generation = {
  id: number;
  batchId: string;
  model: string;
  prompt: string;
  status: string;
  resultUrl: string | null;
  resultData: { images?: string[]; cleanifyFailed?: boolean } | null;
  creditCost: number;
  error: string | null;
  createdAt: string;
};

// ── Helper functions ──
function getDownloadUrl(url: string): string {
  return `/api/generate/download?url=${encodeURIComponent(url)}`;
}

function getAutomationName(model: string): string {
  if (model === 'automation-selfie') return 'Infinite Selfies';
  if (model === 'automation-faceswap') return 'EZ Face Swap';
  if (model === 'automation-faceswap-uncensored') return 'EZ Face Swap Semi-Uncensored (beta)';
  return 'Unknown Automation';
}

// ── Image Lightbox (matching models-studio style) ──
function AutomationMediaModal({
  gen,
  onClose,
  onDelete,
}: {
  gen: Generation;
  onClose: () => void;
  onDelete: (id: number) => void;
}) {
  const cleanifyFailed = gen.resultData?.cleanifyFailed === true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#222] border border-[#333] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">{gen.model}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-[#333] text-gray-400">⚡ Automation</span>
            <span className="text-xs text-gray-500">{gen.creditCost} cr</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {gen.status === 'completed' && gen.resultUrl && (
          <img src={gen.resultUrl} alt="Generated" className="w-full rounded-xl mb-4 max-h-[50vh] object-contain bg-black" />
        )}

        {gen.status === 'failed' && (
          <div className="flex items-center justify-center h-48 bg-[#1a1a1a] rounded-xl mb-4">
            <div className="text-center">
              <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-2" />
              <p className="text-red-400 font-medium">Generation Failed</p>
              {gen.error && <p className="text-red-400/60 text-sm mt-1 max-w-md">{gen.error}</p>}
            </div>
          </div>
        )}

        {/* Cleanify warning */}
        {cleanifyFailed && gen.status === 'completed' && (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 mb-4">
            <ShieldAlert className="h-4 w-4 text-yellow-400 shrink-0" />
            <p className="text-xs text-yellow-400">
              Metadata cleaning failed for this image. The original AI metadata may still be present.
            </p>
          </div>
        )}

        {gen.status === 'completed' && gen.resultUrl && (
          <div className="flex gap-2">
            <a
              href={getDownloadUrl(gen.resultUrl)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#28B8F6] text-[#191919] text-sm font-medium hover:bg-[#28B8F6]/80 transition-colors"
            >
              <Download className="h-4 w-4" /> Download
            </a>
            <button
              onClick={() => {
                if (confirm('Delete this image?')) {
                  onDelete(gen.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
            >
              <X className="h-4 w-4" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Generation Card ──
function AutomationGenCard({
  gen,
  onClick,
  selected,
  onToggleSelect,
  selectionMode,
}: {
  gen: Generation;
  onClick: () => void;
  selected: boolean;
  onToggleSelect: () => void;
  selectionMode: boolean;
}) {
  const isPending = gen.status === 'pending' || gen.status === 'processing';
  const isFailed = gen.status === 'failed';
  const cleanifyFailed = gen.resultData?.cleanifyFailed === true;

  function handleClick(e: React.MouseEvent) {
    if (selectionMode) {
      e.stopPropagation();
      onToggleSelect();
    } else {
      onClick();
    }
  }

  return (
    <div
      className={`relative group rounded-xl overflow-hidden border transition-all cursor-pointer ${
        selected
          ? 'border-[#28B8F6] ring-2 ring-[#28B8F6]/30'
          : isFailed
          ? 'border-red-500/30 bg-[#222]'
          : isPending
          ? 'border-[#7F6DE7]/30 bg-[#222]'
          : 'border-[#333] bg-[#222] hover:border-[#7F6DE7]/50'
      }`}
      onClick={handleClick}
      title={getAutomationName(gen.model)} // Tooltip with automation name
    >
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          {selected ? <CheckSquare className="h-5 w-5 text-[#28B8F6]" /> : <Square className="h-5 w-5 text-gray-400" />}
        </div>
      )}

      {isPending && (
        <div className="aspect-square flex items-center justify-center bg-[#1a1a1a]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#7F6DE7] mx-auto mb-2" />
            <span className="text-xs text-gray-500">Generating...</span>
          </div>
        </div>
      )}
      {isFailed && (
        <div className="aspect-square flex items-center justify-center bg-[#1a1a1a] p-4">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <span className="text-sm font-medium text-red-400">Failed</span>
            {gen.error && <p className="text-xs text-red-400/60 mt-1 line-clamp-2">{gen.error}</p>}
          </div>
        </div>
      )}
      {gen.status === 'completed' && gen.resultUrl && (
        <>
          <img src={gen.resultUrl} alt="" className="aspect-square w-full object-cover" />
          {/* Cleanify warning badge */}
          {cleanifyFailed && (
            <div className="absolute top-2 left-2 z-10">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/80 text-black font-medium backdrop-blur-sm">
                ⚠️ Metadata
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">⚡ Automation</span>
                <span className="text-xs text-gray-400">• {gen.creditCost} cr</span>
              </div>
            </div>
          </div>
        </>
      )}
      {gen.status === 'completed' && !gen.resultUrl && (
        <div className="aspect-square flex items-center justify-center bg-[#1a1a1a] p-4">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
            <span className="text-sm font-medium text-yellow-400">No result</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Automations Studio ──
export default function AutomationsStudio({
  selectedAutomation,
  setSelectedAutomation,
}: {
  selectedAutomation: string;
  setSelectedAutomation: (id: string) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [referenceImage, setReferenceImage] = useState<{ file: File; preview: string } | null>(null);
  const [swapImages, setSwapImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const refInputRef = useRef<HTMLInputElement>(null);
  const swapsInputRef = useRef<HTMLInputElement>(null);

  const { data: userData, mutate: mutateUser } = useSWR<UserData>('/api/user', fetcher);
  const unlockedAutomations = userData?.unlockedAutomations || [];
  const freeUnlockUsed = userData?.freeUnlockUsed ?? true;

  const isAutomationUnlocked = (id: string) => unlockedAutomations.includes(id);

  async function handleFreeUnlock(automationId: string) {
    if (unlocking) return;
    setUnlocking(true);
    try {
      const res = await fetch('/api/automations/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automationId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to unlock');
      } else {
        mutateUser();
      }
    } catch {
      alert('Something went wrong');
    } finally {
      setUnlocking(false);
    }
  }

  const automationId = (AUTOMATION_IDS.includes(selectedAutomation as AutomationId) ? selectedAutomation : 'infinite-selfies') as AutomationId;
  const automation = AUTOMATIONS[automationId];
  const isFaceSwap = automationId === 'face-swap' || automationId === 'ez-face-swap-uncensored';
  const creditCost = isFaceSwap
    ? swapImages.length * automation.creditPerImage
    : quantity * automation.creditPerImage;

  const { data: history, mutate: mutateHistory } = useSWR<Generation[]>(
    '/api/generate/history?limit=100&automationsOnly=true',
    fetcher,
    { refreshInterval: 3000 }
  );

  // Show ALL automation history (not filtered by current automation selection)
  const automationHistory = history || [];

  const hasPending = automationHistory.some((g) => g.status === 'pending' || g.status === 'processing');
  useEffect(() => {
    if (!hasPending) return;
    let cleanupCalled = false;
    const interval = setInterval(async () => {
      if (!cleanupCalled) {
        cleanupCalled = true;
        try { await fetch('/api/automations/cleanup', { method: 'POST' }); } catch {}
      }
      mutateHistory();
    }, 3000);
    fetch('/api/automations/cleanup', { method: 'POST' }).catch(() => {});
    return () => clearInterval(interval);
  }, [hasPending, mutateHistory]);

  // Reset swap images when switching automation
  useEffect(() => {
    setSwapImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.preview));
      return [];
    });
    setQuantity(1);
  }, [selectedAutomation]);

  const handleRefSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setReferenceImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview);
      return { file, preview };
    });
    e.target.value = '';
  }, []);

  const removeReference = useCallback(() => {
    if (referenceImage) {
      URL.revokeObjectURL(referenceImage.preview);
      setReferenceImage(null);
    }
  }, [referenceImage]);

  const handleSwapsSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setSwapImages((prev) => {
      const remaining = 15 - prev.length;
      const toAdd = files.slice(0, remaining).map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      return [...prev, ...toAdd];
    });
    e.target.value = '';
  }, []);

  const removeSwapImage = useCallback((index: number) => {
    setSwapImages((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleDeleteFailed = useCallback(async () => {
    const failedIds = automationHistory.filter((g) => g.status === 'failed').map((g) => g.id);
    if (failedIds.length === 0) {
      alert('No failed generations to delete.');
      return;
    }

    if (!confirm(`Delete ${failedIds.length} failed generation(s)?`)) return;

    try {
      await fetch('/api/generate/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: failedIds }),
      });
      mutateHistory();
    } catch {
      alert('Failed to delete generations.');
    }
  }, [automationHistory, mutateHistory]);

  const handleSelectAll = useCallback(() => {
    if (!automationHistory) return;
    setSelectedIds(selectedIds.size === automationHistory.length ? new Set() : new Set(automationHistory.map((g) => g.id)));
  }, [automationHistory, selectedIds.size]);

  const toggleSelection = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    
    if (!confirm(`Delete ${selectedIds.size} selected image(s)?`)) return;

    try {
      await fetch('/api/generate/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      mutateHistory();
      setSelectedIds(new Set());
      setSelectionMode(false);
    } catch {
      alert('Failed to delete generations.');
    }
  }, [selectedIds, mutateHistory]);

  async function handleGenerate() {
    if (!referenceImage || generating || uploading) return;
    if (isFaceSwap && swapImages.length === 0) return;

    try {
      setUploading(true);

      async function uploadOne(file: File): Promise<string> {
        const compressed = await compressImage(file);
        const fd = new FormData();
        fd.append('file', compressed);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        return data.url;
      }

      const refUrl = await uploadOne(referenceImage.file);

      let swapUrls: string[] = [];
      if (isFaceSwap) {
        swapUrls = await Promise.all(swapImages.map((img) => uploadOne(img.file)));
      }

      setUploading(false);

      setGenerating(true);

      const body = isFaceSwap
        ? { automation: selectedAutomation, refUrl, swapUrls }
        : { automation: selectedAutomation, refUrl, quantity };

      const res = await fetch('/api/automations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Generation failed');
      } else {
        mutateHistory();
        mutate('/api/credits/balance');
      }
    } catch {
      alert('Something went wrong');
    } finally {
      setUploading(false);
      setGenerating(false);
    }
  }

  const isLocked = !isAutomationUnlocked(selectedAutomation);
  const canGenerate = !isLocked && (isFaceSwap
    ? referenceImage && swapImages.length > 0
    : referenceImage);

  return (
    <>
      {/* Gallery area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold">Automations</h1>
          {automationHistory && automationHistory.length > 0 && (
            <div className="flex items-center gap-2">
              {selectionMode ? (
                <>
                  <button onClick={handleSelectAll} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition-colors">
                    {selectedIds.size === automationHistory.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button onClick={handleDeleteSelected} disabled={selectedIds.size === 0}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 border border-red-500/30 disabled:opacity-30 transition-colors">
                    <X className="h-3 w-3" /> Delete ({selectedIds.size})
                  </button>
                  <button onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition-colors">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => setSelectionMode(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/30 rounded-lg transition-colors">
                    <CheckSquare className="h-3 w-3" /> Select
                  </button>
                  {automationHistory.some((g) => g.status === 'failed') && (
                    <button
                      onClick={handleDeleteFailed}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg transition-colors"
                    >
                      <X className="h-3 w-3" /> Delete Failed
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {automationHistory.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <ImagePlus className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Your automation results will appear here</p>
              <p className="text-sm mt-1">
                {isFaceSwap
                  ? 'Upload a reference image and swap images below'
                  : 'Upload a reference image and set quantity below'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {automationHistory.map((gen) => (
              <AutomationGenCard
                key={gen.id}
                gen={gen}
                onClick={() => setSelectedGen(gen)}
                selected={selectedIds.has(gen.id)}
                onToggleSelect={() => toggleSelection(gen.id)}
                selectionMode={selectionMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Unlock prompt for locked automations (free accounts) */}
      {!isAutomationUnlocked(selectedAutomation) && !freeUnlockUsed && (
        <div className="border-t border-[#7F6DE7]/30 bg-[#7F6DE7]/5 p-6 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <h3 className="text-lg font-semibold text-[#FEFEFE] mb-2">
            Unlock {automation.name}
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            You get <span className="text-[#28B8F6] font-medium">1 free automation unlock</span> with your account. Choose wisely!
          </p>
          <Button
            onClick={() => handleFreeUnlock(selectedAutomation)}
            disabled={unlocking}
            className="bg-[#7F6DE7] hover:bg-[#7F6DE7]/80 text-white font-semibold rounded-xl px-8"
          >
            {unlocking ? (
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin h-4 w-4" /> Unlocking...
              </span>
            ) : (
              `🔓 Unlock ${automation.name} for free`
            )}
          </Button>
        </div>
      )}

      {/* Bottom control panel */}
      <div className="border-t border-[#333] bg-[#1a1a1a] p-4">
        {/* Image previews */}
        <div className="flex gap-3 mb-3 flex-wrap">
          {referenceImage && (
            <div className="relative shrink-0 w-20 h-20">
              <img src={referenceImage.preview} alt="Reference" className="w-full h-full object-cover rounded-lg border border-[#7F6DE7]/50" />
              <button onClick={removeReference}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow-lg z-10">
                <X className="h-3 w-3 text-white" />
              </button>
              <span className="absolute bottom-1 left-1 text-[10px] bg-[#7F6DE7]/80 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
                Ref
              </span>
            </div>
          )}

          {isFaceSwap && swapImages.map((img, i) => (
            <div key={i} className="relative shrink-0 w-20 h-20">
              <img src={img.preview} alt={`Swap ${i + 1}`} className="w-full h-full object-cover rounded-lg border border-[#333]" />
              <button onClick={() => removeSwapImage(i)}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow-lg z-10">
                <X className="h-3 w-3 text-white" />
              </button>
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
                Swap {i + 1}
              </span>
            </div>
          ))}
        </div>

        {/* Controls row */}
        <div className="flex gap-3 items-end">
          <div className="flex-1 flex gap-3 items-end">
            <div className="relative shrink-0">
              <button onClick={() => refInputRef.current?.click()}
                className={`h-12 w-12 rounded-xl border flex items-center justify-center transition-colors ${
                  referenceImage
                    ? 'bg-[#7F6DE7]/10 border-[#7F6DE7]/30 text-[#7F6DE7]'
                    : 'bg-[#222] border-[#333] text-gray-400 hover:text-[#7F6DE7] hover:border-[#7F6DE7]/30'
                }`}
                title="Upload reference picture">
                <ImagePlus className="h-5 w-5" />
              </button>
              {referenceImage && (
                <span className="absolute -top-1 -right-1 bg-[#7F6DE7] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  ✓
                </span>
              )}
              <span className="text-[10px] text-gray-500 text-center block mt-1">Ref</span>
            </div>
            <input ref={refInputRef} type="file" accept="image/*" className="hidden" onChange={handleRefSelect} />

            {isFaceSwap && (
              <>
                <div className="relative shrink-0">
                  <button onClick={() => swapsInputRef.current?.click()}
                    className={`h-12 w-12 rounded-xl border flex items-center justify-center transition-colors ${
                      swapImages.length > 0
                        ? 'bg-[#28B8F6]/10 border-[#28B8F6]/30 text-[#28B8F6]'
                        : 'bg-[#222] border-[#333] text-gray-400 hover:text-[#28B8F6] hover:border-[#28B8F6]/30'
                    }`}
                    title="Upload swap images (up to 15)">
                    <UploadIcon className="h-5 w-5" />
                  </button>
                  {swapImages.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#28B8F6] text-[#191919] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {swapImages.length}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500 text-center block mt-1">Swaps</span>
                </div>
                <input ref={swapsInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleSwapsSelect} />
              </>
            )}

            {!isFaceSwap && (
              <div className="w-32">
                <Label className="text-xs text-gray-500 mb-1 block">How many images</Label>
                <input
                  type="number"
                  min="1"
                  max={automation.maxQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(automation.maxQuantity, parseInt(e.target.value) || 1)))}
                  className="w-full bg-[#222] border border-[#333] text-[#FEFEFE] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#7F6DE7]/50 transition-colors h-12"
                />
              </div>
            )}

            {isFaceSwap && (
              <div className="text-xs text-gray-500 self-center">
                {swapImages.length}/15 images
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button
              onClick={handleGenerate}
              disabled={generating || uploading || !canGenerate}
              className="h-12 px-6 bg-[#7F6DE7] hover:bg-[#7F6DE7]/80 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-5 w-5" />
                  Uploading...
                </span>
              ) : generating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-5 w-5" />
                  Generating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Generate
                  <span className="flex items-center gap-1 text-xs opacity-80">
                    <Coins className="h-3 w-3" />
                    {creditCost}
                  </span>
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {selectedGen && (
        <AutomationMediaModal
          gen={selectedGen}
          onClose={() => setSelectedGen(null)}
          onDelete={async (id: number) => {
            try {
              await fetch('/api/generate/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id] }),
              });
              mutateHistory();
            } catch {
              alert('Failed to delete image.');
            }
          }}
        />
      )}
    </>
  );
}
