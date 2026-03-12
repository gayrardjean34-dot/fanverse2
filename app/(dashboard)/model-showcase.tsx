'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock, Film, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { AI_PROVIDERS, ACTIVE_PROVIDER_IDS } from '@/lib/ai/providers';

// ── Vitrine items with per-photo captions ─────────────────────────────────────
const VITRINE_ITEMS = [
  { src: '/images/vitrine7.png',        caption: 'Made with EZ Face Swap Uncensored' },
  { src: '/images/vitrine%20(1).png',   caption: 'Made with EZ Face Swap automation' },
  { src: '/images/vitrine3.png',        caption: 'Made with Infinite selfies automation' },
  { src: '/images/vitrine5.jpeg',       caption: 'Made with Infinite Re-pose automation' },
  { src: '/images/vitrine2.jpeg',       caption: 'Made with Infinite Carousel automation' },
  { src: '/images/vitrine6.png',        caption: 'Made with Outfit Swap automation' },
];

const GRADIENT = 'linear-gradient(135deg, rgba(40,184,246,0.85) 0%, rgba(127,109,231,0.85) 50%, rgba(211,36,217,0.85) 100%)';

// ── Model groups ──────────────────────────────────────────────────────────────
const LEFT_MODEL_IDS  = ['nano-banana-pro', 'nano-banana-2', 'grok-imagine'];
const RIGHT_MODEL_IDS = ['kling-3.0', 'kling-2.6', 'kling-motion-control', 'kling-motion-control-3.0'];
const BOTTOM_MODEL_ID = 'seedream-4.5';

