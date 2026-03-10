import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';
import { createCreditTransaction } from '@/lib/db/queries';
import { uploadToR2FromUrl, uploadToR2FromBase64 } from '@/lib/r2';

// Upload result image to R2 and return the R2 URL.
// Falls back to original URL/data if upload fails (avoids breaking the flow).
async function saveResultToR2(
  imageData: string, // either a URL or a base64 data URL
  batchId: string,
  genId: number,
): Promise<string> {
  const isBase64 = imageData.startsWith('data:');
  const ext = isBase64
    ? (imageData.match(/data:image\/(\w+)/)?.[1] || 'jpg')
    : (imageData.split('.').pop()?.split('?')[0] || 'jpg');
  const key = `results/${batchId}/${genId}-${Date.now()}.${ext}`;

  try {
    if (isBase64) return await uploadToR2FromBase64(imageData, key);
    return await uploadToR2FromUrl(imageData, key);
  } catch (err) {
    console.error('[CALLBACK] R2 upload failed, using original URL:', err);
    return imageData;
  }
}

// n8n calls this endpoint once per generated image (loop)
// Supports both JSON and multipart/form-data (binary file from n8n)
// Expected fields: generationId, batchId, cleanifyFailed (optional)
// Image via: imageBase64, imageUrl (JSON) or file upload (form-data)
export async function POST(request: NextRequest) {
  try {
    let body: any;

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = {} as any;

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          const buffer = Buffer.from(await value.arrayBuffer());
          const mimeType = value.type || 'image/jpeg';
          body.imageBase64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
        } else {
          const str = value as string;
          if (str === 'true') {
            body[key] = true;
          } else if (str === 'false') {
            body[key] = false;
          } else {
            const num = Number(str);
            body[key] = (!isNaN(num) && str !== '') ? num : str;
          }
        }
      }
    } else {
      body = await request.json();
    }

    const { generationId, batchId, imageBase64, imageUrl, images, imagesBase64, error, cleanifyFailed } = body;

    if (!generationId && !batchId) {
      return NextResponse.json({ error: 'generationId or batchId required' }, { status: 400 });
    }

    if (error) {
      if (generationId) {
        const [gen] = await db.select().from(generations).where(eq(generations.id, generationId));
        await db.update(generations)
          .set({ status: 'failed', error, updatedAt: new Date() })
          .where(eq(generations.id, generationId));
        if (gen && gen.creditCost > 0 && gen.status !== 'failed') {
          await createCreditTransaction({
            userId: gen.userId,
            amount: gen.creditCost,
            type: 'refund',
            reason: `Refund: generation #${generationId} failed — ${error}`,
          });
        }
      }
      return NextResponse.json({ success: true, status: 'failed' });
    }

    const resultData: Record<string, any> = {};
    if (cleanifyFailed === true || cleanifyFailed === 'true') {
      resultData.cleanifyFailed = true;
    }

    // Single image mode (one callback per image)
    const rawImage = imageBase64 || imageUrl;
    if (rawImage) {
      const batchGens = batchId
        ? await db.select().from(generations)
            .where(and(eq(generations.batchId, batchId), eq(generations.status, 'processing')))
        : [];

      let targetGen = batchGens.length > 0 ? batchGens[0] : null;

      if (!targetGen && generationId) {
        const [gen] = await db.select().from(generations).where(eq(generations.id, generationId));
        targetGen = gen || null;
      }

      if (!targetGen) {
        return NextResponse.json({ error: 'No pending generation found for this batch' }, { status: 404 });
      }

      const resultUrl = await saveResultToR2(rawImage, batchId || targetGen.batchId, targetGen.id);

      await db.update(generations)
        .set({
          status: 'completed',
          resultUrl,
          resultData: Object.keys(resultData).length > 0 ? resultData : null,
          updatedAt: new Date(),
        })
        .where(eq(generations.id, targetGen.id));

      return NextResponse.json({ success: true, status: 'completed', filledGenId: targetGen.id });
    }

    // Batch mode (all images at once)
    const allImages: string[] = imagesBase64 || images || [];
    if (allImages.length === 0) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const batchGens = batchId
      ? await db.select().from(generations)
          .where(and(eq(generations.batchId, batchId), eq(generations.status, 'processing')))
      : [];

    for (let i = 0; i < allImages.length; i++) {
      const targetGen = i < batchGens.length ? batchGens[i] : batchGens[0] || null;
      if (!targetGen) continue;

      const resultUrl = await saveResultToR2(allImages[i], batchId || targetGen.batchId, targetGen.id);

      if (i < batchGens.length) {
        await db.update(generations)
          .set({
            status: 'completed',
            resultUrl,
            resultData: Object.keys(resultData).length > 0 ? resultData : null,
            updatedAt: new Date(),
          })
          .where(eq(generations.id, batchGens[i].id));
      } else {
        const original = batchGens[0];
        await db.insert(generations).values({
          userId: original.userId,
          batchId: original.batchId,
          model: original.model,
          prompt: original.prompt,
          aspectRatio: '1:1',
          resolution: '1K',
          referenceImages: [],
          status: 'completed',
          resultUrl,
          resultData: Object.keys(resultData).length > 0 ? resultData : null,
          creditCost: 0,
          expiresAt: original.expiresAt,
        });
      }
    }

    return NextResponse.json({ success: true, status: 'completed', count: allImages.length });
  } catch (error: any) {
    console.error('Automation callback error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
