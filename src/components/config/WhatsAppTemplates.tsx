import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  Plus,
  RefreshCw,
  Sparkles,
  XCircle
} from 'lucide-react';
import type { WhatsAppTemplate } from '../../types';
import { API_BASE } from '../../constants';

interface WhatsAppTemplatesProps {
  templates: WhatsAppTemplate[];
  isTemplatesLoading: boolean;
  isSimulatedTemplates: boolean;
  loadTemplates: () => Promise<void>;
  getAuthHeaders: () => Record<string, string>;
}

/**
 * Converts a raw snake_case template name into a clean, human-readable title.
 */
function formatTemplateTitle(rawName: string): string {
  if (!rawName) return 'Custom Template';
  return rawName
    .replace(/^bcast_/, 'Campaign: ')
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Maps Meta categories to friendly purpose descriptions.
 */
function getCategoryPurpose(category: string): string {
  switch (category) {
    case 'MARKETING':
      return 'Promotions, Offers & Announcements';
    case 'UTILITY':
      return 'Account Notices, Orders & Support';
    case 'AUTHENTICATION':
      return 'Security Verification & Passcodes';
    default:
      return 'Customer Communication';
  }
}

export const WhatsAppTemplates: React.FC<WhatsAppTemplatesProps> = ({
  templates,
  isTemplatesLoading,
  isSimulatedTemplates,
  loadTemplates,
  getAuthHeaders
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [tplFormName, setTplFormName] = useState('');
  const [tplFormCategory, setTplFormCategory] = useState('MARKETING');
  const [tplFormLanguage, setTplFormLanguage] = useState('en_US');
  const [tplFormBody, setTplFormBody] = useState('');
  const [isRegisteringTemplate, setIsRegisteringTemplate] = useState(false);
  const [expandedTechnicalId, setExpandedTechnicalId] = useState<string | null>(null);

  const handleRegisterTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplFormName || !tplFormBody) {
      alert('Template name and body text are required');
      return;
    }

    setIsRegisteringTemplate(true);
    try {
      const res = await fetch(`${API_BASE}/admin/templates/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          name: tplFormName,
          category: tplFormCategory,
          language: tplFormLanguage,
          bodyText: tplFormBody
        })
      });
      if (res.ok) {
        await loadTemplates();
        setTplFormName('');
        setTplFormBody('');
        setShowCreateForm(false);
        alert('Template submitted successfully for WhatsApp verification!');
      } else {
        const err = await res.json();
        // Error translation layer: translate raw meta errors into helpful advice
        let friendlyError = err.error || 'Failed to submit template';
        if (friendlyError.includes('already exists')) {
          friendlyError = 'A template with this name already exists. Please pick a distinct name.';
        } else if (friendlyError.includes('variable')) {
          friendlyError = 'Please ensure personalization variables like {{1}} and {{2}} are sequential and valid.';
        }
        alert(friendlyError);
      }
    } catch (e: any) {
      console.error(e);
      alert('We could not prepare this message right now. Please try again in a few minutes.');
    } finally {
      setIsRegisteringTemplate(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span style={{
            fontSize: '0.72rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '999px',
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#059669',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <CheckCircle size={12} />
            <span>Ready</span>
          </span>
        );
      case 'PENDING':
        return (
          <span style={{
            fontSize: '0.72rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '999px',
            background: 'rgba(245, 158, 11, 0.12)',
            color: '#d97706',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <Clock size={12} />
            <span>Preparing</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span style={{
            fontSize: '0.72rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '999px',
            background: 'rgba(239, 68, 68, 0.12)',
            color: '#dc2626',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <AlertCircle size={12} />
            <span>Needs Changes</span>
          </span>
        );
      default:
        return (
          <span style={{
            fontSize: '0.72rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '999px',
            background: 'rgba(107, 114, 128, 0.12)',
            color: '#4b5563',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}>
            <XCircle size={12} />
            <span>Not Available</span>
          </span>
        );
    }
  };

  return (
    <div className="config-templates-view" style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header Row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.85rem'
      }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
            Message Templates
          </h2>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
            Manage WhatsApp message templates used by broadcasts and customer communication.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => loadTemplates()}
            disabled={isTemplatesLoading}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RefreshCw size={13} className={isTemplatesLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowCreateForm(prev => !prev)}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Plus size={14} />
            <span>{showCreateForm ? 'Close Form' : 'Create Template'}</span>
          </button>
        </div>
      </div>

      {/* Helpful Banner for Super Admin */}
      <div style={{
        padding: '0.75rem 1rem',
        background: 'rgba(59, 130, 246, 0.06)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 'var(--radius-xs)',
        fontSize: '0.82rem',
        color: '#1e40af',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem'
      }}>
        <Sparkles size={16} color="#3b82f6" />
        <span>
          <strong>Pro Tip:</strong> To send promotional messages and customer offers, visit the <strong>Broadcasts</strong> tab. The system handles all template requirements automatically for you!
        </span>
      </div>

      {/* Preview mode alert if simulated */}
      {isSimulatedTemplates && (
        <div style={{
          padding: '0.65rem 0.85rem',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.25)',
          borderRadius: 'var(--radius-xs)',
          color: '#b45309',
          fontSize: '0.78rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={14} />
          <span><strong>Simulator Active:</strong> Templates created here can be tested instantly in the live WhatsApp preview.</span>
        </div>
      )}

      {/* Optional Create Template Collapsible Card */}
      {showCreateForm && (
        <div className="glass-card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: '#ffffff' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--text-main)' }}>
            Create New WhatsApp Message Template
          </h3>

          <form onSubmit={handleRegisterTemplate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.85rem', marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Template Name</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. spring_order_confirmation"
                  value={tplFormName}
                  onChange={e => setTplFormName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Purpose</label>
                <select
                  className="form-input"
                  value={tplFormCategory}
                  onChange={e => setTplFormCategory(e.target.value)}
                >
                  <option value="MARKETING">Marketing (Offers, Announcements)</option>
                  <option value="UTILITY">Utility (Order, Account, Support)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Language</label>
                <select
                  className="form-input"
                  value={tplFormLanguage}
                  onChange={e => setTplFormLanguage(e.target.value)}
                >
                  <option value="en_US">English (US)</option>
                  <option value="es_ES">Spanish</option>
                  <option value="pt_BR">Portuguese</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Message Body
              </label>
              <textarea
                required
                className="form-input"
                rows={4}
                placeholder="Hi {{1}}! Thanks for reaching out to NexZen. How can our team assist you today?"
                value={tplFormBody}
                onChange={e => setTplFormBody(e.target.value)}
                style={{ fontSize: '0.88rem' }}
              />
              <span className="field-hint" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Use double curly braces {'{{1}}'}, {'{{2}}'} for dynamic personalization slots.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isRegisteringTemplate}
              >
                {isRegisteringTemplate ? 'Submitting...' : 'Submit to WhatsApp'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
            Registered Templates ({templates.length})
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Approved templates are ready for messaging
          </span>
        </div>

        {templates.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={36} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <p>No message templates found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            {templates.map((tpl: any) => {
              const bodyText = tpl.components?.find((c: any) => c.type === 'BODY')?.text || '';
              const isTechExpanded = expandedTechnicalId === (tpl.id || tpl.name);

              return (
                <div
                  key={tpl.id || tpl.name}
                  className="glass-card"
                  style={{
                    padding: '1rem',
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-xs)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.75rem'
                  }}
                >
                  <div>
                    {/* Top: Title & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text-main)' }}>
                        {formatTemplateTitle(tpl.name)}
                      </strong>
                      {getStatusBadge(tpl.status)}
                    </div>

                    {/* Purpose Subtitle */}
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
                      {getCategoryPurpose(tpl.category)}
                    </div>

                    {/* Clean Message Box */}
                    <div style={{
                      fontSize: '0.82rem',
                      lineHeight: 1.45,
                      padding: '0.65rem 0.75rem',
                      background: '#f8fafc',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      whiteSpace: 'pre-wrap',
                      color: '#334155',
                      maxHeight: '120px',
                      overflowY: 'auto'
                    }}>
                      {bodyText || 'No text content available'}
                    </div>

                    {/* Rejection Notice if rejected */}
                    {tpl.status === 'REJECTED' && (
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.5rem 0.65rem',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '4px',
                        fontSize: '0.74rem',
                        color: '#b91c1c'
                      }}>
                        Message needs changes before WhatsApp can deliver it. Please revise wording to adhere to business messaging policies.
                      </div>
                    )}
                  </div>

                  {/* Technical Details Accordion */}
                  <div style={{
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: '0.5rem'
                  }}>
                    <button
                      type="button"
                      onClick={() => setExpandedTechnicalId(isTechExpanded ? null : (tpl.id || tpl.name))}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%'
                      }}
                    >
                      <span>Technical Details</span>
                      {isTechExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {isTechExpanded && (
                      <div style={{
                        marginTop: '0.45rem',
                        padding: '0.45rem 0.65rem',
                        background: '#f1f5f9',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        color: '#475569'
                      }}>
                        <div><strong>API Name:</strong> {tpl.name}</div>
                        <div><strong>Meta ID:</strong> {tpl.id || 'N/A'}</div>
                        <div><strong>Category:</strong> {tpl.category}</div>
                        <div><strong>Language:</strong> {tpl.language}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
