/**
 * =====================================================
 * PAYMENT GATEWAY - Factory para Provedores de Pagamento
 * =====================================================
 * Abstração unificada para criar sessões de pagamento
 * Suporta: Stripe e Abacate Pay
 * =====================================================
 */

import { createStripeCheckoutSession, CheckoutSessionParams } from './stripeCheckout';
import { createAbacatePayBilling, AbacatePayBillingParams, getBusinessPaymentProvider } from './abacatePayCheckout';

export interface PaymentSessionParams {
    appointmentId: string;
    serviceIds: string[];
    businessId: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    clientCpf?: string; // Required for Abacate Pay
    successUrl: string;
    cancelUrl: string;
}

export interface PaymentSessionResult {
    url: string | null;
    sessionId: string | null;
    provider: 'stripe' | 'abacatepay';
    error?: string;
}

/**
 * Cria uma sessão de pagamento usando o provedor configurado pelo business
 * Automaticamente escolhe entre Stripe e Abacate Pay
 */
export async function createPaymentSession(params: PaymentSessionParams): Promise<PaymentSessionResult> {
    const { businessId } = params;

    // Determinar qual provedor usar
    const provider = await getBusinessPaymentProvider(businessId);

    console.log(`[PaymentGateway] Using provider: ${provider} for business: ${businessId}`);

    if (provider === 'abacatepay') {
        // Usar Abacate Pay
        const abacateParams: AbacatePayBillingParams = {
            appointmentId: params.appointmentId,
            serviceIds: params.serviceIds,
            businessId: params.businessId,
            clientName: params.clientName,
            clientEmail: params.clientEmail,
            clientPhone: params.clientPhone,
            clientCpf: params.clientCpf,
            successUrl: params.successUrl,
            cancelUrl: params.cancelUrl,
        };

        const result = await createAbacatePayBilling(abacateParams);

        return {
            url: result.url,
            sessionId: result.billingId,
            provider: 'abacatepay',
            error: result.error,
        };
    } else {
        // Usar Stripe (default)
        const stripeParams: CheckoutSessionParams = {
            appointmentId: params.appointmentId,
            serviceIds: params.serviceIds,
            businessId: params.businessId,
            clientName: params.clientName,
            clientEmail: params.clientEmail,
            successUrl: params.successUrl,
            cancelUrl: params.cancelUrl,
        };

        const result = await createStripeCheckoutSession(stripeParams);

        return {
            url: result.url,
            sessionId: result.sessionId,
            provider: 'stripe',
            error: result.error,
        };
    }
}

/**
 * Verifica se o business tem um provedor de pagamento configurado
 */
export async function hasPaymentProviderConfigured(businessId: string): Promise<{
    configured: boolean;
    provider: 'stripe' | 'abacatepay' | null;
}> {
    const provider = await getBusinessPaymentProvider(businessId);

    // Verificar se tem API key configurada
    const { supabase } = await import('./supabase');
    const { data } = await supabase
        .from('businesses')
        .select('stripe_secret_key, abacatepay_api_key')
        .eq('id', businessId)
        .single();

    if (!data) {
        return { configured: false, provider: null };
    }

    if (provider === 'abacatepay' && data.abacatepay_api_key) {
        return { configured: true, provider: 'abacatepay' };
    }

    if (provider === 'stripe' && data.stripe_secret_key) {
        return { configured: true, provider: 'stripe' };
    }

    return { configured: false, provider: null };
}
