// src/ui/fab.tsx - Floating Action Button
import React from 'react';
import { cn } from '../lib/cn';
import { Icon, IconName } from './icon';

export interface FABProps {
    iconName: IconName;
    label?: string;
    onClick: () => void;
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
    extended?: boolean;
    className?: string;
}

export const FAB: React.FC<FABProps> = ({
    iconName,
    label,
    onClick,
    position = 'bottom-right',
    extended = false,
    className,
}) => {
    const positionClasses = {
        'bottom-right': 'bottom-6 right-6',
        'bottom-left': 'bottom-6 left-6',
        'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'fixed z-40 flex items-center gap-2 rounded-full bg-barber-gold text-black',
                'shadow-[0_8px_24px_rgba(0,0,0,0.4)]',
                'hover:bg-yellow-500 hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)]',
                'active:scale-95',
                'transition-all duration-150',
                extended ? 'h-14 px-6' : 'h-14 w-14 justify-center',
                positionClasses[position],
                className,
            )}
        >
            <Icon name={iconName} size={22} />
            {extended && label && (
                <span className="text-[14px] font-bold">{label}</span>
            )}
        </button>
    );
};

export default FAB;
