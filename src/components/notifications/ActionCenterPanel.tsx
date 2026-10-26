import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, UserPlus } from 'lucide-react';
import { API_BASE } from '../../constants';
import { wsService } from '../../services/websocket';
import type { AdminUser, ActionCenterItem, NotificationPriority } from '../../types';

interface ActionCenterPanelProps {
  currentUser?: AdminUser | null;
  getAuthHeaders: () => Record<string, string>;
  onNavigate: (path: string) => void;
}

// Red = failed/urgent, orange = pending/action required, blue = informational.
const PRIORITY_STYLE: Record<NotificationPriority, { bg: string; fg: string; border: string; Icon: React.ComponentType<any> }> = {
  critical: { bg: 'rgba(239, 68, 68, 0.06)', fg: '#b91c1c', border: 'rgba(239, 68, 68, 0.25)', Icon: AlertCircle },
  important: { bg: 'rgba(245, 158, 11, 0.07)', fg: '#b45309', border: 'rgba(245, 158, 11, 0.28)', Icon: Clock },
  informational: { bg: 'rgba(59, 130, 246, 0.06)', fg: '#1d4ed8', border: 'rgba(59, 130, 246, 0.2)', Icon: UserPlus }
};

// Events that can change what needs attention; reloads are debounced so a burst of
// conversation updates results in a single request.
const REFRESH_EVENTS = [
  'demo:created',
  'demo:updated',
  'message:status',
  'broadcast:updated',
  'broadcast:deleted',
  'conversation:updated'
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * "What needs your attention": only things in the system that currently require action
 * (failed deliveries, customers waiting on unclaimed tickets, pending demos, pending staff
 * invitations). Items come from /admin/action-center, which only returns non-zero counts.
 * When nothing needs attention the panel collapses to a single compact line.
 */
export const ActionCenterPanel: React.FC<ActionCenterPanelProps> = ({ currentUser, getAuthHeaders, onNavigate }) => {
  const [items, setItems] = useState<ActionCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const reloadTimer = useRef<number | undefined>(undefined);

  const load = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/action-center`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setItems((data.data || []).filter((i: ActionCenterItem) => i.count > 0));
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
    // Reuse the existing real-time events instead of polling.
    const scheduleReload = () => {
      window.clearTimeout(reloadTimer.current);
      reloadTimer.current = window.setTimeout(() => load(), 800);
    };
    const unsubs = REFRESH_EVENTS.map(evt => wsService.on(evt, scheduleReload));
    return () => {
      unsubs.forEach(fn => fn());
      window.clearTimeout(reloadTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentUser || loading) return null;

  const firstName = currentUser.name?.split(' ')[0] || '';
  const greeting = `${getGreeting()}${firstName ? `, ${firstName}` : ''} 👋`;

  if (items.length === 0) {
    return (
      <div
        className="glass-card"
        role="status"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.35rem 0.85rem',
          padding: '0.7rem 1rem',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1rem'
        }}
      >
        <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{greeting}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.84rem', fontWeight: 600, color: '#15803d' }}>
          <CheckCircle2 size={15} aria-hidden="true" />
          You're all caught up for now.
        </span>
      </div>
    );
  }

  return (
    <section
      className="glass-card"
      aria-label="Needs your attention"
      style={{ padding: '1.1rem 1.25rem 1.25rem', borderRadius: '14px', border: '1px solid var(--border-subtle)', marginBottom: '1.25rem' }}
    >
      <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>{greeting}</h2>
      <p style={{ margin: '4px 0 0.85rem 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        Here's what needs your attention today.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '0.75rem' }}>
        {items.map(item => {
          const style = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.informational;
          const { Icon } = style;
          return (
            <div
              key={item.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderRadius: '10px',
                padding: '0.85rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <Icon size={15} color={style.fg} aria-hidden="true" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: style.fg }}>{item.label}</span>
              </div>
              <p style={{ margin: '0 0 0.7rem 0', fontSize: '0.78rem', color: 'var(--text-muted)', flex: 1 }}>{item.description}</p>
              <button
                type="button"
                onClick={() => onNavigate(item.actionPath)}
                aria-label={`${item.actionLabel}: ${item.label}`}
                style={{
                  alignSelf: 'flex-start',
                  minHeight: '34px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '0 16px',
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
    </section>
  );
};
