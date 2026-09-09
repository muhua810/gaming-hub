import { Server } from 'socket.io';
import { prisma } from '../index.js';

interface AuthSocket {
  id: string;
  userId?: string;
  username?: string;
  join: (room: string) => void;
  leave: (room: string) => void;
  to: (room: string) => any;
  on: (event: string, handler: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
  rooms: Set<string>;
}

export function setupChatHandlers(io: Server, socket: AuthSocket) {
  const userId = socket.userId!;

  // Join a chat room
  socket.on('room:join', async (roomId: string) => {
    try {
      // Verify membership
      const member = await prisma.roomMember.findUnique({
        where: { userId_roomId: { userId, roomId } },
      });
      if (!member) {
        // Auto-join if not a member
        const room = await prisma.room.findUnique({
          where: { id: roomId },
          include: { _count: { select: { members: true } } },
        });
        if (!room || room._count.members >= room.maxMembers) {
          socket.emit('error', { message: '无法加入房间' });
          return;
        }
        await prisma.roomMember.create({
          data: { userId, roomId },
        });
      }

      socket.join(`room:${roomId}`);
      socket.to(`room:${roomId}`).emit('room:user-joined', {
        userId,
        username: socket.username,
        roomId,
      });

      // System message
      const msg = await prisma.message.create({
        data: {
          content: `${socket.username} 加入了房间`,
          type: 'system',
          userId,
          roomId,
        },
        include: { user: { select: { id: true, username: true, avatar: true } } },
      });
      io.to(`room:${roomId}`).emit('message:new', msg);
    } catch (err) {
      console.error('Room join error:', err);
      socket.emit('error', { message: '加入房间失败' });
    }
  });

  // Leave a chat room
  socket.on('room:leave', async (roomId: string) => {
    socket.leave(`room:${roomId}`);
    socket.to(`room:${roomId}`).emit('room:user-left', {
      userId,
      username: socket.username,
      roomId,
    });
  });

  // Send message
  socket.on('message:send', async (data: { roomId: string; content: string; type?: string }) => {
    try {
      const { roomId, content, type = 'text' } = data;
      if (!content?.trim()) return;

      const msg = await prisma.message.create({
        data: {
          content: content.trim(),
          type,
          userId,
          roomId,
        },
        include: { user: { select: { id: true, username: true, avatar: true } } },
      });

      io.to(`room:${roomId}`).emit('message:new', msg);
    } catch (err) {
      console.error('Send message error:', err);
      socket.emit('error', { message: '发送失败' });
    }
  });

  // Typing indicator
  socket.on('typing:start', (roomId: string) => {
    socket.to(`room:${roomId}`).emit('typing:start', {
      userId,
      username: socket.username,
    });
  });

  socket.on('typing:stop', (roomId: string) => {
    socket.to(`room:${roomId}`).emit('typing:stop', { userId });
  });
}
