import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';
import { getUser, getUserCreditBalance, createCreditTransaction } from '@/lib/db/queries';
import { AI_PROVIDERS, isValidProvider } from '@/lib/ai/providers';
import { getKieCredits, isLowCredits, sendLowCreditAlert } from '@/lib/kie/credits';
import crypto from 'crypto';

const KIE_API_URL = 'https://api.kie.ai/api/v1/jobs/createTask';

// Track if we already sent an alert this deployment (avoid spam)
let alertSentThisDeployment = false;

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
      // Video-specific params
      duration,
      mode,
      sound,
    } = body;

    if (!model || !prompt) {
      return NextResponse.json({ error: 'Model and prompt are required.' }, { status: 400 });
    }

    if (!isValidProvider(model)) {
      return NextResponse.json({ error: 'Unknown model.' }, { status: 400 });
    }

    if (batchSize < 1 || batchSize > 10) {
      return NextResponse.json({ error: 'Batch size must be between 1 and 10.' }, { status: 400 });
    }

    const providerConfig = AI_PROVIDERS[model];
    const apiKey = process.env[providerConfig.envKey];
    if (!apiKey) {
      return NextResponse.json({ error: 'Model API not configured.' }, { status: 500 });
    }

    const costPerUnit = providerConfig.getCreditCost({
      resolution,
      duration: duration || providerConfig.defaultDuration,
      mode,
      sound: sound || false,
    });
    const totalCost = costPerUnit * batchSize;

    const balance = await getUserCreditBalance(user.id);
    if (balance < totalCost) {
      return NextResponse.json({
        error: `Not enough credits. Need ${totalCost}, have ${balance}.`,
      }, { status: 402 });
    }

    // Check kie.ai credits before proceeding
    const kieCredits = await getKieCredits();
    if (kieCredits !== null) {
      console.log('[GENERATE] kie.ai credits:', kieCredits);
      if (kieCredits <= 0) {
        return NextResponse.json({
          error: 'Service temporarily unavailable. Please try again later.',
        }, { status: 503 });
      }
      if (isLowCredits(kieCredits) && !alertSentThisDeployment) {
        alertSentThisDeployment = true;
        // Fire and forget — don't block the generation
        sendLowCreditAlert(kieCredits).catch(() => {});
      }
    }

    // Deduct credits upfront
    await createCreditTransaction({
      userId: user.id,
      type: 'spend',
      amount: -totalCost,
      reason: `Generation: ${model} x${batchSize}`,
    });

    const batchId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
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
        creditCost: costPerUnit,
        expiresAt,
      }).returning();
      genRecords.push(gen);
    }

    // Build model-specific payload
    function buildInputPayload() {
      const input: Record<string, any> = {};

      if (providerConfig.type === 'image') {
        // Image models (nano-banana-pro, seedream)
        input.prompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
        input.aspect_ratio = aspectRatio;
        input.resolution = resolution;
        input.output_format = 'png';
        if (temperature !== undefined && temperature !== null) input.temperature = temperature;
        if (topP !== undefined && topP !== null) input.top_p = topP;
        if (topK !== undefined && topK !== null) input.top_k = topK;
        if (referenceImages.length > 0) input.reference_images = referenceImages;
      } else if (model === 'grok-imagine') {
        // Grok Imagine text-to-video
        input.prompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
        input.aspect_ratio = aspectRatio || '16:9';
        input.duration = duration || '6';
        input.mode = mode || 'normal';
        input.resolution = resolution || '480p';
      } else if (model === 'kling-3.0') {
        // Kling 3.0
        input.prompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
        input.mode = mode || 'standard';
        input.sound = sound || false;
        input.duration = duration || '5';
        input.aspect_ratio = aspectRatio || '16:9';
        input.multi_shots = false;
        if (referenceImages.length > 0) {
          input.image_urls = referenceImages.filter((img: string) => img.startsWith('http'));
        }
      } else if (model === 'kling-2.6') {
        // Kling 2.6 image-to-video
        input.prompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
        input.sound = sound || false;
        input.duration = duration || '5';
        if (referenceImages.length > 0) {
          input.image_urls = referenceImages.filter((img: string) => img.startsWith('http'));
        }
      }

      return input;
    }

    // Fire all API calls in parallel
    const apiPromises = genRecords.map(async (gen) => {
      try {
        const inputPayload = buildInputPayload();

        const res = await fetch(KIE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: providerConfig.apiModel,
            callBackUrl: `${callbackUrl}?genId=${gen.id}`,
            input: inputPayload,
          }),
        });

        const data = await res.json();
        console.log('[GENERATE]', model, 'gen', gen.id, ':', JSON.stringify(data));

        if (!res.ok) {
          await db.update(generations)
            .set({ status: 'failed', error: data.message || data.error || 'API error', resultData: data, updatedAt: new Date() })
            .where(eq(generations.id, gen.id));
          return { id: gen.id, status: 'failed' as const, error: data.message || data.error };
        }

        const taskId = data.taskId || data.id || data.job_id || data.data?.taskId || data.data?.id || null;
        await db.update(generations)
          .set({
            status: 'processing',
            externalTaskId: taskId,
            resultData: data,
            updatedAt: new Date(),
          })
          .where(eq(generations.id, gen.id));

        return { id: gen.id, status: 'processing' as const, taskId };
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
        amount: costPerUnit * failedCount,
        reason: `Refund: ${failedCount}/${batchSize} failed (${batchId})`,
      });
    }

    return NextResponse.json({
      batchId,
      totalCost: costPerUnit * (batchSize - failedCount),
      generations: results,
    });
  } catch (error: any) {
    console.error('Generate error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
