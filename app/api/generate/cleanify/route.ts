import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';

const CLEANIFY_API = 'https://aicleanify.com/api/v1';

// Step 1: Submit image for processing, then poll until done, then return download
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

        const processedBlob = await downloadRes.arrayBuffer();
        const contentType = downloadRes.headers.get('content-type') || 'image/jpeg';

        return new NextResponse(processedBlob, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="fanverse-clean-${Date.now()}.jpg"`,
          },
        });
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
