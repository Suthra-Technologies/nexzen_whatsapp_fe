import React from 'react';
import { AlertCircle, ExternalLink, Layers, MessageSquare, Star } from 'lucide-react';
import type { SimulatedMessage } from '../../types';
import { API_BASE } from '../../constants';
import { formatTimeOnly } from '../../utils/dateUtils';
import { ServiceMenuMessage } from './ServiceMenuMessage';

interface SimulatorMessageProps {
  message: SimulatedMessage;
  simulatorPhone: string;
  simulatorName: string;
  setActiveListPayload: (payload: any) => void;
  setListModalOpen: (open: boolean) => void;
}

export const SimulatorMessage: React.FC<SimulatorMessageProps> = ({
  message: m,
  simulatorPhone,
  simulatorName,
  setActiveListPayload,
  setListModalOpen
}) => {
  const isOutbound = m.direction === 'outbound';
  const formattedTime = formatTimeOnly(m.timestamp);

  if (m.type === 'interactive_button' && m.variant === 'service_menu') {
    return (
      <ServiceMenuMessage
        message={m}
        simulatorPhone={simulatorPhone}
        simulatorName={simulatorName}
        formattedTime={formattedTime}
      />
    );
  }

  if (m.type === 'interactive_button') {
    return (
      <div className="phone-interactive-list">
        {m.title && (
          <div className="phone-interactive-header">
            {m.title}
          </div>
        )}
        <div className="phone-interactive-body">
          {m.body}
        </div>
        {m.footer && (
          <div style={{ fontSize: '0.68rem', color: '#8696a0', padding: '0 0.75rem 0.4rem 0.75rem' }}>
            {m.footer}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', padding: '0.4rem 0.6rem 0.6rem 0.6rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {(m.buttons || []).map((btn: any) => (
            <button
              key={btn.id}
              type="button"
              onClick={async () => {
                try {
                  await fetch(`${API_BASE}/simulate/incoming`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      phone: simulatorPhone,
                      name: simulatorName,
                      text: btn.title,
                      type: 'interactive',
                      interactiveReplyId: btn.id
                    })
                  });
                } catch (err) {
                  console.error(err);
                }
              }}
              style={{
                alignSelf: 'stretch',
                background: btn.id === 'btn_explore_services' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                border: btn.id === 'btn_explore_services' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid rgba(59, 130, 246, 0.35)',
                color: btn.id === 'btn_explore_services' ? '#34d399' : '#60a5fa',
                padding: '0.45rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: 600,
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              {btn.id === 'btn_explore_services' ? (
                <Layers size={13} />
              ) : (
                <Star size={12} fill="#60a5fa" />
              )}
              <span>{btn.title}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // WhatsApp "cta_url" button: opens the link directly, nothing is sent back to the business.
  if (m.type === 'interactive_cta_url') {
    return (
      <div className="phone-interactive-list">
        <div className="phone-interactive-body">
          {m.body}
        </div>
        <a
          href={m.url}
          target="_blank"
          rel="noopener noreferrer"
          className="phone-interactive-action"
          style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
        >
          <ExternalLink size={12} style={{ display: 'inline', marginRight: '4px' }} />
          {m.buttonText}
        </a>
      </div>
    );
  }

  if (m.type === 'interactive_list') {
    return (
      <div className="phone-interactive-list">
        <div className="phone-interactive-header">
          {m.title}
        </div>
        <div className="phone-interactive-body">
          {m.body}
        </div>
        <div
          className="phone-interactive-action"
          onClick={() => {
            setActiveListPayload(m);
            setListModalOpen(true);
          }}
        >
          <MessageSquare size={12} style={{ display: 'inline', marginRight: '4px' }} />
          {m.buttonText}
        </div>
      </div>
    );
  }

  // Otherwise, render text message (either user text or admin text)
  const isWelcomeTemplate = isOutbound && m.body && (m.body.includes('Welcome to NexZenTek') || m.body.includes('explore'));
  const cleanBody = (m.body || '').replace(/^[❌⚠️🎫🔒🍎🏡🚧💻🛒👥📈🍲☕📅👋]\s*/, '');

  return (
    <div
      className={`phone-msg ${isOutbound ? 'outbound' : 'inbound'}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        ...(m.status === 'failed' ? { border: '1px solid rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)' } : {})
      }}
    >
      {m.mediaUrl && (
        <div style={{ marginBottom: '4px' }}>
          {(m.type === 'image' || ['.jpg', '.jpeg', '.png', '.webp'].some(ext => (m.mediaUrl || '').toLowerCase().includes(ext))) ? (
            <img
              src={m.mediaUrl.startsWith('http') ? m.mediaUrl : `${API_BASE.replace('/api', '')}${m.mediaUrl}`}
              alt={m.filename || 'Attachment'}
              style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '6px', display: 'block' }}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '6px 8px', borderRadius: '6px' }}>
              <span style={{ fontSize: '0.8rem' }}>📄</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.filename || 'Document.pdf'}
              </span>
            </div>
          )}
        </div>
      )}
      {cleanBody && (!m.mediaUrl || cleanBody !== m.filename) && <div>{cleanBody}</div>}
      {isWelcomeTemplate && (
        <button
          type="button"
          onClick={async () => {
            const clickPayload = {
              phone: simulatorPhone,
              name: simulatorName,
              text: 'Select Product',
              type: 'button'
            };
            try {
              await fetch(`${API_BASE}/simulate/incoming`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clickPayload)
              });
            } catch (err) {
              console.error(err);
            }
          }}
          style={{
            alignSelf: 'stretch',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            padding: '0.5rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontWeight: 600,
            textAlign: 'center',
            marginTop: '0.25rem',
            transition: 'all 0.2s ease'
          }}
        >
          Select Service
        </button>
      )}

      {m.status === 'failed' || m.errorCode ? (
        <div style={{
          background: 'rgba(239, 68, 68, 0.2)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '4px',
          padding: '0.25rem 0.4rem',
          fontSize: '0.7rem',
          color: '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem'
        }}>
          <AlertCircle size={11} /> Message Not Delivered
        </div>
      ) : null}

      <span className="phone-msg-time">{formattedTime}</span>
    </div>
  );
};
