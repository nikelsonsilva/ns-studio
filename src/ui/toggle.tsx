// src/ui/toggle.tsx - Pill on/off toggle button
import React from 'react';
import { cn } from '../lib/cn';

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    pressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
    size?: 'sm' | 'md';
    icon?: React.ReactNode;
    label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
    pressed,
    onPressedChange,
    size = 'md',
    icon,
    label,
    className,
    ...props
}) => {
    const isPressed = !!pressed;

    const base =
        'inline-flex items-center justify-center rounded-full border transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-barber-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-barber-950';

    const sizeClasses = size === 'sm'
        ? 'h-7 px-3 text-[11px] gap-1'
        : 'h-8 px-3.5 text-[12px] gap-1.5';

    const pressedClasses =
        'border-barber-gold bg-barber-gold text-black shadow-lg';
    const unpressedClasses =
        'border-barber-800 bg-barber-900 text-gray-400 hover:border-barber-gold/60 hover:bg-barber-gold/10 hover:text-white';

    return (
        <button
            type="button"
            aria-pressed={isPressed}
            onClick={e => {
                props.onClick?.(e);
                onPressedChange?.(!isPressed);
            }}
            className={cn(
                base,
                sizeClasses,
                isPressed ? pressedClasses : unpressedClasses,
                className,
            )}
            {...props}
        >
            {icon && <span className="flex items-center">{icon}</span>}
            {label && <span className="whitespace-nowrap font-medium">{label}</span>}
        </button>
    );
};

export default Toggle;
