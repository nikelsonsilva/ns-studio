import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
    onClick?: () => void;
    noPadding?: boolean;
    style?: React.CSSProperties;
}

/**
 * Card Component - NS Studio Dark Theme
 * Uses dark-theme-colors.css variables
 */
const Card: React.FC<CardProps> = ({
    children,
    className = '',
    hoverEffect = false,
    onClick,
    noPadding = false,
    style
}) => {
    // Apenas estrutura básica - background e borda devem ser passados via className
    const baseStyle = `
        rounded-xl 
        shadow-[var(--dark-shadow-sm)]
        transition-all duration-[180ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]
        overflow-hidden
    `.replace(/\s+/g, ' ').trim();

    const hoverStyle = hoverEffect
        ? "hover:shadow-[var(--dark-shadow-md)] hover:border-[var(--dark-border-strong)] cursor-pointer hover:-translate-y-0.5"
        : "";

    const paddingStyle = noPadding ? "" : "p-4 sm:p-5";

    return (
        <div
            onClick={onClick}
            className={`${baseStyle} ${hoverStyle} ${paddingStyle} ${className}`}
            style={style}
        >
            {children}
        </div>
    );
};

export default Card;
