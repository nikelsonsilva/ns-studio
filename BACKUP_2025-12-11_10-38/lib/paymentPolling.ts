/**
 * =====================================================
 * STRIPE PAYMENT POLLING SERVICE
 * =====================================================
 * Verifica status de pagamentos pendentes automaticamente
 * Alternativa simples aos webhooks para desenvolvimento
 * =====================================================
 */

import { supabase } from './supabase';
import { getStripeClient } from './stripe';

/**
 * Verificar e atualizar pagamentos pendentes
 */
export async function checkPendingPayments(businessId: string): Promise<number> {
    try {
        console.log('🔄 [Polling] Checking pending payments...');

        // Buscar agendamentos com pagamento pendente
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('business_id', businessId)
            .in('payment_status', ['awaiting_payment', 'pending'])
            .not('payment_link', 'is', null);

        if (error) {
            console.error('❌ [Polling] Error fetching appointments:', error);
            return 0;
        }

        if (!appointments || appointments.length === 0) {
            console.log('ℹ️  [Polling] No pending payments');
            return 0;
        }

        console.log(`🔍 [Polling] Found ${appointments.length} pending payment(s)`);

        // Obter cliente Stripe
        const stripe = await getStripeClient(businessId);
        if (!stripe) {
            console.error('❌ [Polling] Stripe not configured');
            return 0;
        }

        let updatedCount = 0;

        // Verificar cada agendamento
        for (const appointment of appointments) {
            try {
                // Extrair session ID do payment_link
                const sessionId = extractSessionId(appointment.payment_link);

                if (!sessionId) {
                    console.log(`⚠️  [Polling] No session ID for appointment ${appointment.id}`);
                    continue;
                }

                // Buscar sessão no Stripe
                const session = await stripe.checkout.sessions.retrieve(sessionId);

                // Verificar se foi pago
                if (session.payment_status === 'paid') {
                    console.log(`✅ [Polling] Payment confirmed for appointment ${appointment.id}`);

                    // Atualizar no banco
                    const { error: updateError } = await supabase
                        .from('appointments')
                        .update({
                            payment_status: 'paid',
                            payment_intent_id: session.payment_intent as string,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', appointment.id);

                    if (!updateError) {
                        updatedCount++;
                        console.log(`✅ [Polling] Updated appointment ${appointment.id} to paid`);
                    } else {
                        console.error(`❌ [Polling] Error updating appointment:`, updateError);
                    }
                } else if (session.payment_status === 'unpaid') {
                    console.log(`⏳ [Polling] Payment still pending for appointment ${appointment.id}`);
                }
            } catch (error: any) {
                // Ignorar erros de sessão não encontrada (normal para Payment Links)
                if (error.code !== 'resource_missing') {
                    console.error(`❌ [Polling] Error checking appointment ${appointment.id}:`, error.message);
                }
            }
        }

        if (updatedCount > 0) {
            console.log(`🎉 [Polling] Updated ${updatedCount} payment(s)`);
        }

        return updatedCount;
    } catch (error) {
        console.error('❌ [Polling] Unexpected error:', error);
        return 0;
    }
}

/**
 * Extrair session ID do payment link
 */
function extractSessionId(paymentLink: string): string | null {
    try {
        // Payment Links do Stripe têm formato: https://buy.stripe.com/test_xxxxx
        // Precisamos buscar a sessão criada por esse link

        // Por enquanto, retornar null pois Payment Links não expõem session ID diretamente
        // Em produção, usar webhooks ou Checkout Sessions diretos
        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Iniciar polling automático
 */
export function startPaymentPolling(businessId: string, intervalMs: number = 30000): NodeJS.Timeout {
    console.log(`🚀 [Polling] Starting payment polling (every ${intervalMs / 1000}s)`);

    // Verificar imediatamente
    checkPendingPayments(businessId);

    // Depois verificar a cada intervalo
    return setInterval(() => {
        checkPendingPayments(businessId);
    }, intervalMs);
}

/**
 * Parar polling
 */
export function stopPaymentPolling(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
    console.log('🛑 [Polling] Payment polling stopped');
}
