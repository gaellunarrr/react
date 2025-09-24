// src/api/catalog/catalog.router.ts
import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import Convocatoria from '../../models/Convocatoria';
import Concurso from '../../models/Concurso';
import Especialista from '../../models/Especialista';

const router = Router();

const isOid = (v?: string) => !!v && Types.ObjectId.isValid(v);
const toOid = (v: string) => new Types.ObjectId(v);

/* ---------- Convocatorias ---------- */
router.get('/convocatorias', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await Convocatoria
      .find({}, { codigo: 1, nombre: 1, activa: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .lean();

    // Evita cacheo en dev (y que el front vea 304)
    res.set('Cache-Control', 'no-store');

    // Normaliza: { _id, codigo, activa }
    const items = rows.map((r: any) => ({
      _id: String(r._id),
      codigo: (r.codigo ?? r.code ?? r.clave ?? r.nombre ?? r.descripcion ?? '').toString(),
      activa:
        typeof r.activa === 'boolean'
          ? r.activa
          : r.estado
          ? r.estado === 'activa'
          : true,
    }));

    return res.json(items);
  } catch (err) {
    next(err);
  }
});

/* ---------- Concursos ---------- */
router.get('/concursos', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { convocatoriaId } = req.query as { convocatoriaId?: string };

    // Construye filtro tolerante a diferentes nombres de campo y tipos (ObjectId / string)
    const buildOrByConv = (id: string, asOid: boolean) => {
      const v = asOid ? toOid(id) : id;
      return [
        { convocatoriaId: v },
        { convId: v },
        { convocatoria_id: v },
        { convocatoria: v },
        { 'convocatoria._id': v },
        { convocatoriaCode: v },
      ];
    };

    let filter: any = {};
    if (convocatoriaId) {
      filter = {
        $or: [
          ...buildOrByConv(convocatoriaId, false),
          ...(isOid(convocatoriaId) ? buildOrByConv(convocatoriaId, true) : []),
        ],
      };
    }

    // Usamos el driver nativo para evitar CastError si llegan strings
    const rows = await Concurso.collection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.set('Cache-Control', 'no-store');

    // Normaliza: { _id, convocatoriaId, nombre, activo }
    const out = rows.map((r: any) => ({
      _id: String(r._id),
      convocatoriaId: String(
        r.convocatoriaId ??
        r.convId ??
        r.convocatoria_id ??
        r.convocatoria ??
        r.convocatoriaCode ??
        ''
      ),
      nombre:
        r.nombre ??
        r.name ??
        r.titulo ??
        r.descripcion ??
        r.code ??
        r.codigo ??
        '',
      activo: !!(r.activo ?? (r.estado ? r.estado === 'activo' : true)),
    }));

    // Fallback para evitar opciones sin texto
    out.forEach(c => {
      if (!c.nombre || !String(c.nombre).trim()) {
        c.nombre =` Concurso ${c._id.slice(-6)}`;
      }
    });

    return res.json(out);
  } catch (err) {
    next(err);
  }
});

/* ---------- Especialistas ---------- */
router.get('/especialistas', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await Especialista
      .find({}, { nombreCompleto: 1, nombre: 1, email: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .lean();

    res.set('Cache-Control', 'no-store');

    // Normaliza: { _id, nombreCompleto, email? }
    const items = rows.map((r: any) => ({
      _id: String(r._id),
      nombreCompleto: (r.nombreCompleto ?? r.nombre ?? '').toString(),
      email: r.email || undefined,
    }));

    return res.json(items);
  } catch (err) {
    next(err);
  }
});

export default router;