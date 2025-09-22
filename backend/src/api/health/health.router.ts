import { Router } from 'express';
import { config } from '../../shared/config';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    ok: true,
    env: config.env,
    port: config.port,
    time: new Date().toISOString()
  });
});

export default router;
