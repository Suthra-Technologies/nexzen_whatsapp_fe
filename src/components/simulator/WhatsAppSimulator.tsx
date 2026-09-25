import React, { useEffect, useRef, useState } from 'react';
import { PhoneCall, Send, Shield, Smartphone, X } from 'lucide-react';
import type { SimulatedMessage, SimulatedUser } from '../../types';
import { API_BASE } from '../../constants';
import { normalizePhoneNumber } from '../../utils/phoneUtils';
import { wsService } from '../../services/websocket';
import { SimulatorMessage } from './SimulatorMessage';
import { InteractiveListModal } from './InteractiveListModal';

interface WhatsAppSimulatorProps {
  simulatorPhone: string;
  setSimulatorPhone: (phone: string) => void;
  simulatorName: string;
  setSimulatorName: (name: string) => void;
  simulatedUsers: SimulatedUser[];
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  simulatorPhone,
  setSimulatorPhone,
  simulatorName,
  setSimulatorName,
  simulatedUsers
}) => {
  const [simulatorMessages, setSimulatorMessages] = useState<SimulatedMessage[]>([]);
  const [simulatorInput, setSimulatorInput] = useState('');
  const [listModalOpen, setListModalOpen] = useState(false);
  const [activeListPayload, setActiveListPayload] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Real-time WebSocket + Fallback Poll for Simulator Messages
  useEffect(() => {
    if (!simulatorPhone) {
      setSimulatorMessages([]);
      return;
    }

    const fetchSimulatorMessages = async () => {
      try {
        const res = await fetch(`${API_BASE}/simulate/messages?phone=${simulatorPhone}`);
        if (res.ok) {
          const data = await res.json();
          // Sort messages chronologically
          const sorted = data.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          setSimulatorMessages(sorted);
        }
      } catch (e) {
        console.error('Failed to fetch simulator messages', e);
      }
    };

    fetchSimulatorMessages();

    // Listen for real-time simulator push events
    const unsubSimMsg = wsService.on('simulator:message', (payload: any) => {
      const { phone, message } = payload || {};
      const currentNorm = normalizePhoneNumber(simulatorPhone);
      const incomingNorm = normalizePhoneNumber(phone || '');
      if (currentNorm && incomingNorm && currentNorm === incomingNorm && message) {
        setSimulatorMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        });
      }
    });

    const unsubSimClear = wsService.on('simulator:clear', (payload: any) => {
      const { phone } = payload || {};
      const currentNorm = normalizePhoneNumber(simulatorPhone);
      const incomingNorm = normalizePhoneNumber(phone || '');
      if (currentNorm && incomingNorm && currentNorm === incomingNorm) {
        setSimulatorMessages([]);
      }
    });

    const interval = setInterval(fetchSimulatorMessages, 15000);
    return () => {
      clearInterval(interval);
      unsubSimMsg();
      unsubSimClear();
    };
  }, [simulatorPhone]);

  // Auto scroll chats
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [simulatorMessages, listModalOpen]);

  // Clear simulator logs
  const clearSimulatorLogs = async () => {
    if (!simulatorPhone) return;
    try {
      await fetch(`${API_BASE}/simulate/clear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: simulatorPhone })
      });
      setSimulatorMessages([]);
    } catch (e) {
      console.error(e);
    }
  };

  // Simulator: Send Text Message (User typing message on WhatsApp phone)
  const handleSimulatorSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatorInput.trim() || !simulatorPhone) return;

    const textToSend = simulatorInput;
    setSimulatorInput('');

    const userMsgPayload = {
      phone: simulatorPhone,
      name: simulatorName,
      text: textToSend,
      type: 'text'
    };

    try {
      const res = await fetch(`${API_BASE}/simulate/incoming`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMsgPayload)
      });

      if (!res.ok) console.error('Failed to dispatch simulated incoming message');
    } catch (err) {
      console.error(err);
    }
  };

  // Simulator: Handle Click on List Option Row
  const handleSelectProductCTA = async (productId: string, productName: string) => {
    setListModalOpen(false);

    const clickPayload = {
      phone: simulatorPhone,
      name: simulatorName,
      text: `Selected service: ${productName}`,
      type: 'interactive_list_reply',
      interactiveReplyId: productId
    };

    try {
      const res = await fetch(`${API_BASE}/simulate/incoming`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clickPayload)
      });
      if (!res.ok) console.error('Failed to send list click webhook simulation');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="simulator-pane">
      <div className="inspector-header">
        <div className="inspector-title">
          <Smartphone size={14} />
          <span>WHATSAPP LIVE PREVIEW</span>
        </div>
        {simulatorPhone && (
          <button
            onClick={clearSimulatorLogs}
            className="btn-secondary"
            style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
          >
            Clear Chat
          </button>
        )}
      </div>

      {!simulatorPhone ? (
        <div className="enterprise-card simulator-setup-card">
          <PhoneCall size={32} style={{ color: 'var(--color-primary)', margin: '0 auto 1.25rem auto' }} />
          <h3 className="simulator-setup-title">No Phone Selected</h3>
          <p className="simulator-setup-desc">
            Connect your number on the left, or pick an existing conversation to see how messages look on WhatsApp:
          </p>

          {simulatedUsers.length > 0 ? (
            <select
              className="simulator-select"
              onChange={e => {
                const selected = simulatedUsers.find(u => u.phone === e.target.value);
                if (selected) {
                  setSimulatorPhone(selected.phone);
                  setSimulatorName(selected.name);
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>-- Select a Customer Phone --</option>
              {simulatedUsers.map(u => (
                <option key={u.phone} value={u.phone}>+{u.phone} ({u.name})</option>
              ))}
            </select>
          ) : (
            <div style={{ padding: '0.75rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xs)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              No active conversations yet. Connect a number in the directory on the left to start.
            </div>
          )}
        </div>
      ) : (
        <div className="phone-mockup">
          {/* Device Status Bar */}
          <div className="device-status-bar">
            <span>09:41</span>
            <span>5G • 100%</span>
          </div>

          {/* Phone Header */}
          <div className="phone-header">
            <div className="phone-header-avatar">NZ</div>
            <div className="phone-header-info">
              <div className="phone-header-name">NexZen Concierge</div>
              <div className="phone-header-status">+91 97036 39936 • Business Account</div>
            </div>
            <button
              onClick={() => {
                setSimulatorPhone('');
                setSimulatorName('');
                setSimulatorMessages([]);
              }}
              style={{ color: 'var(--text-sub)', cursor: 'pointer', background: 'transparent', border: 'none' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Phone Body / Chats */}
          <div className="phone-screen">
            <div className="phone-chat-body">
              {/* System Header log in chat */}
              <div className="phone-msg system">
                <Shield size={12} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                End-to-end encrypted • Chatting as +{simulatorPhone} ({simulatorName})
              </div>

              {simulatorMessages.map(m => (
                <SimulatorMessage
                  key={m.id}
                  message={m}
                  simulatorPhone={simulatorPhone}
                  simulatorName={simulatorName}
                  setActiveListPayload={setActiveListPayload}
                  setListModalOpen={setListModalOpen}
                />
              ))}

              <div ref={chatEndRef} />
            </div>

            {/* WhatsApp List interactive modal popup */}
            <InteractiveListModal
              isOpen={listModalOpen}
              onClose={() => setListModalOpen(false)}
              activeListPayload={activeListPayload}
              onSelectProductCTA={handleSelectProductCTA}
            />

            {/* Phone Bottom Input box */}
            <form className="phone-input-area" onSubmit={handleSimulatorSend}>
              <input
                type="text"
                className="phone-input-box"
                placeholder="Type a message..."
                value={simulatorInput}
                onChange={e => setSimulatorInput(e.target.value)}
              />
              <button type="submit" className="phone-send-btn" disabled={!simulatorInput.trim()}>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      )}

      {simulatorPhone && (
        <div style={{ marginTop: '0.75rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', width: '340px' }}>
          Viewing as <code style={{ color: '#60a5fa' }}>+{simulatorPhone}</code>. You can test multiple customer numbers simultaneously from the directory.
        </div>
      )}
    </div>
  );
};
