import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserCreditBalance, createCreditTransaction, getUserWithTeam, getTeamForUser } from '@/lib/db/queries';
import { db } from '@/lib/db/drizzle';
import { generations, teams } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const N8N_WEBHOOK_URL = process.env.N8N_SELFIE_WEBHOOK_URL || 'https://n8n.fanverse.lol/webhook/d069e291-644a-4377-996c-b8ef1f17109b';
const N8N_FACESWAP_WEBHOOK_URL = process.env.N8N_FACESWAP_WEBHOOK_URL || 'https://n8n.fanverse.lol/webhook/ezfaceswapfhdkjsuhjkdfshkfjhdsdsfdfsf';
const N8N_FACESWAP_UNCENSORED_WEBHOOK_URL = process.env.N8N_FACESWAP_UNCENSORED_WEBHOOK_URL || 'https://n8n.fanverse.lol/webhook/ezfaceswapuncensoredfhdkjsuhjkdfshkfjhdsdsfdfsf';
const N8N_OUTFIT_SWAP_WEBHOOK_URL = process.env.N8N_OUTFIT_SWAP_WEBHOOK_URL || 'https://n8n.fanverse.lol/webhook/outfitswapjefaisuneurlquisertarioentuletrouverajamaispetitfoudubusklijjfezoiljfe';
const N8N_CAROUSEL_WEBHOOK_URL = process.env.N8N_CAROUSEL_WEBHOOK_URL || 'https://n8n.fanverse.lol/webhook/infinitcarouselworkflown8nilvaetrechiantafaireluiammaiostracassmglcavalefairelzikfjerslzkfjlkrej';
const CREDIT_COST_PER_SELFIE = 22;
const CREDIT_COST_PER_SWAP = 22;
const CREDIT_COST_PER_SWAP_UNCENSORED = 23;
const CREDIT_COST_OUTFIT_SWAP = 15;
const CREDIT_COST_PER_CAROUSEL_IMAGE = 23;

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const automation = body.automation || 'infinite-selfies';

    // Check automation access
    const hasAccess = await checkAutomationAccess(user, automation);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You don\'t have access to this automation. Unlock it or upgrade your plan.' },
        { status: 403 }
      );
    }

    if (automation === 'face-swap') {
      return handleFaceSwap(body, user);
    }

    if (automation === 'ez-face-swap-uncensored') {
      return handleFaceSwapUncensored(body, user);
    }

    if (automation === 'outfit-swap') {
      return handleOutfitSwap(body, user);
    }

    if (automation === 'infinite-carousel') {
      return handleInfiniteCarousel(body, user);
    }

    // ── Infinite Selfies ──
    const refUrl = body.refUrl as string | undefined;
    const quantity = parseInt(body.quantity) || 1;

    if (!refUrl) {
      return NextResponse.json({ error: 'Reference image URL is required.' }, { status: 400 });
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

    // Create one generation per image requested — all show as "processing"
    const costPerImage = Math.floor(totalCost / quantity);
    const remainder = totalCost - costPerImage * quantity;

    const genValues = Array.from({ length: quantity }, (_, i) => ({
      userId: user.id,
      batchId,
      model: 'automation-selfie' as const,
      prompt: `Generate selfie from reference image (${i + 1}/${quantity})`,
      aspectRatio: '1:1' as const,
      resolution: '1K' as const,
      referenceImages: [] as string[],
      status: 'processing' as const,
      creditCost: i === 0 ? costPerImage + remainder : costPerImage,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }));

    const insertedGens = await db.insert(generations).values(genValues).returning();

    const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/api/automations/callback`;

    fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refUrl,
        quantity,
        batchId,
        generationId: insertedGens[0].id.toString(),
        callbackUrl,
      }),
    }).catch((err) => {
      console.error('Failed to call n8n webhook:', err);
    });

    return NextResponse.json({
      success: true,
      batchId,
      generationId: insertedGens[0].id,
      creditCost: totalCost,
      quantity,
    });
  } catch (error: any) {
    console.error('Automation generate error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── Access check ──
async function checkAutomationAccess(user: any, automationId: string): Promise<boolean> {
  // Admin bypass
  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean);
  if (adminEmails.includes(user.email)) return true;

  const unlockedAutomations = (user.unlockedAutomations as string[]) || [];
  if (unlockedAutomations.includes(automationId)) {
    return true;
  }

  const team = await getTeamForUser();
  if (team) {
    const planName = (team.planName || '').toLowerCase();
    const isActive = team.subscriptionStatus === 'active' || team.subscriptionStatus === 'trialing';

    if (isActive) {
      if (planName.includes('pro')) return true;
      if (planName.includes('starter')) return true;
    }
  }

  return false;
}

// ── Face Swap handler ──
async function handleFaceSwap(body: any, user: { id: number }) {
  const refUrl = body.refUrl as string | undefined;
  const swapUrls = body.swapUrls as string[] | undefined;

  if (!refUrl) {
    return NextResponse.json({ error: 'Reference image is required.' }, { status: 400 });
  }

  if (!swapUrls || swapUrls.length === 0) {
    return NextResponse.json({ error: 'At least one swap image is required.' }, { status: 400 });
  }

  if (swapUrls.length > 15) {
    return NextResponse.json({ error: 'Maximum 15 swap images allowed.' }, { status: 400 });
  }

  const totalCost = swapUrls.length * CREDIT_COST_PER_SWAP;

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
    reason: `Automation: face swap on ${swapUrls.length} image(s)`,
  });

  // Create one generation per swap image — all show as "processing"
  const costPerImage = Math.floor(totalCost / swapUrls.length);
  const remainder = totalCost - costPerImage * swapUrls.length;

  const genValues = swapUrls.map((_, i) => ({
    userId: user.id,
    batchId,
    model: 'automation-faceswap' as const,
    prompt: `Face swap image ${i + 1}/${swapUrls.length} from reference`,
    aspectRatio: '1:1' as const,
    resolution: '1K' as const,
    referenceImages: [] as string[],
    status: 'processing' as const,
    creditCost: i === 0 ? costPerImage + remainder : costPerImage,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }));

  const insertedGens = await db.insert(generations).values(genValues).returning();

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/api/automations/callback`;

  fetch(N8N_FACESWAP_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ref: refUrl,
      swaps: swapUrls,
      batchId,
      generationId: insertedGens[0].id.toString(),
      callbackUrl,
    }),
  }).catch((err) => {
    console.error('Failed to call n8n faceswap webhook:', err);
  });

  return NextResponse.json({
    success: true,
    batchId,
    generationId: insertedGens[0].id,
    creditCost: totalCost,
    quantity: swapUrls.length,
  });
}

