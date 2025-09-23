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

    // Usamos aggregate para hacer lookup con especialistas
    const pipeline: any[] = [
      { $match: filter },
      
      // Lookup para traer la información del especialista
      {
        $lookup: {
          from: "especialistas",
          let: { especialista_id: "$especialista_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$especialista_id"] }
              }
            }
          ],
          as: "especialista_info"
        }
      },
      {
        $unwind: {
          path: "$especialista_info",
          preserveNullAndEmptyArrays: true
        }
      },
      
      { $sort: { createdAt: -1 } }
    ];

    const rows = await Plaza.collection.aggregate(pipeline).toArray();

    res.set('Cache-Control', 'no-store');

    // Normaliza a lo que espera el front con los nombres reales de tu DB
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
      // Usa los nombres reales de campos de tu DB
      codigoPlaza: r.codigo ?? r.codigoPlaza ?? r.plaza ?? r.code ?? '',
      //PUESTO DE LA PLAZA (VACANTE)
      puesto: r.puesto ?? r.puestoNombre ?? r.nombrePuesto ?? r.denominacionPuesto ?? r.puestoPlaza ?? r.cargo ?? '',
      // Unidad administrativa directamente de la tabla plazas
      unidadAdministrativa: r.unidad_adm ?? r.unidadAdministrativa ?? r.unidad ?? r.ua ?? r.area ?? '',
      folio: r.folio,
      fechaAplicacion: r.fechaAplicacion,
      horaAplicacion: r.horaAplicacion,
      especialistaId: String(
        r.especialista_id ?? r.especialistaId ?? r.jefeId ?? r.usuarioId ?? r.userId ?? ''
      ),
      // Información del especialista poblada desde el lookup
      jefePlaza: r.especialista_info ? {
        nombre: r.especialista_info.nombre || '—',
        correo: r.especialista_info.correo || '—',

        cargo: r.especialista_info.puesto || '—'
      } : {
        nombre: '—',
        correo: '—',
        cargo: '—'
      }
    }));

    // Fallbacks visibles para evitar celdas vacías
    out.forEach((p: any) => {
      if (!p.codigoPlaza) p.codigoPlaza = `PLZ-${p._id.slice(-6)}`;
      if (!p.puesto) p.puesto = 'Sin nombre';
      if (!p.unidadAdministrativa) p.unidadAdministrativa = '—';
      // El jefe de plaza ya se maneja en el mapeo anterior con el lookup
    });

    return res.json(out);
  } catch (err) {
    next(err);
  }
});

export default router;