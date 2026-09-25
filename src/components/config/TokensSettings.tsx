import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Key,
  RefreshCw,
  Shield
} from 'lucide-react';
import type { MetaSettings } from '../../types';
import { API_BASE } from '../../constants';

interface TokensSettingsProps {
  getAuthHeaders: () => Record<string, string>;
}

export const TokensSettings: React.FC<TokensSettingsProps> = ({ getAuthHeaders }) => {
  const [settingsForm, setSettingsForm] = useState<MetaSettings>({
    META_APP_ID: '',
    META_APP_SECRET: '',
    WHATSAPP_ACCESS_TOKEN: '',
    WHATSAPP_PHONE_NUMBER_ID: '',
    WHATSAPP_WABA_ID: '',
    WHATSAPP_VERIFY_TOKEN: '',
    WHATSAPP_WELCOME_TEMPLATE: ''
  });
  const [activeMode, setActiveMode] = useState<'sandbox' | 'live'>(() => {
    return (localStorage.getItem('nexzen_active_meta_mode') as 'sandbox' | 'live') || 'live';
  });
  const [profiles, setProfiles] = useState<{ live?: MetaSettings; sandbox?: MetaSettings }>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSwitching, setSettingsSwitching] = useState(false);
  const [settingsTesting, setSettingsTesting] = useState(false);
  const [settingsTestResult, setSettingsTestResult] = useState<{
    success: boolean;
    message?: string;
    data?: any;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('nexzen_meta_test_result');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [copiedSettingKey, setCopiedSettingKey] = useState<string | null>(null);

  const loadSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const mode = (data.activeMode as 'sandbox' | 'live') || 'live';
        setActiveMode(mode);
        localStorage.setItem('nexzen_active_meta_mode', mode);
        if (data.profiles) {
          setProfiles(data.profiles);
        }
        if (data.settings) {
          const formValues: MetaSettings = {
            META_APP_ID: data.settings.META_APP_ID || '',
            META_APP_SECRET: data.settings.META_APP_SECRET || '',
            WHATSAPP_ACCESS_TOKEN: data.settings.WHATSAPP_ACCESS_TOKEN || data.settings.WHATSAPP_TOKEN || '',
            WHATSAPP_PHONE_NUMBER_ID: data.settings.WHATSAPP_PHONE_NUMBER_ID || '',
            WHATSAPP_WABA_ID: data.settings.WHATSAPP_WABA_ID || '',
            WHATSAPP_VERIFY_TOKEN: data.settings.WHATSAPP_VERIFY_TOKEN || 'pos_whatsapp_verify_token',
            WHATSAPP_WELCOME_TEMPLATE: data.settings.WHATSAPP_WELCOME_TEMPLATE || 'nexzentek_service_welcome'
          };
          setSettingsForm(formValues);

          if (data.connectionStatus && data.connectionStatus.success) {
            setSettingsTestResult(data.connectionStatus);
            localStorage.setItem('nexzen_meta_test_result', JSON.stringify(data.connectionStatus));
          } else if (formValues.WHATSAPP_ACCESS_TOKEN && formValues.WHATSAPP_PHONE_NUMBER_ID) {
            // Silently verify connection with Meta and persist status
            handleTestConnection(formValues);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleSwitchMode = async (mode: 'sandbox' | 'live') => {
    if (mode === activeMode || settingsSwitching) return;
    setSettingsSwitching(true);
    setSettingsTestResult(null);

    // Immediate UI update with cached profile
    if (profiles[mode]) {
      const cached = profiles[mode]!;
      setSettingsForm({
        META_APP_ID: cached.META_APP_ID || '',
        META_APP_SECRET: cached.META_APP_SECRET || '',
        WHATSAPP_ACCESS_TOKEN: cached.WHATSAPP_ACCESS_TOKEN || cached.WHATSAPP_TOKEN || '',
        WHATSAPP_PHONE_NUMBER_ID: cached.WHATSAPP_PHONE_NUMBER_ID || '',
        WHATSAPP_WABA_ID: cached.WHATSAPP_WABA_ID || '',
        WHATSAPP_VERIFY_TOKEN: cached.WHATSAPP_VERIFY_TOKEN || 'pos_whatsapp_verify_token',
        WHATSAPP_WELCOME_TEMPLATE: cached.WHATSAPP_WELCOME_TEMPLATE || 'nexzentek_service_welcome'
      });
    }
    setActiveMode(mode);
    localStorage.setItem('nexzen_active_meta_mode', mode);

    try {
      const res = await fetch(`${API_BASE}/admin/settings/switch-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ mode })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettingsForm(data.settings);
        }
        if (data.profiles) {
          setProfiles(data.profiles);
        }
      }
    } catch (e) {
      console.error('Failed to switch mode:', e);
    } finally {
      setSettingsSwitching(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          ...settingsForm,
          mode: activeMode,
          activeMode
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.profiles) {
          setProfiles(data.profiles);
        }
        localStorage.setItem('nexzen_active_meta_mode', activeMode);
        alert(`Configuration for ${activeMode.toUpperCase()} mode saved successfully!`);
        handleTestConnection();
      } else {
        alert(data.error || 'Failed to save settings');
      }
    } catch (e: any) {
      console.error('Error saving settings', e);
      alert('Error saving settings: ' + e.message);
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleTestConnection = async (targetForm?: MetaSettings) => {
    setSettingsTesting(true);
    const formToTest = targetForm || settingsForm;
    try {
      const res = await fetch(`${API_BASE}/admin/settings/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(formToTest)
      });
      const data = await res.json();
      if (data.success) {
        const result = {
          success: true,
          data: data.data,
          message: data.message || `Connected successfully to Meta WhatsApp Cloud API! Verified Name: "${data.data.verifiedName}", Phone: ${data.data.displayPhoneNumber}, Quality: ${data.data.qualityRating}`
        };
        setSettingsTestResult(result);
        localStorage.setItem('nexzen_meta_test_result', JSON.stringify(result));
      } else {
        const failResult = {
          success: false,
          message: data.error || 'Connection failed'
        };
        setSettingsTestResult(failResult);
        localStorage.setItem('nexzen_meta_test_result', JSON.stringify(failResult));
      }
    } catch (e: any) {
      const errResult = {
        success: false,
        message: 'Error communicating with backend server: ' + e.message
      };
      setSettingsTestResult(errResult);
      localStorage.setItem('nexzen_meta_test_result', JSON.stringify(errResult));
    } finally {
      setSettingsTesting(false);
    }
  };

  const handleCopySettingValue = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedSettingKey(key);
    setTimeout(() => setCopiedSettingKey(null), 1800);
  };

  return (
    <div className="config-settings-view">
      {/* SIMPLE HEADER WITH SLEEK MODE SWITCH */}
      <div className="config-header-row" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="config-header-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h1 className="config-page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Key size={20} style={{ color: activeMode === 'live' ? '#10b981' : '#f59e0b' }} />
              Account &amp; WhatsApp Settings
            </h1>

            {/* Sleek Segmented Mode Switch */}
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              gap: '4px'
            }}>
              <button
                type="button"
                onClick={() => handleSwitchMode('sandbox')}
                disabled={settingsSwitching}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeMode === 'sandbox' ? '#FFC107' : 'transparent',
                  color: activeMode === 'sandbox' ? '#0f172a' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: activeMode === 'sandbox' ? '#0f172a' : '#f59e0b' }} />
                Test Mode
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('live')}
                disabled={settingsSwitching}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: activeMode === 'live' ? '#259800' : 'transparent',
                  color: activeMode === 'live' ? '#fff' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: activeMode === 'live' ? '#fff' : '#259800' }} />
                Live Mode
              </button>
            </div>
          </div>

          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            Active Mode: <strong style={{ color: activeMode === 'live' ? '#10b981' : '#f59e0b' }}>{activeMode === 'live' ? 'Live Mode' : 'Test Mode'}</strong>.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => handleTestConnection()}
            disabled={settingsTesting || settingsLoading || settingsSwitching}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <RefreshCw size={14} className={settingsTesting || settingsLoading || settingsSwitching ? 'spin' : ''} />
            <span>{settingsTesting ? 'Testing...' : 'Test Connection'}</span>
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSaveSettings}
            disabled={settingsSaving || settingsLoading || settingsSwitching}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <Check size={14} />
            <span>{settingsSaving ? 'Saving...' : `Save ${activeMode === 'live' ? 'Live' : 'Test'} Settings`}</span>
          </button>
        </div>
      </div>

      {/* Live Test Status Banner */}
      {settingsTestResult && (
        <div style={{
          padding: '1rem',
          background: settingsTestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${settingsTestResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          borderRadius: '8px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          {settingsTestResult.success ? (
            <CheckCircle2 size={20} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
          ) : (
            <AlertCircle size={20} style={{ color: '#ef4444', marginTop: '2px', flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ fontWeight: 600, color: settingsTestResult.success ? '#10b981' : '#f87171', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{settingsTestResult.success ? 'WhatsApp Connected & Active' : 'Connection Failed'}</span>
                {settingsTestResult.success && (
                  <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1px 8px', borderRadius: '12px', fontWeight: 600 }}>
                    Saved &amp; Verified
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Mode: <strong style={{ color: activeMode === 'live' ? '#10b981' : '#f59e0b' }}>{activeMode.toUpperCase()}</strong>
              </span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '4px' }}>
              {settingsTestResult.message}
            </div>
            {settingsTestResult.success && settingsTestResult.data && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '8px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                  Verified Name: <strong>{settingsTestResult.data.verifiedName}</strong>
                </span>
                <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                  Display Number: <strong>{settingsTestResult.data.displayPhoneNumber}</strong>
                </span>
                <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                  Quality Rating: <strong style={{ color: '#10b981' }}>{settingsTestResult.data.qualityRating}</strong>
                </span>
                <span style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                  Status: <strong>{settingsTestResult.data.codeVerificationStatus}</strong>
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREDENTIALS FORM */}
      <form onSubmit={handleSaveSettings}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Column 1: Meta App Credentials & Account IDs */}
          <div className="glass-card config-form">
            <h3 className="form-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} style={{ color: '#38bdf8' }} />
              WhatsApp Account Details
            </h3>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Meta App ID (META_APP_ID)</label>
                {settingsForm.META_APP_ID && (
                  <button
                    type="button"
                    onClick={() => handleCopySettingValue('appId', settingsForm.META_APP_ID)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedSettingKey === 'appId' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    <span>{copiedSettingKey === 'appId' ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                className="form-input"
                value={settingsForm.META_APP_ID}
                onChange={e => setSettingsForm(prev => ({ ...prev, META_APP_ID: e.target.value }))}
                placeholder="e.g. 1108751488520087"
              />
              <span className="field-hint">Found in Meta for Developers &gt; App Dashboard</span>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Meta App Secret (META_APP_SECRET)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                    <span>{showSecret ? 'Hide' : 'Show'}</span>
                  </button>
                  {settingsForm.META_APP_SECRET && (
                    <button
                      type="button"
                      onClick={() => handleCopySettingValue('appSecret', settingsForm.META_APP_SECRET)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedSettingKey === 'appSecret' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      <span>{copiedSettingKey === 'appSecret' ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              </div>
              <input
                type={showSecret ? "text" : "password"}
                className="form-input"
                value={settingsForm.META_APP_SECRET}
                onChange={e => setSettingsForm(prev => ({ ...prev, META_APP_SECRET: e.target.value }))}
                placeholder="e.g. 0ee19ebc9ff30af8cc1150fb06cc70ae"
              />
              <span className="field-hint">Found in Meta App Settings &gt; Basic &gt; App Secret</span>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">WhatsApp Phone Number ID (WHATSAPP_PHONE_NUMBER_ID)</label>
                {settingsForm.WHATSAPP_PHONE_NUMBER_ID && (
                  <button
                    type="button"
                    onClick={() => handleCopySettingValue('phoneId', settingsForm.WHATSAPP_PHONE_NUMBER_ID)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedSettingKey === 'phoneId' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    <span>{copiedSettingKey === 'phoneId' ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                className="form-input"
                value={settingsForm.WHATSAPP_PHONE_NUMBER_ID}
                onChange={e => setSettingsForm(prev => ({ ...prev, WHATSAPP_PHONE_NUMBER_ID: e.target.value }))}
                placeholder="e.g. 1275094432357064"
                required
              />
              <span className="field-hint">The specific ID assigned to your phone number</span>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">WhatsApp Business Account ID (WHATSAPP_WABA_ID)</label>
                {settingsForm.WHATSAPP_WABA_ID && (
                  <button
                    type="button"
                    onClick={() => handleCopySettingValue('wabaId', settingsForm.WHATSAPP_WABA_ID)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedSettingKey === 'wabaId' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    <span>{copiedSettingKey === 'wabaId' ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                className="form-input"
                value={settingsForm.WHATSAPP_WABA_ID}
                onChange={e => setSettingsForm(prev => ({ ...prev, WHATSAPP_WABA_ID: e.target.value }))}
                placeholder="e.g. 1762566295074311"
                required
              />
              <span className="field-hint">The WABA ID that manages message templates and billing</span>
            </div>
          </div>

          {/* Column 2: WhatsApp Access & Settings */}
          <div className="glass-card config-form">
            <h3 className="form-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={16} style={{ color: '#10b981' }} />
              WhatsApp Access &amp; Verification
            </h3>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">WhatsApp Access Token</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {settingsForm.WHATSAPP_ACCESS_TOKEN.length} chars
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {showToken ? <EyeOff size={12} /> : <Eye size={12} />}
                    <span>{showToken ? 'Hide' : 'Show'}</span>
                  </button>
                  {settingsForm.WHATSAPP_ACCESS_TOKEN && (
                    <button
                      type="button"
                      onClick={() => handleCopySettingValue('token', settingsForm.WHATSAPP_ACCESS_TOKEN)}
                      style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedSettingKey === 'token' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      <span>{copiedSettingKey === 'token' ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>
              </div>
              <textarea
                rows={3}
                className="form-input"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  wordBreak: 'break-all',
                  filter: showToken ? 'none' : 'blur(3px)',
                  transition: 'filter 0.2s ease'
                }}
                value={settingsForm.WHATSAPP_ACCESS_TOKEN}
                onChange={e => setSettingsForm(prev => ({ ...prev, WHATSAPP_ACCESS_TOKEN: e.target.value }))}
                placeholder="EAAPwZA1..."
                required
              />
              <span className="field-hint">WhatsApp permanent or system access token</span>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label">Verification Code (WHATSAPP_VERIFY_TOKEN)</label>
                {settingsForm.WHATSAPP_VERIFY_TOKEN && (
                  <button
                    type="button"
                    onClick={() => handleCopySettingValue('verifyToken', settingsForm.WHATSAPP_VERIFY_TOKEN)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedSettingKey === 'verifyToken' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                    <span>{copiedSettingKey === 'verifyToken' ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <input
                type="text"
                className="form-input"
                value={settingsForm.WHATSAPP_VERIFY_TOKEN}
                onChange={e => setSettingsForm(prev => ({ ...prev, WHATSAPP_VERIFY_TOKEN: e.target.value }))}
                placeholder="pos_whatsapp_verify_token"
                required
              />
              <span className="field-hint">Enter the same value in Meta App &gt; WhatsApp &gt; Configuration &gt; Verify token</span>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Default Welcome Template (WHATSAPP_WELCOME_TEMPLATE)</label>
              <input
                type="text"
                className="form-input"
                value={settingsForm.WHATSAPP_WELCOME_TEMPLATE}
                onChange={e => setSettingsForm(prev => ({ ...prev, WHATSAPP_WELCOME_TEMPLATE: e.target.value }))}
                placeholder="nexzentek_service_welcome"
                required
              />
              <span className="field-hint">The Meta approved template name sent on customer registration</span>
            </div>

            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn-primary" disabled={settingsSaving || settingsSwitching} style={{ flex: 1 }}>
                {settingsSaving ? 'Saving...' : `Save ${activeMode === 'live' ? 'Live' : 'Test'} Settings`}
              </button>
              <button type="button" className="btn-secondary" onClick={() => handleTestConnection()} disabled={settingsTesting}>
                Test Connection
              </button>
            </div>
          </div>
        </div>

        {/* Meta Connection Reference Helper Box */}
        <div className="glass-card" style={{ marginTop: '1.5rem', padding: '1.25rem' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={15} style={{ color: '#a855f7' }} />
            WhatsApp Integration Setup Reference
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', fontSize: '0.82rem' }}>
            <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '8px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '4px', fontWeight: 600 }}>CALLBACK URL (Meta App Dashboard)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-main)' }}>
                <span>{window.location.origin}/api/webhook/whatsapp</span>
                <button
                  type="button"
                  onClick={() => handleCopySettingValue('callbackUrl', `${window.location.origin}/api/webhook/whatsapp`)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  {copiedSettingKey === 'callbackUrl' ? <Check size={12} color="#1e7a00" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '8px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '4px', fontWeight: 600 }}>VERIFY TOKEN</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-main)' }}>
                <span>{settingsForm.WHATSAPP_VERIFY_TOKEN || 'pos_whatsapp_verify_token'}</span>
                <button
                  type="button"
                  onClick={() => handleCopySettingValue('refVerify', settingsForm.WHATSAPP_VERIFY_TOKEN || 'pos_whatsapp_verify_token')}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  {copiedSettingKey === 'refVerify' ? <Check size={12} color="#1e7a00" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid var(--border-subtle)', padding: '0.75rem', borderRadius: '8px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '4px', fontWeight: 600 }}>NOTIFICATION EVENTS</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#1e7a00', fontWeight: 600 }}>
                messages (Subscribed)
              </div>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
};
