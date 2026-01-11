/**
 * useCatalog Hook
 * Gerencia serviços e produtos
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentBusinessId, fetchServices, fetchProducts } from '@/lib/database';
import type { Service, Product } from '@/types';

interface UseCatalogResult {
    services: Service[];
    products: Product[];
    isLoading: boolean;
    error: string | null;
    activeTab: 'services' | 'products';
    setActiveTab: (tab: 'services' | 'products') => void;
    refresh: () => Promise<void>;
    saveService: (service: Partial<Service>) => Promise<boolean>;
    deleteService: (id: string) => Promise<boolean>;
    saveProduct: (product: Partial<Product>) => Promise<boolean>;
    deleteProduct: (id: string) => Promise<boolean>;
}

export function useCatalog(): UseCatalogResult {
    const [services, setServices] = useState<Service[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [servicesData, productsData] = await Promise.all([
                fetchServices(),
                fetchProducts()
            ]);
            setServices(servicesData || []);
            setProducts(productsData || []);
        } catch (err) {
            setError('Erro ao carregar catálogo');
            console.error('[useCatalog] Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveService = useCallback(async (service: Partial<Service>): Promise<boolean> => {
        try {
            const businessId = await getCurrentBusinessId();

            if (service.id) {
                const { error } = await supabase
                    .from('services')
                    .update(service)
                    .eq('id', service.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('services')
                    .insert({ ...service, business_id: businessId });
                if (error) throw error;
            }

            await loadData();
            return true;
        } catch (err) {
            console.error('[useCatalog] Error saving service:', err);
            return false;
        }
    }, [loadData]);

    const deleteService = useCallback(async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('services')
                .update({ is_active: false })
                .eq('id', id);
            if (error) throw error;
            await loadData();
            return true;
        } catch (err) {
            console.error('[useCatalog] Error deleting service:', err);
            return false;
        }
    }, [loadData]);

    const saveProduct = useCallback(async (product: Partial<Product>): Promise<boolean> => {
        try {
            const businessId = await getCurrentBusinessId();

            if (product.id) {
                const { error } = await supabase
                    .from('products')
                    .update(product)
                    .eq('id', product.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert({ ...product, business_id: businessId });
                if (error) throw error;
            }

            await loadData();
            return true;
        } catch (err) {
            console.error('[useCatalog] Error saving product:', err);
            return false;
        }
    }, [loadData]);

    const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('products')
                .update({ is_active: false })
                .eq('id', id);
            if (error) throw error;
            await loadData();
            return true;
        } catch (err) {
            console.error('[useCatalog] Error deleting product:', err);
            return false;
        }
    }, [loadData]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        services,
        products,
        isLoading,
        error,
        activeTab,
        setActiveTab,
        refresh: loadData,
        saveService,
        deleteService,
        saveProduct,
        deleteProduct
    };
}
