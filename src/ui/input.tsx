import React from 'react';

type InputProps = {
    icon?: React.ReactNode;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    className?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur?: () => void;
};

export function Input({
    icon,
    className = '',
    placeholder,
    value,
    onChange,
    type = 'text',
    disabled,
    autoFocus,
    onKeyDown,
    onBlur,
}: InputProps) {
    return (
        <div className="relative">
            {icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                    {icon}
                </div>
            )}
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                disabled={disabled}
                autoFocus={autoFocus}
                onKeyDown={onKeyDown}
                onBlur={onBlur}
                className={`
          h-[36px] w-full bg-neutral-900 border border-neutral-700 rounded-md text-sm text-neutral-100
          placeholder-neutral-500 focus:border-primary-600 focus:ring-0 outline-none transition-colors
          ${icon ? 'pl-10 pr-3' : 'px-3'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
            />
        </div>
    );
}

export default Input;
