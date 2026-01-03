/**
 * =====================================================
 * STRIPE WEBHOOK SERVER
 * =====================================================
 * Servidor Express para receber webhooks do Stripe
 * =====================================================
 */

import express from 'express';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.WEBHOOK_PORT || 3001;

// Configurações
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const STRIPE_SECRET_KEY = process.env.VITE_STRIPE_SECRET_KEY || '';

// Validar configurações
if (!WEBHOOK_SECRET) {
    console.warn('⚠️  STRIPE_WEBHOOK_SECRET not configured!');
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Supabase credentials not configured!');
    process.exit(1);
}

if (!STRIPE_SECRET_KEY) {
    console.error('❌ Stripe secret key not configured!');
    process.exit(1);
}

// Inicializar clientes
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-17.clover'
});

/**
 * Endpoint do webhook do Stripe
 * IMPORTANTE: Deve usar express.raw() para preservar o body original
 */
app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        const signature = req.headers['stripe-signature'];

        if (!signature) {
            console.error('❌ [Webhook] Missing stripe-signature header');
            return res.status(400).send('Missing signature');
        }

        let event: Stripe.Event;

        try {
            // Verificar assinatura
            event = stripe.webhooks.constructEvent(
                req.body,
                signature as string,
                WEBHOOK_SECRET
            );
        } catch (err: any) {
            console.error('❌ [Webhook] Signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        console.log(`🔔 [Webhook] Received event: ${event.type}`);

        try {
            // Processar evento
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

            console.log('✅ [Webhook] Processed successfully');
            res.json({ received: true });
        } catch (error: any) {
            console.error('❌ [Webhook] Processing failed:', error);
            res.status(500).send(`Server Error: ${error.message}`);
        }
    }
);

// Handlers de eventos
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    console.log('✅ [Webhook] Checkout completed:', session.id);

    try {
        const { data: appointments } = await supabase
            .from('appointments')
            .select('*')
            .ilike('payment_link', `%${session.id}%`);

        if (!appointments || appointments.length === 0) {
            console.log('⚠️  [Webhook] No appointment found for session:', session.id);
            return;
        }

        const appointment = appointments[0];

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

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    console.log('✅ [Webhook] Payment succeeded:', paymentIntent.id);

    try {
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

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
    console.log('❌ [Webhook] Payment failed:', paymentIntent.id);

    try {
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

async function handleChargeSucceeded(charge: Stripe.Charge) {
    console.log('✅ [Webhook] Charge succeeded:', charge.id);

    try {
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

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        config: {
            webhookSecretConfigured: !!WEBHOOK_SECRET,
            supabaseConfigured: !!SUPABASE_URL && !!SUPABASE_ANON_KEY,
            stripeConfigured: !!STRIPE_SECRET_KEY
        }
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ============================================');
    console.log('   Stripe Webhook Server');
    console.log('============================================');
    console.log(`📍 Running on: http://localhost:${PORT}`);
    console.log(`🔗 Webhook URL: http://localhost:${PORT}/api/stripe/webhook`);
    console.log(`🔐 Webhook secret: ${WEBHOOK_SECRET ? '✅ Configured' : '❌ Not configured'}`);
    console.log(`💾 Supabase: ${SUPABASE_URL ? '✅ Connected' : '❌ Not configured'}`);
    console.log(`💳 Stripe: ${STRIPE_SECRET_KEY ? '✅ Connected' : '❌ Not configured'}`);
    console.log('============================================');
    console.log('');
});

export default app;
