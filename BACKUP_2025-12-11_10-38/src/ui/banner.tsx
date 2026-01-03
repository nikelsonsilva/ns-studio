// src/ui/banner.tsx - Banner/Alert component
import React from 'react';
import { cn } from '../lib/cn';
import { Icon, IconName } from './icon';

export interface BannerProps {
    title: string;
    description?: string;
    variant?: 'info' | 'success' | 'warning' | 'danger';
    iconName?: IconName;
    actionLabel?: string;
    onActionClick?: () => void;
    onClose?: () => void;
    className?: string;
}

export const Banner: React.FC<BannerProps> = ({
    title,
    description,
    variant = 'info',
    iconName,
    actionLabel,
    onActionClick,
    onClose,
    className,
}) => {
    const variantClasses = {
        info: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
        success: 'border-green-500/50 bg-green-500/10 text-green-400',
        warning: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
        danger: 'border-red-500/50 bg-red-500/10 text-red-400',
    };

    const defaultIcons: Record<typeof variant, IconName> = {
        info: 'info',
        success: 'check-circle',
        warning: 'alert-triangle',
        danger: 'alert',
    };

    return (
        <div
            className={cn(
                'relative rounded-xl border p-4',
                variantClasses[variant],
                className,
            )}
        >
            <div className="flex items-start gap-3">
                <Icon
                    name={iconName ?? defaultIcons[variant]}
                    size={20}
                    className="shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-semibold">{title}</h4>
                    {description && (
                        <p className="mt-0.5 text-[12px] opacity-80">{description}</p>
                    )}
                    {actionLabel && (
                        <button
                            type="button"
                            onClick={onActionClick}
                            className="mt-2 text-[12px] font-semibold underline hover:no-underline transition-all"
                        >
                            {actionLabel}
                        </button>
                    )}
                </div>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-black/20 transition-colors"
                    >
                        <Icon name="x" size={14} />
                    </button>
                )}
            </div>
        </div>
    );
};

export default Banner;
