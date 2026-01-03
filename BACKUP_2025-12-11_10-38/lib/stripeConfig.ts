import { supabase } from './supabase';
import { getCurrentBusinessId } from './database';

interface StripeConfig {
    publishableKey: string;
    secretKey: string;
}

/**
 * Salva as chaves do Stripe no banco de dados
 * Usuário configura UMA VEZ e fica salvo
 */
export async function saveStripeKeys(publishableKey: string, secretKey: string): Promise<boolean> {
    try {
        // ✅ VALIDAR FORMATO DAS CHAVES
        if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
            console.error('❌ Invalid secret key format');
            return false;
        }

        if (!publishableKey.startsWith('pk_test_') && !publishableKey.startsWith('pk_live_')) {
            console.error('❌ Invalid publishable key format');
            return false;
        }

        const businessId = await getCurrentBusinessId();
        if (!businessId) {
            console.error('❌ No business ID found');
            return false;
        }

        const { error } = await supabase
            .from('businesses')
            .update({
                stripe_publishable_key: publishableKey,
                stripe_secret_key: secretKey,
                stripe_configured_at: new Date().toISOString()
            })
            .eq('id', businessId);

        if (error) {
            console.error('❌ Error saving Stripe keys:', error);
            return false;
        }

        console.log('✅ Stripe keys saved successfully');
        return true;
    } catch (error) {
        console.error('❌ Error in saveStripeKeys:', error);
        return false;
    }
}

/**
 * Carrega as chaves do Stripe do banco de dados
 * Retorna null se não configurado
 */
export async function loadStripeKeys(): Promise<StripeConfig | null> {
    try {
        const businessId = await getCurrentBusinessId();
        if (!businessId) {
            return null;
        }

        const { data, error } = await supabase
            .from('businesses')
            .select('stripe_publishable_key, stripe_secret_key')
            .eq('id', businessId)
            .single();

        if (error || !data) {
            return null;
        }

        if (!data.stripe_publishable_key || !data.stripe_secret_key) {
            console.log('⚠️ Stripe not configured');
            return null;
        }

        return {
            publishableKey: data.stripe_publishable_key,
            secretKey: data.stripe_secret_key
        };
    } catch (error) {
        console.error('❌ Error loading Stripe keys:', error);
        return null;
    }
}

/**
 * Verifica se o Stripe está configurado (sem carregar a chave)
 * SEGURO: Não expõe a chave para o frontend
 */
export async function isStripeConfigured(): Promise<boolean> {
    const keys = await loadStripeKeys();
    return keys !== null;
}

/**
 * Verifica se o Stripe está configurado (alias seguro)
 * SEGURO: Não retorna a chave, apenas boolean
 */
export async function checkStripeConfigured(): Promise<boolean> {
    try {
        const businessId = await getCurrentBusinessId();
        if (!businessId) return false;

        const { data, error } = await supabase
            .from('businesses')
            .select('stripe_secret_key')
            .eq('id', businessId)
            .single();

        if (error || !data) return false;

        return !!(data.stripe_secret_key && data.stripe_secret_key.length > 10);
    } catch {
        return false;
    }
}

/**
 * Retorna apenas os últimos 4 caracteres da chave para exibição segura
 * SEGURO: Nunca expõe a chave completa
 */
export async function getKeyLastFour(): Promise<string | null> {
    try {
        const businessId = await getCurrentBusinessId();
        if (!businessId) return null;

        const { data, error } = await supabase
            .from('businesses')
            .select('stripe_secret_key')
            .eq('id', businessId)
            .single();

        if (error || !data || !data.stripe_secret_key) return null;

        const key = data.stripe_secret_key;
        if (key.length < 4) return '****';

        return key.slice(-4);
    } catch {
        return null;
    }
}

/**
 * Obtém a chave secreta do Stripe (do banco ou .env)
 */
export async function getStripeSecretKey(): Promise<string | null> {
    // 1. Tentar carregar do banco
    const keys = await loadStripeKeys();
    if (keys) {
        return keys.secretKey;
    }

    // 2. Fallback para .env
    const envKey = import.meta.env.VITE_STRIPE_SECRET_KEY;
    if (envKey && envKey !== 'sk_test_your_secret_key_here') {
        return envKey;
    }

    return null;
}

/**
 * Obtém a chave publicável do Stripe (do banco ou .env)
 */
export async function getStripePublishableKey(): Promise<string | null> {
    // 1. Tentar carregar do banco
    const keys = await loadStripeKeys();
    if (keys) {
        return keys.publishableKey;
    }

    // 2. Fallback para .env
    const envKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (envKey && envKey !== 'pk_test_your_publishable_key_here') {
        return envKey;
    }

    return null;
}
