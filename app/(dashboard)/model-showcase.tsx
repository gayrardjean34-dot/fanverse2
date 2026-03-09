'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Clock, Film, Image as ImageIcon } from 'lucide-react';
import { AI_PROVIDERS, ACTIVE_PROVIDER_IDS } from '@/lib/ai/providers';

// ── Vitrine items with per-photo captions ─────────────────────────────────────
const VITRINE_ITEMS = [
  { src: '/images/vitrine5.jpeg',       caption: 'Made with Infinite Re-pose automation' },
  { src: '/images/vitrine%20(1).png',   caption: 'Made with EZ Face Swap automation' },
  { src: '/images/vitrine3.png',        caption: 'Made with Infinite selfies automation' },
  { src: '/images/vitrine2.jpeg',       caption: 'Made with Infinite Carousel automation' },
  { src: '/images/vitrine6.jpeg',       caption: 'Made with Outfit Swap automation' },
];

const GRADIENT = 'linear-gradient(135deg, rgba(40,184,246,0.85) 0%, rgba(127,109,231,0.85) 50%, rgba(211,36,217,0.85) 100%)';

// ── Model groups ──────────────────────────────────────────────────────────────
const LEFT_MODEL_IDS  = ['nano-banana-pro', 'nano-banana-2', 'grok-imagine'];
const CENTER_MODEL_ID = 'seedream';
const RIGHT_MODEL_IDS = ['kling-3.0', 'kling-2.6', 'kling-motion-control'];

// ── Vitrine Slideshow ─────────────────────────────────────────────────────────
function VitrineSlideshow() {
  const [current, setCurrent] = useState(0);
  const [captionVisible, setCaptionVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCaptionVisible(false);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % VITRINE_ITEMS.length);
        setCaptionVisible(true);
      }, 350);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mt-8">
      {/* Dynamic caption badge — peeks above the photo */}
      <div
        className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-xl whitespace-nowrap shadow-lg"
        style={{
          background: GRADIENT,
          opacity: captionVisible ? 1 : 0,
          transform: captionVisible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(4px)',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
        }}
      >
        <span className="text-sm font-bold text-white tracking-wide">{VITRINE_ITEMS[current].caption}</span>
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

        {/* Up to 4K Quality badge — top left */}
        <div
          className="absolute top-3 left-3 z-10 flex items-center px-2.5 py-1 rounded-lg backdrop-blur-sm"
          style={{ background: GRADIENT }}
        >
          <span className="text-[11px] font-bold text-white tracking-wide">Up to 4k Quality</span>
        </div>

        {/* Subtle gradient at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

        {/* Dot indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {VITRINE_ITEMS.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/35'
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
      className="bg-[#111]/70 backdrop-blur-sm border border-white/8 rounded-xl px-4 py-3.5 hover:border-[#28B8F6]/30 hover:bg-[#111]/90 transition-all duration-200 cursor-default"
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

        {/* 3-column symmetric grid: left (3) | center (1) | right (3) */}
        <div className="grid grid-cols-3 gap-4 mb-24">
          {/* Left column */}
          <div className="flex flex-col gap-3">
            {LEFT_MODEL_IDS.map((id, i) => (
              <ModelCard key={id} id={id} isActive={ACTIVE_PROVIDER_IDS.includes(id)} index={i} />
            ))}
          </div>

          {/* Center — single card, vertically centered */}
          <div className="flex items-center justify-center">
            <div className="w-full">
              <ModelCard id={CENTER_MODEL_ID} isActive={ACTIVE_PROVIDER_IDS.includes(CENTER_MODEL_ID)} index={3} />
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-3">
            {RIGHT_MODEL_IDS.map((id, i) => (
              <ModelCard key={id} id={id} isActive={ACTIVE_PROVIDER_IDS.includes(id)} index={i + 4} />
            ))}
          </div>
        </div>

        {/* ── Automations block ── */}
        <div ref={autoRef} style={fadeStyle(autoVisible)} className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">
            Unique <span className="fan-gradient-text">automations</span> built for scaling content creation
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            One-click workflows that generate, swap, and style — ready to post.
          </p>
        </div>

        {/* Slideshow — centered, max width constrained */}
        <div className="max-w-xs mx-auto">
          <VitrineSlideshow />
        </div>

      </div>
    </section>
  );
}
