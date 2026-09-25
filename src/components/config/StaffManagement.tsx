import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  ShieldCheck,
  Mail,
  Lock,
  User,
  Check,
  Trash2,
  Edit3,
  X,
  AlertCircle,
  AlertTriangle,
  PackageCheck,
  History,
  Search,
  ChevronDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  UserX,
  Send,
  Eye,
  RefreshCw
} from 'lucide-react';
import type { AdminUser, Product } from '../../types';

interface StaffManagementProps {
  currentUser: AdminUser | null;
  products: Product[];
  apiBase: string;
  getAuthHeaders: () => Record<string, string>;
}

type SortField = 'name' | 'role' | 'status' | 'lastLoginAt' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export const StaffManagement: React.FC<StaffManagementProps> = ({
  currentUser,
  products,
  apiBase,
  getAuthHeaders
}) => {
  const [staffList, setStaffList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'staff'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all');
  const [serviceFilters, setServiceFilters] = useState<string[]>([]);
  const [lastActiveFilter, setLastActiveFilter] = useState<'all' | 'today' | 'week' | 'month' | 'never'>('all');

  // Filter Dropdown Open Toggles
  const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Sorting & Pagination State
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Selection / Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionModal, setBulkActionModal] = useState<'role' | 'services' | 'deactivate' | null>(null);
  const [bulkRole, setBulkRole] = useState<'staff' | 'super_admin'>('staff');
  const [bulkAssignedServices, setBulkAssignedServices] = useState<string[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Modal State (Add / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<AdminUser | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'staff' | 'super_admin'>('staff');
  const [formStatus, setFormStatus] = useState<'active' | 'pending' | 'inactive'>('active');
  const [formAssignedProductIds, setFormAssignedProductIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Deactivate Confirmation Modal
  const [confirmDeactivateUser, setConfirmDeactivateUser] = useState<AdminUser | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  // Delete Confirmation State
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<AdminUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // User Details Drawer State
  const [drawerUser, setDrawerUser] = useState<AdminUser | null>(null);

  // Activity / Audit Log Modal
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Inline expandable services toggle for table
  const [expandedServicesStaffId, setExpandedServicesStaffId] = useState<string | null>(null);

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setOpenFilterDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch staff
  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/admin/staff`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStaffList(data.staff || []);
      } else {
        setError(data.error || 'Failed to load staff list');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching staff members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  // Fetch audit log
  const fetchAuditLog = async () => {
    setAuditLoading(true);
    setAuditError(null);
    try {
      const res = await fetch(`${apiBase}/admin/audit-log?limit=100`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuditLog(data.entries || []);
      } else {
        setAuditError(data.error || 'Failed to load activity log');
      }
    } catch (err: any) {
      setAuditError(err.message || 'Network error fetching activity log');
    } finally {
      setAuditLoading(false);
    }
  };

  const toggleAuditLog = () => {
    const next = !showAuditLog;
    setShowAuditLog(next);
    if (next && auditLog.length === 0) {
      fetchAuditLog();
    }
  };

  const ACTION_LABELS: Record<string, string> = {
    'staff.created': 'Created team member',
    'staff.invited': 'Invited team member',
    'staff.updated': 'Updated team member',
    'staff.role_changed': 'Changed role',
    'staff.services_updated': 'Updated assigned services',
    'staff.activated': 'Activated account',
    'staff.deactivated': 'Deactivated account',
    'staff.deleted': 'Removed team member',
    'staff.bulk_activate': 'Bulk activated',
    'staff.bulk_deactivate': 'Bulk deactivated',
    'staff.bulk_change_role': 'Bulk changed role',
    'staff.bulk_assign_services': 'Bulk assigned services',
    'staff.bulk_resend_invitation': 'Bulk resent invitations'
  };

  // Helper date formatters
  const formatLastActive = (timestamp?: string | null): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Never';

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getDate() === yesterday.getDate() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getFullYear() === yesterday.getFullYear();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;

    const monthStr = date.toLocaleDateString([], { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();

    if (year === now.getFullYear()) {
      return `${monthStr} ${day}, ${timeStr}`;
    }
    return `${monthStr} ${day}, ${year}`;
  };

  const formatAccountDate = (timestamp?: string | null): string => {
    if (!timestamp) return '—';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Summary statistics calculated directly from reliable data
  const stats = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter(s => (s.status || 'active') === 'active').length;
    const pending = staffList.filter(s => s.status === 'pending').length;
    const inactive = staffList.filter(s => s.status === 'inactive').length;
    return { total, active, pending, inactive };
  }, [staffList]);

  // Filtering logic
  const filteredStaff = useMemo(() => {
    return staffList.filter(staff => {
      // 1. Search (Name or Email)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const nameMatch = (staff.name || '').toLowerCase().includes(query);
        const emailMatch = (staff.email || '').toLowerCase().includes(query);
        if (!nameMatch && !emailMatch) return false;
      }

      // 2. Role Filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'super_admin' && staff.role !== 'super_admin') return false;
        if (roleFilter === 'staff' && staff.role === 'super_admin') return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'all') {
        const staffStatus = staff.status || 'active';
        if (staffStatus !== statusFilter) return false;
      }

      // 4. Services Filter (Multi-select)
      if (serviceFilters.length > 0) {
        if (staff.role === 'super_admin') {
          // Super Admins have access to all services
        } else {
          const userServices = staff.assignedProductIds || [];
          const hasAny = serviceFilters.some(sfId => userServices.includes(sfId));
          if (!hasAny) return false;
        }
      }

      // 5. Last Active Filter
      if (lastActiveFilter !== 'all') {
        const lastActive = staff.lastLoginAt;
        if (!lastActive) {
          if (lastActiveFilter !== 'never') return false;
        } else {
          if (lastActiveFilter === 'never') return false;
          const activeDate = new Date(lastActive).getTime();
          const now = Date.now();
          const diffHours = (now - activeDate) / (1000 * 60 * 60);

          if (lastActiveFilter === 'today' && diffHours > 24) return false;
          if (lastActiveFilter === 'week' && diffHours > 24 * 7) return false;
          if (lastActiveFilter === 'month' && diffHours > 24 * 30) return false;
        }
      }

      return true;
    });
  }, [staffList, searchQuery, roleFilter, statusFilter, serviceFilters, lastActiveFilter]);

  // Sorting logic
  const sortedStaff = useMemo(() => {
    return [...filteredStaff].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortField === 'name') {
        valA = (a.name || a.email).toLowerCase();
        valB = (b.name || b.email).toLowerCase();
      } else if (sortField === 'role') {
        valA = a.role === 'super_admin' ? 'a' : 'b';
        valB = b.role === 'super_admin' ? 'a' : 'b';
      } else if (sortField === 'status') {
        valA = a.status || 'active';
        valB = b.status || 'active';
      } else if (sortField === 'lastLoginAt') {
        valA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        valB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      } else if (sortField === 'createdAt') {
        valA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        valB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredStaff, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(sortedStaff.length / pageSize) || 1;
  const paginatedStaff = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStaff.slice(start, start + pageSize);
  }, [sortedStaff, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter, serviceFilters, lastActiveFilter]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    roleFilter !== 'all' ||
    statusFilter !== 'all' ||
    serviceFilters.length > 0 ||
    lastActiveFilter !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setServiceFilters([]);
    setLastActiveFilter('all');
    setOpenFilterDropdown(null);
  };

  // Toggle service selection for filter
  const toggleServiceFilter = (productId: string) => {
    setServiceFilters(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Bulk Selection Handlers
  const handleSelectAllOnPage = () => {
    const pageIds = paginatedStaff.map(s => s.id || (s as any)._id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Open Create / Edit Modal
  const openCreateModal = () => {
    setEditingStaff(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('staff');
    setFormStatus('active');
    setFormAssignedProductIds([]);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (staff: AdminUser) => {
    setEditingStaff(staff);
    setFormName(staff.name || '');
    setFormEmail(staff.email || '');
    setFormPassword('');
    setFormRole((staff.role as 'staff' | 'super_admin') || 'staff');
    setFormStatus(staff.status || 'active');
    setFormAssignedProductIds(staff.assignedProductIds || []);
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    setModalError(null);
  };

  const toggleProductAssignment = (productId: string) => {
    setFormAssignedProductIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const selectAllProducts = () => {
    setFormAssignedProductIds(products.map(p => p.id));
  };

  const deselectAllProducts = () => {
    setFormAssignedProductIds([]);
  };

  // Handle Add / Edit Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!formName.trim()) {
      setModalError('Full name is required');
      return;
    }
    if (!formEmail.trim()) {
      setModalError('Email address is required');
      return;
    }
    if (!editingStaff && !formPassword.trim()) {
      setModalError('A temporary password is required for new accounts');
      return;
    }

    setSubmitting(true);
    try {
      if (editingStaff) {
        const staffId = editingStaff.id || (editingStaff as any)._id;
        const payload: any = {
          name: formName.trim(),
          role: formRole,
          status: formStatus,
          assignedProductIds: formRole === 'super_admin' ? [] : formAssignedProductIds
        };
        if (formPassword.trim()) {
          payload.password = formPassword.trim();
        }

        const res = await fetch(`${apiBase}/admin/staff/${staffId}`, {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSuccessMsg(`Successfully updated ${formName}`);
          setTimeout(() => setSuccessMsg(null), 4000);
          closeModal();
          fetchStaff();
          if (drawerUser && (drawerUser.id === staffId || (drawerUser as any)._id === staffId)) {
            setDrawerUser(data.staff);
          }
        } else {
          setModalError(data.error || 'Failed to update staff member');
        }
      } else {
        const res = await fetch(`${apiBase}/admin/staff`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formName.trim(),
            email: formEmail.trim().toLowerCase(),
            password: formPassword.trim(),
            role: formRole,
            status: formStatus,
            assignedProductIds: formRole === 'super_admin' ? [] : formAssignedProductIds
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSuccessMsg(data.message || `Account created for ${formName}`);
          setTimeout(() => setSuccessMsg(null), 4000);
          closeModal();
          fetchStaff();
        } else {
          setModalError(data.error || 'Failed to create staff member');
        }
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to communicate with server');
    } finally {
      setSubmitting(false);
    }
  };

  // Direct Status Toggle (Activate / Deactivate)
  const handleToggleStatus = async (staff: AdminUser) => {
    const staffId = staff.id || (staff as any)._id;
    const currentStatus = staff.status || 'active';
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

    if (newStatus === 'inactive') {
      setConfirmDeactivateUser(staff);
      return;
    }

    setDeactivatingId(staffId);
    try {
      const res = await fetch(`${apiBase}/admin/staff/${staffId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'active' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Activated ${staff.name}`);
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchStaff();
        if (drawerUser && (drawerUser.id === staffId || (drawerUser as any)._id === staffId)) {
          setDrawerUser({ ...drawerUser, status: 'active' });
        }
      } else {
        setError(data.error || 'Failed to activate staff member');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setDeactivatingId(null);
    }
  };

  // Confirm Deactivation
  const executeDeactivate = async () => {
    if (!confirmDeactivateUser) return;
    const staffId = confirmDeactivateUser.id || (confirmDeactivateUser as any)._id;
    setDeactivatingId(staffId);
    try {
      const res = await fetch(`${apiBase}/admin/staff/${staffId}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'inactive' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Deactivated ${confirmDeactivateUser.name}`);
        setTimeout(() => setSuccessMsg(null), 4000);
        setConfirmDeactivateUser(null);
        fetchStaff();
        if (drawerUser && (drawerUser.id === staffId || (drawerUser as any)._id === staffId)) {
          setDrawerUser({ ...drawerUser, status: 'inactive' });
        }
      } else {
        setError(data.error || 'Failed to deactivate account');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setDeactivatingId(null);
    }
  };

  // Resend Invitation
  const handleResendInvitation = async (staff: AdminUser) => {
    const staffId = staff.id || (staff as any)._id;
    try {
      const res = await fetch(`${apiBase}/admin/staff/bulk`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'resend_invitation',
          ids: [staffId]
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Invitation resent to ${staff.email}`);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setError(data.error || 'Failed to resend invitation');
      }
    } catch (err: any) {
      setError(err.message || 'Error resending invitation');
    }
  };

  // Permanent Delete
  const executePermanentDelete = async () => {
    if (!confirmDeleteUser) return;
    const staffId = confirmDeleteUser.id || (confirmDeleteUser as any)._id;
    setDeletingId(staffId);
    try {
      const res = await fetch(`${apiBase}/admin/staff/${staffId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Permanently removed ${confirmDeleteUser.name}`);
        setTimeout(() => setSuccessMsg(null), 4000);
        setConfirmDeleteUser(null);
        if (drawerUser && (drawerUser.id === staffId || (drawerUser as any)._id === staffId)) {
          setDrawerUser(null);
        }
        fetchStaff();
      } else {
        setError(data.error || 'Failed to remove staff member');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setDeletingId(null);
    }
  };

  // Bulk Actions Executor
  const handleExecuteBulkAction = async (action: string, payload: any = {}) => {
    if (selectedIds.length === 0) return;
    setBulkSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/admin/staff/bulk`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          ids: selectedIds,
          ...payload
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Bulk action completed');
        setTimeout(() => setSuccessMsg(null), 4000);
        setSelectedIds([]);
        setBulkActionModal(null);
        fetchStaff();
      } else {
        setError(data.error || 'Failed to execute bulk action');
      }
    } catch (err: any) {
      setError(err.message || 'Error executing bulk action');
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div className="staff-management-container" style={{ padding: '1.5rem', color: 'var(--text-main)' }}>
      {/* Responsive Styles Injection */}
      <style>{`
        @media (max-width: 800px) {
          .team-access-desktop-table { display: none !important; }
          .team-access-mobile-cards { display: flex !important; }
        }
        @media (min-width: 801px) {
          .team-access-desktop-table { display: block !important; }
          .team-access-mobile-cards { display: none !important; }
        }
      `}</style>

      {/* 1. PAGE HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: '16px',
        padding: '1.5rem 1.75rem',
        marginBottom: '1.5rem',
        boxShadow: 'var(--shadow-subtle)',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '260px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'rgba(37, 152, 0, 0.08)',
            border: '1px solid rgba(37, 152, 0, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#259800',
            flexShrink: 0
          }}>
            <Users size={26} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                Team Access
              </h2>
              {/* Compact Summary Statistics Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: 'rgba(37, 152, 0, 0.08)',
                  color: '#1e7a00',
                  border: '1px solid rgba(37, 152, 0, 0.25)',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px'
                }}>
                  {stats.total} Team Members
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem'
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                  {stats.active} Active
                </span>
                {stats.pending > 0 && (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: '#fffbeb',
                    color: '#92400e',
                    border: '1px solid #fde68a',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#d97706' }} />
                    {stats.pending} Pending
                  </span>
                )}
                {stats.inactive > 0 && (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: '#f8fafc',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />
                    {stats.inactive} Inactive
                  </span>
                )}
              </div>
            </div>
            <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Manage staff, roles, and service access.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            onClick={toggleAuditLog}
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.1rem',
              fontSize: '0.875rem',
              borderRadius: '10px',
              fontWeight: 700
            }}
          >
            <History size={18} />
            {showAuditLog ? 'Hide Activity Log' : 'Activity Log'}
          </button>
          <button
            onClick={openCreateModal}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
              fontSize: '0.875rem',
              borderRadius: '10px',
              fontWeight: 700
            }}
          >
            <UserPlus size={18} />
            Add Team Member
          </button>
        </div>
      </div>

      {/* Activity / Audit Log Panel */}
      {showAuditLog && (
        <div style={{
          marginBottom: '1.5rem',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          background: '#ffffff',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-subtle)'
        }}>
          <div style={{
            padding: '0.85rem 1.25rem',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '0.9rem',
            fontWeight: 750,
            color: '#0f172a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <History size={16} style={{ color: '#259800' }} />
              <span>Access &amp; Staff Activity Log</span>
            </div>
            <button
              onClick={fetchAuditLog}
              disabled={auditLoading}
              title="Refresh log"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              <RefreshCw size={14} className={auditLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
          {auditLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              Loading activity history...
            </div>
          ) : auditError ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#dc2626', fontSize: '0.85rem' }}>
              {auditError}
            </div>
          ) : auditLog.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
              No access management activity recorded yet.
            </div>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {auditLog.map(entry => (
                <div
                  key={entry.id}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderBottom: '1px solid #f1f5f9',
                    fontSize: '0.825rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <strong style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#259800' }} />
                      {ACTION_LABELS[entry.action] || entry.action}
                    </strong>
                    <span style={{ color: '#94a3b8', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                      {formatLastActive(entry.timestamp)}
                    </span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    {entry.details} — <span style={{ color: '#0f172a', fontWeight: 600 }}>{entry.adminName || 'Super Admin'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Global Alerts */}
      {successMsg && (
        <div style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          borderRadius: '10px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          color: '#166534',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <Check size={18} style={{ color: '#16a34a' }} />
          {successMsg}
        </div>
      )}

      {error && (
        <div style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1.25rem',
          borderRadius: '10px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          <AlertCircle size={18} style={{ color: '#dc2626' }} />
          {error}
        </div>
      )}

      {/* 2 & 3. SEARCH & COMPACT FILTER BAR */}
      <div
        ref={filterDropdownRef}
        style={{
          background: '#ffffff',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          boxShadow: 'var(--shadow-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem'
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '220px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem 0.6rem 2.4rem',
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#0f172a',
                fontSize: '0.875rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.65rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* 4. Role Filter */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenFilterDropdown(openFilterDropdown === 'role' ? null : 'role')}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: roleFilter !== 'all' ? '1px solid #259800' : '1px solid var(--border-subtle)',
                  background: roleFilter !== 'all' ? 'rgba(37, 152, 0, 0.08)' : '#ffffff',
                  color: roleFilter !== 'all' ? '#1e7a00' : '#475569',
                  fontSize: '0.825rem',
                  fontWeight: 650,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <span>Role: {roleFilter === 'all' ? 'All Roles' : (roleFilter === 'super_admin' ? 'Super Admin' : 'Product Admin')}</span>
                <ChevronDown size={14} />
              </button>

              {openFilterDropdown === 'role' && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  zIndex: 50,
                  minWidth: '180px',
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  boxShadow: 'var(--shadow-main)',
                  padding: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem'
                }}>
                  {[
                    { id: 'all', label: 'All Roles' },
                    { id: 'super_admin', label: 'Super Admin' },
                    { id: 'staff', label: 'Product Admin' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setRoleFilter(item.id as any);
                        setOpenFilterDropdown(null);
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: roleFilter === item.id ? 'rgba(37, 152, 0, 0.1)' : 'transparent',
                        color: roleFilter === item.id ? '#1e7a00' : '#0f172a',
                        fontWeight: roleFilter === item.id ? 700 : 500,
                        fontSize: '0.825rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      {item.label}
                      {roleFilter === item.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Status Filter */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenFilterDropdown(openFilterDropdown === 'status' ? null : 'status')}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: statusFilter !== 'all' ? '1px solid #259800' : '1px solid var(--border-subtle)',
                  background: statusFilter !== 'all' ? 'rgba(37, 152, 0, 0.08)' : '#ffffff',
                  color: statusFilter !== 'all' ? '#1e7a00' : '#475569',
                  fontSize: '0.825rem',
                  fontWeight: 650,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <span>Status: {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
                <ChevronDown size={14} />
              </button>

              {openFilterDropdown === 'status' && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  zIndex: 50,
                  minWidth: '160px',
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  boxShadow: 'var(--shadow-main)',
                  padding: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem'
                }}>
                  {[
                    { id: 'all', label: 'All Statuses' },
                    { id: 'active', label: 'Active' },
                    { id: 'pending', label: 'Pending' },
                    { id: 'inactive', label: 'Inactive' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setStatusFilter(item.id as any);
                        setOpenFilterDropdown(null);
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: statusFilter === item.id ? 'rgba(37, 152, 0, 0.1)' : 'transparent',
                        color: statusFilter === item.id ? '#1e7a00' : '#0f172a',
                        fontWeight: statusFilter === item.id ? 700 : 500,
                        fontSize: '0.825rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      {item.label}
                      {statusFilter === item.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 6. Service Filter (Multi-select) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenFilterDropdown(openFilterDropdown === 'services' ? null : 'services')}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: serviceFilters.length > 0 ? '1px solid #259800' : '1px solid var(--border-subtle)',
                  background: serviceFilters.length > 0 ? 'rgba(37, 152, 0, 0.08)' : '#ffffff',
                  color: serviceFilters.length > 0 ? '#1e7a00' : '#475569',
                  fontSize: '0.825rem',
                  fontWeight: 650,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <span>
                  Services: {serviceFilters.length === 0 ? 'All' : `${serviceFilters.length} selected`}
                </span>
                <ChevronDown size={14} />
              </button>

              {openFilterDropdown === 'services' && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  zIndex: 50,
                  width: '260px',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  boxShadow: 'var(--shadow-main)',
                  padding: '0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0.5rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.75rem' }}>
                    <span style={{ fontWeight: 700, color: '#64748b' }}>Select Services</span>
                    {serviceFilters.length > 0 && (
                      <button
                        onClick={() => setServiceFilters([])}
                        style={{ background: 'none', border: 'none', color: '#259800', cursor: 'pointer', fontWeight: 600, padding: 0 }}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  {products.map(p => {
                    const isChecked = serviceFilters.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleServiceFilter(p.id)}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          background: isChecked ? 'rgba(37, 152, 0, 0.06)' : 'transparent',
                          fontSize: '0.825rem'
                        }}
                      >
                        <span style={{ color: isChecked ? '#1e7a00' : '#0f172a', fontWeight: isChecked ? 600 : 400 }}>
                          {p.name}
                        </span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          style={{ accentColor: '#259800', cursor: 'pointer' }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 7. Last Active Filter */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setOpenFilterDropdown(openFilterDropdown === 'lastActive' ? null : 'lastActive')}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: lastActiveFilter !== 'all' ? '1px solid #259800' : '1px solid var(--border-subtle)',
                  background: lastActiveFilter !== 'all' ? 'rgba(37, 152, 0, 0.08)' : '#ffffff',
                  color: lastActiveFilter !== 'all' ? '#1e7a00' : '#475569',
                  fontSize: '0.825rem',
                  fontWeight: 650,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  cursor: 'pointer'
                }}
              >
                <span>
                  Last Active: {
                    lastActiveFilter === 'all' ? 'All' :
                    lastActiveFilter === 'today' ? 'Today' :
                    lastActiveFilter === 'week' ? 'This week' :
                    lastActiveFilter === 'month' ? 'This month' : 'Never logged in'
                  }
                </span>
                <ChevronDown size={14} />
              </button>

              {openFilterDropdown === 'lastActive' && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  zIndex: 50,
                  minWidth: '180px',
                  background: '#ffffff',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  boxShadow: 'var(--shadow-main)',
                  padding: '0.4rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem'
                }}>
                  {[
                    { id: 'all', label: 'All Activity' },
                    { id: 'today', label: 'Today' },
                    { id: 'week', label: 'This week' },
                    { id: 'month', label: 'This month' },
                    { id: 'never', label: 'Never logged in' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setLastActiveFilter(item.id as any);
                        setOpenFilterDropdown(null);
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: lastActiveFilter === item.id ? 'rgba(37, 152, 0, 0.1)' : 'transparent',
                        color: lastActiveFilter === item.id ? '#1e7a00' : '#0f172a',
                        fontWeight: lastActiveFilter === item.id ? 700 : 500,
                        fontSize: '0.825rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      {item.label}
                      {lastActiveFilter === item.id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                style={{
                  padding: '0.55rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  background: '#f8fafc',
                  color: '#64748b',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <X size={14} />
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 15. BULK ACTIONS BAR */}
      {selectedIds.length > 0 && (
        <div style={{
          background: '#0f172a',
          color: '#ffffff',
          borderRadius: '12px',
          padding: '0.75rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: 'var(--shadow-main)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              background: '#259800',
              color: '#ffffff',
              padding: '0.2rem 0.65rem',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.78rem'
            }}>
              {selectedIds.length} selected
            </span>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
              Choose an action for selected team members:
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setBulkAssignedServices([]);
                setBulkActionModal('services');
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 650,
                cursor: 'pointer'
              }}
            >
              Assign Services
            </button>
            <button
              onClick={() => {
                setBulkRole('staff');
                setBulkActionModal('role');
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 650,
                cursor: 'pointer'
              }}
            >
              Change Role
            </button>
            <button
              onClick={() => handleExecuteBulkAction('activate')}
              disabled={bulkSubmitting}
              style={{
                background: '#16a34a',
                border: 'none',
                color: '#ffffff',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 650,
                cursor: 'pointer'
              }}
            >
              Activate
            </button>
            <button
              onClick={() => setBulkActionModal('deactivate')}
              style={{
                background: '#dc2626',
                border: 'none',
                color: '#ffffff',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 650,
                cursor: 'pointer'
              }}
            >
              Deactivate
            </button>
            <button
              onClick={() => setSelectedIds([])}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                padding: '0.45rem 0.5rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 8. MAIN TABLE (Desktop & Tablet) */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
          Loading team members...
        </div>
      ) : (
        <>
          <div
            className="team-access-desktop-table"
            style={{
              background: '#ffffff',
              border: '1px solid var(--border-subtle)',
              borderRadius: '14px',
              boxShadow: 'var(--shadow-subtle)',
              overflow: 'hidden'
            }}
          >
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '40px minmax(240px, 1.2fr) minmax(130px, 0.65fr) minmax(110px, 0.55fr) minmax(220px, 1.3fr) minmax(130px, 0.7fr) 100px',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                background: '#f8fafc',
                borderBottom: '1px solid var(--border-subtle)',
                color: '#64748b',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                alignItems: 'center'
              }}
            >
              {/* Header Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={
                    paginatedStaff.length > 0 &&
                    paginatedStaff.every(s => selectedIds.includes(s.id || (s as any)._id))
                  }
                  onChange={handleSelectAllOnPage}
                  style={{ accentColor: '#259800', cursor: 'pointer', width: '16px', height: '16px' }}
                  title="Select all on this page"
                />
              </div>

              <div
                onClick={() => handleSort('name')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', userSelect: 'none' }}
              >
                <span>Team Member</span>
                <ArrowUpDown size={12} style={{ color: sortField === 'name' ? '#259800' : '#cbd5e1' }} />
              </div>

              <div
                onClick={() => handleSort('role')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', userSelect: 'none' }}
              >
                <span>Role</span>
                <ArrowUpDown size={12} style={{ color: sortField === 'role' ? '#259800' : '#cbd5e1' }} />
              </div>

              <div
                onClick={() => handleSort('status')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', userSelect: 'none' }}
              >
                <span>Status</span>
                <ArrowUpDown size={12} style={{ color: sortField === 'status' ? '#259800' : '#cbd5e1' }} />
              </div>

              <span>Assigned Services</span>

              <div
                onClick={() => handleSort('lastLoginAt')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', userSelect: 'none' }}
              >
                <span>Last Active</span>
                <ArrowUpDown size={12} style={{ color: sortField === 'lastLoginAt' ? '#259800' : '#cbd5e1' }} />
              </div>

              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>

            {/* 18. EMPTY STATES */}
            {sortedStaff.length === 0 ? (
              <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  marginBottom: '1rem'
                }}>
                  <Users size={28} />
                </div>
                <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                  {staffList.length === 0
                    ? 'No team members yet.'
                    : searchQuery.trim()
                    ? 'No team members match your search.'
                    : 'No team members match the selected filters.'}
                </h3>
                <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>
                  {staffList.length === 0
                    ? 'Get started by adding your first staff member or administrator.'
                    : 'Try clearing your filters or refining your search keywords.'}
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="btn-secondary"
                    style={{
                      padding: '0.55rem 1.15rem',
                      fontSize: '0.85rem',
                      borderRadius: '8px',
                      fontWeight: 650
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              paginatedStaff.map(staff => {
                const staffId = staff.id || (staff as any)._id;
                const isSuperAdmin = staff.role === 'super_admin';
                const isSelected = selectedIds.includes(staffId);
                const status = staff.status || 'active';

                const assignedList = (staff.assignedProductIds || [])
                  .map(id => products.find(p => p.id === id))
                  .filter((product): product is Product => Boolean(product));
                const visibleAssignedProducts = assignedList.slice(0, 3);
                const hiddenAssignedProducts = assignedList.slice(3);
                const hiddenAssignedCount = assignedList.length - visibleAssignedProducts.length;
                const isServicesExpanded = expandedServicesStaffId === staffId;

                return (
                  <div
                    key={staffId}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '40px minmax(240px, 1.2fr) minmax(130px, 0.65fr) minmax(110px, 0.55fr) minmax(220px, 1.3fr) minmax(130px, 0.7fr) 100px',
                      gap: '0.75rem',
                      alignItems: 'center',
                      padding: '0.9rem 1rem',
                      borderBottom: '1px solid #f1f5f9',
                      background: isSelected ? 'rgba(37, 152, 0, 0.03)' : '#ffffff',
                      borderLeft: isSuperAdmin ? '3px solid #259800' : '3px solid transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    {/* Row Checkbox */}
                    <div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectRow(staffId)}
                        style={{ accentColor: '#259800', cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                    </div>

                    {/* Team Member (Avatar + Name + Email) */}
                    <div
                      onClick={() => setDrawerUser(staff)}
                      style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', minWidth: 0, cursor: 'pointer' }}
                    >
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        background: isSuperAdmin
                          ? 'linear-gradient(135deg, rgba(37, 152, 0, 0.15), rgba(37, 152, 0, 0.05))'
                          : 'linear-gradient(135deg, rgba(37, 152, 0, 0.08), rgba(245, 158, 11, 0.08))',
                        border: isSuperAdmin ? '1px solid rgba(37, 152, 0, 0.3)' : '1px solid var(--border-subtle)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isSuperAdmin ? '#1e7a00' : '#475569',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        flexShrink: 0
                      }}>
                        {staff.name ? staff.name.charAt(0).toUpperCase() : 'U'}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                          <span style={{
                            fontWeight: 750,
                            color: '#0f172a',
                            fontSize: '0.925rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {staff.name}
                          </span>
                          {currentUser?.id === staffId && (
                            <span style={{
                              fontSize: '0.65rem',
                              background: 'rgba(37, 152, 0, 0.1)',
                              color: '#1e7a00',
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              fontWeight: 700,
                              flexShrink: 0
                            }}>
                              You
                            </span>
                          )}
                        </div>
                        <div style={{
                          fontSize: '0.78rem',
                          color: '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          marginTop: '0.15rem',
                          minWidth: 0
                        }}>
                          <Mail size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {staff.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Role */}
                    <div>
                      {isSuperAdmin ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'rgba(37, 152, 0, 0.1)',
                          color: '#1e7a00',
                          border: '1px solid rgba(37, 152, 0, 0.25)',
                          borderRadius: '6px',
                          padding: '0.22rem 0.6rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap'
                        }}>
                          <ShieldCheck size={13} />
                          Super Admin
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'rgba(245, 158, 11, 0.1)',
                          color: '#b45309',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          borderRadius: '6px',
                          padding: '0.22rem 0.6rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap'
                        }}>
                          <Shield size={13} />
                          Product Admin
                        </span>
                      )}
                    </div>

                    {/* 9. Status Display (Subtle Badges) */}
                    <div>
                      {status === 'active' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'rgba(16, 185, 129, 0.08)',
                          color: '#065f46',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          borderRadius: '6px',
                          padding: '0.22rem 0.55rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                          Active
                        </span>
                      )}
                      {status === 'pending' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: 'rgba(245, 158, 11, 0.08)',
                          color: '#92400e',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          borderRadius: '6px',
                          padding: '0.22rem 0.55rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          whiteSpace: 'nowrap'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                          Pending
                        </span>
                      )}
                      {status === 'inactive' && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '0.22rem 0.55rem',
                          fontSize: '0.75rem',
                          fontWeight: 650,
                          whiteSpace: 'nowrap'
                        }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Assigned Services */}
                    <div>
                      {isSuperAdmin ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.78rem',
                          color: '#1e7a00',
                          background: 'rgba(37, 152, 0, 0.08)',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '6px',
                          border: '1px dashed rgba(37, 152, 0, 0.25)',
                          fontWeight: 650
                        }}>
                          <PackageCheck size={14} />
                          Full service access
                        </div>
                      ) : assignedList.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 }}>
                          <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '0.3rem', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
                            {visibleAssignedProducts.map(prod => (
                              <span
                                key={prod.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  fontSize: '0.74rem',
                                  padding: '0.18rem 0.45rem',
                                  borderRadius: '5px',
                                  background: '#f8fafc',
                                  border: '1px solid var(--border-subtle)',
                                  color: '#0f172a',
                                  fontWeight: 500,
                                  maxWidth: '130px',
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <span className={`row-tag ${prod.theme || 'purple'}`} style={{ width: '5px', height: '5px', borderRadius: '50%', padding: 0, flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {prod.name}
                                </span>
                              </span>
                            ))}
                            {hiddenAssignedCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedServicesStaffId(isServicesExpanded ? null : staffId)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  fontSize: '0.74rem',
                                  padding: '0.18rem 0.45rem',
                                  borderRadius: '5px',
                                  background: isServicesExpanded ? 'rgba(37, 152, 0, 0.14)' : 'rgba(37, 152, 0, 0.08)',
                                  border: '1px solid rgba(37, 152, 0, 0.22)',
                                  color: '#1e7a00',
                                  fontWeight: 700,
                                  flexShrink: 0,
                                  whiteSpace: 'nowrap',
                                  cursor: 'pointer'
                                }}
                              >
                                {isServicesExpanded ? 'Less' : `+${hiddenAssignedCount} more`}
                              </button>
                            )}
                          </div>

                          {isServicesExpanded && hiddenAssignedProducts.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                              {hiddenAssignedProducts.map(prod => (
                                <span
                                key={prod.id}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.72rem',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '5px',
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  color: '#334155',
                                  fontWeight: 500
                                }}
                              >
                                <span className={`row-tag ${prod.theme || 'purple'}`} style={{ width: '4px', height: '4px', borderRadius: '50%', padding: 0 }} />
                                <span>{prod.name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '0.75rem',
                        color: '#b45309',
                        background: 'rgba(245, 158, 11, 0.08)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontWeight: 600
                      }}>
                        <AlertCircle size={13} />
                        No services
                      </div>
                    )}
                  </div>

                  {/* 10. Last Active */}
                  <div style={{ fontSize: '0.8rem', color: staff.lastLoginAt ? '#334155' : '#94a3b8', whiteSpace: 'nowrap' }}>
                    {formatLastActive(staff.lastLoginAt)}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.3rem', alignItems: 'center' }}>
                    <button
                      onClick={() => openEditModal(staff)}
                      title="Edit user details"
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                        color: '#475569',
                        borderRadius: '7px',
                        padding: '0.35rem 0.5rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontSize: '0.75rem',
                        fontWeight: 650
                      }}
                    >
                      <Edit3 size={13} />
                      Edit
                    </button>

                    <button
                      onClick={() => setDrawerUser(staff)}
                      title="View user details"
                      style={{
                        background: '#f8fafc',
                        border: '1px solid var(--border-subtle)',
                        color: '#64748b',
                        borderRadius: '7px',
                        padding: '0.35rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 21. RESPONSIVE DESIGN: Mobile User Cards */}
        <div
          className="team-access-mobile-cards"
          style={{
            display: 'none',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          {sortedStaff.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              No team members match your criteria.
            </div>
          ) : (
            paginatedStaff.map(staff => {
              const staffId = staff.id || (staff as any)._id;
              const isSuperAdmin = staff.role === 'super_admin';
              const status = staff.status || 'active';
              const assignedCount = isSuperAdmin ? products.length : (staff.assignedProductIds || []).length;

              return (
                <div
                  key={staffId}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '12px',
                    padding: '1rem',
                    boxShadow: 'var(--shadow-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    borderLeft: isSuperAdmin ? '3px solid #259800' : '3px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 750, color: '#0f172a', fontSize: '0.95rem' }}>
                        {staff.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {staff.email}
                      </div>
                    </div>
                    {status === 'active' ? (
                      <span style={{ fontSize: '0.72rem', background: '#f0fdf4', color: '#166534', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#16a34a' }} />
                        Active
                      </span>
                    ) : status === 'pending' ? (
                      <span style={{ fontSize: '0.72rem', background: '#fffbeb', color: '#92400e', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#d97706' }} />
                        Pending
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#94a3b8' }} />
                        Inactive
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b' }}>
                    <div>
                      <strong style={{ color: '#0f172a' }}>{isSuperAdmin ? 'Super Admin' : 'Product Admin'}</strong>
                      <span> • {isSuperAdmin ? 'All services' : `${assignedCount} service${assignedCount === 1 ? '' : 's'}`}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem' }}>
                      Last active: {formatLastActive(staff.lastLoginAt)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => setDrawerUser(staff)}
                      style={{
                        flex: 1,
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid var(--border-subtle)',
                        background: '#f8fafc',
                        color: '#0f172a',
                        fontWeight: 650,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => openEditModal(staff)}
                      style={{
                        flex: 1,
                        padding: '0.45rem',
                        borderRadius: '6px',
                        border: '1px solid rgba(37, 152, 0, 0.3)',
                        background: 'rgba(37, 152, 0, 0.08)',
                        color: '#1e7a00',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 19. PAGINATION CONTROLS */}
        {sortedStaff.length > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.85rem 1.25rem',
            background: '#f8fafc',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            marginTop: '0.75rem',
            fontSize: '0.825rem',
            color: '#64748b',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div>
                Showing{' '}
                <strong style={{ color: '#0f172a' }}>
                  {Math.min((currentPage - 1) * pageSize + 1, sortedStaff.length)}–
                  {Math.min(currentPage * pageSize, sortedStaff.length)}
                </strong>{' '}
                of <strong style={{ color: '#0f172a' }}>{sortedStaff.length}</strong> team members
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem' }}>Per page:</span>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '0.2rem 0.4rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.75rem',
                    background: '#ffffff'
                  }}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: currentPage === 1 ? '#f1f5f9' : '#ffffff',
                  color: currentPage === 1 ? '#94a3b8' : '#0f172a',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontWeight: 600,
                  fontSize: '0.8rem'
                }}
              >
                <ChevronLeft size={14} />
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    border: currentPage === page ? '1px solid #259800' : '1px solid var(--border-subtle)',
                    background: currentPage === page ? '#259800' : '#ffffff',
                    color: currentPage === page ? '#ffffff' : '#334155',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: currentPage === totalPages ? '#f1f5f9' : '#ffffff',
                  color: currentPage === totalPages ? '#94a3b8' : '#0f172a',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontWeight: 600,
                  fontSize: '0.8rem'
                }}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </>
    )}

      {/* 11. USER DETAILS RIGHT-SIDE DRAWER */}
      {drawerUser && (
        <div
          onClick={() => setDrawerUser(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '440px',
              height: '100%',
              background: '#ffffff',
              boxShadow: '-8px 0 25px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              borderLeft: '1px solid var(--border-subtle)'
            }}
          >
            {/* Drawer Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  {drawerUser.name}
                </h3>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.2rem' }}>
                  {drawerUser.email}
                </div>
                <div style={{ marginTop: '0.65rem' }}>
                  {drawerUser.status === 'active' || !drawerUser.status ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'rgba(16, 185, 129, 0.08)',
                      color: '#065f46',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '6px',
                      padding: '0.22rem 0.55rem',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                      Active
                    </span>
                  ) : drawerUser.status === 'pending' ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'rgba(245, 158, 11, 0.08)',
                      color: '#92400e',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: '6px',
                      padding: '0.22rem 0.55rem',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
                      Pending
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.22rem 0.55rem',
                      fontSize: '0.75rem',
                      fontWeight: 650
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setDrawerUser(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#64748b',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Role Section */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
                  Role
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 750, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  {drawerUser.role === 'super_admin' ? (
                    <>
                      <ShieldCheck size={18} style={{ color: '#259800' }} />
                      Super Admin
                    </>
                  ) : (
                    <>
                      <Shield size={18} style={{ color: '#f59e0b' }} />
                      Product Admin
                    </>
                  )}
                </div>
              </div>

              {/* Assigned Services Section */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.55rem' }}>
                  Assigned Services
                </div>
                {drawerUser.role === 'super_admin' ? (
                  <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(37, 152, 0, 0.06)',
                    border: '1px dashed rgba(37, 152, 0, 0.25)',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#1e7a00',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <PackageCheck size={18} />
                    Unrestricted access across all products &amp; services
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {((drawerUser.assignedProductIds || [])
                      .map(id => products.find(p => p.id === id))
                      .filter(Boolean) as Product[]).map(prod => (
                      <div
                        key={prod.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          background: '#f8fafc',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          color: '#0f172a'
                        }}
                      >
                        <span className={`row-tag ${prod.theme || 'purple'}`} style={{ width: '8px', height: '8px', borderRadius: '50%', padding: 0 }} />
                        <span style={{ fontWeight: 600 }}>{prod.name}</span>
                      </div>
                    ))}
                    {(drawerUser.assignedProductIds || []).length === 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#b45309' }}>
                        No services currently assigned.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Account Timestamps Section */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Account Details
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Created:</span>
                  <strong style={{ color: '#0f172a' }}>{formatAccountDate(drawerUser.createdAt)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: '#64748b' }}>Last active:</span>
                  <strong style={{ color: '#0f172a' }}>{formatLastActive(drawerUser.lastLoginAt)}</strong>
                </div>
              </div>

              {/* Feature Access Section */}
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
                  Feature Access
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {[
                    {
                      label: 'Conversations',
                      granted: true,
                      desc: drawerUser.role === 'super_admin' ? 'All products' : 'Assigned products only'
                    },
                    {
                      label: 'Broadcasts',
                      granted: drawerUser.role === 'super_admin',
                      desc: drawerUser.role === 'super_admin' ? 'Full broadcast management' : 'Restricted to Super Admin'
                    },
                    {
                      label: 'Message Templates',
                      granted: drawerUser.role === 'super_admin',
                      desc: drawerUser.role === 'super_admin' ? 'Full campaign template access' : 'Restricted to Super Admin'
                    },
                    {
                      label: 'Analytics',
                      granted: drawerUser.role === 'super_admin',
                      desc: drawerUser.role === 'super_admin' ? 'Cross-platform metrics' : 'Restricted to Super Admin'
                    }
                  ].map(feat => (
                    <div
                      key={feat.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.55rem 0.75rem',
                        background: '#ffffff',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 650, color: '#0f172a' }}>{feat.label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{feat.desc}</div>
                      </div>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: feat.granted ? 'rgba(37, 152, 0, 0.12)' : '#f1f5f9',
                        color: feat.granted ? '#1e7a00' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {feat.granted ? <Check size={12} /> : <X size={12} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--border-subtle)',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <button
                onClick={() => {
                  const target = drawerUser;
                  setDrawerUser(null);
                  openEditModal(target);
                }}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '0.65rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <Edit3 size={16} />
                Edit User
              </button>

              {drawerUser.status === 'pending' && (
                <button
                  onClick={() => handleResendInvitation(drawerUser)}
                  className="btn-secondary"
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    fontWeight: 650,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem'
                  }}
                >
                  <Send size={15} />
                  Resend Invitation
                </button>
              )}

              {drawerUser.email !== 'admin@nexzentek.com' && (
                <button
                  onClick={() => handleToggleStatus(drawerUser)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: '#ffffff',
                    color: drawerUser.status === 'inactive' ? '#16a34a' : '#dc2626',
                    fontWeight: 650,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem'
                  }}
                >
                  {drawerUser.status === 'inactive' ? (
                    <>
                      <UserCheck size={15} />
                      Activate Account
                    </>
                  ) : (
                    <>
                      <UserX size={15} />
                      Deactivate Account
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 12 & 13. ADD / EDIT USER MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-main)',
            padding: '1.75rem'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(37, 152, 0, 0.08)',
                  border: '1px solid rgba(37, 152, 0, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#259800'
                }}>
                  {editingStaff ? <Edit3 size={18} /> : <UserPlus size={18} />}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingStaff ? `Edit Permissions: ${editingStaff.name}` : 'Add Team Member'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.25rem'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Impact Warning Banner */}
            {editingStaff && (
              <div style={{
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                borderRadius: '8px',
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                color: '#92400e',
                fontSize: '0.825rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.6rem'
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <div>
                  <strong>Role &amp; Service Impact:</strong> Changing this role or removing services will directly modify which areas of the Support Center and customer conversations this person can access.
                </div>
              </div>
            )}

            {modalError && (
              <div style={{
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#dc2626',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 500
              }}>
                <AlertCircle size={16} />
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {/* Full Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Aravind Nerella"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#0f172a',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="email"
                    required
                    disabled={!!editingStaff}
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="name@nexzentek.com"
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                      background: editingStaff ? '#f1f5f9' : '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: editingStaff ? '#64748b' : '#0f172a',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      cursor: editingStaff ? 'not-allowed' : 'text'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  {editingStaff ? 'New Password (Leave blank to keep unchanged)' : 'Temporary Password'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="password"
                    value={formPassword}
                    onChange={e => setFormPassword(e.target.value)}
                    placeholder={editingStaff ? '••••••••' : 'Create temporary password'}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                      background: '#ffffff',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      color: '#0f172a',
                      fontSize: '0.9rem',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Administrative Role Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>
                  Administrative Role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div
                    onClick={() => {
                      if (editingStaff?.email === 'admin@nexzentek.com') return;
                      setFormRole('staff');
                    }}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '10px',
                      cursor: editingStaff?.email === 'admin@nexzentek.com' ? 'not-allowed' : 'pointer',
                      border: formRole === 'staff' ? '1.5px solid #259800' : '1px solid var(--border-subtle)',
                      background: formRole === 'staff' ? 'rgba(37, 152, 0, 0.08)' : '#f8fafc',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: formRole === 'staff' ? '#1e7a00' : '#475569', fontSize: '0.9rem' }}>
                      <Shield size={16} />
                      Product Admin
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                      Restricted to assigned services &amp; customer conversations.
                    </div>
                  </div>

                  <div
                    onClick={() => setFormRole('super_admin')}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: formRole === 'super_admin' ? '1.5px solid #259800' : '1px solid var(--border-subtle)',
                      background: formRole === 'super_admin' ? 'rgba(37, 152, 0, 0.08)' : '#f8fafc',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: formRole === 'super_admin' ? '#1e7a00' : '#475569', fontSize: '0.9rem' }}>
                      <ShieldCheck size={16} />
                      Super Admin
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                      Full access to all services, settings, and team controls.
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Assignment (Only for Product Admin) */}
              {formRole === 'staff' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#334155' }}>
                      Assigned Services ({formAssignedProductIds.length} selected)
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={selectAllProducts}
                        style={{ background: 'transparent', border: 'none', color: '#259800', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        Select All
                      </button>
                      <span style={{ color: '#cbd5e1' }}>•</span>
                      <button
                        type="button"
                        onClick={deselectAllProducts}
                        style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    maxHeight: '190px',
                    overflowY: 'auto',
                    padding: '0.5rem',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    {products.map(p => {
                      const isAssigned = formAssignedProductIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProductAssignment(p.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.55rem 0.75rem',
                            borderRadius: '7px',
                            cursor: 'pointer',
                            background: isAssigned ? '#ffffff' : 'transparent',
                            border: isAssigned ? '1px solid #259800' : '1px solid transparent',
                            boxShadow: isAssigned ? '0 1px 3px rgba(37, 152, 0, 0.1)' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span className={`row-tag ${p.theme || 'purple'}`} style={{ width: '8px', height: '8px', borderRadius: '50%', padding: 0 }} />
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isAssigned ? '#1e7a00' : '#334155' }}>
                                {p.name}
                              </div>
                            </div>
                          </div>

                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '4px',
                            border: isAssigned ? '1.5px solid #259800' : '1.5px solid #cbd5e1',
                            background: isAssigned ? '#259800' : '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff'
                          }}>
                            {isAssigned && <Check size={12} />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Account Status Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Account Status
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[
                    { id: 'active', label: 'Active', desc: 'Can log in immediately' },
                    { id: 'pending', label: 'Pending', desc: 'Pending invite' },
                    { id: 'inactive', label: 'Inactive', desc: 'Temporarily disabled' }
                  ].map(st => {
                    const isSelected = formStatus === st.id;
                    const isDisabled = editingStaff?.email === 'admin@nexzentek.com' && st.id === 'inactive';
                    return (
                      <button
                        key={st.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setFormStatus(st.id as any)}
                        style={{
                          flex: 1,
                          padding: '0.6rem',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid #259800' : '1px solid var(--border-subtle)',
                          background: isSelected ? 'rgba(37, 152, 0, 0.08)' : '#ffffff',
                          color: isSelected ? '#1e7a00' : '#475569',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '0.8rem',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.5 : 1
                        }}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '0.75rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-subtle)'
              }}>
                <div>
                  {editingStaff && editingStaff.email !== 'admin@nexzentek.com' && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteUser(editingStaff);
                        closeModal();
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#dc2626',
                        fontSize: '0.825rem',
                        fontWeight: 650,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Trash2 size={14} />
                      Delete User
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary"
                    style={{
                      padding: '0.6rem 1.4rem',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 700
                    }}
                  >
                    {submitting ? 'Saving...' : (editingStaff ? 'Save Changes' : 'Create Team Member')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 17. DEACTIVATE CONFIRMATION MODAL */}
      {confirmDeactivateUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-main)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <UserX size={22} />
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Deactivate {confirmDeactivateUser.name}?
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
              {confirmDeactivateUser.name} will no longer be able to access the Support Center. Their assigned services and conversation history will be preserved.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setConfirmDeactivateUser(null)}
                className="btn-secondary"
                style={{ padding: '0.6rem 1.15rem', borderRadius: '8px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDeactivate}
                disabled={deactivatingId !== null}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                {deactivatingId !== null ? 'Deactivating...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERMANENT DELETE CONFIRMATION MODAL */}
      {confirmDeleteUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-main)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Trash2 size={22} />
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Permanently Remove User?
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong>{confirmDeleteUser.name}</strong> ({confirmDeleteUser.email})? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="btn-secondary"
                style={{ padding: '0.6rem 1.15rem', borderRadius: '8px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePermanentDelete}
                disabled={deletingId !== null}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                {deletingId !== null ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK ACTION MODALS */}
      {/* 1. Bulk Change Role Modal */}
      {bulkActionModal === 'role' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-main)',
            border: '1px solid var(--border-subtle)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Change Role for {selectedIds.length} Members
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#64748b' }}>
              Select the new administrative role to assign:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div
                onClick={() => setBulkRole('staff')}
                style={{
                  padding: '0.85rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: bulkRole === 'staff' ? '1.5px solid #259800' : '1px solid var(--border-subtle)',
                  background: bulkRole === 'staff' ? 'rgba(37, 152, 0, 0.08)' : '#f8fafc'
                }}
              >
                <div style={{ fontWeight: 700, color: bulkRole === 'staff' ? '#1e7a00' : '#0f172a' }}>
                  Product Admin
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Restricted to assigned services</div>
              </div>

              <div
                onClick={() => setBulkRole('super_admin')}
                style={{
                  padding: '0.85rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: bulkRole === 'super_admin' ? '1.5px solid #259800' : '1px solid var(--border-subtle)',
                  background: bulkRole === 'super_admin' ? 'rgba(37, 152, 0, 0.08)' : '#f8fafc'
                }}
              >
                <div style={{ fontWeight: 700, color: bulkRole === 'super_admin' ? '#1e7a00' : '#0f172a' }}>
                  Super Admin
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Unrestricted system-wide access</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setBulkActionModal(null)}
                className="btn-secondary"
                style={{ padding: '0.6rem 1.15rem', borderRadius: '8px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkSubmitting}
                onClick={() => handleExecuteBulkAction('change_role', { role: bulkRole })}
                className="btn-primary"
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 700 }}
              >
                {bulkSubmitting ? 'Updating...' : 'Apply Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Bulk Assign Services Modal */}
      {bulkActionModal === 'services' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-main)',
            border: '1px solid var(--border-subtle)'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Assign Services to {selectedIds.length} Members
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#64748b' }}>
              Select services to add to the existing permissions of chosen members:
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
              maxHeight: '220px',
              overflowY: 'auto',
              padding: '0.5rem',
              background: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.25rem'
            }}>
              {products.map(p => {
                const isChecked = bulkAssignedServices.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setBulkAssignedServices(prev =>
                        prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                      );
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isChecked ? '#ffffff' : 'transparent',
                      border: isChecked ? '1px solid #259800' : '1px solid transparent',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`row-tag ${p.theme || 'purple'}`} style={{ width: '6px', height: '6px', borderRadius: '50%', padding: 0 }} />
                      <span style={{ fontWeight: isChecked ? 650 : 400, color: isChecked ? '#1e7a00' : '#0f172a' }}>
                        {p.name}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{ accentColor: '#259800', cursor: 'pointer' }}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setBulkActionModal(null)}
                className="btn-secondary"
                style={{ padding: '0.6rem 1.15rem', borderRadius: '8px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkSubmitting || bulkAssignedServices.length === 0}
                onClick={() => handleExecuteBulkAction('assign_services', { assignedProductIds: bulkAssignedServices })}
                className="btn-primary"
                style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 700 }}
              >
                {bulkSubmitting ? 'Assigning...' : `Assign (${bulkAssignedServices.length}) Services`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Bulk Deactivate Confirmation Modal */}
      {bulkActionModal === 'deactivate' && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-main)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <UserX size={22} />
            </div>

            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Deactivate {selectedIds.length} Team Members?
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.5 }}>
              Selected staff members will no longer be able to access the Support Center. Their historical data and assignments will remain intact. (The primary administrator will not be affected).
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setBulkActionModal(null)}
                className="btn-secondary"
                style={{ padding: '0.6rem 1.15rem', borderRadius: '8px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkSubmitting}
                onClick={() => handleExecuteBulkAction('deactivate')}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                {bulkSubmitting ? 'Deactivating...' : 'Deactivate Selected'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
