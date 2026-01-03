/**
 * =====================================================
 * STRIPE INTEGRATION - Integração Segura com Stripe
 * =====================================================
 * Funções para validar, salvar e usar API keys do Stripe
 * com criptografia AES-256-GCM e segurança máxima
 * =====================================================
 */

import Stripe from 'stripe';
import { supabase } from './supabase';
import { encrypt, decrypt, isValidStripeKeyFormat, maskApiKey } from './encryption';
import { getCurrentBusinessId } from './database';

// Senha mestra para criptografia (DEVE vir de variável de ambiente)
// Em produção, use process.env.ENCRYPTION_KEY
const MASTER_PASSWORD = import.meta.env.VITE_ENCRYPTION_KEY || 'ns-studio-encryption-key-2024';

// =====================================================
// VALIDATION
// =====================================================

/**
 * Valida uma API key do Stripe fazendo uma chamada real à API
 * @param apiKey - Chave a ser validada
 * @returns Objeto com resultado da validação e informações da conta
 */
export async function validateStripeKey(apiKey: string): Promise<{
    valid: boolean;
    error?: string;
    accountInfo?: {
        id: string;
        business_name?: string;
        country: string;
        currency: string;
    };
}> {
    try {
        // Validar formato primeiro
        if (!isValidStripeKeyFormat(apiKey)) {
            return {
                valid: false,
                error: 'Formato de chave inválido. Use sk_test_... ou sk_live_...'
            };
        }

        // Criar instância do Stripe
        const stripe = new Stripe(apiKey, {
            apiVersion: '2025-11-17.clover',
            typescript: true
        });

        // Tentar recuperar informações da conta
        const account = await stripe.accounts.retrieve();

        return {
            valid: true,
            accountInfo: {
                id: account.id,
                business_name: account.business_profile?.name,
                country: account.country || 'BR',
                currency: account.default_currency || 'brl'
            }
        };
    } catch (error: any) {
        console.error('Stripe validation error:', error);

        // Mensagens de erro amigáveis
        if (error.type === 'StripeAuthenticationError') {
            return {
                valid: false,
                error: 'Chave API inválida ou expirada'
            };
        }

        if (error.type === 'StripePermissionError') {
            return {
                valid: false,
                error: 'Chave sem permissões necessárias'
            };
        }

        return {
            valid: false,
            error: 'Erro ao validar chave. Verifique sua conexão.'
        };
    }
}

// =====================================================
// STORAGE (Encrypted with AES-256-GCM)
// =====================================================

/**
 * Salva API key do Stripe de forma segura (criptografada)
 * @param apiKey - Chave a ser salva
 * @param businessId - ID do negócio (opcional, usa o atual se não fornecido)
 */
