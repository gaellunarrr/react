import { Router } from 'express';
import { z } from 'zod';
import { isValidHexToken, TOKEN_HEX_LEN } from '../../shared/token';
import { createLink, verifyToken, markTokenUsed } from '../../services/links.service';

const router = Router();

const oid = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid ObjectId');
const ttl = z.number().int().min(1).max(720);

// Crear link
router.post('/', async (req, res, next) => {
  try {
    const body = z.object({
      plazaId: oid,
      ttlHours: ttl.optional()
    }).parse(req.body || {});

    const out = await createLink(body.plazaId, body.ttlHours);
    // out debe incluir al menos: { linkId, token, expiraAt, url? }
    return res.json(out);
  } catch (err) {
    return next(err);
  }
});

// Verify: respuesta UNIFORME { valid: boolean, reason? , header? }
router.post('/:token/verify', async (req, res, _next) => {
  try {
    const token = String(req.params.token || '');
    if (!isValidHexToken(token)) {
      return res.status(404).json({ valid: false, reason: 'invalid' });
    }
    const header = await verifyToken(token);
    return res.json({ valid: true, header });
  } catch (err: any) {
    // No dependemos de instanceof; sacamos un "code" defensivo
    const code: string | undefined = typeof err?.code === 'string' ? err.code : undefined;
    const reason = code || 'invalid';
    const status = reason === 'invalid' ? 404 : 400;
    return res.status(status).json({ valid: false, reason });
  }
});

// Marcar token como usado
router.post('/:token/use', async (req, res, next) => {
  try {
    const token = String(req.params.token || '');
    if (!isValidHexToken(token)) {
      return res.status(404).json({ code: 'invalid' });
    }
    const out = await markTokenUsed(token);
    return res.json(out); // { ok: true, usedAt }
  } catch (err: any) {
    const code: string | undefined = typeof err?.code === 'string' ? err.code : undefined;
    if (code === 'expired' || code === 'used') {
      return res.status(400).json({ code });
    }
    if (code === 'invalid') {
      return res.status(404).json({ code: 'invalid' });
    }
    return next(err);
  }
});

export default router;
