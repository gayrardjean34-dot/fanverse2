import { NextRequest, NextResponse } from 'next/server';
import { eq, and, asc } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';
import { createCreditTransaction } from '@/lib/db/queries';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2, R2_BUCKET, r2PublicUrl } from '@/lib/r2';

// Upload a base64 data URL or raw buffer to R2, return the public URL
async function uploadImageToR2(image: string | Buffer, batchId: string, mimeType = 'image/jpeg'): Promise<string> {
  let buffer: Buffer;
  if (typeof image === 'string') {
    const match = image.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      buffer = Buffer.from(match[2], 'base64');
    } else {
      buffer = Buffer.from(image, 'base64');
    }
  } else {
    buffer = image;
  }
  const ext = mimeType.split('/')[1]?.split('+')[0] || 'jpg';
  const key = `generated/${batchId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));
  return r2PublicUrl(key);
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
      // n8n sends form-data with binary file + fields
      const formData = await request.formData();
      body = {} as any;

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          // Store buffer for direct R2 upload — avoid base64 in memory
          const buffer = Buffer.from(await value.arrayBuffer());
          body._imageBuffer = buffer;
          body._imageMime = value.type || 'image/jpeg';
        } else {
          // Parse numeric strings for IDs, booleans for flags
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

    const { generationId, batchId, imageBase64, imageUrl, images, imagesBase64, error, cleanifyFailed, _imageBuffer, _imageMime } = body;

    if (!generationId && !batchId) {
      return NextResponse.json({ error: 'generationId or batchId required' }, { status: 400 });
    }

    if (error) {
      if (generationId) {
        const [gen] = await db.select().from(generations).where(eq(generations.id, generationId));
        await db.update(generations)
          .set({ status: 'failed', error, updatedAt: new Date() })
          .where(eq(generations.id, generationId));
        // Refund credits on error
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

    // Resolve the effective batchId for R2 upload key
    const effectiveBatchId = batchId || String(generationId);

    // Single image mode (from n8n loop — one callback per image)
    // Prefer binary buffer > base64 > direct URL — always upload to R2 to avoid base64 in DB
    const hasSingleImage = _imageBuffer || imageBase64 || imageUrl;
    if (hasSingleImage) {
      // Find the next "processing" generation in this batch to fill
      const batchGens = batchId
        ? await db.select().from(generations)
            .where(and(eq(generations.batchId, batchId), eq(generations.status, 'processing')))
            .orderBy(asc(generations.id))
        : [];

      // Also try by generationId as fallback
      let targetGen = batchGens.length > 0 ? batchGens[0] : null;

      if (!targetGen && generationId) {
        const [gen] = await db.select().from(generations).where(eq(generations.id, generationId));
        targetGen = gen || null;
      }

      if (!targetGen) {
        return NextResponse.json({ error: 'No pending generation found for this batch' }, { status: 404 });
      }

      // Upload image to R2 — never store base64 in DB (causes massive Vercel bandwidth)
      let storedUrl: string;
      if (_imageBuffer) {
        storedUrl = await uploadImageToR2(_imageBuffer, effectiveBatchId, _imageMime);
      } else if (imageBase64 && imageBase64.startsWith('data:')) {
        storedUrl = await uploadImageToR2(imageBase64, effectiveBatchId);
      } else {
        storedUrl = imageUrl || imageBase64; // already an HTTPS URL
      }

      // Build resultData with cleanifyFailed flag
      const resultData: Record<string, any> = {};
      if (cleanifyFailed === true || cleanifyFailed === 'true') {
        resultData.cleanifyFailed = true;
      }

      await db.update(generations)
        .set({
          status: 'completed',
          resultUrl: storedUrl,
          resultData: Object.keys(resultData).length > 0 ? resultData : null,
          updatedAt: new Date(),
        })
        .where(eq(generations.id, targetGen.id));

      return NextResponse.json({ success: true, status: 'completed', filledGenId: targetGen.id });
    }

    // Batch mode (all images at once)
    const rawBatchImages: string[] = imagesBase64 || images || [];
    if (rawBatchImages.length === 0) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Upload all batch images to R2 in parallel
    const allImages = await Promise.all(
      rawBatchImages.map((img, i) =>
        img.startsWith('data:') || (img.length > 500 && !img.startsWith('http'))
          ? uploadImageToR2(img, effectiveBatchId)
          : Promise.resolve(img)
      )
    );

    // Find all processing generations in the batch
    const batchGens = batchId
      ? await db.select().from(generations)
          .where(and(eq(generations.batchId, batchId), eq(generations.status, 'processing')))
          .orderBy(asc(generations.id))
      : [];

    const resultData: Record<string, any> = {};
    if (cleanifyFailed === true || cleanifyFailed === 'true') {
      resultData.cleanifyFailed = true;
    }

    // Fill batch generations one by one
    for (let i = 0; i < allImages.length; i++) {
      if (i < batchGens.length) {
        // Update existing processing generation
        await db.update(generations)
          .set({
            status: 'completed',
            resultUrl: allImages[i],
            resultData: Object.keys(resultData).length > 0 ? resultData : null,
            updatedAt: new Date(),
          })
          .where(eq(generations.id, batchGens[i].id));
      } else if (batchGens.length > 0) {
        // More images than expected — create extra entries
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
          resultUrl: allImages[i],
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