export async function saveStripeKey(
    apiKey: string,
    businessId?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Validar primeiro
        const validation = await validateStripeKey(apiKey);

        if (!validation.valid) {
            return {
                success: false,
                error: validation.error
            };
        }

        // Criptografar a chave com AES-256-GCM
        const encryptedKey = await encrypt(apiKey, MASTER_PASSWORD);

        // Obter business ID
        const bid = businessId || await getCurrentBusinessId();

        if (!bid) {
            return {
                success: false,
                error: 'Negócio não encontrado'
            };
        }

        // Salvar no banco de dados (criptografada)
        const { error } = await supabase
            .from('businesses')
            .update({
                stripe_api_key: encryptedKey,
                stripe_api_key_valid: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', bid);

        if (error) {
            console.error('Database error:', error);
            return {
                success: false,
                error: 'Erro ao salvar no banco de dados'
            };
        }

        return { success: true };
    } catch (error) {
        console.error('Error saving Stripe key:', error);
        return {
            success: false,
            error: 'Erro ao processar chave'
        };
    }
}

/**
 * Recupera e descriptografa a API key do Stripe
 * @param businessId - ID do negócio (opcional)
 * @returns API key descriptografada ou null
 */
export async function getStripeKey(businessId?: string): Promise<string | null> {
    try {
        const bid = businessId || await getCurrentBusinessId();

        if (!bid) {
            console.error('Business ID not found');
            return null;
        }

        const { data, error } = await supabase
            .from('businesses')
            .select('stripe_api_key, stripe_api_key_valid')
            .eq('id', bid)
            .single();

        if (error || !data || !data.stripe_api_key) {
            return null;
        }

        if (!data.stripe_api_key_valid) {
            console.warn('Stripe key marked as invalid');
            return null;
        }

        // Descriptografar
        const decryptedKey = await decrypt(data.stripe_api_key, MASTER_PASSWORD);
        return decryptedKey;
    } catch (error) {
        console.error('Error retrieving Stripe key:', error);
        return null;
    }
}

/**
 * Remove a API key do Stripe
 */
export async function removeStripeKey(businessId?: string): Promise<boolean> {
    try {
        const bid = businessId || await getCurrentBusinessId();

        if (!bid) return false;

        const { error } = await supabase
            .from('businesses')
            .update({
                stripe_api_key: null,
                stripe_api_key_valid: false,
                updated_at: new Date().toISOString()
            })
            .eq('id', bid);

        return !error;
    } catch (error) {
        console.error('Error removing Stripe key:', error);
        return false;
    }
}

// =====================================================
// STRIPE CLIENT
// =====================================================

/**
 * Cria uma instância do Stripe client com a chave do negócio
 */
export async function getStripeClient(businessId?: string): Promise<Stripe | null> {
    try {
        const apiKey = await getStripeKey(businessId);

        if (!apiKey) {
            console.error('Stripe API key not configured');
            return null;
        }

        return new Stripe(apiKey, {
            apiVersion: '2025-11-17.clover',
            typescript: true
        });
    } catch (error) {
        console.error('Error creating Stripe client:', error);
        return null;
    }
}

// =====================================================
// PAYMENT INTENTS
// =====================================================

/**
 * Cria um Payment Intent no Stripe
 */
export async function createPaymentIntent(
    amount: number,
    metadata: {
        appointment_id: string;
        client_name: string;
        service_name: string;
        [key: string]: string;
    },
    businessId?: string
): Promise<{ success: boolean; paymentIntent?: Stripe.PaymentIntent; error?: string }> {
    try {
        const stripe = await getStripeClient(businessId);

        if (!stripe) {
            return {
                success: false,
                error: 'Stripe não configurado. Configure sua API key primeiro.'
            };
        }

        // Criar Payment Intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Converter para centavos
            currency: 'brl',
            metadata,
            automatic_payment_methods: {
                enabled: true
            },
            description: `Agendamento - ${metadata.service_name}`
        });

        return {
            success: true,
            paymentIntent
        };
    } catch (error: any) {
        console.error('Error creating payment intent:', error);
        return {
            success: false,
            error: error.message || 'Erro ao criar pagamento'
        };
    }
}

/**
 * Recupera um Payment Intent
 */
export async function getPaymentIntent(
    paymentIntentId: string,
    businessId?: string
): Promise<Stripe.PaymentIntent | null> {
    try {
        const stripe = await getStripeClient(businessId);

        if (!stripe) return null;

        return await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
        console.error('Error retrieving payment intent:', error);
        return null;
    }
}

/**
 * Interface para detalhes de pagamento enriquecidos
 */
export interface StripePaymentDetails {
    paymentIntentId: string;
    status: string;
    amount: number; // em reais
    currency: string;
    paymentMethodType: string; // 'card', 'pix', 'boleto', etc
    paymentMethodDetails: {
        brand?: string; // 'visa', 'mastercard', etc
        last4?: string;
        expiryMonth?: number;
        expiryYear?: number;
        funding?: string; // 'credit', 'debit'
        country?: string;
        // Pix specific
        bankName?: string;
    };
    customerEmail?: string;
    fees?: {
        stripeFee: number;
        netAmount: number;
    };
    receiptUrl?: string;
    createdAt: Date;
    paidAt?: Date;
    metadata: Record<string, string>;
}

/**
 * Busca detalhes completos de um pagamento no Stripe
 * Inclui: método de pagamento (Pix/Cartão), bandeira, taxas, etc
 */
