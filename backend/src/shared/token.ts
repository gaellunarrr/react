import crypto from 'crypto';

export const MIN_TOKEN_BYTES = 24;           // 24 bytes => 48 hex
export const TOKEN_HEX_LEN = MIN_TOKEN_BYTES * 2;

export function generateTokenHex(bytes = MIN_TOKEN_BYTES): string {
  return crypto.randomBytes(bytes).toString('hex'); // hex sólo
}

export function sha256Hex(hexToken: string): string {
  // hex puro, por seguridad no normalizamos otro formato
  return crypto.createHash('sha256').update(hexToken, 'utf8').digest('hex');
}

export function isValidHexToken(s: string): boolean {
  // Acepta mayúsculas/minúsculas
  return typeof s === 'string' && /^[0-9a-f]+$/i.test(s) && s.length === TOKEN_HEX_LEN;
}
