import React from 'react';
import { Bell, BellOff, BellRing, Menu, MoreVertical, Volume2, VolumeX } from 'lucide-react';
import type { AdminUser } from '../types';
import { notificationService } from '../utils/notificationService';
import { NotificationBell } from './notifications/NotificationBell';

interface HeaderProps {
  activeTab: 'landing' | 'admin' | 'broadcasts' | 'demos' | 'config' | 'login' | 'help';
  backendOnline: boolean;
  // WhatsApp preview toggle paused for now.
  // simulatorOpen: boolean;
  // setSimulatorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  currentUser?: AdminUser | null;
  getAuthHeaders?: () => Record<string, string>;
  onNavigate?: (path: string) => void;
  /** Mobile layout: menu button + brand + bell, with sound/alert controls in an overflow menu. */
  compact?: boolean;
  navOpen?: boolean;
  onOpenNav?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  backendOnline,
  currentUser,
  getAuthHeaders,
  onNavigate,
  compact = false,
  navOpen = false,
  onOpenNav
}) => {
  const [soundOn, setSoundOn] = React.useState(notificationService.isSoundEnabled());
  const [perm, setPerm] = React.useState<NotificationPermission>(notificationService.getPermissionStatus());
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreRef = React.useRef<HTMLDivElement>(null);

  // Close the mobile overflow menu on outside click / Escape, or when leaving mobile layout.
  React.useEffect(() => {
    if (!moreOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [moreOpen]);

  React.useEffect(() => {
    if (!compact) setMoreOpen(false);
  }, [compact]);

  const handleToggleSound = () => {
    const next = !soundOn;
    notificationService.setSoundEnabled(next);
    setSoundOn(next);
    if (next) {
      notificationService.playNotificationSound();
    }
  };

  const handleRequestNotifications = async () => {
    const res = await notificationService.requestPermission();
    setPerm(res);
    if (res === 'granted') {
      notificationService.playNotificationSound();
      notificationService.showDesktopNotification({
        title: 'Desktop Alerts Enabled 🎉',
        body: 'You will receive instant alerts when customers message you on WhatsApp.',
        tag: 'welcome_alert'
      });
      window.dispatchEvent(new CustomEvent('test-in-app-notif'));
    }
  };

  const handleTestNotification = () => {
    notificationService.playNotificationSound();
    notificationService.showDesktopNotification({
      title: 'NexZen Connect Test Alert 🔔',
      body: 'Notifications and sound chime are working perfectly!',
      tag: 'test_alert'
    });
    window.dispatchEvent(new CustomEvent('test-in-app-notif'));
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'landing':
        return 'Explore Services & Public Catalog';
      case 'admin':
        return 'Support Center';
      case 'broadcasts':
        return 'Broadcast Campaigns';
      case 'demos':
        return 'Demo Requests';
      case 'config':
        return 'Settings';
      case 'help':
        return 'Help Center';
      case 'login':
        return 'Staff Sign In';
      default:
        return 'NexZen Connect Hub';
    }
  };

  const soundButton = (
    <button
      type="button"
      className={`notif-header-btn ${soundOn ? 'sound-on' : 'sound-off'}`}
      onClick={handleToggleSound}
      title={soundOn ? 'Notification sound on (Click to mute)' : 'Notification sound muted (Click to unmute)'}
    >
      {soundOn ? <Volume2 size={13} /> : <VolumeX size={13} />}
      <span>{soundOn ? 'Sound On' : 'Muted'}</span>
    </button>
  );

  const alertsButton = perm !== 'granted' ? (
    <button
      type="button"
      className={`notif-header-btn ${perm === 'denied' ? 'notif-blocked' : 'notif-enable-btn'}`}
      onClick={handleRequestNotifications}
      title={perm === 'denied' ? 'Desktop notifications blocked in browser settings' : 'Enable desktop push notifications'}
    >
      {perm === 'denied' ? <BellOff size={13} /> : <Bell size={13} />}
      <span>{perm === 'denied' ? 'Alerts Blocked' : 'Enable Alerts'}</span>
    </button>
  ) : (
    <button
      type="button"
      className="notif-header-btn notif-active-btn"
      onClick={handleTestNotification}
      title="Desktop alerts active. Click to test sound & desktop notification."
    >
      <BellRing size={13} />
      <span>Alerts Active</span>
    </button>
  );

  return (
    <header className={`app-header${compact ? ' app-header-compact' : ''}`}>
      {compact && (
        <button
          type="button"
          className="app-menu-btn"
          onClick={onOpenNav}
          aria-label="Open navigation"
          aria-expanded={navOpen}
          aria-controls="app-sidebar"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Active Area Breadcrumb */}
      <div className="header-breadcrumbs">
        <span className="breadcrumb-root">NexZen Hub</span>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-active">{getTabTitle()}</span>
        <span
          className="brand-status-dot"
          title={backendOnline ? 'System Online' : 'Connecting...'}
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: backendOnline ? '#10b981' : '#ef4444',
            display: 'inline-block',
            marginLeft: '8px',
            boxShadow: backendOnline ? '0 0 6px rgba(16, 185, 129, 0.4)' : 'none'
          }}
        />
      </div>

      {/* Right Actions */}
      <div className="header-actions">
        {/* Notification Center */}
        {currentUser && getAuthHeaders && (
          <NotificationBell
            currentUser={currentUser}
            getAuthHeaders={getAuthHeaders}
            onNavigate={onNavigate || (() => {})}
          />
        )}

        {compact ? (
          /* Mobile: sound + alert controls live in an overflow menu */
          <div className="header-more" ref={moreRef}>
            <button
              type="button"
              className="notif-header-btn header-more-btn"
              onClick={() => setMoreOpen(open => !open)}
              aria-label="More options"
              aria-haspopup="true"
              aria-expanded={moreOpen}
            >
              <MoreVertical size={16} />
            </button>
            {moreOpen && (
              <div className="header-more-menu" role="group" aria-label="Notification settings">
                {soundButton}
                {alertsButton}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Audio notification toggle */}
            {soundButton}
            {/* Desktop push notification button */}
            {alertsButton}
          </>
        )}

        {/* WhatsApp preview toggle paused for now.
        <button
          type="button"
          className={`simulator-toggle-btn ${simulatorOpen ? 'active' : ''}`}
          onClick={() => setSimulatorOpen(prev => !prev)}
          title="Toggle WhatsApp Live Preview"
        >
          <Smartphone size={14} />
          <span>WhatsApp Preview ({simulatorOpen ? 'Open' : 'Hidden'})</span>
        </button>
        */}
      </div>
    </header>
  );
};
