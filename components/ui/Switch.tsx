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
      style={{
        width: '36px',
        height: '20px',
        padding: '2px',
        boxSizing: 'border-box',
        flexShrink: 0
      }}
      className={`
        relative inline-flex items-center rounded-full cursor-pointer transition-colors duration-200 ease-in-out 
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dark-switch-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dark-switch-focus-offset)]
        ${checked ? 'bg-[var(--dark-switch-on)]' : 'bg-[var(--dark-switch-off)]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span className="sr-only">Use setting</span>
      <span
        aria-hidden="true"
        style={{
          width: '16px',
          height: '16px',
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
          flexShrink: 0
        }}
        className="pointer-events-none block rounded-full bg-[var(--dark-switch-thumb)] shadow-lg ring-0 transition duration-200 ease-in-out"
      />
    </button>
  );
};

export default Switch;
