import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextRequest, NextResponse } from 'next/server';
import { r2, R2_BUCKET, r2PublicUrl } from '@/lib/r2';

// GET /api/automations/presign?batchId=xxx&ext=jpg
// Called by n8n BEFORE sending a result image.
// n8n should:
//   1. GET this endpoint to receive { uploadUrl, publicUrl }
//   2. PUT the image binary directly to uploadUrl (goes to R2, bypasses Vercel entirely)
//   3. POST /api/automations/callback with { batchId, imageUrl: publicUrl } — no binary data
export async function GET(request: NextRequest) {
  const batchId = request.nextUrl.searchParams.get('batchId') || 'unknown';
  const ext = request.nextUrl.searchParams.get('ext') || 'jpg';
  const contentType =
    ext === 'png' ? 'image/png'
    : ext === 'webp' ? 'image/webp'
    : 'image/jpeg';

  const key = `generated/${batchId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const uploadUrl = await getSignedUrl(
      r2,
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 300 },
    );

    return NextResponse.json({ uploadUrl, publicUrl: r2PublicUrl(key) });
  } catch (error: any) {
    console.error('Automation presign error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate upload URL' }, { status: 500 });
  }
}
