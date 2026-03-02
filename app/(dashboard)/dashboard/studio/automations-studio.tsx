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
} from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CREDIT_PER_SELFIE = 25;

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
            <span className="text-xs text-gray-500 font-mono">automation-selfie</span>
            <span className="text-xs text-gray-500">{gen.creditCost} cr</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {gen.status === 'completed' && images.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            {images.map((url, i) => (
              <div key={i} className="relative group">
                <img src={url} alt={`Selfie ${i + 1}`} className="w-full rounded-xl object-cover aspect-square bg-black" />
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

        {/* Download all button */}
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
  const [quantity, setQuantity] = useState(1);
  const [referenceImage, setReferenceImage] = useState<{ file: File; preview: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const creditCost = quantity * CREDIT_PER_SELFIE;

  const { data: history, mutate: mutateHistory } = useSWR<Generation[]>(
    '/api/generate/history?limit=100&model=automation-selfie',
    fetcher,
    { refreshInterval: 3000 }
  );

  // Filter to only automation generations
  const automationHistory = history?.filter((g) => g.model === 'automation-selfie') || [];

  const hasPending = automationHistory.some((g) => g.status === 'pending' || g.status === 'processing');
  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(() => { mutateHistory(); }, 3000);
    return () => clearInterval(interval);
  }, [hasPending, mutateHistory]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setReferenceImage({ file, preview });
    e.target.value = '';
  }, []);

  const removeReference = useCallback(() => {
    if (referenceImage) {
      URL.revokeObjectURL(referenceImage.preview);
      setReferenceImage(null);
    }
  }, [referenceImage]);

  async function handleGenerate() {
    if (!referenceImage || generating) return;
    setGenerating(true);
    try {
      const formData = new FormData();
      formData.append('Ref_1', referenceImage.file);
      formData.append('quantity', quantity.toString());

      const res = await fetch('/api/automations/generate', {
        method: 'POST',
        body: formData,
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
              <p className="text-sm mt-1">Upload a reference image and set quantity below</p>
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
        {/* Reference image */}
        {referenceImage && (
          <div className="flex gap-3 mb-3">
            <div className="relative shrink-0 w-20 h-20">
              <img src={referenceImage.preview} alt="Reference" className="w-full h-full object-cover rounded-lg border border-[#333]" />
              <button onClick={removeReference}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center shadow-lg z-10">
                <X className="h-3 w-3 text-white" />
              </button>
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
                Ref 1
              </span>
            </div>
          </div>
        )}

        {/* Controls row */}
        <div className="flex gap-3 items-end">
          <div className="flex-1 flex gap-3 items-end">
            {/* Upload button */}
            <div className="relative shrink-0">
              <button onClick={() => fileInputRef.current?.click()}
                className={`h-12 w-12 rounded-xl border flex items-center justify-center transition-colors ${
                  referenceImage
                    ? 'bg-[#7F6DE7]/10 border-[#7F6DE7]/30 text-[#7F6DE7]'
                    : 'bg-[#222] border-[#333] text-gray-400 hover:text-[#7F6DE7] hover:border-[#7F6DE7]/30'
                }`}
                title="Upload reference image">
                <ImagePlus className="h-5 w-5" />
              </button>
              {referenceImage && (
                <span className="absolute -top-1 -right-1 bg-[#7F6DE7] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  1
                </span>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

            {/* Quantity */}
            <div className="w-32">
              <Label className="text-xs text-gray-500 mb-1 block">How many images</Label>
              <input
                type="number"
                min="1"
                max="50"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                className="w-full bg-[#222] border border-[#333] text-[#FEFEFE] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#7F6DE7]/50 transition-colors h-12"
              />
            </div>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={generating || !referenceImage}
            className="h-12 px-6 bg-[#7F6DE7] hover:bg-[#7F6DE7]/80 text-white font-semibold rounded-xl disabled:opacity-50"
          >
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

      {selectedGen && (
        <AutomationMediaModal
          gen={selectedGen}
          onClose={() => setSelectedGen(null)}
        />
      )}
    </>
  );
}
