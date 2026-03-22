'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────

type AutomationInput = {
  src: string;
  label: string;
};

type AutomationData = {
  id: string;
  name: string;
  icon: string;
  badge?: 'beta';
  description: string;
  studioPath: string;
  inputs: AutomationInput[];
  outputs: string[];
};

// ── Automation Data ────────────────────────────────────────────────────────────

const AUTOMATIONS: AutomationData[] = [
  {
    id: 'infinite-carousel',
    name: 'Infinite Carousel',
    icon: '🎠',
    badge: 'beta',
    description:
      'Generate unlimited carousel posts from a single reference photo. Perfect for creating a consistent series of varied images for your AI influencer.',
    studioPath: '/dashboard/studio?automation=infinite-carousel',
    inputs: [{ src: '/images/REFAELYS.jpg', label: 'Reference photo' }],
    outputs: [
      '/images/CAROUSEL%20(1).jpg',
      '/images/CAROUSEL%20(2).jpg',
      '/images/CAROUSEL%20(3).jpg',
      '/images/CAROUSEL%20(4).jpg',
      '/images/CAROUSEL%20(5).jpg',
    ],
  },
  {
    id: 'infinite-selfies',
    name: 'Infinite Selfies',
    icon: '📸',
    description:
      'Generate dozens of unique selfie-style photos from a single reference image. Consistent identity, infinite variety — ready to post instantly.',
    studioPath: '/dashboard/studio?automation=infinite-selfies',
    inputs: [{ src: '/images/REFAELYS.jpg', label: 'Reference photo' }],
    outputs: [
      '/images/selfies%20(1).png',
      '/images/selfies%20(2).png',
      '/images/selfies%20(3).png',
      '/images/selfies%20(4).png',
      '/images/selfies%20(5).png',
    ],
  },
  {
    id: 'face-swap',
    name: 'EZ Face Swap',
    icon: '🔄',
    description:
      "Swap your AI influencer's face onto any photo in one click. Upload your reference and target images and get a seamless, realistic result instantly.",
    studioPath: '/dashboard/studio?automation=face-swap',
    inputs: [
      { src: '/images/refemma.png', label: 'Reference face' },
      { src: '/images/ezfaceswap.jpg', label: 'Image to swap' },
    ],
    outputs: ['/images/ezfaceswapfini.png'],
  },
  {
    id: 'ez-face-swap-uncensored',
    name: 'EZ Face Swap Semi-Uncensored',
    icon: '🚀',
    badge: 'beta',
    description:
      'All the power of EZ Face Swap with semi-uncensored outputs. Generate bold, unrestricted content for your most exclusive channels.',
    studioPath: '/dashboard/studio?automation=ez-face-swap-uncensored',
    inputs: [
      { src: '/images/refemma.png', label: 'Reference face' },
      { src: '/images/plageselfie.jpg', label: 'Image to swap' },
    ],
    outputs: ['/images/plageselfieok.png'],
  },
];

// ── Result Slideshow ──────────────────────────────────────────────────────────

