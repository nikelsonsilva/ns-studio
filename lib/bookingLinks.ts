/**
 * =====================================================
 * BOOKING LINKS - Gerenciamento de Links de Confirmação
 * =====================================================
 * Funções para criar, validar e gerenciar links de confirmação
 * de agendamentos manuais
 * =====================================================
 */

import { supabase } from './supabase';
import { addHours, isBefore, parseISO } from 'date-fns';

// =====================================================
// TYPES
// =====================================================

export interface BookingLinkData {
    token: string;
    url: string;
    expiresAt: Date;
}

export interface AppointmentDetails {
    id: string;
    booking_token: string;
    date: string;
    time: string;
    status: string;
    payment_status: string;
    payment_method: string;
    service: {
        name: string;
        duration_minutes: number;
        price: number;
    };
    professional: {
        name: string;
        specialty: string;
    };
    client: {
        name: string;
        phone: string;
        email: string;
    };
    business: {
        name: string;
    };
}

// =====================================================
// GENERATE BOOKING LINK
// =====================================================

/**
 * Gera token único e cria link de confirmação
 */
export async function generateBookingLink(appointmentId: string): Promise<BookingLinkData | null> {
    try {
        // Gerar token único
        const { data: tokenData, error: tokenError } = await supabase
            .rpc('generate_booking_token');

        if (tokenError || !tokenData) {
            console.error('Error generating token:', tokenError);
            return null;
        }

        const token = tokenData;

        // Atualizar appointment com token
        const { error: updateError } = await supabase
            .from('appointments')
            .update({ booking_token: token })
            .eq('id', appointmentId);

        if (updateError) {
            console.error('Error updating appointment:', updateError);
            return null;
        }

        // Criar URL do link
        const baseUrl = window.location.origin;
        const url = `${baseUrl}/booking/${token}`;

        // Link expira em 24 horas
        const expiresAt = addHours(new Date(), 24);

        return {
            token,
            url,
            expiresAt
        };
    } catch (error) {
        console.error('Error in generateBookingLink:', error);
        return null;
    }
}

// =====================================================
// GET APPOINTMENT BY TOKEN
// =====================================================

/**
 * Busca detalhes do agendamento pelo token
 */
export async function getAppointmentByToken(token: string): Promise<AppointmentDetails | null> {
    try {
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                id,
                booking_token,
                date,
                time,
                status,
                payment_status,
                payment_method,
                duration_minutes,
                amount_paid,
                services (
                    name,
                    duration_minutes,
                    price
                ),
                professionals (
                    name,
                    specialty
                ),
                clients (
                    name,
                    phone,
                    email
                ),
                businesses (
                    name
                )
            `)
            .eq('booking_token', token)
            .single();

        if (error || !data) {
            console.error('Error fetching appointment:', error);
            return null;
        }

        const result = data as any;
        return {
            id: result.id,
            booking_token: result.booking_token,
            date: result.date,
            time: result.time,
            status: result.status,
            payment_status: result.payment_status,
            payment_method: result.payment_method,
            service: {
                name: result.services?.name || '',
                duration_minutes: result.services?.duration_minutes || result.duration_minutes || 60,
                price: result.services?.price || result.amount_paid || 0
            },
            professional: {
                name: result.professionals?.name || '',
                specialty: result.professionals?.specialty || ''
            },
            client: {
                name: result.clients?.name || '',
                phone: result.clients?.phone || '',
                email: result.clients?.email || ''
            },
            business: {
                name: result.businesses?.name || ''
            }
        };
    } catch (error) {
        console.error('Error in getAppointmentByToken:', error);
        return null;
    }
}

// =====================================================
// CONFIRM APPOINTMENT
// =====================================================

/**
 * Confirma agendamento (sem pagamento por enquanto)
 */
export async function confirmAppointment(token: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('appointments')
            .update({
                status: 'confirmed',
                // payment_status permanece 'pending' até integrar Stripe
            })
            .eq('booking_token', token);

        if (error) {
            console.error('Error confirming appointment:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in confirmAppointment:', error);
        return false;
    }
}

// =====================================================
// CANCEL APPOINTMENT
// =====================================================

/**
 * Verifica se pode cancelar (2 horas antes)
 */
export function canCancelAppointment(appointmentDate: string, appointmentTime: string): boolean {
    try {
        const appointmentDateTime = parseISO(`${appointmentDate}T${appointmentTime}`);
        const twoHoursBefore = addHours(appointmentDateTime, -2);
        const now = new Date();

        return isBefore(now, twoHoursBefore);
    } catch (error) {
        console.error('Error checking cancellation time:', error);
        return false;
    }
}

/**
 * Cancela agendamento
 */
export async function cancelAppointment(token: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Buscar dados do agendamento
        const appointment = await getAppointmentByToken(token);

        if (!appointment) {
            return { success: false, error: 'Agendamento não encontrado' };
        }

        // Verificar se pode cancelar (2h antes)
        if (!canCancelAppointment(appointment.date, appointment.time)) {
            return {
                success: false,
                error: 'Cancelamento permitido apenas até 2 horas antes do horário agendado'
            };
        }

        // Cancelar
        const { error } = await supabase
            .from('appointments')
            .update({ status: 'cancelled' })
            .eq('booking_token', token);

        if (error) {
            console.error('Error cancelling appointment:', error);
            return { success: false, error: 'Erro ao cancelar agendamento' };
        }

        return { success: true };
    } catch (error) {
        console.error('Error in cancelAppointment:', error);
        return { success: false, error: 'Erro ao cancelar agendamento' };
    }
}

// =====================================================
// SEND NOTIFICATION
// =====================================================

/**
 * Gera mensagem padrão para enviar ao cliente
 */
export function generateBookingMessage(
    clientName: string,
    date: string,
    time: string,
    bookingUrl: string
): string {
    return `Olá ${clientName}! 👋

Seu agendamento foi reservado para:
📅 ${date} às ${time}

Para confirmar e garantir sua vaga, acesse o link:
🔗 ${bookingUrl}

⚠️ Importante: O link expira em 24 horas.

Qualquer dúvida, estamos à disposição!`;
}

/**
 * Copia link para área de transferência
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        return false;
    }
}

/**
 * Abre WhatsApp com mensagem pré-formatada
 */
export function sendViaWhatsApp(phone: string, message: string): void {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
}
