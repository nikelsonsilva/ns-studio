// src/ui/avatar.tsx - Avatar component with initials fallback
import React from 'react';
import { cn } from '../lib/cn';

export interface AvatarProps {
    name: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    src?: string | null;
    badge?: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
    name,
    src,
    size = 'md',
    badge,
    className,
    onClick,
}) => {
    const initials = name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0]?.toUpperCase())
        .join('');

    const sizeClasses = {
        xs: 'h-6 w-6 text-[10px]',
        sm: 'h-8 w-8 text-[11px]',
        md: 'h-10 w-10 text-[13px]',
        lg: 'h-14 w-14 text-[16px]',
        xl: 'h-20 w-20 text-[20px]',
    };

    return (
        <div
            className={cn('relative inline-flex', onClick && 'cursor-pointer')}
            onClick={onClick}
        >
            <div
                className={cn(
                    'flex items-center justify-center rounded-full border-2 border-barber-gold/70 bg-barber-800 text-barber-gold font-semibold',
                    sizeClasses[size],
                    className,
                )}
            >
                {src ? (
                    <img
                        src={src}
                        alt={name}
                        className="h-full w-full rounded-full object-cover"
                    />
                ) : (
                    initials
                )}
            </div>
            {badge && (
                <div className="absolute -bottom-1 -right-1">{badge}</div>
            )}
        </div>
    );
};

export default Avatar;
