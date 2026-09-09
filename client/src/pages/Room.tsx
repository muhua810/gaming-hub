import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { roomsApi } from '../services/api';
import { useSocketStore } from '../stores/socketStore';
import { useAuthStore } from '../stores/authStore';
import { useWebRTC } from '../hooks/useWebRTC';
import type { Room as RoomType, Message } from '../types';

export default function Room() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const [room, setRoom] = useState<RoomType | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    localStream,
    remoteStreams,
    isMuted,
    isInVoice,
    joinVoice,
    leaveVoice,
    toggleMute,
  } = useWebRTC(roomId || '');

  useEffect(() => {
    if (!roomId) return;
    loadRoom();
  }, [roomId]);

  useEffect(() => {
    if (!socket || !roomId) return;

    // Join socket room
    socket.emit('room:join', roomId);

    // Listen for new messages
    const handleNewMessage = (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleUserJoined = (data: { userId: string; username: string }) => {
      // Refresh room data
      loadRoom();
    };

    const handleUserLeft = (data: { userId: string; username: string }) => {
      loadRoom();
    };

    socket.on('message:new', handleNewMessage);
    socket.on('room:user-joined', handleUserJoined);
    socket.on('room:user-left', handleUserLeft);

    return () => {
      socket.emit('room:leave', roomId);
      socket.off('message:new', handleNewMessage);
      socket.off('room:user-joined', handleUserJoined);
      socket.off('room:user-left', handleUserLeft);
    };
  }, [socket, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadRoom = async () => {
    try {
      const data = await roomsApi.getById(roomId!);
      setRoom(data);
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Load room error:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => {
    if (!inputValue.trim() || !socket || !roomId) return;

    socket.emit('message:send', {
      roomId,
      content: inputValue.trim(),
      type: 'text',
    });

    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleLeave = async () => {
    try {
      if (isInVoice) leaveVoice();
      await roomsApi.leave(roomId!);
      navigate('/');
    } catch (err) {
      console.error('Leave error:', err);
    }
  };

  if (loading || !room) {
    return (
      <div className="flex items-center justify-center h-full">
        <div style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Room header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <div>
            <h1 className="text-xl font-bold">{room.name}</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {room.game?.icon} {room.game?.name} · {room.members?.length || 0}/{room.maxMembers} 人
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isInVoice ? (
              <button
                onClick={joinVoice}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                style={{ backgroundColor: 'var(--success)' }}
              >
                🎙️ 加入语音
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-all ${isMuted ? '' : 'voice-active'}`}
                  style={{ backgroundColor: isMuted ? 'var(--warning)' : 'var(--success)' }}
                >
                  {isMuted ? '🔇 已静音' : '🎙️ 说话中'}
                </button>
                <button
                  onClick={leaveVoice}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  📴 退出语音
                </button>
              </div>
            )}
            <button
              onClick={handleLeave}
              className="px-4 py-2 rounded-lg text-sm transition-all hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              离开房间
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="animate-slide-in">
              {msg.type === 'system' ? (
                <div className="text-center">
                  <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    {msg.content}
                  </span>
                </div>
              ) : (
                <div className={`flex gap-3 ${msg.userId === user?.id ? 'flex-row-reverse' : ''}`}>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                    style={{ backgroundColor: msg.userId === user?.id ? 'var(--accent)' : 'var(--bg-tertiary)' }}
                  >
                    {msg.user?.avatar || msg.user?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className={`max-w-[70%] ${msg.userId === user?.id ? 'text-right' : ''}`}>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      {msg.user?.username}
                    </p>
                    <div
                      className="px-4 py-2 rounded-2xl inline-block text-sm"
                      style={{
                        backgroundColor: msg.userId === user?.id ? 'var(--accent)' : 'var(--bg-secondary)',
                        color: msg.userId === user?.id ? 'white' : 'var(--text-primary)',
                        borderBottomRightRadius: msg.userId === user?.id ? '4px' : '16px',
                        borderBottomLeftRadius: msg.userId === user?.id ? '16px' : '4px',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息..."
              className="flex-1 px-4 py-3 rounded-lg outline-none"
              style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim()}
              className="px-6 py-3 rounded-lg text-white font-medium disabled:opacity-50 transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              发送
            </button>
          </div>
        </div>
      </div>

      {/* Members sidebar */}
      <aside className="w-56 flex-shrink-0 overflow-y-auto" style={{ borderLeft: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
            在线成员 ({room.members?.length || 0})
          </h3>
          <div className="space-y-2">
            {room.members?.map((member) => (
              <div key={member.userId} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                <div className="relative">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                    style={{ backgroundColor: 'var(--bg-primary)' }}
                  >
                    {member.user?.avatar || member.user?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span
                    className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                    style={{
                      backgroundColor: member.user?.isOnline ? 'var(--success)' : 'var(--text-secondary)',
                      borderColor: 'var(--bg-tertiary)',
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{member.user?.username}</p>
                  {member.role === 'owner' && (
                    <span className="text-xs" style={{ color: 'var(--warning)' }}>👑 房主</span>
                  )}
                </div>
                {/* Voice indicator */}
                {isInVoice && remoteStreams.some((s) => s.userId === member.userId) && (
                  <span className="text-xs voice-active" style={{ color: 'var(--success)' }}>🔊</span>
                )}
              </div>
            ))}
          </div>

          {/* Voice participants */}
          {isInVoice && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--success)' }}>
                🎙️ 语音频道
              </h3>
              <div className="space-y-2">
                {/* Self */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(46, 213, 115, 0.1)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: 'var(--success)' }}>
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{user?.username} (你)</p>
                  </div>
                  {isMuted && <span className="text-xs">🔇</span>}
                </div>

                {/* Remote */}
                {remoteStreams.map((stream) => (
                  <div key={stream.userId} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'rgba(46, 213, 115, 0.1)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: 'var(--success)' }}>
                      {stream.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{stream.username}</p>
                    </div>
                    <span className="text-xs voice-active" style={{ color: 'var(--success)' }}>🔊</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
