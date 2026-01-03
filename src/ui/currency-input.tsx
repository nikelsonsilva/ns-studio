import React, { useState, useEffect, useCallback, useRef } from 'react';

type CurrencyInputProps = {
    value: number;
    onChange: (value: number) => void;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showPrefix?: boolean;
    autoFocus?: boolean;
};

/**
 * CurrencyInput - Input de moeda estilo calculadora
 * Digita de trás para frente: 12345 → R$ 123,45
 */
export function CurrencyInput({
    value,
    onChange,
    placeholder = '0,00',
    className = '',
    disabled = false,
    size = 'md',
    showPrefix = true,
    autoFocus = false,
}: CurrencyInputProps) {
    const [displayValue, setDisplayValue] = useState<string>('');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // Format cents to display string
    const formatCents = useCallback((cents: number): string => {
        if (cents === 0) return '0,00';
        const reais = cents / 100;
        return reais.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    }, []);

    // Sync with external value ONLY when not focused
    useEffect(() => {
        if (!isFocused) {
            const cents = Math.round(value * 100);
            setDisplayValue(formatCents(cents));
        }
    }, [value, formatCents, isFocused]);

    // Handle input change
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Get only digits from input
        const rawValue = e.target.value.replace(/\D/g, '');

        // Convert to number (as cents)
        const cents = parseInt(rawValue, 10) || 0;

        // Limit to reasonable max (999 million)
        if (cents > 99999999999) return;

        // Update display
        setDisplayValue(formatCents(cents));
        // Call onChange with value in reais
        onChange(cents / 100);
    };

    // Handle key down for special behavior
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Allow: backspace, delete, tab, escape, enter, arrows
        const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'];

        if (allowedKeys.includes(e.key)) {
            return; // Let default behavior happen
        }

        // Only allow digits
        if (!/^[0-9]$/.test(e.key)) {
            e.preventDefault();
        }
    };

    // Handle focus
    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        e.target.select();
    };

    // Handle blur
    const handleBlur = () => {
        setIsFocused(false);
    };

    const sizeClasses = {
        sm: 'h-8 text-sm px-2',
        md: 'h-10 text-base px-3',
        lg: 'h-12 text-lg px-4 font-bold',
    };

    return (
        <div className={`relative inline-flex items-center ${className}`}>
            {showPrefix && (
                <span className={`absolute left-3 text-barber-gold font-bold pointer-events-none ${size === 'sm' ? 'text-sm' : ''}`}>
                    R$
                </span>
            )}
            <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                disabled={disabled}
                autoFocus={autoFocus}
                placeholder={placeholder}
                className={`
                    w-full bg-barber-950 border border-barber-700 rounded-lg text-white text-right
                    focus:border-barber-gold focus:ring-1 focus:ring-barber-gold/50 outline-none transition-all
                    ${showPrefix ? 'pl-10' : 'pl-3'} pr-3
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-text'}
                    ${sizeClasses[size]}
                `}
            />
        </div>
    );
}

export default CurrencyInput;
