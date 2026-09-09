import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../index.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

const createRoomSchema = z.object({
  name: z.string().min(1).max(30),
  gameId: z.string(),
  maxMembers: z.number().min(2).max(20).default(10),
});

// GET /api/rooms - 获取房间列表（可按游戏筛选）
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { gameId, search } = req.query;
    const where: any = {};
    if (gameId) where.gameId = gameId as string;
    if (search) where.name = { contains: search as string, mode: 'insensitive' };

    const rooms = await prisma.room.findMany({
      where,
      include: {
        game: true,
        owner: { select: { id: true, username: true, avatar: true } },
        members: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(rooms);
  } catch (err) {
    console.error('Get rooms error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/rooms - 创建房间
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = createRoomSchema.parse(req.body);
    const userId = req.userId!;

    const room = await prisma.room.create({
      data: {
        name: data.name,
        gameId: data.gameId,
        maxMembers: data.maxMembers,
        ownerId: userId,
        members: {
          create: { userId, role: 'owner' },
        },
      },
      include: {
        game: true,
        owner: { select: { id: true, username: true, avatar: true } },
        members: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
        },
      },
    });

    res.status(201).json(room);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: '参数错误', details: err.errors });
    }
    console.error('Create room error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// GET /api/rooms/:id - 获取房间详情
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: {
        game: true,
        owner: { select: { id: true, username: true, avatar: true } },
        members: {
          include: { user: { select: { id: true, username: true, avatar: true, isOnline: true } } },
        },
        messages: {
          include: { user: { select: { id: true, username: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
          take: 100,
        },
      },
    });

    if (!room) return res.status(404).json({ error: '房间不存在' });
    res.json(room);
  } catch (err) {
    console.error('Get room error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/rooms/:id/join - 加入房间
router.post('/:id/join', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const roomId = req.params.id;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { _count: { select: { members: true } } },
    });
    if (!room) return res.status(404).json({ error: '房间不存在' });
    if (room._count.members >= room.maxMembers) {
      return res.status(400).json({ error: '房间已满' });
    }

    const existing = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    if (existing) return res.json({ message: '已在房间中' });

    await prisma.roomMember.create({
      data: { userId, roomId },
    });

    res.json({ message: '加入成功' });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

// POST /api/rooms/:id/leave - 离开房间
router.post('/:id/leave', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const roomId = req.params.id;

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return res.status(404).json({ error: '房间不存在' });

    if (room.ownerId === userId) {
      // 房主离开 → 删除房间
      await prisma.room.delete({ where: { id: roomId } });
      return res.json({ message: '房间已解散' });
    }

    await prisma.roomMember.delete({
      where: { userId_roomId: { userId, roomId } },
    });

    res.json({ message: '已离开房间' });
  } catch (err) {
    console.error('Leave room error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
