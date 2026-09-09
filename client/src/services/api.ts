import { useAuthStore } from '../stores/authStore';

// In production, API is served from the same origin
const BASE_URL = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }

  return res.json();
}

export const authApi = {
  login: (email: string, password: string) =>
    request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  register: (username: string, email: string, password: string) =>
    request<{ user: any; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    }),
};

export const gamesApi = {
  getAll: () => request<any[]>('/games'),
  getById: (id: string) => request<any>(`/games/${id}`),
  bind: (id: string) => request<any>(`/games/${id}/bind`, { method: 'POST' }),
  unbind: (id: string) => request<any>(`/games/${id}/bind`, { method: 'DELETE' }),
};

export const roomsApi = {
  getAll: (params?: { gameId?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.gameId) qs.set('gameId', params.gameId);
    if (params?.search) qs.set('search', params.search);
    return request<any[]>(`/rooms?${qs}`);
  },
  getById: (id: string) => request<any>(`/rooms/${id}`),
  create: (data: { name: string; gameId: string; maxMembers?: number }) =>
    request<any>('/rooms', { method: 'POST', body: JSON.stringify(data) }),
  join: (id: string) => request<any>(`/rooms/${id}/join`, { method: 'POST' }),
  leave: (id: string) => request<any>(`/rooms/${id}/leave`, { method: 'POST' }),
};

export const usersApi = {
  getMe: () => request<any>('/users/me'),
  updateMe: (data: { username?: string; avatar?: string; bio?: string }) =>
    request<any>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),
  getOnline: (gameId?: string) => {
    const qs = gameId ? `?gameId=${gameId}` : '';
    return request<any[]>(`/users/online${qs}`);
  },
};
