/**
 * =====================================================
 * SETTINGS SERVICE
 * =====================================================
 * Gerenciamento de configurações do negócio e fidelidade
 * =====================================================
 */

import { supabase } from './supabase';

// =====================================================
// TYPES
// =====================================================

export interface LoyaltyTier {
    name: string;
    min_visits: number;
    discount: number;
    color: string;
}

export interface BusinessSettings {
    id: string;
    business_id: string;

    // Feature Toggles
    loyalty_enabled: boolean;
    marketing_enabled: boolean;
    reminders_enabled: boolean;
    gallery_enabled: boolean;
    payments_enabled: boolean;

    // Loyalty Settings
    loyalty_visits_for_reward: number;
    loyalty_reward_description: string;
    loyalty_tiers: LoyaltyTier[];

    created_at: string;
    updated_at: string;
}

export interface LoyaltyRedemption {
    id: string;
    client_id: string;
    business_id: string;
    visits_at_redemption: number;
    reward_description: string;
    redeemed_at: string;
}

// Default settings
export const DEFAULT_SETTINGS: Partial<BusinessSettings> = {
    loyalty_enabled: true,  // Ativo por padrão
    marketing_enabled: false,
    reminders_enabled: false,
    gallery_enabled: false,
    payments_enabled: true,
    loyalty_visits_for_reward: 10,
    loyalty_reward_description: 'Corte grátis',
    loyalty_tiers: [
        { name: 'Bronze', min_visits: 0, discount: 0, color: '#CD7F32' },
        { name: 'Prata', min_visits: 5, discount: 5, color: '#C0C0C0' },
        { name: 'Ouro', min_visits: 15, discount: 10, color: '#FFD700' },
        { name: 'Diamante', min_visits: 30, discount: 15, color: '#B9F2FF' },
    ],
};

// =====================================================
// BUSINESS SETTINGS
// =====================================================

/**
 * Buscar configurações do negócio
 */
export async function fetchBusinessSettings(businessId: string): Promise<BusinessSettings | null> {
    try {
        const { data, error } = await supabase
            .from('business_settings')
            .select('*')
            .eq('business_id', businessId)
            .single();

        if (error) {
            // Se não existe, criar com defaults
            if (error.code === 'PGRST116') {
                return await createDefaultSettings(businessId);
            }
            console.error('Error fetching business settings:', error);
            return null;
        }

        return data as BusinessSettings;
    } catch (error) {
        console.error('Unexpected error fetching settings:', error);
        return null;
    }
}

/**
 * Criar configurações padrão
 */
async function createDefaultSettings(businessId: string): Promise<BusinessSettings | null> {
    try {
        const { data, error } = await supabase
            .from('business_settings')
            .insert({
                business_id: businessId,
                ...DEFAULT_SETTINGS,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating default settings:', error);
            return null;
        }

        return data as BusinessSettings;
    } catch (error) {
        console.error('Unexpected error creating settings:', error);
        return null;
    }
}

/**
 * Atualizar configurações do negócio
 */
export async function updateBusinessSettings(
    businessId: string,
    updates: Partial<BusinessSettings>
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('business_settings')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('business_id', businessId);

        if (error) {
            console.error('Error updating business settings:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Unexpected error updating settings:', error);
        return false;
    }
}

// =====================================================
// FEATURE TOGGLES HELPERS
// =====================================================

/**
 * Verificar se uma feature está ativada
 */
export async function isFeatureEnabled(
    businessId: string,
    feature: 'loyalty' | 'marketing' | 'reminders' | 'gallery' | 'payments'
): Promise<boolean> {
    const settings = await fetchBusinessSettings(businessId);
    if (!settings) return false;

    switch (feature) {
        case 'loyalty': return settings.loyalty_enabled;
        case 'marketing': return settings.marketing_enabled;
        case 'reminders': return settings.reminders_enabled;
        case 'gallery': return settings.gallery_enabled;
        case 'payments': return settings.payments_enabled;
        default: return false;
    }
}

/**
 * Ativar/desativar uma feature
 */
export async function toggleFeature(
    businessId: string,
    feature: 'loyalty' | 'marketing' | 'reminders' | 'gallery' | 'payments',
    enabled: boolean
): Promise<boolean> {
    const key = `${feature}_enabled` as keyof BusinessSettings;
    return updateBusinessSettings(businessId, { [key]: enabled } as Partial<BusinessSettings>);
}

// =====================================================
// LOYALTY PROGRAM
// =====================================================

/**
 * Calcular o tier atual do cliente baseado em visitas
 */
export function calculateLoyaltyTier(
    totalVisits: number,
    tiers: LoyaltyTier[] = DEFAULT_SETTINGS.loyalty_tiers!
): LoyaltyTier {
    // Ordenar por min_visits descrescente e pegar o primeiro que se encaixa
    const sortedTiers = [...tiers].sort((a, b) => b.min_visits - a.min_visits);
    return sortedTiers.find(t => totalVisits >= t.min_visits) || tiers[0];
}

/**
 * Verificar se cliente pode resgatar prêmio
 */
export function canRedeemReward(
    visitsSinceLastReward: number,
    visitsRequired: number = 10
): boolean {
    return visitsSinceLastReward >= visitsRequired;
}

/**
 * Resgatar prêmio de fidelidade
 */
export async function redeemLoyaltyReward(
    clientId: string,
    businessId: string,
    visitsSinceLastReward: number,
    rewardDescription: string
): Promise<boolean> {
    try {
        // 1. Criar registro de resgate
        const { error: redemptionError } = await supabase
            .from('loyalty_redemptions')
            .insert({
                client_id: clientId,
                business_id: businessId,
                visits_at_redemption: visitsSinceLastReward,
                reward_description: rewardDescription,
            });

        if (redemptionError) {
            console.error('Error creating redemption:', redemptionError);
            return false;
        }

        // 2. Resetar contador de visitas desde último resgate
        const { error: updateError } = await supabase
            .from('clients')
            .update({ visits_since_last_reward: 0 })
            .eq('id', clientId);

        if (updateError) {
            console.error('Error resetting visits counter:', updateError);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Unexpected error redeeming reward:', error);
        return false;
    }
}

/**
 * Buscar histórico de resgates do cliente
 */
export async function fetchClientRedemptions(clientId: string): Promise<LoyaltyRedemption[]> {
    try {
        const { data, error } = await supabase
            .from('loyalty_redemptions')
            .select('*')
            .eq('client_id', clientId)
            .order('redeemed_at', { ascending: false });

        if (error) {
            console.error('Error fetching redemptions:', error);
            return [];
        }

        return data as LoyaltyRedemption[];
    } catch (error) {
        console.error('Unexpected error fetching redemptions:', error);
        return [];
    }
}

/**
 * Buscar total de resgates do negócio
 */
export async function fetchBusinessRedemptionsCount(businessId: string): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('loyalty_redemptions')
            .select('*', { count: 'exact', head: true })
            .eq('business_id', businessId);

        if (error) {
            console.error('Error fetching redemptions count:', error);
            return 0;
        }

        return count || 0;
    } catch (error) {
        console.error('Unexpected error fetching redemptions count:', error);
        return 0;
    }
}
