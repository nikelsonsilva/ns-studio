/**
 * =====================================================
 * ABACATE PAY CHECKOUT - Criação de Cobranças
 * =====================================================
 * Funções para criar cobranças via Abacate Pay para agendamentos
 * Documentação: https://docs.abacatepay.com
 * =====================================================
 */

import { supabase } from './supabase';

const ABACATEPAY_API_URL = 'https://api.abacatepay.com/v1';

export interface AbacatePayBillingParams {
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

interface AbacatePayProduct {
    externalId: string;
    name: string;
    description?: string;
    quantity: number;
    price: number; // Em centavos
}

interface AbacatePayCustomer {
    name: string;
    email: string;
    cellphone?: string;
    taxId?: string; // CPF
}

interface AbacatePayBillingRequest {
    frequency: 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
    methods: ('PIX' | 'CARD')[];
    products: AbacatePayProduct[];
    customer?: AbacatePayCustomer;
    customerId?: string;
    returnUrl: string;
    completionUrl: string;
    externalId?: string;
}

interface AbacatePayBillingResponse {
    data: {
        id: string;
        url: string;
        amount: number;
        status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
        devMode: boolean;
        methods: string[];
        frequency: string;
        createdAt: string;
    } | null;
    error: string | null;
}

/**
 * Obtém a API Key do Abacate Pay para um business
 */
async function getAbacatePayKey(businessId: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('businesses')
        .select('abacatepay_api_key')
        .eq('id', businessId)
        .single();

    if (error || !data?.abacatepay_api_key) {
        console.error('[AbacatePay] API key not found for business:', businessId);
        return null;
    }

    return data.abacatepay_api_key;
}

/**
 * Cria uma cobrança no Abacate Pay para um agendamento
 * @returns URL de pagamento ou null em caso de erro
 */
export async function createAbacatePayBilling(params: AbacatePayBillingParams): Promise<{
    url: string | null;
    billingId: string | null;
    error?: string;
}> {
    const { appointmentId, serviceIds, businessId, clientName, clientEmail, clientPhone, clientCpf, successUrl, cancelUrl } = params;

    try {
        // 1. Obter API Key
        const apiKey = await getAbacatePayKey(businessId);
        if (!apiKey) {
            return { url: null, billingId: null, error: 'Abacate Pay não configurado' };
        }

        // 2. Buscar todos os serviços selecionados
        const { data: services, error: serviceError } = await supabase
            .from('services')
            .select('id, name, price, duration_minutes, description')
            .in('id', serviceIds);

        if (serviceError || !services?.length) {
            console.error('[AbacatePay] Services not found:', serviceError);
            return { url: null, billingId: null, error: 'Serviços não encontrados' };
        }

        // 3. Montar produtos para o Abacate Pay (preço em centavos)
        const products: AbacatePayProduct[] = services.map(service => ({
            externalId: service.id,
            name: service.name,
            description: service.description || `${service.duration_minutes} minutos`,
            quantity: 1,
            price: Math.round(service.price * 100), // Converter para centavos
        }));

        // 4. Montar request
        const billingRequest: AbacatePayBillingRequest = {
            frequency: 'ONE_TIME',
            methods: ['PIX'], // Apenas PIX - CARD requer habilitação na conta Abacate Pay
            products,
            customer: {
                name: clientName,
                email: clientEmail,
                cellphone: clientPhone,
                taxId: clientCpf?.replace(/\D/g, ''), // Remove formatting, only digits
            },
            returnUrl: cancelUrl,
            completionUrl: `${successUrl}?appointment_id=${appointmentId}`,
            externalId: appointmentId, // Identificador para correlacionar no webhook
        };

        // Billing request prepared

        // 5. Fazer requisição para Supabase Edge Function (evita CORS)
        // A Edge Function faz o proxy para a API do Abacate Pay
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/abacatepay-billing`;

        // Edge function call

        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                apiKey,
                billingData: billingRequest,
            }),
        });



        const responseText = await response.text();


        let result: AbacatePayBillingResponse;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error('[AbacatePay] Failed to parse response as JSON:', responseText);
            return { url: null, billingId: null, error: responseText || 'Erro desconhecido' };
        }

        if (!response.ok || result.error || !result.data) {
            console.error('[AbacatePay] Error creating billing:', result.error || responseText);
            return { url: null, billingId: null, error: result.error || responseText || 'Erro ao criar cobrança' };
        }

        // Billing created successfully

        // 6. Atualizar agendamento com billing_id

        const { error: updateError, data: updateData } = await supabase
            .from('appointments')
            .update({
                abacatepay_billing_id: result.data.id,
                payment_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
            })
            .eq('id', appointmentId)
            .select('id, abacatepay_billing_id');

        if (updateError) {
            console.error('[AbacatePay] ❌ Error updating appointment with billing_id:', updateError);
        } else {

        }

        return {
            url: result.data.url,
            billingId: result.data.id,
        };
    } catch (error: any) {
        console.error('[AbacatePay] Error:', error);
        return {
            url: null,
            billingId: null,
            error: error.message || 'Erro ao criar cobrança',
        };
    }
}

/**
 * Obtém o provedor de pagamento configurado para o business
 */
export async function getBusinessPaymentProvider(businessId: string): Promise<'stripe' | 'abacatepay'> {
    const { data, error } = await supabase
        .from('businesses')
        .select('payment_provider')
        .eq('id', businessId)
        .single();

    if (error || !data?.payment_provider) {
        return 'stripe'; // Default
    }

    return data.payment_provider as 'stripe' | 'abacatepay';
}

/**
 * Verifica o status de um pagamento do Abacate Pay
 * e atualiza o appointment no banco de dados se confirmado
 */
export async function verifyAbacatePayBilling(
    billingId: string,
    businessId: string
): Promise<{ success: boolean; paymentStatus: string; error?: string; devMode?: boolean }> {
    try {
        // 1. Obter API Key
        const apiKey = await getAbacatePayKey(businessId);
        if (!apiKey) {
            return { success: false, paymentStatus: 'unknown', error: 'API Key não configurada' };
        }

        // 2. Chamar Edge Function para verificar status
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/abacatepay-billing-status`;



        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                apiKey,
                billingId,
            }),
        });

        const result = await response.json();



        if (!response.ok || result.error) {
            return { success: false, paymentStatus: 'unknown', error: result.error || 'Erro ao verificar' };
        }

        // 3. Verificar status do pagamento
        // Abacate Pay statuses: PENDING, PAID, EXPIRED, CANCELLED
        const status = result.data?.status || result.status;
        const isPaid = status === 'PAID';

        // 4. Atualizar appointment se pagamento confirmado
        if (isPaid) {
            const { error: updateError } = await supabase
                .from('appointments')
                .update({
                    payment_status: 'paid',
                    status: 'confirmed',
                    updated_at: new Date().toISOString(),
                })
                .eq('abacatepay_billing_id', billingId);

            if (updateError) {
                console.error('[AbacatePay] Error updating appointment:', updateError);
            } else {

            }
        }

        return {
            success: true,
            paymentStatus: isPaid ? 'paid' : status?.toLowerCase() || 'pending',
            devMode: result.data?.devMode || false,
        };
    } catch (error) {
        console.error('[AbacatePay] Error verifying billing:', error);
        return { success: false, paymentStatus: 'unknown', error: String(error) };
    }
}

