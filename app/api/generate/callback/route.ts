import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';

export async function POST(request: NextRequest) {
  try {
    const genId = request.nextUrl.searchParams.get('genId');
    const body = await request.json();

    // Log everything for debugging
    console.log('[CALLBACK] genId:', genId, 'body:', JSON.stringify(body, null, 2));

    if (!genId) {
      return NextResponse.json({ error: 'Missing genId' }, { status: 400 });
    }

    const [gen] = await db
      .select()
      .from(generations)
      .where(eq(generations.id, parseInt(genId)))
      .limit(1);

    if (!gen) {
      console.log('[CALLBACK] Generation not found:', genId);
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    // Try to find image URL from various possible response formats
    const imageUrl = findImageUrl(body);
    const errorMsg = findError(body);

    console.log('[CALLBACK] Parsed imageUrl:', imageUrl, 'error:', errorMsg);

    if (errorMsg && !imageUrl) {
      await db.update(generations)
        .set({
          status: 'failed',
          error: errorMsg,
          resultData: body,
          updatedAt: new Date(),
        })
        .where(eq(generations.id, gen.id));
    } else if (imageUrl) {
      await db.update(generations)
        .set({
          status: 'completed',
          resultUrl: imageUrl,
          resultData: body,
          updatedAt: new Date(),
        })
        .where(eq(generations.id, gen.id));
    } else {
      // Store raw data, mark as completed if status says so, else keep processing
      const isCompleted = body.status === 'completed' || body.status === 'success' || body.status === 'done';
      await db.update(generations)
        .set({
          status: isCompleted ? 'completed' : gen.status,
          resultData: body,
          updatedAt: new Date(),
        })
        .where(eq(generations.id, gen.id));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[CALLBACK] Error:', error);
    return NextResponse.json({ error: 'Callback processing failed' }, { status: 500 });
  }
}

// Also handle GET callbacks (some APIs use GET)
export async function GET(request: NextRequest) {
  return POST(request);
}

function findImageUrl(body: any): string | null {
  if (!body) return null;

  // Direct URL fields
  const candidates = [
    body.output?.image_url,
    body.output?.url,
    body.output?.imageUrl,
    body.output?.image,
    body.image_url,
    body.imageUrl,
    body.image,
    body.result?.url,
    body.result?.image_url,
    body.result?.imageUrl,
    body.result?.image,
    body.url,
    body.data?.url,
    body.data?.image_url,
    body.data?.imageUrl,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.startsWith('http')) return c;
  }

  // Check arrays
  const arrays = [body.output?.images, body.result?.images, body.images, body.data?.images];
  for (const arr of arrays) {
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0];
      if (typeof first === 'string' && first.startsWith('http')) return first;
      if (typeof first === 'object' && first?.url) return first.url;
    }
  }

  // Deep search for any URL ending in image extension
  const json = JSON.stringify(body);
  const urlMatch = json.match(/https?:\/\/[^"\\]+\.(?:png|jpg|jpeg|webp)[^"\\]*/i);
  if (urlMatch) return urlMatch[0];

  return null;
}

function findError(body: any): string | null {
  if (body.status === 'failed' || body.status === 'error') {
    return body.error || body.message || body.error_message || 'Generation failed';
  }
  if (body.error) return typeof body.error === 'string' ? body.error : JSON.stringify(body.error);
  return null;
}
