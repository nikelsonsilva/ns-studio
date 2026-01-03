import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

/**
 * Button Component - NS Studio Dark Theme
 * Uses dark-theme-colors.css variables
 */
const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = `
        inline-flex items-center justify-center gap-2
        font-semibold rounded-lg
        transition-all duration-[120ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]
        focus:outline-none focus:ring-4 focus:ring-[var(--dark-checkbox-focus-ring)]
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
    `.replace(/\s+/g, ' ').trim();

    const variants: Record<string, string> = {
        // Primary: Gold brand color
        primary: `
            bg-[var(--dark-btn-primary-bg)] hover:bg-[var(--dark-btn-primary-hover)]
            text-[var(--dark-btn-primary-text)]
            shadow-sm hover:shadow-md
        `.replace(/\s+/g, ' ').trim(),

        // Secondary: Dark bg with border
        secondary: `
            bg-[var(--dark-btn-secondary-bg)] hover:bg-[var(--dark-btn-secondary-hover)]
            text-[var(--dark-btn-secondary-text)]
            border border-[var(--dark-border-default)] hover:border-[var(--dark-border-strong)]
            shadow-sm hover:shadow-md
        `.replace(/\s+/g, ' ').trim(),

        // Outline: Transparent with border
        outline: `
            bg-[var(--dark-btn-outline-bg)] hover:bg-[var(--dark-btn-outline-hover-bg)]
            text-[var(--dark-btn-outline-text)] hover:text-[var(--dark-btn-outline-hover-text)]
            border border-[var(--dark-btn-outline-border)] hover:border-[var(--dark-btn-outline-hover-border)]
        `.replace(/\s+/g, ' ').trim(),

        // Ghost: No background
        ghost: `
            bg-[var(--dark-btn-ghost-bg)] hover:bg-[var(--dark-btn-ghost-hover-bg)]
            text-[var(--dark-btn-ghost-text)] hover:text-[var(--dark-btn-ghost-hover-text)]
        `.replace(/\s+/g, ' ').trim(),

        // Danger: Red
        danger: `
            bg-[var(--dark-btn-danger-bg)] hover:bg-[var(--dark-btn-danger-hover-bg)]
            text-[var(--dark-btn-danger-text)] hover:text-[var(--dark-btn-danger-hover-text)]
            border border-[var(--dark-btn-danger-border)]
        `.replace(/\s+/g, ' ').trim(),

        // Success: Green
        success: `
            bg-[var(--dark-btn-success-bg)] hover:bg-[var(--dark-btn-success-hover)]
            text-[var(--dark-btn-success-text)]
        `.replace(/\s+/g, ' ').trim()
    };

    const sizes: Record<string, string> = {
        sm: "text-xs px-3 py-1.5 h-8",
        md: "text-sm px-4 py-2.5 h-10",
        lg: "text-base px-6 py-3 h-12",
        icon: "p-2 w-10 h-10"
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {!isLoading && leftIcon}
            {children}
            {!isLoading && rightIcon}
        </button>
    );
};

export default Button;
