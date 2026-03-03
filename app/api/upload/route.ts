import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    if (files.length > 16) {
      return NextResponse.json({ error: 'Maximum 16 files allowed' }, { status: 400 });
    }

    const urls: string[] = [];

    for (const file of files) {
      const blob = await put(file.name, file, {
        access: 'public',
        contentType: file.type,
      });
      urls.push(blob.url);
    }

    return NextResponse.json({ urls });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
