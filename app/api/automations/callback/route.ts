import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';
import { createCreditTransaction } from '@/lib/db/queries';

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
          // Convert binary file to base64 data URL
          const buffer = Buffer.from(await value.arrayBuffer());
          const mimeType = value.type || 'image/jpeg';
          body.imageBase64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
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

    // Single image mode (from n8n loop — one callback per image)
    const singleImage = imageBase64 || imageUrl;
    if (singleImage) {
      // Find the next "processing" generation in this batch to fill
      const batchGens = batchId
        ? await db.select().from(generations)
            .where(and(eq(generations.batchId, batchId), eq(generations.status, 'processing')))
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

      // Build resultData with cleanifyFailed flag
      const resultData: Record<string, any> = {};
      if (cleanifyFailed === true || cleanifyFailed === 'true') {
        resultData.cleanifyFailed = true;
      }

      await db.update(generations)
        .set({
          status: 'completed',
          resultUrl: singleImage,
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

    // Find all processing generations in the batch
    const batchGens = batchId
      ? await db.select().from(generations)
          .where(and(eq(generations.batchId, batchId), eq(generations.status, 'processing')))
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
