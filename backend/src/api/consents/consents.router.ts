// src/api/consents/consents.router.ts
import { Router } from 'express';
import { consentBodySchema } from '../../schemas/consent.schema';
import { isValidHexToken, sha256Hex } from '../../shared/token';
import Link from '../../models/Link';
import Consent from '../../models/Consent';
import { ipLimiter, tokenLimiter } from '../../middleware/rateLimiters';
import { log } from '../../shared/logger';

const router = Router();

/**
 * POST /consents/:token
 * - Valida token de 48 hex
 * - Valida cuerpo con Zod
 * - Rechaza si aceptado=false (400)
 * - Busca Link por tokenHash (sin exponer tokenHash)
 * - Rechaza 404 invalid_token / 400 expired_token / 400 used (si aplica)
 * - Idempotente por (linkId, tipo): si ya existe => 201 con id
 * - Crea consent y responde 201
 */
router.post('/:token', ipLimiter, tokenLimiter, async (req, res, next) => {
  try {
    const token = String(req.params.token || '');
    if (!isValidHexToken(token)) {
      return res.status(404).json({ code: 'invalid_token' });
    }

    const parsed = consentBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ code: 'validation_error', errors: parsed.error.flatten() });
    }

    const { tipo, nombreDeclarante, aceptado } = parsed.data;

    if (aceptado === false) {
      // Regla explícita: si no acepta, respondemos 400 (mensaje corto y claro)
      return res.status(400).json({ code: 'consent_not_accepted', message: 'Debe aceptar el aviso de privacidad' });
    }

    // No exponemos tokenHash; solo lo usamos para resolver el Link
    const tokenHash = sha256Hex(token);
    const link = await Link.findOne({ tokenHash }).lean();
    if (!link) {
      return res.status(404).json({ code: 'invalid_token' });
    }

    // Verificamos estado del link (expirado o usado) => 400
    const now = new Date();
    if (link.usado) {
      return res.status(400).json({ code: 'used' });
    }
    if (link.expiraAt && new Date(link.expiraAt) < now) {
      return res.status(400).json({ code: 'expired_token' });
    }

    // Idempotencia: un consent por (linkId, tipo)
    const existing = await Consent.findOne({ linkId: link._id, tipo }).lean();
    if (existing) {
      // Responder 201 favorece idempotencia “safe to retry”
      return res.status(201).json({ id: String(existing._id) });
    }

    const doc = await Consent.create({
      linkId: link._id,
      tipo,
      nombreDeclarante,
      aceptado: true,
      ip: req.ip,
      userAgent: String(req.headers['user-agent'] || ''),
    });

    // Log mínimo, sin PII sensible (no token ni nombre)
    log.info('consent_created', { linkId: String(link._id), tipo });

    return res.status(201).json({ id: String(doc._id) });
  } catch (err) {
    next(err);
  }
});

export default router;


//404 invalid_token cuando el token no cumple formato o no existe en BD
//400 expired_token/used cuando el link ya no es válido para operar.
//Idempotencia: si el consentimiento ya existe, devolvemos 201 con el id (evita doble posteo).
//Logs mínimos: linkId y tipo únicamente (cumple "no exponer token/tokenHash y limitar PII").