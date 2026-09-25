import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, RefreshCw, Settings, User, Video, XCircle } from 'lucide-react';
import { API_BASE } from '../../constants';
import { wsService } from '../../services/websocket';
import { ConversationNotes } from '../ConversationNotes';
import type { AdminUser, DemoBooking, DemoBookingStatus, DemoSettings } from '../../types';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DemoRequestsViewProps {
  currentUser?: AdminUser | null;
  getAuthHeaders: () => Record<string, string>;
}

const STATUS_LABELS: Record<DemoBookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  reschedule_requested: 'Reschedule Requested',
  meeting_pending: 'Preparing Meeting',
  completed: 'Completed',
  cancelled: 'Cancelled',
  declined: 'Declined'
};

const STATUS_COLORS: Record<DemoBookingStatus, { bg: string; fg: string }> = {
  pending: { bg: 'rgba(217, 119, 6, 0.1)', fg: '#b45309' },
  confirmed: { bg: 'rgba(34, 197, 94, 0.1)', fg: '#15803d' },
  reschedule_requested: { bg: 'rgba(59, 130, 246, 0.1)', fg: '#1d4ed8' },
  meeting_pending: { bg: 'rgba(217, 119, 6, 0.1)', fg: '#b45309' },
  completed: { bg: 'rgba(100, 116, 139, 0.12)', fg: '#475569' },
  cancelled: { bg: 'rgba(220, 38, 38, 0.1)', fg: '#b91c1c' },
  declined: { bg: 'rgba(220, 38, 38, 0.1)', fg: '#b91c1c' }
};

const FILTER_TABS: Array<{ id: 'all' | DemoBookingStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'meeting_pending', label: 'Preparing Meeting' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'declined', label: 'Declined' }
];

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DEFAULT_ORG_OFFSET = '+05:30';

const pad2 = (n: number) => String(n).padStart(2, '0');

