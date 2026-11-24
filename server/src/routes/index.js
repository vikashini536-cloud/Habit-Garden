import { Router } from 'express';
import healthRouter from './health.routes.js';
import authRouter from './auth.routes.js';
import habitsRouter from './habits.routes.js';

const router = Router();

router.use(healthRouter);
router.use('/auth', authRouter);
router.use('/habits', habitsRouter);

export default router;