function ResultSlideshow({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (images.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % images.length);
    }, 2000);
  }, [images.length]);

  useEffect(() => {
    startInterval();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startInterval]);

  const navigate = (dir: 1 | -1) => {
    setCurrent((c) => (c + dir + images.length) % images.length);
    startInterval();
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div
        className="relative w-full rounded-2xl overflow-hidden bg-[#0a0a0a] border border-white/10 shadow-xl shadow-black/50"
        style={{ aspectRatio: '3/4' }}
      >
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt="Result"
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out"
            style={{ opacity: i === current ? 1 : 0 }}
          />
        ))}

        {/* Result label */}
        <div className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10">
          <span className="text-xs font-semibold text-white/80 tracking-wide">
            {images.length > 1 ? `Result ${current + 1}/${images.length}` : 'Result'}
          </span>
        </div>

        {images.length > 1 && (
          <>
            <button
              onClick={() => navigate(-1)}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/15 text-white/70 hover:text-white hover:bg-black/70 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate(1)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/15 text-white/70 hover:text-white hover:bg-black/70 transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrent(i); startInterval(); }}
                  className={`rounded-full transition-all duration-300 ${
                    i === current ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <span className="text-xs text-gray-500 font-medium">
        {images.length > 1 ? `${images.length} generated results` : 'Generated result'}
      </span>
    </div>
  );
}

// ── Automation Card ────────────────────────────────────────────────────────────

function AutomationCard({ data }: { data: AutomationData }) {
  const hasTwoInputs = data.inputs.length > 1;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
            <span className="text-3xl leading-none">{data.icon}</span>
            <h3 className="text-2xl font-bold text-white leading-tight">{data.name}</h3>
            {data.badge === 'beta' && (
              <span
                title="This automation is currently in beta — features may evolve."
                className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 cursor-help"
              >
                <Info className="h-3 w-3" />
                Beta
              </span>
            )}
          </div>
          <p className="text-gray-400 text-base leading-relaxed max-w-xl">{data.description}</p>
        </div>
        <Button
          asChild
          className="shrink-0 bg-[#7F6DE7] hover:bg-[#7F6DE7]/80 text-white font-semibold self-start px-5"
        >
          <Link href={data.studioPath}>
            Try it
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Visual: Inputs → Arrow → Output */}
      <div className="flex items-center justify-center gap-5 sm:gap-10">

        {/* Inputs */}
        {hasTwoInputs ? (
          // Two inputs stacked vertically → bigger images
          <div className="flex flex-col items-center gap-3 shrink-0" style={{ width: 'clamp(130px, 18vw, 200px)' }}>
            {data.inputs.map((input, idx) => (
              <div key={idx} className="relative w-full flex flex-col items-center gap-1.5">
                {idx > 0 && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#1a1a1a] border border-white/15 text-white/50 text-sm font-bold -mt-1 mb-0.5">
                    +
                  </div>
                )}
                <div
                  className="w-full rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/10 shadow-lg"
                  style={{ aspectRatio: '3/4' }}
                >
                  <img src={input.src} alt={input.label} className="w-full h-full object-cover" />
                </div>
                <span className="text-xs text-gray-500 font-medium text-center">{input.label}</span>
              </div>
            ))}
          </div>
        ) : (
          // Single input
          <div className="flex flex-col items-center gap-2 shrink-0" style={{ width: 'clamp(160px, 22vw, 250px)' }}>
            <div
              className="w-full rounded-xl overflow-hidden bg-[#0a0a0a] border border-white/10 shadow-lg"
              style={{ aspectRatio: '3/4' }}
            >
              <img src={data.inputs[0].src} alt={data.inputs[0].label} className="w-full h-full object-cover" />
            </div>
            <span className="text-xs text-gray-500 font-medium">{data.inputs[0].label}</span>
          </div>
        )}

        {/* Arrow */}
        <div className="shrink-0 flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-[#7F6DE7]/15 border border-[#7F6DE7]/30">
            <ArrowRight className="h-6 w-6 text-[#7F6DE7]" />
          </div>
          <span className="text-[10px] text-gray-600 font-semibold tracking-widest uppercase">AI</span>
        </div>

        {/* Output */}
        <div className="shrink-0" style={{ width: 'clamp(160px, 22vw, 260px)' }}>
          <ResultSlideshow images={data.outputs} />
        </div>

      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AutomationsShowcase() {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Transition helper: fade out → swap content → fade in
  // Uses double rAF after content swap so CSS transition triggers correctly
  const transitionTo = useCallback((getNext: (c: number) => number) => {
    setVisible(false);
    setTimeout(() => {
      setCurrent((c) => getNext(c));
      // Double rAF: ensures the DOM has painted the new content before we trigger fade-in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVisible(true);
        });
      });
    }, 280);
  }, []);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      transitionTo((c) => (c + 1) % AUTOMATIONS.length);
    }, 10000);
  }, [transitionTo]);

  useEffect(() => {
    startInterval();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startInterval]);

  const navigate = (dir: 1 | -1) => {
    transitionTo((c) => (c + dir + AUTOMATIONS.length) % AUTOMATIONS.length);
    startInterval();
  };

  const goTo = (idx: number) => {
    if (idx === current) return;
    transitionTo(() => idx);
    startInterval();
  };

  return (
    <section className="py-20 bg-transparent relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">
            Our <span className="fan-gradient-text">Automations</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            One-click AI workflows that transform your content creation. See what&apos;s possible.
          </p>
        </div>

        {/* Automation tabs */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {AUTOMATIONS.map((auto, idx) => (
            <button
              key={auto.id}
              onClick={() => goTo(idx)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                idx === current
                  ? 'bg-[#7F6DE7]/20 text-[#7F6DE7] border border-[#7F6DE7]/40'
                  : 'bg-[#111]/80 text-gray-400 border border-white/8 hover:border-white/20 hover:text-gray-300'
              }`}
            >
              <span className="text-base leading-none">{auto.icon}</span>
              <span className="hidden sm:inline">{auto.name}</span>
            </button>
          ))}
        </div>

        {/* Main card */}
        <div className="max-w-5xl mx-auto">
          <div
            className="bg-[#111]/80 backdrop-blur-sm border border-white/8 rounded-2xl p-8 lg:p-10"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
            }}
          >
            <AutomationCard data={AUTOMATIONS[current]} />
          </div>

          {/* Bottom navigation */}
          <div className="flex items-center justify-between mt-5 px-1">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Prev
            </button>
            <div className="flex gap-2">
              {AUTOMATIONS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === current
                      ? 'w-5 h-1.5 bg-[#7F6DE7]'
                      : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => navigate(1)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>
    </section>
  );
}
