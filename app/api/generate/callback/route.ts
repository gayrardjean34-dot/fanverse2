import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const genId = request.nextUrl.searchParams.get('genId');
    if (!genId) {
      return NextResponse.json({ error: 'Missing genId' }, { status: 400 });
    }

    const body = await request.json();

    // Find the generation
    const [gen] = await db
      .select()
      .from(generations)
      .where(eq(generations.id, parseInt(genId)))
      .limit(1);

    if (!gen) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    // Determine result based on callback data
    // kie.ai callback format may vary — handle common patterns
    const imageUrl =
      body.output?.image_url ||
      body.output?.url ||
      body.image_url ||
      body.result?.url ||
      body.result?.image_url ||
      body.url ||
      null;

    const failed =
      body.status === 'failed' ||
      body.status === 'error' ||
      body.error ||
      (!imageUrl && body.status === 'completed');

    if (failed) {
      await db.update(generations)
        .set({
          status: 'failed',
          error: body.error || body.message || 'Generation failed',
          resultData: body,
          updatedAt: new Date(),
        })
        .where(eq(generations.id, gen.id));
    } else {
      await db.update(generations)
        .set({
          status: 'completed',
          resultUrl: imageUrl,
          resultData: body,
          updatedAt: new Date(),
        })
        .where(eq(generations.id, gen.id));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Callback error:', error);
    return NextResponse.json({ error: 'Callback processing failed' }, { status: 500 });
  }
}
