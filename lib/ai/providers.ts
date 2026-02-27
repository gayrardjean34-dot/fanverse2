export type ModelType = 'image' | 'video';

export type ModelConfig = {
  name: string;
  envKey: string;
  description: string;
  icon: string;
  type: ModelType;
  apiModel: string; // The model string sent to kie.ai
  supportsDuration?: boolean;
  supportsSound?: boolean;
  supportsMode?: boolean;
  supportsElements?: boolean;
  defaultDuration?: string;
  durations?: string[];
  modes?: string[];
  resolutions?: string[];
  getCreditCost: (params: { resolution?: string; duration?: string; mode?: string; sound?: boolean }) => number;
};

export const AI_PROVIDERS: Record<string, ModelConfig> = {
  'nano-banana-pro': {
    name: 'Nano Banana Pro',
    envKey: 'KIE_API_KEY',
    description: 'Fast and efficient AI model for quick image generation.',
    icon: '🍌',
    type: 'image',
    apiModel: 'nano-banana-pro',
    resolutions: ['1K', '2K', '4K'],
    getCreditCost: ({ resolution }) => resolution === '4K' ? 25 : 20,
  },
  'grok-imagine': {
    name: 'Grok Imagine',
    envKey: 'KIE_API_KEY',
    description: 'Text-to-video generation powered by xAI. Normal and fast modes.',
    icon: '🚀',
    type: 'video',
    apiModel: 'grok-imagine/text-to-video',
    supportsDuration: true,
    durations: ['6', '10'],
    defaultDuration: '6',
    modes: ['normal', 'fast'],
    resolutions: ['480p', '720p'],
    getCreditCost: ({ duration }) => duration === '10' ? 30 : 20,
  },
  'kling-3.0': {
    name: 'Kling 3.0',
    envKey: 'KIE_API_KEY',
    description: 'Latest Kling model. Standard or Pro mode with optional audio.',
    icon: '🎬',
    type: 'video',
    apiModel: 'kling-3.0/video',
    supportsDuration: true,
    supportsSound: true,
    supportsMode: true,
    supportsElements: true,
    durations: ['5', '10'],
    defaultDuration: '5',
    modes: ['standard', 'pro'],
    resolutions: ['720p', '1080p'],
    getCreditCost: ({ duration, mode, sound }) => {
      const d = parseInt(duration || '5');
      if (mode === 'pro') {
        return sound ? d * 80 : d * 54;
      }
      return sound ? d * 60 : d * 40;
    },
  },
  'kling-2.6': {
    name: 'Kling 2.6',
    envKey: 'KIE_API_KEY',
    description: 'HD image-to-video generation with optional audio.',
    icon: '🎥',
    type: 'video',
    apiModel: 'kling-2.6/image-to-video',
    supportsDuration: true,
    supportsSound: true,
    durations: ['5', '10'],
    defaultDuration: '5',
    getCreditCost: ({ duration, sound }) => {
      const d = parseInt(duration || '5');
      if (d === 10) return sound ? 440 : 220;
      return sound ? 220 : 110;
    },
  },
  'seedream': {
    name: 'Seedream',
    envKey: 'KIE_API_KEY',
    description: 'Dream-like artistic generation (coming soon).',
    icon: '🌙',
    type: 'image',
    apiModel: 'seedream',
    resolutions: ['1K', '2K', '4K'],
    getCreditCost: ({ resolution }) => resolution === '4K' ? 25 : 20,
  },
} as const;

export type ProviderId = keyof typeof AI_PROVIDERS;

export const PROVIDER_IDS = Object.keys(AI_PROVIDERS) as ProviderId[];

// Only active (non-coming-soon) providers
export const ACTIVE_PROVIDER_IDS = PROVIDER_IDS.filter((id) => id !== 'seedream');

export function isValidProvider(id: string): id is ProviderId {
  return id in AI_PROVIDERS;
}

export function getProviderConfig(id: ProviderId) {
  return AI_PROVIDERS[id];
}
