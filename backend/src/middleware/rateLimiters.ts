// src/middleware/rateLimiters.ts
import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Límite por IP (conservador)
export const ipLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 30,                  // 30 req/10min por IP
  standardHeaders: true,
  legacyHeaders: false,
});

// Límite por token del path (más estricto)
export const tokenLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5, // 5 req/10min por token
  keyGenerator: (req: Request) => String(req.params.token || 'unknown'),
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
});

//IP: evita ataques distribuidos simples.
//token: evita martillar el mismo link con reintentos.