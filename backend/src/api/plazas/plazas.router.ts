// src/api/plazas/plazas.router.ts
import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import Plaza from '../../models/Plaza';

const router = Router();
const isOid = (v?: string) => !!v && Types.ObjectId.isValid(v);
const toOid = (v: string) => new Types.ObjectId(v);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { convocatoriaId, concursoId } = req.query as {
      convocatoriaId?: string;
      concursoId?: string;
    };

    // Filtros tolerantes a diferentes nombres de campos y tipos (string/ObjectId)
    const convOr: any[] = [];
    if (convocatoriaId) {
      convOr.push(
        { convocatoriaId },
        { convId: convocatoriaId },
        { convocatoria_id: convocatoriaId },
        { convocatoria: convocatoriaId },
        { 'convocatoria._id': convocatoriaId }
      );
      if (isOid(convocatoriaId)) {
        const v = toOid(convocatoriaId);
        convOr.push(
          { convocatoriaId: v },
          { convId: v },
          { convocatoria_id: v },
          { 'convocatoria._id': v }
        );
      }
    }

    const concOr: any[] = [];
    if (concursoId) {
      concOr.push(
        { concursoId },
        { concId: concursoId },
        { concurso_id: concursoId },
        { concurso: concursoId },
        { 'concurso._id': concursoId }
      );
      if (isOid(concursoId)) {
        const v = toOid(concursoId);
        concOr.push(
          { concursoId: v },
          { concId: v },
          { concurso_id: v },
          { 'concurso._id': v }
        );
      }
    }

    const filter =
      convOr.length || concOr.length
        ? {
            ...(convOr.length ? { $or: convOr } : {}),
            ...(concOr.length ? { $or: concOr } : {}),
          }
        : {};

    // Driver nativo para evitar CastError con strings legacy
    const rows = await Plaza.collection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    res.set('Cache-Control', 'no-store');

    // Normaliza a lo que espera el front
    const out = rows.map((r: any) => ({
      _id: String(r._id),
      convocatoriaId: String(
        r.convocatoriaId ??
          r.convId ??
          r.convocatoria_id ??
          r.convocatoria ??
          ''
      ),
      concursoId: String(
        r.concursoId ?? r.concId ?? r.concurso_id ?? r.concurso ?? ''
      ),
      codigoPlaza: r.codigoPlaza ?? r.codigo ?? r.plaza ?? r.code ?? '',
      puesto: r.puesto ?? r.puestoNombre ?? r.nombrePuesto ?? r.cargo ?? '',
      unidadAdministrativa:
        r.unidadAdministrativa ?? r.unidad ?? r.ua ?? r.area ?? '',
      folio: r.folio,
      fechaAplicacion: r.fechaAplicacion,
      horaAplicacion: r.horaAplicacion,
      especialistaId: String(
        r.especialistaId ?? r.jefeId ?? r.usuarioId ?? r.userId ?? ''
      ),
    }));

    // Fallbacks visibles para evitar celdas vacías
    out.forEach((p) => {
      if (!p.codigoPlaza) p.codigoPlaza = `PLZ-${p._id.slice(-6)}`;
      if (!p.puesto) p.puesto = 'Sin nombre';
      if (!p.unidadAdministrativa) p.unidadAdministrativa = '—';
    });

    return res.json(out);
  } catch (err) {
    next(err);
  }
});

export default router;