export async function getPaymentDetails(
    paymentIntentId: string,
    businessId?: string
): Promise<StripePaymentDetails | null> {
    try {
        const stripe = await getStripeClient(businessId);
        if (!stripe) return null;

        // Buscar PaymentIntent com expansão do payment_method e charges
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['payment_method', 'latest_charge', 'latest_charge.balance_transaction']
        });

        if (!paymentIntent) return null;

        const paymentMethod = paymentIntent.payment_method as Stripe.PaymentMethod | null;
        const charge = paymentIntent.latest_charge as Stripe.Charge | null;
        const balanceTransaction = charge?.balance_transaction as Stripe.BalanceTransaction | null;

        // Determinar tipo de pagamento
        let paymentMethodType = 'unknown';
        let paymentMethodDetails: StripePaymentDetails['paymentMethodDetails'] = {};

        if (paymentMethod) {
            paymentMethodType = paymentMethod.type;

            if (paymentMethod.type === 'card' && paymentMethod.card) {
                paymentMethodDetails = {
                    brand: paymentMethod.card.brand,
                    last4: paymentMethod.card.last4,
                    expiryMonth: paymentMethod.card.exp_month,
                    expiryYear: paymentMethod.card.exp_year,
                    funding: paymentMethod.card.funding,
                    country: paymentMethod.card.country || undefined
                };
            } else if (paymentMethod.type === 'pix') {
                paymentMethodType = 'pix';
                // Pix não tem detalhes de banco no PaymentMethod
            } else if (paymentMethod.type === 'boleto') {
                paymentMethodType = 'boleto';
            }
        }

        // Calcular taxas
        let fees = undefined;
        if (balanceTransaction) {
            fees = {
                stripeFee: balanceTransaction.fee / 100, // Converter de centavos
                netAmount: balanceTransaction.net / 100
            };
        }

        return {
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency,
            paymentMethodType,
            paymentMethodDetails,
            customerEmail: charge?.receipt_email || charge?.billing_details?.email || undefined,
            fees,
            receiptUrl: charge?.receipt_url || undefined,
            createdAt: new Date(paymentIntent.created * 1000),
            paidAt: charge?.paid ? new Date((charge as any).created * 1000) : undefined,
            metadata: paymentIntent.metadata as Record<string, string>
        };
    } catch (error) {
        console.error('Error fetching payment details:', error);
        return null;
    }
}

/**
 * Busca detalhes de pagamento para múltiplos PaymentIntents
 */
export async function getMultiplePaymentDetails(
    paymentIntentIds: string[],
    businessId?: string
): Promise<Map<string, StripePaymentDetails>> {
    const results = new Map<string, StripePaymentDetails>();

    // Processar em paralelo (máximo 10 por vez para não sobrecarregar)
    const chunkSize = 10;
    for (let i = 0; i < paymentIntentIds.length; i += chunkSize) {
        const chunk = paymentIntentIds.slice(i, i + chunkSize);
        const promises = chunk.map(id => getPaymentDetails(id, businessId));
        const details = await Promise.all(promises);

        chunk.forEach((id, index) => {
            if (details[index]) {
                results.set(id, details[index]!);
            }
        });
    }

    return results;
}

/**
 * Cancela um Payment Intent
 */
export async function cancelPaymentIntent(
    paymentIntentId: string,
    businessId?: string
): Promise<boolean> {
    try {
        const stripe = await getStripeClient(businessId);

        if (!stripe) return false;

        await stripe.paymentIntents.cancel(paymentIntentId);
        return true;
    } catch (error) {
        console.error('Error cancelling payment intent:', error);
        return false;
    }
}

// =====================================================
// UTILITY
// =====================================================

/**
 * Verifica se o Stripe está configurado para um negócio
 */
export async function isStripeConfigured(businessId?: string): Promise<boolean> {
    const key = await getStripeKey(businessId);
    return key !== null;
}

/**
 * Obtém informações mascaradas da chave (para exibição)
 */
export async function getStripeKeyInfo(businessId?: string): Promise<{
    configured: boolean;
    masked?: string;
    isTestMode?: boolean;
} | null> {
    try {
        const key = await getStripeKey(businessId);

        if (!key) {
            return { configured: false };
        }

        return {
            configured: true,
            masked: maskApiKey(key),
            isTestMode: key.startsWith('sk_test_')
        };
    } catch (error) {
        console.error('Error getting Stripe key info:', error);
        return null;
    }
}

// =====================================================
// LEGACY COMPATIBILITY (mantém compatibilidade com código existente)
// =====================================================

export const validateStripeApiKey = validateStripeKey;
export const saveStripeApiKey = async (businessId: string, apiKey: string) => {
    return await saveStripeKey(apiKey, businessId);
};
