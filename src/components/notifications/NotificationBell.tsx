import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { API_BASE } from '../../constants';
import { wsService } from '../../services/websocket';
import { notificationService } from '../../utils/notificationService';
import type { AdminUser, AppNotification, NotificationPriority } from '../../types';

interface NotificationBellProps {
  currentUser?: AdminUser | null;
  getAuthHeaders: () => Record<string, string>;
  onNavigate: (path: string) => void;
}

const PRIORITY_DOT: Record<NotificationPriority, string> = {
  critical: '#ef4444',
  important: '#f59e0b',
  informational: '#3b82f6'
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function routeForNotification(n: AppNotification): string | null {
  switch (n.relatedEntityType) {
    case 'demo':
      return '/demos';
    case 'conversation':
      return '/support';
    case 'staff':
      return '/config/staff';
    case 'broadcast':
      return '/broadcasts';
    default:
      return null;
  }
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ currentUser, getAuthHeaders, onNavigate }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'unread' | 'important'>('all');
  const [historyItems, setHistoryItems] = useState<AppNotification[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);

  const loadUnreadCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/notifications/unread-count`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setUnreadCount(data.count || 0);
    } catch (e) {
      console.error('Failed to load unread notification count', e);
    }
  };

  const loadRecent = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/notifications?filter=all&limit=6`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setItems(data.data || []);
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    loadUnreadCount();
    // Reliable fallback alongside the WebSocket push, without polling aggressively.
    const interval = setInterval(loadUnreadCount, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    const unsub = wsService.on('notification:new', (payload: any) => {
      const notification: AppNotification | undefined = payload?.notification;
      if (!notification) return;
      setUnreadCount(prev => prev + 1);
      setItems(prev => [notification, ...prev].slice(0, 6));

      if (notification.priority === 'critical' || notification.priority === 'important') {
        notificationService.playNotificationSound();
        notificationService.showDesktopNotification({
          title: notification.title,
          body: notification.message,
          tag: `notif_${notification.id}`,
          onClick: () => {
            const path = routeForNotification(notification);
            if (path) onNavigate(path);
          }
        });
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleDropdown = () => {
    setDropdownOpen(prev => {
      const next = !prev;
      if (next) loadRecent();
      return next;
    });
  };

  const markRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/admin/notifications/${id}/read`, { method: 'POST', headers: getAuthHeaders() });
    } catch (e) {
      console.error('Failed to mark notification read', e);
    }
  };

  const handleClickNotification = async (n: AppNotification) => {
    if (!n.read) {
      setItems(prev => prev.map(i => (i.id === n.id ? { ...i, read: true } : i)));
      setHistoryItems(prev => prev.map(i => (i.id === n.id ? { ...i, read: true } : i)));
      setUnreadCount(prev => Math.max(0, prev - 1));
      await markRead(n.id);
    }
    setDropdownOpen(false);
    setHistoryOpen(false);
    const path = routeForNotification(n);
    if (path) onNavigate(path);
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/notifications/mark-all-read`, { method: 'POST', headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setUnreadCount(0);
        setItems(prev => prev.map(i => ({ ...i, read: true })));
        setHistoryItems(prev => prev.map(i => ({ ...i, read: true })));
      }
    } catch (e) {
      console.error('Failed to mark all notifications read', e);
    }
  };

  const loadHistory = async (filter: 'all' | 'unread' | 'important', offset = 0) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/notifications?filter=${filter}&limit=20&offset=${offset}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryItems(prev => (offset === 0 ? data.data : [...prev, ...data.data]));
        setHistoryTotal(data.total || 0);
      }
    } catch (e) {
      console.error('Failed to load notification history', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = () => {
    setDropdownOpen(false);
    setHistoryOpen(true);
    setHistoryFilter('all');
    loadHistory('all', 0);
  };

  const renderNotificationRow = (n: AppNotification, compact: boolean) => (
    <button
      key={n.id}
      type="button"
      onClick={() => handleClickNotification(n)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.6rem',
        width: '100%',
        textAlign: 'left',
        padding: compact ? '0.55rem 0.7rem' : '0.7rem 0.85rem',
        background: n.read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
        border: 'none',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer'
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: PRIORITY_DOT[n.priority],
          marginTop: '5px',
          flexShrink: 0,
          opacity: n.read ? 0.4 : 1
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: n.read ? 500 : 700, color: '#0f172a' }}>{n.title}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{n.message}</div>
        <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '3px' }}>{timeAgo(n.createdAt)}</div>
      </div>
      {!n.read && <Check size={13} color="#3b82f6" style={{ flexShrink: 0, marginTop: '4px' }} />}
    </button>
  );

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className="notif-header-btn"
        onClick={handleToggleDropdown}
        title="Notifications"
        style={{ position: 'relative' }}
      >
        <Bell size={13} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: '#ef4444',
              color: '#fff',
              fontSize: '0.62rem',
              fontWeight: 700,
              minWidth: 15,
              height: 15,
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {dropdownOpen && (
        <div
          className="glass-card"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: 360,
            maxWidth: 'calc(100vw - 2rem)',
            maxHeight: 460,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            boxShadow: '0 12px 30px -8px rgba(0,0,0,0.18)',
            background: '#ffffff',
            zIndex: 80,
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0.85rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{ fontSize: '0.74rem', fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading...</div>
            ) : items.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
                <CheckCheck size={26} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontWeight: 600 }}>You're all caught up.</div>
              </div>
            ) : (
              items.map(n => renderNotificationRow(n, true))
            )}
          </div>

          <button
            type="button"
            onClick={openHistory}
            style={{
              padding: '0.6rem',
              textAlign: 'center',
              fontSize: '0.78rem',
              fontWeight: 600,
              color: '#2563eb',
              background: '#f8fafc',
              border: 'none',
              borderTop: '1px solid var(--border-subtle)',
              cursor: 'pointer'
            }}
          >
            View all notifications
          </button>
        </div>
      )}

      {historyOpen && (
        <div
          onClick={() => setHistoryOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            zIndex: 200,
            display: 'flex',
            justifyContent: 'flex-end'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 420,
              maxWidth: '100vw',
              height: '100%',
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.15)'
            }}
          >
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>Notifications</span>
              <button type="button" onClick={() => setHistoryOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', gap: '4px', padding: '0.75rem 1.25rem 0 1.25rem' }}>
              {(['all', 'unread', 'important'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setHistoryFilter(f);
                    loadHistory(f, 0);
                  }}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '5px 12px',
                    borderRadius: '999px',
                    border: '1px solid var(--border-subtle)',
                    background: historyFilter === f ? '#0f172a' : '#ffffff',
                    color: historyFilter === f ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {f}
                </button>
              ))}
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{ marginLeft: 'auto', fontSize: '0.76rem', fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginTop: '0.75rem' }}>
              {historyItems.length === 0 && !historyLoading ? (
                <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                  <CheckCheck size={30} color="#94a3b8" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-muted)', fontWeight: 600 }}>You're all caught up.</div>
                </div>
              ) : (
                historyItems.map(n => renderNotificationRow(n, false))
              )}

              {historyItems.length < historyTotal && (
                <div style={{ padding: '0.85rem', textAlign: 'center' }}>
                  <button
                    type="button"
                    disabled={historyLoading}
                    onClick={() => loadHistory(historyFilter, historyItems.length)}
                    className="btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '6px 16px' }}
                  >
                    {historyLoading ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
