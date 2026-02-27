import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserCreditBalance, createCreditTransaction } from '@/lib/db/queries';

// Promo codes: code → { credits, maxUses (0 = unlimited), description }
const PROMO_CODES: Record<string, { credits: number; maxUses: number; description: string }> = {
  'FANVERSE1000': { credits: 1000, maxUses: 0, description: 'Fanverse testing promo' },
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
