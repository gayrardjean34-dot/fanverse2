export const CREDIT_PACKS = {
  small: {
    name: 'Pack S',
    credits: 500,
    priceEnvKey: 'STRIPE_PRICE_CREDITS_S',
    description: '500 credits',
  },
  medium: {
    name: 'Pack M',
    credits: 1700,
    priceEnvKey: 'STRIPE_PRICE_CREDITS_M',
    description: '1700 credits',
  },
  large: {
    name: 'Pack L',
    credits: 4000,
    priceEnvKey: 'STRIPE_PRICE_CREDITS_L',
    description: '4000 credits',
  },
} as const;

export type PackSize = keyof typeof CREDIT_PACKS;

// Monthly credit grants per plan
export const MONTHLY_CREDIT_GRANT_STARTER = 1000;
export const MONTHLY_CREDIT_GRANT_PRO = 2000;
export const MONTHLY_CREDIT_GRANT = 2000; // default (Pro) for backward compat

export function getPackByPriceId(priceId: string): { size: PackSize; credits: number } | null {
  for (const [size, pack] of Object.entries(CREDIT_PACKS)) {
    if (process.env[pack.priceEnvKey] === priceId) {
      return { size: size as PackSize, credits: pack.credits };
    }
  }
  return null;
}
