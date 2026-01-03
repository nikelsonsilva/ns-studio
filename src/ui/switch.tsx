// src/ui/switch.tsx - Premium Switch Component (Barber Dark Theme)
import React from 'react';

interface SwitchProps {
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
    checked,
    onChange,
    disabled,
}) => {
    return (
        <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`
        relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-all duration-200
        ${checked
                    ? 'bg-barber-gold border-barber-gold'
                    : 'bg-barber-800 border-barber-700'
                }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
        >
            <span
                className={`
          inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200
          ${checked ? 'translate-x-4' : 'translate-x-0.5'}
        `}
            />
        </button>
    );
};

export default Switch;
