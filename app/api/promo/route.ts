import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { promoCodes } from '@/lib/db/schema';
import { getUser, createCreditTransaction } from '@/lib/db/queries';

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

    const [promo] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, upperCode))
      .limit(1);

    if (!promo) {
      return NextResponse.json({ error: 'Invalid promo code.' }, { status: 400 });
    }

    if (promo.usedByUserId !== null) {
      return NextResponse.json({ error: 'This promo code has already been used.' }, { status: 400 });
    }

    // Mark as used atomically
    const updated = await db
      .update(promoCodes)
      .set({ usedByUserId: user.id, usedAt: new Date() })
      .where(eq(promoCodes.id, promo.id))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'This promo code has already been used.' }, { status: 400 });
    }

    await createCreditTransaction({
      userId: user.id,
      type: 'grant',
      amount: promo.credits,
      reason: `Promo code: ${upperCode}`,
    });

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
