// src/ui/skeleton-variants.tsx - Pre-built skeleton loading states
import React from 'react';
import { cn } from '../lib/cn';

// Base skeleton shimmer animation
const shimmerClass = 'animate-pulse bg-barber-800';

// Card skeleton
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
    <div className={cn('rounded-xl border border-barber-800 bg-barber-900 p-4', className)}>
        <div className="flex items-start gap-3">
            <div className={cn('h-12 w-12 rounded-full', shimmerClass)} />
            <div className="flex-1 space-y-2">
                <div className={cn('h-4 w-3/4 rounded', shimmerClass)} />
                <div className={cn('h-3 w-1/2 rounded', shimmerClass)} />
            </div>
        </div>
        <div className="mt-4 space-y-2">
            <div className={cn('h-3 w-full rounded', shimmerClass)} />
            <div className={cn('h-3 w-4/5 rounded', shimmerClass)} />
        </div>
    </div>
);

// List item skeleton
export const SkeletonListItem: React.FC<{ className?: string }> = ({ className }) => (
    <div className={cn('flex items-center gap-3 rounded-xl border border-barber-800 bg-barber-900 p-3', className)}>
        <div className={cn('h-10 w-10 rounded-full', shimmerClass)} />
        <div className="flex-1 space-y-2">
            <div className={cn('h-3 w-2/3 rounded', shimmerClass)} />
            <div className={cn('h-2 w-1/2 rounded', shimmerClass)} />
        </div>
    </div>
);

// List skeleton
export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({
    count = 3,
    className,
}) => (
    <div className={cn('space-y-3', className)}>
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonListItem key={i} />
        ))}
    </div>
);

// Table row skeleton
export const SkeletonTableRow: React.FC<{ columns?: number; className?: string }> = ({
    columns = 4,
    className,
}) => (
    <div className={cn('flex items-center gap-4 border-b border-barber-800 py-3', className)}>
        {Array.from({ length: columns }).map((_, i) => (
            <div
                key={i}
                className={cn('h-3 rounded', shimmerClass)}
                style={{ width: `${100 / columns}%` }}
            />
        ))}
    </div>
);

// Stat card skeleton
export const SkeletonStatCard: React.FC<{ className?: string }> = ({ className }) => (
    <div className={cn('rounded-xl border border-barber-800 bg-barber-900 p-4', className)}>
        <div className={cn('h-3 w-20 rounded mb-2', shimmerClass)} />
        <div className={cn('h-8 w-28 rounded', shimmerClass)} />
        <div className={cn('h-2 w-16 rounded mt-2', shimmerClass)} />
    </div>
);

// Avatar skeleton
export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
    size = 'md',
    className,
}) => {
    const sizeClasses = {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-14 w-14',
    };

    return (
        <div className={cn('rounded-full', shimmerClass, sizeClasses[size], className)} />
    );
};

// Text line skeleton
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
    lines = 3,
    className,
}) => (
    <div className={cn('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, i) => (
            <div
                key={i}
                className={cn('h-3 rounded', shimmerClass)}
                style={{ width: `${i === lines - 1 ? 60 : 100}%` }}
            />
        ))}
    </div>
);

// Button skeleton
export const SkeletonButton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={cn('h-10 w-28 rounded-lg', shimmerClass, className)} />
);

export default {
    Card: SkeletonCard,
    ListItem: SkeletonListItem,
    List: SkeletonList,
    TableRow: SkeletonTableRow,
    StatCard: SkeletonStatCard,
    Avatar: SkeletonAvatar,
    Text: SkeletonText,
    Button: SkeletonButton,
};
