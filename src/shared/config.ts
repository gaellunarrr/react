import 'dotenv/config';

const numOr = (v: any, def: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGO_URI as string,
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:5173',
  linkTtlHours: numOr(process.env.LINK_TTL_HOURS, 72)
};

if (!config.mongoUri) {
  throw new Error('MONGO_URI is required');
}
if (!/^\w+:\/\//.test(config.publicBaseUrl)) {
  throw new Error('PUBLIC_BASE_URL must be an absolute URL, e.g. http://localhost:5173');
}
if (!Number.isFinite(config.linkTtlHours) || config.linkTtlHours <= 0) {
  throw new Error('LINK_TTL_HOURS must be a positive number');
}
