/**
 * =====================================================
 * APP CONFIGURATION
 * =====================================================
 * Configuração centralizada de URLs e domínios
 * Automaticamente usa domínio em produção
 * =====================================================
 */

// Configuração de domínio
export const APP_CONFIG = {
    // URL base da aplicação
    // Em produção: usa VITE_APP_URL do .env
    // Em desenvolvimento: usa localhost
    baseUrl: import.meta.env.VITE_APP_URL || window.location.origin,

    // URL pública para agendamentos
    get publicBookingUrl(): string {
        return `${this.baseUrl}/booking`;
    },

    // URL do webhook do Stripe
    get webhookUrl(): string {
        return `${this.baseUrl}/api/stripe/webhook`;
    },

    // URL de sucesso do pagamento
    get paymentSuccessUrl(): string {
        return `${this.baseUrl}/payment/success`;
    },

    // URL de cancelamento do pagamento
    get paymentCancelUrl(): string {
        return `${this.baseUrl}/payment/cancel`;
    },

    // Ambiente
    isProduction: import.meta.env.PROD,
    isDevelopment: import.meta.env.DEV,

    // Informações do app
    appName: 'NS Studio',
    appVersion: '1.0.0'
};

/**
 * Gerar link de agendamento público
 */
export function generateBookingLink(businessId: string, professionalId?: string): string {
    let url = `${APP_CONFIG.publicBookingUrl}/${businessId}`;

    if (professionalId) {
        url += `?professional=${professionalId}`;
    }

    return url;
}

/**
 * Gerar link de pagamento com retorno
 */
export function generatePaymentUrls() {
    return {
        success: `${APP_CONFIG.paymentSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel: APP_CONFIG.paymentCancelUrl
    };
}

/**
 * Obter URL do webhook
 */
export function getWebhookUrl(): string {
    return APP_CONFIG.webhookUrl;
}
