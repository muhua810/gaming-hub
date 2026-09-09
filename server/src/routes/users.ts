import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/users/me - 获取当前用户信息
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        isOnline: true,
        games: { include: { game: true } },
        ownedRooms: true,
        memberships: { include: { room: { include: { game: true } } } },
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json(user);
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// PATCH /api/users/me - 更新个人信息
router.patch('/me', async (req: AuthRequest, res: Response) => {
  try {
    const { username, avatar, bio } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(username && { username }),
        ...(avatar !== undefined && { avatar }),
        ...(bio !== undefined && { bio }),
      },
      select: { id: true, username: true, email: true, avatar: true, bio: true },
    });
    res.json(user);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/users/online - 获取在线用户（可按游戏筛选）
router.get('/online', async (req: AuthRequest, res: Response) => {
  try {
    const { gameId } = req.query;
    const where: any = { isOnline: true, id: { not: req.userId } };

    if (gameId) {
      where.games = { some: { gameId: gameId as string } };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        games: { include: { game: true } },
      },
      take: 50,
    });

    res.json(users);
  } catch (err) {
    console.error('Get online users error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
