import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserCreditBalance, createCreditTransaction } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';
import crypto from 'crypto';

const N8N_WEBHOOK_URL = process.env.N8N_SELFIE_WEBHOOK_URL || 'https://n8n.fanverse.lol/webhook/d069e291-644a-4377-996c-b8ef1f17109b';
const N8N_FACESWAP_WEBHOOK_URL = process.env.N8N_FACESWAP_WEBHOOK_URL || 'https://n8n.fanverse.lol/webhook/ezfaceswapfhdkjsuhjkdfshkfjhdsdsfdfsf';
const CREDIT_COST_PER_SELFIE = 25;
const CREDIT_COST_PER_SWAP = 25;

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const automation = (formData.get('automation') as string) || 'infinite-selfies';

    if (automation === 'face-swap') {
      return handleFaceSwap(formData, user);
    }

    // ── Infinite Selfies (existing logic) ──
    const imageFile = formData.get('Ref_1') as File | null;
    const quantity = parseInt(formData.get('quantity') as string) || 1;

    if (!imageFile) {
      return NextResponse.json({ error: 'Reference image (Ref_1) is required.' }, { status: 400 });
    }

    if (quantity < 1 || quantity > 50) {
      return NextResponse.json({ error: 'Quantity must be between 1 and 50.' }, { status: 400 });
    }

    const totalCost = quantity * CREDIT_COST_PER_SELFIE;

    const balance = await getUserCreditBalance(user.id);
    if (balance < totalCost) {
      return NextResponse.json({
        error: `Not enough credits. Need ${totalCost}, have ${balance}.`,
      }, { status: 402 });
    }

    const batchId = crypto.randomUUID();

    await createCreditTransaction({
      userId: user.id,
      amount: -totalCost,
      type: 'spend',
      reason: `Automation: ${quantity} selfie(s)`,
    });

    const [gen] = await db.insert(generations).values({
      userId: user.id,
      batchId,
      model: 'automation-selfie',
      prompt: `Generate ${quantity} selfie(s) from reference image`,
      aspectRatio: '1:1',
      resolution: '1K',
      referenceImages: [],
      status: 'processing',
      creditCost: totalCost,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }).returning();

    const webhookFormData = new FormData();
    webhookFormData.append('Ref_1', imageFile);
    webhookFormData.append('quantity', quantity.toString());
    webhookFormData.append('batchId', batchId);
    webhookFormData.append('generationId', gen.id.toString());
    webhookFormData.append('callbackUrl', `${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/api/automations/callback`);

    fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      body: webhookFormData,
    }).catch((err) => {
      console.error('Failed to call n8n webhook:', err);
    });

    return NextResponse.json({
      success: true,
      batchId,
      generationId: gen.id,
      creditCost: totalCost,
      quantity,
    });
  } catch (error: any) {
    console.error('Automation generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── Face Swap handler ──
async function handleFaceSwap(formData: FormData, user: { id: number }) {
  const refFile = formData.get('ref') as File | null;
  const swapFiles = formData.getAll('swaps') as File[];

  if (!refFile) {
    return NextResponse.json({ error: 'Reference image is required.' }, { status: 400 });
  }

  if (swapFiles.length === 0) {
    return NextResponse.json({ error: 'At least one swap image is required.' }, { status: 400 });
  }

  if (swapFiles.length > 15) {
    return NextResponse.json({ error: 'Maximum 15 swap images allowed.' }, { status: 400 });
  }

  const totalCost = swapFiles.length * CREDIT_COST_PER_SWAP;

  const balance = await getUserCreditBalance(user.id);
  if (balance < totalCost) {
    return NextResponse.json({
      error: `Not enough credits. Need ${totalCost}, have ${balance}.`,
    }, { status: 402 });
  }

  const batchId = crypto.randomUUID();

  await createCreditTransaction({
    userId: user.id,
    amount: -totalCost,
    type: 'spend',
    reason: `Automation: face swap on ${swapFiles.length} image(s)`,
  });

  const [gen] = await db.insert(generations).values({
    userId: user.id,
    batchId,
    model: 'automation-faceswap',
    prompt: `Face swap on ${swapFiles.length} image(s) from reference`,
    aspectRatio: '1:1',
    resolution: '1K',
    referenceImages: [],
    status: 'processing',
    creditCost: totalCost,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }).returning();

  const webhookFormData = new FormData();
  webhookFormData.append('ref', refFile);
  for (const swapFile of swapFiles) {
    webhookFormData.append('swaps', swapFile);
  }
  webhookFormData.append('batchId', batchId);
  webhookFormData.append('generationId', gen.id.toString());
  webhookFormData.append('callbackUrl', `${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/api/automations/callback`);

  fetch(N8N_FACESWAP_WEBHOOK_URL, {
    method: 'POST',
    body: webhookFormData,
  }).catch((err) => {
    console.error('Failed to call n8n faceswap webhook:', err);
  });

  return NextResponse.json({
    success: true,
    batchId,
    generationId: gen.id,
    creditCost: totalCost,
    quantity: swapFiles.length,
  });
}
