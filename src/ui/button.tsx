// src/ui/button.tsx - Button Component with Linear Dark tokens
import React from 'react';

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md';

type ButtonProps = {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
};

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    onClick,
    disabled,
    type = 'button',
}: ButtonProps) {
    const variants: Record<ButtonVariant, string> = {
        primary: 'bg-primary-500 hover:bg-primary-600 text-background font-semibold shadow-card-soft',
        ghost: 'bg-surface-soft hover:bg-surface-elevated text-text-soft border border-border-subtle',
        outline: 'border border-border-subtle hover:bg-surface-soft text-text-soft',
        danger: 'bg-danger-500/15 hover:bg-danger-500/25 text-danger-500 border border-danger-500/30',
        success: 'bg-success-500/15 hover:bg-success-500/25 text-success-500 border border-success-500/30',
    };

    const sizes: Record<ButtonSize, string> = {
        sm: 'h-[28px] px-3 text-[11px]',
        md: 'h-[34px] px-4 text-[12px]',
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`
        ${sizes[size]}
        rounded-lg font-medium transition-all
        inline-flex items-center justify-center gap-1.5
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} 
        ${className}
      `}
        >
            {children}
        </button>
    );
}

export default Button;
