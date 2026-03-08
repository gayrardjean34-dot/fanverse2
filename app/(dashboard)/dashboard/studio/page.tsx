'use client';

import { useState } from 'react';
import ModelsStudio from './models-studio';
import AutomationsStudio from './automations-studio';
import { AI_PROVIDERS, ACTIVE_PROVIDER_IDS } from '@/lib/ai/providers';
import { ChevronDown } from 'lucide-react';

const SIDEBAR_AUTOMATIONS = {
  'infinite-selfies': {
    name: 'Infinite Selfies',
    icon: '📸',
    description: 'Generate multiple selfie variations',
    creditPerImage: 22,
  },
  'face-swap': {
    name: 'EZ Face Swap',
    icon: '🔄',
    description: 'Swap faces in images',
    creditPerImage: 22,
  },
  'ez-face-swap-uncensored': {
    name: 'EZ Face Swap Semi-Uncensored',
    icon: '🚀',
    description: 'Advanced face swap — beta',
    creditPerImage: 25,
  },
} as const;

type AutomationId = keyof typeof SIDEBAR_AUTOMATIONS;
type ActiveSection = 'models' | 'automations';

function getMinCost(id: string): number {
  const p = AI_PROVIDERS[id];
  if (!p) return 0;
  if (p.type === 'image') return p.getCreditCost({ resolution: '1K' });
  return p.getCreditCost({ duration: p.defaultDuration || '5', resolution: p.resolutions?.[0] || '720p' });
}

export default function StudioPage() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('models');
  const [selectedModel, setSelectedModel] = useState<string>('nano-banana-pro');
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationId>('infinite-selfies');
  const [modelsExpanded, setModelsExpanded] = useState(true);
  const [automationsExpanded, setAutomationsExpanded] = useState(false);

  return (
    <div className="flex h-[calc(100dvh-68px)] bg-[#191919]">
      {/* ── Left Sidebar ── */}
      <aside className="w-56 shrink-0 border-r border-[#2a2a2a] bg-[#191919] flex flex-col overflow-y-auto">

        {/* ── Models Section ── */}
        <div>
          <button
            onClick={() => setModelsExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 group transition-colors hover:bg-[#1e1e1e]"
          >
            <span className="flex items-center gap-2.5">
              {/* Animated dot */}
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  activeSection === 'models'
                    ? 'bg-[#28B8F6] shadow-[0_0_6px_#28B8F6]'
                    : 'bg-[#28B8F6]/40'
                }`}
              />
              <span
                className={`text-xs font-semibold tracking-widest uppercase transition-colors duration-200 ${
                  activeSection === 'models' ? 'text-[#28B8F6]' : 'text-gray-400 group-hover:text-gray-200'
                }`}
              >
                Models
              </span>
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400 transition-transform duration-300 ${
                modelsExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          <div
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
              modelsExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="pb-2">
              {ACTIVE_PROVIDER_IDS.map((id) => {
                const provider = AI_PROVIDERS[id];
                const isSelected = activeSection === 'models' && selectedModel === id;
                const isImage = provider.type === 'image';
                const minCost = getMinCost(id);

                return (
                  <button
                    key={id}
                    onClick={() => {
                      setSelectedModel(id);
                      setActiveSection('models');
                    }}
                    className={`w-full text-left relative group transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#28B8F6]/10 via-[#28B8F6]/5 to-transparent border-l-2 border-[#28B8F6]'
                        : 'border-l-2 border-transparent hover:bg-[#1e1e1e] hover:border-l-2 hover:border-[#28B8F6]/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 px-4 py-2.5">
                      <span
                        className={`text-base leading-none transition-transform duration-200 ${
                          isSelected ? 'scale-110' : 'group-hover:scale-110'
                        }`}
                      >
                        {provider.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-xs font-medium truncate transition-all duration-200 ${
                            isSelected
                              ? 'text-[#28B8F6]'
                              : 'text-gray-300 group-hover:text-white'
                          }`}
                        >
                          {provider.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                              isImage
                                ? 'bg-[#28B8F6]/10 text-[#28B8F6]/80'
                                : 'bg-[#7F6DE7]/10 text-[#7F6DE7]/80'
                            }`}
                          >
                            {isImage ? 'IMG' : 'VID'}
                          </span>
                          <span className="text-[10px] text-gray-600">
                            from {minCost} cr
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Hover glow */}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#28B8F6]/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-[#252525]" />

        {/* ── Automations Section ── */}
        <div>
          <button
            onClick={() => setAutomationsExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3.5 group transition-colors hover:bg-[#1e1e1e]"
          >
            <span className="flex items-center gap-2.5">
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  activeSection === 'automations'
                    ? 'bg-[#7F6DE7] shadow-[0_0_6px_#7F6DE7]'
                    : 'bg-[#7F6DE7]/40'
                }`}
              />
              <span
                className={`text-xs font-semibold tracking-widest uppercase transition-colors duration-200 ${
                  activeSection === 'automations' ? 'text-[#7F6DE7]' : 'text-gray-400 group-hover:text-gray-200'
                }`}
              >
                Automations
              </span>
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-gray-600 group-hover:text-gray-400 transition-transform duration-300 ${
                automationsExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          <div
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out ${
              automationsExpanded ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="pb-2">
              {(Object.entries(SIDEBAR_AUTOMATIONS) as [AutomationId, typeof SIDEBAR_AUTOMATIONS[AutomationId]][]).map(
                ([id, automation]) => {
                  const isSelected = activeSection === 'automations' && selectedAutomation === id;

                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setSelectedAutomation(id);
                        setActiveSection('automations');
                        if (!automationsExpanded) setAutomationsExpanded(true);
                      }}
                      className={`w-full text-left relative group transition-all duration-200 ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#7F6DE7]/10 via-[#7F6DE7]/5 to-transparent border-l-2 border-[#7F6DE7]'
                          : 'border-l-2 border-transparent hover:bg-[#1e1e1e] hover:border-l-2 hover:border-[#7F6DE7]/30'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 px-4 py-2.5">
                        <span
                          className={`text-base leading-none transition-transform duration-200 ${
                            isSelected ? 'scale-110' : 'group-hover:scale-110'
                          }`}
                        >
                          {automation.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-xs font-medium truncate transition-all duration-200 ${
                              isSelected
                                ? 'text-[#7F6DE7]'
                                : 'text-gray-300 group-hover:text-white'
                            }`}
                          >
                            {automation.name}
                          </div>
                          <div className="text-[10px] text-gray-600 mt-0.5">
                            {automation.creditPerImage} cr / image
                          </div>
                        </div>
                      </div>
                      {!isSelected && (
                        <div className="absolute inset-0 bg-gradient-to-r from-[#7F6DE7]/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="flex-1" />
      </aside>

      {/* ── Main Content ── */}
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
