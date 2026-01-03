// src/ui/referral-card.tsx - Referral/invite friend card
import React from 'react';
import { cn } from '../lib/cn';
import { Icon } from './icon';

export interface ReferralCardProps {
    referralCode: string;
    reward?: string;
    referralCount?: number;
    earnings?: number;
    onShare?: () => void;
    onCopyCode?: () => void;
    className?: string;
}

export const ReferralCard: React.FC<ReferralCardProps> = ({
    referralCode,
    reward,
    referralCount = 0,
    earnings,
    onShare,
    onCopyCode,
    className,
}) => {
    const formatPrice = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value);
    };

    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-xl border border-barber-gold/30 bg-gradient-to-br from-barber-gold/10 to-transparent',
                className,
            )}
        >
            {/* Background Decoration */}
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-barber-gold/10 blur-2xl" />
            <div className="absolute -left-6 -bottom-6 h-20 w-20 rounded-full bg-barber-gold/5 blur-xl" />

            <div className="relative p-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-barber-gold/20">
                        <Icon name="gift" size={22} className="text-barber-gold" />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-bold text-white">
                            Indique e Ganhe
                        </h3>
                        {reward && (
                            <p className="text-[12px] text-barber-gold">
                                {reward}
                            </p>
                        )}
                    </div>
                </div>

                {/* Referral Code */}
                <div className="rounded-lg border border-dashed border-barber-gold/40 bg-barber-900/50 p-3 mb-4">
                    <p className="text-[10px] text-gray-500 uppercase mb-1">
                        Seu código
                    </p>
                    <div className="flex items-center justify-between">
                        <span className="text-[18px] font-bold text-barber-gold font-mono tracking-wider">
                            {referralCode}
                        </span>
                        {onCopyCode && (
                            <button
                                type="button"
                                onClick={onCopyCode}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-barber-gold/20 text-barber-gold hover:bg-barber-gold/30 transition-colors"
                            >
                                <Icon name="copy" size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-lg bg-barber-800/50 p-3 text-center">
                        <p className="text-[10px] text-gray-500 uppercase">Indicações</p>
                        <p className="text-[18px] font-bold text-white">{referralCount}</p>
                    </div>
                    <div className="rounded-lg bg-barber-800/50 p-3 text-center">
                        <p className="text-[10px] text-gray-500 uppercase">Ganhos</p>
                        <p className="text-[18px] font-bold text-green-400">
                            {earnings !== undefined ? formatPrice(earnings) : 'R$ 0'}
                        </p>
                    </div>
                </div>

                {/* Share Button */}
                {onShare && (
                    <button
                        type="button"
                        onClick={onShare}
                        className={cn(
                            'w-full h-11 rounded-lg font-bold text-[14px] flex items-center justify-center gap-2',
                            'bg-barber-gold text-black hover:bg-yellow-500',
                            'transition-all',
                        )}
                    >
                        <Icon name="share-2" size={16} />
                        Compartilhar
                    </button>
                )}
            </div>
        </div>
    );
};

export default ReferralCard;
