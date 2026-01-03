import React from 'react';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * Switch Component - NS Studio Dark Theme
 * Uses dark-theme-colors.css variables
 */
const Switch: React.FC<SwitchProps> = ({ checked, onCheckedChange, disabled = false }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={`
        relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out 
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dark-switch-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dark-switch-focus-offset)]
        ${checked ? 'bg-[var(--dark-switch-on)]' : 'bg-[var(--dark-switch-off)]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span className="sr-only">Use setting</span>
      <span
        aria-hidden="true"
        className={`
          pointer-events-none block h-4 w-4 transform rounded-full bg-[var(--dark-switch-thumb)] shadow-lg ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-4' : 'translate-x-0'}
        `}
      />
    </button>
  );
};

export default Switch;
