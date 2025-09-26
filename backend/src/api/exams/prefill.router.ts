import { Router } from "express";
import { isValidHexToken, sha256Hex } from "../../shared/token";
import { prefillByToken } from "../../services/links.service";
import Link from "../../models/Link";
import Convocatoria from "../../models/Convocatoria";
import Concurso from "../../models/Concurso";
import { isValidObjectId, Types } from "mongoose";

const router = Router();

/** Builders seguros para $or: sólo incluyen _id si es ObjectId válido
 *  y agregan variantes numéricas si el valor es dígitos.
 */
function buildOrConv(idOrCode: any) {
  const or: any[] = [];
  if (idOrCode == null) return or;
  if (isValidObjectId(idOrCode)) {
    or.push({ _id: new Types.ObjectId(idOrCode) });
  }
  or.push(
    { codigo: idOrCode },
    { convocatoria: idOrCode },
    { code: idOrCode },
    { hash: idOrCode }
  );
  if (typeof idOrCode === "string" && /^\d+$/.test(idOrCode)) {
    const n = Number(idOrCode);
    or.push({ codigo: n }, { convocatoria: n }, { code: n });
  }
  return or;
}

async function resolveConvCode(idOrCode?: any) {
  if (!idOrCode) return "";
  const or = buildOrConv(idOrCode);
  if (!or.length) return "";
  const doc = await Convocatoria.findOne({ $or: or }).lean();
  const v = doc?.codigo ?? doc?.convocatoria ?? doc?.code ?? "";
  return v ? String(v) : "";
}

function buildOrConcurso(idOrCode: any) {
  const or: any[] = [];
  if (idOrCode == null) return or;
  if (isValidObjectId(idOrCode)) {
    or.push({ _id: new Types.ObjectId(idOrCode) });
  }
  or.push(
    { codigo: idOrCode },
    { concurso: idOrCode },
    { code: idOrCode },
    { hash: idOrCode }
  );
  if (typeof idOrCode === "string" && /^\d+$/.test(idOrCode)) {
    const n = Number(idOrCode);
    or.push({ codigo: n }, { concurso: n }, { code: n });
  }
  return or;
}

async function resolveConcursoCode(idOrCode?: any) {
  if (!idOrCode) return "";
  const or = buildOrConcurso(idOrCode);
  if (!or.length) return "";
  const doc = await Concurso.findOne({ $or: or }).lean();
  const v = doc?.codigo ?? doc?.concurso ?? doc?.code;
  return v != null ? String(v) : "";
}

/** Rutas:
 *  - GET /api/exams/prefill/:token
 *  - GET /api/exams/prefill?token=abcdef...
 */
router.get("/prefill/:token", handler);
router.get("/prefill", handler);

type LinkLean = { convocatoriaId?: any; concursoId?: any };

async function handler(req: any, res: any, next: any) {
  try {
    const token: string = String(
      req.params.token || req.query.token || ""
    ).trim();
    if (!isValidHexToken(token)) {
      return res.status(404).json({ code: "invalid_token" });
    }

    // 1) Header base: unidad, puesto, código de plaza, nombre especialista, etc.
    const data = await prefillByToken(token);

    // 2) Localiza el Link por hash del token (NUNCA por _id)
    const tokenHash = sha256Hex(token);
    const link = (await Link.findOne({ tokenHash }).lean()) as LinkLean | null;
    if (!link) {
      return res.status(404).json({ code: "invalid_token" });
    }

    // dentro del handler, después de obtener link y antes del return:
    const hdr: any = (link as any).header || {};
    const convocatoria =
      (await resolveConvCode((link as any).convocatoriaId)) ||
      hdr.convocatoria ||
      "";
    const concurso =
      (await resolveConcursoCode((link as any).concursoId)) ||
      hdr.concurso ||
      "";

    // 4) Respuesta EXACTA que espera el front (6 campos planos)
    return res.json({
      convocatoria,
      unidadAdministrativa: data?.header?.unidadAdministrativa ?? "",
      concurso,
      puesto: data?.header?.puesto ?? "",
      codigoPuesto: data?.header?.codigoPlaza ?? "",
      nombreEspecialista: data?.header?.especialistaNombre ?? "",
    });
  } catch (err: any) {
    if (err?.name === "CastError") {
      // por si algún cast se coló, devolvemos código controlado
      return res.status(400).json({ code: "invalid_id" });
    }
    if (err?.code === "expired" || err?.code === "expired_token") {
      return res.status(400).json({ code: "expired_token" });
    }
    if (err?.code === "used" || err?.code === "used_token") {
      return res.status(400).json({ code: "used" });
    }
    if (err?.code === "invalid" || err?.code === "invalid_token") {
      return res.status(404).json({ code: "invalid_token" });
    }
    next(err);
  }
}

export default router;