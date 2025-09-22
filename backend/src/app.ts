// src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import { apiRouter } from './api';
import { config } from './shared/config';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.publicBaseUrl, // p.ej. http://localhost:5173
    credentials: true,
  })
);

// Opcional: evita ETag/304 en dev
app.set('etag', false);

app.use(express.json({ limit: '1mb' }));
app.use(
  morgan(
    'method=:method path=":url" status=:status ip=":remote-addr" rt_ms=:response-time ua=":user-agent"'
  )
);

// Montar API en /api y /api/v1 (compat con el FE)
app.use(['/api', '/api/v1'], apiRouter);

// 404 JSON para rutas inexistentes
app.use((_req: Request, res: Response): void => {
  res.status(404).json({ code: 'not_found', message: 'Route not found' });
});

// Identificar CastError de Mongoose y bajarlo a 400
function isMongooseCastError(err: unknown): err is { name: string; path?: string } {
  return !!err && typeof err === 'object' && (err as any).name === 'CastError';
}

app.use(
  (err: unknown, _req: Request, res: Response, next: NextFunction): void => {
    if (isMongooseCastError(err)) {
      const e = err as any;
      res.status(400).json({ code: 'invalid_id', message: `Invalid ${e.path || 'id'}` });
      return;
    }
    next(err);
  }
);

// Manejo centralizado de errores (shape estable)
app.use(
  (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const e = err as any;
    const code: string | undefined = typeof e?.code === 'string' ? e.code : undefined;
    const status: number =
      Number.isInteger(e?.status) ? e.status : code === 'invalid' ? 404 : 400;

    // Respuesta especial para /links/:token/verify (soporta /api y /api/v1)
    if (
      typeof req?.originalUrl === 'string' &&
      /^\/api(?:\/v1)?\/links\/[^/]+\/verify$/.test(req.originalUrl)
    ) {
      const reason = code || 'invalid';
      res.status(status).json({ valid: false, reason });
      return;
    }

    const message = e?.message || 'Internal Error';
    res.status(status).json({ message, code: code || 'internal_error' });
  }
);

export { app };
export default app;
