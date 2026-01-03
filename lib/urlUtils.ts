/**
 * Obtém a URL base da aplicação de forma dinâmica
 * Funciona em qualquer porta (3000, 5173, etc.)
 */
export function getAppUrl(): string {
    // Client-side: usa window.location.origin
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    // Server-side: usa variável de ambiente
    return import.meta.env.VITE_APP_URL || 'http://localhost:3000';
}

/**
 * Gera URL de pagamento público
 */
export function getPaymentUrl(businessId: string, appointmentId: string): string {
    return `${getAppUrl()}/pagamento/${businessId}/${appointmentId}`;
}

/**
 * Gera URL de confirmação
 */
export function getConfirmationUrl(appointmentId: string): string {
    return `${getAppUrl()}/confirmacao/${appointmentId}`;
}

/**
 * Gera URL do webhook Stripe
 */
export function getWebhookUrl(): string {
    const baseUrl = import.meta.env.VITE_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/stripe-webhook`;
}
