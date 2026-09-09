export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  isOnline?: boolean;
  games?: UserGame[];
}

export interface Game {
  id: string;
  name: string;
  icon?: string;
  category: string;
  _count?: { users: number; rooms: number };
}

export interface UserGame {
  userId: string;
  gameId: string;
  game: Game;
}

export interface Room {
  id: string;
  name: string;
  gameId: string;
  game: Game;
  ownerId: string;
  owner: Pick<User, 'id' | 'username' | 'avatar'>;
  maxMembers: number;
  isVoiceOn: boolean;
  members: RoomMember[];
  _count?: { members: number };
  createdAt: string;
}

export interface RoomMember {
  userId: string;
  roomId: string;
  role: string;
  user: Pick<User, 'id' | 'username' | 'avatar' | 'isOnline'>;
}

export interface Message {
  id: string;
  content: string;
  type: 'text' | 'system' | 'image';
  userId: string;
  roomId: string;
  user: Pick<User, 'id' | 'username' | 'avatar'>;
  createdAt: string;
}
