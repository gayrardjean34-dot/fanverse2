'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import useSWR, { mutate } from 'swr';
import {
  Loader2,
  Send,
  Download,
  Copy,
  RefreshCw,
  ImagePlus,
  X,
  Coins,
  Bookmark,
  Trash2,
  CheckSquare,
  Square,
  AlertTriangle,
  Volume2,
  VolumeX,
  Sparkles,
  Film,
} from 'lucide-react';
import { AI_PROVIDERS, ACTIVE_PROVIDER_IDS, type ModelConfig } from '@/lib/ai/providers';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type RefImg = string | { file: File; preview: string };

// Compress image before upload to stay under 4.5MB limit
function compressImage(file: File, maxWidth = 2048, quality = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    if (file.size < 2 * 1024 * 1024) { resolve(file); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Compression failed')); return; }
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        },
        'image/jpeg', quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

async function uploadRefImage(file: File): Promise<string> {
  const compressed = await compressImage(file);
  const contentType = compressed.type || 'image/jpeg';
  const ext = contentType.split('/')[1] || 'jpg';
  const res = await fetch(`/api/upload?filename=${Date.now()}.${ext}&contentType=${encodeURIComponent(contentType)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  const putRes = await fetch(data.uploadUrl, {
    method: 'PUT',
    body: compressed,
    headers: { 'Content-Type': contentType },
  });
  if (!putRes.ok) throw new Error('Upload to storage failed');
  return data.publicUrl;
}

type Generation = {
  id: number;
  batchId: string;
  model: string;
  prompt: string;
  systemPrompt: string | null;
  aspectRatio: string;
  resolution: string;
  temperature: number | null;
  topP: number | null;
  topK: number | null;
  referenceImages: string[];
  status: string;
  resultUrl: string | null;
  creditCost: number;
  error: string | null;
  createdAt: string;
};

const IMAGE_ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3', '21:9'];
const VIDEO_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '2:3', '3:2'];

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)/i.test(url);
}

// ── Download directly from CDN — no Vercel proxy, no bandwidth cost ──
async function downloadFile(url: string) {
  const isVideo = url.includes('.mp4') || url.includes('.webm');
  const ext = isVideo ? 'mp4' : 'png';
  const filename = `fanverse-${Date.now()}.${ext}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}

// ── Image/Video Lightbox ──
function MediaModal({
  gen,
  onClose,
  onUseAsReference,
  onRecreate,
  onDelete,
}: {
  gen: Generation;
  onClose: () => void;
  onUseAsReference: (url: string) => void;
  onRecreate: (gen: Generation) => void;
  onDelete: (ids: number[]) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const isVideo = gen.resultUrl ? isVideoUrl(gen.resultUrl) : false;

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setZoom((z) => Math.min(5, Math.max(1, z - e.deltaY * 0.005)));
    if (zoom <= 1) setTranslate({ x: 0, y: 0 });
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (zoom <= 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging.current) return;
    setTranslate({
      x: dragStart.current.tx + (e.clientX - dragStart.current.x),
      y: dragStart.current.ty + (e.clientY - dragStart.current.y),
    });
  }

  function handleMouseUp() { isDragging.current = false; }

  function resetZoom() { setZoom(1); setTranslate({ x: 0, y: 0 }); }

  async function handleCleanDownload() {
    if (!gen.resultUrl || cleaning) return;
    setCleaning(true);
    try {
      const res = await fetch('/api/generate/cleanify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: gen.resultUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Clean & download failed');
        return;
      }
      // Download directly from Cloudflare R2 — no Vercel bandwidth
      await downloadFile(data.url);
    } catch {
      alert('Something went wrong');
    } finally {
      setCleaning(false);
    }
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(gen.prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#222] border border-[#333] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">{gen.model}</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-[#333] text-gray-400">
              {isVideo ? '🎬 Video' : '🖼️ Image'}
            </span>
            <span className="text-xs text-gray-500">{gen.creditCost} cr</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {gen.status === 'completed' && gen.resultUrl && (
          isVideo ? (
            <video
              src={gen.resultUrl}
              controls
              autoPlay
              loop
              className="w-full rounded-xl mb-4 max-h-[50vh] bg-black"
            />
          ) : (
            <div
              className="relative w-full rounded-xl mb-4 overflow-hidden bg-black"
              style={{ maxHeight: '50vh', cursor: zoom > 1 ? (isDragging.current ? 'grabbing' : 'grab') : 'zoom-in' }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onDoubleClick={resetZoom}
            >
              <img
                src={gen.resultUrl}
                alt="Generated"
                draggable={false}
                className="w-full object-contain select-none"
                style={{
                  transform: `scale(${zoom}) translate(${translate.x / zoom}px, ${translate.y / zoom}px)`,
                  transition: isDragging.current ? 'none' : 'transform 0.15s ease',
                  maxHeight: '50vh',
                }}
              />
              {zoom > 1 && (
                <button
                  onClick={resetZoom}
                  className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-black/60 text-white hover:bg-black/80"
                >
                  Reset ({Math.round(zoom * 100)}%)
                </button>
              )}
              {zoom === 1 && (
                <div className="absolute bottom-2 right-2 text-xs px-2 py-1 rounded bg-black/50 text-white/60 pointer-events-none">
                  Scroll to zoom · Double-click to reset
                </div>
              )}
            </div>
          )
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

        <div className="bg-[#1a1a1a] rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{gen.prompt}</p>
          {gen.systemPrompt && (
            <p className="text-xs text-gray-500 mt-2 border-t border-[#333] pt-2">System: {gen.systemPrompt}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {gen.resultUrl && (
            <button
              onClick={() => downloadFile(gen.resultUrl!).catch(() => alert('Download failed'))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#28B8F6] text-[#191919] text-sm font-medium hover:bg-[#28B8F6]/80 transition-colors"
            >
              <Download className="h-4 w-4" /> Download
            </button>
          )}
          {gen.resultUrl && !isVideo && (
            <button
              onClick={handleCleanDownload}
              disabled={cleaning}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D324D9] text-white text-sm font-medium hover:bg-[#D324D9]/80 transition-colors disabled:opacity-50"
            >
              {cleaning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {cleaning ? 'Cleaning...' : 'Clean Metadata & Download'}
            </button>
          )}
          {gen.resultUrl && !isVideo && (
            <button
              onClick={() => { onUseAsReference(gen.resultUrl!); onClose(); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#7F6DE7] text-white text-sm font-medium hover:bg-[#7F6DE7]/80 transition-colors"
            >
              <Bookmark className="h-4 w-4" /> Reference
            </button>
          )}
          <button
            onClick={handleCopyPrompt}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2a2a2a] border border-[#333] text-gray-300 text-sm font-medium hover:bg-[#333] transition-colors"
          >
            <Copy className="h-4 w-4" /> {copied ? 'Copied!' : 'Copy Prompt'}
          </button>
          <button
            onClick={() => { onRecreate(gen); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2a2a2a] border border-[#333] text-gray-300 text-sm font-medium hover:bg-[#333] transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Recreate
          </button>
          <button
            onClick={() => { onDelete([gen.id]); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generation Card ──
function GenCard({
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
  const isVideo = gen.resultUrl ? isVideoUrl(gen.resultUrl) : (AI_PROVIDERS[gen.model]?.type === 'video');

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
      className={`relative group rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer hover:scale-105 hover:z-10 ${
        selected
          ? 'border-[#28B8F6] ring-2 ring-[#28B8F6]/30'
          : isFailed
          ? 'border-red-500/30 bg-[#222]'
          : isPending
          ? 'border-[#28B8F6]/30 bg-[#222]'
          : 'border-[#333] bg-[#222] hover:border-[#28B8F6]/50'
      }`}
      onClick={handleClick}
    >
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          {selected ? <CheckSquare className="h-5 w-5 text-[#28B8F6]" /> : <Square className="h-5 w-5 text-gray-400" />}
        </div>
      )}

      {/* Type badge */}
      {gen.status === 'completed' && gen.resultUrl && (
        <div className="absolute top-2 right-2 z-10">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white backdrop-blur-sm">
            {isVideo ? '🎬' : '🖼️'}
          </span>
        </div>
      )}

      {isPending && (
        <div className="aspect-square flex items-center justify-center bg-[#1a1a1a]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#28B8F6] mx-auto mb-2" />
            <span className="text-xs text-gray-500">Generating...</span>
            <span className="text-[10px] text-gray-600 block mt-0.5">{AI_PROVIDERS[gen.model]?.icon} {gen.model}</span>
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
        isVideo ? (
          <>
            <video src={gen.resultUrl} muted className="aspect-square w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-xs text-white line-clamp-2">{gen.prompt}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{AI_PROVIDERS[gen.model]?.icon} {gen.model}</span>
                  <span className="text-xs text-gray-400">• {gen.creditCost} cr</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="relative aspect-square w-full">
              <NextImage
                src={gen.resultUrl}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                className="object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-xs text-white line-clamp-2">{gen.prompt}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">{AI_PROVIDERS[gen.model]?.icon} {gen.model}</span>
                  <span className="text-xs text-gray-400">• {gen.creditCost} cr</span>
                </div>
              </div>
            </div>
          </>
        )
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

// ── Main Studio ──
export default function ModelsStudio({
  model,
  setModel,
}: {
  model: string;
  setModel: (m: string) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [resolution, setResolution] = useState('1K');
  const [temperature, setTemperature] = useState<string>('');
  const [topP, setTopP] = useState<string>('');
  const [topK, setTopK] = useState<string>('');
  const [batchSize, setBatchSize] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(30);
  const [referenceImages, setReferenceImages] = useState<RefImg[]>([]);
  const [generating, setGenerating] = useState(false);
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // Video-specific params
  const [duration, setDuration] = useState('5');
  const [videoMode, setVideoMode] = useState('standard');
  const [sound, setSound] = useState(false);
  // Motion control
  const [referenceVideo, setReferenceVideo] = useState<string | null>(null);
  const [referenceVideoName, setReferenceVideoName] = useState<string>('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  // When recreating, store params here so the model-change useEffect restores them instead of resetting to defaults
  const recreateParamsRef = useRef<{ aspectRatio: string; resolution: string; temperature: string; topP: string; topK: string } | null>(null);

  const providerConfig = AI_PROVIDERS[model];
  const isVideoModel = providerConfig?.type === 'video';
  const isMotionControl = !!providerConfig?.requiresReferenceVideo;

  // Compute credit cost dynamically
  const creditCost = useMemo(() => {
    if (!providerConfig) return 0;
    return providerConfig.getCreditCost({
      resolution,
      duration,
      mode: videoMode,
      sound,
    }) * batchSize;
  }, [providerConfig, resolution, duration, videoMode, sound, batchSize]);

  // Reset params when model changes — but restore recreate params if coming from handleRecreate
  useEffect(() => {
    if (!providerConfig) return;

    if (recreateParamsRef.current) {
      const p = recreateParamsRef.current;
      recreateParamsRef.current = null;
      setAspectRatio(p.aspectRatio);
      setResolution(p.resolution);
      setTemperature(p.temperature);
      setTopP(p.topP);
      setTopK(p.topK);
      return;
    }

    if (providerConfig.type === 'video') {
      setAspectRatio('16:9');
      setDuration(providerConfig.defaultDuration || '5');
      if (providerConfig.modes) setVideoMode(providerConfig.modes[0]);
      setSound(false);
      if (providerConfig.resolutions) setResolution(providerConfig.resolutions[0]);
    } else {
      setAspectRatio('1:1');
      setResolution('1K');
    }
    setReferenceVideo(null);
    setReferenceVideoName('');
    setVideoError(null);
  }, [model]);

  const { data: history, mutate: mutateHistory } = useSWR<Generation[]>(
    `/api/generate/history?limit=${historyLimit}&excludeAutomations=true`,
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: false }
  );

  const hasPending = history?.some((g) => g.status === 'pending' || g.status === 'processing');
  useEffect(() => {
    if (!hasPending) return;
    let pollCount = 0;
    const interval = setInterval(() => {
      mutateHistory();
      pollCount++;
      if (pollCount % 5 === 0) {
        fetch('/api/generate/poll', { method: 'POST' }).catch(() => {});
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [hasPending, mutateHistory]);

  const handleVideoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.type !== 'video/mp4') {
      setVideoError('Only MP4 format is accepted.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setVideoError('Video must be under 50 MB.');
      return;
    }

    setVideoError(null);
    setUploadingVideo(true);
    try {
      const res = await fetch(`/api/upload/video?filename=${encodeURIComponent(file.name)}`);
      if (!res.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, publicUrl } = await res.json();
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'video/mp4' },
      });
      if (!putRes.ok) throw new Error('Upload to storage failed');
      setReferenceVideo(publicUrl);
      setReferenceVideoName(file.name);
    } catch (err: any) {
      setVideoError(err.message || 'Upload failed.');
    } finally {
      setUploadingVideo(false);
    }
  }, []);

  const handleAddImages = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 10 - referenceImages.length;
    Array.from(files).slice(0, remaining).forEach((file) => {
      const preview = URL.createObjectURL(file);
      setReferenceImages((prev) => prev.length >= 10 ? prev : [...prev, { file, preview }]);
    });
    e.target.value = '';
  }, [referenceImages.length]);

  const addReferenceFromUrl = useCallback((url: string) => {
    if (referenceImages.length >= 10) return;
    setReferenceImages((prev) => [...prev, url]);
  }, [referenceImages.length]);

  const removeReference = useCallback((index: number) => {
    setReferenceImages((prev) => {
      const img = prev[index];
      if (typeof img !== 'string') URL.revokeObjectURL(img.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleRecreate = useCallback((gen: Generation) => {
    setPrompt(gen.prompt);
    setSystemPrompt(gen.systemPrompt || '');
    setReferenceImages(gen.referenceImages || []);

    const params = {
      aspectRatio: gen.aspectRatio || '1:1',
      resolution: gen.resolution || '1K',
      temperature: gen.temperature?.toString() || '',
      topP: gen.topP?.toString() || '',
      topK: gen.topK?.toString() || '',
    };

    // If model changes, the useEffect will reset params — store them in ref so it restores instead
    recreateParamsRef.current = params;
    setModel(gen.model);

    // If model is the same, useEffect won't fire — apply params directly
    if (gen.model === model) {
      recreateParamsRef.current = null;
      setAspectRatio(params.aspectRatio);
      setResolution(params.resolution);
      setTemperature(params.temperature);
      setTopP(params.topP);
      setTopK(params.topK);
    }
  }, [model, setModel]);

  const handleDelete = useCallback(async (ids: number[]) => {
    try {
      await fetch('/api/generate/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      mutateHistory();
      setSelectedIds(new Set());
    } catch {}
  }, [mutateHistory]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    handleDelete(Array.from(selectedIds));
    setSelectionMode(false);
  }, [selectedIds, handleDelete]);

  const handleSelectAll = useCallback(() => {
    if (!history) return;
    setSelectedIds(selectedIds.size === history.length ? new Set() : new Set(history.map((g) => g.id)));
  }, [history, selectedIds.size]);

  const toggleSelection = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  async function handleGenerate() {
    if (!prompt.trim() || generating) return;
    if (isMotionControl && !referenceVideo) return;
    setGenerating(true);
    try {
      // Upload file-based ref images via FormData → /api/upload (same as automations)
      const uploadedRefs = await Promise.all(
        referenceImages.map((img) =>
          typeof img === 'string' ? img : uploadRefImage(img.file)
        )
      );

      const payload: Record<string, any> = {
        model,
        prompt: prompt.trim(),
        systemPrompt: systemPrompt.trim() || undefined,
        aspectRatio,
        referenceImages: uploadedRefs,
        batchSize,
      };

      if (isMotionControl) {
        payload.duration = duration;
        payload.resolution = resolution;
        payload.referenceVideo = referenceVideo;
      } else if (isVideoModel) {
        payload.duration = duration;
        if (providerConfig.supportsMode) payload.mode = videoMode;
        if (providerConfig.supportsSound) payload.sound = sound;
        if (providerConfig.resolutions) payload.resolution = resolution;
      } else {
        payload.resolution = resolution;
        if (temperature) payload.temperature = parseFloat(temperature);
        if (topP) payload.topP = parseFloat(topP);
        if (topK) payload.topK = parseInt(topK);
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      setGenerating(false);
    }
  }

  const aspectRatios = isVideoModel ? VIDEO_ASPECT_RATIOS : IMAGE_ASPECT_RATIOS;

  return (
    <section className="flex flex-col h-[calc(100dvh-68px)]">
      {/* Gallery area */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold">Studio</h1>
          {history && history.length > 0 && (
            <div className="flex items-center gap-2">
              {selectionMode ? (
                <>
                  <button onClick={handleSelectAll} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition-colors">
                    {selectedIds.size === history.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button onClick={handleDeleteSelected} disabled={selectedIds.size === 0}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 border border-red-500/30 disabled:opacity-30 transition-colors">
                    <Trash2 className="h-3 w-3" /> Delete ({selectedIds.size})
                  </button>
                  <button onClick={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
                    className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition-colors">Cancel</button>
                </>
              ) : (
                <button onClick={() => setSelectionMode(true)}
                  className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded transition-colors">Select</button>
              )}
            </div>
          )}
        </div>

        {(!history || history.length === 0) ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <ImagePlus className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Your generations will appear here</p>
              <p className="text-sm mt-1">Write a prompt below to get started</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-visible">
            {history.map((gen) => (
              <GenCard
                key={gen.id} gen={gen}
                onClick={() => setSelectedGen(gen)}
                selected={selectedIds.has(gen.id)}
                onToggleSelect={() => toggleSelection(gen.id)}
                selectionMode={selectionMode}
              />
            ))}
          </div>
        )}
        {history && history.length === historyLimit && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setHistoryLimit((l) => l + 30)}
              className="px-5 py-2 rounded-xl border border-[#333] text-sm text-gray-400 hover:text-white hover:border-[#28B8F6]/50 transition-colors"
            >
              Load more
            </button>
          </div>
        )}
      </div>

      {/* Bottom control panel */}
      <div className="border-t border-[#2a2a2a] bg-[#0f0f0f] p-4">
        {/* Reference images */}
        {referenceImages.length > 0 && (
          <div className="flex gap-3 mb-3 overflow-x-auto pb-2">
            {referenceImages.map((img, i) => (
              <div key={i} className="relative shrink-0 w-16 h-16">
                <img src={typeof img === 'string' ? img : img.preview} alt="" className="w-full h-full object-cover rounded-lg border border-[#333]" />
                <button onClick={() => removeReference(i)}
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow-lg z-10">
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
            {referenceImages.length < 10 && (
              <button onClick={() => fileInputRef.current?.click()}
                className="shrink-0 w-16 h-16 rounded-lg border border-dashed border-[#444] flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-[#666] transition-colors">
                <ImagePlus className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Motion control video input */}
        {isMotionControl && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Film className="h-4 w-4 text-gray-400" />
              <span className="text-xs text-gray-400 font-medium">Motion Reference Video <span className="text-red-400">*</span></span>
              <span className="text-xs text-gray-600">(MP4 only, max 50 MB)</span>
            </div>
            {referenceVideo ? (
              <div className="flex items-center gap-2 bg-[#222] border border-[#333] rounded-xl px-3 py-2">
                <Film className="h-4 w-4 text-[#7F6DE7] shrink-0" />
                <span className="text-sm text-gray-300 flex-1 truncate">{referenceVideoName}</span>
                <button
                  onClick={() => { setReferenceVideo(null); setReferenceVideoName(''); }}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={uploadingVideo}
                className="w-full flex items-center justify-center gap-2 bg-[#222] border border-dashed border-[#444] rounded-xl px-3 py-3 text-sm text-gray-500 hover:text-gray-300 hover:border-[#7F6DE7]/50 transition-colors disabled:opacity-50"
              >
                {uploadingVideo ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
                ) : (
                  <><Film className="h-4 w-4" /> Click to upload MP4</>
                )}
              </button>
            )}
            {videoError && (
              <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {videoError}
              </p>
            )}
            <input ref={videoInputRef} type="file" accept="video/mp4" className="hidden" onChange={handleVideoSelect} />
          </div>
        )}

        {/* System prompt — only for image models that support it */}
        {(model === 'nano-banana-pro' || model === 'nano-banana-2') && (
          <div className="mb-3">
            <span className="text-xs text-gray-500 block mb-1">System Prompt</span>
            <textarea
              className="w-full bg-[#222] border border-[#333] text-[#FEFEFE] rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-[#28B8F6]/50 transition-colors placeholder-gray-500"
              rows={3}
              placeholder="Optional system prompt to guide the AI behavior..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>
        )}

        {/* Model-specific parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
            {/* Aspect ratio — always shown */}
            <div>
              <Label className="text-xs text-gray-500">Aspect Ratio</Label>
              <select className="w-full bg-[#222] border border-[#333] text-[#FEFEFE] text-sm h-8 rounded-md px-2 mt-1 outline-none"
                value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                {aspectRatios.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Image: resolution, temperature, top_p, top_k */}
            {!isVideoModel && (
              <>
                <div>
                  <Label className="text-xs text-gray-500">Resolution</Label>
                  <select className="w-full bg-[#222] border border-[#333] text-[#FEFEFE] text-sm h-8 rounded-md px-2 mt-1 outline-none"
                    value={resolution} onChange={(e) => setResolution(e.target.value)}>
                    {(providerConfig?.resolutions || ['1K', '2K', '4K']).map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                {providerConfig?.supportsAdvancedParams !== false && (
                  <>
                    <div>
                      <Label className="text-xs text-gray-500">Temperature</Label>
                      <Input type="number" step="0.1" min="0" max="2"
                        className="bg-[#222] border-[#333] text-[#FEFEFE] text-sm h-8 mt-1"
                        placeholder="0.7" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Top P</Label>
                      <Input type="number" step="0.1" min="0" max="1"
                        className="bg-[#222] border-[#333] text-[#FEFEFE] text-sm h-8 mt-1"
                        placeholder="0.9" value={topP} onChange={(e) => setTopP(e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Top K</Label>
                      <Input type="number" step="1" min="1"
                        className="bg-[#222] border-[#333] text-[#FEFEFE] text-sm h-8 mt-1"
                        placeholder="40" value={topK} onChange={(e) => setTopK(e.target.value)} />
                    </div>
                  </>
                )}
              </>
            )}

            {/* Video: duration, mode, sound, resolution */}
            {isVideoModel && (
              <>
                {providerConfig.supportsDuration && providerConfig.durations && (
                  <div>
                    <Label className="text-xs text-gray-500">Duration</Label>
                    <select className="w-full bg-[#222] border border-[#333] text-[#FEFEFE] text-sm h-8 rounded-md px-2 mt-1 outline-none"
                      value={duration} onChange={(e) => setDuration(e.target.value)}>
                      {providerConfig.durations.map((d) => <option key={d} value={d}>{d}s</option>)}
                    </select>
                  </div>
                )}
                {providerConfig.supportsMode && providerConfig.modes && (
                  <div>
                    <Label className="text-xs text-gray-500">Mode</Label>
                    <select className="w-full bg-[#222] border border-[#333] text-[#FEFEFE] text-sm h-8 rounded-md px-2 mt-1 outline-none"
                      value={videoMode} onChange={(e) => setVideoMode(e.target.value)}>
                      {providerConfig.modes.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                    </select>
                  </div>
                )}
                {providerConfig.supportsSound && (
                  <div>
                    <Label className="text-xs text-gray-500">Audio</Label>
                    <button
                      onClick={() => setSound(!sound)}
                      className={`w-full h-8 mt-1 rounded-md border text-sm flex items-center justify-center gap-1.5 transition-colors ${
                        sound
                          ? 'bg-[#28B8F6]/10 border-[#28B8F6]/30 text-[#28B8F6]'
                          : 'bg-[#222] border-[#333] text-gray-400'
                      }`}
                    >
                      {sound ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                      {sound ? 'On' : 'Off'}
                    </button>
                  </div>
                )}
                {providerConfig.resolutions && (
                  <div>
                    <Label className="text-xs text-gray-500">Resolution</Label>
                    <select className="w-full bg-[#222] border border-[#333] text-[#FEFEFE] text-sm h-8 rounded-md px-2 mt-1 outline-none"
                      value={resolution} onChange={(e) => setResolution(e.target.value)}>
                      {providerConfig.resolutions.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Batch size — always shown */}
            <div>
              <Label className="text-xs text-gray-500">Batch Size</Label>
              <select className="w-full bg-[#222] border border-[#333] text-[#FEFEFE] text-sm h-8 rounded-md px-2 mt-1 outline-none"
                value={batchSize} onChange={(e) => setBatchSize(parseInt(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>{n} {isVideoModel ? 'video' : 'image'}{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>

        {/* Prompt row */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <div className="flex gap-2">
              <div className="relative shrink-0">
                <button onClick={() => fileInputRef.current?.click()}
                  className="h-12 w-12 rounded-xl bg-[#222] border border-[#333] flex items-center justify-center text-gray-400 hover:text-[#28B8F6] hover:border-[#28B8F6]/30 transition-colors"
                  title="Add reference images (max 10)">
                  <ImagePlus className="h-5 w-5" />
                </button>
                {referenceImages.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#28B8F6] text-[#191919] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {referenceImages.length}
                  </span>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddImages} />
              <textarea
                className="flex-1 bg-[#222] border border-[#333] text-[#FEFEFE] rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-[#28B8F6]/50 transition-colors placeholder-gray-500"
                rows={2}
                placeholder={isVideoModel ? 'Describe the video you want to generate...' : 'Describe what you want to generate...'}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0">
            <Button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim() || (isMotionControl && !referenceVideo) || uploadingVideo}
              className="h-12 px-6 bg-[#28B8F6] hover:bg-[#28B8F6]/80 text-[#191919] font-semibold rounded-xl cursor-pointer disabled:cursor-not-allowed">
              {generating ? (
                <Loader2 className="animate-spin h-5 w-5" />
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
        <MediaModal
          gen={selectedGen}
          onClose={() => setSelectedGen(null)}
          onUseAsReference={addReferenceFromUrl}
          onRecreate={handleRecreate}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}
