// src/ui/toast.tsx - Toast Notification Visual
import React from 'react';

type ToastVariant = 'default' | 'success' | 'error' | 'warning';

interface ToastProps {
    title: string;
    description?: string;
    variant?: ToastVariant;
}

export const Toast: React.FC<ToastProps> = ({
    title,
    description,
    variant = 'default',
}) => {
    const variants: Record<ToastVariant, string> = {
        default: 'border-border-subtle text-text-strong',
        success: 'border-success-500/40 bg-success-500/10 text-success-100',
        error: 'border-danger-500/40 bg-danger-500/10 text-danger-100',
        warning: 'border-warning-500/40 bg-warning-500/10 text-warning-100',
    };

    return (
        <div className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border shadow-lg backdrop-blur bg-surface-raised/95 ${variants[variant]}`}>
            <div className="p-3">
                <p className="text-[13px] font-semibold">{title}</p>
                {description && <p className="mt-0.5 text-[12px] opacity-80">{description}</p>}
            </div>
        </div>
    );
};

export default Toast;
