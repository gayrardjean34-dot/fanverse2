'use client';

import { useState } from 'react';
import ModelsStudio from './models-studio';
import AutomationsStudio from './automations-studio';
import { AI_PROVIDERS } from '@/lib/ai/providers';
import { ChevronDown } from 'lucide-react';

// ── Data ────────────────────────────────────────────────────────────────────

// Custom order: nano-banana-2 right below nano-banana-pro
const IMAGE_MODEL_IDS = ['nano-banana-pro', 'nano-banana-2', 'seedream-4.5'];
const VIDEO_MODEL_IDS = ['grok-imagine', 'kling-3.0', 'kling-2.6', 'kling-motion-control'];

const SIDEBAR_AUTOMATIONS = {
  'infinite-carousel': { name: 'Infinite Carousel', icon: '🎠' },
  'infinite-selfies': { name: 'Infinite Selfies', icon: '📸' },
  'face-swap': { name: 'EZ Face Swap', icon: '🔄' },
  'ez-face-swap-uncensored': { name: 'EZ Face Swap Semi-Uncensored', icon: '🚀' },
  'outfit-swap': { name: 'Outfit Swap', icon: '👗' },
} as const;

type AutomationId = keyof typeof SIDEBAR_AUTOMATIONS;
type ActiveSection = 'models' | 'automations';

// ── Sub-components ───────────────────────────────────────────────────────────

function SubGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pt-3 pb-1.5 flex items-center gap-2">
      <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gray-600">
        {children}
      </span>
      <div className="flex-1 h-px bg-[#252525]" />
    </div>
  );
}

