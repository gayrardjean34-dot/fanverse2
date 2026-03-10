import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';
import { r2, R2_BUCKET, isR2Url, r2KeyFromUrl } from '@/lib/r2';

async function handleDownload(url: string) {
  const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.mov');
  const ext = isVideo ? 'mp4' : 'png';
  const filename = `fanverse-${Date.now()}.${ext}`;

  if (isR2Url(url)) {
    // Presigned URL avec Content-Disposition attachment — zéro transit par Vercel
    const key = r2KeyFromUrl(url);
    const signedUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${filename}"`,
      }),
      { expiresIn: 300 },
    );
    return NextResponse.redirect(signedUrl);
  }

  // URLs legacy (kie.ai, ancien Vercel Blob) — redirect direct, pas de proxy
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const url = request.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  return handleDownload(url);
}

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { url } = await request.json();
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  return handleDownload(url);
}
