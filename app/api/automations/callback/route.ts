import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';

// n8n will call this endpoint when images are ready
// Expected payload: { generationId: number, images: string[] } or { generationId: number, error: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { generationId, batchId, images, error } = body;

    if (!generationId && !batchId) {
      return NextResponse.json({ error: 'generationId or batchId required' }, { status: 400 });
    }

    if (error) {
      // Mark as failed
      if (generationId) {
        await db.update(generations)
          .set({ status: 'failed', error, updatedAt: new Date() })
          .where(eq(generations.id, generationId));
      }
      return NextResponse.json({ success: true, status: 'failed' });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ error: 'images array required' }, { status: 400 });
    }

    // Update the original generation with the first image
    if (generationId) {
      await db.update(generations)
        .set({
          status: 'completed',
          resultUrl: images[0],
          resultData: { images },
          updatedAt: new Date(),
        })
        .where(eq(generations.id, generationId));
    }

    // If there are multiple images, create additional generation entries
    if (images.length > 1 && generationId) {
      const [original] = await db.select().from(generations).where(eq(generations.id, generationId));
      if (original) {
        for (let i = 1; i < images.length; i++) {
          await db.insert(generations).values({
            userId: original.userId,
            batchId: original.batchId,
            model: 'automation-selfie',
            prompt: original.prompt,
            aspectRatio: '1:1',
            resolution: '1K',
            referenceImages: [],
            status: 'completed',
            resultUrl: images[i],
            creditCost: 0, // already charged on the original
            expiresAt: original.expiresAt,
          });
        }
      }
    }

    return NextResponse.json({ success: true, status: 'completed', count: images.length });
  } catch (error: any) {
    console.error('Automation callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
