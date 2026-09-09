import { useState, useRef, useCallback, useEffect } from 'react';
import { Device } from 'mediasoup-client';
import { useSocketStore } from '../stores/socketStore';

interface RemoteStream {
  userId: string;
  username: string;
  stream: MediaStream;
}

export function useWebRTC(roomId: string) {
  const socket = useSocketStore((s) => s.socket);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isInVoice, setIsInVoice] = useState(false);

  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<any>(null);
  const recvTransportRef = useRef<any>(null);
  const producerRef = useRef<any>(null);
  const consumersRef = useRef<Map<string, any>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const joinVoice = useCallback(async () => {
    if (!socket || isInVoice) return;

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);
      setIsInVoice(true);

      // Create device
      const device = new Device();
      deviceRef.current = device;

      // Get router RTP capabilities
      const { rtpCapabilities } = await new Promise<any>((resolve) => {
        socket.emit('voice:getRouterRtpCapabilities', roomId, resolve);
      });

      await device.load({ routerRtpCapabilities: rtpCapabilities });

      // Create send transport
      const sendTransportData = await new Promise<any>((resolve) => {
        socket.emit('voice:createSendTransport', roomId, resolve);
      });

      const sendTransport = device.createSendTransport(sendTransportData);
      sendTransportRef.current = sendTransport;

      sendTransport.on('connect', ({ dtlsParameters }: any, callback: any) => {
        socket.emit('voice:connectTransport', { transportId: sendTransport.id, dtlsParameters }, callback);
      });

      sendTransport.on('produce', ({ kind, rtpParameters }: any, callback: any) => {
        socket.emit('voice:produce', { transportId: sendTransport.id, kind, rtpParameters, roomId }, ({ producerId }: any) => {
          callback({ id: producerId });
        });
      });

      // Produce audio
      const audioTrack = stream.getAudioTracks()[0];
      const producer = await sendTransport.produce({ track: audioTrack });
      producerRef.current = producer;

      // Create recv transport
      const recvTransportData = await new Promise<any>((resolve) => {
        socket.emit('voice:createRecvTransport', roomId, resolve);
      });

      const recvTransport = device.createRecvTransport(recvTransportData);
      recvTransportRef.current = recvTransport;

      recvTransport.on('connect', ({ dtlsParameters }: any, callback: any) => {
        socket.emit('voice:connectTransport', { transportId: recvTransport.id, dtlsParameters }, callback);
      });

      // Notify server
      socket.emit('voice:join', roomId);

      // Handle new producers (other users joining)
      socket.on('voice:newProducer', async ({ producerId, userId, username, kind }: any) => {
        if (kind !== 'audio') return;

        const consumerData = await new Promise<any>((resolve) => {
          socket.emit('voice:consume', {
            producerId,
            rtpCapabilities: device.rtpCapabilities,
            roomId,
          }, resolve);
        });

        if (consumerData.error) return;

        const consumer = await recvTransport.consume({
          id: consumerData.id,
          producerId: consumerData.producerId,
          kind: consumerData.kind,
          rtpParameters: consumerData.rtpParameters,
        });

        consumersRef.current.set(consumerData.id, consumer);

        const remoteStream = new MediaStream();
        remoteStream.addTrack(consumer.track);

        // Play audio
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.play();
        audioElementsRef.current.set(userId, audio);

        setRemoteStreams((prev) => {
          if (prev.some((s) => s.userId === userId)) return prev;
          return [...prev, { userId, username, stream: remoteStream }];
        });

        // Resume consumer
        await new Promise<void>((resolve) => {
          socket.emit('voice:resumeConsumer', { consumerId: consumerData.id }, () => resolve());
        });
      });
    } catch (err) {
      console.error('Join voice error:', err);
      setIsInVoice(false);
    }
  }, [socket, roomId, isInVoice]);

  const leaveVoice = useCallback(() => {
    // Stop local stream
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);

    // Close transports
    sendTransportRef.current?.close();
    recvTransportRef.current?.close();

    // Stop remote audio
    audioElementsRef.current.forEach((audio) => {
      audio.pause();
      audio.srcObject = null;
    });
    audioElementsRef.current.clear();

    // Notify server
    socket?.emit('voice:leave', roomId);

    setRemoteStreams([]);
    setIsInVoice(false);
    setIsMuted(false);
  }, [socket, roomId, localStream]);

  const toggleMute = useCallback(() => {
    if (!producerRef.current) return;
    if (isMuted) {
      producerRef.current.resume();
    } else {
      producerRef.current.pause();
    }
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isInVoice) leaveVoice();
    };
  }, []);

  // Handle other users leaving
  useEffect(() => {
    if (!socket) return;

    const handleUserLeft = ({ userId }: { userId: string }) => {
      const audio = audioElementsRef.current.get(userId);
      if (audio) {
        audio.pause();
        audio.srcObject = null;
        audioElementsRef.current.delete(userId);
      }
      setRemoteStreams((prev) => prev.filter((s) => s.userId !== userId));
    };

    socket.on('voice:user-left', handleUserLeft);
    return () => {
      socket.off('voice:user-left', handleUserLeft);
    };
  }, [socket]);

  return {
    localStream,
    remoteStreams,
    isMuted,
    isInVoice,
    joinVoice,
    leaveVoice,
    toggleMute,
  };
}
