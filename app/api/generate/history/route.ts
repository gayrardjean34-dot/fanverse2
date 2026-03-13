import { NextRequest, NextResponse } from 'next/server';
import { desc, eq, gt, and, ne, or } from 'drizzle-orm';
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
    const excludeAutomations = request.nextUrl.searchParams.get('excludeAutomations') === 'true';
    const includeAutomationsOnly = request.nextUrl.searchParams.get('automationsOnly') === 'true';

    let whereClause;

    const baseCondition = and(
      eq(generations.userId, user.id),
      gt(generations.expiresAt, new Date())
    );

    // Filter automation models
    if (excludeAutomations) {
      whereClause = and(
        baseCondition,
        ne(generations.model, 'automation-selfie'),
        ne(generations.model, 'automation-faceswap'),
        ne(generations.model, 'automation-faceswap-uncensored'),
        ne(generations.model, 'automation-outfit-swap'),
        ne(generations.model, 'automation-carousel'),
        ne(generations.model, 'automation-repose')
      );
    } else if (includeAutomationsOnly) {
      whereClause = and(
        baseCondition,
        or(
          eq(generations.model, 'automation-selfie'),
          eq(generations.model, 'automation-faceswap'),
          eq(generations.model, 'automation-faceswap-uncensored'),
          eq(generations.model, 'automation-outfit-swap'),
          eq(generations.model, 'automation-carousel'),
          eq(generations.model, 'automation-repose')
        )
      );
    } else {
      whereClause = baseCondition;
    }

    const results = await db
      .select()
      .from(generations)
      .where(whereClause)
      .orderBy(desc(generations.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('History error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
