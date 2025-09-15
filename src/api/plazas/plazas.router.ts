import { Router } from 'express';
import { z } from 'zod';
import Plaza from '../../models/Plaza';

const router = Router();

const oid = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid ObjectId');

router.get('/', async (req, res) => {
  const { convocatoriaId, concursoId } = req.query as { convocatoriaId?: string; concursoId?: string };
  const q: any = {};
  if (convocatoriaId) q.convocatoriaId = convocatoriaId;
  if (concursoId) q.concursoId = concursoId;

  const items = await Plaza.find(q).sort({ createdAt: -1 });
  res.json(items);
});

// ⬇⬇⬇ REEMPLAZA TU POST POR ESTE ⬇⬇⬇
router.post('/', async (req, res, next) => {
  try {
    const body = z.object({
      convocatoriaId: oid,
      concursoId: oid,
      puesto: z.string().min(2),
      codigoPlaza: z.string().min(1),
      unidadAdministrativa: z.string().min(2),
      folio: z.string().min(3),
      fechaAplicacion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
      horaAplicacion: z.string().regex(/^\d{2}:\d{2}$/),       // HH:mm
      especialistaId: oid
    }).parse(req.body);

    const created = await Plaza.create(body);
    return res.status(201).json(created);
  } catch (err: any) {
    // Índice único (folio), u otra clave única si la config cambió
    if (err?.name === 'MongoServerError' && err?.code === 11000) {
      const field = Object.keys(err?.keyPattern || {})[0] || 'folio';
      return res.status(409).json({ code: 'duplicate', field });
    }
    // Errores de validación (Zod)
    if (err?.issues) {
      return res.status(400).json({ code: 'validation_error', errors: err.flatten?.() });
    }
    return next(err);
  }
});

export default router;
