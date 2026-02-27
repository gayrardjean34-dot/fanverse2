import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Fetch failed');

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const isVideo = contentType.startsWith('video/') || url.includes('.mp4') || url.includes('.webm');
    const ext = isVideo ? 'mp4' : 'png';
    const filename = `fanverse-${Date.now()}.${ext}`;

    const blob = await res.arrayBuffer();

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.redirect(url);
  }
}
