import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/games.js';
import roomRoutes from './routes/rooms.js';
import userRoutes from './routes/users.js';
import { setupSocketHandlers } from './sockets/index.js';
import { authMiddleware } from './middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const prisma = new PrismaClient();
export const onlineUsers = new Map<string, string>();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
}));
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/games', authMiddleware, gameRoutes);
app.use('/api/rooms', authMiddleware, roomRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static client files in production
const publicDir = path.resolve(__dirname, '../public');
app.use(express.static(publicDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Socket.io
setupSocketHandlers(io);

async function start() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    const PORT = parseInt(process.env.PORT || '3000');
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
