import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { API_BASE } from '../../constants';
import { wsService } from '../../services/websocket';
import type { AdminUser, ActionCenterItem, NotificationPriority } from '../../types';

interface ActionCenterPanelProps {
  currentUser?: AdminUser | null;
  getAuthHeaders: () => Record<string, string>;
  onNavigate: (path: string) => void;
}

const PRIORITY_STYLE: Record<NotificationPriority, { bg: string; fg: string; border: string }> = {
  critical: { bg: 'rgba(239, 68, 68, 0.06)', fg: '#b91c1c', border: 'rgba(239, 68, 68, 0.25)' },
  important: { bg: 'rgba(245, 158, 11, 0.06)', fg: '#b45309', border: 'rgba(245, 158, 11, 0.25)' },
  informational: { bg: 'rgba(59, 130, 246, 0.06)', fg: '#1d4ed8', border: 'rgba(59, 130, 246, 0.2)' }
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const ActionCenterPanel: React.FC<ActionCenterPanelProps> = ({ currentUser, getAuthHeaders, onNavigate }) => {
  const [items, setItems] = useState<ActionCenterItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/action-center`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setItems(data.data || []);
    } catch (e) {
      console.error('Failed to load action center', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    // Refresh on any event that could change pending-work counts, rather than polling.
    const events = ['demo:created', 'demo:updated', 'message:status', 'broadcast:updated'];
    const unsubs = events.map(evt => wsService.on(evt, () => load()));
    return () => unsubs.forEach(fn => fn());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentUser || loading) return null;

  const firstName = currentUser.name?.split(' ')[0] || '';

  return (
    <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}>
      <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
        {getGreeting()}{firstName ? `, ${firstName}` : ''} 👋
      </h2>
      <p style={{ margin: '4px 0 0.9rem 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        {items.length > 0 ? "Here's what needs your attention today." : 'Nothing needs your attention right now.'}
      </p>

      {items.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>
          <CheckCircle2 size={17} />
          You're all caught up.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {items.map(item => {
            const style = PRIORITY_STYLE[item.priority];
            return (
              <div
                key={item.id}
                style={{
                  background: style.bg,
                  border: `1px solid ${style.border}`,
                  borderRadius: '10px',
                  padding: '0.85rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <AlertCircle size={14} color={style.fg} />
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: style.fg }}>{item.label}</span>
                </div>
                <p style={{ margin: '0 0 0.65rem 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.description}</p>
                <button
                  type="button"
                  onClick={() => onNavigate(item.actionPath)}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '5px 14px',
                    borderRadius: '7px',
                    border: `1px solid ${style.border}`,
                    background: '#ffffff',
                    color: style.fg,
                    cursor: 'pointer'
                  }}
                >
                  {item.actionLabel}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
