import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/games - 获取所有游戏
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const games = await prisma.game.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true, rooms: true } } },
    });
    res.json(games);
  } catch (err) {
    console.error('Get games error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/games/:id - 获取单个游戏及在线房间
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const game = await prisma.game.findUnique({
      where: { id: req.params.id },
      include: {
        rooms: {
          include: {
            _count: { select: { members: true } },
            owner: { select: { id: true, username: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { users: true } },
      },
    });
    if (!game) return res.status(404).json({ error: '游戏不存在' });
    res.json(game);
  } catch (err) {
    console.error('Get game error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/games/:id/bind - 绑定游戏到用户
router.post('/:id/bind', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const gameId = req.params.id;

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return res.status(404).json({ error: '游戏不存在' });

    await prisma.userGame.upsert({
      where: { userId_gameId: { userId, gameId } },
      update: {},
      create: { userId, gameId },
    });

    res.json({ message: '绑定成功' });
  } catch (err) {
    console.error('Bind game error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// DELETE /api/games/:id/bind - 解绑游戏
router.delete('/:id/bind', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const gameId = req.params.id;

    await prisma.userGame.deleteMany({ where: { userId, gameId } });
    res.json({ message: '解绑成功' });
  } catch (err) {
    console.error('Unbind game error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
