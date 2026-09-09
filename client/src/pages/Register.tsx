import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuthStore } from '../stores/authStore';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    setLoading(true);
    try {
      const { user, token } = await authApi.register(username, email, password);
      setAuth(user, token);
      navigate('/');
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md p-8 rounded-2xl" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <div className="text-center mb-8">
          <span className="text-5xl mb-4 block">🎮</span>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--accent)' }}>加入 GamingHub</h1>
          <p className="mt-2" style={{ color: 'var(--text-secondary)' }}>和全球玩家一起开黑</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(233, 69, 96, 0.15)', color: 'var(--accent)' }}>
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 rounded-lg outline-none transition-all"
              style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="你的游戏昵称"
              minLength={2}
              maxLength={20}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg outline-none transition-all"
              style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg outline-none transition-all"
              style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="至少6位"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg outline-none transition-all"
              style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              placeholder="再输入一次"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
          已有账号？{' '}
          <Link to="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
            登录
          </Link>
        </p>
      </div>
    </div>
  );
}
