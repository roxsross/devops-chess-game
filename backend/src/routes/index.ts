import { Router } from 'express';
import gamesRouter from './games';
import playersRouter from './players';

const router = Router();
router.use('/games', gamesRouter);
router.use('/players', playersRouter);

export default router;
