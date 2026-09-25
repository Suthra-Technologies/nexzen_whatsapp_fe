import React from 'react';
import {
  Check,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  PhoneCall,
  Send,
  Sparkles,
  Zap
} from 'lucide-react';
import { COUNTRY_DIAL_OPTIONS } from '../constants';

interface LandingViewProps {
  displayProducts: any[];
  regName: string;
  setRegName: (val: string) => void;
  regPhone: string;
  setRegPhone: (val: string) => void;
  regCountryCode: string;
  setRegCountryCode: (val: string) => void;
  regSuccess: boolean;
  setRegSuccess: (val: boolean) => void;
  registeredNumber: string;
  isLoading: boolean;
  regConsent: boolean;
  setRegConsent: (val: boolean) => void;
  selectedProductId: string | null;
  setSelectedProductId: (val: string | null) => void;
  handleRegister: (e: React.FormEvent) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  displayProducts,
  regName,
  setRegName,
  regPhone,
  setRegPhone,
  regCountryCode,
  setRegCountryCode,
  regSuccess,
  setRegSuccess,
  registeredNumber,
  isLoading,
  regConsent,
  setRegConsent,
  selectedProductId,
  setSelectedProductId,
  handleRegister
}) => {
  const scrollToForm = () => {
    const formEl = document.getElementById('connect-form-section');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
      const nameInput = document.getElementById('reg-name-input');
      nameInput?.focus();
    }
  };

  const targetProduct = selectedProductId ? displayProducts.find(p => p.id === selectedProductId) : null;

  return (
    <div className="public-landing-container">
      {/* 1. HERO SECTION */}
      <section className="public-hero-section">
        <div className="public-hero-content">
          <div className="public-hero-pill">
            <Sparkles size={13} className="hero-pill-icon" />
            <span>Direct WhatsApp Concierge &amp; Care</span>
          </div>

          <h1 className="public-hero-title">
            Connect with <span className="hero-title-highlight">NexZen Services</span>
          </h1>

          <p className="public-hero-subtitle">
            Explore our services and connect directly with the right team through WhatsApp.
            Instant answers, ordering, and dedicated support across all our businesses.
          </p>

          <div className="public-hero-meta-row">
            <div className="public-meta-badge">
              <span className="meta-badge-label">Official WhatsApp:</span>
              <strong className="meta-badge-value">+91 97036 39936</strong>
            </div>
            <div className="public-meta-badge">
              <span className="meta-badge-dot" />
              <span>{displayProducts.length} Teams Available</span>
            </div>
            <div className="public-meta-badge">
              <Zap size={13} />
              <span>Instant Automated Greeting</span>
            </div>
          </div>
        </div>

        {/* 2. CLIENT REGISTRATION / CONNECT FORM */}
        <div id="connect-form-section" className="public-form-wrapper">
          {regSuccess ? (
            <div className="public-card public-success-card">
              <div className="public-success-icon-wrapper">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="public-success-title">You&apos;re All Set!</h2>
              <p className="public-success-desc">
                We sent an interactive service menu straight to your WhatsApp:
              </p>
              <div className="public-success-phone">+{registeredNumber}</div>
              <p className="public-success-tip">
                <Check size={14} /> Open WhatsApp on your phone to choose your service and start chatting with our team.
              </p>
              <button
                type="button"
                className="btn-public-secondary"
                onClick={() => setRegSuccess(false)}
              >
                Connect Another Number
              </button>
            </div>
          ) : (
            <div className="public-card public-form-card">
              <div className="public-form-card-header">
                <div>
                  {targetProduct ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span className="public-selected-badge" style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '12px', fontWeight: 600 }}>
                        Target: {targetProduct.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedProductId(null)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        ✕ Switch to all services
                      </button>
                    </div>
                  ) : null}
                  <h2 className="public-form-title">
                    {targetProduct ? `Connect with ${targetProduct.name}` : 'Start Your WhatsApp Experience'}
                  </h2>
                  <p className="public-form-desc">
                    {targetProduct
                      ? `Enter your name and WhatsApp number below for priority direct routing to ${targetProduct.name} specialists.`
                      : 'Enter your name and WhatsApp number below to receive an instant service menu.'}
                  </p>
                </div>
                <span className="public-form-tag">
                  {targetProduct ? 'Priority Queue' : 'Instant Menu'}
                </span>
              </div>

              <form onSubmit={handleRegister} className="public-connect-form">
                {/* Full Name */}
                <div className="public-form-group">
                  <label htmlFor="reg-name-input" className="public-form-label">
                    Full Name
                  </label>
                  <input
                    id="reg-name-input"
                    type="text"
                    required
                    className="public-form-input"
                    placeholder="e.g. Suresh Kumar"
                    value={regName}
                    onChange={e => setRegName(e.target.value)}
                  />
                </div>

                {/* WhatsApp Phone Number */}
                <div className="public-form-group">
                  <label className="public-form-label">
                    WhatsApp Number
                  </label>
                  <div className="public-phone-input-wrapper">
                    <select
                      className="public-country-select"
                      value={regCountryCode}
                      onChange={e => setRegCountryCode(e.target.value)}
                      title="Select country dialing code"
                    >
                      {COUNTRY_DIAL_OPTIONS.map(opt => (
                        <option key={opt.code} value={opt.code}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      required
                      className="public-form-input phone-digits-input"
                      placeholder={COUNTRY_DIAL_OPTIONS.find(o => o.code === regCountryCode)?.placeholder || '98765 43210'}
                      value={regPhone}
                      onChange={e => setRegPhone(e.target.value)}
                    />
                  </div>
                  <span className="public-field-hint">
                    {regCountryCode === 'other'
                      ? 'Enter full international number with country code (e.g. +919876543210).'
                      : `Enter your 10-digit phone number (${regCountryCode} will be added automatically).`}
                  </span>
                </div>

                {/* WhatsApp messaging consent */}
                <label className="public-consent-row" htmlFor="reg-consent-checkbox">
                  <input
                    id="reg-consent-checkbox"
                    type="checkbox"
                    checked={regConsent}
                    onChange={e => setRegConsent(e.target.checked)}
                  />
                  <span className="public-consent-text">
                    I agree to receive WhatsApp messages from NexZen about my request. Reply STOP anytime to opt out.
                  </span>
                </label>

                <button
                  type="submit"
                  className="btn-public-connect"
                  disabled={isLoading || !regName.trim() || !regPhone.trim() || !regConsent}
                >
                  <Send size={15} />
                  <span>
                    {isLoading
                      ? 'Connecting...'
                      : targetProduct
                      ? `Connect with ${targetProduct.name}`
                      : 'Connect on WhatsApp'}
                  </span>
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="public-how-it-works-section">
        <div className="public-section-header">
          <h2 className="public-section-title">How It Works</h2>
          <p className="public-section-subtitle">
            Connecting with our teams on WhatsApp is quick, secure, and hassle-free.
          </p>
        </div>

        <div className="public-steps-grid">
          <div className="public-step-card">
            <div className="public-step-number">1</div>
            <h3 className="public-step-title">Enter Your Number</h3>
            <p className="public-step-desc">
              Provide your name and WhatsApp number in the form above to initiate contact.
            </p>
          </div>

          <div className="public-step-card">
            <div className="public-step-number">2</div>
            <h3 className="public-step-title">Receive Interactive Menu</h3>
            <p className="public-step-desc">
              You will instantly receive our official WhatsApp welcome message with 1-tap service options.
            </p>
          </div>

          <div className="public-step-card">
            <div className="public-step-number">3</div>
            <h3 className="public-step-title">Chat with Specialists</h3>
            <p className="public-step-desc">
              Your inquiry is directly routed to dedicated team specialists for fast quotes, support, and updates.
            </p>
          </div>
        </div>
      </section>

      {/* 4. SERVICES CATALOG SECTION */}
      <section id="services" className="public-services-section">
        <div className="public-section-header">
          <div className="public-badge-label">PUBLIC CATALOG</div>
          <h2 className="public-section-title">Explore Our Services &amp; Teams</h2>
          <p className="public-section-subtitle">
            Browse our specialized divisions. Each business has dedicated experts available on WhatsApp.
          </p>
        </div>

        <div className="public-products-grid">
          {displayProducts.map(product => {
            const IconComponent = product.icon;
            const featuresList = Array.isArray(product.features) ? product.features : [];

            return (
              <div key={product.id} className="public-product-card">
                <div className="public-product-card-top">
                  <div className="public-product-icon">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} />
                    ) : (
                      <IconComponent size={20} />
                    )}
                  </div>
                  <span className={`row-tag ${product.theme}`}>
                    {product.name}
                  </span>
                </div>

                <h3 className="public-product-name">{product.name}</h3>
                <p className="public-product-desc">{product.description}</p>

                <div className="public-product-features">
                  {featuresList.map((feat: string, idx: number) => (
                    <div key={idx} className="public-product-feature-item">
                      <Check size={13} className="public-feature-check" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="public-product-footer">
                  <span className="public-product-availability">
                    <span className="public-avail-dot" />
                    Available 24/7
                  </span>

                  <div className="public-product-actions">
                    {product.redirectUrl && (
                      <a
                        href={product.redirectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="public-product-site-link"
                        title="Visit official website"
                      >
                        <span>Website</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                    <button
                      type="button"
                      className={`btn-product-connect-wa ${selectedProductId === product.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedProductId(product.id);
                        scrollToForm();
                      }}
                      title={`Connect directly with ${product.name}`}
                    >
                      <MessageSquare size={12} />
                      <span>{selectedProductId === product.id ? 'Selected' : 'Connect'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. DIRECT SUPPORT & HELP CALLOUT */}
      <section id="support" className="public-support-callout-section">
        <div className="public-support-card">
          <div className="public-support-icon">
            <PhoneCall size={28} />
          </div>
          <div className="public-support-body">
            <h3 className="public-support-title">Need Help Right Now?</h3>
            <p className="public-support-desc">
              You can also message our official WhatsApp support number directly without filling out any forms.
            </p>
          </div>
          <a
            href="https://wa.me/919703639936"
            target="_blank"
            rel="noreferrer"
            className="btn-public-direct-whatsapp"
          >
            <MessageSquare size={15} />
            <span>Chat on WhatsApp: +91 97036 39936</span>
          </a>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" className="public-faq-section">
        <div className="public-section-header">
          <h2 className="public-section-title">Frequently Asked Questions</h2>
          <p className="public-section-subtitle">
            A few quick answers before you get started.
          </p>
        </div>

        <div className="public-faq-list">
          <div className="public-faq-item">
            <h3 className="public-faq-question">How do I contact support?</h3>
            <p className="public-faq-answer">
              Fill in your name and WhatsApp number above, or message our WhatsApp number directly.
            </p>
          </div>
          <div className="public-faq-item">
            <h3 className="public-faq-question">How will support contact me?</h3>
            <p className="public-faq-answer">
              Entirely through WhatsApp — you’ll receive a welcome message with options for the service you need.
            </p>
          </div>
          <div className="public-faq-item">
            <h3 className="public-faq-question">How do I know my message was received?</h3>
            <p className="public-faq-answer">
              WhatsApp shows delivery ticks on your messages, just like any other WhatsApp chat.
            </p>
          </div>
          <div className="public-faq-item">
            <h3 className="public-faq-question">Can I send an image or document?</h3>
            <p className="public-faq-answer">
              Yes, our team can receive images and documents directly in your WhatsApp conversation.
            </p>
          </div>
          <div className="public-faq-item">
            <h3 className="public-faq-question">How long will it take to receive a response?</h3>
            <p className="public-faq-answer">
              Our team typically replies as soon as possible during business hours.
            </p>
          </div>
          <div className="public-faq-item">
            <h3 className="public-faq-question">What information should I provide to support?</h3>
            <p className="public-faq-answer">
              Your name, the service you’re asking about, and a short description of what you need help with.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
