import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';
import { getUser, getUserCreditBalance, createCreditTransaction } from '@/lib/db/queries';
import crypto from 'crypto';

const MODEL_ENDPOINTS: Record<string, { url: string; apiKeyEnv: string }> = {
  'nano-banana-pro': {
    url: 'https://api.kie.ai/api/v1/jobs/createTask',
    apiKeyEnv: 'KIE_API_KEY',
  },
  'kling': {
    url: 'https://api.kie.ai/api/v1/jobs/createTask',
    apiKeyEnv: 'KIE_API_KEY',
  },
  'grok-imagine': {
    url: 'https://api.kie.ai/api/v1/jobs/createTask',
    apiKeyEnv: 'KIE_API_KEY',
  },
  'seedream': {
    url: 'https://api.kie.ai/api/v1/jobs/createTask',
    apiKeyEnv: 'KIE_API_KEY',
  },
};

function getCreditCost(resolution: string): number {
  return resolution === '4K' ? 25 : 20;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const {
      model,
      prompt,
      systemPrompt,
      aspectRatio = '1:1',
      resolution = '1K',
      temperature,
      topP,
      topK,
      referenceImages = [],
      batchSize = 1,
    } = body;

    if (!model || !prompt) {
      return NextResponse.json({ error: 'Model and prompt are required.' }, { status: 400 });
    }

    if (batchSize < 1 || batchSize > 10) {
      return NextResponse.json({ error: 'Batch size must be between 1 and 10.' }, { status: 400 });
    }

    const endpoint = MODEL_ENDPOINTS[model];
    if (!endpoint) {
      return NextResponse.json({ error: 'Unknown model.' }, { status: 400 });
    }

    const apiKey = process.env[endpoint.apiKeyEnv];
    if (!apiKey) {
      return NextResponse.json({ error: 'Model API not configured.' }, { status: 500 });
    }

    const costPerImage = getCreditCost(resolution);
    const totalCost = costPerImage * batchSize;

    const balance = await getUserCreditBalance(user.id);
    if (balance < totalCost) {
      return NextResponse.json({
        error: `Not enough credits. Need ${totalCost}, have ${balance}.`,
      }, { status: 402 });
    }

    // Deduct credits upfront
    await createCreditTransaction({
      userId: user.id,
      type: 'spend',
      amount: -totalCost,
      reason: `Generation: ${model} x${batchSize} (${resolution})`,
    });

    const batchId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const callbackUrl = `${process.env.BASE_URL}/api/generate/callback`;

    // Create all generation records
    const genRecords = [];
    for (let i = 0; i < batchSize; i++) {
      const [gen] = await db.insert(generations).values({
        userId: user.id,
        batchId,
        model,
        prompt,
        systemPrompt: systemPrompt || null,
        aspectRatio,
        resolution,
        temperature: temperature ?? null,
        topP: topP ?? null,
        topK: topK ?? null,
        referenceImages,
        status: 'pending',
        creditCost: costPerImage,
        expiresAt,
      }).returning();
      genRecords.push(gen);
    }

    // Fire all API calls in parallel
    const apiPromises = genRecords.map(async (gen) => {
      try {
        const inputPayload: Record<string, any> = {
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
          aspect_ratio: aspectRatio,
          resolution,
          output_format: 'png',
        };

        if (temperature !== undefined && temperature !== null) inputPayload.temperature = temperature;
        if (topP !== undefined && topP !== null) inputPayload.top_p = topP;
        if (topK !== undefined && topK !== null) inputPayload.top_k = topK;
        if (referenceImages.length > 0) inputPayload.reference_images = referenceImages;

        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            callBackUrl: `${callbackUrl}?genId=${gen.id}`,
            input: inputPayload,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          await db.update(generations)
            .set({ status: 'failed', error: data.message || 'API error', updatedAt: new Date() })
            .where(eq(generations.id, gen.id));
          return { id: gen.id, status: 'failed' as const, error: data.message };
        }

        await db.update(generations)
          .set({
            status: 'processing',
            externalTaskId: data.taskId || data.id || data.job_id || null,
            updatedAt: new Date(),
          })
          .where(eq(generations.id, gen.id));

        return { id: gen.id, status: 'processing' as const, taskId: data.taskId || data.id };
      } catch (err: any) {
        await db.update(generations)
          .set({ status: 'failed', error: err.message, updatedAt: new Date() })
          .where(eq(generations.id, gen.id));
        return { id: gen.id, status: 'failed' as const, error: err.message };
      }
    });

    const results = await Promise.all(apiPromises);

    // Refund failed generations
    const failedCount = results.filter((r) => r.status === 'failed').length;
    if (failedCount > 0) {
      await createCreditTransaction({
        userId: user.id,
        type: 'refund',
        amount: costPerImage * failedCount,
        reason: `Refund: ${failedCount}/${batchSize} failed (${batchId})`,
      });
    }

    return NextResponse.json({
      batchId,
      totalCost: costPerImage * (batchSize - failedCount),
      generations: results,
    });
  } catch (error: any) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
