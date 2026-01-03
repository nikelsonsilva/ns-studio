// src/ui/empty-state.tsx - Empty state component for lists/grids
import React from 'react';
import { cn } from '../lib/cn';
import { Icon, IconName } from './icon';

export interface EmptyStateProps {
    iconName?: IconName;
    title: string;
    description?: string;
    actionLabel?: string;
    onActionClick?: () => void;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    iconName = 'clipboard',
    title,
    description,
    actionLabel,
    onActionClick,
    size = 'md',
    className,
}) => {
    const sizeClasses = {
        sm: { wrapper: 'px-4 py-6', icon: 24, title: 'text-[13px]', desc: 'text-[11px]' },
        md: { wrapper: 'px-6 py-10', icon: 32, title: 'text-[14px]', desc: 'text-[12px]' },
        lg: { wrapper: 'px-8 py-14', icon: 48, title: 'text-[16px]', desc: 'text-[13px]' },
    };

    const styles = sizeClasses[size];

    return (
        <div className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-barber-800 bg-barber-900/50 text-center',
            styles.wrapper,
            className,
        )}>
            <div className="mb-4 p-4 rounded-full bg-barber-800/50">
                <Icon
                    name={iconName}
                    size={styles.icon}
                    className="text-gray-600"
                />
            </div>
            <h3 className={cn('font-semibold text-gray-400', styles.title)}>
                {title}
            </h3>
            {description && (
                <p className={cn('mt-1 max-w-sm text-gray-600', styles.desc)}>
                    {description}
                </p>
            )}
            {actionLabel && onActionClick && (
                <button
                    onClick={onActionClick}
                    className="mt-4 bg-barber-gold hover:bg-barber-gold/90 text-black px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