// ── Outfit Swap handler ──
async function handleOutfitSwap(body: any, user: { id: number }) {
  const refUrl = body.refUrl as string | undefined;
  const swapUrl = body.swap as string | undefined;
  const clothePrompt = body.clothe as string | undefined;

  if (!refUrl) {
    return NextResponse.json({ error: 'Reference image is required.' }, { status: 400 });
  }

  if (!swapUrl && !clothePrompt) {
    return NextResponse.json({ error: 'Either a clothes image or a clothes description is required.' }, { status: 400 });
  }

  if (swapUrl && clothePrompt) {
    return NextResponse.json({ error: 'Provide either a clothes image or a description, not both.' }, { status: 400 });
  }

  const balance = await getUserCreditBalance(user.id);
  if (balance < CREDIT_COST_OUTFIT_SWAP) {
    return NextResponse.json({
      error: `Not enough credits. Need ${CREDIT_COST_OUTFIT_SWAP}, have ${balance}.`,
    }, { status: 402 });
  }

  const batchId = crypto.randomUUID();

  await createCreditTransaction({
    userId: user.id,
    amount: -CREDIT_COST_OUTFIT_SWAP,
    type: 'spend',
    reason: `Automation: outfit swap`,
  });

  const [insertedGen] = await db.insert(generations).values({
    userId: user.id,
    batchId,
    model: 'automation-outfit-swap' as const,
    prompt: clothePrompt ? `Outfit swap: ${clothePrompt}` : 'Outfit swap from clothes image',
    aspectRatio: '1:1' as const,
    resolution: '1K' as const,
    referenceImages: [] as string[],
    status: 'processing' as const,
    creditCost: CREDIT_COST_OUTFIT_SWAP,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }).returning();

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/api/automations/callback`;

  const webhookPayload: Record<string, string> = {
    ref: refUrl,
    batchId,
    generationId: insertedGen.id.toString(),
    callbackUrl,
  };
  if (swapUrl) webhookPayload.swap = swapUrl;
  if (clothePrompt) webhookPayload.clothe = clothePrompt;

  fetch(N8N_OUTFIT_SWAP_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload),
  }).catch((err) => {
    console.error('Failed to call n8n outfit swap webhook:', err);
  });

  return NextResponse.json({
    success: true,
    batchId,
    generationId: insertedGen.id,
    creditCost: CREDIT_COST_OUTFIT_SWAP,
    quantity: 1,
  });
}

// ── Infinite Carousel handler ──
async function handleInfiniteCarousel(body: any, user: { id: number }) {
  const refUrl = body.refUrl as string | undefined;
  const carouselCount = Math.max(1, Math.min(5, parseInt(body.carousel) || 1));
  const carouselMultiplier = Math.max(1, Math.min(5, parseInt(body.quant) || 1));
  const breastRefiner = !!body.breastRefiner;
  const types = {
    body: !!body.body,
    upper: !!body.upper,
    close: !!body.close,
    creative: !!body.creative,
    selfie: !!body.selfie,
  };

  if (!refUrl) {
    return NextResponse.json({ error: 'Reference image is required.' }, { status: 400 });
  }

  const checkedCount = Object.values(types).filter(Boolean).length;
  if (checkedCount === 0) {
    return NextResponse.json({ error: 'At least one shot type must be selected.' }, { status: 400 });
  }

  const totalImages = carouselCount * checkedCount * carouselMultiplier;
  const totalCost = totalImages * CREDIT_COST_PER_CAROUSEL_IMAGE;

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
    reason: `Automation: ${carouselCount} carousel(s), ${checkedCount} type(s), x${carouselMultiplier}`,
  });

  const costPerImage = Math.floor(totalCost / totalImages);
  const remainder = totalCost - costPerImage * totalImages;

  const genValues = Array.from({ length: totalImages }, (_, i) => ({
    userId: user.id,
    batchId,
    model: 'automation-carousel' as const,
    prompt: `Carousel image ${i + 1}/${totalImages}`,
    aspectRatio: '1:1' as const,
    resolution: '1K' as const,
    referenceImages: [] as string[],
    status: 'processing' as const,
    creditCost: i === 0 ? costPerImage + remainder : costPerImage,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }));

  const insertedGens = await db.insert(generations).values(genValues).returning();

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/api/automations/callback`;

  fetch(N8N_CAROUSEL_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ref: refUrl,
      carousel: carouselCount,
      quant: carouselMultiplier,
      wavemax: checkedCount,
      body: types.body,
      upper: types.upper,
      close: types.close,
      creative: types.creative,
      selfie: types.selfie,
      breast: breastRefiner
        ? 'This girl is wearing a low-cut push-up bra that clearly contains and supports full breast volume.\nThe breasts are visibly filled, lifted, and rounded inside the bra, pressing outward against the fabric.\nThere is no hollow or empty space: the cups are fully occupied, creating a solid, dense, rounded shape with a clearly defined upper curve.\nThe lifted breast volume creates a strong, rounded contour at the top, with visible fullness and depth beneath the neckline.\nThe effect is unmistakably that of a firm, filled push-up bra, with realistic weight and volume inside the garment. Keep the original breast size, do not make them bigger.\nthe bra is not visible, this not explicit content'
        : '',
      batchId,
      generationId: insertedGens[0].id.toString(),
      callbackUrl,
    }),
  }).catch((err) => {
    console.error('Failed to call n8n carousel webhook:', err);
  });

  return NextResponse.json({
    success: true,
    batchId,
    generationId: insertedGens[0].id,
    creditCost: totalCost,
    quantity: totalImages,
  });
}

