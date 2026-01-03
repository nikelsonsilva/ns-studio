// src/ui/field.tsx - Input Field with Linear Dark tokens
import React from 'react';

interface FieldRootProps {
    label?: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
    className?: string;
}

export const FieldRoot: React.FC<FieldRootProps> = ({
    label,
    hint,
    error,
    children,
    className = '',
}) => (
    <div className={`space-y-1.5 ${className}`}>
        {label && <label className="text-[12px] font-medium text-text-muted">{label}</label>}
        {children}
        {error ? (
            <p className="text-[11px] text-danger-500">{error}</p>
        ) : hint ? (
            <p className="text-[11px] text-text-faint">{hint}</p>
        ) : null}
    </div>
);

interface TextInputProps {
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur?: () => void;
    leftIcon?: React.ReactNode;
    className?: string;
    type?: string;
    disabled?: boolean;
    autoFocus?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
    leftIcon,
    className = '',
    type = 'text',
    placeholder,
    value,
    onChange,
    onKeyDown,
    onBlur,
    disabled,
    autoFocus,
}) => (
    <div className="relative">
        {leftIcon && (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-faint">
                {leftIcon}
            </span>
        )}
        <input
            type={type}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
            disabled={disabled}
            autoFocus={autoFocus}
            className={`
        w-full rounded-lg bg-surface border border-border-subtle text-[13px] text-text-strong
        h-10 px-3 placeholder:text-text-faint
        focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/60
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all
        ${leftIcon ? 'pl-10' : ''}
        ${className}
      `}
        />
    </div>
);

export default FieldRoot;