// ── Vitrine Slideshow ─────────────────────────────────────────────────────────
function VitrineSlideshow() {
  const [current, setCurrent] = useState(0);
  const [captionVisible, setCaptionVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCaptionVisible(false);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % VITRINE_ITEMS.length);
        setCaptionVisible(true);
      }, 350);
    }, 4000);
  }, []);

  useEffect(() => {
    startInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startInterval]);

  const navigate = (dir: 1 | -1) => {
    setCaptionVisible(false);
    setTimeout(() => {
      setCurrent((c) => (c + dir + VITRINE_ITEMS.length) % VITRINE_ITEMS.length);
      setCaptionVisible(true);
    }, 200);
    startInterval();
  };

  return (
    <div className="relative">
      {/* Caption badge */}
      <div
        className="absolute -top-5 -right-4 z-20 px-3 py-2 rounded-xl shadow-xl max-w-[70%] text-right"
        style={{
          background: GRADIENT,
          opacity: captionVisible ? 1 : 0,
          transition: 'opacity 0.35s ease',
        }}
      >
        <span className="text-sm font-bold text-white tracking-wide leading-tight">{VITRINE_ITEMS[current].caption}</span>
      </div>

      {/* Photo container */}
      <div
        className="relative w-full rounded-2xl overflow-hidden bg-[#111] border border-white/10 shadow-2xl shadow-black/40"
        style={{ aspectRatio: '3/4' }}
      >
        {VITRINE_ITEMS.map((item, i) => (
          <img
            key={item.src}
            src={item.src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
            style={{ opacity: i === current ? 1 : 0 }}
          />
        ))}

        {/* Up to 4K Quality badge */}
        <div
          className="absolute top-3 left-3 z-10 flex items-center px-2.5 py-1 rounded-lg backdrop-blur-sm"
          style={{ background: GRADIENT }}
        >
          <span className="text-[11px] font-bold text-white tracking-wide">Up to 4k Quality</span>
        </div>

        {/* Subtle gradient at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Navigation arrows */}
        <button
          onClick={() => navigate(-1)}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 text-white/70 hover:text-white hover:bg-black/60 hover:border-white/30 transition-all duration-200"
          aria-label="Previous"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => navigate(1)}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 text-white/70 hover:text-white hover:bg-black/60 hover:border-white/30 transition-all duration-200"
          aria-label="Next"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Dot indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {VITRINE_ITEMS.map((_, i) => (
            <button
              key={i}
              onClick={() => { navigate(i < current ? -1 : 1); setCurrent(i); startInterval(); }}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/35 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Model Card ────────────────────────────────────────────────────────────────
function ModelCard({ id, isActive, index }: { id: string; isActive: boolean; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const provider = AI_PROVIDERS[id];

  return (
    <div
      ref={ref}
      onClick={() => router.push(`/dashboard/studio?model=${id}`)}
      className="bg-[#111]/70 backdrop-blur-sm border border-white/8 rounded-xl px-4 py-3.5 hover:border-[#28B8F6]/40 hover:bg-[#111]/90 transition-all duration-200 cursor-pointer"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.45s ease ${index * 55}ms, transform 0.45s ease ${index * 55}ms, border-color 0.2s, background 0.2s`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl leading-none shrink-0">{provider.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#FEFEFE] leading-tight truncate">
              {provider.name}
            </p>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-flex items-center gap-1 ${
                provider.type === 'video'
                  ? 'bg-[#7F6DE7]/10 text-[#7F6DE7]'
                  : 'bg-[#28B8F6]/10 text-[#28B8F6]'
              }`}
            >
              {provider.type === 'video'
                ? <><Film className="h-2.5 w-2.5" />Video</>
                : <><ImageIcon className="h-2.5 w-2.5" />Image</>
              }
            </span>
          </div>
        </div>

        {isActive ? (
          <div className="flex items-center gap-1 text-green-400 shrink-0">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Available</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-gray-500 shrink-0">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Coming Soon</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Section ──────────────────────────────────────────────────────────────
export default function ModelShowcase() {
  const modelsRef = useRef<HTMLDivElement>(null);
  const autoRef   = useRef<HTMLDivElement>(null);
  const [modelsVisible, setModelsVisible] = useState(false);
  const [autoVisible,   setAutoVisible]   = useState(false);

  useEffect(() => {
    function observe(el: HTMLElement | null, set: (v: boolean) => void) {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) { set(true); obs.disconnect(); } },
        { threshold: 0.2 }
      );
      obs.observe(el);
      return () => obs.disconnect();
    }
    observe(modelsRef.current, setModelsVisible);
    observe(autoRef.current,   setAutoVisible);
  }, []);

  const fadeStyle = (visible: boolean) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(20px)',
    transition: 'opacity 0.6s ease, transform 0.6s ease',
  });

  return (
    <section className="py-20 bg-transparent relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Models block ── */}
        <div ref={modelsRef} style={fadeStyle(modelsVisible)} className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">
            The Latest <span className="fan-gradient-text">AI Models</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Choose from the latest and most popular AI models for image and video generation.
          </p>
        </div>

        {/* 2-column centered grid */}
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-3">
            {LEFT_MODEL_IDS.map((id, i) => (
              <ModelCard key={id} id={id} isActive={ACTIVE_PROVIDER_IDS.includes(id)} index={i} />
            ))}
          </div>
          <div className="flex flex-col gap-3">
            {RIGHT_MODEL_IDS.map((id, i) => (
              <ModelCard key={id} id={id} isActive={ACTIVE_PROVIDER_IDS.includes(id)} index={i + LEFT_MODEL_IDS.length} />
            ))}
          </div>
        </div>

        {/* Seedream 4.5 — centered below, half width */}
        <div className="max-w-3xl mx-auto mb-24">
          <div className="w-1/2 mx-auto">
            <ModelCard id={BOTTOM_MODEL_ID} isActive={ACTIVE_PROVIDER_IDS.includes(BOTTOM_MODEL_ID)} index={LEFT_MODEL_IDS.length + RIGHT_MODEL_IDS.length} />
          </div>
        </div>

        {/* ── Automations block ── */}
        <div ref={autoRef} style={fadeStyle(autoVisible)} className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">
            Unique <span className="fan-gradient-text">automations</span> built for scaling content creation
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            One-click workflows that generate infinite amount of content, ready to post!
          </p>
        </div>

        {/* Slideshow — padded so caption badge has room to peek out */}
        <div className="max-w-[480px] mx-auto pt-6 pr-4">
          <VitrineSlideshow />
        </div>

      </div>
    </section>
  );
}
