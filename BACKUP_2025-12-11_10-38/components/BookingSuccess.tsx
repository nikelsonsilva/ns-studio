import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Calendar, Clock, User, Scissors, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

const BookingSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const appointmentId = searchParams.get('appointment_id');

    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (appointmentId) {
            loadAppointment();
        }
    }, [appointmentId]);

    const loadAppointment = async () => {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    client:clients(*),
                    service:services(*),
                    professional:professionals(*),
                    business:businesses(*)
                `)
                .eq('id', appointmentId)
                .single();

            if (error) throw error;
            setAppointment(data);
        } catch (err) {
            console.error('Error loading appointment:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-barber-950 flex items-center justify-center">
                <div className="text-white">Carregando...</div>
            </div>
        );
    }

    if (!appointment) {
        return (
            <div className="min-h-screen bg-barber-950 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Agendamento não encontrado</h1>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-barber-gold text-black px-6 py-2 rounded-lg font-bold"
                    >
                        Voltar ao Início
                    </button>
                </div>
            </div>
        );
    }

    const startDate = new Date(appointment.start_datetime);

    return (
        <div className="min-h-screen bg-barber-950 flex items-center justify-center p-4">
            <div className="bg-barber-900 max-w-2xl w-full rounded-xl border border-barber-800 shadow-2xl overflow-hidden">
                {/* Header Success */}
                <div className="bg-green-500/10 border-b border-green-500/20 p-8 text-center">
                    <CheckCircle2 className="mx-auto mb-4 text-green-500" size={64} />
                    <h1 className="text-3xl font-bold text-white mb-2">Agendamento Confirmado!</h1>
                    <p className="text-gray-400">Seu agendamento foi realizado com sucesso</p>
                </div>

                {/* Appointment Details */}
                <div className="p-8 space-y-6">
                    {/* Business Info */}
                    <div className="text-center pb-6 border-b border-barber-800">
                        <h2 className="text-2xl font-bold text-white mb-1">{appointment.business?.business_name}</h2>
                        <p className="text-gray-400 text-sm">{appointment.business?.address}</p>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Client */}
                        <div className="bg-barber-950 p-4 rounded-lg border border-barber-800">
                            <div className="flex items-center gap-3 mb-2">
                                <User className="text-barber-gold" size={20} />
                                <span className="text-xs uppercase tracking-wider text-gray-400">Cliente</span>
                            </div>
                            <div className="text-white font-bold">{appointment.client?.name}</div>
                            <div className="text-gray-400 text-sm">{appointment.client?.phone}</div>
                        </div>

                        {/* Service */}
                        <div className="bg-barber-950 p-4 rounded-lg border border-barber-800">
                            <div className="flex items-center gap-3 mb-2">
                                <Scissors className="text-barber-gold" size={20} />
                                <span className="text-xs uppercase tracking-wider text-gray-400">Serviço</span>
                            </div>
                            <div className="text-white font-bold">{appointment.service?.name}</div>
                            <div className="text-gray-400 text-sm">
                                R$ {appointment.service?.price.toFixed(2)} • {appointment.service?.duration_minutes}min
                            </div>
                        </div>

                        {/* Date */}
                        <div className="bg-barber-950 p-4 rounded-lg border border-barber-800">
                            <div className="flex items-center gap-3 mb-2">
                                <Calendar className="text-barber-gold" size={20} />
                                <span className="text-xs uppercase tracking-wider text-gray-400">Data</span>
                            </div>
                            <div className="text-white font-bold">
                                {format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </div>
                            <div className="text-gray-400 text-sm capitalize">
                                {format(startDate, 'EEEE', { locale: ptBR })}
                            </div>
                        </div>

                        {/* Time */}
                        <div className="bg-barber-950 p-4 rounded-lg border border-barber-800">
                            <div className="flex items-center gap-3 mb-2">
                                <Clock className="text-barber-gold" size={20} />
                                <span className="text-xs uppercase tracking-wider text-gray-400">Horário</span>
                            </div>
                            <div className="text-white font-bold font-mono text-2xl">
                                {format(startDate, 'HH:mm')}
                            </div>
                        </div>
                    </div>

                    {/* Professional */}
                    <div className="bg-barber-950 p-4 rounded-lg border border-barber-800">
                        <div className="flex items-center gap-3 mb-2">
                            <User className="text-barber-gold" size={20} />
                            <span className="text-xs uppercase tracking-wider text-gray-400">Profissional</span>
                        </div>
                        <div className="text-white font-bold">{appointment.professional?.name}</div>
                        {appointment.professional?.specialty && (
                            <div className="text-gray-400 text-sm">{appointment.professional.specialty}</div>
                        )}
                    </div>

                    {/* Payment Status */}
                    <div className={`p-4 rounded-lg border ${appointment.payment_status === 'paid'
                            ? 'bg-green-500/10 border-green-500/20'
                            : 'bg-yellow-500/10 border-yellow-500/20'
                        }`}>
                        <div className="text-center">
                            <div className={`text-sm font-bold ${appointment.payment_status === 'paid' ? 'text-green-500' : 'text-yellow-500'
                                }`}>
                                {appointment.payment_status === 'paid' ? '✓ Pagamento Confirmado' : '⏳ Aguardando Pagamento'}
                            </div>
                            {appointment.payment_method === 'presential' && (
                                <div className="text-xs text-gray-400 mt-1">Pago no estabelecimento</div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 flex gap-3">
                        <button
                            onClick={() => window.print()}
                            className="flex-1 bg-barber-800 hover:bg-barber-700 text-white py-3 rounded-lg font-bold transition-colors"
                        >
                            Imprimir Comprovante
                        </button>
                        <button
                            onClick={() => navigate('/')}
                            className="flex-1 bg-barber-gold hover:bg-barber-goldhover text-black py-3 rounded-lg font-bold transition-colors"
                        >
                            Voltar ao Início
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingSuccess;
