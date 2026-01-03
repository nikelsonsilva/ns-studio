// src/ui/filter-button.tsx - Filter button with active count badge
import React from 'react';
import { cn } from '../lib/cn';
import { Icon } from './icon';

export interface FilterButtonProps {
    onClick: () => void;
    activeCount?: number;
    label?: string;
    className?: string;
}

export const FilterButton: React.FC<FilterButtonProps> = ({
    onClick,
    activeCount = 0,
    label = 'Filtros',
    className,
}) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'relative inline-flex h-9 items-center gap-2 rounded-lg border border-barber-800 bg-barber-900 px-3 text-[13px] text-gray-400 font-medium',
                'hover:border-barber-gold/70 hover:bg-barber-800 hover:text-white',
                'transition-colors duration-150',
                activeCount > 0 && 'border-barber-gold/50 bg-barber-gold/10 text-barber-gold',
                className,
            )}
        >
            <Icon name="filter" size={16} />
            <span>{label}</span>
            {activeCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-barber-gold px-1.5 text-[10px] font-bold text-black">
                    {activeCount}
                </span>
            )}
        </button>
    );
};

export default FilterButton;
