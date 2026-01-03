/**
 * =====================================================
 * STRIPE PRODUCTS SYNC - Sincronização Bidirecional
 * =====================================================
 * Sincroniza serviços entre NS Studio e Stripe usando metadata
 * para armazenar duração e categoria
 * =====================================================
 */

import { supabase } from './supabase';
import { getStripeClient } from './stripe';
import { getCurrentBusinessId } from './database';
import type Stripe from 'stripe';

// =====================================================
// TYPES
// =====================================================

export interface SyncResult {
    success: boolean;
    created: number;
    updated: number;
    errors: string[];
    total: number;
}

export interface ServiceWithStripe {
    id: string;
    name: string;
    price: number;
    duration_minutes: number;
    category?: string;
    stripe_product_id?: string;
    stripe_price_id?: string;
}

// =====================================================
// CREATE PRODUCT IN STRIPE
// =====================================================

/**
 * Cria produto e preço no Stripe a partir de um serviço
 */
export async function createStripeProduct(
    service: ServiceWithStripe,
    businessId?: string
): Promise<{ productId: string; priceId: string } | null> {
    try {
        const stripe = await getStripeClient(businessId);

        if (!stripe) {
            console.error('Stripe not configured');
            return null;
        }

        // 1. Criar produto no Stripe
        const product = await stripe.products.create({
            name: service.name,
            description: `${service.duration_minutes} minutos`,
            metadata: {
                duration_minutes: service.duration_minutes.toString(),
                category: service.category || 'Geral',
                ns_service_id: service.id
            }
        });

        // 2. Criar preço para o produto
        const price = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(service.price * 100), // Converter para centavos
            currency: 'brl',
            metadata: {
                ns_service_id: service.id
            }
        });

        // 3. Salvar IDs no serviço
        await supabase
            .from('services')
            .update({
                stripe_product_id: product.id,
                stripe_price_id: price.id,
                last_synced_at: new Date().toISOString()
            })
            .eq('id', service.id);

        return {
            productId: product.id,
            priceId: price.id
        };
    } catch (error: any) {
        console.error('Error creating Stripe product:', error);
        return null;
    }
}

// =====================================================
// UPDATE PRODUCT IN STRIPE
// =====================================================

/**
 * Atualiza produto no Stripe
 */
export async function updateStripeProduct(
    service: ServiceWithStripe,
    businessId?: string
): Promise<boolean> {
    try {
        if (!service.stripe_product_id) {
            // Se não tem product_id, criar novo
            const result = await createStripeProduct(service, businessId);
            return result !== null;
        }

        const stripe = await getStripeClient(businessId);

        if (!stripe) return false;

        // 1. Atualizar produto
        await stripe.products.update(service.stripe_product_id, {
            name: service.name,
            description: `${service.duration_minutes} minutos`,
            metadata: {
                duration_minutes: service.duration_minutes.toString(),
                category: service.category || 'Geral',
                ns_service_id: service.id
            }
        });

        // 2. Verificar se preço mudou
        if (service.stripe_price_id) {
            const currentPrice = await stripe.prices.retrieve(service.stripe_price_id);
            const newAmount = Math.round(service.price * 100);

            if (currentPrice.unit_amount !== newAmount) {
                // Stripe não permite editar preços, precisa criar novo
                const newPrice = await stripe.prices.create({
                    product: service.stripe_product_id,
                    unit_amount: newAmount,
                    currency: 'brl',
                    metadata: {
                        ns_service_id: service.id
                    }
                });

                // Desativar preço antigo
                await stripe.prices.update(service.stripe_price_id, {
                    active: false
                });

                // Atualizar no banco
                await supabase
                    .from('services')
                    .update({
                        stripe_price_id: newPrice.id,
                        last_synced_at: new Date().toISOString()
                    })
                    .eq('id', service.id);
            }
        }

        // 3. Atualizar timestamp
        await supabase
            .from('services')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', service.id);

        return true;
    } catch (error) {
        console.error('Error updating Stripe product:', error);
        return false;
    }
}

// =====================================================
// SYNC FROM STRIPE TO NS STUDIO
// =====================================================

/**
 * Sincroniza produtos do Stripe para o NS Studio
 */
