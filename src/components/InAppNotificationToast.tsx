import React from 'react';
import { MessageSquare, X, ArrowRight } from 'lucide-react';

export interface InAppNotificationItem {
  id: string;
  conversationId: string;
  senderName: string;
  phone: string;
  text: string;
  messageType?: string;
  timestamp: number;
}

interface InAppNotificationToastProps {
  notifications: InAppNotificationItem[];
  onDismiss: (id: string) => void;
  onSelect: (conversationId: string) => void;
}

export const InAppNotificationToast: React.FC<InAppNotificationToastProps> = ({
  notifications,
  onDismiss,
  onSelect
}) => {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="in-app-notif-container" aria-live="polite">
      {notifications.map((item) => {
        let preview = item.text || '';
        if (item.messageType === 'sticker') preview = 'Sent a sticker';
        else if (item.messageType === 'image') preview = preview ? `📷 ${preview}` : '📷 Sent a photo';
        else if (item.messageType === 'document') preview = `📄 ${preview || 'Document attachment'}`;
        else if (item.messageType === 'audio') preview = '🎵 Voice message';

        return (
          <div
            key={item.id}
            className="in-app-notif-card"
            onClick={() => {
              onSelect(item.conversationId);
              onDismiss(item.id);
            }}
            role="button"
            tabIndex={0}
            title="Click to view conversation"
          >
            {/* Top row: Brand / WhatsApp badge & Time */}
            <div className="in-app-notif-header">
              <div className="in-app-notif-badge">
                <span className="in-app-notif-pulse-dot" />
                <MessageSquare size={13} className="in-app-notif-icon" />
                <span>New WhatsApp Message</span>
              </div>
              <button
                type="button"
                className="in-app-notif-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(item.id);
                }}
                title="Dismiss"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>

            {/* Body: Avatar + Details */}
            <div className="in-app-notif-body">
              <div className="in-app-notif-avatar">
                {(item.senderName || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="in-app-notif-content">
                <div className="in-app-notif-sender">
                  <span className="in-app-notif-name">{item.senderName || 'Customer'}</span>
                  {item.phone && (
                    <span className="in-app-notif-phone">+{item.phone}</span>
                  )}
                </div>
                <div className="in-app-notif-text">
                  {preview}
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="in-app-notif-footer">
              <span className="in-app-notif-action-hint">
                Open in Support Center <ArrowRight size={12} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
