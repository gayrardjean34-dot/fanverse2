'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp,
  Bookmark,
} from 'lucide-react';
import { AI_PROVIDERS, PROVIDER_IDS } from '@/lib/ai/providers';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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

const ASPECT_RATIOS = ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'];
const RESOLUTIONS = ['1K', '2K', '4K'];

function getCreditCost(resolution: string, batchSize: number): number {
  return (resolution === '4K' ? 25 : 20) * batchSize;
}

// ── Image Lightbox ──
function ImageModal({
  gen,
  onClose,
  onUseAsReference,
  onRecreate,
}: {
  gen: Generation;
  onClose: () => void;
  onUseAsReference: (url: string) => void;
  onRecreate: (gen: Generation) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#222] border border-[#333] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-gray-500 font-mono">{gen.model} • {gen.resolution} • {gen.aspectRatio}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>

        {gen.resultUrl && (
          <img src={gen.resultUrl} alt="Generated" className="w-full rounded-xl mb-4 max-h-[50vh] object-contain bg-black" />
        )}

        <div className="bg-[#1a1a1a] rounded-lg p-3 mb-4">
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{gen.prompt}</p>
          {gen.systemPrompt && (
            <p className="text-xs text-gray-500 mt-2 border-t border-[#333] pt-2">System: {gen.systemPrompt}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {gen.resultUrl && (
            <a
              href={gen.resultUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#28B8F6] text-[#191919] text-sm font-medium hover:bg-[#28B8F6]/80 transition-colors"
            >
              <Download className="h-4 w-4" /> Download
            </a>
          )}
          {gen.resultUrl && (
            <button
              onClick={() => { onUseAsReference(gen.resultUrl!); onClose(); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#7F6DE7] text-white text-sm font-medium hover:bg-[#7F6DE7]/80 transition-colors"
            >
              <Bookmark className="h-4 w-4" /> Reference
            </button>
          )}
          <button
            onClick={() => { navigator.clipboard.writeText(gen.prompt); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2a2a2a] border border-[#333] text-gray-300 text-sm font-medium hover:bg-[#333] transition-colors"
          >
            <Copy className="h-4 w-4" /> Copy Prompt
          </button>
          <button
            onClick={() => { onRecreate(gen); onClose(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2a2a2a] border border-[#333] text-gray-300 text-sm font-medium hover:bg-[#333] transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Recreate
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generation Card ──
function GenCard({ gen, onClick }: { gen: Generation; onClick: () => void }) {
  const isPending = gen.status === 'pending' || gen.status === 'processing';
  const isFailed = gen.status === 'failed';

  return (
    <div
      className={`relative group rounded-xl overflow-hidden border transition-all cursor-pointer ${
        isFailed
          ? 'border-red-500/30 bg-[#222]'
          : isPending
          ? 'border-[#28B8F6]/30 bg-[#222]'
          : 'border-[#333] bg-[#222] hover:border-[#28B8F6]/50'
      }`}
      onClick={onClick}
    >
      {isPending && (
        <div className="aspect-square flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#28B8F6] mx-auto mb-2" />
            <span className="text-xs text-gray-500">Generating...</span>
          </div>
        </div>
      )}
      {isFailed && (
        <div className="aspect-square flex items-center justify-center p-4">
          <div className="text-center">
            <X className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <span className="text-xs text-red-400">Failed</span>
            {gen.error && <p className="text-xs text-red-400/60 mt-1 line-clamp-2">{gen.error}</p>}
          </div>
        </div>
      )}
      {gen.status === 'completed' && gen.resultUrl && (
        <>
          <img src={gen.resultUrl} alt="" className="aspect-square w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <p className="text-xs text-white line-clamp-2">{gen.prompt}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">{AI_PROVIDERS[gen.model as keyof typeof AI_PROVIDERS]?.icon} {gen.model}</span>
                <span className="text-xs text-gray-400">• {gen.creditCost} cr</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Studio ──
export default function StudioPage() {
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [model, setModel] = useState<string>('nano-banana-pro');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [resolution, setResolution] = useState('1K');
  const [temperature, setTemperature] = useState<string>('');
  const [topP, setTopP] = useState<string>('');
  const [topK, setTopK] = useState<string>('');
  const [batchSize, setBatchSize] = useState(1);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: history, mutate: mutateHistory } = useSWR<Generation[]>(
    '/api/generate/history?limit=100',
    fetcher,
    { refreshInterval: 3000 }
  );

  const creditCost = getCreditCost(resolution, batchSize);

  // Poll more frequently when there are pending generations
  const hasPending = history?.some((g) => g.status === 'pending' || g.status === 'processing');
  useEffect(() => {
    if (!hasPending) return;
    const interval = setInterval(() => mutateHistory(), 2000);
    return () => clearInterval(interval);
  }, [hasPending, mutateHistory]);

  const handleAddImages = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const remaining = 10 - referenceImages.length;
    const toProcess = Array.from(files).slice(0, remaining);

    toProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setReferenceImages((prev) => {
          if (prev.length >= 10) return prev;
          return [...prev, reader.result as string];
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }, [referenceImages.length]);

  const addReferenceFromUrl = useCallback((url: string) => {
    if (referenceImages.length >= 10) return;
    setReferenceImages((prev) => [...prev, url]);
  }, [referenceImages.length]);

  const removeReference = useCallback((index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRecreate = useCallback((gen: Generation) => {
    setPrompt(gen.prompt);
    setSystemPrompt(gen.systemPrompt || '');
    setModel(gen.model);
    setAspectRatio(gen.aspectRatio || '1:1');
    setResolution(gen.resolution || '1K');
    setTemperature(gen.temperature?.toString() || '');
    setTopP(gen.topP?.toString() || '');
    setTopK(gen.topK?.toString() || '');
    setReferenceImages(gen.referenceImages || []);
  }, []);

  async function handleGenerate() {
    if (!prompt.trim() || generating) return;
    setGenerating(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: prompt.trim(),
          systemPrompt: systemPrompt.trim() || undefined,
          aspectRatio,
          resolution,
          temperature: temperature ? parseFloat(temperature) : undefined,
          topP: topP ? parseFloat(topP) : undefined,
          topK: topK ? parseInt(topK) : undefined,
          referenceImages,
          batchSize,
        }),
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
    <section className="flex flex-col h-[calc(100dvh-68px)]">
      {/* Gallery area — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <h1 className="text-2xl lg:text-3xl font-bold mb-6">Studio</h1>

        {(!history || history.length === 0) ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <ImagePlus className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p>Your generations will appear here</p>
              <p className="text-sm mt-1">Write a prompt below to get started</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {history.map((gen) => (
              <GenCard key={gen.id} gen={gen} onClick={() => setSelectedGen(gen)} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom control panel — fixed */}
      <div className="border-t border-[#333] bg-[#1a1a1a] p-4">
        {/* Reference images row */}
        {referenceImages.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {referenceImages.map((img, i) => (
              <div key={i} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-[#333]">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeReference(i)}
                  className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
            {referenceImages.length < 10 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 w-16 h-16 rounded-lg border border-dashed border-[#444] flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-[#666] transition-colors"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Advanced params toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 mb-3 transition-colors"
        >
          {showAdvanced ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          Advanced Parameters
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-3">
            <div>
              <Label className="text-xs text-gray-500">System Prompt</Label>
              <Input
                className="bg-[#222] border-[#333] text-[#FEFEFE] text-sm h-8 mt-1"
                placeholder="Optional..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Aspect Ratio</Label>
              <select
                className="w-full bg-[#222] border border-[#333] text-[#FEFEFE] text-sm h-8 rounded-md px-2 mt-1 outline-none"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                {ASPECT_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Resolution</Label>
              <select
                className="w-full bg-[#222] border border-[#333] text-[#FEFEFE] text-sm h-8 rounded-md px-2 mt-1 outline-none"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              >
                {RESOLUTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Temperature</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                className="bg-[#222] border-[#333] text-[#FEFEFE] text-sm h-8 mt-1"
                placeholder="0.7"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Top P</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                className="bg-[#222] border-[#333] text-[#FEFEFE] text-sm h-8 mt-1"
                placeholder="0.9"
                value={topP}
                onChange={(e) => setTopP(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Top K</Label>
              <Input
                type="number"
                step="1"
                min="1"
                className="bg-[#222] border-[#333] text-[#FEFEFE] text-sm h-8 mt-1"
                placeholder="40"
                value={topK}
                onChange={(e) => setTopK(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Batch Size</Label>
              <select
                className="w-full bg-[#222] border border-[#333] text-[#FEFEFE] text-sm h-8 rounded-md px-2 mt-1 outline-none"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>{n} image{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Prompt row */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <div className="flex gap-2">
              {/* Add reference images button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 h-12 w-12 rounded-xl bg-[#222] border border-[#333] flex items-center justify-center text-gray-400 hover:text-[#28B8F6] hover:border-[#28B8F6]/30 transition-colors"
                title="Add reference images (max 10)"
              >
                <ImagePlus className="h-5 w-5" />
                {referenceImages.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#28B8F6] text-[#191919] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {referenceImages.length}
                  </span>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleAddImages}
              />

              {/* Prompt input */}
              <textarea
                className="flex-1 bg-[#222] border border-[#333] text-[#FEFEFE] rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-[#28B8F6]/50 transition-colors placeholder-gray-500"
                rows={2}
                placeholder="Describe what you want to generate..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
            </div>
          </div>

          {/* Model selector + Generate button */}
          <div className="flex flex-col gap-2 shrink-0">
            <select
              className="bg-[#222] border border-[#333] text-[#FEFEFE] text-sm h-8 rounded-lg px-2 outline-none"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {PROVIDER_IDS.map((id) => (
                <option key={id} value={id}>
                  {AI_PROVIDERS[id].icon} {AI_PROVIDERS[id].name}
                </option>
              ))}
            </select>

            <Button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="h-12 px-6 bg-[#28B8F6] hover:bg-[#28B8F6]/80 text-[#191919] font-semibold rounded-xl"
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
      </div>

      {/* Lightbox modal */}
      {selectedGen && selectedGen.status === 'completed' && (
        <ImageModal
          gen={selectedGen}
          onClose={() => setSelectedGen(null)}
          onUseAsReference={addReferenceFromUrl}
          onRecreate={handleRecreate}
        />
      )}
    </section>
  );
}
