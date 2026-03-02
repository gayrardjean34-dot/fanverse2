'use client';

import { useState } from 'react';
import ModelsStudio from './models-studio';
import AutomationsStudio from './automations-studio';

type Tab = 'models' | 'automations';

export default function StudioPage() {
  const [tab, setTab] = useState<Tab>('models');

  return (
    <section className="flex flex-col h-[calc(100dvh-68px)]">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 lg:px-8 pt-4 pb-0">
        <button
          onClick={() => setTab('models')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'models'
              ? 'bg-[#28B8F6]/10 text-[#28B8F6]'
              : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
          }`}
        >
          🎨 Models
        </button>
        <button
          onClick={() => setTab('automations')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'automations'
              ? 'bg-[#7F6DE7]/10 text-[#7F6DE7]'
              : 'text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
          }`}
        >
          ⚡ Automations
        </button>
      </div>

      {/* Content */}
      {tab === 'models' ? <ModelsStudio /> : <AutomationsStudio />}
    </section>
  );
}
