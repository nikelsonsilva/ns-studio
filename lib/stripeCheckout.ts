/**
 * =====================================================
 * STRIPE CHECKOUT - Criação de Sessions de Checkout
 * =====================================================
 * Funções para criar Stripe Checkout Sessions para agendamentos
 * =====================================================
 */

import Stripe from 'stripe';
import { getStripeKey } from './stripe';
import { supabase } from './supabase';

export interface CheckoutSessionParams {
    appointmentId: string;
    serviceIds: string[]; // Support multiple services
    businessId: string;
    clientName: string;
    clientEmail: string;
    successUrl: string;
    cancelUrl: string;
}

/**
 * Cria uma Stripe Checkout Session para um agendamento
 * Suporta múltiplos serviços criando múltiplos line_items
 * @returns URL do checkout ou null em caso de erro
 */
export async function createStripeCheckoutSession(params: CheckoutSessionParams): Promise<{
    url: string | null;
    sessionId: string | null;
    error?: string;
}> {
    const { appointmentId, serviceIds, businessId, clientName, clientEmail, successUrl, cancelUrl } = params;

    try {
        // 1. Obter Stripe API Key
        const apiKey = await getStripeKey(businessId);
        if (!apiKey) {
            console.error('Stripe API key not configured');
            return { url: null, sessionId: null, error: 'Stripe não configurado' };
        }

        // 2. Buscar todos os serviços selecionados
        const { data: services, error: serviceError } = await supabase
            .from('services')
            .select('id, name, price, stripe_price_id, duration_minutes')
            .in('id', serviceIds);

        if (serviceError || !services?.length) {
            console.error('Services not found:', serviceError);
            return { url: null, sessionId: null, error: 'Serviços não encontrados' };
        }

        // 3. Verificar se TODOS os serviços têm stripe_price_id
        const missingStripe = services.filter(s => !s.stripe_price_id);
        if (missingStripe.length > 0) {
            console.error('Services without Stripe Price ID:', missingStripe.map(s => s.name));
            return { url: null, sessionId: null, error: `Serviço "${missingStripe[0].name}" não sincronizado com Stripe` };
        }

        // 4. Criar instância do Stripe
        const stripe = new Stripe(apiKey, {
            apiVersion: '2025-11-17.clover',
            typescript: true
        });

        // 5. Criar line_items para CADA serviço
        const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = services.map(service => ({
            price: service.stripe_price_id,
            quantity: 1,
        }));

        // 6. Criar Checkout Session com todos os serviços
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: lineItems,
            customer_email: clientEmail,
            success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&appointment_id=${appointmentId}`,
            cancel_url: cancelUrl,
            metadata: {
                appointment_id: appointmentId,
                service_ids: serviceIds.join(','), // Store all service IDs
                business_id: businessId,
                client_name: clientName,
                client_email: clientEmail,
            },
            expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Expira em 30 minutos (mínimo do Stripe)
        });

        // 7. Atualizar agendamento com session_id
        await supabase
            .from('appointments')
            .update({
                stripe_session_id: session.id,
                payment_expires_at: new Date(session.expires_at! * 1000).toISOString(),
            })
            .eq('id', appointmentId);

        return {
            url: session.url,
            sessionId: session.id,
        };
    } catch (error: any) {
        console.error('Error creating Stripe Checkout Session:', error);
        return {
            url: null,
            sessionId: null,
            error: error.message || 'Erro ao criar sessão de pagamento'
        };
    }
}

/**
 * Verifica o status de uma Checkout Session e atualiza o agendamento
 */
export async function verifyCheckoutSession(
    sessionId: string,
    businessId: string
): Promise<{
    success: boolean;
    paymentStatus: 'paid' | 'unpaid' | 'expired';
    appointmentId?: string;
    error?: string;
}> {
    try {
        const apiKey = await getStripeKey(businessId);
        if (!apiKey) {
            return { success: false, paymentStatus: 'unpaid', error: 'Stripe não configurado' };
        }

        const stripe = new Stripe(apiKey, {
            apiVersion: '2025-11-17.clover',
            typescript: true
        });

        const session = await stripe.checkout.sessions.retrieve(sessionId);

        console.log('[StripeCheckout] Session payment_status:', session.payment_status);
        console.log('[StripeCheckout] Session status:', session.status);

        if (session.payment_status === 'paid') {
            const appointmentId = session.metadata?.appointment_id;

            if (appointmentId) {
                // Atualizar agendamento para confirmado e pago
                const { error: updateError } = await supabase
                    .from('appointments')
                    .update({
                        status: 'confirmed',
                        payment_status: 'paid',
                    })
                    .eq('id', appointmentId);

                if (updateError) {
                    console.error('[StripeCheckout] Error updating appointment:', updateError);
                } else {
                    console.log('[StripeCheckout] Appointment updated to confirmed/paid:', appointmentId);
                }
            }

            return {
                success: true,
                paymentStatus: 'paid',
                appointmentId,
            };
        }

        if (session.status === 'expired') {
            return { success: false, paymentStatus: 'expired' };
        }

        return { success: false, paymentStatus: 'unpaid' };
    } catch (error: any) {
        console.error('Error verifying checkout session:', error);
        return { success: false, paymentStatus: 'unpaid', error: error.message };
    }
}

/**
 * Cancela agendamentos com pagamento expirado (rodar periodicamente)
 */
export async function cancelExpiredPayments(): Promise<number> {
    try {
        const now = new Date().toISOString();

        // Buscar agendamentos pendentes com pagamento expirado
        const { data: expiredAppointments, error } = await supabase
            .from('appointments')
            .select('id')
            .eq('status', 'pending')
            .eq('payment_status', 'pending')
            .lt('payment_expires_at', now)
            .not('payment_expires_at', 'is', null);

        if (error || !expiredAppointments?.length) {
            return 0;
        }

        // Cancelar os agendamentos expirados
        const ids = expiredAppointments.map(a => a.id);
        await supabase
            .from('appointments')
            .update({
                status: 'cancelled',
                payment_status: 'expired',
            })
            .in('id', ids);

        console.log(`Cancelled ${ids.length} expired appointments`);
        return ids.length;
    } catch (error) {
        console.error('Error cancelling expired payments:', error);
        return 0;
    }
}
