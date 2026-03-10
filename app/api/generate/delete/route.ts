import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { del } from '@vercel/blob';
import { r2, R2_BUCKET, R2_PUBLIC_URL } from '@/lib/r2';

function isStorageUrl(url: string): boolean {
  return url.includes('r2.dev') || url.includes('r2.cloudflarestorage.com') ||
    url.includes('vercel-storage.com') || url.includes('public.blob.vercel');
}

function isR2Url(url: string): boolean {
  return url.includes('r2.dev') || url.includes('r2.cloudflarestorage.com');
}

function r2KeyFromUrl(url: string): string {
  return url.replace(`${R2_PUBLIC_URL}/`, '');
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No generation IDs provided.' }, { status: 400 });
    }

    // Fetch generations to collect storage URLs before deleting
    const gens = await db.select()
      .from(generations)
      .where(and(eq(generations.userId, user.id), inArray(generations.id, ids)));

    // Separate R2 URLs from legacy Vercel Blob URLs
    const r2Keys: string[] = [];
    const vercelBlobUrls: string[] = [];

    for (const gen of gens) {
      const urls: string[] = [];
      if (gen.resultUrl && isStorageUrl(gen.resultUrl)) urls.push(gen.resultUrl);
      for (const url of (gen.referenceImages as string[]) || []) {
        if (isStorageUrl(url)) urls.push(url);
      }
      for (const url of urls) {
        if (isR2Url(url)) r2Keys.push(r2KeyFromUrl(url));
        else vercelBlobUrls.push(url);
      }
    }

    // Delete from DB
    await db.delete(generations)
      .where(and(eq(generations.userId, user.id), inArray(generations.id, ids)));

    // Delete from R2 (fire and forget)
    if (r2Keys.length > 0) {
      r2.send(new DeleteObjectsCommand({
        Bucket: R2_BUCKET,
        Delete: { Objects: r2Keys.map((Key) => ({ Key })) },
      })).catch((err) => console.error('R2 delete error:', err));
    }

    // Delete legacy Vercel Blob objects (backward compat)
    if (vercelBlobUrls.length > 0) {
      del(vercelBlobUrls).catch((err) => console.error('Blob delete error:', err));
    }

    const totalDeleted = r2Keys.length + vercelBlobUrls.length;
    return NextResponse.json({ success: true, deleted: ids.length, blobsDeleted: totalDeleted });
  } catch (error: any) {
    console.error('Delete generations error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
