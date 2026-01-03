import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: React.ReactNode;
    error?: string;
    containerClassName?: string;
}

/**
 * Input Component - NS Studio Dark Theme
 * Uses dark-theme-colors.css variables
 */
const Input: React.FC<InputProps> = ({
    label,
    icon,
    error,
    className = '',
    containerClassName = '',
    ...props
}) => {
    return (
        <div className={`space-y-1 ${containerClassName}`}>
            {label && (
                <label className="block text-xs font-semibold text-[var(--dark-text-muted)] uppercase mb-1.5 ml-0.5 tracking-wide">
                    {label}
                </label>
            )}
            <div className="relative group flex items-center">
                {icon && (
                    <div className="absolute left-3 flex items-center justify-center text-[var(--dark-text-subtle)] group-focus-within:text-[var(--dark-brand-primary)] transition-colors duration-150 pointer-events-none">
                        {icon}
                    </div>
                )}
                <input
                    className={`
                        w-full h-11 
                        bg-[var(--dark-input-bg)] 
                        border border-[var(--dark-input-border)] 
                        text-[var(--dark-input-text)] 
                        rounded-xl text-sm 
                        outline-none 
                        hover:border-[var(--dark-border-strong)]
                        focus:border-[var(--dark-input-border-focus)] 
                        focus:ring-4 focus:ring-[var(--dark-checkbox-focus-ring)]
                        transition-all duration-150 ease-[cubic-bezier(0.2,0.8,0.2,1)]
                        placeholder:text-[var(--dark-input-placeholder)]
                        ${icon ? 'pl-10 pr-4' : 'px-4'} 
                        ${error ? 'border-[var(--dark-input-border-error)] focus:border-[var(--dark-input-border-error)] focus:ring-[var(--dark-toast-error-bg)]' : ''}
                        ${className}
                    `.replace(/\s+/g, ' ').trim()}
                    {...props}
                />
            </div>
            {error && (
                <span className="text-xs text-[var(--dark-toast-error-icon)] ml-1 font-medium animate-fade-in">{error}</span>
            )}
        </div>
    );
};

export default Input;
