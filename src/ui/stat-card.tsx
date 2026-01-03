// src/ui/stat-card.tsx - Metric/KPI card component
import React from 'react';
import { cn } from '../lib/cn';
import { Icon, IconName } from './icon';

export interface StatCardProps {
    label: string;
    value: string | number;
    helperText?: string;
    iconName?: IconName;
    trend?: {
        value: string;
        direction: 'up' | 'down' | 'neutral';
    };
    tone?: 'default' | 'success' | 'danger' | 'warning' | 'gold';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    helperText,
    iconName,
    trend,
    tone = 'default',
    size = 'md',
    className,
    onClick,
}) => {
    const toneClasses: Record<typeof tone, string> = {
        default: 'border-barber-800',
        success: 'border-green-500/50',
        danger: 'border-red-500/50',
        warning: 'border-yellow-500/50',
        gold: 'border-barber-gold/50',
    };

    const iconColors: Record<typeof tone, string> = {
        default: 'text-barber-gold',
        success: 'text-green-500',
        danger: 'text-red-500',
        warning: 'text-yellow-500',
        gold: 'text-barber-gold',
    };

    const sizeClasses = {
        sm: { wrapper: 'px-3 py-2.5', value: 'text-lg', label: 'text-[10px]' },
        md: { wrapper: 'px-4 py-3', value: 'text-2xl', label: 'text-[11px]' },
        lg: { wrapper: 'px-5 py-4', value: 'text-3xl', label: 'text-[12px]' },
    };

    const trendColors = {
        up: 'text-green-500',
        down: 'text-red-500',
        neutral: 'text-gray-500',
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                'rounded-xl border bg-barber-900 shadow-lg transition-all duration-150',
                toneClasses[tone],
                onClick && 'cursor-pointer hover:border-barber-gold/70 hover:bg-barber-800/50',
                sizeClasses[size].wrapper,
                className,
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className={cn(
                        'flex items-center gap-1.5 font-semibold uppercase tracking-wide text-gray-500',
                        sizeClasses[size].label,
                    )}>
                        {iconName && (
                            <Icon
                                name={iconName}
                                size={size === 'lg' ? 14 : 12}
                                className={iconColors[tone]}
                            />
                        )}
                        {label}
                    </div>
                    <div className={cn(
                        'mt-1 font-bold text-white',
                        sizeClasses[size].value,
                    )}>
                        {value}
                    </div>
                    {(helperText || trend) && (
                        <div className="mt-1 flex items-center gap-2 text-[11px]">
                            {trend && (
                                <span className={cn('flex items-center gap-0.5 font-medium', trendColors[trend.direction])}>
                                    <Icon
                                        name={trend.direction === 'up' ? 'trending-up' : trend.direction === 'down' ? 'trending-down' : 'minus'}
                                        size={12}
                                    />
                                    {trend.value}
                                </span>
                            )}
                            {helperText && (
                                <span className="text-gray-500">{helperText}</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StatCard;
