'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import useSWR, { mutate } from 'swr';
import { upload } from '@vercel/blob/client';
import {
  Loader2,
  Send,
  Download,
  ImagePlus,
  X,
  Coins,
  AlertTriangle,
  Upload as UploadIcon,
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// Automation definitions
const AUTOMATIONS = {
  'infinite-selfies': {
    id: 'infinite-selfies',
    name: 'Infinite Selfies',
    icon: '📸',
    description: 'Generate unlimited selfies from a reference photo',
    creditPerImage: 25,
    requiresRefImage: true,
    maxQuantity: 50,
    modelFilter: 'automation-selfie',
  },
  'face-swap': {
    id: 'face-swap',
    name: 'EZ Face Swap',
    icon: '🔄',
    description: 'Swap faces from a reference photo onto up to 15 target images',
    creditPerImage: 25,
    requiresRefImage: true,
    maxQuantity: 15,
    modelFilter: 'automation-faceswap',
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
  resultData: { images?: string[] } | null;
  creditCost: number;
  error: string | null;
  createdAt: string;
};

// ── Download helper ──
function getDownloadUrl(url: string): string {
  return `/api/generate/download?url=${encodeURIComponent(url)}`;
}

// ── Image Lightbox (simplified) ──
function AutomationMediaModal({
  gen,
  onClose,
}: {
  gen: Generation;
  onClose: () => void;
}) {
  const images = gen.resultData?.images || (gen.resultUrl ? [gen.resultUrl] : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#222] border border-[#333] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">{gen.model}</span>
            <span className="text-xs text-gray-500">{gen.creditCost} cr</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {gen.status === 'completed' && images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {images.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt={`Result ${i + 1}`} className="w-full rounded-xl object-cover aspect-square bg-black" />
                <a
                  href={getDownloadUrl(url)}
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#28B8F6] text-[#191919] text-xs font-medium hover:bg-[#28B8F6]/80"
                >
                  <Download className="h-3 w-3" /> Download
                </a>
              </div>
            ))}
          </div>
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

        {gen.status === 'completed' && images.length > 1 && (
          <div className="flex gap-2">
            {images.map((url, i) => (
              <a
                key={i}
                href={getDownloadUrl(url)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#28B8F6] text-[#191919] text-sm font-medium hover:bg-[#28B8F6]/80 transition-colors"
              >
                <Download className="h-4 w-4" /> #{i + 1}
              </a>
            ))}
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
}: {
  gen: Generation;
  onClick: () => void;
}) {
  const isPending = gen.status === 'pending' || gen.status === 'processing';
  const isFailed = gen.status === 'failed';

  return (
    <div
      className={`relative group rounded-xl overflow-hidden border transition-all cursor-pointer ${
        isFailed
          ? 'border-red-500/30 bg-[#222]'
          : isPending
          ? 'border-[#7F6DE7]/30 bg-[#222]'
          : 'border-[#333] bg-[#222] hover:border-[#7F6DE7]/50'
      }`}
      onClick={onClick}
    >
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
export default function AutomationsStudio() {
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationId>('infinite-selfies');
  const [quantity, setQuantity] = useState(1);
  const [referenceImage, setReferenceImage] = useState<{ file: File; preview: string } | null>(null);
  const [swapImages, setSwapImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const swapsInputRef = useRef<HTMLInputElement>(null);

  const automation = AUTOMATIONS[selectedAutomation];
  const isFaceSwap = selectedAutomation === 'face-swap';
  const creditCost = isFaceSwap
    ? swapImages.length * automation.creditPerImage
    : quantity * automation.creditPerImage;

  const { data: history, mutate: mutateHistory } = useSWR<Generation[]>(
    '/api/generate/history?limit=100',
    fetcher,
    { refreshInterval: 3000 }
  );

  const automationHistory = history?.filter((g) => g.model === automation.modelFilter) || [];

  const hasPending = automationHistory.some((g) => g.status === 'pending' || g.status === 'processing');
  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(() => { mutateHistory(); }, 3000);
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

  async function handleGenerate() {
    if (!referenceImage || generating || uploading) return;
    if (isFaceSwap && swapImages.length === 0) return;

    try {
      // Step 1: Upload images to Vercel Blob
      setUploading(true);

      const refBlob = await upload(referenceImage.file.name, referenceImage.file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });
      const refUrl = refBlob.url;

      let swapUrls: string[] = [];
      if (isFaceSwap) {
        const swapBlobs = await Promise.all(
          swapImages.map((img) =>
            upload(img.file.name, img.file, {
              access: 'public',
              handleUploadUrl: '/api/upload',
            })
          )
        );
        swapUrls = swapBlobs.map((b) => b.url);
      }

      setUploading(false);

      // Step 2: Send URLs to API
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

  const canGenerate = isFaceSwap
    ? referenceImage && swapImages.length > 0
    : referenceImage;

  return (
    <>
      {/* Gallery area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold">Automations</h1>
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
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom control panel */}
      <div className="border-t border-[#333] bg-[#1a1a1a] p-4">
        {/* Image previews */}
        <div className="flex gap-3 mb-3 flex-wrap">
          {/* Reference image preview */}
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

          {/* Swap images previews (face-swap only) */}
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
            {/* Reference image upload */}
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

            {/* Swap images upload (face-swap only) */}
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

            {/* Quantity (infinite-selfies only) */}
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

            {/* Swap count info (face-swap) */}
            {isFaceSwap && (
              <div className="text-xs text-gray-500 self-center">
                {swapImages.length}/15 images
              </div>
            )}
          </div>

          {/* Automation selector + Generate */}
          <div className="flex flex-col gap-2 shrink-0">
            <select
              className="bg-[#222] border border-[#333] text-[#FEFEFE] text-sm h-8 rounded-lg px-2 outline-none"
              value={selectedAutomation}
              onChange={(e) => setSelectedAutomation(e.target.value as AutomationId)}
            >
              {AUTOMATION_IDS.map((id) => (
                <option key={id} value={id}>
                  {AUTOMATIONS[id].icon} {AUTOMATIONS[id].name}
                </option>
              ))}
            </select>
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
        />
      )}
    </>
  );
}
