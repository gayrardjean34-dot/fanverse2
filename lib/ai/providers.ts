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
  requiresReferenceVideo?: boolean;
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
    getCreditCost: ({ resolution }) => {
      if (resolution === '4K') return 24;
      return 18; // 1K & 2K same price
    },
  },
  'grok-imagine': {
    name: 'Grok Imagine',
    envKey: 'KIE_API_KEY',
    description: 'Text-to-video generation powered by xAI. Normal and fast modes.',
    icon: '🚀',
    type: 'video',
    apiModel: 'grok-imagine/text-to-video',
    supportsDuration: true,
    durations: ['6', '10', '15'],
    defaultDuration: '6',
    modes: ['normal', 'fast'],
    resolutions: ['480p', '720p'],
    getCreditCost: ({ duration, resolution }) => {
      const d = parseInt(duration || '6');
      const is720 = resolution === '720p';
      if (d >= 15) return is720 ? 40 : 30;
      if (d >= 10) return is720 ? 30 : 20;
      return is720 ? 20 : 10; // 6s
    },
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
    getCreditCost: ({ duration, resolution, sound }) => {
      const d = parseInt(duration || '5');
      const is1080 = resolution === '1080p';
      if (is1080) {
        return sound ? d * 40 : d * 27;
      }
      return sound ? d * 30 : d * 20; // 720p
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
      if (d === 10) return sound ? 220 : 110;
      return sound ? 110 : 55; // 5s
    },
  },
  'nano-banana-2': {
    name: 'Nano Banana 2',
    envKey: 'KIE_API_KEY',
    description: 'Next-gen image model with image input support and Google search.',
    icon: '🍌',
    type: 'image',
    apiModel: 'nano-banana-2',
    supportsElements: true,
    resolutions: ['1K', '2K', '4K'],
    getCreditCost: ({ resolution }) => {
      if (resolution === '4K') return 18;
      if (resolution === '2K') return 12;
      return 8; // 1K
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
  'kling-motion-control': {
    name: 'Kling Motion Control',
    envKey: 'KIE_API_KEY',
    description: 'Animate an image by transferring motion from a reference video. Upload an image and an mp4 video to drive the movement.',
    icon: '🎭',
    type: 'video',
    apiModel: 'kling-2.6/motion-control',
    requiresReferenceVideo: true,
    supportsDuration: true,
    durations: ['5', '10'],
    defaultDuration: '5',
    resolutions: ['720p', '1080p'],
    getCreditCost: ({ duration, resolution }) => {
      const d = parseInt(duration || '5');
      const is1080 = resolution === '1080p';
      return d * (is1080 ? 9 : 6);
    },
  },
} as const;

export type ProviderId = keyof typeof AI_PROVIDERS;

export const PROVIDER_IDS = Object.keys(AI_PROVIDERS) as ProviderId[];

// Only active (non-coming-soon) providers
export const ACTIVE_PROVIDER_IDS = PROVIDER_IDS.filter((id) => id !== 'seedream');

// Providers that require a reference video input
export const MOTION_CONTROL_IDS = PROVIDER_IDS.filter((id) => AI_PROVIDERS[id].requiresReferenceVideo);

export function isValidProvider(id: string): id is ProviderId {
  return id in AI_PROVIDERS;
}

export function getProviderConfig(id: ProviderId) {
  return AI_PROVIDERS[id];
}
