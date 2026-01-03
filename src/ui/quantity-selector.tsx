// src/ui/quantity-selector.tsx - Quantity +/- selector
import React from 'react';
import { cn } from '../lib/cn';
import { Icon } from './icon';

export interface QuantitySelectorProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    className?: string;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
    value,
    onChange,
    min = 0,
    max = 99,
    size = 'md',
    disabled = false,
    className,
}) => {
    const increment = () => {
        if (value < max && !disabled) onChange(value + 1);
    };

    const decrement = () => {
        if (value > min && !disabled) onChange(value - 1);
    };

    const sizeClasses = {
        sm: { button: 'h-7 w-7', text: 'text-[13px] min-w-[28px]' },
        md: { button: 'h-9 w-9', text: 'text-[15px] min-w-[36px]' },
        lg: { button: 'h-11 w-11', text: 'text-[18px] min-w-[44px]' },
    };

    const iconSizes = { sm: 14, md: 16, lg: 20 };

    return (
        <div className={cn('inline-flex items-center gap-1', className)}>
            <button
                type="button"
                onClick={decrement}
                disabled={disabled || value <= min}
                className={cn(
                    'flex items-center justify-center rounded-full border border-barber-800 bg-barber-900 text-gray-400',
                    'hover:border-barber-gold/70 hover:bg-barber-800 hover:text-white',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    'transition-all duration-150',
                    sizeClasses[size].button,
                )}
            >
                <Icon name="minus" size={iconSizes[size]} />
            </button>

            <span
                className={cn(
                    'text-center font-bold text-white',
                    sizeClasses[size].text,
                )}
            >
                {value}
            </span>

            <button
                type="button"
                onClick={increment}
                disabled={disabled || value >= max}
                className={cn(
                    'flex items-center justify-center rounded-full border border-barber-800 bg-barber-900 text-gray-400',
                    'hover:border-barber-gold/70 hover:bg-barber-800 hover:text-white',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                    'transition-all duration-150',
                    sizeClasses[size].button,
                )}
            >
                <Icon name="plus" size={iconSizes[size]} />
            </button>
        </div>
    );
};

export default QuantitySelector;
