import React from 'react';
import { MessageSquare } from 'lucide-react';

interface PublicFooterProps {
  onStaffLoginClick: () => void;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onStaffLoginClick }) => {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="public-footer">
      <div className="public-footer-container">
        <div className="public-footer-top">
          {/* Brand Info */}
          <div className="public-footer-col brand-col">
            <div className="public-brand">
              <div className="public-logo-box">
                <img src="/32.png" alt="NexZenTek" />
              </div>
              <div className="public-brand-text">
                <span className="public-brand-title">NexZen Connect</span>
                <span className="public-brand-subtitle">HUB &amp; SUPPORT</span>
              </div>
            </div>
            <p className="public-footer-desc">
              Direct WhatsApp concierge and customer care. Explore services and chat directly with specialized teams in real-time.
            </p>
          </div>

          {/* Quick Links */}
          <div className="public-footer-col">
            <h4 className="public-footer-heading">Explore</h4>
            <ul className="public-footer-links">
              <li>
                <button type="button" onClick={() => scrollToSection('services')}>
                  Our Services
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('how-it-works')}>
                  How It Works
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('support')}>
                  Support &amp; WhatsApp
                </button>
              </li>
              <li>
                <button type="button" onClick={() => scrollToSection('faq')}>
                  FAQ
                </button>
              </li>
            </ul>
          </div>

          {/* Direct WhatsApp Contact */}
          <div className="public-footer-col">
            <h4 className="public-footer-heading">WhatsApp Concierge</h4>
            <p className="public-footer-contact-text">
              Connect directly via WhatsApp:
            </p>
            <a
              href="https://wa.me/919703639936"
              target="_blank"
              rel="noreferrer"
              className="public-footer-whatsapp-link"
            >
              <MessageSquare size={14} />
              <span>+91 97036 39936</span>
            </a>
            <div style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="public-footer-staff-btn"
                onClick={onStaffLoginClick}
              >
                Staff Portal Sign In &rarr;
              </button>
            </div>
          </div>
        </div>

        <div className="public-footer-bottom">
          <span>&copy; {new Date().getFullYear()} NexZen Connect. All rights reserved.</span>
          <span>Official WhatsApp Concierge Platform</span>
        </div>
      </div>
    </footer>
  );
};
