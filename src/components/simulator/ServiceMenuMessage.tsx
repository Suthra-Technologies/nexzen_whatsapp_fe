import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Layers, Search } from 'lucide-react';
import type { SimulatedMessage } from '../../types';
import { API_BASE, ICON_MAP } from '../../constants';

interface ServiceMenuMessageProps {
  message: SimulatedMessage;
  simulatorPhone: string;
  simulatorName: string;
  formattedTime: string;
}

/**
 * Preview of the welcome service menu. In WhatsApp these options are standard reply buttons
 * (the product icons and descriptions travel in the message text there); in this preview each
 * option is a compact row with the product's own icon, name and description.
 */
export const ServiceMenuMessage: React.FC<ServiceMenuMessageProps> = ({
  message: m,
  simulatorPhone,
  simulatorName,
  formattedTime
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const handleSelect = async (id: string, title: string) => {
    if (selectedId) return; // ignore double taps while a choice is being sent
    setSelectedId(id);
    try {
      await fetch(`${API_BASE}/simulate/incoming`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: simulatorPhone,
          name: simulatorName,
          text: title,
          type: 'interactive',
          interactiveReplyId: id
        })
      });
    } catch (err) {
      console.error(err);
    } finally {
      // Brief selected state, then back to normal so the menu can be used again.
      resetTimer.current = window.setTimeout(() => setSelectedId(null), 600);
    }
  };

  return (
    <div className="wa-menu">
      <div className="phone-msg outbound wa-menu-bubble">
        {m.title && <div className="wa-menu-header">{m.title}</div>}
        <div className="wa-menu-body">{m.body}</div>
        {m.footer && <div className="wa-menu-footer">{m.footer}</div>}
        <span className="phone-msg-time">{formattedTime}</span>
      </div>

      <div className="wa-options" role="group" aria-label="Choose a service">
        {(m.buttons || []).map(btn => {
          const isExplore = btn.kind === 'explore';
          const Icon = isExplore ? Search : (btn.icon && ICON_MAP[btn.icon]) || Layers;
          const classes = ['wa-option', isExplore ? 'wa-option--explore' : '', selectedId === btn.id ? 'is-selected' : '']
            .filter(Boolean)
            .join(' ');
          return (
            <button key={btn.id} type="button" className={classes} onClick={() => handleSelect(btn.id, btn.title)}>
              <span className="wa-option-icon" aria-hidden="true">
                <Icon size={20} strokeWidth={2} />
              </span>
              <span className="wa-option-text">
                <span className="wa-option-name">{btn.name || btn.title}</span>
                {btn.description && (
                  <span className="wa-option-desc" title={btn.description}>{btn.description}</span>
                )}
              </span>
              <ChevronRight className="wa-option-chevron" size={16} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
