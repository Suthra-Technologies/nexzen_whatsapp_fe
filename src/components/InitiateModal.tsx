import React, { useEffect, useMemo } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { COUNTRY_DIAL_OPTIONS } from '../constants';
import { parsePhoneAndCountry } from '../utils/phoneUtils';
import type { WhatsAppTemplate } from '../types';

interface InitiateModalProps {
  isOpen: boolean;
  onClose: () => void;
  displayProducts: any[];
  templates: WhatsAppTemplate[];
  initiatePhone: string;
  setInitiatePhone: (val: string) => void;
  initiateCountryCode: string;
  setInitiateCountryCode: (val: string) => void;
  initiateName: string;
  setInitiateName: (val: string) => void;
  initiateProductId: string;
  setInitiateProductId: (val: string) => void;
  initiateMessageType: 'template' | 'custom';
  setInitiateMessageType: (val: 'template' | 'custom') => void;
  initiateTemplateName: string;
  setInitiateTemplateName: (val: string) => void;
  initiateTemplateParams: string[];
  setInitiateTemplateParams: (val: string[]) => void;
  initiateCustomMessage: string;
  setInitiateCustomMessage: (val: string) => void;
  initiateIsSending: boolean;
  handleInitiateConversation: (e: React.FormEvent) => void;
}

// Templates from the fallback/example list (only used when the real catalog hasn't loaded yet)
// don't have real body text to inspect, so their variable counts are hardcoded here as a
// reasonable guess based on the sample templates originally shipped in this list.
const FALLBACK_TEMPLATE_VARIABLE_COUNTS: Record<string, number> = {
  nexzentek_service_welcome: 1,
  delivery_confirmation_1: 2,
  order_status_update: 2,
  sample_utility_notification: 2,
  account_update_alert: 0,
  hello_world: 0
};

