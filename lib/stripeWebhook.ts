/**
 * =====================================================
 * STRIPE WEBHOOK HANDLER
 * =====================================================
 * Processa eventos do Stripe e atualiza status de pagamento
 * automaticamente quando cliente paga
 * =====================================================
 */

import Stripe from 'stripe';
import { supabase } from './supabase';
import { getStripeClient } from './stripe';

/**
 * Processa eventos do webhook do Stripe
 * @param event - Evento do Stripe
 * @returns true se processado com sucesso
 */
export async function handleStripeWebhook(event: Stripe.Event): Promise<boolean> {
    console.log(`🔔 [Webhook] Received event: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                break;

            case 'payment_intent.succeeded':
                await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
                break;

            case 'charge.succeeded':
                await handleChargeSucceeded(event.data.object as Stripe.Charge);
                break;

            default:
                console.log(`ℹ️  [Webhook] Unhandled event type: ${event.type}`);
        }

        return true;
    } catch (error) {
        console.error('❌ [Webhook] Error processing event:', error);
        return false;
    }
}

/**
 * Processa checkout session completada
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    console.log('✅ [Webhook] Checkout completed:', session.id);

    try {
        // Buscar agendamento pelo payment_link
        const { data: appointments } = await supabase
            .from('appointments')
            .select('*')
            .ilike('payment_link', `%${session.id}%`);

        if (!appointments || appointments.length === 0) {
            console.log('⚠️  [Webhook] No appointment found for session:', session.id);
            return;
        }

        const appointment = appointments[0];

        // Atualizar status de pagamento
        const { error } = await supabase
            .from('appointments')
            .update({
                payment_status: 'paid',
                payment_intent_id: session.payment_intent as string,
                updated_at: new Date().toISOString()
            })
            .eq('id', appointment.id);

        if (error) {
            console.error('❌ [Webhook] Error updating appointment:', error);
            return;
        }

        console.log(`✅ [Webhook] Updated appointment ${appointment.id} to paid`);
    } catch (error) {
        console.error('❌ [Webhook] Error in handleCheckoutCompleted:', error);
    }
}

/**
 * Processa pagamento bem-sucedido
 */
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    console.log('✅ [Webhook] Payment succeeded:', paymentIntent.id);

    try {
        // Atualizar pelo payment_intent_id
        const { error } = await supabase
            .from('appointments')
            .update({
                payment_status: 'paid',
                updated_at: new Date().toISOString()
            })
            .eq('payment_intent_id', paymentIntent.id);

        if (error) {
            console.error('❌ [Webhook] Error updating payment:', error);
            return;
        }

        console.log(`✅ [Webhook] Updated payment ${paymentIntent.id} to paid`);
    } catch (error) {
        console.error('❌ [Webhook] Error in handlePaymentSucceeded:', error);
    }
}

/**
 * Processa pagamento falhado
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    console.log('❌ [Webhook] Payment failed:', paymentIntent.id);

    try {
        // Atualizar status para failed
        const { error } = await supabase
            .from('appointments')
            .update({
                payment_status: 'failed',
                updated_at: new Date().toISOString()
            })
            .eq('payment_intent_id', paymentIntent.id);

        if (error) {
            console.error('❌ [Webhook] Error updating failed payment:', error);
            return;
        }

        console.log(`✅ [Webhook] Updated payment ${paymentIntent.id} to failed`);
    } catch (error) {
        console.error('❌ [Webhook] Error in handlePaymentFailed:', error);
    }
}

/**
 * Processa charge bem-sucedido (para Payment Links)
 */
async function handleChargeSucceeded(charge: Stripe.Charge) {
    console.log('✅ [Webhook] Charge succeeded:', charge.id);

    try {
        // Buscar agendamento pelo payment_intent_id
        if (charge.payment_intent) {
            const { error } = await supabase
                .from('appointments')
                .update({
                    payment_status: 'paid',
                    updated_at: new Date().toISOString()
                })
                .eq('payment_intent_id', charge.payment_intent as string);

            if (error) {
                console.error('❌ [Webhook] Error updating charge:', error);
                return;
            }

            console.log(`✅ [Webhook] Updated charge ${charge.id} to paid`);
        }
    } catch (error) {
        console.error('❌ [Webhook] Error in handleChargeSucceeded:', error);
    }
}

/**
 * Verifica assinatura do webhook
 * @param payload - Corpo da requisição
 * @param signature - Assinatura do Stripe
 * @param secret - Webhook secret
 * @returns Evento verificado ou null
 */
export async function verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
): Promise<Stripe.Event | null> {
    try {
        const stripe = await getStripeClient();

        if (!stripe) {
            console.error('❌ [Webhook] Stripe client not configured');
            return null;
        }

        const event = stripe.webhooks.constructEvent(
            payload,
            signature,
            secret
        );

        return event;
    } catch (error: any) {
        console.error('❌ [Webhook] Signature verification failed:', error.message);
        return null;
    }
}

/**
 * Processa webhook do Stripe (função principal)
 * @param rawBody - Corpo bruto da requisição
 * @param signature - Assinatura do webhook
 * @param webhookSecret - Secret do webhook
 * @returns true se processado com sucesso
 */
export async function processStripeWebhook(
    rawBody: string | Buffer,
    signature: string,
    webhookSecret: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Verificar assinatura
        const event = await verifyWebhookSignature(rawBody, signature, webhookSecret);

        if (!event) {
            return {
                success: false,
                error: 'Invalid signature'
            };
        }

        // Processar evento
        const processed = await handleStripeWebhook(event);

        return {
            success: processed
        };
    } catch (error: any) {
        console.error('❌ [Webhook] Error processing webhook:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