// ── Face Swap Uncensored handler ──
async function handleFaceSwapUncensored(body: any, user: { id: number }) {
  const refUrl = body.refUrl as string | undefined;
  const swapUrls = body.swapUrls as string[] | undefined;

  if (!refUrl) {
    return NextResponse.json({ error: 'Reference image is required.' }, { status: 400 });
  }

  if (!swapUrls || swapUrls.length === 0) {
    return NextResponse.json({ error: 'At least one swap image is required.' }, { status: 400 });
  }

  if (swapUrls.length > 15) {
    return NextResponse.json({ error: 'Maximum 15 swap images allowed.' }, { status: 400 });
  }

  const totalCost = swapUrls.length * CREDIT_COST_PER_SWAP_UNCENSORED;

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
    reason: `Automation: face swap uncensored on ${swapUrls.length} image(s)`,
  });

  // Create one generation per swap image — all show as "processing"
  const costPerImage = Math.floor(totalCost / swapUrls.length);
  const remainder = totalCost - costPerImage * swapUrls.length;

  const genValues = swapUrls.map((_, i) => ({
    userId: user.id,
    batchId,
    model: 'automation-faceswap-uncensored' as const,
    prompt: `Face swap uncensored image ${i + 1}/${swapUrls.length} from reference`,
    aspectRatio: '1:1' as const,
    resolution: '1K' as const,
    referenceImages: [] as string[],
    status: 'processing' as const,
    creditCost: i === 0 ? costPerImage + remainder : costPerImage,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }));

  const insertedGens = await db.insert(generations).values(genValues).returning();

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://fanverse.lol'}/api/automations/callback`;

  fetch(N8N_FACESWAP_UNCENSORED_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ref: refUrl,
      swaps: swapUrls,
      batchId,
      generationId: insertedGens[0].id.toString(),
      callbackUrl,
    }),
  }).catch((err) => {
    console.error('Failed to call n8n faceswap uncensored webhook:', err);
  });

  return NextResponse.json({
    success: true,
    batchId,
    generationId: insertedGens[0].id,
    creditCost: totalCost,
    quantity: swapUrls.length,
  });
}
