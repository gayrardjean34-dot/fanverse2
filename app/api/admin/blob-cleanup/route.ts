import { NextRequest, NextResponse } from 'next/server';
import { list, del } from '@vercel/blob';

// Admin-only endpoint to purge old blobs from Vercel Blob storage.
// Reference images are only needed during n8n processing (~10 min).
// This deletes all blobs older than maxAgeHours (default: 2h).
// Call once to clean up existing storage, then rely on the delete route for ongoing cleanup.
export async function POST(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { maxAgeHours = 2 } = await request.json().catch(() => ({}));
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  let totalDeleted = 0;
  let cursor: string | undefined;

  try {
    do {
      const result = await list({ cursor, limit: 1000 });

      const toDelete = result.blobs
        .filter((b) => new Date(b.uploadedAt) < cutoff)
        .map((b) => b.url);

      if (toDelete.length > 0) {
        await del(toDelete);
        totalDeleted += toDelete.length;
      }

      cursor = result.cursor;
    } while (cursor);

    return NextResponse.json({ success: true, deleted: totalDeleted, cutoff });
  } catch (error: any) {
    console.error('Blob cleanup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
