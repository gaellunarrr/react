// src/api/exams/exams.router.ts
import { Router, Request, Response, NextFunction } from 'express';
import { isValidHexToken, sha256Hex } from '../../shared/token';
import { createExamSchema } from '../../schemas/exam.schema';
import { ipLimiter, tokenLimiter } from '../../middleware/rateLimiters';
import { log } from '../../shared/logger';
import Link from '../../models/Link';
import Consent from '../../models/Consent';
import Exam from '../../models/Exam';
//import { ensureExamArtifacts } from '../../services/artifacts.service'; // <- Fase 6

const router = Router();

/**
 * POST /exams/:token
 * Opción C (mixta):
 * - Si ya existe Exam para link → 201 con mismo id (idempotente).
 * - Si no existe Exam:
 *    - valida expirado/used/consent
 *    - crea Exam
 *    - marca link.usado = true
 */
router.post('/:token', ipLimiter, tokenLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = String(req.params.token || '');
    if (!isValidHexToken(token)) {
      return res.status(404).json({ code: 'invalid_token' });
    }

    const parsed = createExamSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ code: 'invalid_payload', issues: parsed.error.issues });
    }
    const payload = parsed.data;

    // Resolver Link por hash (sin exponer token en claro)
    const tokenHash = sha256Hex(token);
    const link = await Link.findOne({ tokenHash }).lean();
    if (!link) {
      return res.status(404).json({ code: 'invalid_token' });
    }

    // 1) Idempotencia primero: si ya hay exam para este link → 201 mismo id
    const existing = await Exam.findOne({ linkId: link._id }).lean();
    if (existing) {
      return res.status(201).json({ id: String(existing._id), artifacts: [] });
    }

    // 2) Si NO hay exam, ahora sí valida estados del link
    const now = new Date();
    if (link.expiraAt && new Date(link.expiraAt) < now) {
      return res.status(400).json({ code: 'expired_token' });
    }
    if (link.usado) {
      // Si está "usado" pero no hay Exam (caso raro), bloquea
      return res.status(400).json({ code: 'used' });
    }

    // 3) Requiere consentimiento "uso_app" aceptado
    const consent = await Consent.findOne({ linkId: link._id, tipo: 'uso_app', aceptado: true }).lean();
    if (!consent) {
      return res.status(400).json({ code: 'missing_consent' });
    }

    // 4) Crear examen
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      || req.socket.remoteAddress || '';
    const userAgent = String(req.headers['user-agent'] || '');

    const doc = await Exam.create({
      linkId: link._id,
      plazaId: link.plazaId,
      ip,
      userAgent,
      modalidad: payload.modalidad,
      duracionMin: payload.duracionMin,
      temasGuia: payload.temasGuia ?? [],
      numeroCasos: payload.numeroCasos,
      casos: payload.casos.map(c => ({
        nombre: c.nombre,
        aspectos: c.aspectos.map(a => ({ nombre: a.nombre, ponderacion: a.ponderacion })),
      })),
    });

    // 5) Marcar link como usado (opción C)
    await Link.updateOne({ _id: link._id }, { $set: { usado: true, usadoAt: new Date() } });

    log.info('exam_created', { examId: String(doc._id), linkId: String(link._id) });
    return res.status(201).json({ id: String(doc._id), artifacts: [] });
  } catch (err) {
    next(err);
  }
});

/** GET /exams/:id → devuelve el examen */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id || '');
    const doc = await Exam.findById(id).lean();
    if (!doc) {
      return res.status(404).json({ code: 'not_found' });
    }

    const { _id, linkId, plazaId, modalidad, duracionMin, temasGuia, numeroCasos, casos, createdAt, updatedAt } = doc as any;
    return res.json({
      id: String(_id),
      linkId: String(linkId),
      plazaId: String(plazaId),
      modalidad,
      duracionMin,
      temasGuia,
      numeroCasos,
      casos,
      createdAt,
      updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

/** GET /exams/:id/artifacts → Fase 6 (genera si no existen y regresa URLs firmadas) */
router.get('/:id/artifacts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id || '');
    //const items = await ensureExamArtifacts(id);
    return res.json({  }); //=> aqui falta
  } catch (err: any) {
    if (err?.code === 'not_found') {
      return res.status(404).json({ code: 'not_found' });
    }
    next(err);
  }
});

export default router;