export const InitiateModal: React.FC<InitiateModalProps> = ({
  isOpen,
  onClose,
  displayProducts,
  templates,
  initiatePhone,
  setInitiatePhone,
  initiateCountryCode,
  setInitiateCountryCode,
  initiateName,
  setInitiateName,
  initiateProductId,
  setInitiateProductId,
  initiateMessageType,
  setInitiateMessageType,
  initiateTemplateName,
  setInitiateTemplateName,
  initiateTemplateParams,
  setInitiateTemplateParams,
  initiateCustomMessage,
  setInitiateCustomMessage,
  initiateIsSending,
  handleInitiateConversation
}) => {
  const selectedTemplate = templates.find(t => t.name === initiateTemplateName);
  const templateBodyText = selectedTemplate?.components?.find(c => c.type === 'BODY')?.text || '';

  // Count real {{n}} placeholders in the template's actual body, falling back to a guess
  // only for the hardcoded example list shown when no real templates have loaded yet.
  const variableCount = useMemo(() => {
    if (selectedTemplate) {
      const indices = Array.from(templateBodyText.matchAll(/\{\{\s*(\d+)\s*\}\}/g)).map(
        (m: any) => parseInt(m[1], 10)
      );
      return indices.length > 0 ? Math.max(...indices) : 0;
    }
    return FALLBACK_TEMPLATE_VARIABLE_COUNTS[initiateTemplateName] ?? 1;
  }, [selectedTemplate, templateBodyText, initiateTemplateName]);

  // Resize the params array whenever the selected template (and its variable count) changes,
  // so stale values from a previously selected template never leak into the new one.
  useEffect(() => {
    if (initiateMessageType !== 'template') return;
    setInitiateTemplateParams(
      Array.from({ length: variableCount }, (_, i) => initiateTemplateParams[i] || '')
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initiateTemplateName, variableCount, initiateMessageType]);

  const handleParamChange = (index: number, value: string) => {
    const next = [...initiateTemplateParams];
    next[index] = value;
    setInitiateTemplateParams(next);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div className="enterprise-card" style={{
        width: '100%',
        maxWidth: '520px',
        maxHeight: 'calc(100vh - 2rem)',
        overflowY: 'auto',
        padding: '1.5rem',
        background: '#ffffff',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-main)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: '-1.5rem', background: '#ffffff', paddingTop: '1.5rem', marginTop: '-1.5rem', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ padding: '6px', background: 'rgba(37, 152, 0, 0.08)', color: '#259800', borderRadius: 'var(--radius-xs)' }}>
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>Start WhatsApp Conversation</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-sub)' }}>Send a template message or reach out directly to customer</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleInitiateConversation}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Phone Number *</label>
            <div className="phone-input-wrapper">
              <select
                className="country-code-select"
                value={initiateCountryCode}
                onChange={e => setInitiateCountryCode(e.target.value)}
                title="Select Country Code"
              >
                {COUNTRY_DIAL_OPTIONS.map(opt => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                className="form-input"
                style={{ flexGrow: 1 }}
                placeholder={COUNTRY_DIAL_OPTIONS.find(o => o.code === initiateCountryCode)?.placeholder || '404 555 0199'}
                value={initiatePhone}
                onChange={e => {
                  const val = e.target.value;
                  // If user pasted or typed full number with country code (e.g. +91... or 919347708120)
                  if (val.startsWith('+') || (val.replace(/\D/g, '').length >= 11 && !val.includes(' '))) {
                    const parsed = parsePhoneAndCountry(val);
                    if (parsed.countryCode !== 'other' || val.startsWith('+')) {
                      setInitiateCountryCode(parsed.countryCode);
                      setInitiatePhone(parsed.nationalNumber);
                      return;
                    }
                  }
                  setInitiatePhone(val);
                }}
              />
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {initiateCountryCode === 'other'
                ? 'Enter full international number with country code.'
                : `Enter ${COUNTRY_DIAL_OPTIONS.find(o => o.code === initiateCountryCode)?.hint || 'phone number'} (${initiateCountryCode} added automatically).`}
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Customer Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Rahul Sharma"
              value={initiateName}
              onChange={e => setInitiateName(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Team</label>
            <select
              className="form-input"
              value={initiateProductId}
              onChange={e => setInitiateProductId(e.target.value)}
            >
              {displayProducts.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Message Type</label>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                <input
                  type="radio"
                  name="msgType"
                  checked={initiateMessageType === 'template'}
                  onChange={() => setInitiateMessageType('template')}
                  style={{ accentColor: '#259800' }}
                />
                Template Message
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                <input
                  type="radio"
                  name="msgType"
                  checked={initiateMessageType === 'custom'}
                  onChange={() => setInitiateMessageType('custom')}
                  style={{ accentColor: '#259800' }}
                />
                Direct Message
              </label>
            </div>
          </div>

          {initiateMessageType === 'template' ? (
            <>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Select Message Template</label>
                <select
                  className="form-input"
                  value={initiateTemplateName}
                  onChange={e => setInitiateTemplateName(e.target.value)}
                >
                  {templates.length > 0 ? (
                    templates.map(t => (
                      <option key={t.id || t.name} value={t.name} disabled={t.status === 'REJECTED'}>
                        {t.name} ({t.category} - {t.language}){t.status === 'REJECTED' ? ' — Rejected by Meta, cannot send' : t.status === 'PENDING' ? ' — Pending approval' : ''}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="nexzentek_service_welcome">nexzentek_service_welcome (Welcome & Interactive Menu)</option>
                      <option value="delivery_confirmation_1">delivery_confirmation_1 (Delivery Confirmation)</option>
                      <option value="order_status_update">order_status_update (Order Status Update)</option>
                      <option value="sample_utility_notification">sample_utility_notification (Account & Service Update)</option>
                      <option value="account_update_alert">account_update_alert (Important Account Notice)</option>
                      <option value="hello_world">hello_world (Greeting)</option>
                    </>
                  )}
                </select>
              </div>

              {templateBodyText && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Message Preview</label>
                  <div style={{
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                    padding: '0.65rem 0.75rem',
                    background: '#f8fafc',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text-main)'
                  }}>
                    {templateBodyText}
                  </div>
                </div>
              )}

              {variableCount > 0 ? (
                Array.from({ length: variableCount }, (_, i) => (
                  <div className="form-group" style={{ marginBottom: '1rem' }} key={i}>
                    <label className="form-label">{`Variable {{${i + 1}}}`}{i === 0 ? ' (usually the customer\'s name)' : ''}</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={i === 0 ? (initiateName || 'Customer Name') : `Value for {{${i + 1}}}`}
                      value={initiateTemplateParams[i] || ''}
                      onChange={e => handleParamChange(i, e.target.value)}
                    />
                  </div>
                ))
              ) : selectedTemplate ? (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  This template has no variables to fill in.
                </p>
              ) : null}
            </>
          ) : (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Message *</label>
              <textarea
                required
                rows={3}
                className="form-input"
                placeholder="Type your message to the customer..."
                value={initiateCustomMessage}
                onChange={e => setInitiateCustomMessage(e.target.value)}
              />
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '1.5rem',
            paddingTop: '1rem',
            paddingBottom: '0.25rem',
            borderTop: '1px solid var(--border-subtle)',
            position: 'sticky',
            bottom: '-1.5rem',
            background: '#ffffff',
            marginBottom: '-1.5rem'
          }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              style={{ width: 'auto', padding: '0.6rem 1.25rem', marginTop: 0 }}
              disabled={initiateIsSending}
            >
              {initiateIsSending ? 'Sending Message...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
