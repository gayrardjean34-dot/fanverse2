import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserCreditBalance, createCreditTransaction } from '@/lib/db/queries';

// Promo codes: code → { credits, maxUses (0 = unlimited), description }
const PROMO_CODES: Record<string, { credits: number; maxUses: number; description: string }> = {
  'FANVERSE1000': { credits: 1000, maxUses: 0, description: 'Fanverse testing promo' },
  'FV-GIFT-7X9A': { credits: 100, maxUses: 1, description: '100 credits gift code' },
  'FV-GIFT-3M2K': { credits: 100, maxUses: 1, description: '100 credits gift code' },
  'FV-GIFT-8P4W': { credits: 100, maxUses: 1, description: '100 credits gift code' },
  'FV-GIFT-1N6R': { credits: 100, maxUses: 1, description: '100 credits gift code' },
  'FV-GIFT-5Q8T': { credits: 100, maxUses: 1, description: '100 credits gift code' },
  'FV-GIFT-2D9F': { credits: 100, maxUses: 1, description: '100 credits gift code' },
  'FV-GIFT-6H3J': { credits: 100, maxUses: 1, description: '100 credits gift code' },
  'FV-GIFT-4L7V': { credits: 100, maxUses: 1, description: '100 credits gift code' },
  'FV-GIFT-9B1C': { credits: 100, maxUses: 1, description: '100 credits gift code' },
  'FV-GIFT-0Y5E': { credits: 100, maxUses: 1, description: '100 credits gift code' },
  'FV-GIFT-8K2S': { credits: 100, maxUses: 1, description: '100 credits gift code' },
  'FV-GIFT-3W6Z': { credits: 100, maxUses: 1, description: '100 credits gift code' },
  'FV-GIFT-7A4U': { credits: 100, maxUses: 1, description: '100 credits gift code' },
  'FV-GIFT-1X9G': { credits: 100, maxUses: 1, description: '100 credits gift code' },
  'FV-GIFT-5R2M': { credits: 100, maxUses: 1, description: '100 credits gift code' },
};

// Track usage in-memory (resets on redeploy). For production, use DB.
const usageMap = new Map<string, Set<number>>(); // code → Set of userIds

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Promo code is required.' }, { status: 400 });
    }

    const upperCode = code.trim().toUpperCase();
    const promo = PROMO_CODES[upperCode];

    if (!promo) {
      return NextResponse.json({ error: 'Invalid promo code.' }, { status: 400 });
    }

    // Check if user already used this code
    const usedBy = usageMap.get(upperCode) || new Set();
    if (usedBy.has(user.id)) {
      return NextResponse.json({ error: 'You have already used this promo code.' }, { status: 400 });
    }

    // Check max uses
    if (promo.maxUses > 0 && usedBy.size >= promo.maxUses) {
      return NextResponse.json({ error: 'This promo code has reached its maximum uses.' }, { status: 400 });
    }

    // Grant credits
    await createCreditTransaction({
      userId: user.id,
      type: 'grant',
      amount: promo.credits,
      reason: `Promo code: ${upperCode}`,
    });

    // Track usage
    usedBy.add(user.id);
    usageMap.set(upperCode, usedBy);

    return NextResponse.json({
      success: true,
      credits: promo.credits,
      message: `${promo.credits} credits added to your account!`,
    });
  } catch (error: any) {
    console.error('Promo error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
