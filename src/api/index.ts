// src/api/index.ts
import { Router } from 'express';
import healthRouter from './health/health.router';
import catalogRouter from './catalog/catalog.router';
import plazasRouter from './plazas/plazas.router';
import linksRouter from './links/links.router';
import perfillRouter from './exams/perfill.router';   // usar el nombre de archivo que tienes
import examsRouter from './exams/exams.router';
import consentsRouter from './consents/consents.router';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/catalog', catalogRouter);
apiRouter.use('/plazas', plazasRouter);
apiRouter.use('/links', linksRouter);

// Prefill (GET /exams/prefill/:token) – montar primero
apiRouter.use('/exams', perfillRouter);

// Exams (POST /exams/:token, GET /exams/:id, GET /exams/:id/artifacts)
apiRouter.use('/exams', examsRouter);

// Consents
apiRouter.use('/consents', consentsRouter);
