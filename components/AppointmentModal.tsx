/**
 * AppointmentModal.tsx - Modal Unificado de Agendamento
 * Step 1: Detalhes do Agendamento
 * Step 2: Fechamento de Conta (Comanda)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    X, Clock, User, Scissors, Calendar, Check, XCircle, AlertCircle,
    Edit2, Save, CreditCard, Phone, Receipt, Loader2, ChevronLeft,
    QrCode, Banknote, Percent, Sparkles, CheckCircle, UserX, Trash2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useComanda, PaymentSplit } from '../lib/useComanda';
import type { Service, Professional } from '../types';

interface Appointment {
    id: string;
    start_datetime: string;
    end_datetime: string;
    status: string;
    payment_status?: string;
    payment_method?: string;
    customer_name?: string;
    client_id?: string;
    client?: { id: string; name: string; phone?: string; email?: string };
    service_id?: string;
    service?: { id: string; name: string; duration_minutes: number; price: number };
    professional_id: string;
    professional?: { id: string; name: string; commission_rate?: number };
    notes?: string;
}

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    appointment: Appointment | null;
    professionals: Professional[];
    services: Service[];
    businessId: string;
    onReschedule?: (appointment: Appointment) => void;
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
    cancelled: { label: 'Cancelado', bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' },
    no_show: { label: 'Faltou', bg: 'rgba(113, 113, 122, 0.15)', color: '#71717a' }
};

const PAYMENT_STATUS_CONFIG = {
    pending: { label: 'Pagamento Pendente', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
    awaiting_payment: { label: 'Aguardando Pagamento', bg: 'rgba(249, 115, 22, 0.15)', color: '#f97316' },
    paid: { label: 'Pago', bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' },
    refunded: { label: 'Reembolsado', bg: 'rgba(113, 113, 122, 0.15)', color: '#71717a' }
};

const AppointmentModal: React.FC<AppointmentModalProps> = ({
    isOpen,
    onClose,
    onUpdate,
    appointment,
    professionals,
    services,
    businessId,
    onReschedule
}) => {
    // Step management
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);

    // Step 1 state - Details
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [notes, setNotes] = useState('');
    const [currentStatus, setCurrentStatus] = useState(appointment?.status || 'confirmed');

    // Step 2 state - Comanda/Checkout
    const {
        comanda,
        loading: comandaLoading,
        error: comandaError,
        loadComandaByAppointment,
        setDiscount,
        setTip,
        closeComanda
    } = useComanda(businessId);

    const [selectedPayments, setSelectedPayments] = useState<PaymentSplit[]>([]);
    const [showDiscountInput, setShowDiscountInput] = useState(false);
    const [showTipInput, setShowTipInput] = useState(false);
    const [discountValue, setDiscountValue] = useState('');
    const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
    const [tipValue, setTipValue] = useState('');
    const [emitNfse, setEmitNfse] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen && appointment) {
            setCurrentStep(1);
            setSelectedProfessionalId(appointment.professional_id || '');
            setSelectedServiceId(appointment.service_id || '');
            setNotes(appointment.notes || '');
            setCurrentStatus(appointment.status || 'confirmed');
            setIsEditing(false);
            setError('');
            setSelectedPayments([]);
            setShowDiscountInput(false);
            setShowTipInput(false);
            setDiscountValue('');
            setTipValue('');
            setEmitNfse(false);
        }
    }, [isOpen, appointment]);

    // Load comanda when entering step 2
    useEffect(() => {
        if (currentStep === 2 && appointment?.id) {
            loadComandaByAppointment(appointment.id);
        }
    }, [currentStep, appointment?.id, loadComandaByAppointment]);

    // Set default payment when comanda loads
    useEffect(() => {
        if (comanda && selectedPayments.length === 0) {
            setSelectedPayments([{ payment_method: 'pix', amount: comanda.total }]);
        }
    }, [comanda]);

    // Update payment amount when total changes
    useEffect(() => {
        if (comanda && selectedPayments.length === 1) {
            setSelectedPayments([{ ...selectedPayments[0], amount: comanda.total }]);
        }
    }, [comanda?.total]);

    if (!isOpen || !appointment) return null;

    // Resolved data
    const resolvedService = services.find(s => s.id === appointment.service_id) || appointment.service;
    const resolvedProfessional = professionals.find(p => p.id === appointment.professional_id) || appointment.professional;
    const clientName = appointment.customer_name || appointment.client?.name || 'Cliente';
    const serviceName = resolvedService?.name || 'Serviço';
    const servicePrice = resolvedService?.price || 0;
    const serviceDuration = resolvedService?.duration_minutes || 60;
    const professionalName = resolvedProfessional?.name || 'Profissional';
    const commissionRate = (resolvedProfessional as any)?.commission_rate || 50;
    const commissionAmount = servicePrice * (commissionRate / 100);
    const startTime = parseISO(appointment.start_datetime);

    const statusConfig = STATUS_CONFIG[currentStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
    const paymentStatusConfig = PAYMENT_STATUS_CONFIG[appointment.payment_status as keyof typeof PAYMENT_STATUS_CONFIG] || PAYMENT_STATUS_CONFIG.pending;
    const canModify = currentStatus !== 'completed' && currentStatus !== 'cancelled';

    // Handlers - Step 1
    const handleSave = async () => {
        setIsLoading(true);
        setError('');
        try {
            const { error: updateError } = await supabase
                .from('appointments')
                .update({
                    professional_id: selectedProfessionalId,
                    service_id: selectedServiceId,
                    notes: notes
                })
                .eq('id', appointment.id);
            if (updateError) throw updateError;
            setIsEditing(false);
            onUpdate();
        } catch (err: any) {
            setError(err.message || 'Erro ao atualizar');
        }
        setIsLoading(false);
    };

    const handleStatusChange = async (newStatus: string) => {
        // Update local state immediately for instant UI feedback
        setCurrentStatus(newStatus);
        setIsLoading(true);
        setError('');
        try {
            const { error: updateError } = await supabase
                .from('appointments')
                .update({ status: newStatus })
                .eq('id', appointment.id);
            if (updateError) throw updateError;
            onUpdate();
            // Don't close modal - let user continue viewing or proceed to checkout
        } catch (err: any) {
            // Revert status on error
            setCurrentStatus(appointment.status);
            setError(err.message || 'Erro ao atualizar status');
        }
        setIsLoading(false);
    };

    // Handlers - Step 2
    const handlePaymentMethodSelect = (method: typeof PAYMENT_METHODS[number]['id']) => {
        setSelectedPayments([{ payment_method: method, amount: comanda?.total || 0 }]);
    };

    const handleApplyDiscount = () => {
        const value = parseFloat(discountValue);
        if (!isNaN(value) && value > 0) {
            setDiscount(value, discountType);
            setShowDiscountInput(false);
            setDiscountValue('');
        }
    };

    const handleApplyTip = () => {
        const value = parseFloat(tipValue);
        if (!isNaN(value) && value > 0) {
            setTip(value);
            setShowTipInput(false);
            setTipValue('');
        }
    };

    const handleConfirmPayment = async () => {
        if (!comanda) return;
        setIsClosing(true);
        setError('');
        const success = await closeComanda(selectedPayments, emitNfse);
        if (success) {
            onUpdate();
            onClose();
        } else {
            setError('Erro ao finalizar. Tente novamente.');
        }
        setIsClosing(false);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatTime = (datetime: string) => {
        try { return format(parseISO(datetime), 'HH:mm'); }
        catch { return '--:--'; }
    };

    const totalCommissions = comanda?.appointments.reduce(
        (sum, appt) => sum + (appt.commission_amount || 0), 0
    ) || 0;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl flex flex-col"
                style={{
                    background: 'linear-gradient(180deg, #1c1c1e 0%, #121214 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header with Steps */}
                <div
                    className="p-4 border-b"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            {currentStep === 2 && (
                                <button
                                    onClick={() => setCurrentStep(1)}
                                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                            )}
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                style={{
                                    background: currentStep === 1
                                        ? 'rgba(212, 175, 55, 0.15)'
                                        : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                    border: currentStep === 1 ? '1px solid rgba(212, 175, 55, 0.3)' : 'none'
                                }}
                            >
                                {currentStep === 1
                                    ? <Calendar size={18} className="text-amber-500" />
                                    : <Receipt size={18} className="text-white" />
                                }
                            </div>
                            <div>
                                <h3 className="font-bold text-white">
                                    {currentStep === 1 ? 'Detalhes do Agendamento' : 'Fechar Conta'}
                                </h3>
                                <p className="text-xs text-zinc-500">
                                    {clientName} • {format(startTime, 'HH:mm')}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex gap-2">
                        <div
                            className={`flex-1 h-1 rounded-full transition-all ${currentStep >= 1 ? 'bg-amber-500' : 'bg-zinc-800'}`}
                        />
                        <div
                            className={`flex-1 h-1 rounded-full transition-all ${currentStep >= 2 ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {error && (
                        <div
                            className="flex items-center gap-2 p-3 rounded-xl text-sm"
                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                        >
                            <AlertCircle size={16} className="text-red-500" />
                            <span className="text-red-400">{error}</span>
                        </div>
                    )}

                    {/* ========== STEP 1: Details ========== */}
                    {currentStep === 1 && (
                        <>
                            {/* Client Card with Status Badge */}
                            <div
                                className="p-4 rounded-xl"
                                style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                                            style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#fff' }}
                                        >
                                            {clientName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-white text-lg">{clientName}</div>
                                            <div className="text-sm text-zinc-500 flex items-center gap-1">
                                                <Clock size={12} /> {format(startTime, "yyyy-MM-dd 'às' HH:mm")}
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase"
                                        style={{ background: statusConfig.bg, color: statusConfig.color }}
                                    >
                                        {statusConfig.label}
                                    </span>
                                </div>
                            </div>

                            {/* Status Selection Buttons */}
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { id: 'pending', label: 'PENDENTE', icon: Clock, color: '#f59e0b' },
                                    { id: 'confirmed', label: 'CONFIRMADO', icon: CheckCircle, color: '#22c55e' },
                                    { id: 'no_show', label: 'FALTOU', icon: UserX, color: '#ef4444' },
                                    { id: 'cancelled', label: 'CANCELADO', icon: X, color: '#ef4444' }
                                ].map((status) => {
                                    const isSelected = currentStatus === status.id;
                                    const Icon = status.icon;
                                    return (
                                        <button
                                            key={status.id}
                                            onClick={() => !isSelected && handleStatusChange(status.id)}
                                            disabled={isLoading}
                                            className={`py-2.5 px-1 rounded-lg flex flex-col items-center gap-1.5 transition-all ${isSelected ? '' : 'hover:bg-white/5'}`}
                                            style={{
                                                background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                                                border: `1px solid ${isSelected ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.06)'}`
                                            }}
                                        >
                                            <Icon
                                                size={16}
                                                style={{ color: status.color }}
                                            />
                                            <span
                                                className="text-[8px] font-semibold tracking-wide"
                                                style={{ color: isSelected ? '#fff' : '#a1a1aa' }}
                                            >
                                                {status.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Service & Professional */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Service */}
                                <div
                                    className="p-3 rounded-xl"
                                    style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Scissors size={14} className="text-zinc-500" />
                                        <span className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
                                            Serviço Principal
                                        </span>
                                    </div>
                                    {isEditing ? (
                                        <select
                                            value={selectedServiceId}
                                            onChange={(e) => setSelectedServiceId(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded-lg text-sm outline-none focus:border-amber-500"
                                        >
                                            {services.map(s => (
                                                <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(2)}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div>
                                            <div className="text-white font-medium">{serviceName}</div>
                                            <div className="text-xs text-zinc-500">{professionalName}</div>
                                        </div>
                                    )}
                                </div>

                                {/* Price */}
                                <div
                                    className="p-3 rounded-xl flex items-center justify-end"
                                    style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                                >
                                    <span className="text-2xl font-bold text-emerald-500">{formatCurrency(servicePrice)}</span>
                                </div>
                            </div>

                            {/* Date & Time & Professional Details */}
                            <div
                                className="p-3 rounded-xl"
                                style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-amber-500" />
                                        <span className="text-white text-sm">
                                            {format(startTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
                                        </span>
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        {format(startTime, 'HH:mm')} • {serviceDuration} min
                                    </div>
                                </div>
                            </div>

                            {/* Commission Info */}
                            <div
                                className="p-3 rounded-xl flex items-center justify-between"
                                style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                            >
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-zinc-500" />
                                    <span className="text-zinc-400 text-sm">{professionalName}</span>
                                </div>
                                <span className="text-xs text-zinc-500">
                                    Comissão: <span className="text-emerald-500 font-semibold">{formatCurrency(commissionAmount)}</span>
                                </span>
                            </div>

                            {/* Notes */}
                            {(isEditing || notes) && (
                                <div
                                    className="p-3 rounded-xl"
                                    style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                                >
                                    <label className="text-[10px] font-semibold tracking-wider text-zinc-600 uppercase mb-2 block">
                                        Observações
                                    </label>
                                    {isEditing ? (
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded-lg text-sm resize-none outline-none focus:border-amber-500"
                                            rows={2}
                                            placeholder="Adicionar observações..."
                                        />
                                    ) : (
                                        <p className="text-zinc-400 text-sm">{notes}</p>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ========== STEP 2: Checkout ========== */}
                    {currentStep === 2 && (
                        <>
                            {comandaLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-3">
                                    <div className="w-10 h-10 rounded-full border-2 border-zinc-700 border-t-emerald-500 animate-spin" />
                                    <span className="text-zinc-500 text-sm">Carregando...</span>
                                </div>
                            ) : comandaError ? (
                                <div
                                    className="flex items-center gap-2 p-3 rounded-xl"
                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                >
                                    <AlertCircle size={16} className="text-red-500" />
                                    <span className="text-red-400">{comandaError}</span>
                                </div>
                            ) : comanda && (
                                <>
                                    {/* Services Summary */}
                                    <div>
                                        <span className="text-[10px] font-semibold tracking-wider text-zinc-600 uppercase mb-2 block">
                                            Serviços ({comanda.appointments.length})
                                        </span>
                                        <div className="space-y-2">
                                            {comanda.appointments.map((appt) => (
                                                <div
                                                    key={appt.id}
                                                    className="p-3 rounded-xl flex items-center justify-between"
                                                    style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                                                >
                                                    <div>
                                                        <div className="text-white font-medium text-sm">{appt.service?.name || 'Serviço'}</div>
                                                        <div className="text-xs text-zinc-500">
                                                            {formatTime(appt.start_datetime)} • {appt.professional?.name}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-white font-bold">{formatCurrency(appt.service?.price || 0)}</div>
                                                        <div className="text-[10px] text-emerald-500">{formatCurrency(appt.commission_amount || 0)} com.</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Discount & Tip */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setShowDiscountInput(!showDiscountInput)}
                                            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm transition-all ${comanda.discount_amount > 0
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                                : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.04]'
                                                }`}
                                            style={{ border: '1px solid' }}
                                        >
                                            <Percent size={14} />
                                            {comanda.discount_amount > 0 ? formatCurrency(comanda.discount_amount) : 'Desconto'}
                                        </button>
                                        <button
                                            onClick={() => setShowTipInput(!showTipInput)}
                                            className={`flex items-center justify-center gap-2 p-2.5 rounded-xl text-sm transition-all ${comanda.tip_amount > 0
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                                : 'bg-white/[0.02] border-white/5 text-zinc-400 hover:bg-white/[0.04]'
                                                }`}
                                            style={{ border: '1px solid' }}
                                        >
                                            <Sparkles size={14} />
                                            {comanda.tip_amount > 0 ? formatCurrency(comanda.tip_amount) : 'Gorjeta'}
                                        </button>
                                    </div>

                                    {/* Discount Input */}
                                    {showDiscountInput && (
                                        <div
                                            className="p-3 rounded-xl space-y-2"
                                            style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                                        >
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setDiscountType('fixed')}
                                                    className={`flex-1 p-2 rounded-lg text-xs font-medium ${discountType === 'fixed' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                                                >
                                                    R$ Fixo
                                                </button>
                                                <button
                                                    onClick={() => setDiscountType('percent')}
                                                    className={`flex-1 p-2 rounded-lg text-xs font-medium ${discountType === 'percent' ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                                                >
                                                    % Porcentagem
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    placeholder={discountType === 'fixed' ? 'R$' : '%'}
                                                    value={discountValue}
                                                    onChange={e => setDiscountValue(e.target.value)}
                                                    className="flex-1 px-3 py-2 rounded-lg text-sm text-white bg-zinc-900 border border-zinc-700 outline-none"
                                                />
                                                <button onClick={handleApplyDiscount} className="px-4 rounded-lg bg-emerald-500 text-white text-sm font-medium">
                                                    OK
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Tip Input */}
                                    {showTipInput && (
                                        <div
                                            className="p-3 rounded-xl"
                                            style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                                        >
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="Valor R$"
                                                    value={tipValue}
                                                    onChange={e => setTipValue(e.target.value)}
                                                    className="flex-1 px-3 py-2 rounded-lg text-sm text-white bg-zinc-900 border border-zinc-700 outline-none"
                                                />
                                                <button onClick={handleApplyTip} className="px-4 rounded-lg bg-amber-500 text-black text-sm font-medium">
                                                    OK
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Payment Methods */}
                                    <div>
                                        <span className="text-[10px] font-semibold tracking-wider text-zinc-600 uppercase mb-2 block">
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
                                                        className="p-2.5 rounded-xl flex flex-col items-center gap-1.5 transition-all"
                                                        style={{
                                                            background: isSelected ? `${method.color}15` : 'rgba(255, 255, 255, 0.02)',
                                                            border: `1px solid ${isSelected ? method.color : 'rgba(255, 255, 255, 0.05)'}`
                                                        }}
                                                    >
                                                        <Icon size={18} style={{ color: isSelected ? method.color : '#71717a' }} />
                                                        <span className="text-[10px] font-medium" style={{ color: isSelected ? method.color : '#a1a1aa' }}>
                                                            {method.label}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div
                                        className="p-3 rounded-xl"
                                        style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 100%)', border: '1px solid rgba(34, 197, 94, 0.15)' }}
                                    >
                                        <div className="space-y-1.5 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-zinc-400">Subtotal</span>
                                                <span className="text-white">{formatCurrency(comanda.subtotal)}</span>
                                            </div>
                                            {comanda.discount_amount > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-emerald-500">Desconto</span>
                                                    <span className="text-emerald-500">- {formatCurrency(comanda.discount_amount)}</span>
                                                </div>
                                            )}
                                            {comanda.tip_amount > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-amber-500">Gorjeta</span>
                                                    <span className="text-amber-500">+ {formatCurrency(comanda.tip_amount)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between pt-1.5 border-t border-white/10">
                                                <span className="text-zinc-500 text-xs">Comissões</span>
                                                <span className="text-zinc-500 text-xs">{formatCurrency(totalCommissions)}</span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-emerald-500/20">
                                            <span className="text-white font-semibold">Total</span>
                                            <span className="text-xl font-bold text-emerald-500">{formatCurrency(comanda.total)}</span>
                                        </div>
                                    </div>

                                    {/* NFS-e Toggle */}
                                    <div
                                        className="flex items-center justify-between p-3 rounded-xl"
                                        style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Receipt size={14} className="text-zinc-500" />
                                            <span className="text-sm text-zinc-300">Emitir Nota Fiscal</span>
                                        </div>
                                        <button
                                            onClick={() => setEmitNfse(!emitNfse)}
                                            className={`w-10 h-5 rounded-full transition-all relative ${emitNfse ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${emitNfse ? 'left-[22px]' : 'left-0.5'}`} />
                                        </button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div
                    className="p-4 border-t"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.06)', background: 'rgba(0, 0, 0, 0.3)' }}
                >
                    {/* Step 1 Footer */}
                    {currentStep === 1 && (
                        isEditing ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setSelectedProfessionalId(appointment.professional_id || '');
                                        setSelectedServiceId(appointment.service_id || '');
                                        setNotes(appointment.notes || '');
                                    }}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700"
                                    disabled={isLoading}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-black bg-amber-500 hover:bg-amber-400 flex items-center justify-center gap-1.5"
                                >
                                    {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                    Salvar
                                </button>
                            </div>
                        ) : canModify ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    Fechar
                                </button>
                                <button
                                    onClick={() => setCurrentStep(2)}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-2 transition-all"
                                >
                                    <Receipt size={16} />
                                    Fechar Conta / Pagar
                                </button>
                            </div>
                        ) : currentStatus === 'cancelled' ? (
                            <div className="flex gap-2">
                                <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700">
                                    Fechar
                                </button>
                                <button
                                    onClick={() => onReschedule ? (onReschedule(appointment), onClose()) : handleStatusChange('confirmed')}
                                    disabled={isLoading}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-black bg-amber-500 hover:bg-amber-400 flex items-center justify-center gap-1.5"
                                >
                                    <Calendar size={14} />
                                    Reagendar
                                </button>
                            </div>
                        ) : (
                            <button onClick={onClose} className="w-full py-2.5 rounded-lg text-sm font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700">
                                Fechar
                            </button>
                        )
                    )}

                    {/* Step 2 Footer */}
                    {currentStep === 2 && comanda && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentStep(1)}
                                className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleConfirmPayment}
                                disabled={isClosing || comandaLoading}
                                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                {isClosing ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" />
                                        Finalizando...
                                    </>
                                ) : (
                                    <>
                                        <Check size={14} />
                                        Confirmar {formatCurrency(comanda.total)}
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppointmentModal;
