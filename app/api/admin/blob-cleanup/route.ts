import { NextRequest, NextResponse } from 'next/server';
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { r2, R2_BUCKET } from '@/lib/r2';

// Admin-only endpoint to purge old objects from R2 storage.
// Reference images are only needed during n8n processing (~10 min).
// This deletes all objects older than maxAgeHours (default: 2h).
export async function POST(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { maxAgeHours = 2 } = await request.json().catch(() => ({}));
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  let totalDeleted = 0;
  let continuationToken: string | undefined;

  try {
    do {
      const result = await r2.send(new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }));

      const toDelete = (result.Contents || [])
        .filter((obj) => obj.LastModified && obj.LastModified < cutoff && obj.Key)
        .map((obj) => ({ Key: obj.Key! }));

      if (toDelete.length > 0) {
        await r2.send(new DeleteObjectsCommand({
          Bucket: R2_BUCKET,
          Delete: { Objects: toDelete },
        }));
        totalDeleted += toDelete.length;
      }

      continuationToken = result.NextContinuationToken;
    } while (continuationToken);

    return NextResponse.json({ success: true, deleted: totalDeleted, cutoff });
  } catch (error: any) {
    console.error('R2 cleanup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
