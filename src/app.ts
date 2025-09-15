// src/app.ts
import express from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import { apiRouter } from './api';
import { config } from './shared/config';

const app = express();

app.use(helmet());
app.use(cors({
  origin: config.publicBaseUrl, 
  credentials: true
}));
app.use(express.json({ limit: '1mb' }))
app.use(morgan('method=:method path=":url" status=:status ip=":remote-addr" rt_ms=:response-time ua=":user-agent"'));

// Monta API
app.use('/api/v1', apiRouter);

// 404 JSON para rutas inexistentes
app.use((req, res) => {
  return res.status(404).json({ code: 'not_found', message: 'Route not found' });
});

// Manejo centralizado de errores (shape estable)
app.use((err: any, req: any, res: any, _next: any) => {
  const code: string | undefined = typeof err?.code === 'string' ? err.code : undefined;
  const status: number =
    Number.isInteger(err?.status) ? err.status : (code === 'invalid' ? 404 : 400);

  // Respuesta especial para /links/:token/verify
  if (typeof req?.originalUrl === 'string'
      && req.originalUrl.startsWith('/api/v1/links/')
      && req.originalUrl.endsWith('/verify')) {
    const reason = code || 'invalid';
    return res.status(status).json({ valid: false, reason });
  }

  const message = err?.message || 'Internal Error';
  return res.status(status).json({ message, code: code || 'internal_error' });
});

// Exporta nombrado y default
export { app };
export default app;

/*¿Por qué estos ajustes?

CORS con config.publicBaseUrl: reduce superficie de ataque y cumple requisito.

express.json({ limit: '1mb' }): límite explícito de payload (DoS accidental/malicioso).

Logs morgan key=val: facilitan filtros por status, path, ip, etc.

404 JSON coherente ({ code, message }) para rutas inexistentes.

Error handler unificado:

Mantiene el contrato especial de /links/:token/verify ({ valid:false, reason }).

Normaliza invalid/expired internos a invalid_token/expired_token para el resto de la API.

Mensajes cortos y en español, con HTTP consistente.*/ 