// Formats a booking timestamp as "Friday, 25 September · 11:00 AM". Reads the wall-clock parts
// straight from the canonical timestamp (already in the booking timezone), so the staff member's
// own browser timezone never shifts the date. Never says "Today"/"Tomorrow": requests are often
// reviewed later.
function formatFriendly(iso: string) {
  if (!iso) return '—';
  const [datePart, timePart] = iso.split('T');
  if (!datePart || !timePart) return iso;
  const [y, mo, d] = datePart.split('-').map(Number);
  const [hh, mm] = (timePart || '00:00:00').split(':').map(Number);
  const weekday = WEEKDAY_NAMES[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  const ampm = hh < 12 ? 'AM' : 'PM';
  return `${weekday}, ${d} ${MONTH_NAMES[mo - 1]} · ${hour12}:${pad2(mm)} ${ampm}`;
}

function formatFriendlyDateTime(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const weekday = WEEKDAY_NAMES[d.getDay()];
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const hh = d.getHours();
  const mm = d.getMinutes();
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  const ampm = hh < 12 ? 'AM' : 'PM';
  return `${weekday}, ${day} ${month} · ${hour12}:${pad2(mm)} ${ampm}`;
}

function getIsoOffset(iso: string) {
  return iso.match(/[+-]\d{2}:\d{2}$/)?.[0] || DEFAULT_ORG_OFFSET;
}

// Adds minutes to a naive "YYYY-MM-DDTHH:mm" wall-clock value using pure calendar math, so the
// result stays in the same timezone as the input (no browser/UTC conversion).
function addMinutesToLocalValue(localValue: string, minutes: number) {
  const [datePart, timePart] = localValue.split('T');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d, hh, mm) + minutes * 60000);
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}T${pad2(t.getUTCHours())}:${pad2(t.getUTCMinutes())}`;
}

function toDatetimeLocalValue(iso: string) {
  // Strips the +05:30 offset for the <input type="datetime-local"> control, which expects a
  // naive local string; we re-attach the org offset when sending it back to the backend.
  return iso.replace(/[+-]\d{2}:\d{2}$/, '').slice(0, 16);
}

export const DemoRequestsView: React.FC<DemoRequestsViewProps> = ({ currentUser, getAuthHeaders }) => {
  const [bookings, setBookings] = useState<DemoBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | DemoBookingStatus>('pending');
  const [eligibleStaffByBooking, setEligibleStaffByBooking] = useState<Record<string, Array<{ id: string; name: string }>>>({});
  const [selectedStaffByBooking, setSelectedStaffByBooking] = useState<Record<string, string>>({});
  const [rescheduleDraft, setRescheduleDraft] = useState<Record<string, string>>({});
  const [actionErrorByBooking, setActionErrorByBooking] = useState<Record<string, string>>({});
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<DemoSettings | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<DemoSettings | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/demo-settings`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.data);
        setSettingsDraft(data.data);
      }
    } catch (e) {
      console.error('Failed to load demo settings', e);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const toggleWorkDay = (day: number) => {
    if (!settingsDraft) return;
    const has = settingsDraft.workDays.includes(day);
    const workDays = has ? settingsDraft.workDays.filter(d => d !== day) : [...settingsDraft.workDays, day].sort();
    setSettingsDraft({ ...settingsDraft, workDays });
  };

  const handleSaveSettings = async () => {
    if (!settingsDraft) return;
    setSettingsSaving(true);
    setSettingsError('');
    try {
      const res = await fetch(`${API_BASE}/admin/demo-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(settingsDraft)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data.data);
        setSettingsDraft(data.data);
        setSettingsOpen(false);
      } else {
        setSettingsError(data.error || 'Failed to save demo settings');
      }
    } catch (e) {
      setSettingsError('Network error saving demo settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/demos`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) setBookings(data.data || []);
    } catch (e) {
      console.error('Failed to load demo requests', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    const unsubCreated = wsService.on('demo:created', () => loadBookings());
    const unsubUpdated = wsService.on('demo:updated', () => loadBookings());
    return () => {
      unsubCreated();
      unsubUpdated();
    };
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return bookings;
    return bookings.filter(b => b.status === filter);
  }, [bookings, filter]);

  const loadEligibleStaff = async (bookingId: string) => {
    if (eligibleStaffByBooking[bookingId]) return;
    try {
      const res = await fetch(`${API_BASE}/admin/demos/${bookingId}/eligible-staff`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setEligibleStaffByBooking(prev => ({ ...prev, [bookingId]: data.data || [] }));
      }
    } catch (e) {
      console.error('Failed to load eligible staff', e);
    }
  };

  const openConfirm = (booking: DemoBooking) => {
    setConfirmingId(booking.id);
    setActionErrorByBooking(prev => ({ ...prev, [booking.id]: '' }));
    loadEligibleStaff(booking.id);
  };

  const handleConfirm = async (booking: DemoBooking) => {
    const staffId = selectedStaffByBooking[booking.id];
    if (!staffId) {
      setActionErrorByBooking(prev => ({ ...prev, [booking.id]: 'Please choose a demo specialist.' }));
      return;
    }
    setBusyBookingId(booking.id);
    try {
      const res = await fetch(`${API_BASE}/admin/demos/${booking.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ staffId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfirmingId(null);
        await loadBookings();
      } else {
        setActionErrorByBooking(prev => ({ ...prev, [booking.id]: data.error || 'Failed to confirm demo' }));
      }
    } catch (e) {
      setActionErrorByBooking(prev => ({ ...prev, [booking.id]: 'Network error confirming demo' }));
    } finally {
      setBusyBookingId(null);
    }
  };

  const handleRetryMeeting = async (booking: DemoBooking) => {
    setBusyBookingId(booking.id);
    try {
      const res = await fetch(`${API_BASE}/admin/demos/${booking.id}/retry-meeting`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await loadBookings();
      } else {
        setActionErrorByBooking(prev => ({ ...prev, [booking.id]: data.error || 'Failed to create the meeting' }));
      }
    } finally {
      setBusyBookingId(null);
    }
  };

  const openReschedule = (booking: DemoBooking) => {
    setReschedulingId(booking.id);
    setRescheduleDraft(prev => ({ ...prev, [booking.id]: toDatetimeLocalValue(booking.requestedSlotStart) }));
    setActionErrorByBooking(prev => ({ ...prev, [booking.id]: '' }));
  };

  const handleReschedule = async (booking: DemoBooking) => {
    const draft = rescheduleDraft[booking.id];
    if (!draft) return;
    const durationMs = new Date(booking.requestedSlotEnd).getTime() - new Date(booking.requestedSlotStart).getTime();
    const durationMinutes = Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs / 60000) : 30;
    // Keep the booking's own timezone offset and canonical "YYYY-MM-DDTHH:mm:00+05:30" format.
    const offset = getIsoOffset(booking.requestedSlotStart);
    const startISO = `${draft}:00${offset}`;
    const endISO = `${addMinutesToLocalValue(draft, durationMinutes)}:00${offset}`;

    setBusyBookingId(booking.id);
    try {
      const res = await fetch(`${API_BASE}/admin/demos/${booking.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ startISO, endISO })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReschedulingId(null);
        await loadBookings();
      } else {
        setActionErrorByBooking(prev => ({ ...prev, [booking.id]: data.error || 'Failed to reschedule' }));
      }
    } catch (e) {
      setActionErrorByBooking(prev => ({ ...prev, [booking.id]: 'Network error rescheduling demo' }));
    } finally {
      setBusyBookingId(null);
    }
  };

  const handleSimpleAction = async (booking: DemoBooking, action: 'cancel' | 'decline' | 'complete') => {
    if (action === 'cancel' && !window.confirm('Cancel this demo?')) return;
    setBusyBookingId(booking.id);
    try {
      const res = await fetch(`${API_BASE}/admin/demos/${booking.id}/${action}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await loadBookings();
      } else {
        setActionErrorByBooking(prev => ({ ...prev, [booking.id]: data.error || `Failed to ${action} demo` }));
      }
    } finally {
      setBusyBookingId(null);
    }
  };

  return (
    <div className="config-analytics-view">
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'inline-flex', background: '#25D366', color: '#fff', padding: '6px', borderRadius: '8px' }}>
                <Video size={18} />
              </span>
              <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: '#0f172a' }}>Demo Requests</h3>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Manage customer demo bookings and meetings.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isSuperAdmin && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSettingsOpen(prev => !prev)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px' }}
              >
                <Settings size={14} />
                Demo Settings
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={loadBookings}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px' }}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {settingsOpen && settingsDraft && (
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>Demo Booking Settings</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(160px, 100%), 1fr))', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>Demo duration (minutes)</label>
                <input
                  type="number"
                  min={10}
                  step={5}
                  value={settingsDraft.durationMinutes}
                  onChange={e => setSettingsDraft({ ...settingsDraft, durationMinutes: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: '4px', fontSize: '0.8rem', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>Buffer between demos (minutes)</label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={settingsDraft.bufferMinutes}
                  onChange={e => setSettingsDraft({ ...settingsDraft, bufferMinutes: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: '4px', fontSize: '0.8rem', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>Working hours start</label>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={settingsDraft.workStartHour}
                  onChange={e => setSettingsDraft({ ...settingsDraft, workStartHour: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: '4px', fontSize: '0.8rem', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)' }}>Working hours end</label>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={settingsDraft.workEndHour}
                  onChange={e => setSettingsDraft({ ...settingsDraft, workEndHour: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: '4px', fontSize: '0.8rem', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '0.85rem' }}>
              <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Available days</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {WEEKDAY_LABELS.map((label, day) => {
                  const active = settingsDraft.workDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWorkDay(day)}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '5px 9px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        background: active ? '#0f172a' : '#ffffff',
                        color: active ? '#ffffff' : '#64748b',
                        cursor: 'pointer'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {settingsError && (
              <div style={{ fontSize: '0.78rem', color: '#b91c1c', marginBottom: '0.6rem' }}>{settingsError}</div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn-primary" disabled={settingsSaving} onClick={handleSaveSettings} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                {settingsSaving ? 'Saving...' : 'Save Settings'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => { setSettingsDraft(settings); setSettingsOpen(false); }} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', background: '#e2e8f0', padding: '3px', borderRadius: '8px', marginBottom: '1.25rem', width: 'fit-content' }}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              style={{
                border: 'none',
                borderRadius: '6px',
                padding: '5px 11px',
                fontSize: '0.76rem',
                fontWeight: filter === tab.id ? 700 : 500,
                background: filter === tab.id ? '#ffffff' : 'transparent',
                color: filter === tab.id ? '#0f172a' : '#64748b',
                boxShadow: filter === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                cursor: 'pointer'
              }}
            >
              {tab.label}
              {' '}
              <span style={{ opacity: 0.7 }}>
                ({tab.id === 'all' ? bookings.length : bookings.filter(b => b.status === tab.id).length})
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <Video size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p>No demo requests in this view.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {filtered.map(booking => {
              const colors = STATUS_COLORS[booking.status];
              const canManage = currentUser?.role === 'super_admin' || true; // product-scoped visibility already enforced server-side
              return (
                <div key={booking.id} className="glass-card" style={{ padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={15} color="#475569" />
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{booking.customerName}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>+{booking.phone}</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>{booking.productName}</div>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, background: colors.bg, color: colors.fg }}>
                      {STATUS_LABELS[booking.status]}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.8rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>Demo Time</div>
                      <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} /> {formatFriendly(booking.requestedSlotStart)}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>Requested On</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#334155' }}>
                        <Clock size={13} /> {formatFriendlyDateTime(booking.createdAt)}
                      </div>
                    </div>
                    {booking.assignedStaffName && (
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>Demo Specialist</div>
                        <div style={{ color: '#334155' }}>{booking.assignedStaffName}</div>
                      </div>
                    )}
                    {booking.meetingUri && (
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase' }}>Meeting</div>
                        <a href={booking.meetingUri} target="_blank" rel="noreferrer" style={{ color: '#2563eb', fontWeight: 600 }}>
                          Join Google Meet
                        </a>
                      </div>
                    )}
                  </div>

                  {actionErrorByBooking[booking.id] && (
                    <div style={{ marginTop: '0.6rem', fontSize: '0.78rem', color: '#b91c1c', background: 'rgba(220,38,38,0.08)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
                      {actionErrorByBooking[booking.id]}
                    </div>
                  )}

                  {confirmingId === booking.id && (
                    <div className="rs-actions" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <select
                        value={selectedStaffByBooking[booking.id] || ''}
                        onChange={e => setSelectedStaffByBooking(prev => ({ ...prev, [booking.id]: e.target.value }))}
                        style={{ fontSize: '0.8rem', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                      >
                        <option value="">Demo Specialist...</option>
                        {(eligibleStaffByBooking[booking.id] || []).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button type="button" className="btn-primary" disabled={busyBookingId === booking.id} onClick={() => handleConfirm(booking)} style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
                        {busyBookingId === booking.id ? 'Confirming...' : 'Confirm Demo'}
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setConfirmingId(null)} style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
                        Cancel
                      </button>
                    </div>
                  )}

                  {reschedulingId === booking.id && (
                    <div className="rs-actions" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input
                        type="datetime-local"
                        value={rescheduleDraft[booking.id] || ''}
                        onChange={e => setRescheduleDraft(prev => ({ ...prev, [booking.id]: e.target.value }))}
                        style={{ fontSize: '0.8rem', padding: '5px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                      />
                      <button type="button" className="btn-primary" disabled={busyBookingId === booking.id} onClick={() => handleReschedule(booking)} style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
                        {busyBookingId === booking.id ? 'Saving...' : 'Save New Time'}
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setReschedulingId(null)} style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
                        Cancel
                      </button>
                    </div>
                  )}

                  {canManage && (
                    <div className="rs-actions demo-card-actions" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.85rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.65rem' }}>
                      {(booking.status === 'pending') && (
                        <>
                          <button type="button" className="btn-primary" onClick={() => openConfirm(booking)} style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={13} /> Confirm
                          </button>
                          <button type="button" className="btn-danger-outline" disabled={busyBookingId === booking.id} onClick={() => handleSimpleAction(booking, 'decline')} style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
                            Decline
                          </button>
                        </>
                      )}
                      {booking.status === 'meeting_pending' && (
                        <button type="button" className="btn-primary" disabled={busyBookingId === booking.id} onClick={() => handleRetryMeeting(booking)} style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
                          {busyBookingId === booking.id ? 'Retrying...' : 'Retry Meeting Creation'}
                        </button>
                      )}
                      {(booking.status === 'confirmed' || booking.status === 'meeting_pending') && (
                        <>
                          <button type="button" className="btn-secondary" onClick={() => openReschedule(booking)} style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
                            Reschedule
                          </button>
                          <button type="button" className="btn-danger-outline" disabled={busyBookingId === booking.id} onClick={() => handleSimpleAction(booking, 'cancel')} style={{ padding: '5px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle size={13} /> Cancel
                          </button>
                          <button type="button" className="btn-secondary" disabled={busyBookingId === booking.id} onClick={() => handleSimpleAction(booking, 'complete')} style={{ padding: '5px 12px', fontSize: '0.8rem' }}>
                            Mark as Completed
                          </button>
                        </>
                      )}
                      {booking.conversationId && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setExpandedNotesId(prev => (prev === booking.id ? null : booking.id))}
                          style={{ padding: '5px 12px', fontSize: '0.8rem', marginLeft: 'auto' }}
                        >
                          {expandedNotesId === booking.id ? 'Hide Notes' : 'Internal Notes'}
                        </button>
                      )}
                    </div>
                  )}

                  {expandedNotesId === booking.id && booking.conversationId && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <ConversationNotes conversationId={booking.conversationId} currentUser={currentUser} getAuthHeaders={getAuthHeaders} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
