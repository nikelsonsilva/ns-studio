// src/ui/address-card.tsx - Address display card
import React from 'react';
import { cn } from '../lib/cn';
import { Icon, IconName } from './icon';

export interface AddressCardProps {
    label?: string;
    name: string;
    street: string;
    neighborhood?: string;
    city: string;
    state: string;
    zipCode?: string;
    phone?: string;
    isDefault?: boolean;
    iconName?: IconName;
    onEdit?: () => void;
    onDelete?: () => void;
    onSelect?: () => void;
    selected?: boolean;
    className?: string;
}

export const AddressCard: React.FC<AddressCardProps> = ({
    label,
    name,
    street,
    neighborhood,
    city,
    state,
    zipCode,
    phone,
    isDefault = false,
    iconName = 'map-pin',
    onEdit,
    onDelete,
    onSelect,
    selected = false,
    className,
}) => {
    const isClickable = !!onSelect;

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
            <div className="flex gap-3">
                <div
                    className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        selected ? 'bg-barber-gold/20 text-barber-gold' : 'bg-barber-800 text-gray-400',
                    )}
                >
                    <Icon name={iconName} size={18} />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        {label && (
                            <span className="text-[11px] font-bold uppercase text-barber-gold">
                                {label}
                            </span>
                        )}
                        {isDefault && (
                            <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-400">
                                Padrão
                            </span>
                        )}
                    </div>

                    <h4 className="mt-1 text-[14px] font-semibold text-white truncate">
                        {name}
                    </h4>
                    <p className="mt-0.5 text-[12px] text-gray-400">
                        {street}
                        {neighborhood && `, ${neighborhood}`}
                    </p>
                    <p className="text-[12px] text-gray-500">
                        {city}, {state} {zipCode && `- ${zipCode}`}
                    </p>
                    {phone && (
                        <p className="mt-1 text-[12px] text-gray-500">
                            <Icon name="phone" size={12} className="inline mr-1" />
                            {phone}
                        </p>
                    )}
                </div>

                {(onEdit || onDelete) && (
                    <div className="flex flex-col gap-1">
                        {onEdit && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-barber-800 hover:text-white transition-colors"
                            >
                                <Icon name="pencil" size={14} />
                            </button>
                        )}
                        {onDelete && (
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors"
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

export default AddressCard;
