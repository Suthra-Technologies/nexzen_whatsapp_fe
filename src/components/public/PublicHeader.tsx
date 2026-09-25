import React, { useState } from 'react';
import { LogIn, Menu, X, ArrowRight } from 'lucide-react';
import type { AdminUser } from '../../types';

interface PublicHeaderProps {
  onStaffLoginClick: () => void;
  currentUser?: AdminUser | null;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({
  onStaffLoginClick,
  currentUser
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="public-header">
      <div className="public-header-container">
        {/* Brand Logo & Title */}
        <div className="public-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="public-logo-box">
            <img src="/32.png" alt="NexZenTek" />
          </div>
          <div className="public-brand-text">
            <span className="public-brand-title">NexZen Connect</span>
            <span className="public-brand-subtitle">HUB &amp; SUPPORT</span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="public-nav-links">
          <button
            type="button"
            className="public-nav-item"
            onClick={() => scrollToSection('services')}
          >
            Services
          </button>
          <button
            type="button"
            className="public-nav-item"
            onClick={() => scrollToSection('how-it-works')}
          >
            How It Works
          </button>
          <button
            type="button"
            className="public-nav-item"
            onClick={() => scrollToSection('support')}
          >
            Support
          </button>
        </nav>

        {/* Right Header Actions */}
        <div className="public-header-actions">
          {currentUser ? (
            <button
              type="button"
              className="btn-staff-portal-link"
              onClick={onStaffLoginClick}
              title="Enter Staff Support Center"
            >
              <span>Staff Portal</span>
              <ArrowRight size={13} />
            </button>
          ) : (
            <button
              type="button"
              className="btn-staff-login-link"
              onClick={onStaffLoginClick}
              title="Sign in to Staff Support Center"
            >
              <LogIn size={13} />
              <span>Staff Login</span>
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="public-mobile-toggle"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="public-mobile-drawer">
          <button
            type="button"
            className="public-mobile-item"
            onClick={() => scrollToSection('services')}
          >
            Services
          </button>
          <button
            type="button"
            className="public-mobile-item"
            onClick={() => scrollToSection('how-it-works')}
          >
            How It Works
          </button>
          <button
            type="button"
            className="public-mobile-item"
            onClick={() => scrollToSection('support')}
          >
            Support
          </button>
          <div className="public-mobile-divider" />
          <button
            type="button"
            className="public-mobile-login"
            onClick={() => {
              setMobileMenuOpen(false);
              onStaffLoginClick();
            }}
          >
            <LogIn size={14} />
            <span>{currentUser ? 'Staff Portal' : 'Staff Login'}</span>
          </button>
        </div>
      )}
    </header>
  );
};
