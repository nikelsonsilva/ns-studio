import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = 'md'
}) => {
  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-[95vw]"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className={`bg-barber-900 w-full ${sizes[size]} rounded-2xl border border-barber-800 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up`}
      >
        {/* Header */}
        <div className="p-5 border-b border-barber-800 bg-barber-950 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-main flex items-center gap-2">
            {title}
          </h3>
          <button 
            onClick={onClose} 
            className="text-muted hover:text-main p-2 hover:bg-barber-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-barber-900">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-5 border-t border-barber-800 bg-barber-950 flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;