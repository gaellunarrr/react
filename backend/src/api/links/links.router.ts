// src/api/links/links.router.ts
import { Router, Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import crypto from "crypto";

import Convocatoria from "../../models/Convocatoria";
import Concurso from "../../models/Concurso";
import Plaza from "../../models/Plaza";
import Especialista from "../../models/Especialista";
import Link from "../../models/Link";

const router = Router();
const DEBUG = process.env.DEBUG_LINKS === "1";

/* ----------------------------- Utils ----------------------------- */

const isOid = (v?: string) => !!v && Types.ObjectId.isValid(v);
const toOid = (v: string) => new Types.ObjectId(v);
const isNumeric = (s?: string | number) => s !== undefined && /^\d+$/.test(String(s ?? ""));

function cleanse(s?: string) {
  if (!s) return "";
  return String(s).replace(/\r|\n|\t/g, "").replace(/\u0000/g, "").trim();
}

const altCodes = (c?: string) => {
  const raw = cleanse(c);
  if (!raw) return [];
  const noDash = raw.replace(/-/g, "");
  return [raw, raw.toUpperCase(), raw.toLowerCase(), noDash, noDash.toUpperCase(), noDash.toLowerCase()];
};

/* ------------------------ Resolutores catálogo ------------------------ */
/** NOTA: NADA de upsert aquí. Sólo resolvemos lo que ya existe. */

async function resolveConv(idOr?: string, humanCode?: string) {
  const a = cleanse(idOr);
  const h = cleanse(humanCode); // p.ej. "004/2024"

  // 1) por _id string exacto (tu _id suele ser hash-40)
  if (a) {
    const byId = await Convocatoria.findOne({ _id: a }, "_id codigo").lean();
    if (byId) return byId;
    if (isOid(a)) {
      const byOid = await Convocatoria.findById(toOid(a), "_id codigo").lean();
      if (byOid) return byOid;
    }
  }

  // 2) por “código humano” (según lo tengas en catálogo)
  if (h) {
    const byCode = await Convocatoria.findOne(
      { $or: [{ codigo: h }, { convocatoria: h }, { code: h }] },
      "_id codigo"
    ).lean();
    if (byCode) return byCode;
  }

  // 3) por “a” en campos alternos (si mandaron hash en idOr)
  if (a) {
    const byAny = await Convocatoria.findOne(
      { $or: [{ codigo: a }, { convocatoria: a }, { code: a }, { hash: a }, { nombre: a }] },
      "_id codigo"
    ).lean();
    if (byAny) return byAny;
  }

  return null;
}

async function resolveConc(idOr?: string, human?: string, convId?: string) {
  const a = cleanse(idOr);
  const h = cleanse(human); // p.ej. "124002" (num como string)

  // 1) por _id string exacto
  if (a) {
    const byId = await Concurso.findOne({ _id: a }, "_id codigo convocatoriaId concurso").lean();
    if (byId) return byId;
    if (isOid(a)) {
      const byOid = await Concurso.findById(toOid(a), "_id codigo convocatoriaId concurso").lean();
      if (byOid) return byOid;
    }
  }

  // 2) por “código humano”/num y acotando por convocatoria si viene
  if (h) {
    const or: any[] = [{ code: h }, { hash: h }, { nombre: h }, { descripcion: h }, { concurso: h }];
    if (isNumeric(h)) or.push({ codigo: Number(h) }, { concurso: Number(h) });
    const q: any = { $or: or };
    if (convId) q.convocatoriaId = convId;
    const byHuman = await Concurso.findOne(q, "_id codigo convocatoriaId concurso").lean();
    if (byHuman) return byHuman;
  }

  // 3) por “a” en campos alternos
  if (a) {
    const or: any[] = [{ code: a }, { hash: a }, { nombre: a }, { descripcion: a }, { concurso: a }];
    if (isNumeric(a)) or.push({ codigo: Number(a) }, { concurso: Number(a) });
    const q: any = { $or: or };
    if (convId) q.convocatoriaId = convId;
    const byAny = await Concurso.findOne(q, "_id codigo convocatoriaId concurso").lean();
    if (byAny) return byAny;
  }

  return null;
}

/* ------------------------ Resolver PLAZA (normalizado) ------------------------ */

async function resolvePlazaByCode(
  idOrCode?: string,
  rawConvId?: string,   // "004/2024" | OID | hash40
  rawConcId?: string    // 124002 | OID | hash40
) {
  const code = cleanse(idOrCode);
  if (!code) return null;

  // _id directo
  if (isOid(code)) {
    const byId = await Plaza.findById(toOid(code)).lean();
    if (byId) return byId;
  }

  // Igualdad directa sobre alias de código
  const alt = altCodes(code);
  const codeOr = [
    { codigoPlaza: { $in: alt } },
    { codigo:      { $in: alt } },   // 👈 en tu BD existe "codigo"
    { codigo_plaza:{ $in: alt } },
    { plazaCodigo: { $in: alt } },
    { plaza:       { $in: alt } },
    { code:        { $in: alt } },
    { clave:       { $in: alt } },
  ];
  let doc = await Plaza.findOne({ $or: codeOr }).lean();
  if (doc) return doc;

  // Match normalizado con $expr (lowercase y sin guiones/espacios)
  const norm = code.toLowerCase().replace(/[\s-]/g, "");
  const fields = ["$codigo", "$codigoPlaza", "$codigo_plaza", "$plazaCodigo", "$plaza", "$code", "$clave"];
  const exprEquals = fields.map((f) => ({
    $eq: [
      {
        $replaceAll: {
          input: {
            $replaceAll: {
              input: { $toLower: { $ifNull: [f, ""] } },
              find: "-",
              replacement: ""
            }
          },
          find: " ",
          replacement: ""
        }
      },
      norm
    ]
  }));

  const convOr: any[] = [];
  const concOr: any[] = [];
  const convClean = cleanse(rawConvId);
  const concClean = cleanse(rawConcId);

  if (convClean) {
    if (isOid(convClean)) convOr.push({ convocatoriaId: toOid(convClean) }, { convocatoria_id: toOid(convClean) });
    convOr.push({ convocatoria: convClean }, { convocatoria_id: convClean }, { conv: convClean }, { cv: convClean });
  }
  if (concClean) {
    if (isOid(concClean)) concOr.push({ concursoId: toOid(concClean) }, { concurso_id: toOid(concClean) });
    concOr.push({ concurso: concClean }, { concurso_id: concClean }, { concursoCodigo: concClean });
    if (/^\d+$/.test(concClean)) concOr.push({ concurso: Number(concClean) });
  }

  // 2a) sólo $expr
  doc = await Plaza.findOne({ $expr: { $or: exprEquals } }).lean();
  if (doc) return doc;

  // 2b) $expr + conv/conc
  const andExpr: any[] = [{ $expr: { $or: exprEquals } }];
  if (convOr.length) andExpr.push({ $or: convOr });
  if (concOr.length) andExpr.push({ $or: concOr });

  if (andExpr.length > 1) {
    doc = await Plaza.findOne({ $and: andExpr }).lean();
    if (doc) return doc;
  }

  // 3) Fallback regex elástico
  const pat = code.replace(/[-\s]+/g, "[-\\s]*");
  const rx = new RegExp(pat, "i");
  const regexOr = [
    { codigoPlaza: rx }, { codigo: rx }, { codigo_plaza: rx },
    { plazaCodigo: rx }, { plaza: rx }, { code: rx }, { clave: rx },
  ];
  doc = await Plaza.findOne({ $or: regexOr }).lean();
  if (doc) return doc;

  // 3b) regex + conv/conc
  const andRegex: any[] = [{ $or: regexOr }];
  if (convOr.length) andRegex.push({ $or: convOr });
  if (concOr.length) andRegex.push({ $or: concOr });
  if (andRegex.length > 1) {
    doc = await Plaza.findOne({ $and: andRegex }).lean();
    if (doc) return doc;
  }

  return null;
}

/* ----------------------------- Rutas DEBUG (mismo router) ----------------------------- */

router.get("/_debug/ping", (_req, res) => {
  return res.json({ ok: true, router: "links", time: new Date().toISOString() });
});

router.get("/_debug/resolve-plaza", async (req, res, next) => {
  try {
    const plaza = cleanse(String(req.query.plaza || ""));
    const conv  = cleanse(String(req.query.conv || ""));
    const conc  = cleanse(String(req.query.conc || ""));
    if (!plaza) return res.status(400).json({ message: "query param 'plaza' requerido" });
    const doc = await resolvePlazaByCode(plaza, conv, conc);
    if (!doc) return res.status(404).json({ message: "plaza no encontrada", plaza, conv, conc });
    const resumen = {
      _id: doc._id,
      codigo: (doc as any).codigo || (doc as any).codigoPlaza || (doc as any).codigo_plaza || (doc as any).plazaCodigo || (doc as any).plaza || (doc as any).code || (doc as any).clave,
      concurso: (doc as any).concurso ?? (doc as any).concurso_id ?? (doc as any).concursoId,
      convocatoria: (doc as any).convocatoria ?? (doc as any).convocatoria_id ?? (doc as any).convocatoriaId,
      unidad: (doc as any).unidadAdministrativa ?? (doc as any).unidad_adm,
      especialista: (doc as any).especialistaId ?? (doc as any).especialista_id,
    };
    return res.json({ found: true, resumen, raw: doc });
  } catch (e) { return next(e); }
});

router.get("/_debug/by-cc", async (req, res, next) => {
  try {
    const conv = cleanse(String(req.query.conv || ""));
    const conc = cleanse(String(req.query.conc || ""));
    if (!conv || !conc) return res.status(400).json({ message: "conv y conc requeridos" });

    const convOr: any[] = [{ convocatoria: conv }, { convocatoria_id: conv }];
    if (isOid(conv)) convOr.push({ convocatoriaId: toOid(conv) }, { convocatoria_id: toOid(conv) });

    const concOr: any[] = [{ concurso: conc }, { concurso_id: conc }];
    if (/^\d+$/.test(conc)) concOr.push({ concurso: Number(conc) });
    if (isOid(conc)) concOr.push({ concursoId: toOid(conc) }, { concurso_id: toOid(conc) });

    const items = await Plaza.find({ $and: [{ $or: convOr }, { $or: concOr }] }, "codigo codigoPlaza codigo_plaza plazaCodigo plaza code clave concurso concurso_id convocatoria convocatoria_id").limit(50).lean();

    const codigos = items.map((s: any) => s.codigo || s.codigoPlaza || s.codigo_plaza || s.plazaCodigo || s.plaza || s.code || s.clave);
    return res.json({ total: items.length, codigos, sample: items.slice(0, 5) });
  } catch (e) { return next(e); }
});

/* --------------------------------- Endpoint principal -------------------------------- */

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      convocatoriaId,      // _id string (hash 40) o "004/2024"
      concursoId,          // _id string (hash 40) o "124002"
      plazaId,             // "CFEC2G24C-20159" o _id
      especialistaId,      // _id, email, curp, nombre
      ttlHours = 48,
      prefill: clientPrefill = {},
    } = req.body || {};

    if (DEBUG) console.debug("[links] incoming body:", req.body);

    if (!convocatoriaId || !concursoId || !plazaId) {
      return res.status(400).json({ message: "missing ids" });
    }

    // Valores “humanos” para cruzar (muy importante: NO mandes hashes aquí)
    const rawConvCodigo = cleanse(String(clientPrefill?.convocatoria || convocatoriaId || "")); // "004/2024"
    const rawConcCodigo = cleanse(String(clientPrefill?.concurso || concursoId || ""));        // "124002" (num en string)

    if (DEBUG) console.debug("[links] clean inputs:", {
      plazaRaw: String(plazaId),
      plazaClean: cleanse(String(plazaId)),
      convRaw: rawConvCodigo,
      concRaw: rawConcCodigo
    });

    /* 1) Resolver PLAZA */
    const plaza = await resolvePlazaByCode(String(plazaId), rawConvCodigo, rawConcCodigo);
    if (DEBUG) console.debug("[links] plaza resolved:", plaza?._id, "from", plazaId);
    if (!plaza?._id) {
      // sugerencias (top 10) para esa conv/conc
      const convCandidates: any[] = [{ convocatoria: rawConvCodigo }, { convocatoria_id: rawConvCodigo }];
      if (isOid(rawConvCodigo)) convCandidates.push({ convocatoriaId: toOid(rawConvCodigo) }, { convocatoria_id: toOid(rawConvCodigo) });

      const concCandidates: any[] = [{ concurso: rawConcCodigo }, { concurso_id: rawConcCodigo }];
      if (/^\d+$/.test(rawConcCodigo)) concCandidates.push({ concurso: Number(rawConcCodigo) });
      if (isOid(rawConcCodigo)) concCandidates.push({ concursoId: toOid(rawConcCodigo) }, { concurso_id: toOid(rawConcCodigo) });

      const suggestions = await Plaza.find({ $and: [{ $or: convCandidates }, { $or: concCandidates }] }, "codigo codigoPlaza codigo_plaza plazaCodigo plaza code clave concurso concurso_id convocatoria convocatoria_id").limit(10).lean();

      return res.status(400).json({
        message: "invalid reference ids",
        detail: "plaza no encontrada por id/codigo",
        missing: { convocatoria: true, concurso: true, plaza: true },
        suggestions: suggestions.map((s: any) => ({
          codigo: s.codigo || s.codigoPlaza || s.codigo_plaza || s.plazaCodigo || s.plaza || s.code || s.clave,
          concurso: s.concurso ?? s.concurso_id,
          convocatoria: s.convocatoria ?? s.convocatoria_id,
        })),
      });
    }

    /* 2) Resolver CONVOCATORIA y CONCURSO (sin upsert; usar lo existente) */
    const conv = await resolveConv(String(convocatoriaId), rawConvCodigo);
    const convIdFinal = (conv?._id as any) || String(convocatoriaId) || (plaza as any).convocatoriaId || (plaza as any).convocatoria_id;

    const conc = await resolveConc(String(concursoId), rawConcCodigo, conv?._id as any);
    const concIdFinal = (conc?._id as any) || String(concursoId) || (plaza as any).concurso_id || (plaza as any).concursoId;

    if (DEBUG) console.debug("[links] final ids:", { convIdFinal, concIdFinal, plazaId: plaza._id });

    // Si aún así no tenemos IDs, aborta con detalle claro
    if (!convIdFinal || !concIdFinal) {
      return res.status(400).json({
        message: "invalid reference ids",
        detail: "convocatoria o concurso no resolvieron",
        missing: { convocatoria: !convIdFinal, concurso: !concIdFinal, plaza: false }
      });
    }

    /* 3) Resolver/crear especialista mínimamente */
    let esp = null as any;
    const idEsp = cleanse(String(especialistaId || ""));
    const jefeNombre = cleanse(String(clientPrefill?.jefeNombre || ""));
    if (idEsp) {
      esp = await Especialista.findOne(
        { $or: [{ _id: idEsp }, { email: idEsp.toLowerCase() }, { curp: idEsp.toUpperCase() }, { nombreCompleto: idEsp }, { hash: idEsp }] },
        "_id nombreCompleto email curp"
      ).lean();
    }
    if (!esp && jefeNombre) {
      const created = await Especialista.create({ nombreCompleto: jefeNombre });
      esp = { _id: created._id, nombreCompleto: jefeNombre } as any;
    }
    if (!esp?._id) {
      return res.status(400).json({ message: "invalid especialistaId (no se pudo resolver o crear especialista)" });
    }

    /* 4) PREFILL para el formulario */
    const plazaCodigo =
      clientPrefill?.plazaCodigo ||
      (plaza as any).codigo ||
      (plaza as any).codigoPlaza ||
      (plaza as any).codigo_plaza ||
      (plaza as any).plazaCodigo ||
      (plaza as any).plaza ||
      (plaza as any).code ||
      (plaza as any).clave || "";

    const puestoNombre = clientPrefill?.puesto || (plaza as any).puesto || (plaza as any).puestoNombre || "";
    const unidadAdm = clientPrefill?.unidadAdministrativa || (plaza as any).unidadAdministrativa || (plaza as any).unidad_adm || "";
    const radicacion = clientPrefill?.radicacion || (plaza as any)?.radicacion || "";

    const prefill = {
      convocatoria: rawConvCodigo,
      concurso: rawConcCodigo,
      plazaCodigo,
      puesto: puestoNombre,
      unidadAdministrativa: unidadAdm,
      jefeNombre: jefeNombre || (esp as any)?.nombreCompleto || "",
      radicacion,
    };

    /* 5) Token + TTL y creación del link */
    const ttl = Number(ttlHours) > 0 ? Number(ttlHours) : 48;
    const token = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex");
    const expiraAt = new Date(Date.now() + ttl * 60 * 60 * 1000);

    // invalidar enlaces vigentes de la misma plaza
    await Link.updateMany(
      { plazaId: plaza._id, expiraAt: { $gt: new Date() } },
      { $set: { expiraAt: new Date(), status: "EXPIRED" } }
    );

    await Link.create({
      token,
      tokenHash,
      expiraAt,
      convocatoriaId: convIdFinal,
      concursoId: concIdFinal,
      plazaId: plaza._id,
      especialistaId: esp._id,
      header: prefill,
      status: "ISSUED",
      usado: false,
    });

    const base = process.env.PUBLIC_BASE_URL || "http://localhost:5173";
    const url = `${base}/form/${token}`;

    if (DEBUG) console.debug("[links] created link for plaza", String(plaza._id), "url:", url);
    res.set("Cache-Control", "no-store");
    return res.status(201).json({ url, token, expiraAt, prefillPreview: prefill });
  } catch (err: any) {
    if (err?.name === "CastError") return res.status(400).json({ code: "invalid_id", message: "Invalid _id" });
    console.error("[links] error:", err?.message);
    return res.status(500).json({ code: "internal_error", message: err?.message || "Internal error" });
  }
});

export default router;
