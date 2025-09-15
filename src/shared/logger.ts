// src/shared/logger.ts (opcional, mejora de formato)
export const log = {
  info: (event: string, kv: Record<string, any> = {}) =>
    console.log(`event=${event}`, ...Object.entries(kv).map(([k,v]) => `${k}=${JSON.stringify(v)}`)),
  warn: (event: string, kv: Record<string, any> = {}) =>
    console.warn(`event=${event}`, ...Object.entries(kv).map(([k,v]) => `${k}=${JSON.stringify(v)}`)),
  error: (event: string, kv: Record<string, any> = {}) =>
    console.error(`event=${event}`, ...Object.entries(kv).map(([k,v]) => `${k}=${JSON.stringify(v)}`)),
};
