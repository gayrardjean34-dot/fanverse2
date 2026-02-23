export const AI_PROVIDERS = {
  'nano-banana-pro': {
    name: 'Nano Banana Pro',
    envKey: 'NANOBANANA_API_KEY',
    description: 'Fast and efficient AI model for quick creative generation.',
    icon: '🍌',
  },
  'kling': {
    name: 'Kling',
    envKey: 'KLING_API_KEY',
    description: 'High-quality video and image generation with cinematic style.',
    icon: '🎬',
  },
  'grok-imagine': {
    name: 'Grok Imagine',
    envKey: 'GROK_API_KEY',
    description: 'Creative AI powered by xAI for imaginative visual content.',
    icon: '🚀',
  },
  'seedream': {
    name: 'Seedream',
    envKey: 'SEEDREAM_API_KEY',
    description: 'Dream-like artistic generation with unique aesthetic styles.',
    icon: '🌙',
  },
} as const;

export type ProviderId = keyof typeof AI_PROVIDERS;

export const PROVIDER_IDS = Object.keys(AI_PROVIDERS) as ProviderId[];

export function isValidProvider(id: string): id is ProviderId {
  return id in AI_PROVIDERS;
}

export function getProviderConfig(id: ProviderId) {
  return AI_PROVIDERS[id];
}
