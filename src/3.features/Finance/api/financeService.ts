/**
 * Finance Service
 * Chamadas Supabase relacionadas a finanças
 */

import { supabase } from '@core/infra/supabase';
import { getCurrentBusinessId } from '@/lib/database';

/**
 * Carrega agendamentos pagos
 */
export async function loadPaidAppointments() {
    const businessId = await getCurrentBusinessId();

    const { data, error } = await supabase
        .from('appointments')
        .select(`
      *,
      service:services(id, name, price),
      professional:professionals(id, name, commission_rate)
    `)
        .eq('business_id', businessId)
        .eq('payment_status', 'paid');

    if (error) {
        console.error('[financeService] Error loading paid appointments:', error);
        return [];
    }

    return data || [];
}

/**
 * Carrega configuração de pagamento
 */
export async function loadPaymentConfig() {
    const businessId = await getCurrentBusinessId();

    const { data, error } = await supabase
        .from('businesses')
        .select('payment_provider, abacatepay_api_key, nfse_config, stripe_api_key')
        .eq('id', businessId)
        .single();

    if (error) {
        console.error('[financeService] Error loading payment config:', error);
        return null;
    }

    return data;
}

/**
 * Salva configuração do provedor de pagamento
 */
export async function savePaymentProvider(provider: 'stripe' | 'abacatepay') {
    const businessId = await getCurrentBusinessId();

    const { error } = await supabase
        .from('businesses')
        .update({ payment_provider: provider })
        .eq('id', businessId);

    return !error;
}

/**
 * Carrega meta de faturamento
 */
export async function loadBusinessGoal() {
    const businessId = await getCurrentBusinessId();

    const { data, error } = await supabase
        .from('businesses')
        .select('booking_settings')
        .eq('id', businessId)
        .single();

    if (error || !data?.booking_settings) return null;

    const settings = data.booking_settings as any;
    return {
        amount: settings.goal_amount || settings.monthly_goal || 0,
        period: settings.goal_period || 1
    };
}

/**
 * Salva meta de faturamento
 */
export async function saveBusinessGoal(amount: number, period: 1 | 3 | 6 | 12) {
    const businessId = await getCurrentBusinessId();

    // Primeiro buscar booking_settings atual
    const { data: current } = await supabase
        .from('businesses')
        .select('booking_settings')
        .eq('id', businessId)
        .single();

    const currentSettings = (current?.booking_settings as any) || {};

    const { error } = await supabase
        .from('businesses')
        .update({
            booking_settings: {
                ...currentSettings,
                goal_amount: amount,
                goal_period: period
            }
        })
        .eq('id', businessId);

    return !error;
}

/**
 * Salva metas individuais dos profissionais
 */
export async function saveProfessionalGoals(goals: Record<string, number>) {
    const updates = Object.entries(goals).map(([id, monthly_goal]) => ({
        id,
        monthly_goal
    }));

    const results = await Promise.all(
        updates.map(({ id, monthly_goal }) =>
            supabase
                .from('professionals')
                .update({ monthly_goal })
                .eq('id', id)
        )
    );

    return results.every(r => !r.error);
}

/**
 * Cadastra empresa na Nuvem Fiscal via Edge Function
 */
export async function registerNfseCompany(
    businessId: string,
    companyData: any,
    ambiente: 'homologacao' | 'producao'
) {
    const session = await supabase.auth.getSession();

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nfse-api`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({
            action: 'register_company',
            businessId,
            companyData,
            ambiente,
        }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || 'Erro ao cadastrar empresa');
    }

    return result;
}

/**
 * Faz upload de certificado digital
 */
export async function uploadNfseCertificado(
    businessId: string,
    empresaCnpj: string,
    certificadoBase64: string,
    senha: string
) {
    const session = await supabase.auth.getSession();

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nfse-api`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify({
            action: 'upload-certificado',
            businessId,
            empresaId: empresaCnpj.replace(/\D/g, ''),
            certificadoBase64,
            senha,
        }),
    });

    const result = await response.json();

    if (!response.ok) {
        throw new Error(result.error || 'Erro ao fazer upload do certificado');
    }

    return result;
}

/**
 * Cria despesa recorrente
 */
export async function createExpense(expense: {
    description: string;
    amount: number;
    day_of_month: number;
    category: string;
}) {
    const businessId = await getCurrentBusinessId();

    const { data, error } = await supabase
        .from('recurring_expenses')
        .insert({
            ...expense,
            business_id: businessId,
            is_active: true
        })
        .select()
        .single();

    if (error) {
        console.error('[financeService] Error creating expense:', error);
        return null;
    }

    return data;
}
