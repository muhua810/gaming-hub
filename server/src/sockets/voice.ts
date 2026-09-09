import { Server } from 'socket.io';
import {
  getOrCreateRouter,
  createWebRtcTransport,
  connectTransport,
  produce,
  consume,
  resumeConsumer,
  getRouterRtpCapabilities,
} from '../services/mediasoup.js';

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

// Track which producers belong to which socket
const socketProducers = new Map<string, { producerId: string; roomId: string }[]>();
const socketRoomTransports = new Map<string, { sendTransportId: string; recvTransportId: string }>();

export function setupVoiceHandlers(io: Server, socket: AuthSocket) {
  const userId = socket.userId!;

  // Get router RTP capabilities for a room
  socket.on('voice:getRouterRtpCapabilities', async (roomId: string, callback) => {
    try {
      const router = await getOrCreateRouter(roomId);
      callback({ rtpCapabilities: router.rtpCapabilities });
    } catch (err) {
      callback({ error: 'Failed to get router capabilities' });
    }
  });

  // Create send transport
  socket.on('voice:createSendTransport', async (roomId: string, callback) => {
    try {
      const router = await getOrCreateRouter(roomId);
      const transport = await createWebRtcTransport(router, userId);

      const existing = socketRoomTransports.get(socket.id) || {
        sendTransportId: '',
        recvTransportId: '',
      };
      existing.sendTransportId = transport.id;
      socketRoomTransports.set(socket.id, existing);

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });
    } catch (err) {
      console.error('Create send transport error:', err);
      callback({ error: 'Failed to create transport' });
    }
  });

  // Create receive transport
  socket.on('voice:createRecvTransport', async (roomId: string, callback) => {
    try {
      const router = await getOrCreateRouter(roomId);
      const transport = await createWebRtcTransport(router, userId);

      const existing = socketRoomTransports.get(socket.id) || {
        sendTransportId: '',
        recvTransportId: '',
      };
      existing.recvTransportId = transport.id;
      socketRoomTransports.set(socket.id, existing);

      callback({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });
    } catch (err) {
      console.error('Create recv transport error:', err);
      callback({ error: 'Failed to create transport' });
    }
  });

  // Connect transport (send or recv)
  socket.on(
    'voice:connectTransport',
    async (data: { transportId: string; dtlsParameters: any }, callback) => {
      try {
        await connectTransport(data.transportId, data.dtlsParameters, userId);
        callback({ success: true });
      } catch (err) {
        callback({ error: 'Failed to connect transport' });
      }
    },
  );

  // Produce (start sending audio)
  socket.on(
    'voice:produce',
    async (
      data: { transportId: string; kind: string; rtpParameters: any; roomId: string },
      callback,
    ) => {
      try {
        const producer = await produce(
          data.transportId,
          data.kind as any,
          data.rtpParameters,
          userId,
        );

        // Track producer
        const producers = socketProducers.get(socket.id) || [];
        producers.push({ producerId: producer.id, roomId: data.roomId });
        socketProducers.set(socket.id, producers);

        // Notify others in room
        socket.to(`room:${data.roomId}`).emit('voice:newProducer', {
          producerId: producer.id,
          userId,
          username: socket.username,
          kind: data.kind,
        });

        callback({ producerId: producer.id });
      } catch (err) {
        console.error('Produce error:', err);
        callback({ error: 'Failed to produce' });
      }
    },
  );

  // Consume (receive audio from a producer)
  socket.on(
    'voice:consume',
    async (
      data: { producerId: string; rtpCapabilities: any; roomId: string },
      callback,
    ) => {
      try {
        const router = await getOrCreateRouter(data.roomId);
        const transports = socketRoomTransports.get(socket.id);
        if (!transports?.recvTransportId) {
          return callback({ error: 'No receive transport' });
        }

        const result = await consume(
          router,
          transports.recvTransportId,
          data.producerId,
          data.rtpCapabilities,
          userId,
        );

        callback(result);
      } catch (err) {
        console.error('Consume error:', err);
        callback({ error: 'Failed to consume' });
      }
    },
  );

  // Resume consumer
  socket.on(
    'voice:resumeConsumer',
    async (data: { consumerId: string }, callback) => {
      try {
        await resumeConsumer(data.consumerId, userId);
        callback({ success: true });
      } catch (err) {
        callback({ error: 'Failed to resume consumer' });
      }
    },
  );

  // User joins voice channel
  socket.on('voice:join', async (roomId: string) => {
    socket.join(`voice:${roomId}`);
    socket.to(`voice:${roomId}`).emit('voice:user-joined', {
      userId,
      username: socket.username,
    });
    console.log(`${socket.username} joined voice in room ${roomId}`);
  });

  // User leaves voice channel
  socket.on('voice:leave', (roomId: string) => {
    socket.leave(`voice:${roomId}`);
    // Close all producers for this user in this room
    const producers = socketProducers.get(socket.id) || [];
    const roomProducers = producers.filter((p) => p.roomId === roomId);
    roomProducers.forEach((p) => {
      // Producers close automatically when transport closes
    });
    socketProducers.set(
      socket.id,
      producers.filter((p) => p.roomId !== roomId),
    );

    socket.to(`voice:${roomId}`).emit('voice:user-left', {
      userId,
      username: socket.username,
    });
    console.log(`${socket.username} left voice in room ${roomId}`);
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    // Close all transports for this socket
    socketRoomTransports.delete(socket.id);
    socketProducers.delete(socket.id);
  });
}
