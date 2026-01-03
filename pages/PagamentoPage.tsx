import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Clock, User, DollarSign, MapPin, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppointmentData {
    id: string;
    customer_name: string;
    customer_phone: string;
    start_datetime: string;
    end_datetime: string;
    status: string;
    payment_status: string;
    payment_link?: string;
    service: {
        name: string;
        price: number;
        duration_minutes: number;
    };
    professional: {
        name: string;
    };
    business: {
        name: string;
        address?: string;
    };
}

export default function PagamentoPage() {
    // Extrair IDs da URL: /pagamento/{businessId}/{appointmentId}
    const pathParts = window.location.pathname.split('/');
    const appointmentId = pathParts[3]; // /pagamento/businessId/appointmentId

    const [appointment, setAppointment] = useState<AppointmentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
                    service:services(*),
                    professional:professionals(*),
                    business:businesses(*)
                `)
                .eq('id', appointmentId)
                .single();

            if (error) throw error;

            // Se já foi pago, redirecionar para confirmação
            if (data.payment_status === 'paid') {
                window.location.href = `/confirmacao/${appointmentId}`;
                return;
            }

            setAppointment(data);
        } catch (err: any) {
            setError('Agendamento não encontrado');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = () => {
        if (!appointment?.payment_link) {
            setError('Link de pagamento não disponível');
            return;
        }

        // Abrir link do Stripe em nova aba
        window.open(appointment.payment_link, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-barber-950 via-barber-900 to-barber-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-barber-gold animate-spin" />
                    <p className="text-white">Carregando...</p>
                </div>
            </div>
        );
    }

    if (error || !appointment) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-barber-950 via-barber-900 to-barber-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-xl mb-4">{error || 'Erro ao carregar'}</div>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="text-barber-gold hover:underline"
                    >
                        Voltar ao início
                    </button>
                </div>
            </div>
        );
    }

    const startDate = parseISO(appointment.start_datetime);

    return (
        <div className="min-h-screen bg-gradient-to-br from-barber-950 via-barber-900 to-barber-950 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Confirme sua Reserva
                    </h1>
                    <p className="text-gray-400">
                        {appointment.business.name}
                    </p>
                </div>

                {/* Card Principal */}
                <div className="bg-barber-900 border border-barber-800 rounded-2xl p-8 shadow-2xl">
                    {/* Detalhes do Serviço */}
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-barber-gold/10 rounded-lg">
                                <Calendar className="text-barber-gold" size={24} />
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Data</p>
                                <p className="text-white font-semibold">
                                    {format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-barber-gold/10 rounded-lg">
                                <Clock className="text-barber-gold" size={24} />
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Horário</p>
                                <p className="text-white font-semibold">
                                    {format(startDate, 'HH:mm')} ({appointment.service.duration_minutes} min)
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-barber-gold/10 rounded-lg">
                                <User className="text-barber-gold" size={24} />
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Profissional</p>
                                <p className="text-white font-semibold">
                                    {appointment.professional.name}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-barber-gold/10 rounded-lg">
                                <DollarSign className="text-barber-gold" size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-gray-400 text-sm">Serviço</p>
                                <p className="text-white font-semibold">
                                    {appointment.service.name}
                                </p>
                                <p className="text-barber-gold text-2xl font-bold mt-1">
                                    R$ {appointment.service.price.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        {appointment.business.address && (
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-barber-gold/10 rounded-lg">
                                    <MapPin className="text-barber-gold" size={24} />
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Endereço</p>
                                    <p className="text-white">
                                        {appointment.business.address}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Botão de Pagamento */}
                    <button
                        onClick={handlePayment}
                        disabled={!appointment.payment_link}
                        className="w-full mt-8 bg-gradient-to-r from-barber-gold to-yellow-600 text-barber-950 font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-barber-gold/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {appointment.payment_link ? 'Pagar com Stripe' : 'Link indisponível'}
                    </button>

                    <p className="text-center text-gray-500 text-sm mt-4">
                        🔒 Pagamento seguro processado pelo Stripe
                    </p>
                </div>
            </div>
        </div>
    );
}
