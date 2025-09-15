import { Router } from 'express';
import { z } from 'zod';
import Convocatoria from '../../models/Convocatoria';
import Concurso from '../../models/Concurso';
import Especialista from '../../models/Especialista';

const router = Router();

/* ---------- Convocatorias ---------- */
router.get('/convocatorias', async (_req, res) => {
  const items = await Convocatoria.find().sort({ createdAt: -1 });
  res.json(items);
});

router.post('/convocatorias', async (req, res, next) => {
  try {
    const body = z.object({
      codigo: z.string().min(3).trim(),
      activa: z.boolean().optional()
    }).parse(req.body);

    const created = await Convocatoria.create(body);
    return res.status(201).json(created);
  } catch (err: any) {
    // Duplicado (índice único en `codigo`)
    if (err?.name === 'MongoServerError' && err?.code === 11000) {
      return res.status(409).json({ code: 'duplicate', field: 'codigo' });
    }
    // Zod
    if (err?.issues) {
      return res.status(400).json({ code: 'validation_error', errors: err.flatten?.() });
    }
    return next(err);
  }
});


/* ---------- Concursos ---------- */
router.get('/concursos', async (req, res) => {
  const { convocatoriaId } = req.query as { convocatoriaId?: string };
  const q = convocatoriaId ? { convocatoriaId } : {};
  const items = await Concurso.find(q).sort({ createdAt: -1 });
  res.json(items);
});

router.post('/concursos', async (req, res, next) => {
  try {
    const body = z.object({
      convocatoriaId: z.string().min(1),
      nombre: z.string().min(2).trim(),
      activo: z.boolean().optional()
    }).parse(req.body);

    const created = await Concurso.create(body);
    return res.status(201).json(created);
  } catch (err: any) {
    if (err?.issues) {
      return res.status(400).json({ code: 'validation_error', errors: err.flatten?.() });
    }
    return next(err);
  }
});


/* ---------- Especialistas ---------- */
router.get('/especialistas', async (_req, res) => {
  const items = await Especialista.find().sort({ createdAt: -1 });
  res.json(items);
});

router.post('/especialistas', async (req, res, next) => {
  try {
    const body = z.object({
      nombreCompleto: z.string().min(3).trim(),
      email: z.string().email().optional(),
      curp: z.string().optional()
    }).parse(req.body);

    const created = await Especialista.create(body);
    return res.status(201).json(created);
  } catch (err: any) {
    if (err?.issues) {
      return res.status(400).json({ code: 'validation_error', errors: err.flatten?.() });
    }
    return next(err);
  }
});


export default router;
