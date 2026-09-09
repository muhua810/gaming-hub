import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSocketStore } from '../../stores/socketStore';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const { connect, connected } = useSocketStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    connect();
  }, [connect]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: '🏠 大厅', icon: '🏠' },
    { path: '/games', label: '🎮 游戏', icon: '🎮' },
    { path: '/profile', label: '👤 我的', icon: '👤' },
  ];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>
        {/* Logo */}
        <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-2xl">🎮</span>
          <h1 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>GamingHub</h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                location.pathname === item.path ? 'font-semibold' : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: location.pathname === item.path ? 'var(--accent)' : 'transparent',
                color: location.pathname === item.path ? 'white' : 'var(--text-secondary)',
              }}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label.replace(/^.+\s/, '')}</span>
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              {user?.avatar || '👤'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user?.username}</p>
              <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: connected ? 'var(--success)' : 'var(--warning)' }} />
                {connected ? '在线' : '连接中...'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 rounded-lg text-sm transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            退出登录
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {children}
      </main>
    </div>
  );
}
