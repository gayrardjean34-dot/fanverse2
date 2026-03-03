import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10MB per file
          tokenPayload: JSON.stringify({ userId: user.id }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Upload completed:', blob.url);
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
