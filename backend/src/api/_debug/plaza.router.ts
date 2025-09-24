// src/api/_debug/plaza.router.ts
import { Router, Request, Response, NextFunction } from "express";
import Plaza from "../../models/Plaza";
import { Types } from "mongoose";

const router = Router();
const isOid = (v?: string) => !!v && Types.ObjectId.isValid(v);
const toOid = (v: string) => new Types.ObjectId(v);

/** GET /api/_debug/plaza/:code  -> trae una plaza por código (prueba todos los alias) */
router.get("/plaza/:code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = String(req.params.code || "").trim();
    const alts = [code, code.toUpperCase(), code.toLowerCase(), code.replace(/-/g, ""), code.replace(/-/g, "").toUpperCase(), code.replace(/-/g, "").toLowerCase()];
    const or = [
      { codigoPlaza: { $in: alts } }, { codigo: { $in: alts } }, { codigo_plaza: { $in: alts } },
      { plazaCodigo: { $in: alts } }, { plaza: { $in: alts } }, { code: { $in: alts } }, { clave: { $in: alts } },
    ];
    const doc = await Plaza.findOne(
      { $or: or },
      "_id codigo codigoPlaza codigo_plaza plazaCodigo plaza code clave puesto unidadAdministrativa unidad_adm concurso concurso_id concursoId convocatoria convocatoria_id convocatoriaId especialista_id especialistaId"
    ).lean();
    if (!doc) return res.status(404).json({ message: "no encontrada" });
    const resumen = {
      _id: doc._id,
      codigo: (doc as any).codigo || (doc as any).codigoPlaza || (doc as any).codigo_plaza || (doc as any).plazaCodigo || (doc as any).plaza || (doc as any).code || (doc as any).clave,
      concurso: (doc as any).concurso ?? (doc as any).concurso_id ?? (doc as any).concursoId,
      convocatoria: (doc as any).convocatoria ?? (doc as any).convocatoria_id ?? (doc as any).convocatoriaId,
    };
    return res.json({ resumen, doc });
  } catch (err) { return next(err); }
});

/** GET /api/_debug/plaza/by-cc?conv=004/2024&conc=124002 (o hashes/oid) -> lista 20 plazas que matchean conv/conc */
router.get("/plaza/by-cc", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conv = String(req.query.conv || "").trim();
    const conc = String(req.query.conc || "").trim();
    if (!conv || !conc) return res.status(400).json({ message: "conv y conc requeridos" });

    const convOr: any[] = [{ convocatoria: conv }, { convocatoria_id: conv }];
    if (isOid(conv)) convOr.push({ convocatoriaId: toOid(conv) }, { convocatoria_id: toOid(conv) });

    const concOr: any[] = [{ concurso: conc }, { concurso_id: conc }];
    if (/^\d+$/.test(conc)) concOr.push({ concurso: Number(conc) });
    if (isOid(conc)) concOr.push({ concursoId: toOid(conc) }, { concurso_id: toOid(conc) });

    const items = await Plaza.find({ $and: [{ $or: convOr }, { $or: concOr }] }, "codigo codigoPlaza codigo_plaza plazaCodigo plaza code clave concurso concurso_id convocatoria convocatoria_id")
      .limit(20)
      .lean();

    return res.json({
      total: items.length,
      codigos: items.map((s: any) => s.codigo || s.codigoPlaza || s.codigo_plaza || s.plazaCodigo || s.plaza || s.code || s.clave),
      sample: items.slice(0, 5),
    });
  } catch (err) { return next(err); }
});

export default router;