function ModelItem({
  id,
  isSelected,
  onClick,
}: {
  id: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  const provider = AI_PROVIDERS[id];
  if (!provider) return null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left relative group transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'bg-gradient-to-r from-[#28B8F6]/12 via-[#28B8F6]/5 to-transparent border-l-2 border-[#28B8F6]'
          : 'border-l-2 border-transparent hover:bg-[#1d1d1d] hover:border-[#28B8F6]/25'
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-3">
        <span
          className={`text-xl leading-none shrink-0 transition-transform duration-200 ${
            isSelected ? 'scale-110' : 'group-hover:scale-105'
          }`}
        >
          {provider.icon}
        </span>
        <span
          className={`text-sm font-medium truncate transition-colors duration-200 ${
            isSelected ? 'text-[#28B8F6]' : 'text-gray-300 group-hover:text-white'
          }`}
        >
          {provider.name}
        </span>
      </div>
      {/* Hover shimmer */}
      {!isSelected && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#28B8F6]/0 via-[#28B8F6]/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      )}
    </button>
  );
}

function AutomationItem({
  id,
  name,
  icon,
  isSelected,
  hot,
  onClick,
}: {
  id: string;
  name: string;
  icon: string;
  isSelected: boolean;
  hot?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left relative group transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'bg-gradient-to-r from-[#7F6DE7]/12 via-[#7F6DE7]/5 to-transparent border-l-2 border-[#7F6DE7]'
          : 'border-l-2 border-transparent hover:bg-[#1d1d1d] hover:border-[#7F6DE7]/25'
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-3">
        <span
          className={`text-xl leading-none shrink-0 transition-transform duration-200 ${
            isSelected ? 'scale-110' : 'group-hover:scale-105'
          }`}
        >
          {icon}
        </span>
        <span
          className={`text-sm font-medium truncate transition-colors duration-200 ${
            isSelected ? 'text-[#7F6DE7]' : 'text-gray-300 group-hover:text-white'
          }`}
        >
          {name}
        </span>
        {hot && (
          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
            🔥 Hot
          </span>
        )}
      </div>
      {!isSelected && (
        <div className="absolute inset-0 bg-gradient-to-r from-[#7F6DE7]/0 via-[#7F6DE7]/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
      )}
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StudioPage() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('models');
  const [selectedModel, setSelectedModel] = useState<string>('nano-banana-pro');
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationId>('infinite-carousel');
  const [modelsExpanded, setModelsExpanded] = useState(true);
  const [automationsExpanded, setAutomationsExpanded] = useState(false);

  return (
    <div className="flex h-[calc(100dvh-68px)] bg-[#191919]">

      {/* ── Left Sidebar ────────────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 border-r border-[#2a2a2a] bg-[#0f0f0f] flex flex-col overflow-y-auto">

        {/* ── Models Section ── */}
        <div>
          <button
            onClick={() => setModelsExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 group transition-colors hover:bg-[#1d1d1d] cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <span
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  activeSection === 'models'
                    ? 'bg-[#28B8F6] shadow-[0_0_8px_#28B8F6]'
                    : 'bg-[#28B8F6]/30'
                }`}
              />
              <span
                className={`text-[13px] font-bold tracking-[0.15em] uppercase transition-colors duration-200 ${
                  activeSection === 'models'
                    ? 'text-[#28B8F6]'
                    : 'text-gray-200 group-hover:text-white'
                }`}
              >
                Models
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-transform duration-300 ${
                modelsExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          <div
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
              modelsExpanded ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {/* Images sub-group */}
            <SubGroupLabel>Images</SubGroupLabel>
            {IMAGE_MODEL_IDS.map((id) => (
              <ModelItem
                key={id}
                id={id}
                isSelected={activeSection === 'models' && selectedModel === id}
                onClick={() => { setSelectedModel(id); setActiveSection('models'); }}
              />
            ))}

            {/* Videos sub-group */}
            <SubGroupLabel>Videos</SubGroupLabel>
            {VIDEO_MODEL_IDS.map((id) => (
              <ModelItem
                key={id}
                id={id}
                isSelected={activeSection === 'models' && selectedModel === id}
                onClick={() => { setSelectedModel(id); setActiveSection('models'); }}
              />
            ))}

            <div className="h-2" />
          </div>
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-[#232323]" />

        {/* ── Automations Section ── */}
        <div>
          <button
            onClick={() => setAutomationsExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 group transition-colors hover:bg-[#1d1d1d] cursor-pointer"
          >
            <span className="flex items-center gap-3">
              <span
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  activeSection === 'automations'
                    ? 'bg-[#7F6DE7] shadow-[0_0_8px_#7F6DE7]'
                    : 'bg-[#7F6DE7]/30'
                }`}
              />
              <span
                className={`text-[13px] font-bold tracking-[0.15em] uppercase transition-colors duration-200 ${
                  activeSection === 'automations'
                    ? 'text-[#7F6DE7]'
                    : 'text-gray-200 group-hover:text-white'
                }`}
              >
                Automations
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-gray-600 group-hover:text-gray-400 transition-transform duration-300 ${
                automationsExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          <div
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
              automationsExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            {(Object.entries(SIDEBAR_AUTOMATIONS) as [AutomationId, { name: string; icon: string }][]).map(
              ([id, { name, icon }]) => (
                <AutomationItem
                  key={id}
                  id={id}
                  name={name}
                  icon={icon}
                  isSelected={activeSection === 'automations' && selectedAutomation === id}
                  hot={id === 'infinite-carousel'}
                  onClick={() => {
                    setSelectedAutomation(id);
                    setActiveSection('automations');
                    if (!automationsExpanded) setAutomationsExpanded(true);
                  }}
                />
              )
            )}
            <div className="h-2" />
          </div>
        </div>

        <div className="flex-1" />
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        {activeSection === 'models' ? (
          <ModelsStudio model={selectedModel} setModel={setSelectedModel} />
        ) : (
          <AutomationsStudio
            selectedAutomation={selectedAutomation}
            setSelectedAutomation={(id) => setSelectedAutomation(id as AutomationId)}
          />
        )}
      </div>
    </div>
  );
}