/**
 * Simula o pagamento de um billing no modo de desenvolvimento
 * NOTA: Isso só funciona para billings criados em Dev Mode
 */
export async function simulateAbacatePayment(
    billingId: string,
    businessId: string
): Promise<{ success: boolean; message: string; error?: string }> {
    try {
        // 1. Obter API Key
        const apiKey = await getAbacatePayKey(businessId);
        if (!apiKey) {
            return { success: false, message: 'API Key não configurada', error: 'API Key não configurada' };
        }

        // 2. Chamar Edge Function para simular pagamento
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/abacatepay-simulate-payment`;



        const response = await fetch(EDGE_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                apiKey,
                billingId,
            }),
        });

        const result = await response.json();



        if (!response.ok || result.error) {
            return { success: false, message: result.error || 'Erro ao simular', error: result.error };
        }

        // 3. Atualizar appointment no banco
        if (result.data?.status === 'PAID') {
            const { error: updateError } = await supabase
                .from('appointments')
                .update({
                    payment_status: 'paid',
                    status: 'confirmed',
                    updated_at: new Date().toISOString(),
                })
                .eq('abacatepay_billing_id', billingId);

            if (updateError) {
                console.error('[AbacatePay] Error updating appointment after simulation:', updateError);
            } else {

            }
        }

        return {
            success: true,
            message: result.data?.message || 'Pagamento simulado com sucesso!',
        };
    } catch (error) {
        console.error('[AbacatePay] Error simulating payment:', error);
        return { success: false, message: 'Erro ao simular pagamento', error: String(error) };
    }
}
