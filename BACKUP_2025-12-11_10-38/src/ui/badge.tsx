// src/ui/badge.tsx - Badge Component with Linear Dark tokens
import React from 'react';

type BadgeVariant = 'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'outline' | 'muted';

interface BadgeProps {
    children: React.ReactNode;
    variant?: BadgeVariant;
    iconLeft?: React.ReactNode;
    className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'neutral',
    iconLeft,
    className = '',
}) => {
    const variants: Record<BadgeVariant, string> = {
        neutral: 'bg-surface-soft border-border-subtle text-text-muted',
        primary: 'bg-primary-500/15 border-primary-500/40 text-primary-400',
        success: 'bg-success-500/15 border-success-500/40 text-success-500',
        danger: 'bg-danger-500/15 border-danger-500/40 text-danger-500',
        warning: 'bg-warning-500/15 border-warning-500/40 text-warning-500',
        outline: 'bg-transparent border-border-subtle text-text-muted',
        muted: 'bg-surface-elevated border-border-subtle text-text-faint',
    };

    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none ${variants[variant]} ${className}`}>
            {iconLeft && <span className="shrink-0">{iconLeft}</span>}
            <span className="truncate">{children}</span>
        </span>
    );
};

export default Badge;
