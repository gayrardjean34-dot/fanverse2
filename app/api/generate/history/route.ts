import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, gt, and } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

    const results = await db
      .select()
      .from(generations)
      .where(
        and(
          eq(generations.userId, user.id),
          gt(generations.expiresAt, new Date())
        )
      )
      .orderBy(desc(generations.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('History error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
