import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { r2, R2_BUCKET, r2PublicUrl } from '@/lib/r2';

// GET /api/upload/video?filename=xxx.mp4
// Returns { uploadUrl, publicUrl } — client uploads directly to R2 via presigned PUT
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const filename = request.nextUrl.searchParams.get('filename') || 'video.mp4';
  const key = `videos/${user.id}/${Date.now()}-${filename}`;

  try {
    const uploadUrl = await getSignedUrl(
      r2,
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ContentType: 'video/mp4',
      }),
      { expiresIn: 300 }, // 5 minutes
    );

    return NextResponse.json({ uploadUrl, publicUrl: r2PublicUrl(key) });
  } catch (error: any) {
    console.error('Video presign error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate upload URL' }, { status: 500 });
  }
}
