// src/ui/promo-code-input.tsx - Promo/coupon code input with validation
import React, { useState } from 'react';
import { cn } from '../lib/cn';
import { Icon } from './icon';

export interface PromoCodeInputProps {
    onApply: (code: string) => void;
    isLoading?: boolean;
    error?: string;
    success?: string;
    appliedCode?: string;
    onRemove?: () => void;
    placeholder?: string;
    className?: string;
}

export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
    onApply,
    isLoading = false,
    error,
    success,
    appliedCode,
    onRemove,
    placeholder = 'Código promocional',
    className,
}) => {
    const [code, setCode] = useState('');

    const handleApply = () => {
        if (code.trim()) {
            onApply(code.trim().toUpperCase());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleApply();
        }
    };

    // If code is applied, show success state
    if (appliedCode) {
        return (
            <div className={cn('rounded-xl border border-green-500/50 bg-green-500/10 p-3', className)}>
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                        <Icon name="tag" size={18} />
                    </div>
                    <div className="flex-1">
                        <p className="text-[13px] font-bold text-green-400 uppercase">
                            {appliedCode}
                        </p>
                        {success && (
                            <p className="text-[11px] text-green-500">{success}</p>
                        )}
                    </div>
                    {onRemove && (
                        <button
                            type="button"
                            onClick={onRemove}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-green-400 hover:bg-green-500/20 transition-colors"
                        >
                            <Icon name="x" size={16} />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className={cn('space-y-2', className)}>
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Icon
                        name="tag"
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                    />
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={isLoading}
                        className={cn(
                            'w-full h-11 rounded-lg border bg-barber-900 pl-10 pr-4 text-[14px] text-white font-mono uppercase',
                            'placeholder:text-gray-600 focus:outline-none focus:ring-1',
                            error
                                ? 'border-red-500/50 focus:ring-red-500/50'
                                : 'border-barber-800 focus:border-barber-gold focus:ring-barber-gold/50',
                            'transition-colors',
                        )}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleApply}
                    disabled={isLoading || !code.trim()}
                    className={cn(
                        'h-11 px-5 rounded-lg font-semibold text-[13px]',
                        'bg-barber-gold text-black hover:bg-yellow-500',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'transition-all',
                    )}
                >
                    {isLoading ? (
                        <Icon name="loader" size={16} className="animate-spin" />
                    ) : (
                        'Aplicar'
                    )}
                </button>
            </div>
            {error && (
                <p className="text-[12px] text-red-400 flex items-center gap-1">
                    <Icon name="alert-circle" size={12} />
                    {error}
                </p>
            )}
        </div>
    );
};

export default PromoCodeInput;