export async function syncFromStripe(businessId?: string): Promise<SyncResult> {
    const result: SyncResult = {
        success: false,
        created: 0,
        updated: 0,
        errors: [],
        total: 0
    };

    try {
        const stripe = await getStripeClient(businessId);

        if (!stripe) {
            result.errors.push('Stripe não configurado');
            return result;
        }

        const bid = businessId || await getCurrentBusinessId();

        if (!bid) {
            result.errors.push('Business ID não encontrado');
            return result;
        }

        // 1. Buscar todos os produtos ativos do Stripe
        const products = await stripe.products.list({
            active: true,
            limit: 100
        });

        result.total = products.data.length;

        // 2. Para cada produto, sincronizar
        for (const product of products.data) {
            try {
                // Buscar preço ativo do produto
                const prices = await stripe.prices.list({
                    product: product.id,
                    active: true,
                    limit: 1
                });

                if (prices.data.length === 0) {
                    result.errors.push(`Produto ${product.name} sem preço ativo`);
                    continue;
                }

                const price = prices.data[0];

                // Extrair metadata
                const durationMinutes = parseInt(product.metadata.duration_minutes || '60');
                const category = product.metadata.category || 'Geral';

                // 3. Verificar se serviço já existe
                const { data: existingService } = await supabase
                    .from('services')
                    .select('id')
                    .eq('stripe_product_id', product.id)
                    .eq('business_id', bid)
                    .single();

                if (existingService) {
                    // Atualizar serviço existente
                    await supabase
                        .from('services')
                        .update({
                            name: product.name,
                            price: (price.unit_amount || 0) / 100,
                            duration_minutes: durationMinutes,
                            category: category,
                            stripe_price_id: price.id,
                            last_synced_at: new Date().toISOString()
                        })
                        .eq('id', existingService.id);

                    result.updated++;
                } else {
                    // Criar novo serviço
                    await supabase
                        .from('services')
                        .insert({
                            business_id: bid,
                            name: product.name,
                            price: (price.unit_amount || 0) / 100,
                            duration_minutes: durationMinutes,
                            category: category,
                            stripe_product_id: product.id,
                            stripe_price_id: price.id,
                            is_active: true,
                            last_synced_at: new Date().toISOString()
                        });

                    result.created++;
                }

                // Delay para evitar rate limit
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error: any) {
                result.errors.push(`Erro ao processar ${product.name}: ${error.message}`);
            }
        }

        result.success = result.errors.length === 0;
        return result;
    } catch (error: any) {
        result.errors.push(`Erro geral: ${error.message}`);
        return result;
    }
}

// =====================================================
// SYNC TO STRIPE (ALL SERVICES)
// =====================================================

/**
 * Sincroniza todos os serviços do NS Studio para o Stripe
 */
export async function syncToStripe(businessId?: string): Promise<SyncResult> {
    const result: SyncResult = {
        success: false,
        created: 0,
        updated: 0,
        errors: [],
        total: 0
    };

    try {
        const bid = businessId || await getCurrentBusinessId();

        if (!bid) {
            result.errors.push('Business ID não encontrado');
            return result;
        }

        // Buscar todos os serviços ativos
        const { data: services, error } = await supabase
            .from('services')
            .select('*')
            .eq('business_id', bid)
            .eq('is_active', true);

        if (error || !services) {
            result.errors.push('Erro ao buscar serviços');
            return result;
        }

        result.total = services.length;

        // Para cada serviço, criar/atualizar no Stripe
        for (const service of services) {
            try {
                if (service.stripe_product_id) {
                    // Atualizar
                    const updated = await updateStripeProduct(service, businessId);
                    if (updated) {
                        result.updated++;
                    } else {
                        result.errors.push(`Erro ao atualizar ${service.name}`);
                    }
                } else {
                    // Criar
                    const created = await createStripeProduct(service, businessId);
                    if (created) {
                        result.created++;
                    } else {
                        result.errors.push(`Erro ao criar ${service.name}`);
                    }
                }

                // Delay para evitar rate limit
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error: any) {
                result.errors.push(`Erro ao processar ${service.name}: ${error.message}`);
            }
        }

        result.success = result.errors.length === 0;
        return result;
    } catch (error: any) {
        result.errors.push(`Erro geral: ${error.message}`);
        return result;
    }
}

// =====================================================
// DELETE PRODUCT FROM STRIPE
// =====================================================

/**
 * Arquiva (desativa) produto no Stripe
 */
export async function archiveStripeProduct(
    productId: string,
    businessId?: string
): Promise<boolean> {
    try {
        const stripe = await getStripeClient(businessId);

        if (!stripe) return false;

        // Stripe não permite deletar produtos, apenas arquivar
        await stripe.products.update(productId, {
            active: false
        });

        return true;
    } catch (error) {
        console.error('Error archiving Stripe product:', error);
        return false;
    }
}

// =====================================================
// GET SYNC STATUS
// =====================================================

/**
 * Retorna status de sincronização dos serviços
 */
export async function getStripeSyncStatus(businessId?: string): Promise<{
    total: number;
    synced: number;
    notSynced: number;
    lastSync?: string;
}> {
    try {
        const bid = businessId || await getCurrentBusinessId();

        if (!bid) {
            return { total: 0, synced: 0, notSynced: 0 };
        }

        const { data: services } = await supabase
            .from('services')
            .select('stripe_product_id, last_synced_at')
            .eq('business_id', bid)
            .eq('is_active', true);

        if (!services) {
            return { total: 0, synced: 0, notSynced: 0 };
        }

        const synced = services.filter(s => s.stripe_product_id).length;
        const lastSync = services
            .filter(s => s.last_synced_at)
            .sort((a, b) => new Date(b.last_synced_at!).getTime() - new Date(a.last_synced_at!).getTime())[0]?.last_synced_at;

        return {
            total: services.length,
            synced,
            notSynced: services.length - synced,
            lastSync
        };
    } catch (error) {
        console.error('Error getting sync status:', error);
        return { total: 0, synced: 0, notSynced: 0 };
    }
}
