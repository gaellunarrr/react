// src/api/links/links.router.ts
import { Router } from "express";
import Link from "../../models/Link";
import Convocatoria from "../../models/Convocatoria";
import Concurso from "../../models/Concurso";
import Plaza from "../../models/Plaza";
import Especialista from "../../models/Especialista";
import { generateTokenHex, isValidHexToken } from "../../shared/token";

const router = Router();
const FRONT_URL = (process.env.PUBLIC_BASE_URL || "http://localhost:5173").replace(/\/$/, "");

/**
 * POST /api/links
 * body: { convocatoriaId, concursoId, plazaId, especialistaId, ttlHours? }
 * resp: { token, url, expiresAt, header }
 */
router.post("/", async (req, res) => {
  try {
    const { convocatoriaId, concursoId, plazaId, especialistaId, ttlHours = 48 } = req.body || {};
    if (!convocatoriaId || !concursoId || !plazaId || !especialistaId) {
      return res.status(400).json({ error: "missing-ids" });
    }

    // 1) Cargar entidades
    const [conv, conc, plaza, esp] = await Promise.all([
      Convocatoria.findById(convocatoriaId).lean(),
      Concurso.findById(concursoId).lean(),
      Plaza.findById(plazaId).lean(),
      Especialista.findById(especialistaId).lean(),
    ]);

    if (!conv || !conc || !plaza || !esp) {
      return res.status(400).json({ error: "invalid-ids" });
    }

    // 2) Validar pertenencia real de la plaza
    if (String(plaza.convocatoriaId) !== String(convocatoriaId)) {
      return res.status(400).json({ error: "plaza-convocatoria-mismatch" });
    }
    if (String(plaza.concursoId) !== String(concursoId)) {
      return res.status(400).json({ error: "plaza-concurso-mismatch" });
    }
    if (String(plaza.especialistaId) !== String(especialistaId)) {
      return res.status(400).json({ error: "plaza-especialista-mismatch" });
    }

    // 3) Generar token 48-hex y expiración
    const token = generateTokenHex(); // 48 hex
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + (ttlHours || 48) * 3600 * 1000);

    // 4) Snapshot de encabezado útil para prefill
    const header = {
      convocatoria: (conv as any)?.codigo ?? (conv as any)?.nombre ?? "",
      concurso: (conc as any)?.nombre ?? (conc as any)?.codigo ?? "",
      plaza: {
        id: String(plaza._id),
        codigoPlaza: (plaza as any)?.codigoPlaza ?? "",
        puesto: (plaza as any)?.puesto ?? "",
        unidadAdministrativa: (plaza as any)?.unidadAdministrativa ?? "",
        folio: (plaza as any)?.folio ?? "",
        fechaAplicacion: (plaza as any)?.fechaAplicacion ?? "",
        horaAplicacion: (plaza as any)?.horaAplicacion ?? "",
      },
      especialista: {
        id: String(esp._id),
        nombre: (esp as any)?.nombreCompleto ?? "",
        email: (esp as any)?.email ?? "",
      },
    };

    // 5) Persistir
    await Link.create({
      token,
      status: "ISSUED",
      createdAt,
      expiresAt,
      convocatoriaId,
      concursoId,
      plazaId,
      especialistaId,
      header,
    });

    // 6) URL pública del formulario
    const url = `${FRONT_URL}/form/${token}`;

    return res.json({ token, url, expiresAt: expiresAt.toISOString(), header });
  } catch (err) {
    console.error("POST /links", err);
    return res.status(500).json({ error: "server-error" });
  }
});

/**
 * GET /api/links/:token/verify
 * POST /api/links/:token/verify
 * Responde { valid:boolean, status?:string, expiresAt?:string, header?:any, reason?:string }
 */
async function verifyHandler(req: any, res: any) {
  try {
    const token = String((req.params?.token || "")).trim();
    if (!isValidHexToken(token)) {
      return res.json({ valid: false, reason: "invalid" });
    }

    const link = await Link.findOne({ token });
    if (!link) return res.json({ valid: false, reason: "invalid" });

    // expiración
    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      return res.json({ valid: false, reason: "expired" });
    }
    if (link.status && link.status !== "ISSUED") {
      return res.json({ valid: false, reason: link.status.toLowerCase() });
    }

    return res.json({
      valid: true,
      status: link.status,
      expiresAt: link.expiresAt?.toISOString(),
      header: link.header,
    });
  } catch (err) {
    console.error("VERIFY /links/:token/verify", err);
    return res.status(500).json({ valid: false, reason: "error" });
  }
}

router.get("/:token/verify", verifyHandler);
router.post("/:token/verify", verifyHandler);

export default router;
