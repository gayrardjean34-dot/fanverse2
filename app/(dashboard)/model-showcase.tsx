'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Clock, Film, Image as ImageIcon } from 'lucide-react';
import { AI_PROVIDERS, ACTIVE_PROVIDER_IDS } from '@/lib/ai/providers';

// ── Vitrine images — order: 5-1-3-2-4 ────────────────────────────────────────
const VITRINE_IMAGES = [
  '/images/vitrine%20(5).jpeg',
  '/images/vitrine%20(1).png',
  '/images/vitrine%20(3).png',
  '/images/vitrine%20(2).jpeg',
  '/images/vitrine%20(4).png',
];

const comingSoonIds = Object.keys(AI_PROVIDERS).filter(
  (id) => !ACTIVE_PROVIDER_IDS.includes(id)
);
const allIds = [...ACTIVE_PROVIDER_IDS, ...comingSoonIds];

// ── Vitrine Slideshow ─────────────────────────────────────────────────────────
function VitrineSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((c) => (c + 1) % VITRINE_IMAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-[#111] border border-white/10 shadow-2xl shadow-black/40"
      style={{ aspectRatio: '3/4' }}
    >
      {VITRINE_IMAGES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === current ? 1 : 0 }}
        />
      ))}

      {/* Subtle gradient overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {VITRINE_IMAGES.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === current ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/35'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Model Card (compact — no preview carousel) ────────────────────────────────
function ModelCard({ id, isActive, index }: { id: string; isActive: boolean; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
      },
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
        {/* Left: icon + name + type */}
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

        {/* Right: status */}
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
  const titleRef = useRef<HTMLDivElement>(null);
  const [titleVisible, setTitleVisible] = useState(false);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTitleVisible(true); observer.disconnect(); } },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-20 bg-transparent relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Title */}
        <div
          ref={titleRef}
          style={{
            opacity: titleVisible ? 1 : 0,
            transform: titleVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold mb-3">
            The Latest <span className="fan-gradient-text">AI Models</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Choose from the latest and most popular AI models for image and video generation.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Left — model cards */}
          <div className="flex-1 grid sm:grid-cols-2 gap-3 content-start">
            {allIds.map((id, i) => (
              <ModelCard
                key={id}
                id={id}
                isActive={ACTIVE_PROVIDER_IDS.includes(id)}
                index={i}
              />
            ))}
          </div>

          {/* Right — vitrine slideshow */}
          <div className="w-full lg:w-72 xl:w-80 shrink-0">
            <VitrineSlideshow />
          </div>

        </div>
      </div>
    </section>
  );
}
