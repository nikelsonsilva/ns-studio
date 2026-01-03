import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Scissors, DollarSign, MapPin, AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAppointmentByToken, confirmAppointment, cancelAppointment, canCancelAppointment } from '../lib/bookingLinks';
import type { AppointmentDetails } from '../lib/bookingLinks';

const BookingConfirmation: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();

    const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [success, setSuccess] = useState(false);
    const [cancelled, setCancelled] = useState(false);

    useEffect(() => {
        if (token) {
            loadAppointment();
        }
    }, [token]);

    const loadAppointment = async () => {
        setIsLoading(true);
        setError('');

        if (!token) {
            setError('Link inválido');
            setIsLoading(false);
            return;
        }

        const data = await getAppointmentByToken(token);

        if (!data) {
            setError('Agendamento não encontrado ou link expirado');
            setIsLoading(false);
            return;
        }

        setAppointment(data);
        setIsLoading(false);
    };

    const handleConfirm = async () => {
        if (!token) return;

        setIsConfirming(true);
        setError('');

        const result = await confirmAppointment(token);

        if (result) {
            setSuccess(true);
            // Em produção, aqui redirecionaria para Stripe Checkout
            // window.location.href = stripeCheckoutUrl;
        } else {
            setError('Erro ao confirmar agendamento. Tente novamente.');
        }

        setIsConfirming(false);
    };

    const handleCancel = async () => {
        if (!token || !appointment) return;

        setIsCancelling(true);
        setError('');

        const result = await cancelAppointment(token);

        if (result.success) {
            setCancelled(true);
            setShowCancelConfirm(false);
        } else {
            setError(result.error || 'Erro ao cancelar agendamento');
            setShowCancelConfirm(false);
        }

        setIsCancelling(false);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-barber-950 via-barber-900 to-black flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader className="animate-spin text-barber-gold mx-auto mb-4" size={48} />
                    <p className="text-white">Carregando agendamento...</p>
                </div>
            </div>
        );
    }

    if (error && !appointment) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-barber-950 via-barber-900 to-black flex items-center justify-center p-4">
                <div className="bg-barber-900 border border-red-500/20 rounded-xl p-8 max-w-md w-full text-center">
                    <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
                    <h2 className="text-xl font-bold text-white mb-2">Ops!</h2>
                    <p className="text-gray-400">{error}</p>
                </div>
            </div>
        );
    }

    if (cancelled) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-barber-950 via-barber-900 to-black flex items-center justify-center p-4">
                <div className="bg-barber-900 border border-barber-800 rounded-xl p-8 max-w-md w-full text-center">
                    <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
                    <h2 className="text-xl font-bold text-white mb-2">Agendamento Cancelado</h2>
                    <p className="text-gray-400 mb-6">
                        Seu agendamento foi cancelado com sucesso.
                    </p>
                    <p className="text-sm text-gray-500">
                        O horário foi liberado e você pode fazer um novo agendamento quando desejar.
                    </p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-barber-950 via-barber-900 to-black flex items-center justify-center p-4">
                <div className="bg-barber-900 border border-barber-800 rounded-xl p-8 max-w-md w-full text-center">
                    <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
                    <h2 className="text-xl font-bold text-white mb-2">Agendamento Confirmado!</h2>
                    <p className="text-gray-400 mb-6">
                        Seu agendamento foi confirmado com sucesso.
                    </p>
                    <div className="bg-barber-950 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-400 mb-2">Próximo passo:</p>
                        <p className="text-white font-medium">
                            Você será redirecionado para o pagamento
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                            (Integração com Stripe será adicionada em breve)
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!appointment) return null;

    const appointmentDate = parseISO(appointment.date);
    const formattedDate = format(appointmentDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const canCancel = canCancelAppointment(appointment.date, appointment.time);
    const isAlreadyConfirmed = appointment.status === 'confirmed';
    const isAlreadyCancelled = appointment.status === 'cancelled';

    return (
        <div className="min-h-screen bg-gradient-to-br from-barber-950 via-barber-900 to-black flex items-center justify-center p-4">
            <div className="bg-barber-900 border border-barber-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-barber-gold to-amber-600 p-6 text-center">
                    <h1 className="text-2xl font-bold text-black mb-1">
                        {appointment.business.name}
                    </h1>
                    <p className="text-black/70">Confirmação de Agendamento</p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg flex items-center gap-2">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    {isAlreadyConfirmed && (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-sm p-3 rounded-lg flex items-center gap-2">
                            <CheckCircle size={18} />
                            Este agendamento já foi confirmado
                        </div>
                    )}

                    {isAlreadyCancelled && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg flex items-center gap-2">
                            <XCircle size={18} />
                            Este agendamento foi cancelado
                        </div>
                    )}

                    {/* Appointment Details */}
                    <div className="bg-barber-950 rounded-lg p-6 space-y-4">
                        <h2 className="text-lg font-bold text-white mb-4">Detalhes do Agendamento</h2>

                        <div className="flex items-start gap-3">
                            <Calendar className="text-barber-gold mt-1 shrink-0" size={20} />
                            <div>
                                <p className="text-sm text-gray-400">Data</p>
                                <p className="text-white font-medium capitalize">{formattedDate}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Clock className="text-barber-gold mt-1 shrink-0" size={20} />
                            <div>
                                <p className="text-sm text-gray-400">Horário</p>
                                <p className="text-white font-medium">{appointment.time}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <User className="text-barber-gold mt-1 shrink-0" size={20} />
                            <div>
                                <p className="text-sm text-gray-400">Profissional</p>
                                <p className="text-white font-medium">{appointment.professional.name}</p>
                                {appointment.professional.specialty && (
                                    <p className="text-sm text-gray-500">{appointment.professional.specialty}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <Scissors className="text-barber-gold mt-1 shrink-0" size={20} />
                            <div>
                                <p className="text-sm text-gray-400">Serviço</p>
                                <p className="text-white font-medium">{appointment.service.name}</p>
                                <p className="text-sm text-gray-500">{appointment.service.duration_minutes} minutos</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 pt-4 border-t border-barber-800">
                            <DollarSign className="text-barber-gold mt-1 shrink-0" size={20} />
                            <div>
                                <p className="text-sm text-gray-400">Valor</p>
                                <p className="text-barber-gold font-bold text-2xl">
                                    R$ {appointment.service.price.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Client Info */}
                    <div className="bg-barber-950 rounded-lg p-6">
                        <h3 className="text-white font-medium mb-3">Seus Dados</h3>
                        <div className="space-y-2 text-sm">
                            <p className="text-gray-400">
                                <span className="text-white font-medium">{appointment.client.name}</span>
                            </p>
                            {appointment.client.phone && (
                                <p className="text-gray-400">{appointment.client.phone}</p>
                            )}
                            {appointment.client.email && (
                                <p className="text-gray-400">{appointment.client.email}</p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    {!isAlreadyConfirmed && !isAlreadyCancelled && (
                        <div className="space-y-3">
                            <button
                                onClick={handleConfirm}
                                disabled={isConfirming}
                                className="w-full bg-barber-gold hover:bg-barber-goldhover text-black font-bold py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isConfirming ? (
                                    <>
                                        <Loader className="animate-spin" size={20} />
                                        Confirmando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={20} />
                                        Confirmar e Pagar
                                    </>
                                )}
                            </button>

                            {canCancel && (
                                <button
                                    onClick={() => setShowCancelConfirm(true)}
                                    className="w-full bg-transparent hover:bg-red-500/10 text-red-500 border border-red-500/20 hover:border-red-500/50 py-3 rounded-lg transition-colors"
                                >
                                    Cancelar Agendamento
                                </button>
                            )}

                            {!canCancel && (
                                <p className="text-center text-sm text-gray-500">
                                    Cancelamento permitido apenas até 2 horas antes do horário
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Cancel Confirmation Modal */}
                {showCancelConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-barber-900 border border-barber-800 rounded-xl p-6 max-w-md w-full">
                            <h3 className="text-xl font-bold text-white mb-4">Cancelar Agendamento?</h3>
                            <p className="text-gray-400 mb-6">
                                Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowCancelConfirm(false)}
                                    disabled={isCancelling}
                                    className="flex-1 bg-barber-800 hover:bg-barber-700 text-white py-3 rounded-lg transition-colors"
                                >
                                    Não, manter
                                </button>
                                <button
                                    onClick={handleCancel}
                                    disabled={isCancelling}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {isCancelling ? 'Cancelando...' : 'Sim, cancelar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingConfirmation;
