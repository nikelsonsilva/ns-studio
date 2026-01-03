// src/ui/tooltip.tsx - Simple Tooltip Component
import React, { useState } from 'react';

interface TooltipProps {
    label: string;
    children: React.ReactNode;
    side?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
    label,
    children,
    side = 'top',
    className = '',
}) => {
    const [open, setOpen] = useState(false);

    const sideClasses: Record<string, string> = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
        left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
        right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
    };

    return (
        <span
            className="relative inline-flex"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
        >
            {children}
            {open && (
                <span
                    className={`
            pointer-events-none absolute z-50 rounded-md bg-surface-raised px-2 py-1 
            text-[11px] text-text-soft border border-border-subtle shadow-lg animate-fade-in
            ${sideClasses[side]} ${className}
          `}
                >
                    {label}
                </span>
            )}
        </span>
    );
};

export default Tooltip;
