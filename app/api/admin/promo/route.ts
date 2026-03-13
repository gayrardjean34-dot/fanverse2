import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { promoCodes } from '@/lib/db/schema';
import { isNull } from 'drizzle-orm';
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `FV-${part1}-${part2}`;
}

// GET — list all existing promo codes
export async function GET() {
  const user = await getUser();
  if (!user || user.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const codes = await db.select().from(promoCodes).orderBy(promoCodes.createdAt);
  return NextResponse.json({ codes });
}

// POST — generate N new promo codes
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user || user.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const count = Math.max(1, Math.min(100, parseInt(body.count) || 10));
  const credits = Math.max(1, parseInt(body.credits) || 100);

  const newCodes: string[] = [];
  const inserted = [];

  for (let i = 0; i < count; i++) {
    let code = generateCode();
    // Retry on collision (extremely rare)
    let attempts = 0;
    while (attempts < 5) {
      try {
        const [row] = await db
          .insert(promoCodes)
          .values({ code, credits })
          .returning();
        inserted.push(row);
        newCodes.push(code);
        break;
      } catch {
        code = generateCode();
        attempts++;
      }
    }
  }

  return NextResponse.json({
    success: true,
    generated: inserted.length,
    credits,
    codes: inserted.map((r) => ({ id: r.id, code: r.code, credits: r.credits })),
  });
}

// DELETE — delete unused promo codes (cleanup)
export async function DELETE() {
  const user = await getUser();
  if (!user || user.role !== 'owner') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deleted = await db
    .delete(promoCodes)
    .where(isNull(promoCodes.usedByUserId))
    .returning();

  return NextResponse.json({ success: true, deleted: deleted.length });
}
