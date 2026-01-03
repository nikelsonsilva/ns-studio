// src/ui/modal.tsx - Enhanced Modal Component
import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
    open,
    onClose,
    title,
    description,
    size = 'lg',
    children,
    footer,
}) => {
    if (!open) return null;

    const sizes: Record<typeof size, string> = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-2xl',
        xl: 'max-w-5xl',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
                className={`
          w-full rounded-2xl border border-border-subtle bg-surface-elevated shadow-2xl
          max-h-[90vh] overflow-hidden flex flex-col animate-fade-in
          ${sizes[size]}
        `}
            >
                {/* Header */}
                {(title || description) && (
                    <div className="px-4 py-3 border-b border-border-subtle flex items-start justify-between gap-3">
                        <div>
                            {title && <h2 className="text-[15px] font-semibold text-text-strong">{title}</h2>}
                            {description && <p className="text-[12px] text-text-soft">{description}</p>}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-text-muted hover:text-text-strong rounded-md p-1 hover:bg-surface transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="px-4 py-3 border-t border-border-subtle flex justify-end gap-2">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
