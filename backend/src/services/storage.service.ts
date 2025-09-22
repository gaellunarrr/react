// src/services/storage.service.ts
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const required = (name: string, fallback?: string) => {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
};

const S3_ENDPOINT = required('S3_ENDPOINT');
const S3_REGION = required('S3_REGION', 'auto');
const S3_ACCESS_KEY_ID = required('S3_ACCESS_KEY_ID');
const S3_SECRET_ACCESS_KEY = required('S3_SECRET_ACCESS_KEY');
const S3_BUCKET = required('S3_BUCKET');
const FORCE_PATH_STYLE = (process.env.S3_FORCE_PATH_STYLE || 'true') === 'true';

export const s3 = new S3Client({
  region: S3_REGION,
  endpoint: S3_ENDPOINT,
  credentials: {
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: FORCE_PATH_STYLE,
});

export async function putObject(key: string, body: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

export async function headObject(key: string): Promise<{ exists: boolean; size?: number; contentType?: string; }> {
  try {
    const r = await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return { exists: true, size: r.ContentLength, contentType: r.ContentType };
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.Name === 'NotFound' || err?.Code === 'NotFound') {
      return { exists: false };
    }
    return { exists: false }; // algunos providers no devuelven 404 estándar en HEAD; tratamos como no existe
  }
}

export async function presignGet(key: string, expiresInSec: number): Promise<string> {
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }), { expiresIn: expiresInSec });
  return url;
}
