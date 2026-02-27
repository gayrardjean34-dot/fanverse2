import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No generation IDs provided.' }, { status: 400 });
    }

    // Only delete generations owned by the user
    await db.delete(generations)
      .where(
        and(
          eq(generations.userId, user.id),
          inArray(generations.id, ids)
        )
      );

    return NextResponse.json({ success: true, deleted: ids.length });
  } catch (error: any) {
    console.error('Delete generations error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
