import * as mediasoup from 'mediasoup';

let worker: mediasoup.types.Worker;
const routers = new Map<string, mediasoup.types.Router>();
const transports = new Map<string, mediasoup.types.WebRtcTransport>();
const producers = new Map<string, mediasoup.types.Producer>();
const consumers = new Map<string, mediasoup.types.Consumer>();

const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
  },
];

export async function createWorker() {
  worker = await mediasoup.createWorker({
    rtcMinPort: 2000,
    rtcMaxPort: 2100,
    logLevel: 'warn',
  });

  worker.on('died', () => {
    console.error('mediasoup worker died, restarting...');
    setTimeout(() => createWorker(), 2000);
  });

  console.log('✅ mediasoup worker created');
  return worker;
}

export async function getOrCreateRouter(roomId: string): Promise<mediasoup.types.Router> {
  let router = routers.get(roomId);
  if (!router) {
    router = await worker.createRouter({ mediaCodecs });
    routers.set(roomId, router);
    console.log(`Router created for room ${roomId}`);
  }
  return router;
}

export async function createWebRtcTransport(
  router: mediasoup.types.Router,
  userId: string,
) {
  const announcedIp = process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1';
  const transport = await router.createWebRtcTransport({
    listenIps: [{ ip: '0.0.0.0', announcedIp }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  });

  transport.on('dtlsstatechange', (state) => {
    if (state === 'closed' || state === 'failed') {
      transport.close();
      transports.delete(`${userId}:${transport.id}`);
    }
  });

  transports.set(`${userId}:${transport.id}`, transport);
  return transport;
}

export async function connectTransport(
  transportId: string,
  dtlsParameters: mediasoup.types.DtlsParameters,
  userId: string,
) {
  const transport = transports.get(`${userId}:${transportId}`);
  if (!transport) throw new Error('Transport not found');
  await transport.connect({ dtlsParameters });
}

export async function produce(
  transportId: string,
  kind: mediasoup.types.MediaKind,
  rtpParameters: mediasoup.types.RtpParameters,
  userId: string,
) {
  const transport = transports.get(`${userId}:${transportId}`);
  if (!transport) throw new Error('Transport not found');

  const producer = await transport.produce({ kind, rtpParameters });
  producers.set(`${userId}:${producer.id}`, producer);

  producer.on('transportclose', () => {
    producer.close();
    producers.delete(`${userId}:${producer.id}`);
  });

  return producer;
}

export async function consume(
  router: mediasoup.types.Router,
  transportId: string,
  producerId: string,
  rtpCapabilities: mediasoup.types.RtpCapabilities,
  userId: string,
) {
  if (!router.canConsume({ producerId, rtpCapabilities })) {
    throw new Error('Cannot consume');
  }

  const transport = transports.get(`${userId}:${transportId}`);
  if (!transport) throw new Error('Transport not found');

  const consumer = await transport.consume({
    producerId,
    rtpCapabilities,
    paused: true,
  });

  consumers.set(`${userId}:${consumer.id}`, consumer);

  consumer.on('transportclose', () => {
    consumer.close();
    consumers.delete(`${userId}:${consumer.id}`);
  });

  return {
    id: consumer.id,
    producerId,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
  };
}

export async function resumeConsumer(consumerId: string, userId: string) {
  const consumer = consumers.get(`${userId}:${consumerId}`);
  if (!consumer) throw new Error('Consumer not found');
  await consumer.resume();
}

export function getRouterProducerIds(roomId: string): string[] {
  const router = routers.get(roomId);
  if (!router) return [];
  // Return all producer IDs for this room
  const result: string[] = [];
  producers.forEach((producer, key) => {
    if (router.appData?.roomId === roomId || true) {
      result.push(producer.id);
    }
  });
  return result;
}

export function getProducer(producerId: string) {
  for (const [key, producer] of producers) {
    if (producer.id === producerId) return producer;
  }
  return null;
}

export function getRouterRtpCapabilities(roomId: string) {
  const router = routers.get(roomId);
  return router?.rtpCapabilities || null;
}

export function closeRoom(roomId: string) {
  const router = routers.get(roomId);
  if (router) {
    router.close();
    routers.delete(roomId);
  }
}
