import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart2,
  Bot,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Copy,
  Filter,
  Info,
  Layers,
  Package,
  RefreshCw,
  Search,
  Send,
  UserCheck,
  Users,
  XCircle
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../../constants';
import { wsService } from '../../services/websocket';

interface WhatsAppAnalyticsProps {
  getAuthHeaders: () => Record<string, string>;
}

type BreakdownTab = 'overview' | 'product' | 'staff';
type SortField = 'name' | 'totalSent' | 'deliveredCount' | 'pendingCount' | 'failedCount' | 'deliveryRate' | 'estimatedCost';

// Formats timestamp as e.g. "25 Sep, 11:50 AM"
const formatMessageDateTime = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  const ampm = hh < 12 ? 'AM' : 'PM';
  return `${day} ${month}, ${hour12}:${mm} ${ampm}`;
};

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
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [showTechDetails, setShowTechDetails] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Message breakdown state
  const [breakdownTab, setBreakdownTab] = useState<BreakdownTab>('overview');
  const [productSortField, setProductSortField] = useState<SortField>('totalSent');
  const [productSortAsc, setProductSortAsc] = useState<boolean>(false);
  const [staffSortField, setStaffSortField] = useState<SortField>('totalSent');
  const [staffSortAsc, setStaffSortAsc] = useState<boolean>(false);
  const [filteredProductOrStaff, setFilteredProductOrStaff] = useState<string | null>(null);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

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

  const sortedProducts = useMemo(() => {
    const list = [...(usageData?.productBreakdown || [])];
    list.sort((a, b) => {
      let valA = a[productSortField];
      let valB = b[productSortField];
      if (productSortField === 'name') {
        const strA = String(valA || '');
        const strB = String(valB || '');
        return productSortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
      }
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return productSortAsc ? valA - valB : valB - valA;
    });
    return list;
  }, [usageData?.productBreakdown, productSortField, productSortAsc]);

  const sortedStaff = useMemo(() => {
    const list = [...(usageData?.staffBreakdown || [])];
    list.sort((a, b) => {
      let valA = a[staffSortField];
      let valB = b[staffSortField];
      if (staffSortField === 'name') {
        const strA = String(valA || '');
        const strB = String(valB || '');
        return staffSortAsc ? strA.localeCompare(strB) : strB.localeCompare(strA);
      }
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return staffSortAsc ? valA - valB : valB - valA;
    });
    return list;
  }, [usageData?.staffBreakdown, staffSortField, staffSortAsc]);

  const maxProductSent = useMemo(() => {
    const counts = (usageData?.productBreakdown || []).map((p: any) => p.totalSent || 0);
    return counts.length > 0 ? Math.max(...counts, 1) : 1;
  }, [usageData?.productBreakdown]);

  const maxStaffSent = useMemo(() => {
    const counts = (usageData?.staffBreakdown || []).map((s: any) => s.totalSent || 0);
    return counts.length > 0 ? Math.max(...counts, 1) : 1;
  }, [usageData?.staffBreakdown]);

  const filteredRecentLogs = useMemo(() => {
    const logs = usageData?.recentLogs || [];
    if (!filteredProductOrStaff) return logs;
    return logs.filter(
      (log: any) =>
        log.productName === filteredProductOrStaff ||
        log.staffName === filteredProductOrStaff
    );
  }, [usageData?.recentLogs, filteredProductOrStaff]);

  const toggleSort = (
    field: SortField,
    currentField: SortField,
    currentAsc: boolean,
    setField: (f: SortField) => void,
    setAsc: (a: boolean) => void
  ) => {
    if (currentField === field) {
      setAsc(!currentAsc);
    } else {
      setField(field);
      setAsc(field === 'name');
    }
  };

  const renderSortHeader = (
    label: string,
    field: SortField,
    currentField: SortField,
    currentAsc: boolean,
    onSort: () => void,
    align: 'left' | 'right' | 'center' = 'left'
  ) => (
    <th
      onClick={onSort}
      style={{
        padding: '8px 10px',
        textAlign: align,
        cursor: 'pointer',
        userSelect: 'none',
        color: currentField === field ? '#0f172a' : '#475569',
        fontWeight: currentField === field ? 800 : 600,
        background: currentField === field ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
        transition: 'background 0.15s'
      }}
      title={`Click to sort by ${label}`}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
          width: '100%'
        }}
      >
        <span>{label}</span>
        {currentField === field ? (
          currentAsc ? <ArrowUp size={13} color="#2563eb" /> : <ArrowDown size={13} color="#2563eb" />
        ) : (
          <ArrowUpDown size={11} color="#94a3b8" />
        )}
      </div>
    </th>
  );

  const renderSentWithBar = (count: number, max: number) => {
    const pct = max > 0 ? Math.min(100, Math.max(8, Math.round((count / max) * 100))) : 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: '0 0 60px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#2563eb', borderRadius: '3px' }} />
        </div>
        <span style={{ fontWeight: 700, minWidth: '22px', textAlign: 'right', color: '#0f172a' }}>{count}</span>
      </div>
    );
  };

  const renderRateBadge = (rate: number) => {
    const color = rate >= 70 ? '#16a34a' : rate >= 50 ? '#d97706' : '#dc2626';
    const bg = rate >= 70 ? '#dcfce7' : rate >= 50 ? '#fef3c7' : '#fee2e2';
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: '10px',
          fontSize: '0.72rem',
          fontWeight: 700,
          color,
          background: bg
        }}
      >
        {rate.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="config-analytics-view">
      <div className="glass-card analytics-page-card" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border-subtle)' }}>
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
                {isLiveStream ? 'Live Updates' : 'Reconnecting'}
              </span>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Message delivery rates, activity trends, and messaging costs for{' '}
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
              title="Refresh message analytics and usage data"
            >
              <RefreshCw size={14} className={usageLoading ? 'spin' : ''} />
              {usageLoading ? 'Refreshing...' : 'Refresh Data'}
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
          className="rs-stack-mobile"
        >
          {/* Date Range Filter */}
          <div className="analytics-date-range" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          <div className="rs-tabs rs-tabs-grid-mobile" style={{ display: 'flex', alignItems: 'center', gap: '3px', background: '#e2e8f0', padding: '3px', borderRadius: '8px' }}>
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
          <div className="analytics-search" style={{ position: 'relative', minWidth: '220px', flex: '1 1 200px', maxWidth: '300px' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search customer phone, message..."
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: '0.88rem', marginBottom: usageData?.totalSent === 0 ? '0.5rem' : '1.25rem' }}>
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.95rem' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Sent</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
              {usageLoading ? '—' : (usageData?.totalSent || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 600 }}>
              {usageLoading ? 'Loading...' : `${usageData?.deliveryRate || 0}% Delivered`}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.95rem' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Delivered / Read</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#16a34a', margin: '4px 0' }}>
              {usageLoading ? '—' : (usageData?.deliveredCount || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Delivery confirmed</div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.95rem' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Pending Messages</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#d97706', margin: '4px 0' }}>
              {usageLoading ? '—' : (usageData?.pendingCount || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Waiting for delivery update</div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '0.95rem' }}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Failed Messages</div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#dc2626', margin: '4px 0' }}>
              {usageLoading ? '—' : (usageData?.failedCount || 0).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#dc2626' }}>Requires review</div>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.1) 0%, rgba(18, 140, 126, 0.05) 100%)', border: '1px solid rgba(37, 211, 102, 0.3)', borderRadius: '10px', padding: '0.95rem' }}>
            <div style={{ fontSize: '0.74rem', color: '#128C7E', fontWeight: 700, textTransform: 'uppercase' }}>Estimated Cost</div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Meta Pricing Category Breakdown */}
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Category Pricing Breakdown</span>
              {usageData?.isMetaLive && (
                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                  LIVE SYNC
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

        {/* Message Breakdown Section */}
        <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
          {/* Section Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={17} color="#475569" />
                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a' }}>
                  Message Breakdown
                </span>
                {/* Information Tooltip */}
                <div
                  style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
                  title="Shows outbound WhatsApp activity grouped by product or staff for the selected filters."
                >
                  <Info size={14} color="#94a3b8" style={{ cursor: 'help' }} />
                </div>
              </div>
              <p style={{ margin: '2px 0 0 25px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Shows outbound WhatsApp activity grouped by product or staff for the selected filters.
              </p>
            </div>

            {/* Breakdown Tabs: Overview, By Product, By Staff */}
            <div
              className="rs-tabs rs-tabs-fill-mobile"
              style={{
                display: 'inline-flex',
                background: '#e2e8f0',
                padding: '3px',
                borderRadius: '8px',
                gap: '3px'
              }}
            >
              {[
                { id: 'overview', label: 'Overview', icon: <BarChart2 size={13} /> },
                { id: 'product', label: 'By Product', icon: <Package size={13} />, count: usageData?.productBreakdown?.length },
                { id: 'staff', label: 'By Staff', icon: <Users size={13} />, count: usageData?.staffBreakdown?.length }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBreakdownTab(tab.id as BreakdownTab)}
                  style={{
                    border: 'none',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '0.76rem',
                    fontWeight: breakdownTab === tab.id ? 700 : 500,
                    background: breakdownTab === tab.id ? '#ffffff' : 'transparent',
                    color: breakdownTab === tab.id ? '#0f172a' : '#64748b',
                    boxShadow: breakdownTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s'
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        background: breakdownTab === tab.id ? '#f1f5f9' : 'rgba(0,0,0,0.05)',
                        color: breakdownTab === tab.id ? '#0f172a' : '#64748b'
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Loading Skeleton */}
          {usageLoading && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              <RefreshCw size={18} className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block', color: '#3b82f6' }} />
              Updating breakdown analytics...
            </div>
          )}

          {/* TAB 1: OVERVIEW */}
          {!usageLoading && breakdownTab === 'overview' && (
            <div>
              {/* Overview Metrics Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Products / Services</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '3px 0' }}>
                    {usageData?.productBreakdown?.length || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Total product-linked outbound channels
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Senders (Staff &amp; Auto)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '3px 0' }}>
                    {usageData?.staffBreakdown?.length || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Manual agents + System automation
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Filtered Messages &amp; Cost</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#128C7E', margin: '3px 0' }}>
                    {(usageData?.totalSent || 0).toLocaleString()} <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>msgs</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Total cost: ₹{(usageData?.estimatedCost || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Side-by-side Top Summaries */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: '1rem' }}>
                {/* Product Summary Column */}
                <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Package size={14} color="#0284c7" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Top Products by Activity</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBreakdownTab('product')}
                      style={{ border: 'none', background: 'transparent', color: '#2563eb', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      View All ({usageData?.productBreakdown?.length || 0}) →
                    </button>
                  </div>

                  {sortedProducts.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.25rem' }}>
                      No product activity for this period.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {sortedProducts.slice(0, 4).map((p: any) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setFilteredProductOrStaff(filteredProductOrStaff === p.name ? null : p.name);
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: filteredProductOrStaff === p.name ? '#eff6ff' : '#f8fafc',
                            cursor: 'pointer',
                            border: filteredProductOrStaff === p.name ? '1px solid #93c5fd' : '1px solid transparent'
                          }}
                          title="Click to filter message activity list below"
                        >
                          <div style={{ flex: '1', minWidth: 0, paddingRight: '8px' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {p.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <div style={{ width: '80px', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, Math.round(((p.totalSent || 0) / maxProductSent) * 100))}%`, height: '100%', background: '#0284c7' }} />
                              </div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {p.totalSent} msgs ({p.deliveryRate}%)
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#128C7E', whiteSpace: 'nowrap' }}>
                            ₹{Number(p.estimatedCost || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Staff Summary Column */}
                <div style={{ background: '#ffffff', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} color="#059669" />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Staff Message Activity</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBreakdownTab('staff')}
                      style={{ border: 'none', background: 'transparent', color: '#2563eb', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      View All ({usageData?.staffBreakdown?.length || 0}) →
                    </button>
                  </div>

                  {sortedStaff.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.25rem' }}>
                      No staff message activity for this period.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {sortedStaff.slice(0, 4).map((s: any) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setFilteredProductOrStaff(filteredProductOrStaff === s.name ? null : s.name);
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            background: filteredProductOrStaff === s.name ? '#eff6ff' : '#f8fafc',
                            cursor: 'pointer',
                            border: filteredProductOrStaff === s.name ? '1px solid #93c5fd' : '1px solid transparent'
                          }}
                          title="Click to filter message activity list below"
                        >
                          <div style={{ flex: '1', minWidth: 0, paddingRight: '8px' }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              {s.name === 'System / Automation' ? (
                                <Bot size={13} color="#6366f1" />
                              ) : (
                                <UserCheck size={13} color="#059669" />
                              )}
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <div style={{ width: '80px', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min(100, Math.round(((s.totalSent || 0) / maxStaffSent) * 100))}%`, height: '100%', background: '#059669' }} />
                              </div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {s.totalSent} msgs ({s.deliveryRate}%)
                              </span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#128C7E', whiteSpace: 'nowrap' }}>
                            ₹{Number(s.estimatedCost || 0).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BY PRODUCT */}
          {!usageLoading && breakdownTab === 'product' && (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: '#ffffff' }}>
              {sortedProducts.length === 0 ? (
                <div style={{ padding: '1.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No product activity for this period.
                </div>
              ) : (
                <table style={{ width: '100%', minWidth: '680px', fontSize: '0.78rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border-subtle)', color: '#475569' }}>
                      {renderSortHeader('Product / Service', 'name', productSortField, productSortAsc, () => toggleSort('name', productSortField, productSortAsc, setProductSortField, setProductSortAsc), 'left')}
                      {renderSortHeader('Messages Sent', 'totalSent', productSortField, productSortAsc, () => toggleSort('totalSent', productSortField, productSortAsc, setProductSortField, setProductSortAsc), 'left')}
                      {renderSortHeader('Delivered', 'deliveredCount', productSortField, productSortAsc, () => toggleSort('deliveredCount', productSortField, productSortAsc, setProductSortField, setProductSortAsc), 'center')}
                      {renderSortHeader('Pending', 'pendingCount', productSortField, productSortAsc, () => toggleSort('pendingCount', productSortField, productSortAsc, setProductSortField, setProductSortAsc), 'center')}
                      {renderSortHeader('Failed', 'failedCount', productSortField, productSortAsc, () => toggleSort('failedCount', productSortField, productSortAsc, setProductSortField, setProductSortAsc), 'center')}
                      {renderSortHeader('Delivery Rate', 'deliveryRate', productSortField, productSortAsc, () => toggleSort('deliveryRate', productSortField, productSortAsc, setProductSortField, setProductSortAsc), 'center')}
                      {renderSortHeader('Estimated Cost', 'estimatedCost', productSortField, productSortAsc, () => toggleSort('estimatedCost', productSortField, productSortAsc, setProductSortField, setProductSortAsc), 'right')}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProducts.map((p: any) => {
                      const isSelected = filteredProductOrStaff === p.name;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setFilteredProductOrStaff(isSelected ? null : p.name)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                            transition: 'background 0.1s'
                          }}
                          title="Click row to filter Recent Messages below"
                        >
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Package size={13} color="#0284c7" />
                              <span>{p.name}</span>
                              {isSelected && (
                                <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                  Active Filter
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {renderSentWithBar(p.totalSent, maxProductSent)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#16a34a' }}>
                            {p.deliveredCount}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#d97706' }}>
                            {p.pendingCount}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: p.failedCount > 0 ? 700 : 500, color: p.failedCount > 0 ? '#dc2626' : '#64748b' }}>
                            {p.failedCount}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {renderRateBadge(p.deliveryRate)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#128C7E' }}>
                            ₹{Number(p.estimatedCost || 0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Reconciling TOTAL Row */}
                  <tfoot>
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                      <td style={{ padding: '9px 10px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        TOTAL
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>
                          {(usageData?.totalSent || 0).toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', color: '#16a34a' }}>
                        {(usageData?.deliveredCount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', color: '#d97706' }}>
                        {(usageData?.pendingCount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', color: '#dc2626' }}>
                        {(usageData?.failedCount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        {renderRateBadge(usageData?.deliveryRate || 0)}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: '#128C7E', fontSize: '0.85rem' }}>
                        ₹{(usageData?.estimatedCost || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}

          {/* TAB 3: BY STAFF */}
          {!usageLoading && breakdownTab === 'staff' && (
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: '#ffffff' }}>
              {sortedStaff.length === 0 ? (
                <div style={{ padding: '1.75rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No staff message activity for this period.
                </div>
              ) : (
                <table style={{ width: '100%', minWidth: '680px', fontSize: '0.78rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border-subtle)', color: '#475569' }}>
                      {renderSortHeader('Staff Member', 'name', staffSortField, staffSortAsc, () => toggleSort('name', staffSortField, staffSortAsc, setStaffSortField, setStaffSortAsc), 'left')}
                      {renderSortHeader('Messages Sent', 'totalSent', staffSortField, staffSortAsc, () => toggleSort('totalSent', staffSortField, staffSortAsc, setStaffSortField, setStaffSortAsc), 'left')}
                      {renderSortHeader('Delivered', 'deliveredCount', staffSortField, staffSortAsc, () => toggleSort('deliveredCount', staffSortField, staffSortAsc, setStaffSortField, setStaffSortAsc), 'center')}
                      {renderSortHeader('Pending', 'pendingCount', staffSortField, staffSortAsc, () => toggleSort('pendingCount', staffSortField, staffSortAsc, setStaffSortField, setStaffSortAsc), 'center')}
                      {renderSortHeader('Failed', 'failedCount', staffSortField, staffSortAsc, () => toggleSort('failedCount', staffSortField, staffSortAsc, setStaffSortField, setStaffSortAsc), 'center')}
                      {renderSortHeader('Delivery Rate', 'deliveryRate', staffSortField, staffSortAsc, () => toggleSort('deliveryRate', staffSortField, staffSortAsc, setStaffSortField, setStaffSortAsc), 'center')}
                      {renderSortHeader('Estimated Cost', 'estimatedCost', staffSortField, staffSortAsc, () => toggleSort('estimatedCost', staffSortField, staffSortAsc, setStaffSortField, setStaffSortAsc), 'right')}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStaff.map((s: any) => {
                      const isSelected = filteredProductOrStaff === s.name;
                      const isSystem = s.id === 'system' || s.name === 'System / Automation';
                      return (
                        <tr
                          key={s.id}
                          onClick={() => setFilteredProductOrStaff(isSelected ? null : s.name)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                            transition: 'background 0.1s'
                          }}
                          title="Click row to filter Recent Messages below"
                        >
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {isSystem ? (
                                <Bot size={14} color="#6366f1" />
                              ) : (
                                <UserCheck size={14} color="#059669" />
                              )}
                              <span>{s.name}</span>
                              {isSystem && (
                                <span style={{ fontSize: '0.65rem', background: '#ede9fe', color: '#6d28d9', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                  Automated
                                </span>
                              )}
                              {isSelected && (
                                <span style={{ fontSize: '0.65rem', background: '#dbeafe', color: '#1d4ed8', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                  Active Filter
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            {renderSentWithBar(s.totalSent, maxStaffSent)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#16a34a' }}>
                            {s.deliveredCount}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#d97706' }}>
                            {s.pendingCount}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: s.failedCount > 0 ? 700 : 500, color: s.failedCount > 0 ? '#dc2626' : '#64748b' }}>
                            {s.failedCount}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {renderRateBadge(s.deliveryRate)}
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#128C7E' }}>
                            ₹{Number(s.estimatedCost || 0).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Reconciling TOTAL Row */}
                  <tfoot>
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                      <td style={{ padding: '9px 10px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        TOTAL
                      </td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a' }}>
                          {(usageData?.totalSent || 0).toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', color: '#16a34a' }}>
                        {(usageData?.deliveredCount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', color: '#d97706' }}>
                        {(usageData?.pendingCount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center', color: '#dc2626' }}>
                        {(usageData?.failedCount || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                        {renderRateBadge(usageData?.deliveryRate || 0)}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: '#128C7E', fontSize: '0.85rem' }}>
                        ₹{(usageData?.estimatedCost || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Recent WhatsApp Messages */}
        <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#475569" />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a' }}>
                  Recent WhatsApp Messages
                </span>
                <span style={{ background: '#e2e8f0', color: '#475569', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px' }}>
                  {filteredRecentLogs.length} messages
                </span>
              </div>
              <p style={{ margin: '2px 0 0 24px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Latest messages and delivery status
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {filteredProductOrStaff && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', color: '#1d4ed8' }}>
                  <span>Filter: <strong>{filteredProductOrStaff}</strong></span>
                  <button
                    type="button"
                    onClick={() => setFilteredProductOrStaff(null)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#1d4ed8', display: 'flex', alignItems: 'center' }}
                    title="Clear filter"
                  >
                    <XCircle size={12} />
                  </button>
                </div>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                Showing messages for {dateFrom} → {dateTo}
              </span>
            </div>
          </div>

          <div className="analytics-log-scroll" style={{ maxHeight: '340px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px', background: '#ffffff' }}>
            {filteredRecentLogs.length > 0 ? (
              <table className="rs-card-table" style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid var(--border-subtle)', color: '#475569', fontWeight: 600 }}>
                    <th style={{ padding: '8px 10px' }}>Date &amp; Time</th>
                    <th style={{ padding: '8px 10px' }}>Customer &amp; Product</th>
                    <th style={{ padding: '8px 10px' }}>Message Type</th>
                    <th style={{ padding: '8px 10px' }}>Message</th>
                    <th style={{ padding: '8px 10px' }}>Status</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center', width: '70px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecentLogs.map((log: any, idx: number) => {
                    const st = (log.status || 'SENT').toUpperCase();
                    const isDelivered = st === 'DELIVERED' || st === 'READ';
                    const isFailed = st === 'FAILED';
                    const isPending = !isDelivered && !isFailed;
                    const dateStr = formatMessageDateTime(log.createdAt);

                    return (
                      <tr
                        key={log.id || idx}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                        onClick={() => { setSelectedMessage(log); setShowTechDetails(false); }}
                      >
                        <td className="rs-card-title" style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: '#475569', fontSize: '0.76rem' }}>
                          {dateStr}
                        </td>
                        <td data-label="Customer" className="rs-cell-stack" style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>+{log.to}</div>
                          <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                            <span style={{ color: '#0284c7', fontWeight: 600 }}>{log.productName || 'Unassigned'}</span>
                            <span>•</span>
                            <span>{log.staffName || 'System'}</span>
                          </div>
                        </td>
                        <td data-label="Type" style={{ padding: '8px 10px' }}>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '4px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              background: log.type === 'TEMPLATE' ? '#e0e7ff' : log.type === 'MEDIA' ? '#fef3c7' : '#f1f5f9',
                              color: log.type === 'TEMPLATE' ? '#3730a3' : log.type === 'MEDIA' ? '#92400e' : '#334155'
                            }}
                          >
                            {log.type === 'TEMPLATE' ? 'Template' : log.type === 'MEDIA' ? 'Media' : 'Text'}
                          </span>
                        </td>
                        <td data-label="Message" className="rs-cell-stack" style={{ padding: '8px 10px', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#334155' }} title={log.body}>
                          {log.body || '—'}
                        </td>
                        <td data-label="Status" style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                          {isDelivered && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 700, fontSize: '0.72rem', background: '#dcfce7', padding: '2px 7px', borderRadius: '10px' }}>
                              <CheckCheck size={12} />
                              {st === 'READ' ? 'Read' : 'Delivered'}
                            </span>
                          )}
                          {isPending && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: 700, fontSize: '0.72rem', background: '#fef3c7', padding: '2px 7px', borderRadius: '10px' }}>
                              <Clock size={12} />
                              Pending
                            </span>
                          )}
                          {isFailed && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: 700, fontSize: '0.72rem', background: '#fee2e2', padding: '2px 7px', borderRadius: '10px' }} title={log.error || 'Failed delivery'}>
                              <AlertCircle size={12} />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="rs-card-footer" style={{ padding: '8px 10px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => { setSelectedMessage(log); setShowTechDetails(false); }}
                            style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '6px', cursor: 'pointer' }}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Send size={24} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>No messages found</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem' }}>
                  {searchFilter || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'No messages matched your filter criteria. Try resetting or selecting a different date range.'
                    : 'No messages recorded for this period yet.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Message Details Modal */}
        {selectedMessage && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(3px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem'
            }}
            onClick={() => { setSelectedMessage(null); setShowTechDetails(false); }}
          >
            <div
              className="glass-card"
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '1.5rem',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid var(--border-subtle)',
                position: 'relative'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Message Details
                </h4>
                <button
                  type="button"
                  onClick={() => { setSelectedMessage(null); setShowTechDetails(false); }}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748b' }}
                  title="Close"
                >
                  <XCircle size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.82rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Customer</div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>+{selectedMessage.to}</div>
                </div>

                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Message</div>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-subtle)', whiteSpace: 'pre-wrap', color: '#1e293b', maxHeight: '160px', overflowY: 'auto', lineHeight: '1.4' }}>
                    {selectedMessage.body || '—'}
                  </div>
                </div>

                <div className="rs-collapse-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Status</div>
                    <div>
                      {(() => {
                        const st = (selectedMessage.status || 'SENT').toUpperCase();
                        const isDelivered = st === 'DELIVERED' || st === 'READ';
                        const isFailed = st === 'FAILED';
                        if (isDelivered) {
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 700, fontSize: '0.74rem', background: '#dcfce7', padding: '3px 8px', borderRadius: '10px' }}>
                              <CheckCheck size={13} />
                              {st === 'READ' ? '✓ Read' : '✓ Delivered'}
                            </span>
                          );
                        }
                        if (isFailed) {
                          return (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: 700, fontSize: '0.74rem', background: '#fee2e2', padding: '3px 8px', borderRadius: '10px' }}>
                              <AlertCircle size={13} />
                              Failed
                            </span>
                          );
                        }
                        return (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#d97706', fontWeight: 700, fontSize: '0.74rem', background: '#fef3c7', padding: '3px 8px', borderRadius: '10px' }}>
                            <Clock size={13} />
                            Pending
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Date &amp; Time</div>
                    <div style={{ color: '#334155', fontWeight: 600 }}>
                      {formatMessageDateTime(selectedMessage.createdAt)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Product / Service</div>
                    <div style={{ color: '#0284c7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Package size={13} color="#0284c7" />
                      <span>{selectedMessage.productName || 'Unassigned / Other'}</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Sent By</div>
                    <div style={{ color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {selectedMessage.staffName === 'System / Automation' || !selectedMessage.staffName ? (
                        <>
                          <Bot size={13} color="#6366f1" />
                          <span>{selectedMessage.staffName || 'System / Automation'}</span>
                        </>
                      ) : (
                        <>
                          <UserCheck size={13} color="#059669" />
                          <span>{selectedMessage.staffName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsible Technical Details */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowTechDetails(prev => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 0',
                      color: '#64748b',
                      fontSize: '0.76rem',
                      fontWeight: 600
                    }}
                  >
                    <span>Technical Details</span>
                    <ChevronDown size={14} style={{ transform: showTechDetails ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {showTechDetails && (
                    <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.75rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.74rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '2px' }}>Message ID</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', color: '#334155', wordBreak: 'break-all', fontSize: '0.72rem' }}>
                            {selectedMessage.messageId || 'Pending'}
                          </span>
                          {selectedMessage.messageId && (
                            <button
                              type="button"
                              onClick={() => handleCopyId(selectedMessage.messageId)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: copiedId ? '#16a34a' : '#64748b', display: 'inline-flex', alignItems: 'center' }}
                              title="Copy Message ID"
                            >
                              {copiedId ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                          )}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Message Type: </span>
                        <span style={{ textTransform: 'uppercase', fontWeight: 600, color: '#334155' }}>
                          {selectedMessage.type || 'TEXT'}
                        </span>
                      </div>
                      {selectedMessage.error && (
                        <div>
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>Error: </span>
                          <span style={{ color: '#dc2626' }}>{selectedMessage.error}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setSelectedMessage(null); setShowTechDetails(false); }}
                  style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
