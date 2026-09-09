import { useState, useEffect } from 'react';
import { usersApi, gamesApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import type { Game } from '../types';

export default function Profile() {
  const { user, updateUser } = useAuthStore();
  const [myGames, setMyGames] = useState<Game[]>([]);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profile, games] = await Promise.all([
        usersApi.getMe(),
        gamesApi.getAll(),
      ]);
      setMyGames(profile.games?.map((ug: any) => ug.game) || []);
      setAllGames(games);
    } catch (err) {
      console.error('Load profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const updated = await usersApi.updateMe({ username, bio });
      updateUser(updated);
      setEditing(false);
    } catch (err) {
      console.error('Update profile error:', err);
    }
  };

  const handleBindGame = async (gameId: string) => {
    try {
      await gamesApi.bind(gameId);
      const game = allGames.find((g) => g.id === gameId);
      if (game) setMyGames((prev) => [...prev, game]);
    } catch (err) {
      console.error('Bind game error:', err);
    }
  };

  const handleUnbindGame = async (gameId: string) => {
    try {
      await gamesApi.unbind(gameId);
      setMyGames((prev) => prev.filter((g) => g.id !== gameId));
    } catch (err) {
      console.error('Unbind game error:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      </div>
    );
  }

  const unboundGames = allGames.filter((g) => !myGames.some((mg) => mg.id === g.id));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Profile card */}
      <div className="rounded-2xl p-8 mb-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex items-start gap-6">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            {user?.avatar || '👤'}
          </div>

          <div className="flex-1">
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>用户名</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg outline-none"
                    style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>个人简介</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg outline-none resize-none"
                    style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    placeholder="介绍一下你的游戏风格..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold">{user?.username}</h1>
                  <button
                    onClick={() => setEditing(true)}
                    className="text-sm px-3 py-1 rounded-lg transition-opacity hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    ✏️ 编辑
                  </button>
                </div>
                <p style={{ color: 'var(--text-secondary)' }}>{user?.bio || '这个玩家很懒，什么都没写...'}</p>
                <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                  📧 {user?.email}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* My games */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">🎮 我的游戏</h2>
          <button
            onClick={() => setShowGamePicker(!showGamePicker)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            ➕ 添加游戏
          </button>
        </div>

        {myGames.length === 0 ? (
          <p className="py-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            还没有绑定游戏，添加你常玩的游戏来找搭子吧！
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {myGames.map((game) => (
              <div
                key={game.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <span>
                  {game.icon} {game.name}
                </span>
                <button
                  onClick={() => handleUnbindGame(game.id)}
                  className="text-xs opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color: 'var(--accent)' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Game picker */}
        {showGamePicker && unboundGames.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              选择要添加的游戏
            </h3>
            <div className="flex flex-wrap gap-2">
              {unboundGames.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleBindGame(game.id)}
                  className="px-3 py-1.5 rounded-lg text-sm transition-all hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}
                >
                  {game.icon} {game.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
