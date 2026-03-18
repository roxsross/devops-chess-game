import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { upsertPlayer, getPlayer, getLeaderboard } from '../services/playerService';

const router = Router();

export const upsertPlayerSchema = z.object({
  userId: z.string().min(1).max(128),
  username: z.string().min(1).max(50),
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = upsertPlayerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten().fieldErrors });
    return;
  }
  try {
    const player = await upsertPlayer(parsed.data.userId, parsed.data.username);
    res.json({ player });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upsert player' });
  }
});

router.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    const players = await getLeaderboard();
    res.json({ players });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get leaderboard', message: String(err) });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const player = await getPlayer(req.params.id);
    if (!player) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    res.json({ player });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get player', message: String(err) });
  }
});

export default router;
