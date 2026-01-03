/**
 * =====================================================
 * STRIPE PAYMENT LINKS - Geração de Links de Pagamento
 * =====================================================
 * Funções para criar Payment Links do Stripe para agendamentos
 * =====================================================
 */

import Stripe from 'stripe';
import { getStripeKey } from './stripe';
import { supabase } from './supabase';

/**
 * Cria um Stripe Payment Link para um agendamento
 * @param appointmentId - ID do agendamento
 * @param serviceId - ID do serviço
 * @param clientName - Nome do cliente
 * @param clientEmail - Email do cliente (opcional)
 * @returns URL do Payment Link ou null
 */
export async function createStripePaymentLink(
    appointmentId: string,
    serviceId: string,
    clientName: string,
    clientEmail?: string
): Promise<string | null> {
    try {
        // 1. Obter Stripe API Key
        const apiKey = await getStripeKey();
        if (!apiKey) {
            console.error('Stripe API key not configured');
            return null;
        }

        // 2. Buscar serviço com stripe_price_id
        const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('name, price, stripe_price_id')
            .eq('id', serviceId)
            .single();

        if (serviceError || !service) {
            console.error('Service not found:', serviceError);
            return null;
        }

        // 3. Verificar se serviço tem stripe_price_id
        if (!service.stripe_price_id) {
            console.error('Service does not have Stripe Price ID. Please sync with Stripe first.');
            return null;
        }

        // 4. Criar instância do Stripe
        const stripe = new Stripe(apiKey, {
            apiVersion: '2025-11-17.clover',
            typescript: true
        });

        // 5. Criar Payment Link
        const paymentLink = await stripe.paymentLinks.create({
            line_items: [
                {
                    price: service.stripe_price_id,
                    quantity: 1,
                },
            ],
            after_completion: {
                type: 'redirect',
                redirect: {
                    url: `${window.location.origin}/confirmacao/${appointmentId}`,
                },
            },
            metadata: {
                appointment_id: appointmentId,
                service_id: serviceId,
                client_name: clientName,
            },
            customer_creation: 'always',
            ...(clientEmail && {
                invoice_creation: {
                    enabled: true,
                    invoice_data: {
                        description: `Agendamento - ${service.name}`,
                        metadata: {
                            appointment_id: appointmentId,
                        },
                    },
                },
            }),
        });

        // 6. Retornar URL do Payment Link
        return paymentLink.url;
    } catch (error) {
        console.error('Error creating Stripe Payment Link:', error);
        return null;
    }
}

/**
 * Verifica se um serviço está sincronizado com o Stripe
 * @param serviceId - ID do serviço
 * @returns true se tem stripe_price_id, false caso contrário
 */
export async function isServiceSyncedWithStripe(serviceId: string): Promise<boolean> {
    try {
        const { data: service } = await supabase
            .from('services')
            .select('stripe_price_id')
            .eq('id', serviceId)
            .single();

        return !!(service?.stripe_price_id);
    } catch (error) {
        console.error('Error checking service sync:', error);
        return false;
    }
}
