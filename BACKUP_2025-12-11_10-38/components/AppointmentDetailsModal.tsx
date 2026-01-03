import React, { useState, useEffect } from 'react';
import { X, Clock, User, Scissors, Calendar, Check, XCircle, AlertCircle, Edit2, Save, CreditCard, Phone, Mail } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import type { Client, Service, Professional } from '../types';

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
    professional?: { id: string; name: string };
    notes?: string;
}

interface AppointmentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdate: () => void;
    appointment: Appointment | null;
    professionals: Professional[];
    services: Service[];
}

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
    isOpen,
    onClose,
    onUpdate,
    appointment,
    professionals,
    services
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Editable fields
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

            console.log('✅ Appointment updated');
            setIsEditing(false);
            onUpdate();
        } catch (err: any) {
            console.error('❌ Error updating appointment:', err);
            setError(err.message || 'Erro ao atualizar');
        }

        setIsLoading(false);
    };

    const handleStatusChange = async (newStatus: string) => {
        setIsLoading(true);
        setError('');

        try {
            const updateData: any = { status: newStatus };

            // If completing, also mark as paid if it was awaiting payment
            if (newStatus === 'completed' && appointment.payment_status === 'awaiting_payment') {
                updateData.payment_status = 'paid';
            }

            const { error: updateError } = await supabase
                .from('appointments')
                .update(updateData)
                .eq('id', appointment.id);

            if (updateError) throw updateError;

            console.log('✅ Status updated to:', newStatus);
            onUpdate();
            onClose();
        } catch (err: any) {
            console.error('❌ Error updating status:', err);
            setError(err.message || 'Erro ao atualizar status');
        }

        setIsLoading(false);
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-500', label: 'Pendente' },
            confirmed: { bg: 'bg-green-500/20', text: 'text-green-500', label: 'Confirmado' },
            completed: { bg: 'bg-blue-500/20', text: 'text-blue-500', label: 'Concluído' },
            cancelled: { bg: 'bg-red-500/20', text: 'text-red-500', label: 'Cancelado' },
            no_show: { bg: 'bg-gray-500/20', text: 'text-gray-500', label: 'Não Compareceu' }
        };
        const badge = badges[status] || badges.pending;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    const getPaymentBadge = (status?: string) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-500', label: 'Pendente' },
            awaiting_payment: { bg: 'bg-orange-500/20', text: 'text-orange-500', label: 'Aguardando' },
            paid: { bg: 'bg-green-500/20', text: 'text-green-500', label: 'Pago' },
            refunded: { bg: 'bg-gray-500/20', text: 'text-gray-500', label: 'Reembolsado' }
        };
        const badge = badges[status || 'pending'] || badges.pending;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
                {badge.label}
            </span>
        );
    };

    const clientName = appointment.customer_name || appointment.client?.name || 'Cliente';
    const serviceName = appointment.service?.name || 'Serviço';
    const servicePrice = appointment.service?.price || 0;
    const serviceDuration = appointment.service?.duration_minutes || 60;
    const professionalName = appointment.professional?.name || 'Profissional';
    const startTime = parseISO(appointment.start_datetime);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-barber-900 w-full max-w-md rounded-xl border border-barber-800 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-4 border-b border-barber-800 flex justify-between items-center sticky top-0 bg-barber-900">
                    <h3 className="text-lg font-bold text-white">Detalhes do Agendamento</h3>
                    <div className="flex items-center gap-2">
                        {!isEditing && appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 text-barber-gold hover:bg-barber-800 rounded-lg"
                                title="Editar"
                            >
                                <Edit2 size={18} />
                            </button>
                        )}
                        <button onClick={onClose} className="text-gray-500 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-2 rounded">
                            {error}
                        </div>
                    )}

                    {/* Status Badges */}
                    <div className="flex items-center gap-2">
                        {getStatusBadge(appointment.status)}
                        {getPaymentBadge(appointment.payment_status)}
                    </div>

                    {/* Client Info */}
                    <div className="bg-barber-950 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-barber-800 rounded-full flex items-center justify-center">
                                <User className="text-barber-gold" size={20} />
                            </div>
                            <div>
                                <div className="font-bold text-white">{clientName}</div>
                                {appointment.client?.phone && (
                                    <div className="text-xs text-gray-400 flex items-center gap-1">
                                        <Phone size={10} /> {appointment.client.phone}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div className="bg-barber-950 rounded-lg p-4 flex items-center gap-3">
                        <Calendar className="text-barber-gold" size={20} />
                        <div>
                            <div className="text-white font-bold">
                                {format(startTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
                            </div>
                            <div className="text-sm text-gray-400 flex items-center gap-1">
                                <Clock size={12} />
                                {format(startTime, 'HH:mm')} • {serviceDuration} min
                            </div>
                        </div>
                    </div>

                    {/* Service - Editable */}
                    <div className="bg-barber-950 rounded-lg p-4">
                        <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2">Serviço</label>
                        {isEditing ? (
                            <select
                                value={selectedServiceId}
                                onChange={(e) => setSelectedServiceId(e.target.value)}
                                className="w-full bg-barber-900 border border-barber-800 text-white p-2 rounded-lg text-sm"
                            >
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} - R$ {s.price.toFixed(2)}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Scissors className="text-barber-gold" size={16} />
                                    <span className="text-white font-bold">{serviceName}</span>
                                </div>
                                <span className="text-barber-gold font-bold">R$ {servicePrice.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {/* Professional - Editable */}
                    <div className="bg-barber-950 rounded-lg p-4">
                        <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2">Profissional</label>
                        {isEditing ? (
                            <select
                                value={selectedProfessionalId}
                                onChange={(e) => setSelectedProfessionalId(e.target.value)}
                                className="w-full bg-barber-900 border border-barber-800 text-white p-2 rounded-lg text-sm"
                            >
                                {professionals.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex items-center gap-2">
                                <User className="text-gray-400" size={16} />
                                <span className="text-white">{professionalName}</span>
                            </div>
                        )}
                    </div>

                    {/* Notes - Editable */}
                    {(isEditing || notes) && (
                        <div className="bg-barber-950 rounded-lg p-4">
                            <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-2">Observações</label>
                            {isEditing ? (
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full bg-barber-900 border border-barber-800 text-white p-2 rounded-lg text-sm resize-none"
                                    rows={3}
                                    placeholder="Adicionar observações..."
                                />
                            ) : (
                                <p className="text-gray-400 text-sm">{notes}</p>
                            )}
                        </div>
                    )}

                    {/* ID - Read Only */}
                    <div className="text-xs text-gray-600 font-mono">
                        ID: {appointment.id.slice(0, 8)}...
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 border-t border-barber-800 space-y-2">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setSelectedProfessionalId(appointment.professional_id || '');
                                    setSelectedServiceId(appointment.service_id || '');
                                    setNotes(appointment.notes || '');
                                }}
                                className="flex-1 bg-barber-800 hover:bg-barber-700 text-white py-2 rounded-lg font-bold text-sm"
                                disabled={isLoading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="flex-1 bg-barber-gold hover:bg-barber-goldhover text-black py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                            >
                                {isLoading ? 'Salvando...' : <><Save size={16} /> Salvar</>}
                            </button>
                        </div>
                    ) : appointment.status !== 'completed' && appointment.status !== 'cancelled' ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleStatusChange('cancelled')}
                                disabled={isLoading}
                                className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                            >
                                <XCircle size={16} /> Cancelar
                            </button>
                            <button
                                onClick={() => handleStatusChange('completed')}
                                disabled={isLoading}
                                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                            >
                                <Check size={16} /> Concluir
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onClose}
                            className="w-full bg-barber-800 hover:bg-barber-700 text-white py-2 rounded-lg font-bold text-sm"
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
