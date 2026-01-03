import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, Download, Share2, Loader2, Calendar, Clock, User, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ConfirmacaoPage() {
    // Extrair ID da URL: /confirmacao/{appointmentId}
    const pathname = window.location.pathname;
    const pathParts = pathname.split('/').filter(p => p); // Remove empty strings
    const appointmentId = pathParts[1]; // confirmacao/ID

    console.log('🔍 [Confirmacao] Full URL:', window.location.href);
    console.log('🔍 [Confirmacao] Pathname:', pathname);
    console.log('🔍 [Confirmacao] Path parts:', pathParts);
    console.log('🔍 [Confirmacao] Extracted ID:', appointmentId);

    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (appointmentId) {
            loadAppointment();
        } else {
            console.error('❌ [Confirmacao] No appointment ID found in URL');
            setLoading(false);
        }
    }, [appointmentId]);

    const loadAppointment = async () => {
        try {
            console.log('📡 [Confirmacao] Fetching appointment:', appointmentId);

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

            if (error) {
                console.error('❌ [Confirmacao] Supabase error:', error);
                throw error;
            }

            console.log('✅ [Confirmacao] Appointment loaded:', data);

            // ✅ Update status to confirmed and payment_status to paid
            // Only update if not already completed
            if (data && data.status !== 'completed' && data.status !== 'cancelled') {
                const { error: updateError } = await supabase
                    .from('appointments')
                    .update({
                        status: 'confirmed',
                        payment_status: 'paid'
                    })
                    .eq('id', appointmentId);

                if (updateError) {
                    console.error('⚠️ [Confirmacao] Failed to update status:', updateError);
                } else {
                    console.log('✅ [Confirmacao] Status updated to confirmed & paid');
                    // Update local state with new status
                    data.status = 'confirmed';
                    data.payment_status = 'paid';
                }
            }

            setAppointment(data);
        } catch (err) {
            console.error('❌ [Confirmacao] Load error:', err);
        } finally {
            setLoading(false);
        }
    };

    const shareWhatsApp = () => {
        if (!appointment) return;

        const startDate = parseISO(appointment.start_datetime);
        const message = `✅ *Agendamento Confirmado!*\n\n` +
            `📍 *${appointment.business?.name || 'Estabelecimento'}*\n` +
            `✂️ ${appointment.service?.name || 'Serviço'}\n` +
            `👤 ${appointment.professional?.name || 'Profissional'}\n` +
            `📅 ${format(startDate, "dd/MM/yyyy 'às' HH:mm")}\n` +
            `💰 R$ ${appointment.service?.price?.toFixed(2) || '0.00'}\n\n` +
            `_Código: ${appointment.id}_`;

        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
    };

    const downloadReceipt = () => {
        if (!appointment) return;

        const startDate = parseISO(appointment.start_datetime);
        const content = `
COMPROVANTE DE AGENDAMENTO

Estabelecimento: ${appointment.business?.name || 'Estabelecimento'}
Serviço: ${appointment.service?.name || 'Serviço'}
Profissional: ${appointment.professional?.name || 'Profissional'}
Data: ${format(startDate, "dd/MM/yyyy 'às' HH:mm")}
Valor: R$ ${appointment.service?.price?.toFixed(2) || '0.00'}
Status: Confirmado e Pago

Código: ${appointment.id}
        `.trim();

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agendamento-${appointment.id}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-950 via-barber-900 to-barber-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-green-500 animate-spin" />
                    <p className="text-white">Carregando...</p>
                </div>
            </div>
        );
    }

    if (!appointment) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-950 via-barber-900 to-barber-950 flex items-center justify-center">
                <div className="text-red-500">Agendamento não encontrado</div>
            </div>
        );
    }

    const startDate = parseISO(appointment.start_datetime);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-950 via-barber-900 to-barber-950 py-12 px-4">
            <div className="max-w-2xl mx-auto text-center">
                {/* Ícone de Sucesso */}
                <div className="mb-8 animate-bounce">
                    <CheckCircle className="w-24 h-24 text-green-500 mx-auto" />
                </div>

                {/* Título */}
                <h1 className="text-4xl font-bold text-white mb-4">
                    Pagamento Confirmado!
                </h1>
                <p className="text-gray-300 text-lg mb-8">
                    Seu agendamento foi confirmado com sucesso
                </p>

                {/* Card de Detalhes */}
                <div className="bg-barber-900 border border-barber-800 rounded-2xl p-8 mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">
                        Detalhes da Reserva
                    </h2>

                    <div className="space-y-6">
                        <div className="flex items-center gap-4 text-left">
                            <Calendar className="text-barber-gold" size={24} />
                            <div className="flex-1">
                                <p className="text-gray-400 text-sm">Data</p>
                                <p className="text-white font-semibold">
                                    {format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-left">
                            <Clock className="text-barber-gold" size={24} />
                            <div className="flex-1">
                                <p className="text-gray-400 text-sm">Horário</p>
                                <p className="text-white font-semibold">
                                    {format(startDate, 'HH:mm')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-left">
                            <User className="text-barber-gold" size={24} />
                            <div className="flex-1">
                                <p className="text-gray-400 text-sm">Profissional</p>
                                <p className="text-white font-semibold">
                                    {appointment.professional?.name || 'Profissional'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 text-left border-t border-barber-800 pt-6">
                            <DollarSign className="text-green-500" size={24} />
                            <div className="flex-1">
                                <p className="text-gray-400 text-sm">Valor Pago</p>
                                <p className="text-green-500 font-bold text-2xl">
                                    R$ {appointment.service?.price?.toFixed(2) || '0.00'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Botões de Ação */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={downloadReceipt}
                        className="flex items-center justify-center gap-2 bg-barber-gold text-barber-950 font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-barber-gold/50 transition-all"
                    >
                        <Download size={20} />
                        Baixar Comprovante
                    </button>

                    <button
                        onClick={shareWhatsApp}
                        className="flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-green-600/50 transition-all"
                    >
                        <Share2 size={20} />
                        Compartilhar
                    </button>
                </div>

                <p className="text-gray-500 text-sm mt-8">
                    Código do agendamento: <span className="text-gray-400 font-mono">{appointment.id}</span>
                </p>
            </div>
        </div>
    );
}
