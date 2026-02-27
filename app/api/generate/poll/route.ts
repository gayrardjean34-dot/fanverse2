import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';

// This endpoint checks for stuck "processing" generations and tries to poll kie.ai
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find generations that are still processing for more than 2 minutes
    const stuckGens = await db
      .select()
      .from(generations)
      .where(
        and(
          eq(generations.userId, user.id),
          inArray(generations.status, ['pending', 'processing'])
        )
      )
      .limit(10);

    if (stuckGens.length === 0) {
      return NextResponse.json({ checked: 0 });
    }

    const apiKey = process.env.KIE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API not configured' }, { status: 500 });
    }

    let updated = 0;

    for (const gen of stuckGens) {
      if (!gen.externalTaskId) continue;

      try {
        // Try to check task status on kie.ai
        const res = await fetch(`https://api.kie.ai/api/v1/jobs/getTask?taskId=${gen.externalTaskId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (!res.ok) continue;

        const data = await res.json();
        console.log('[POLL] Task', gen.externalTaskId, 'status:', JSON.stringify(data));

        // Try to find image URL
        const imageUrl = findMediaUrl(data);
        const isCompleted = data.status === 'completed' || data.status === 'success' || data.status === 'done';
        const isFailed = data.status === 'failed' || data.status === 'error';

        if (imageUrl) {
          await db.update(generations)
            .set({ status: 'completed', resultUrl: imageUrl, resultData: data, updatedAt: new Date() })
            .where(eq(generations.id, gen.id));
          updated++;
        } else if (isFailed) {
          await db.update(generations)
            .set({ status: 'failed', error: data.error || data.message || 'Failed', resultData: data, updatedAt: new Date() })
            .where(eq(generations.id, gen.id));
          updated++;
        } else if (isCompleted) {
          // Completed but no image URL found — store the data
          await db.update(generations)
            .set({ status: 'completed', resultData: data, updatedAt: new Date() })
            .where(eq(generations.id, gen.id));
          updated++;
        }
      } catch (err) {
        console.log('[POLL] Error checking task', gen.externalTaskId, err);
      }
    }

    return NextResponse.json({ checked: stuckGens.length, updated });
  } catch (error: any) {
    console.error('Poll error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}

function findMediaUrl(body: any): string | null {
  if (!body) return null;
  const candidates = [
    body.output?.image_url, body.output?.video_url, body.output?.url, body.output?.imageUrl, body.output?.videoUrl, body.output?.image, body.output?.video,
    body.image_url, body.video_url, body.imageUrl, body.videoUrl, body.image, body.video,
    body.result?.url, body.result?.image_url, body.result?.video_url, body.result?.imageUrl, body.result?.videoUrl, body.result?.image, body.result?.video,
    body.url, body.data?.url, body.data?.image_url, body.data?.video_url,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.startsWith('http')) return c;
  }
  const arrays = [body.output?.images, body.output?.videos, body.result?.images, body.result?.videos, body.images, body.videos, body.data?.images, body.data?.videos];
  for (const arr of arrays) {
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0];
      if (typeof first === 'string' && first.startsWith('http')) return first;
      if (typeof first === 'object' && first?.url) return first.url;
    }
  }
  const json = JSON.stringify(body);
  const urlMatch = json.match(/https?:\/\/[^"\\]+\.(?:png|jpg|jpeg|webp|mp4|webm|mov)[^"\\]*/i);
  if (urlMatch) return urlMatch[0];
  return null;
}
