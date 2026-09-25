import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CircleQuestionMark,
  Inbox,
  Key,
  LogIn,
  LogOut,
  Megaphone,
  MessageSquare,
  Package,
  Sparkles,
  Users,
  Video
} from 'lucide-react';
import React from 'react';
import type { AdminUser } from '../types';

type ConfigSubTab = 'products' | 'templates' | 'settings' | 'analytics' | 'staff';

interface SidebarProps {
  activeTab: 'landing' | 'admin' | 'broadcasts' | 'demos' | 'config' | 'login' | 'help';
  onSelectTab: (tab: 'landing' | 'admin' | 'broadcasts' | 'demos' | 'config' | 'login' | 'help') => void;
  currentUser: AdminUser | null;
  onLogout: () => void;
  backendOnline: boolean;
  openConversationsCount?: number;
  failedConversationsCount?: number;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  configSubTab: ConfigSubTab;
  setConfigSubTab: (tab: ConfigSubTab) => void;
  loadTemplates: () => Promise<void>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  backendOnline,
  openConversationsCount = 0,
  failedConversationsCount = 0,
  collapsed,
  setCollapsed,
  configSubTab,
  setConfigSubTab,
  loadTemplates
}) => {
  const isSuperAdmin = currentUser?.role === 'super_admin';

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-brand-wrapper">
        <div
          className="sidebar-brand"
          onClick={() => onSelectTab(currentUser ? 'admin' : 'login')}
          style={{ cursor: 'pointer' }}
          title={currentUser ? 'Go to Support Center' : 'Go to Staff Login'}
        >
          <div className="sidebar-logo">
            <img src="/32.png" alt="NexZenTek" />
          </div>
          {!collapsed && (
            <div className="sidebar-brand-text">
              <span className="brand-title">NexZen Connect</span>
              <span className="brand-subtitle">Hub &amp; Support</span>
            </div>
          )}
        </div>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Backend Status indicator */}
      {!collapsed && (
        <div className="sidebar-status-banner">
          <span
            className="status-dot"
            style={{
              backgroundColor: backendOnline ? '#10b981' : '#ef4444',
              boxShadow: backendOnline ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
            }}
          />
          <span className="status-label">
            {backendOnline ? 'System Online' : 'Connecting...'}
          </span>
        </div>
      )}

      {/* Navigation Section */}
      <div className="sidebar-nav-section">
        {!collapsed && <div className="nav-group-title">MAIN</div>}

        <nav className="sidebar-nav">
          {/* Internal staff navigation */}
          {currentUser && (
            <>
              {/* Support Center */}
              <button
                type="button"
                className={`sidebar-nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => onSelectTab('admin')}
                title="Support Center (Live Inquiries & Tickets)"
              >
                <div className="nav-icon">
                  <Inbox size={17} />
                  {collapsed && failedConversationsCount > 0 && (
                    <span className="sidebar-icon-alert-dot" title={`${failedConversationsCount} conversation(s) need attention`} />
                  )}
                </div>
                {!collapsed && (
                  <div className="nav-content">
                    <span className="nav-label">Support Center</span>
                    <span className="nav-desc">WhatsApp customer conversations</span>
                  </div>
                )}
                {!collapsed && (
                  <div className="sidebar-badge-group">
                    {failedConversationsCount > 0 && (
                      <span
                        className="sidebar-badge sidebar-badge-alert"
                        title={`${failedConversationsCount} conversation(s) need attention`}
                      >
                        <AlertTriangle size={10} />
                        {failedConversationsCount}
                      </span>
                    )}
                    {openConversationsCount > 0 && (
                      <span className="sidebar-badge">{openConversationsCount}</span>
                    )}
                  </div>
                )}
              </button>

              {/* Broadcast Campaigns */}
              <button
                type="button"
                className={`sidebar-nav-item ${activeTab === 'broadcasts' ? 'active' : ''}`}
                onClick={() => onSelectTab('broadcasts')}
                title="Broadcasts (Promotional & Customer Campaigns)"
              >
                <div className="nav-icon">
                  <Megaphone size={17} />
                </div>
                {!collapsed && (
                  <div className="nav-content">
                    <span className="nav-label">Broadcasts</span>
                    <span className="nav-desc">Promotions &amp; Campaigns</span>
                  </div>
                )}
              </button>

              {/* Demo Requests */}
              <button
                type="button"
                className={`sidebar-nav-item ${activeTab === 'demos' ? 'active' : ''}`}
                onClick={() => onSelectTab('demos')}
                title="Demo Requests"
              >
                <div className="nav-icon">
                  <Video size={17} />
                </div>
                {!collapsed && (
                  <div className="nav-content">
                    <span className="nav-label">Demo Requests</span>
                    <span className="nav-desc">Book a Demo bookings</span>
                  </div>
                )}
              </button>

              {!collapsed && (
                <div className="nav-group-title" style={{ marginTop: '0.6rem' }}>
                  SETTINGS
                </div>
              )}

              {/* Services */}
              <button
                type="button"
                className={`sidebar-nav-item ${activeTab === 'config' && configSubTab === 'products' ? 'active' : ''}`}
                onClick={() => setConfigSubTab('products')}
                title="Services"
              >
                <div className="nav-icon">
                  <Package size={17} />
                </div>
                {!collapsed && (
                  <div className="nav-content">
                    <span className="nav-label">Services</span>
                    <span className="nav-desc">Manage customer services</span>
                  </div>
                )}
              </button>

              {/* Message Templates */}
              <button
                type="button"
                className={`sidebar-nav-item ${activeTab === 'config' && configSubTab === 'templates' ? 'active' : ''}`}
                onClick={() => {
                  setConfigSubTab('templates');
                  loadTemplates();
                }}
                title="Message Templates"
              >
                <div className="nav-icon">
                  <MessageSquare size={17} />
                </div>
                {!collapsed && (
                  <div className="nav-content">
                    <span className="nav-label">Message Templates</span>
                    <span className="nav-desc">Approved WhatsApp messages</span>
                  </div>
                )}
              </button>

              {isSuperAdmin && (
                <>
                  {/* Team Access */}
                  <button
                    type="button"
                    className={`sidebar-nav-item ${activeTab === 'config' && configSubTab === 'staff' ? 'active' : ''}`}
                    onClick={() => setConfigSubTab('staff')}
                    title="Team Access"
                  >
                    <div className="nav-icon">
                      <Users size={17} />
                    </div>
                    {!collapsed && (
                      <div className="nav-content">
                        <span className="nav-label">Team Access</span>
                        <span className="nav-desc">Staff permissions</span>
                      </div>
                    )}
                  </button>

                  {/* Analytics */}
                  <button
                    type="button"
                    className={`sidebar-nav-item ${activeTab === 'config' && configSubTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setConfigSubTab('analytics')}
                    title="Analytics"
                  >
                    <div className="nav-icon">
                      <BarChart3 size={17} />
                    </div>
                    {!collapsed && (
                      <div className="nav-content">
                        <span className="nav-label">Analytics</span>
                        <span className="nav-desc">Usage and delivery stats</span>
                      </div>
                    )}
                  </button>

                  {/* Settings */}
                  <button
                    type="button"
                    className={`sidebar-nav-item ${activeTab === 'config' && configSubTab === 'settings' ? 'active' : ''}`}
                    onClick={() => setConfigSubTab('settings')}
                    title="Settings"
                  >
                    <div className="nav-icon">
                      <Key size={17} />
                    </div>
                    {!collapsed && (
                      <div className="nav-content">
                        <span className="nav-label">Settings</span>
                        <span className="nav-desc">WhatsApp connection</span>
                      </div>
                    )}
                  </button>
                </>
              )}
            </>
          )}
        </nav>
      </div>

      {/* User Section at bottom */}
      <div className="sidebar-footer">
        {currentUser && (
          <button
            type="button"
            className={`sidebar-help-btn ${activeTab === 'help' ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
            onClick={() => onSelectTab('help')}
            title="Help Center"
          >
            <CircleQuestionMark size={15} />
            {!collapsed && <span>Help</span>}
          </button>
        )}
        {currentUser ? (
          <div className={`sidebar-user-card ${collapsed ? 'collapsed' : ''}`}>
            <div className="user-avatar" title={currentUser.name}>
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
            </div>

            {!collapsed && (
              <div className="user-info">
                <span className="user-name" title={currentUser.name}>
                  {currentUser.name}
                </span>
                <span className="user-role-badge" style={{
                  background: currentUser.role === 'super_admin' ? 'rgba(168, 85, 247, 0.18)' : 'rgba(59, 130, 246, 0.18)',
                  color: currentUser.role === 'super_admin' ? '#d8b4fe' : '#93c5fd',
                  borderColor: currentUser.role === 'super_admin' ? 'rgba(168, 85, 247, 0.35)' : 'rgba(59, 130, 246, 0.35)'
                }}>
                  <Sparkles size={10} />
                  {currentUser.role === 'super_admin' ? 'SUPER ADMIN' : 'PRODUCT ADMIN'}
                </span>
              </div>
            )}

            <button
              type="button"
              className="user-logout-btn"
              onClick={onLogout}
              title="Sign Out"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={`sidebar-login-btn ${activeTab === 'login' ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
            onClick={() => onSelectTab('login')}
            title="Staff Login Screen"
          >
            <LogIn size={16} />
            {!collapsed && <span>Staff Login</span>}
          </button>
        )}
      </div>
    </aside>
  );
};
