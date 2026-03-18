import { Router, type Request, type Response } from 'express';
import { getGame, listWaitingGames } from '../services/gameService';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const games = await listWaitingGames();
    res.json({ games });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list games', message: String(err) });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const game = await getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    res.json({ game });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get game', message: String(err) });
  }
});

export default router;
