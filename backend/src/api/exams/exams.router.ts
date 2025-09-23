// src/api/exams/exams.router.ts
import { Router } from 'express';
import Exam from '../../models/Exam';
import Link from '../../models/Link';
import { generateFAPdf, generateFEPdf, generateResponsesPdf } from '../../services/pdfs';
import { isValidHexToken } from '../../shared/token';

const router = Router();

type ArtifactsResponse = {
  faPdfUrl?: string;
  fePdfUrl?: string;
  receiptPdfUrl?: string;
};

function normalizeArtifacts(raw: any): ArtifactsResponse {
  if (!raw) return {};
  const faPdfUrl = raw.faPdfUrl || raw.faPdf || undefined;
  const fePdfUrl = raw.fePdfUrl || raw.fePdf || undefined;
  const receiptPdfUrl = raw.receiptPdfUrl || raw.responsesPdf || undefined;
  return {
    ...(faPdfUrl ? { faPdfUrl } : {}),
    ...(fePdfUrl ? { fePdfUrl } : {}),
    ...(receiptPdfUrl ? { receiptPdfUrl } : {}),
  };
}

function toIso(value: any): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

router.get('/', async (req, res) => {
  try {
    const { convocatoriaId, concursoId, plazaId } = req.query as {
      convocatoriaId?: string;
      concursoId?: string;
      plazaId?: string;
    };

    const filter: Record<string, any> = {};
    if (convocatoriaId) filter.convocatoriaId = convocatoriaId;
    if (concursoId) filter.concursoId = concursoId;
    if (plazaId) filter.plazaId = plazaId;

    const exams = await Exam.find(filter).sort({ createdAt: -1 }).lean();

    const payload = exams.map((exam: any) => ({
      _id: String(exam._id),
      linkToken: exam.linkToken,
      convocatoriaId: String(exam.convocatoriaId),
      concursoId: String(exam.concursoId),
      plazaId: String(exam.plazaId),
      especialistaId: String(exam.especialistaId),
      nombreDeclarante: exam.nombreDeclarante ?? '',
      createdAt: toIso(exam.createdAt),
      header: exam.header ?? null,
      artifacts: normalizeArtifacts(exam.artifacts),
    }));

    res.setHeader('Cache-Control', 'no-store');
    return res.json(payload);
  } catch (err) {
    console.error('GET /api/exams', err);
    return res.status(500).json({ error: 'server-error' });
  }
});

router.get('/by-id/:id', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).lean();
    if (!exam) return res.status(404).json({ error: 'not_found' });

    return res.json({
      _id: String(exam._id),
      linkToken: exam.linkToken,
      convocatoriaId: String(exam.convocatoriaId),
      concursoId: String(exam.concursoId),
      plazaId: String(exam.plazaId),
      especialistaId: String(exam.especialistaId),
      nombreDeclarante: exam.nombreDeclarante ?? '',
      createdAt: toIso(exam.createdAt),
      header: exam.header ?? null,
      answers: exam.answers ?? {},
      artifacts: normalizeArtifacts(exam.artifacts),
    });
  } catch (err) {
    console.error('GET /api/exams/by-id/:id', err);
    return res.status(500).json({ error: 'server-error' });
  }
});

router.get('/by-id/:id/artifacts', async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id).lean();
    if (!exam) return res.status(404).json({ error: 'not_found' });
    return res.json(normalizeArtifacts(exam.artifacts));
  } catch (err) {
    console.error('GET /api/exams/by-id/:id/artifacts', err);
    return res.status(500).json({ error: 'server-error' });
  }
});

router.post('/:token', async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!isValidHexToken(token)) {
      return res.status(400).json({ error: 'invalid_token' });
    }

    const link = await Link.findOne({ token });
    if (!link) return res.status(400).json({ error: 'invalid' });

    const now = new Date();
    const expiresAt = link.expiresAt instanceof Date ? link.expiresAt : new Date(link.expiresAt);
    if (expiresAt && expiresAt.getTime() <= now.getTime()) {
      return res.status(400).json({ error: 'expired' });
    }

    const status = String(link.status || 'ISSUED').toUpperCase();
    if (status === 'USED') return res.status(400).json({ error: 'used' });
    if (status === 'REVOKED') return res.status(400).json({ error: 'revoked' });
    if (status === 'EXPIRED') return res.status(400).json({ error: 'expired' });

    const { answers = {}, header, nombreDeclarante } = req.body || {};
    const cleanNombre = typeof nombreDeclarante === 'string' ? nombreDeclarante.trim() : undefined;

    const effectiveHeader = header && Object.keys(header || {}).length ? header : link.header;

    const responsesPdf = await generateResponsesPdf({ header: effectiveHeader, answers });
    const faPdf = await generateFAPdf({ header: effectiveHeader, answers });
    const fePdf = await generateFEPdf({ header: effectiveHeader, answers });

    const exam = await Exam.create({
      linkToken: link.token,
      convocatoriaId: link.convocatoriaId,
      concursoId: link.concursoId,
      plazaId: link.plazaId,
      especialistaId: link.especialistaId,
      header: effectiveHeader,
      answers,
      nombreDeclarante: cleanNombre,
      artifacts: {
        responsesPdf,
        faPdf,
        fePdf,
        receiptPdfUrl: responsesPdf,
        faPdfUrl: faPdf,
        fePdfUrl: fePdf,
      },
    });

    link.status = 'USED';
    link.submissionsCount = (link.submissionsCount || 0) + 1;
    link.usedAt = new Date();
    await link.save();

    return res.json({ examId: String(exam._id), status: 'submitted' });
  } catch (err) {
    console.error('POST /api/exams/:token', err);
    return res.status(500).json({ error: 'server-error' });
  }
});

export default router;
