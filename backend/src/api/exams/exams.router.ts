// src/api/exams/exams.router.ts
import { Router } from "express";
import Link from "../../models/Link";
import Exam from "../../models/Exam";
import { generateResponsesPdf, generateFAPdf, generateFEPdf } from '../../services/pdfs'

const router = Router();

router.post("/:token", async (req, res) => {
  try {
    const link = await Link.findOne({ token: req.params.token });
    if (!link) return res.status(400).json({ error: "invalid" });

    const now = new Date();
    if (now > link.expiresAt) return res.status(400).json({ error: "expired" });
    if (link.status === "USED") return res.status(400).json({ error: "used" });

    const { answers, consent } = req.body;

    const responsesPdf = await generateResponsesPdf({ header: link.header, answers });
    const faPdf        = await generateFAPdf({ header: link.header, answers });
    const fePdf        = await generateFEPdf({ header: link.header, answers });

    const exam = await Exam.create({
      linkToken: link.token,
      convocatoriaId: link.convocatoriaId,
      concursoId: link.concursoId,
      plazaId: link.plazaId,
      especialistaId: link.especialistaId,
      header: link.header,
      answers,
      artifacts: { responsesPdf, faPdf, fePdf },
    });

    link.status = "USED";
    link.submissionsCount = (link.submissionsCount || 0) + 1;
    await link.save();

    return res.json({ ok: true, examId: String(exam._id), artifacts: exam.artifacts });
  } catch (err) {
    console.error("POST /api/exams/:token", err);
    return res.status(500).json({ error: "server-error" });
  }
});

export default router;
