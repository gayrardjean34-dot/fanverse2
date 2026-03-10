import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME!;
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export function r2PublicUrl(key: string): string {
  return `${R2_PUBLIC_URL}/${key}`;
}

export function isR2Url(url: string): boolean {
  return url.includes('r2.dev') || url.includes('r2.cloudflarestorage.com');
}

export function r2KeyFromUrl(url: string): string {
  return url.replace(`${R2_PUBLIC_URL}/`, '');
}

// Fetch an external URL and upload it to R2, returns the public R2 URL
export async function uploadToR2FromUrl(externalUrl: string, key: string): Promise<string> {
  const res = await fetch(externalUrl);
  if (!res.ok) throw new Error(`Failed to fetch ${externalUrl}: ${res.status}`);
  const contentType = res.headers.get('content-type') || 'image/jpeg';
  const body = Buffer.from(await res.arrayBuffer());
  await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType }));
  return r2PublicUrl(key);
}

// Decode a base64 data URL and upload it to R2, returns the public R2 URL
export async function uploadToR2FromBase64(dataUrl: string, key: string): Promise<string> {
  const [header, base64] = dataUrl.split(',');
  const contentType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const body = Buffer.from(base64, 'base64');
  await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body, ContentType: contentType }));
  return r2PublicUrl(key);
}
