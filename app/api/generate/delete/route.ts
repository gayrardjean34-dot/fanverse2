import { NextRequest, NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { generations } from '@/lib/db/schema';
import { getUser } from '@/lib/db/queries';
import { del } from '@vercel/blob';

function isBlobUrl(url: string): boolean {
  return url.includes('vercel-storage.com') || url.includes('public.blob.vercel');
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

    // Fetch generations to collect blob URLs before deleting
    const gens = await db.select()
      .from(generations)
      .where(and(eq(generations.userId, user.id), inArray(generations.id, ids)));

    // Collect all blob URLs to delete
    const blobUrls: string[] = [];
    for (const gen of gens) {
      if (gen.resultUrl && isBlobUrl(gen.resultUrl)) blobUrls.push(gen.resultUrl);
      const refs = (gen.referenceImages as string[]) || [];
      for (const url of refs) {
        if (isBlobUrl(url)) blobUrls.push(url);
      }
    }

    // Delete from DB
    await db.delete(generations)
      .where(and(eq(generations.userId, user.id), inArray(generations.id, ids)));

    // Delete blobs (fire and forget, don't fail the request if blob delete fails)
    if (blobUrls.length > 0) {
      del(blobUrls).catch((err) => console.error('Blob delete error:', err));
    }

    return NextResponse.json({ success: true, deleted: ids.length, blobsDeleted: blobUrls.length });
  } catch (error: any) {
    console.error('Delete generations error:', error);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
