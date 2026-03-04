import { NextResponse } from 'next/server';
import { and, eq, lt, or } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';
import { createCreditTransaction } from '@/lib/db/queries';

const TIMEOUT_MINUTES = 10;

// Called by the frontend polling or a cron to clean up stuck generations
export async function POST() {
  try {
    const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);

    // Find all stuck generations (processing/pending for too long)
    const stuck = await db
      .select()
      .from(generations)
      .where(
        and(
          or(
            eq(generations.status, 'processing'),
            eq(generations.status, 'pending')
          ),
          lt(generations.createdAt, cutoff)
        )
      );

    let refunded = 0;

    for (const gen of stuck) {
      // Mark as failed
      await db
        .update(generations)
        .set({
          status: 'failed',
          error: 'Generation timed out after 10 minutes. Credits have been refunded.',
          updatedAt: new Date(),
        })
        .where(eq(generations.id, gen.id));

      // Refund credits
      if (gen.creditCost > 0) {
        await createCreditTransaction({
          userId: gen.userId,
          amount: gen.creditCost,
          type: 'refund',
          reason: `Refund: generation #${gen.id} timed out`,
        });
        refunded += gen.creditCost;
      }
    }

    return NextResponse.json({
      cleaned: stuck.length,
      refunded,
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
