// src/api/index.ts
import { Router } from 'express';
import healthRouter from './health/health.router';
import catalogRouter from './catalog/catalog.router';
import plazasRouter from './plazas/plazas.router';
import linksRouter from './links/links.router';
import prefillRouter from './exams/prefill.router';
import examsRouter from './exams/exams.router';
import consentsRouter from './consents/consents.router';

// ⬇⬇⬇ NUEVOS ⬇⬇⬇
import estructuraRouter from './estructura/estructura.router';
import faRouter from './fa/fa.router';
import feRouter from './fe/fe.router';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/catalog', catalogRouter);
apiRouter.use('/plazas', plazasRouter);
apiRouter.use('/links', linksRouter);

// Prefill (montado después para evitar colisiones con rutas específicas)
apiRouter.use('/exams', prefillRouter);

apiRouter.use('/exams', examsRouter);

// Consents
apiRouter.use('/consents', consentsRouter);

// ⬇⬇⬇ NUEVOS ENDPOINTS QUE USA EL FE ⬇⬇⬇
apiRouter.use('/estructura', estructuraRouter);
apiRouter.use('/fa', faRouter);
apiRouter.use('/fe', feRouter);
