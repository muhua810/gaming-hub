import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gamesApi, roomsApi } from '../services/api';
import type { Game, Room } from '../types';

export default function GameHall() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (gameId) {
      loadGameDetail(gameId);
    } else {
      loadRooms();
    }
  }, [gameId]);

  const loadGames = async () => {
    try {
      const data = await gamesApi.getAll();
      setGames(data);
    } catch (err) {
      console.error('Load games error:', err);
    }
  };

  const loadGameDetail = async (id: string) => {
    try {
      const game = await gamesApi.getById(id);
      setSelectedGame(game);
      setRooms(game.rooms || []);
    } catch (err) {
      console.error('Load game detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async () => {
    try {
      const data = await roomsApi.getAll({ search: searchQuery || undefined });
      setRooms(data);
    } catch (err) {
      console.error('Load rooms error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!selectedGame || !newRoomName.trim()) return;
    try {
      const room = await roomsApi.create({
        name: newRoomName.trim(),
        gameId: selectedGame.id,
      });
      setShowCreateModal(false);
      setNewRoomName('');
      navigate(`/room/${room.id}`);
    } catch (err) {
      console.error('Create room error:', err);
    }
  };

  const handleJoinRoom = async (roomId: string) => {
    try {
      await roomsApi.join(roomId);
      navigate(`/room/${roomId}`);
    } catch (err) {
      console.error('Join room error:', err);
    }
  };

  // Group games by category
  const categories = games.reduce(
    (acc, game) => {
      if (!acc[game.category]) acc[game.category] = [];
      acc[game.category].push(game);
      return acc;
    },
    {} as Record<string, Game[]>,
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🎮 游戏大厅</h1>

      <div className="flex gap-6">
        {/* Game list */}
        <div className="w-72 flex-shrink-0">
          <input
            type="text"
            placeholder="搜索游戏..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg mb-4 outline-none"
            style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />

          <div className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
            {Object.entries(categories).map(([category, categoryGames]) => (
              <div key={category}>
                <h3 className="text-xs font-semibold uppercase mb-2 px-2" style={{ color: 'var(--text-secondary)' }}>
                  {category}
                </h3>
                <div className="space-y-1">
                  {categoryGames
                    .filter((g) => !searchQuery || g.name.includes(searchQuery))
                    .map((game) => (
                      <button
                        key={game.id}
                        onClick={() => {
                          setSelectedGame(game);
                          navigate(`/games/${game.id}`);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                          selectedGame?.id === game.id ? 'font-semibold' : ''
                        }`}
                        style={{
                          backgroundColor: selectedGame?.id === game.id ? 'var(--accent)' : 'transparent',
                          color: selectedGame?.id === game.id ? 'white' : 'var(--text-secondary)',
                        }}
                      >
                        {game.icon} {game.name}
                        <span className="ml-2 text-xs opacity-60">
                          {game._count?.rooms || 0} 房间
                        </span>
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1">
          {selectedGame ? (
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {selectedGame.icon} {selectedGame.name}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {selectedGame._count?.users || 0} 玩家已绑定 · {rooms.length} 个房间
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                ➕ 创建房间
              </button>
            </div>
          ) : (
            <h2 className="text-xl font-bold mb-4">全部房间</h2>
          )}

          {loading ? (
            <div className="text-center py-12" style={{ color: 'var(--text-secondary)' }}>加载中...</div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <span className="text-4xl block mb-4">🏜️</span>
              <p style={{ color: 'var(--text-secondary)' }}>
                {selectedGame ? '还没有人创建房间，来当第一个！' : '暂无房间'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="p-4 rounded-xl transition-all hover:scale-[1.01] cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                  onClick={() => handleJoinRoom(room.id)}
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
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      👑 {room.owner?.username}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(room.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create room modal */}
      {showCreateModal && selectedGame && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md p-6 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <h2 className="text-xl font-bold mb-4">
              创建 {selectedGame.name} 房间
            </h2>
            <input
              type="text"
              placeholder="房间名称"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg mb-4 outline-none"
              style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                取消
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!newRoomName.trim()}
                className="flex-1 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
