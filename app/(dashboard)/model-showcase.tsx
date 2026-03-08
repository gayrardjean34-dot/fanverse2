'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Clock, Film, Image as ImageIcon } from 'lucide-react';
import { AI_PROVIDERS, ACTIVE_PROVIDER_IDS } from '@/lib/ai/providers';

// ── Add preview images for each model here ──────────────────────────────────
// e.g. 'kling-3.0': ['/previews/kling1.jpg', '/previews/kling2.jpg', ...]
const MODEL_PREVIEWS: Record<string, string[]> = {
  'nano-banana-pro': [],
  'nano-banana-2': [],
  'kling-3.0': [],
  'kling-2.6': [],
  'kling-motion-control': [],
  'grok-imagine': [],
  'seedream': [],
};
// ─────────────────────────────────────────────────────────────────────────────

const comingSoonIds = Object.keys(AI_PROVIDERS).filter(
  (id) => !ACTIVE_PROVIDER_IDS.includes(id)
);
const allIds = [...ACTIVE_PROVIDER_IDS, ...comingSoonIds];

function ImageCarousel({ images, modelIcon }: { images: string[]; modelIcon: string }) {
  if (images.length === 0) {
    return (
      <div className="h-32 rounded-xl bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.03) 10px, rgba(255,255,255,0.03) 20px)',
          }}
        />
        <span className="text-4xl opacity-30 select-none">{modelIcon}</span>
        <span className="absolute bottom-2 right-3 text-[10px] text-gray-600">Preview coming soon</span>
      </div>
    );
  }

  // Duplicate for seamless loop
  const looped = [...images, ...images];

  return (
    <div className="h-32 rounded-xl overflow-hidden relative bg-[#111]">
      <div
        className="flex gap-2 h-full items-center"
        style={{
          width: `${looped.length * 130}px`,
          animation: `marquee ${images.length * 3}s linear infinite`,
        }}
      >
        {looped.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="h-full w-[120px] object-cover rounded-lg shrink-0"
          />
        ))}
      </div>
    </div>
  );
}

function ModelCard({ id, isActive, index }: { id: string; isActive: boolean; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const provider = AI_PROVIDERS[id];
  const previews = MODEL_PREVIEWS[id] ?? [];

  return (
    <div
      ref={ref}
      className="bg-[#111]/60 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-[#28B8F6]/30 transition-all"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.5s ease ${index * 80}ms, transform 0.5s ease ${index * 80}ms`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{provider.icon}</span>
          <div>
            <p className="font-semibold text-[#FEFEFE] leading-tight">{provider.name}</p>
            <span className={`text-[10px] px-1.5 py-0.5 rounded mt-0.5 inline-flex items-center gap-1 ${
              provider.type === 'video'
                ? 'bg-[#7F6DE7]/10 text-[#7F6DE7]'
                : 'bg-[#28B8F6]/10 text-[#28B8F6]'
            }`}>
              {provider.type === 'video'
                ? <><Film className="h-2.5 w-2.5" /> Video</>
                : <><ImageIcon className="h-2.5 w-2.5" /> Image</>
              }
            </span>
          </div>
        </div>
        {isActive ? (
          <div className="flex items-center gap-1 text-green-400">
            <CheckCircle className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Available</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Coming Soon</span>
          </div>
        )}
      </div>

      {/* Preview carousel */}
      <ImageCarousel images={previews} modelIcon={provider.icon} />
    </div>
  );
}

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
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            Available <span className="fan-gradient-text">AI Models</span>
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Choose from our curated selection of cutting-edge AI models for image and video generation.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {allIds.map((id, i) => (
            <ModelCard
              key={id}
              id={id}
              isActive={ACTIVE_PROVIDER_IDS.includes(id)}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
