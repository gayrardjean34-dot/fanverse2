import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const VALID_AUTOMATIONS = ['infinite-selfies', 'face-swap', 'ez-face-swap-uncensored', 'outfit-swap', 'infinite-carousel', 're-pose'];

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { automationId } = await request.json();

    if (!automationId || !VALID_AUTOMATIONS.includes(automationId)) {
      return NextResponse.json({ error: 'Invalid automation ID' }, { status: 400 });
    }

    if (user.freeUnlockUsed) {
      return NextResponse.json({ error: 'Free unlock already used' }, { status: 400 });
    }

    const currentUnlocked = (user.unlockedAutomations as string[]) || [];
    if (currentUnlocked.includes(automationId)) {
      return NextResponse.json({ error: 'Automation already unlocked' }, { status: 400 });
    }

    await db
      .update(users)
      .set({
        unlockedAutomations: [...currentUnlocked, automationId],
        freeUnlockUsed: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json({ success: true, unlockedAutomations: [...currentUnlocked, automationId] });
  } catch (error) {
    console.error('Unlock automation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
