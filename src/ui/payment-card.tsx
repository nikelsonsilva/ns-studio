// src/ui/payment-card.tsx - Payment method card display
import React from 'react';
import { cn } from '../lib/cn';
import { Icon, IconName } from './icon';

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'hipercard' | 'pix' | 'boleto' | 'other';

export interface PaymentCardProps {
    brand: CardBrand;
    last4?: string;
    expiryMonth?: number;
    expiryYear?: number;
    holderName?: string;
    isDefault?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onSelect?: () => void;
    selected?: boolean;
    className?: string;
}

const brandConfig: Record<CardBrand, { label: string; iconName: IconName; color: string }> = {
    visa: { label: 'Visa', iconName: 'credit-card', color: 'text-blue-400' },
    mastercard: { label: 'Mastercard', iconName: 'credit-card', color: 'text-orange-400' },
    amex: { label: 'Amex', iconName: 'credit-card', color: 'text-blue-300' },
    elo: { label: 'Elo', iconName: 'credit-card', color: 'text-yellow-400' },
    hipercard: { label: 'Hipercard', iconName: 'credit-card', color: 'text-red-400' },
    pix: { label: 'Pix', iconName: 'zap', color: 'text-teal-400' },
    boleto: { label: 'Boleto', iconName: 'receipt', color: 'text-gray-400' },
    other: { label: 'Cartão', iconName: 'credit-card', color: 'text-gray-400' },
};

export const PaymentCard: React.FC<PaymentCardProps> = ({
    brand,
    last4,
    expiryMonth,
    expiryYear,
    holderName,
    isDefault = false,
    onEdit,
    onDelete,
    onSelect,
    selected = false,
    className,
}) => {
    const config = brandConfig[brand];
    const isClickable = !!onSelect;
    const isPix = brand === 'pix';
    const isBoleto = brand === 'boleto';

    return (
        <div
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onClick={onSelect}
            onKeyDown={(e) => e.key === 'Enter' && onSelect?.()}
            className={cn(
                'relative rounded-xl border bg-barber-900 p-4 transition-all',
                isClickable && 'cursor-pointer hover:border-barber-gold/50',
                selected ? 'border-barber-gold bg-barber-gold/5' : 'border-barber-800',
                className,
            )}
        >
            <div className="flex items-center gap-3">
                <div
                    className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-lg',
                        selected ? 'bg-barber-gold/20' : 'bg-barber-800',
                        config.color,
                    )}
                >
                    <Icon name={config.iconName} size={22} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-white">
                            {config.label}
                        </span>
                        {isDefault && (
                            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400">
                                Padrão
                            </span>
                        )}
                    </div>

                    {last4 && !isPix && !isBoleto && (
                        <p className="mt-0.5 text-[13px] text-gray-400 font-mono">
                            •••• •••• •••• {last4}
                        </p>
                    )}

                    {isPix && (
                        <p className="mt-0.5 text-[12px] text-gray-500">
                            Pagamento instantâneo
                        </p>
                    )}

                    {isBoleto && (
                        <p className="mt-0.5 text-[12px] text-gray-500">
                            Vencimento em 3 dias úteis
                        </p>
                    )}

                    <div className="flex items-center gap-3 mt-1">
                        {holderName && (
                            <span className="text-[11px] text-gray-500 uppercase truncate">
                                {holderName}
                            </span>
                        )}
                        {expiryMonth && expiryYear && (
                            <span className="text-[11px] text-gray-600">
                                {expiryMonth.toString().padStart(2, '0')}/{expiryYear.toString().slice(-2)}
                            </span>
                        )}
                    </div>
                </div>

                {(onEdit || onDelete) && (
                    <div className="flex gap-1">
                        {onEdit && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-barber-800 hover:text-white transition-colors"
                            >
                                <Icon name="pencil" size={14} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            >
                                <Icon name="trash-2" size={14} />
                            </button>
                        )}
                    </div>
                )}
            </div>

            {selected && (
                <div className="absolute top-3 right-3">
                    <Icon name="check-circle" size={18} className="text-barber-gold" />
                </div>
            )}
        </div>
    );
};

export default PaymentCard;
