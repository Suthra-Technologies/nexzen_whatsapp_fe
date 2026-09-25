import React from 'react';
import { X } from 'lucide-react';

interface InteractiveListModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeListPayload: {
    buttonText: string;
    options: {
      id: string;
      title: string;
      description?: string;
    }[];
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
        {activeListPayload.options.map(opt => (
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
        ))}
      </div>
    </div>
  );
};
