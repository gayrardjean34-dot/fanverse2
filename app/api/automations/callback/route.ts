import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';

// n8n calls this endpoint once per generated image (loop)
// Expected payloads:
//   Single image:  { generationId, batchId, imageBase64: "data:image/jpeg;base64,..." }
//   Single URL:    { generationId, batchId, imageUrl: "https://..." }
//   Batch:         { generationId, batchId, images: [...] } or { imagesBase64: [...] }
//   Error:         { generationId, error: "..." }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { generationId, batchId, imageBase64, imageUrl, images, imagesBase64, error } = body;

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

    // Single image mode (from loop)
    const singleImage = imageBase64 || imageUrl;
    if (singleImage) {
      // Check if the original generation already has a result
      const [original] = await db.select().from(generations).where(eq(generations.id, generationId));
      if (!original) {
        return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
      }

      if (original.status === 'completed' && original.resultUrl) {
        // Original already has an image — create a new entry for this one
        await db.insert(generations).values({
          userId: original.userId,
          batchId: original.batchId,
          model: 'automation-selfie',
          prompt: original.prompt,
          aspectRatio: '1:1',
          resolution: '1K',
          referenceImages: [],
          status: 'completed',
          resultUrl: singleImage,
          creditCost: 0,
          expiresAt: original.expiresAt,
        });
      } else {
        // First image — update the original generation
        await db.update(generations)
          .set({
            status: 'completed',
            resultUrl: singleImage,
            updatedAt: new Date(),
          })
          .where(eq(generations.id, generationId));
      }

      return NextResponse.json({ success: true, status: 'completed' });
    }

    // Batch mode (all at once)
    const allImages: string[] = imagesBase64 || images || [];
    if (allImages.length === 0) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    if (generationId) {
      await db.update(generations)
        .set({
          status: 'completed',
          resultUrl: allImages[0],
          resultData: { images: allImages },
          updatedAt: new Date(),
        })
        .where(eq(generations.id, generationId));

      if (allImages.length > 1) {
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
    }

    return NextResponse.json({ success: true, status: 'completed', count: allImages.length });
  } catch (error: any) {
    console.error('Automation callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
