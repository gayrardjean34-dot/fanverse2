import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';

// n8n will call this endpoint when images are ready
// Expected payload:
//   { generationId: number, batchId: string, images: string[] }           — URLs
//   { generationId: number, batchId: string, imagesBase64: string[] }     — base64 data URIs
//   { generationId: number, error: string }                                — failure
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { generationId, batchId, images, imagesBase64, error } = body;

    if (!generationId && !batchId) {
      return NextResponse.json({ error: 'generationId or batchId required' }, { status: 400 });
    }

    if (error) {
      if (generationId) {
        await db.update(generations)
          .set({ status: 'failed', error, updatedAt: new Date() })
          .where(eq(generations.id, generationId));
      }
      return NextResponse.json({ success: true, status: 'failed' });
    }

    // Accept either URLs or base64
    const allImages: string[] = imagesBase64 || images || [];

    if (allImages.length === 0) {
      return NextResponse.json({ error: 'images or imagesBase64 array required' }, { status: 400 });
    }

    // Update the original generation with the first image
    if (generationId) {
      await db.update(generations)
        .set({
          status: 'completed',
          resultUrl: allImages[0],
          resultData: { images: allImages },
          updatedAt: new Date(),
        })
        .where(eq(generations.id, generationId));
    }

    // If multiple images, create additional generation entries
    if (allImages.length > 1 && generationId) {
      const [original] = await db.select().from(generations).where(eq(generations.id, generationId));
      if (original) {
        for (let i = 1; i < allImages.length; i++) {
          await db.insert(generations).values({
            userId: original.userId,
            batchId: original.batchId,
            model: 'automation-selfie',
            prompt: original.prompt,
            aspectRatio: '1:1',
            resolution: '1K',
            referenceImages: [],
            status: 'completed',
            resultUrl: allImages[i],
            creditCost: 0,
            expiresAt: original.expiresAt,
          });
        }
      }
    }

    return NextResponse.json({ success: true, status: 'completed', count: allImages.length });
  } catch (error: any) {
    console.error('Automation callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
