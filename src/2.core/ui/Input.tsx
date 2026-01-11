
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: React.ReactNode;
    error?: string;
    containerClassName?: string;
}

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
                <label className="block text-xs font-bold text-muted uppercase mb-1 ml-1 tracking-wide">
                    {label}
                </label>
            )}
            <div className="relative group">
                {icon && (
                    <div className="absolute left-3 top-0 bottom-0 flex items-center text-muted group-focus-within:text-barber-gold transition-colors duration-200 pointer-events-none">
                        {icon}
                    </div>
                )}
                <input
                    className={`w-full bg-input-bg border border-barber-800 text-main rounded-xl py-3 text-sm outline-none focus:border-barber-gold transition-all duration-200 ease-in-out placeholder:text-muted/50
          ${icon ? 'pl-10 pr-4' : 'px-4'} 
          ${error ? 'border-red-500 focus:border-red-500' : ''}
          ${className}`}
                    {...props}
                />
            </div>
            {error && (
                <span className="text-xs text-red-500 ml-1 font-medium animate-fade-in">{error}</span>
            )}
        </div>
    );
};

export default Input;
