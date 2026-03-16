import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2, R2_BUCKET, r2PublicUrl } from '@/lib/r2';

const CLEANIFY_API = 'https://aicleanify.com/api/v1';

// Step 1: Submit image for processing, then poll until done, upload to R2, return URL
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const apiKey = process.env.AICLEANIFY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Cleanify API not configured.' }, { status: 500 });
    }

    const { imageUrl } = await request.json();
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required.' }, { status: 400 });
    }

    // Fetch the image
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch image.' }, { status: 400 });
    }
    const imageBlob = await imageRes.blob();

    // Submit to aicleanify
    const formData = new FormData();
    formData.append('images[]', imageBlob, 'image.png');
    formData.append('camera_preset', 'iphone_14_pro');

    const submitRes = await fetch(`${CLEANIFY_API}/images/process`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey },
      body: formData,
    });

    const submitData = await submitRes.json();
    console.log('[CLEANIFY] Submit response:', JSON.stringify(submitData));

    if (!submitData.success || !submitData.data?.images?.[0]?.uuid) {
      return NextResponse.json({ error: submitData.message || 'Failed to submit image.' }, { status: 500 });
    }

    const uuid = submitData.data.images[0].uuid;

    // Poll for completion (max 60s)
    let attempts = 0;
    const maxAttempts = 30;
    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;

      const statusRes = await fetch(`${CLEANIFY_API}/images/${uuid}/status`, {
        headers: { 'X-API-Key': apiKey },
      });
      const statusData = await statusRes.json();
      console.log('[CLEANIFY] Poll attempt', attempts, ':', statusData.data?.status, statusData.data?.progress_percentage + '%');

      if (statusData.data?.status === 'completed') {
        // Download the processed image
        const downloadRes = await fetch(`${CLEANIFY_API}/images/${uuid}/download`, {
          headers: { 'X-API-Key': apiKey },
        });

        if (!downloadRes.ok) {
          return NextResponse.json({ error: 'Failed to download processed image.' }, { status: 500 });
        }

        const buffer = Buffer.from(await downloadRes.arrayBuffer());
        const contentType = downloadRes.headers.get('content-type') || 'image/jpeg';
        const ext = contentType.split('/')[1]?.split('+')[0] || 'jpg';

        // Upload directly to R2 — browser downloads from Cloudflare, zero Vercel bandwidth
        const key = `cleaned/${user.id}/${Date.now()}.${ext}`;
        await r2.send(new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        }));

        const cleanUrl = r2PublicUrl(key);
        return NextResponse.json({ url: cleanUrl });
      }

      if (statusData.data?.status === 'failed') {
        return NextResponse.json({
          error: statusData.data?.error_message || 'Processing failed.',
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Processing timed out. Please try again.' }, { status: 504 });
  } catch (error: any) {
    console.error('[CLEANIFY] Error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
