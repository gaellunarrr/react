// src/api/exams/exams.router.ts
import { Router } from "express";
import crypto from "crypto";
import Link from "../../models/Link";
import Exam from "../../models/Exam";
import { generateResponsesPdf, generateFAPdf, generateFEPdf } from "../../services/pdfs";

const router = Router();

// Busca preferentemente por tokenHash; hace fallback a token en claro (compatibilidad)
async function findLinkByToken(token: string) {
  const tokenHash = crypto.createHash("sha256").update(token, "utf8").digest("hex");
  let link = await Link.findOne({ tokenHash });
  if (!link) link = await Link.findOne({ token });
  return link;
}

router.post("/:token", async (req, res) => {
  try {
    const token = String(req.params.token || "");
    if (!token) return res.status(400).json({ error: "invalid" });

    const link = await findLinkByToken(token);
    if (!link) return res.status(400).json({ error: "invalid" });

    const now = new Date();

    // Usar expiraAt (campo unificado del modelo)
    if (link.expiraAt && now > link.expiraAt) {
      if (link.status !== "EXPIRED") {
        link.status = "EXPIRED";
        await link.save();
      }
      return res.status(400).json({ error: "expired" });
    }

    if (link.status === "USED" || link.usado === true) {
      return res.status(400).json({ error: "used" });
    }

    const { answers, consent } = req.body;

    // Generación de artefactos PDF con el header snapshot guardado en el Link
    const responsesPdf = await generateResponsesPdf({ header: link.header, answers });
    const faPdf        = await generateFAPdf({ header: link.header, answers });
    const fePdf        = await generateFEPdf({ header: link.header, answers });

    const exam = await Exam.create({
      linkToken: link.token,               // guardamos el token en claro para trazabilidad
      convocatoriaId: link.convocatoriaId,
      concursoId: link.concursoId,
      plazaId: link.plazaId,
      especialistaId: link.especialistaId,
      header: link.header,
      answers,
      artifacts: { responsesPdf, faPdf, fePdf },
      consent,
    });

    // Marcar el link como usado
    link.status = "USED";
    link.usado = true;
    link.usadoAt = new Date();
    link.submissionsCount = (link.submissionsCount || 0) + 1;
    await link.save();

    return res.json({ ok: true, examId: String(exam._id), artifacts: exam.artifacts });
  } catch (err) {
    console.error("POST /api/exams/:token", err);
    return res.status(500).json({ error: "server-error" });
  }
});

export default router;
