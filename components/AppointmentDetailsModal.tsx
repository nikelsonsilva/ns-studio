/**
 * AppointmentDetailsModal.tsx - Modal de Detalhes do Agendamento
 * Design premium seguindo o padrão do Finance tab
 */

import React, { useState, useEffect } from 'react';
import {
    X, Clock, User, Scissors, Calendar, Check, XCircle, AlertCircle,
    Edit2, Save, CreditCard, Phone, Receipt, Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
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

interface AppointmentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    appointment: Appointment | null;
    professionals: Professional[];
    services: Service[];
    onReschedule?: (appointment: Appointment) => void;
    onOpenComanda?: (appointmentId: string) => void;
}

const STATUS_CONFIG = {
    pending: { label: 'Pendente', bgClass: 'bg-amber-500/15', textClass: 'text-amber-500' },
    confirmed: { label: 'Confirmado', bgClass: 'bg-blue-500/15', textClass: 'text-blue-500' },
    completed: { label: 'Concluído', bgClass: 'bg-emerald-500/15', textClass: 'text-emerald-500' },
    cancelled: { label: 'Cancelado', bgClass: 'bg-red-500/15', textClass: 'text-red-500' },
    no_show: { label: 'Faltou', bgClass: 'bg-zinc-500/15', textClass: 'text-zinc-500' }
};

