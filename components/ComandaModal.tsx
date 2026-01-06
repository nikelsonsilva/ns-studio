/**
 * ComandaModal.tsx - Modal de Fechamento de Comanda (Premium UI)
 * Design seguindo o padrão da aba Finance com hierarquia visual clara
 */

import React, { useState, useEffect } from 'react';
import {
    X, Clock, User, Scissors, CreditCard, Receipt, Percent,
    DollarSign, Check, AlertCircle, Loader2, Banknote,
    QrCode, ChevronRight, Sparkles, TrendingUp
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useComanda, PaymentSplit, ComandaAppointment } from '../lib/useComanda';

interface ComandaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    appointmentId: string;
    businessId: string;
}

const PAYMENT_METHODS = [
    { id: 'pix', label: 'Pix', icon: QrCode, color: '#22c55e' },
    { id: 'credit', label: 'Crédito', icon: CreditCard, color: '#a855f7' },
    { id: 'debit', label: 'Débito', icon: CreditCard, color: '#3b82f6' },
    { id: 'cash', label: 'Dinheiro', icon: Banknote, color: '#f59e0b' }
] as const;

const STATUS_CONFIG = {
    pending: { label: 'Pendente', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
    confirmed: { label: 'Confirmado', bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' },
    completed: { label: 'Concluído', bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
    no_show: { label: 'No-Show', bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
    cancelled: { label: 'Cancelado', bg: 'rgba(113, 113, 122, 0.15)', color: '#71717a' }
};

const ComandaModal: React.FC<ComandaModalProps> = ({
    isOpen,
    onClose,
    onUpdate,
    appointmentId,
    businessId
}) => {
    const {
        comanda,
        loading,
        error,
        loadComandaByAppointment,
        setDiscount,
        setTip,
        closeComanda,
        updateAppointmentStatus
    } = useComanda(businessId);

    const [selectedPayments, setSelectedPayments] = useState<PaymentSplit[]>([]);
    const [showDiscountInput, setShowDiscountInput] = useState(false);
    const [showTipInput, setShowTipInput] = useState(false);
    const [discountValue, setDiscountValue] = useState('');
    const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
    const [tipValue, setTipValue] = useState('');
    const [emitNfse, setEmitNfse] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [closeError, setCloseError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && appointmentId) {
            loadComandaByAppointment(appointmentId);
            setSelectedPayments([]);
            setShowDiscountInput(false);
            setShowTipInput(false);
            setDiscountValue('');
            setTipValue('');
            setEmitNfse(false);
            setCloseError(null);
        }
    }, [isOpen, appointmentId, loadComandaByAppointment]);

    useEffect(() => {
        if (comanda && selectedPayments.length === 0) {
            setSelectedPayments([{ payment_method: 'pix', amount: comanda.total }]);
        }
    }, [comanda]);

    useEffect(() => {
        if (comanda && selectedPayments.length === 1) {
            setSelectedPayments([{ ...selectedPayments[0], amount: comanda.total }]);
        }
    }, [comanda?.total]);

    if (!isOpen) return null;

    const handlePaymentMethodSelect = (method: typeof PAYMENT_METHODS[number]['id']) => {
        setSelectedPayments([{ payment_method: method, amount: comanda?.total || 0 }]);
    };

    const handleApplyDiscount = () => {
        const value = parseFloat(discountValue);
        if (!isNaN(value) && value > 0) {
            setDiscount(value, discountType);
            setShowDiscountInput(false);
        }
    };

    const handleApplyTip = () => {
        const value = parseFloat(tipValue);
        if (!isNaN(value) && value > 0) {
            setTip(value);
            setShowTipInput(false);
        }
    };

    const handleConfirm = async () => {
        if (!comanda) return;
        setIsClosing(true);
        setCloseError(null);

        const success = await closeComanda(selectedPayments, emitNfse);

        if (success) {
            onUpdate();
            onClose();
        } else {
            setCloseError('Erro ao finalizar comanda. Tente novamente.');
        }
        setIsClosing(false);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatTime = (datetime: string) => {
        try {
            return format(parseISO(datetime), 'HH:mm');
        } catch {
            return '--:--';
        }
    };

    const totalCommissions = comanda?.appointments.reduce(
        (sum, appt) => sum + (appt.commission_amount || 0), 0
    ) || 0;

    const selectedMethod = PAYMENT_METHODS.find(m => m.id === selectedPayments[0]?.payment_method);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
                style={{
                    background: 'linear-gradient(180deg, #1c1c1e 0%, #121214 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="relative p-5 border-b"
                    style={{
                        borderColor: 'rgba(255, 255, 255, 0.06)',
                        background: 'linear-gradient(180deg, rgba(34, 197, 94, 0.08) 0%, transparent 100%)'
                    }}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center"
                                style={{
                                    background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                                }}
                            >
                                <Receipt size={22} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Fechar Conta</h2>
                                {comanda && (
                                    <p className="text-sm text-zinc-400">
                                        {comanda.client_name} • {format(new Date(comanda.comanda_date), "dd/MM/yyyy")}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="w-12 h-12 rounded-full border-2 border-zinc-700 border-t-green-500 animate-spin" />
                            <span className="text-zinc-500 text-sm">Carregando...</span>
                        </div>
                    ) : error ? (
                        <div
                            className="flex items-center gap-3 p-4 rounded-xl"
                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                        >
                            <AlertCircle size={20} className="text-red-500" />
                            <span className="text-red-400">{error}</span>
                        </div>
                    ) : comanda && (
                        <>
                            {/* Services List */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                                        Serviços
                                    </span>
                                    <span className="text-xs text-zinc-600">{comanda.appointments.length} item(s)</span>
                                </div>

                                <div className="space-y-2">
                                    {comanda.appointments.map((appt, idx) => {
                                        const status = STATUS_CONFIG[appt.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                                        return (
                                            <div
                                                key={appt.id}
                                                className="group p-4 rounded-xl transition-all hover:bg-white/[0.02]"
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.02)',
                                                    border: '1px solid rgba(255, 255, 255, 0.05)'
                                                }}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium text-white truncate">
                                                                {appt.service?.name || 'Serviço'}
                                                            </span>
                                                            <span
                                                                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                                                                style={{ background: status.bg, color: status.color }}
                                                            >
                                                                {status.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-sm text-zinc-500">
                                                            <span className="flex items-center gap-1">
                                                                <Clock size={12} />
                                                                {formatTime(appt.start_datetime)}
                                                            </span>
                                                            <span>•</span>
                                                            <span>{appt.professional?.name || 'Profissional'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-white">
                                                            {formatCurrency(appt.service?.price || 0)}
                                                        </div>
                                                        <div className="text-xs text-emerald-500">
                                                            {formatCurrency(appt.commission_amount || 0)} comissão
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Discount & Tip Buttons */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setShowDiscountInput(!showDiscountInput)}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${comanda.discount_amount > 0
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                        : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-300'
                                        }`}
                                    style={{ border: '1px solid' }}
                                >
                                    <Percent size={16} />
                                    <span className="text-sm font-medium">
                                        {comanda.discount_amount > 0 ? formatCurrency(comanda.discount_amount) : 'Desconto'}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setShowTipInput(!showTipInput)}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl transition-all ${comanda.tip_amount > 0
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                        : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-300'
                                        }`}
                                    style={{ border: '1px solid' }}
                                >
                                    <Sparkles size={16} />
                                    <span className="text-sm font-medium">
                                        {comanda.tip_amount > 0 ? formatCurrency(comanda.tip_amount) : 'Gorjeta'}
                                    </span>
                                </button>
                            </div>

                            {/* Discount Input */}
                            {showDiscountInput && (
                                <div
                                    className="p-4 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-200"
                                    style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                                >
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setDiscountType('fixed')}
                                            className={`flex-1 p-2.5 rounded-lg text-sm font-medium transition-all ${discountType === 'fixed'
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-white/5 text-zinc-400'
                                                }`}
                                        >
                                            R$ Fixo
                                        </button>
                                        <button
                                            onClick={() => setDiscountType('percent')}
                                            className={`flex-1 p-2.5 rounded-lg text-sm font-medium transition-all ${discountType === 'percent'
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-white/5 text-zinc-400'
                                                }`}
                                        >
                                            % Porcentagem
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder={discountType === 'fixed' ? 'Valor em R$' : 'Porcentagem %'}
                                            value={discountValue}
                                            onChange={e => setDiscountValue(e.target.value)}
                                            className="flex-1 px-4 py-3 rounded-lg text-white placeholder-zinc-600 outline-none"
                                            style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                                        />
                                        <button
                                            onClick={handleApplyDiscount}
                                            className="px-5 rounded-lg font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                                        >
                                            Aplicar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Tip Input */}
                            {showTipInput && (
                                <div
                                    className="p-4 rounded-xl animate-in slide-in-from-top-2 duration-200"
                                    style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                                >
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="Valor da gorjeta em R$"
                                            value={tipValue}
                                            onChange={e => setTipValue(e.target.value)}
                                            className="flex-1 px-4 py-3 rounded-lg text-white placeholder-zinc-600 outline-none"
                                            style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                                        />
                                        <button
                                            onClick={handleApplyTip}
                                            className="px-5 rounded-lg font-medium bg-amber-500 text-black hover:bg-amber-400 transition-colors"
                                        >
                                            Aplicar
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Payment Methods */}
                            <div>
                                <span className="text-[11px] font-semibold tracking-wider text-zinc-500 uppercase block mb-3">
                                    Forma de Pagamento
                                </span>
                                <div className="grid grid-cols-4 gap-2">
                                    {PAYMENT_METHODS.map(method => {
                                        const isSelected = selectedPayments.some(p => p.payment_method === method.id);
                                        const Icon = method.icon;
                                        return (
                                            <button
                                                key={method.id}
                                                onClick={() => handlePaymentMethodSelect(method.id)}
                                                className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all duration-200 ${isSelected ? 'scale-[1.02]' : 'hover:bg-white/[0.04]'
                                                    }`}
                                                style={{
                                                    background: isSelected ? `${method.color}15` : 'rgba(255, 255, 255, 0.02)',
                                                    border: `1px solid ${isSelected ? method.color : 'rgba(255, 255, 255, 0.05)'}`,
                                                    boxShadow: isSelected ? `0 4px 12px ${method.color}20` : 'none'
                                                }}
                                            >
                                                <Icon size={20} style={{ color: isSelected ? method.color : '#71717a' }} />
                                                <span
                                                    className="text-xs font-medium"
                                                    style={{ color: isSelected ? method.color : '#a1a1aa' }}
                                                >
                                                    {method.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Summary Card */}
                            <div
                                className="p-4 rounded-xl"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 100%)',
                                    border: '1px solid rgba(34, 197, 94, 0.15)'
                                }}
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-zinc-400">Subtotal</span>
                                        <span className="text-white">{formatCurrency(comanda.subtotal)}</span>
                                    </div>
                                    {comanda.discount_amount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-emerald-500">Desconto</span>
                                            <span className="text-emerald-500">- {formatCurrency(comanda.discount_amount)}</span>
                                        </div>
                                    )}
                                    {comanda.tip_amount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-amber-500">Gorjeta</span>
                                            <span className="text-amber-500">+ {formatCurrency(comanda.tip_amount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                                        <span className="text-zinc-500">Comissões</span>
                                        <span className="text-zinc-500">{formatCurrency(totalCommissions)}</span>
                                    </div>
                                </div>

                                <div
                                    className="flex justify-between items-center mt-4 pt-4"
                                    style={{ borderTop: '1px solid rgba(34, 197, 94, 0.2)' }}
                                >
                                    <span className="text-white font-semibold">Total</span>
                                    <span className="text-2xl font-bold text-emerald-500">
                                        {formatCurrency(comanda.total)}
                                    </span>
                                </div>
                            </div>

                            {/* NFS-e Toggle */}
                            <div
                                className="flex items-center justify-between p-4 rounded-xl"
                                style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                            >
                                <div className="flex items-center gap-3">
                                    <Receipt size={18} className="text-zinc-500" />
                                    <span className="text-sm text-zinc-300">Emitir Nota Fiscal</span>
                                </div>
                                <button
                                    onClick={() => setEmitNfse(!emitNfse)}
                                    className={`w-11 h-6 rounded-full transition-all duration-200 relative ${emitNfse ? 'bg-emerald-500' : 'bg-zinc-700'
                                        }`}
                                >
                                    <div
                                        className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all duration-200 ${emitNfse ? 'left-[22px]' : 'left-0.5'
                                            }`}
                                        style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
                                    />
                                </button>
                            </div>

                            {/* Error Message */}
                            {closeError && (
                                <div
                                    className="flex items-center gap-2 p-3 rounded-xl animate-in shake duration-200"
                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                >
                                    <AlertCircle size={16} className="text-red-500" />
                                    <span className="text-sm text-red-400">{closeError}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {comanda && (
                    <div
                        className="p-4 border-t flex items-center gap-3"
                        style={{
                            borderColor: 'rgba(255, 255, 255, 0.06)',
                            background: 'rgba(0, 0, 0, 0.3)'
                        }}
                    >
                        <button
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isClosing || loading}
                            className="flex-1 py-2.5 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                            style={{
                                background: '#22c55e',
                                color: 'white'
                            }}
                        >
                            {isClosing ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Finalizando...</span>
                                </>
                            ) : (
                                <>
                                    <Check size={16} />
                                    <span>Confirmar {formatCurrency(comanda.total)}</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComandaModal;
