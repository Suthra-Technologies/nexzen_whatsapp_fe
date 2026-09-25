import React from 'react';
import { X } from 'lucide-react';

interface ListOption {
  id: string;
  title: string;
  description?: string;
}

interface InteractiveListModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeListPayload: {
    buttonText: string;
    options: ListOption[];
    sections?: { title: string; rows: ListOption[] }[];
  } | null;
  onSelectProductCTA: (productId: string, productName: string) => void;
}

export const InteractiveListModal: React.FC<InteractiveListModalProps> = ({
  isOpen,
  onClose,
  activeListPayload,
  onSelectProductCTA
}) => {
  if (!isOpen || !activeListPayload) return null;

  // Like WhatsApp, only show section headings (e.g. demo slot dates) when there is more than one.
  const groups = activeListPayload.sections && activeListPayload.sections.length > 1
    ? activeListPayload.sections
    : [{ title: '', rows: activeListPayload.options }];

  const renderOption = (opt: ListOption) => (
    <div
      key={opt.id}
      className="phone-list-modal-item"
      onClick={() => onSelectProductCTA(opt.id, opt.title)}
    >
      <div className="phone-list-modal-item-title">{opt.title}</div>
      {opt.description && (
        <div className="phone-list-modal-item-desc">{opt.description}</div>
      )}
    </div>
  );

  return (
    <div className="phone-list-modal">
      <div className="phone-list-modal-header">
        <span className="phone-list-modal-title">{activeListPayload.buttonText}</span>
        <X
          size={16}
          className="phone-list-modal-close"
          onClick={onClose}
        />
      </div>

      <div className="phone-list-modal-items">
        {groups.map((group, i) => (
          <React.Fragment key={group.title || i}>
            {group.title && (
              <div style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.04em', color: '#8696a0', padding: '0.6rem 0.75rem 0.2rem' }}>
                {group.title}
              </div>
            )}
            {group.rows.map(renderOption)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