const PAYMENT_CONFIG = {
    pending: { label: 'Pagamento Pendente', bgClass: 'bg-amber-500/15', textClass: 'text-amber-500' },
    awaiting_payment: { label: 'Aguardando Pagamento', bgClass: 'bg-orange-500/15', textClass: 'text-orange-500' },
    paid: { label: 'Pago', bgClass: 'bg-emerald-500/15', textClass: 'text-emerald-500' },
    refunded: { label: 'Reembolsado', bgClass: 'bg-zinc-500/15', textClass: 'text-zinc-500' }
};

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
    isOpen,
    onClose,
    onUpdate,
    appointment,
    professionals,
    services,
    onReschedule,
    onOpenComanda
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [selectedProfessionalId, setSelectedProfessionalId] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (appointment) {
            setSelectedProfessionalId(appointment.professional_id || '');
            setSelectedServiceId(appointment.service_id || '');
            setNotes(appointment.notes || '');
            setIsEditing(false);
            setError('');
        }
    }, [appointment]);

    if (!isOpen || !appointment) return null;

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
        setIsLoading(true);
        setError('');

        try {
            const updateData: any = { status: newStatus };
            if (newStatus === 'completed' && appointment.payment_status === 'awaiting_payment') {
                updateData.payment_status = 'paid';
            }

            const { error: updateError } = await supabase
                .from('appointments')
                .update(updateData)
                .eq('id', appointment.id);

            if (updateError) throw updateError;
            onUpdate();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao atualizar status');
        }
        setIsLoading(false);
    };

    const resolvedService = services.find(s => s.id === appointment.service_id) || appointment.service;
    const resolvedProfessional = professionals.find(p => p.id === appointment.professional_id) || appointment.professional;

    const clientName = appointment.customer_name || appointment.client?.name || 'Cliente';
    const serviceName = resolvedService?.name || 'Serviço';
    const servicePrice = resolvedService?.price || 0;
    const serviceDuration = resolvedService?.duration_minutes || 60;
    const professionalName = resolvedProfessional?.name || 'Profissional';
    const commissionRate = resolvedProfessional?.commission_rate || 50;
    const commissionAmount = servicePrice * (commissionRate / 100);
    const startTime = parseISO(appointment.start_datetime);

    const statusConfig = STATUS_CONFIG[appointment.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
    const paymentConfig = PAYMENT_CONFIG[appointment.payment_status as keyof typeof PAYMENT_CONFIG] || PAYMENT_CONFIG.pending;

    const canModify = appointment.status !== 'completed' && appointment.status !== 'cancelled';

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-md max-h-[90vh] overflow-hidden rounded-2xl flex flex-col"
                style={{
                    background: 'linear-gradient(180deg, #1c1c1e 0%, #121214 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="p-4 border-b flex items-center justify-between"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'rgba(212, 175, 55, 0.15)', border: '1px solid rgba(212, 175, 55, 0.3)' }}
                        >
                            <Calendar size={18} className="text-amber-500" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Detalhes do Agendamento</h3>
                            <p className="text-xs text-zinc-500">{format(startTime, 'HH:mm')} • {serviceName}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {canModify && !isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 rounded-lg text-zinc-500 hover:text-amber-500 hover:bg-white/5 transition-all"
                            >
                                <Edit2 size={16} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-all"
                        >
                            <X size={18} />
                        </button>
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

                    {/* Status Badges */}
                    <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusConfig.bgClass} ${statusConfig.textClass}`}>
                            {statusConfig.label}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${paymentConfig.bgClass} ${paymentConfig.textClass}`}>
                            {paymentConfig.label}
                        </span>
                    </div>

                    {/* Client Card */}
                    <div
                        className="p-3 rounded-xl"
                        style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                <User size={18} className="text-amber-500" />
                            </div>
                            <div>
                                <div className="font-semibold text-white">{clientName}</div>
                                {appointment.client?.phone && (
                                    <div className="text-xs text-zinc-500 flex items-center gap-1">
                                        <Phone size={10} /> {appointment.client.phone}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Date & Time Card */}
                    <div
                        className="p-3 rounded-xl flex items-center gap-3"
                        style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                    >
                        <Calendar size={18} className="text-amber-500" />
                        <div>
                            <div className="text-white font-medium text-sm">
                                {format(startTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
                            </div>
                            <div className="text-xs text-zinc-500 flex items-center gap-1">
                                <Clock size={10} /> {format(startTime, 'HH:mm')} • {serviceDuration} min
                            </div>
                        </div>
                    </div>

                    {/* Service Card */}
                    <div
                        className="p-3 rounded-xl"
                        style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                    >
                        <label className="text-[10px] font-semibold tracking-wider text-zinc-600 uppercase mb-2 block">
                            Serviço
                        </label>
                        {isEditing ? (
                            <select
                                value={selectedServiceId}
                                onChange={(e) => setSelectedServiceId(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded-lg text-sm outline-none focus:border-amber-500 transition-colors"
                            >
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(2)}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Scissors size={14} className="text-amber-500" />
                                    <span className="text-white font-medium text-sm">{serviceName}</span>
                                </div>
                                <span className="text-emerald-500 font-bold">R$ {servicePrice.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {/* Professional Card */}
                    <div
                        className="p-3 rounded-xl"
                        style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
                    >
                        <label className="text-[10px] font-semibold tracking-wider text-zinc-600 uppercase mb-2 block">
                            Profissional
                        </label>
                        {isEditing ? (
                            <select
                                value={selectedProfessionalId}
                                onChange={(e) => setSelectedProfessionalId(e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded-lg text-sm outline-none focus:border-amber-500 transition-colors"
                            >
                                {professionals.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <User size={14} className="text-zinc-500" />
                                    <span className="text-white text-sm">{professionalName}</span>
                                </div>
                                <span className="text-xs text-zinc-500">
                                    Comissão: <span className="text-emerald-500">R$ {commissionAmount.toFixed(2)}</span>
                                </span>
                            </div>
                        )}
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
                                    className="w-full bg-zinc-900 border border-zinc-700 text-white p-2 rounded-lg text-sm resize-none outline-none focus:border-amber-500 transition-colors"
                                    rows={2}
                                    placeholder="Adicionar observações..."
                                />
                            ) : (
                                <p className="text-zinc-400 text-sm">{notes}</p>
                            )}
                        </div>
                    )}

                    {/* ID */}
                    <div className="text-[10px] text-zinc-600 font-mono">
                        ID: {appointment.id.slice(0, 8)}...
                    </div>
                </div>

                {/* Footer Actions */}
                <div
                    className="p-4 border-t"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.06)', background: 'rgba(0, 0, 0, 0.3)' }}
                >
                    {isEditing ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setSelectedProfessionalId(appointment.professional_id || '');
                                    setSelectedServiceId(appointment.service_id || '');
                                    setNotes(appointment.notes || '');
                                }}
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-all"
                                disabled={isLoading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-black bg-amber-500 hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                <span>Salvar</span>
                            </button>
                        </div>
                    ) : canModify ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleStatusChange('cancelled')}
                                disabled={isLoading}
                                className="px-4 py-2.5 rounded-lg text-sm font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-all flex items-center gap-1.5"
                            >
                                <XCircle size={14} />
                                <span>Cancelar</span>
                            </button>
                            {onOpenComanda && (
                                <button
                                    onClick={() => {
                                        onOpenComanda(appointment.id);
                                        onClose();
                                    }}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-black bg-emerald-500 hover:bg-emerald-400 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Receipt size={14} />
                                    <span>Fechar Conta</span>
                                </button>
                            )}
                        </div>
                    ) : appointment.status === 'cancelled' ? (
                        <div className="space-y-3">
                            <div
                                className="p-3 rounded-xl text-center"
                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                            >
                                <p className="text-red-500 text-sm font-medium">Agendamento cancelado</p>
                                {appointment.payment_status === 'paid' && (
                                    <p className="text-emerald-500 text-xs mt-1 flex items-center justify-center gap-1">
                                        <CreditCard size={10} /> Pagamento mantido
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-all"
                                >
                                    Fechar
                                </button>
                                <button
                                    onClick={() => onReschedule ? (onReschedule(appointment), onClose()) : handleStatusChange('confirmed')}
                                    disabled={isLoading}
                                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-black bg-amber-500 hover:bg-amber-400 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Calendar size={14} />
                                    <span>Reagendar</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 rounded-lg text-sm font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-all"
                        >
                            Fechar
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppointmentDetailsModal;
