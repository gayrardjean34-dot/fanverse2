export const CREDIT_PACKS = {
  small: {
    name: 'Pack S',
    credits: 50,
    priceEnvKey: 'STRIPE_PRICE_CREDITS_S',
    description: '50 credits',
  },
  medium: {
    name: 'Pack M',
    credits: 200,
    priceEnvKey: 'STRIPE_PRICE_CREDITS_M',
    description: '200 credits',
  },
  large: {
    name: 'Pack L',
    credits: 500,
    priceEnvKey: 'STRIPE_PRICE_CREDITS_L',
    description: '500 credits',
  },
} as const;

export type PackSize = keyof typeof CREDIT_PACKS;

export const MONTHLY_CREDIT_GRANT = 100; // credits granted per invoice.paid for Pro

export function getPackByPriceId(priceId: string): { size: PackSize; credits: number } | null {
  for (const [size, pack] of Object.entries(CREDIT_PACKS)) {
    if (process.env[pack.priceEnvKey] === priceId) {
      return { size: size as PackSize, credits: pack.credits };
    }
  }
  return null;
}
