// src/ui/order-status-card.tsx - Order/appointment status tracking card
import React from 'react';
import { cn } from '../lib/cn';
import { Icon, IconName } from './icon';

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface OrderStatusCardProps {
    orderNumber: string;
    status: OrderStatus;
    title: string;
    subtitle?: string;
    timestamp?: string;
    estimatedTime?: string;
    items?: string[];
    total?: number;
    onViewDetails?: () => void;
    onCancel?: () => void;
    className?: string;
}

const statusConfig: Record<OrderStatus, { label: string; iconName: IconName; color: string; bgColor: string }> = {
    pending: { label: 'Pendente', iconName: 'clock', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' },
    confirmed: { label: 'Confirmado', iconName: 'check-circle', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
    preparing: { label: 'Em Preparo', iconName: 'loader', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
    ready: { label: 'Pronto', iconName: 'package', color: 'text-green-400', bgColor: 'bg-green-500/20' },
    completed: { label: 'Concluído', iconName: 'check', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
    cancelled: { label: 'Cancelado', iconName: 'x-circle', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

export const OrderStatusCard: React.FC<OrderStatusCardProps> = ({
    orderNumber,
    status,
    title,
    subtitle,
    timestamp,
    estimatedTime,
    items,
    total,
    onViewDetails,
    onCancel,
    className,
}) => {
    const config = statusConfig[status];

    const formatPrice = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    return (
        <div
            className={cn(
                'rounded-xl border border-barber-800 bg-barber-900 overflow-hidden',
                className,
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-barber-800">
                <div className="flex items-center gap-3">
                    <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', config.bgColor, config.color)}>
                        <Icon
                            name={config.iconName}
                            size={18}
                            className={status === 'preparing' ? 'animate-spin' : ''}
                        />
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-500">#{orderNumber}</p>
                        <p className={cn('text-[13px] font-bold', config.color)}>
                            {config.label}
                        </p>
                    </div>
                </div>
                {timestamp && (
                    <span className="text-[11px] text-gray-500">{timestamp}</span>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                <h3 className="text-[14px] font-semibold text-white">{title}</h3>
                {subtitle && (
                    <p className="mt-0.5 text-[12px] text-gray-500">{subtitle}</p>
                )}

                {estimatedTime && status !== 'completed' && status !== 'cancelled' && (
                    <div className="mt-3 flex items-center gap-2 text-barber-gold">
                        <Icon name="clock" size={14} />
                        <span className="text-[12px] font-medium">
                            Previsão: {estimatedTime}
                        </span>
                    </div>
                )}

                {items && items.length > 0 && (
                    <div className="mt-3 space-y-1">
                        {items.slice(0, 3).map((item, i) => (
                            <p key={i} className="text-[12px] text-gray-400">
                                • {item}
                            </p>
                        ))}
                        {items.length > 3 && (
                            <p className="text-[11px] text-gray-600">
                                +{items.length - 3} items
                            </p>
                        )}
                    </div>
                )}

                {total !== undefined && (
                    <div className="mt-3 pt-3 border-t border-barber-800 flex items-center justify-between">
                        <span className="text-[12px] text-gray-500">Total</span>
                        <span className="text-[15px] font-bold text-white">
                            {formatPrice(total)}
                        </span>
                    </div>
                )}
            </div>

            {/* Actions */}
            {(onViewDetails || onCancel) && (
                <div className="flex border-t border-barber-800">
                    {onViewDetails && (
                        <button
                            type="button"
                            onClick={onViewDetails}
                            className="flex-1 py-3 text-[13px] font-medium text-barber-gold hover:bg-barber-800 transition-colors"
                        >
                            Ver Detalhes
                        </button>
                    )}
                    {onCancel && status === 'pending' && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-3 text-[13px] font-medium text-red-400 hover:bg-red-500/10 transition-colors border-l border-barber-800"
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default OrderStatusCard;
