import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCheck,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Send,
  XCircle
} from 'lucide-react';
import { API_BASE } from '../../constants';
import { wsService } from '../../services/websocket';

interface WhatsAppAnalyticsProps {
  getAuthHeaders: () => Record<string, string>;
}

// Default reporting window: the last calendar month, ending today.
const getDefaultRange = () => {
  const end = new Date();
  const start = new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
};

export const WhatsAppAnalytics: React.FC<WhatsAppAnalyticsProps> = ({ getAuthHeaders }) => {
  const [usageData, setUsageData] = useState<any>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>(() => getDefaultRange().start);
  const [dateTo, setDateTo] = useState<string>(() => getDefaultRange().end);
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'pending' | 'failed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'template' | 'text' | 'media'>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isLiveStream, setIsLiveStream] = useState<boolean>(true);

  const loadUsageData = async () => {
    setUsageLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('startDate', dateFrom);
      if (dateTo) params.set('endDate', dateTo);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (searchFilter.trim()) params.set('search', searchFilter.trim());

      const url = `${API_BASE}/admin/whatsapp/usage${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setUsageData(json.data);
        }
      }
    } catch (e) {
      console.error('Failed to load WhatsApp usage data', e);
    } finally {
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    loadUsageData();
  }, [dateFrom, dateTo, statusFilter, typeFilter, searchFilter]);

  // Jumps the range to a historical billing cycle's calendar-month boundaries when clicked
  // from the Monthly Billing Cycles list below.
  const handleSelectMonthCycle = (yearMonth: string) => {
    const [y, m] = yearMonth.split('-').map(Number);
    if (!y || !m) return;
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    const today = new Date();
    const cappedEnd = end > today ? today : end;
    setDateFrom(start.toISOString().slice(0, 10));
    setDateTo(cappedEnd.toISOString().slice(0, 10));
  };

  // Real-time WebSocket live updates
  useEffect(() => {
    const unsubUsage = wsService.on('whatsapp:usage:update', () => {
      loadUsageData();
    });
    const unsubStatus = wsService.on('message:status', () => {
      loadUsageData();
    });
    const unsubStatusChange = wsService.onStatusChange(status => {
      setIsLiveStream(status === 'connected');
    });

    return () => {
      unsubUsage();
      unsubStatus();
      unsubStatusChange();
    };
  }, [dateFrom, dateTo, statusFilter, typeFilter, searchFilter]);

  return (
    <div className="config-analytics-view">
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
        {/* Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'inline-flex', background: '#25D366', color: '#fff', padding: '6px', borderRadius: '8px' }}>
                <Send size={18} />
              </span>
              <h3 style={{ margin: 0, fontSize: '1.12rem', fontWeight: 800, color: '#0f172a' }}>
                WhatsApp Message Analytics &amp; Monthly Usage
              </h3>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 10px',
                  borderRadius: '16px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: isLiveStream ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: isLiveStream ? '#15803d' : '#b91c1c',
                  border: isLiveStream ? '1px solid rgba(34, 197, 94, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                  letterSpacing: '0.02em'
                }}
                title={isLiveStream ? 'Real-time WebSocket event listener is active' : 'Disconnected / fallback mode'}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: isLiveStream ? '#22c55e' : '#ef4444',
                    boxShadow: isLiveStream ? '0 0 6px #22c55e' : 'none'
                  }}
                />
                {isLiveStream ? 'LIVE REAL-TIME STREAM' : 'RECONNECTING'}
              </span>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Real-time outbound log tracking, delivery rates, and Meta Graph API pricing breakdown for{' '}
              {dateFrom && dateTo
                ? `${new Date(`${dateFrom}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} → ${new Date(`${dateTo}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'Current Cycle'}.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => loadUsageData()}
              disabled={usageLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '6px 14px', borderRadius: '8px' }}
              title="Synchronize real-time usage data and Meta pricing"
            >
              <RefreshCw size={14} className={usageLoading ? 'spin' : ''} />
              {usageLoading ? 'Syncing...' : 'Sync Usage'}
            </button>
          </div>
        </div>

        {/* Interactive Filters Bar */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '0.85rem 1rem',
            marginBottom: '1.25rem',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          {/* Date Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} color="#475569" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>From:</span>
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={e => setDateFrom(e.target.value)}
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: '#ffffff',
                color: '#0f172a'
              }}
            />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>To:</span>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setDateTo(e.target.value)}
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: '#ffffff',
                color: '#0f172a'
              }}
            />
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
            {[
              { id: 'all', label: 'All Status', count: usageData?.totalSent || 0 },
              { id: 'delivered', label: 'Delivered', count: usageData?.deliveredCount || 0 },
              { id: 'pending', label: 'Pending', count: usageData?.pendingCount || 0 },
              { id: 'failed', label: 'Failed', count: usageData?.failedCount || 0 }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 9px',
                  fontSize: '0.75rem',
                  fontWeight: statusFilter === tab.id ? 700 : 500,
                  background: statusFilter === tab.id ? '#ffffff' : 'transparent',
                  color: statusFilter === tab.id ? '#0f172a' : '#64748b',
                  boxShadow: statusFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '1px 5px',
                    borderRadius: '10px',
                    background: statusFilter === tab.id ? '#f1f5f9' : 'rgba(0,0,0,0.06)',
                    color: statusFilter === tab.id ? '#0f172a' : '#64748b'
                  }}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Message Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} color="#475569" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Type:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              style={{
                fontSize: '0.8rem',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Types</option>
              <option value="template">Templates</option>
              <option value="text">Plain Text</option>
              <option value="media">Media Messages</option>
            </select>
          </div>

          {/* Search Filter */}
          <div style={{ position: 'relative', minWidth: '220px', flex: '1 1 200px', maxWidth: '300px' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search recipient phone, ID..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 26px 5px 28px',
                fontSize: '0.78rem',
                borderRadius: '6px',
                border: '1px solid var(--border-subtle)',
                background: '#ffffff',
                outline: 'none'
              }}
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
                title="Clear search"
              >
                <XCircle size={14} color="#94a3b8" />
              </button>
            )}
          </div>
        </div>

        {/* Metric Summary Cards — reflect the currently selected month + status/type/search filters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.88rem', marginBottom: usageData?.totalSent === 0 ? '0.5rem' : '1.25rem' }}>
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.95rem' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Outbound</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
              {usageLoading ? '—' : (usageData?.totalSent || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600 }}>
              {usageLoading ? 'Loading...' : `${usageData?.deliveryRate || 0}% Confirmed`}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.95rem' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Delivered / Read</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#16a34a', margin: '4px 0' }}>
              {usageLoading ? '—' : (usageData?.deliveredCount || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Confirmed by Meta</div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.95rem' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Pending / In-Transit</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#d97706', margin: '4px 0' }}>
              {usageLoading ? '—' : (usageData?.pendingCount || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Awaiting webhook callback</div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.95rem' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Failed Dispatches</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#dc2626', margin: '4px 0' }}>
              {usageLoading ? '—' : (usageData?.failedCount || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#dc2626' }}>Requires error review</div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.1) 0%, rgba(18, 140, 126, 0.05) 100%)', border: '1px solid rgba(37, 211, 102, 0.3)', borderRadius: '10px', padding: '0.95rem' }}>
            <div style={{ fontSize: '0.74rem', color: '#128C7E', fontWeight: 700, textTransform: 'uppercase' }}>{dateFrom === dateTo ? 'Est. Cost (Day)' : 'Est. Cost (Range)'}</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#128C7E', margin: '4px 0' }}>
              {usageLoading ? '—' : `₹${(usageData?.estimatedCost || 0).toFixed(2)}`}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Avg Rate: ₹{(usageData?.costPerMessage || 0.05).toFixed(3)}/msg
            </div>
          </div>
        </div>

        {!usageLoading && usageData && usageData.totalSent === 0 && (
          <div style={{ textAlign: 'center', padding: '0.5rem 0 1.25rem 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            No message activity for this period.
          </div>
        )}

        {/* Pricing Breakdown & Monthly History */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Meta Pricing Category Breakdown */}
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Category Pricing Breakdown</span>
              {usageData?.isMetaLive && (
                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                  LIVE META SYNC
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Utility Messages (Receipts, Inquiries, Status)</span>
                <span style={{ fontWeight: 700 }}>{usageData?.utility_count || 0} msgs</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Marketing Messages (Promos, Catalog Offers)</span>
                <span style={{ fontWeight: 700 }}>{usageData?.marketing_count || 0} msgs</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Estimated Cost Rate</span>
                <span style={{ fontWeight: 700, color: '#128C7E' }}>₹{(usageData?.costPerMessage || 0.05).toFixed(3)} / msg</span>
              </div>
            </div>
          </div>

          {/* Historical Monthly Usage */}
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Monthly Billing Cycles</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Click a cycle to view</span>
            </div>
            <div style={{ maxHeight: '140px', overflowY: 'auto' }}>
              {usageData?.monthlyHistory && usageData.monthlyHistory.length > 0 ? (
                <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '4px' }}>Month</th>
                      <th style={{ padding: '4px' }}>Total Sent</th>
                      <th style={{ padding: '4px', textAlign: 'right' }}>Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageData.monthlyHistory.map((h: any, idx: number) => {
                      const isCurrent = h.yearMonth === usageData?.yearMonth;
                      return (
                        <tr
                          key={idx}
                          onClick={() => handleSelectMonthCycle(h.yearMonth)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            background: isCurrent ? 'rgba(37, 211, 102, 0.08)' : 'transparent'
                          }}
                          title="Click to view analytics for this month"
                        >
                          <td style={{ padding: '4px 6px', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? '#15803d' : '#0f172a' }}>
                            {h.yearMonth} {isCurrent ? '• Active' : ''}
                          </td>
                          <td style={{ padding: '4px 6px' }}>{(h.totalSent || 0).toLocaleString()} msgs</td>
                          <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 700, color: '#128C7E' }}>₹{(h.estimatedCost || 0).toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                  No historical billing cycles recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Outbound Message Logs Stream */}
        <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="#475569" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                Live Outbound Dispatch Logs
              </span>
              <span style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                {usageData?.recentLogs?.length || 0} records
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Showing latest dispatches for {dateFrom} → {dateTo}
            </span>
          </div>

          <div style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: '#ffffff' }}>
            {usageData?.recentLogs && usageData.recentLogs.length > 0 ? (
              <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border-subtle)', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '8px 10px' }}>Date &amp; Time</th>
                    <th style={{ padding: '8px 10px' }}>Recipient</th>
                    <th style={{ padding: '8px 10px' }}>Type</th>
                    <th style={{ padding: '8px 10px' }}>Message Preview</th>
                    <th style={{ padding: '8px 10px' }}>Delivery Status</th>
                    <th style={{ padding: '8px 10px' }}>Meta Message ID</th>
                  </tr>
                </thead>
                <tbody>
                  {usageData.recentLogs.map((log: any, idx: number) => {
                    const st = (log.status || 'SENT').toUpperCase();
                    const isDelivered = st === 'DELIVERED' || st === 'READ';
                    const isFailed = st === 'FAILED';
                    const isPending = !isDelivered && !isFailed;
                    const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    }) : '—';

                    return (
                      <tr key={log.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.74rem' }}>
                          {dateStr}
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          +{log.to}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: log.type === 'TEMPLATE' ? '#e0e7ff' : log.type === 'MEDIA' ? '#fef3c7' : '#f1f5f9',
                              color: log.type === 'TEMPLATE' ? '#3730a3' : log.type === 'MEDIA' ? '#92400e' : '#334155'
                            }}
                          >
                            {log.type || 'TEXT'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }} title={log.body}>
                          {log.body || '—'}
                        </td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                          {isDelivered && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 700, fontSize: '0.72rem', background: '#dcfce7', padding: '2px 7px', borderRadius: '10px' }}>
                              <CheckCheck size={12} />
                              {st}
                            </span>
                          )}
                          {isPending && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: 700, fontSize: '0.72rem', background: '#fef3c7', padding: '2px 7px', borderRadius: '10px' }}>
                              <Clock size={12} />
                              {st}
                            </span>
                          )}
                          {isFailed && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: 700, fontSize: '0.72rem', background: '#fee2e2', padding: '2px 7px', borderRadius: '10px' }} title={log.error || 'Failed delivery'}>
                              <AlertCircle size={12} />
                              FAILED
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '0.72rem', color: '#64748b' }}>
                          {log.messageId ? (
                            <span title={log.messageId} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span>{log.messageId.slice(0, 16)}...</span>
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>Pending</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Send size={24} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>No outbound dispatches found</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem' }}>
                  {searchFilter || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'No messages matched your filter criteria. Try resetting or selecting a different month.'
                    : 'No outbound messages recorded for this billing cycle yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
