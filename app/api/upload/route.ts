import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { r2, R2_BUCKET, r2PublicUrl } from '@/lib/r2';

// GET /api/upload?filename=xxx&contentType=image/jpeg
// Returns { uploadUrl, publicUrl } — client uploads directly to R2 via presigned PUT (zero Vercel bandwidth)
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const filename = request.nextUrl.searchParams.get('filename') || 'image.jpg';
    const contentType = request.nextUrl.searchParams.get('contentType') || 'image/jpeg';
    const key = `automations/${user.id}/${Date.now()}-${filename}`;

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
    console.error('Upload presign error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
