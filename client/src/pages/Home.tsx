import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { roomsApi, gamesApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { Room, Game } from '../types';

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [roomsData, gamesData] = await Promise.all([
        roomsApi.getAll(),
        gamesApi.getAll(),
      ]);
      setRooms(roomsData);
      setGames(gamesData);
    } catch (err) {
      console.error('Load data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickCreate = async (gameId: string, gameName: string) => {
    try {
      const room = await roomsApi.create({
        name: `${gameName} 开黑房间`,
        gameId,
      });
      navigate(`/room/${room.id}`);
    } catch (err) {
      console.error('Create room error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-xl" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          👋 欢迎回来，<span style={{ color: 'var(--accent)' }}>{user?.username}</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>准备好开黑了吗？</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/games"
          className="p-6 rounded-xl transition-all hover:scale-[1.02]"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <span className="text-3xl block mb-3">🎮</span>
          <h3 className="font-semibold text-lg">浏览游戏</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>找到你想玩的游戏</p>
        </Link>

        <button
          onClick={() => navigate('/games')}
          className="p-6 rounded-xl text-left transition-all hover:scale-[1.02]"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <span className="text-3xl block mb-3">➕</span>
          <h3 className="font-semibold text-lg">创建房间</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>邀请队友一起开黑</p>
        </button>

        <Link
          to="/profile"
          className="p-6 rounded-xl transition-all hover:scale-[1.02]"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <span className="text-3xl block mb-3">👤</span>
          <h3 className="font-semibold text-lg">我的主页</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>管理你的游戏标签</p>
        </Link>
      </div>

      {/* Active Rooms */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">🔥 活跃房间</h2>
          <Link to="/games" className="text-sm" style={{ color: 'var(--accent)' }}>
            查看全部 →
          </Link>
        </div>

        {rooms.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <span className="text-4xl block mb-4">🏜️</span>
            <p style={{ color: 'var(--text-secondary)' }}>还没有房间，创建一个吧！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.slice(0, 6).map((room) => (
              <Link
                key={room.id}
                to={`/room/${room.id}`}
                className="p-4 rounded-xl transition-all hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent)' }}>
                    {room.game?.icon} {room.game?.name}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {room._count?.members || room.members?.length || 0}/{room.maxMembers}
                  </span>
                </div>
                <h3 className="font-semibold mb-2">{room.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    👑 {room.owner?.username}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Join by Game */}
      <div>
        <h2 className="text-xl font-bold mb-4">⚡ 快速开黑</h2>
        <div className="flex flex-wrap gap-3">
          {games.slice(0, 10).map((game) => (
            <button
              key={game.id}
              onClick={() => quickCreate(game.id, game.name)}
              className="px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              {game.icon} {game.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
