import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  HelpCircle,
  Lock,
  LogIn,
  Mail,
  Send,
  Shield
} from 'lucide-react';
import { API_BASE } from '../../constants';
import type { AdminUser } from '../../types';

interface LoginScreenProps {
  onLoginSuccess: (token: string, user: AdminUser, staySignedIn?: boolean) => void;
  onBackToLanding?: () => void;
  targetTabName?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        onLoginSuccess(data.token, data.user, staySignedIn);
      } else {
        // Uniform message to avoid account enumeration
        setError(data.error || 'Invalid email or password.');
      }
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setForgotError('Please enter a valid staff email address.');
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setForgotMessage(null);

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setForgotMessage(
          data.message ||
          'If this email belongs to an authorized staff account, an administrative reset request has been logged. Please contact your Super Administrator to receive your temporary password.'
        );
      } else {
        setForgotError(data.error || 'Unable to submit reset request.');
      }
    } catch {
      setForgotError('Unable to connect to authentication service. Please contact your Super Administrator.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="login-screen-wrapper">
      <div className="login-screen-container">
        {/* Central Auth Card */}
        <div className="login-card">
          {mode === 'signin' ? (
            <>
              {/* Card Header */}
              <div className="login-card-header">
                <div className="login-brand-icon">
                  <img src="/32.png" alt="NexZen Connect" />
                </div>
                <div className="login-brand-name">NexZen Connect</div>
                <h1 className="login-title">Staff Sign In</h1>
                <p className="login-subtitle">
                  Sign in to access the staff portal.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="login-error-banner" role="alert">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Sign In Form */}
              <form onSubmit={handleSubmit} className="login-form">
                <div className="form-group">
                  <label htmlFor="login-email">Staff Email Address</label>
                  <div className="input-icon-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      autoComplete="email"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="login-password">Password</label>
                  <div className="input-icon-wrapper">
                    <Lock size={16} className="input-icon" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Stay Signed In Checkbox */}
                <div className="login-form-options">
                  <label className="login-remember-checkbox">
                    <input
                      type="checkbox"
                      checked={staySignedIn}
                      onChange={e => setStaySignedIn(e.target.checked)}
                    />
                    <span>Stay signed in</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="login-spinner" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={16} />
                      <span>Sign In</span>
                    </>
                  )}
                </button>

                {/* Forgot password link */}
                <div className="login-forgot-wrapper">
                  <button
                    type="button"
                    className="login-forgot-link"
                    onClick={() => {
                      setMode('forgot');
                      setForgotEmail(email);
                      setForgotMessage(null);
                      setForgotError(null);
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              </form>

              {/* Security Features Info Footer */}
              <div className="login-card-footer">
                <div className="security-feature">
                  <CheckCircle2 size={13} className="check-icon" />
                  <span>Internal staff authentication</span>
                </div>
                <div className="security-feature">
                  <Shield size={13} className="check-icon" />
                  <span>Encrypted &amp; Secure</span>
                </div>
              </div>
            </>
          ) : (
            /* Forgot Password / Recovery View (In-Card) */
            <>
              <div className="login-card-header">
                <div className="login-brand-icon" style={{ background: 'rgba(18, 140, 126, 0.08)', borderColor: 'rgba(18, 140, 126, 0.25)' }}>
                  <HelpCircle size={24} color="#128C7E" />
                </div>
                <div className="login-brand-name">NexZen Connect</div>
                <h1 className="login-title">Staff Password Recovery</h1>
                <p className="login-subtitle">
                  Enter your staff email address below. If registered, an administrative reset request will be logged with your Super Administrator.
                </p>
              </div>

              {forgotMessage ? (
                <div>
                  <div style={{
                    background: 'rgba(22, 163, 74, 0.08)',
                    border: '1px solid rgba(22, 163, 74, 0.25)',
                    borderRadius: '8px',
                    padding: '1rem',
                    color: '#15803d',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    marginBottom: '1.25rem'
                  }}>
                    {forgotMessage}
                  </div>

                  <button
                    type="button"
                    className="login-submit-btn"
                    onClick={() => {
                      setMode('signin');
                      setForgotMessage(null);
                    }}
                  >
                    <ArrowLeft size={16} />
                    <span>Return to Staff Sign In</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="login-form">
                  {forgotError && (
                    <div className="login-error-banner" role="alert">
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      <span>{forgotError}</span>
                    </div>
                  )}

                  <div className="form-group">
                    <label htmlFor="forgot-email">Staff Email Address</label>
                    <div className="input-icon-wrapper">
                      <Mail size={16} className="input-icon" />
                      <input
                        id="forgot-email"
                        type="email"
                        value={forgotEmail}
                        onChange={e => setForgotEmail(e.target.value)}
                        placeholder="Enter your email"
                        autoComplete="email"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="login-submit-btn"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <>
                        <span className="login-spinner" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Submit Request</span>
                      </>
                    )}
                  </button>

                  <div className="login-forgot-wrapper">
                    <button
                      type="button"
                      className="login-forgot-link"
                      onClick={() => {
                        setMode('signin');
                        setForgotError(null);
                      }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Sign In</span>
                    </button>
                  </div>
                </form>
              )}

              <div className="login-card-footer" style={{ marginTop: '1.25rem' }}>
                <div className="security-feature" style={{ width: '100%', justifyContent: 'center' }}>
                  <span>For immediate assistance, contact your NexZen Super Administrator.</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Brand Copyright */}
        <div className="login-page-footer">
          <span>NexZen Connect Hub &copy; {new Date().getFullYear()} &bull; All Rights Reserved</span>
        </div>
      </div>
    </div>
  );
};
