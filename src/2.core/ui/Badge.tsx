import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'outline';
    size?: 'sm' | 'md';
    className?: string;
    icon?: React.ReactNode;
}

/**
 * Badge Component - NS Studio Dark Theme
 * Uses dark-theme-colors.css variables
 */
const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    size = 'md',
    className = '',
    icon
}) => {
    const variants: Record<string, string> = {
        // Default - neutral
        default: "bg-[var(--dark-badge-default-bg)] text-[var(--dark-badge-default-text)] border-[var(--dark-badge-default-border)]",

        // Success - green tint
        success: "bg-[var(--dark-badge-success-bg)] text-[var(--dark-badge-success-text)] border-[var(--dark-badge-success-border)]",

        // Warning - amber tint
        warning: "bg-[var(--dark-badge-warning-bg)] text-[var(--dark-badge-warning-text)] border-[var(--dark-badge-warning-border)]",

        // Danger - rose tint  
        danger: "bg-[var(--dark-badge-danger-bg)] text-[var(--dark-badge-danger-text)] border-[var(--dark-badge-danger-border)]",

        // Info - sky tint
        info: "bg-[var(--dark-badge-info-bg)] text-[var(--dark-badge-info-text)] border-[var(--dark-badge-info-border)]",

        // Brand - gold tint (VIP)
        brand: "bg-[var(--dark-badge-vip-bg)] text-[var(--dark-badge-vip-text)] border-[var(--dark-badge-vip-border)]",

        // Outline - transparent with border
        outline: "bg-[var(--dark-badge-outline-bg)] text-[var(--dark-badge-outline-text)] border-[var(--dark-badge-outline-border)]"
    };

    const sizes: Record<string, string> = {
        sm: "text-[10px] px-1.5 py-0.5",
        md: "text-xs px-2.5 py-1"
    };

    return (
        <span className={`
            inline-flex items-center gap-1.5 
            rounded-full border 
            font-semibold uppercase tracking-wide
            transition-colors duration-150
            ${variants[variant]} 
            ${sizes[size]} 
            ${className}
        `.replace(/\s+/g, ' ').trim()}>
            {icon}
            {children}
        </span>
    );
};

export default Badge;
