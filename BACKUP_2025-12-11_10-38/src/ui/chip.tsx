// src/ui/chip.tsx - Chip/Tag component
import React from 'react';
import { cn } from '../lib/cn';
import { Icon } from './icon';

export interface ChipProps {
    label: string;
    onRemove?: () => void;
    selected?: boolean;
    onClick?: () => void;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'gold';
    size?: 'sm' | 'md';
    icon?: React.ReactNode;
    className?: string;
}

export const Chip: React.FC<ChipProps> = ({
    label,
    onRemove,
    selected,
    onClick,
    variant = 'default',
    size = 'md',
    icon,
    className,
}) => {
    const variantClasses = {
        default: selected
            ? 'border-barber-gold bg-barber-gold text-black'
            : 'border-barber-800 bg-barber-900 text-gray-400 hover:border-barber-gold/60 hover:bg-barber-800 hover:text-white',
        success: 'border-green-500/50 bg-green-500/10 text-green-400',
        warning: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
        danger: 'border-red-500/50 bg-red-500/10 text-red-400',
        gold: 'border-barber-gold/50 bg-barber-gold/10 text-barber-gold',
    };

    const sizeClasses = {
        sm: 'h-6 px-2 text-[10px] gap-1',
        md: 'h-7 px-2.5 text-[11px] gap-1.5',
    };

    return (
        <span
            onClick={onClick}
            className={cn(
                'inline-flex items-center rounded-full border font-medium transition-colors duration-150',
                variantClasses[variant],
                sizeClasses[size],
                onClick && 'cursor-pointer',
                className,
            )}
        >
            {icon && <span className="shrink-0">{icon}</span>}
            <span className="truncate">{label}</span>
            {onRemove && (
                <button
                    type="button"
                    onClick={e => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/20 transition-colors"
                >
                    <Icon name="x" size={10} />
                </button>
            )}
        </span>
    );
};

export default Chip;
