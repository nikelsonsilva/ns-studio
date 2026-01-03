/**
 * =====================================================
 * VITE PLUGIN - STRIPE WEBHOOK
 * =====================================================
 * Plugin para adicionar endpoint de webhook ao servidor Vite
 * Multi-tenant: busca API key do banco automaticamente
 * =====================================================
 */

import { Plugin } from 'vite';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export function stripeWebhookPlugin(): Plugin {
    return {
        name: 'stripe-webhook',
        configureServer(server) {
            server.middlewares.use(async (req, res, next) => {
                // Apenas processar POST /api/stripe/webhook
                if (req.method !== 'POST' || req.url !== '/api/stripe/webhook') {
                    return next();
                }

                console.log('🔔 [Webhook] Received request');

                // Ler body bruto
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });

                req.on('end', async () => {
                    try {
                        const signature = req.headers['stripe-signature'];

                        if (!signature) {
                            console.error('❌ [Webhook] Missing signature');
                            res.statusCode = 400;
                            res.end('Missing signature');
                            return;
                        }

                        // Processar webhook
                        await processWebhook(body, signature as string);

                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ received: true }));
                    } catch (error: any) {
                        console.error('❌ [Webhook] Error:', error);
                        res.statusCode = 500;
                        res.end(`Error: ${error.message}`);
                    }
                });
            });
        }
    };
}

/**
 * Processa webhook do Stripe
 */
async function processWebhook(body: string, signature: string) {
    // Inicializar Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar webhook secret do primeiro negócio (ou do metadata do evento)
    const { data: business } = await supabase
        .from('businesses')
        .select('stripe_webhook_secret, stripe_api_key')
        .limit(1)
        .single();

    if (!business || !business.stripe_webhook_secret) {
        console.error('❌ [Webhook] No webhook secret configured');
        throw new Error('Webhook secret not configured');
    }

    // Criar cliente Stripe (para verificar assinatura)
    const stripe = new Stripe(business.stripe_api_key || process.env.VITE_STRIPE_SECRET_KEY!, {
        apiVersion: '2025-11-17.clover'
    });

    // Verificar assinatura
    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            business.stripe_webhook_secret
        );
    } catch (err: any) {
        console.error('❌ [Webhook] Invalid signature:', err.message);
        throw new Error('Invalid signature');
    }

    console.log(`🔔 [Webhook] Event: ${event.type}`);

    // Processar evento
    switch (event.type) {
        case 'checkout.session.completed':
            await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase);
            break;

        case 'payment_intent.succeeded':
            await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, supabase);
            break;

        case 'payment_intent.payment_failed':
            await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, supabase);
            break;

        case 'charge.succeeded':
            await handleChargeSucceeded(event.data.object as Stripe.Charge, supabase);
            break;

        default:
            console.log(`ℹ️  [Webhook] Unhandled: ${event.type}`);
    }
}

// Handlers
async function handleCheckoutCompleted(session: Stripe.Checkout.Session, supabase: any) {
    console.log('✅ [Webhook] Checkout completed:', session.id);

    const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .ilike('payment_link', `%${session.id}%`);

    if (!appointments || appointments.length === 0) {
        console.log('⚠️  [Webhook] No appointment found');
        return;
    }

    const { error } = await supabase
        .from('appointments')
        .update({
            payment_status: 'paid',
            payment_intent_id: session.payment_intent,
            updated_at: new Date().toISOString()
        })
        .eq('id', appointments[0].id);

    if (!error) {
        console.log(`✅ [Webhook] Updated appointment ${appointments[0].id} to paid`);
    }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent, supabase: any) {
    console.log('✅ [Webhook] Payment succeeded:', paymentIntent.id);

    await supabase
        .from('appointments')
        .update({
            payment_status: 'paid',
            updated_at: new Date().toISOString()
        })
        .eq('payment_intent_id', paymentIntent.id);
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, supabase: any) {
    console.log('❌ [Webhook] Payment failed:', paymentIntent.id);

    await supabase
        .from('appointments')
        .update({
            payment_status: 'failed',
            updated_at: new Date().toISOString()
        })
        .eq('payment_intent_id', paymentIntent.id);
}

async function handleChargeSucceeded(charge: Stripe.Charge, supabase: any) {
    console.log('✅ [Webhook] Charge succeeded:', charge.id);

    if (charge.payment_intent) {
        await supabase
            .from('appointments')
            .update({
                payment_status: 'paid',
                updated_at: new Date().toISOString()
            })
            .eq('payment_intent_id', charge.payment_intent);
    }
}
