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
  ChevronDown,
  Coins,
  Layers,
  Settings2,
  Bookmark,
} from 'lucide-react';
import { AI_PROVIDERS, PROVIDER_IDS, type ProviderId } from '@/lib/ai/providers';

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

function getCreditCost(resolution: string) {
  return resolution === '4K' ? 25 : 20;
}

// ====== Image Lightbox ======
function ImageLightbox({
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#222] border border-[#333] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 mr-4">
            <p className="text-sm text-gray-400 mb-1">
              {AI_PROVIDERS[gen.model as ProviderId]?.icon}{' '}
              {AI_PROVIDERS[gen.model as ProviderId]?.name || gen.model} •{' '}
              {gen.aspectRatio} • {gen.resolution} • {gen.creditCost} cr
            </p>
            <p className="text-sm text-gray-300 line-clamp-3">{gen.prompt}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {gen.resultUrl && (
          <img
            src={gen.resultUrl}
            alt={gen.prompt}
            className="w-full rounded-xl mb-6 max-h-[60vh] object-contain bg-black/20"
          />
        )}

        <div className="flex flex-wrap gap-2">
          {gen.resultUrl && (
            <a
              href={gen.resultUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#28B8F6] hover:bg-[#28B8F6]/80 text-[#191919] text-sm font-medium transition-colors"
            >
              <Download className="h-4 w-4" /> Download
            </a>
          )}
          {gen.resultUrl && (
            <button
              onClick={() => {
                onUseAsReference(gen.resultUrl!);
                onClose();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7F6DE7] hover:bg-[#7F6DE7]/80 text-white text-sm font-medium transition-colors"
            >
              <Bookmark className="h-4 w-4" /> Use as Reference
            </button>
          )}
          <button
            onClick={() => {
              navigator.clipboard.writeText(gen.prompt);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#333] border border-[#333] text-gray-300 text-sm font-medium transition-colors"
          >
            <Copy className="h-4 w-4" /> Copy Prompt
          </button>
          <button
            onClick={() => {
              onRecreate(gen);
              onClose();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2a2a2a] hover:bg-[#333] border border-[#333] text-gray-300 text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Recreate
          </button>
        </div>
      </div>
    </div>
  );
}

// ====== Generation Card ======
function GenerationCard({
  gen,
  onClick,
}: {
  gen: Generation;
  onClick: () => void;
}) {
  return (
    <div
      className="group relative rounded-xl overflow-hidden bg-[#2a2a2a] border border-[#333] hover:border-[#28B8F6]/30 transition-all cursor-pointer aspect-square"
      onClick={onClick}
    >
      {gen.status === 'completed' && gen.resultUrl ? (
        <img
          src={gen.resultUrl}
          alt={gen.prompt}
          className="w-full h-full object-cover"
        />
      ) : gen.status === 'failed' ? (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
          <X className="h-8 w-8 text-red-400 mb-2" />
          <p className="text-red-400 text-xs text-center line-clamp-2">{gen.error || 'Failed'}</p>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-[#28B8F6] animate-spin mb-2" />
          <p className="text-gray-400 text-xs">Generating...</p>
        </div>
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-xs line-clamp-2">{gen.prompt}</p>
          <p className="text-gray-400 text-[10px] mt-1">
            {AI_PROVIDERS[gen.model as ProviderId]?.icon} {gen.resolution} • {gen.creditCost} cr
          </p>
        </div>
      </div>
    </div>
  );
}

// ====== Main Studio ======
export default function StudioPage() {
  const [model, setModel] = useState<string>('nano-banana-pro');
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [resolution, setResolution] = useState('1K');
  const [temperature, setTemperature] = useState<string>('');
  const [topP, setTopP] = useState<string>('');
  const [topK, setTopK] = useState<string>('');
  const [batchSize, setBatchSize] = useState(1);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedGen, setSelectedGen] = useState<Generation | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Poll history (refresh every 3s while generating, else 15s)
  const { data: history } = useSWR<Generation[]>(
    '/api/generate/history?limit=100',
    fetcher,
    { refreshInterval: generating ? 3000 : 15000 }
  );

  const { data: creditData } = useSWR<{ balance: number }>('/api/credits/balance', fetcher);

  // Check if any generation is still processing
  useEffect(() => {
    if (history?.some((g) => g.status === 'pending' || g.status === 'processing')) {
      if (!generating) setGenerating(true);
    } else if (generating && history) {
      setGenerating(false);
    }
  }, [history]);

  const totalCost = getCreditCost(resolution) * batchSize;

  // Handle reference image upload
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (referenceImages.length >= 10) return;
      const reader = new FileReader();
      reader.onload = () => {
        setReferenceImages((prev) => {
          if (prev.length >= 10) return prev;
          return [...prev, reader.result as string];
        });
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    setModel(gen.model);
    setAspectRatio(gen.aspectRatio || '1:1');
    setResolution(gen.resolution || '1K');
    if (gen.systemPrompt) setSystemPrompt(gen.systemPrompt);
    if (gen.temperature !== null) setTemperature(String(gen.temperature));
    if (gen.topP !== null) setTopP(String(gen.topP));
    if (gen.topK !== null) setTopK(String(gen.topK));
    if (gen.referenceImages && gen.referenceImages.length > 0) {
      setReferenceImages(gen.referenceImages);
    }
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
          referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
          batchSize,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Generation failed');
        setGenerating(false);
        return;
      }

      // Refresh history immediately
      mutate('/api/generate/history?limit=100');
      mutate('/api/credits/balance');
    } catch {
      alert('Something went wrong');
      setGenerating(false);
    }
  }

  // Group generations by batch
  const batches: { batchId: string; gens: Generation[]; date: string }[] = [];
  if (history) {
    const batchMap = new Map<string, Generation[]>();
    for (const gen of history) {
      const existing = batchMap.get(gen.batchId) || [];
      existing.push(gen);
      batchMap.set(gen.batchId, existing);
    }
    for (const [batchId, gens] of batchMap) {
      batches.push({
        batchId,
        gens,
        date: new Date(gens[0].createdAt).toLocaleString(),
      });
    }
  }

  return (
    <section className="flex flex-col h-[calc(100dvh-68px)]">
      {/* Gallery area — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold">Studio</h1>
          <div className="flex items-center gap-2 text-sm">
            <Coins className="h-4 w-4 text-[#28B8F6]" />
            <span className="text-gray-400">
              <span className="text-[#28B8F6] font-semibold">{creditData?.balance ?? '—'}</span> credits
            </span>
          </div>
        </div>

        {(!history || history.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ImagePlus className="h-16 w-16 text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg mb-2">No generations yet</p>
            <p className="text-gray-500 text-sm">Write a prompt below and hit generate!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {batches.map((batch) => (
              <div key={batch.batchId}>
                <p className="text-xs text-gray-500 mb-3">{batch.date}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {batch.gens.map((gen) => (
                    <GenerationCard
                      key={gen.id}
                      gen={gen}
                      onClick={() => setSelectedGen(gen)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom panel — fixed */}
      <div className="border-t border-[#333] bg-[#191919] p-4">
        {/* Reference images */}
        {referenceImages.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            {referenceImages.map((img, i) => (
              <div key={i} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-[#333]">
                <img src={img} alt={`ref ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removeReference(i)}
                  className="absolute top-0 right-0 bg-black/60 rounded-bl-lg p-0.5"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ))}
            {referenceImages.length < 10 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 w-16 h-16 rounded-lg border border-dashed border-[#444] flex items-center justify-center text-gray-500 hover:text-gray-300 hover:border-[#555] transition-colors"
              >
                <ImagePlus className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {/* Settings panel (collapsible) */}
        {showSettings && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-3 p-3 bg-[#222] rounded-xl border border-[#333]">
            <div>
              <Label className="text-xs text-gray-500 mb-1">System Prompt</Label>
              <Input
                className="bg-[#2a2a2a] border-[#333] text-[#FEFEFE] text-sm h-9"
                placeholder="Optional..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1">Aspect Ratio</Label>
              <select
                className="w-full h-9 rounded-md bg-[#2a2a2a] border border-[#333] text-[#FEFEFE] text-sm px-2"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                {ASPECT_RATIOS.map((ar) => (
                  <option key={ar} value={ar}>{ar}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1">Resolution</Label>
              <select
                className="w-full h-9 rounded-md bg-[#2a2a2a] border border-[#333] text-[#FEFEFE] text-sm px-2"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              >
                {RESOLUTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1">Temperature</Label>
              <Input
                className="bg-[#2a2a2a] border-[#333] text-[#FEFEFE] text-sm h-9"
                type="number"
                step="0.1"
                min="0"
                max="2"
                placeholder="0.7"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1">Top P</Label>
              <Input
                className="bg-[#2a2a2a] border-[#333] text-[#FEFEFE] text-sm h-9"
                type="number"
                step="0.1"
                min="0"
                max="1"
                placeholder="0.9"
                value={topP}
                onChange={(e) => setTopP(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1">Top K</Label>
              <Input
                className="bg-[#2a2a2a] border-[#333] text-[#FEFEFE] text-sm h-9"
                type="number"
                step="1"
                min="1"
                placeholder="40"
                value={topK}
                onChange={(e) => setTopK(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Main input row */}
        <div className="flex items-end gap-3">
          {/* Reference image button */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-10 rounded-lg bg-[#2a2a2a] border border-[#333] flex items-center justify-center text-gray-400 hover:text-[#FEFEFE] hover:border-[#444] transition-colors"
              title="Add reference images"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>

          {/* Settings toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`h-10 w-10 rounded-lg border flex items-center justify-center transition-colors ${
              showSettings
                ? 'bg-[#28B8F6]/10 border-[#28B8F6]/30 text-[#28B8F6]'
                : 'bg-[#2a2a2a] border-[#333] text-gray-400 hover:text-[#FEFEFE]'
            }`}
            title="Settings"
          >
            <Settings2 className="h-4 w-4" />
          </button>

          {/* Prompt input */}
          <div className="flex-1">
            <textarea
              className="w-full bg-[#222] border border-[#333] text-[#FEFEFE] rounded-xl p-3 text-sm min-h-[44px] max-h-[120px] resize-none focus:ring-[#28B8F6] focus:border-[#28B8F6] outline-none placeholder-gray-500"
              placeholder="Describe what you want to generate..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              rows={1}
            />
          </div>

          {/* Model selector */}
          <div className="shrink-0">
            <select
              className="h-10 rounded-lg bg-[#2a2a2a] border border-[#333] text-[#FEFEFE] text-sm px-3 pr-8"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {PROVIDER_IDS.map((id) => (
                <option key={id} value={id}>
                  {AI_PROVIDERS[id].icon} {AI_PROVIDERS[id].name}
                </option>
              ))}
            </select>
          </div>

          {/* Batch size */}
          <div className="shrink-0 flex items-center gap-1">
            <Layers className="h-4 w-4 text-gray-500" />
            <select
              className="h-10 w-16 rounded-lg bg-[#2a2a2a] border border-[#333] text-[#FEFEFE] text-sm px-2"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>×{n}</option>
              ))}
            </select>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="h-10 bg-[#28B8F6] hover:bg-[#28B8F6]/80 text-[#191919] font-semibold shrink-0 px-5"
          >
            {generating ? (
              <Loader2 className="animate-spin h-4 w-4" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Generate
                <span className="ml-2 text-xs opacity-70">({totalCost} cr)</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Lightbox */}
      {selectedGen && (
        <ImageLightbox
          gen={selectedGen}
          onClose={() => setSelectedGen(null)}
          onUseAsReference={addReferenceFromUrl}
          onRecreate={handleRecreate}
        />
      )}
    </section>
  );
}
