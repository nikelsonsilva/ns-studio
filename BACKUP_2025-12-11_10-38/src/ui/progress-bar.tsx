// src/ui/progress-bar.tsx - Progress bar component
import React from 'react';
import { cn } from '../lib/cn';

export interface ProgressBarProps {
    value: number; // 0-100
    showValue?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'gold';
    animated?: boolean;
    label?: string;
    className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
    value,
    showValue = false,
    size = 'md',
    variant = 'default',
    animated = false,
    label,
    className,
}) => {
    const clampedValue = Math.min(100, Math.max(0, value));

    const sizeClasses = {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3',
    };

    const variantClasses = {
        default: 'bg-barber-gold',
        success: 'bg-green-500',
        warning: 'bg-yellow-500',
        danger: 'bg-red-500',
        gold: 'bg-gradient-to-r from-barber-gold to-yellow-500',
    };

    return (
        <div className={cn('w-full', className)}>
            {(label || showValue) && (
                <div className="flex items-center justify-between mb-1.5 text-[11px]">
                    {label && <span className="text-gray-400 font-medium">{label}</span>}
                    {showValue && <span className="text-gray-500">{clampedValue}%</span>}
                </div>
            )}
            <div className={cn(
                'w-full overflow-hidden rounded-full bg-barber-800',
                sizeClasses[size],
            )}>
                <div
                    className={cn(
                        'h-full rounded-full transition-all duration-500 ease-out',
                        variantClasses[variant],
                        animated && 'animate-pulse',
                    )}
                    style={{ width: `${clampedValue}%` }}
                />
            </div>
        </div>
    );
};

export default ProgressBar;
