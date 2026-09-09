import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  onlineUsers: Set<string>;
  connect: () => void;
  disconnect: () => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
}

export const useSocketStore = create<SocketState>()((set, get) => ({
  socket: null,
  connected: false,
  onlineUsers: new Set(),

  connect: () => {
    const token = useAuthStore.getState().token;
    if (!token || get().socket) return;

    const socket = io(window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      set({ connected: true });
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      set({ connected: false });
      console.log('Socket disconnected');
    });

    socket.on('user:online', ({ userId }: { userId: string }) => {
      get().addOnlineUser(userId);
    });

    socket.on('user:offline', ({ userId }: { userId: string }) => {
      get().removeOnlineUser(userId);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, connected: false, onlineUsers: new Set() });
    }
  },

  addOnlineUser: (userId) =>
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      newSet.add(userId);
      return { onlineUsers: newSet };
    }),

  removeOnlineUser: (userId) =>
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      newSet.delete(userId);
      return { onlineUsers: newSet };
    }),
}));
