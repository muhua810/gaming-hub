import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma, onlineUsers } from '../index.js';
import { setupChatHandlers } from './chat.js';
import { setupVoiceHandlers } from './voice.js';

interface AuthSocket extends Socket {
  userId?: string;
  username?: string;
}

export function setupSocketHandlers(io: Server) {
  // Auth middleware
  io.use(async (socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('未提供认证令牌'));

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
        userId: string;
      };
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, username: true },
      });
      if (!user) return next(new Error('用户不存在'));

      socket.userId = user.id;
      socket.username = user.username;
      next();
    } catch {
      next(new Error('认证失败'));
    }
  });

  io.on('connection', async (socket: AuthSocket) => {
    const userId = socket.userId!;
    console.log(`User connected: ${socket.username} (${userId})`);

    // Set online
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline: true },
    });
    onlineUsers.set(userId, socket.id);
    io.emit('user:online', { userId, username: socket.username });

    // Setup handlers
    setupChatHandlers(io, socket);
    setupVoiceHandlers(io, socket);

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.username}`);
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() },
      });
      onlineUsers.delete(userId);
      io.emit('user:offline', { userId, username: socket.username });
    });
  });
}
