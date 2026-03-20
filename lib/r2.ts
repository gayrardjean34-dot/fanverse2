import { S3Client } from '@aws-sdk/client-s3';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  // Disable automatic checksums — required for browser presigned PUT uploads
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
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
