/**
 * Modal - NS Studio Dark Theme
 * Uses dark-theme-colors.css variables
 */

import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--dark-modal-overlay)] backdrop-blur-sm animate-fade-in">
      <div
        className={`bg-[var(--dark-modal-bg)] w-full ${sizes[size]} rounded-2xl border border-[var(--dark-modal-border)] shadow-[var(--dark-modal-shadow)] flex flex-col max-h-[90vh] overflow-hidden animate-slide-up`}
      >
        {/* Header */}
        <div className="p-5 border-b border-[var(--dark-modal-border)] bg-[var(--dark-modal-header-bg)] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            {/* Icon in brand circle */}
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-[var(--dark-brand-20)] border border-[var(--dark-brand-30)] flex items-center justify-center text-[var(--dark-brand-primary)]">
                {icon}
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-[var(--dark-text-main)]">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-[var(--dark-text-muted)]">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--dark-text-subtle)] hover:text-[var(--dark-text-main)] p-2 hover:bg-[var(--dark-bg-hover)] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="p-5 border-t border-[var(--dark-modal-border)] bg-[var(--dark-modal-footer-bg)] flex justify-between items-center shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
