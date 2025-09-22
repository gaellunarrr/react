// src/api/exams/prefill.router.ts
import { Router } from "express";
import { isValidHexToken } from "../../shared/token";
import { prefillByToken } from "../../services/links.service";

const router = Router();

// Queda: GET /api/exams/prefill/:token
router.get("/prefill/:token", async (req, res, next) => {
  try {
    const token = String(req.params.token || "");
    if (!isValidHexToken(token)) {
      return res.status(404).json({ code: "invalid_token" });
    }
    const data = await prefillByToken(token);
    return res.json(data);
  } catch (err: any) {
    if (err.code === "expired" || err.code === "expired_token") {
      return res.status(400).json({ code: "expired_token" });
    }
    if (err.code === "used" || err.code === "used_token") {
      return res.status(400).json({ code: "used" });
    }
    if (err.code === "invalid" || err.code === "invalid_token") {
      return res.status(404).json({ code: "invalid_token" });
    }
    next(err);
  }
});

export default router;
