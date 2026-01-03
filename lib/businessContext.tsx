import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Business } from '../types';
import { getCurrentBusiness } from './database';
import { applyTheme } from './theme';
import { supabase } from './supabase';


/**
 * =====================================================
 * BUSINESS CONTEXT (Multi-Tenant) - SECURED
 * =====================================================
 * Gerencia o business atual do usuário logado
 * Disponível em toda a aplicação
 * 
 * SECURITY: Only fetches data when user is authenticated
 * =====================================================
 */

interface BusinessContextType {
    business: Business | null;
    loading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    isAuthenticated: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

interface BusinessProviderProps {
    children: ReactNode;
}

export const BusinessProvider: React.FC<BusinessProviderProps> = ({ children }) => {
    const [business, setBusiness] = useState<Business | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const fetchBusiness = async () => {
        try {
            setLoading(true);
            setError(null);

            // SECURITY: Check auth before fetching
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setBusiness(null);
                setIsAuthenticated(false);
                return;
            }

            setIsAuthenticated(true);
            const businessData = await getCurrentBusiness();
            setBusiness(businessData);
        } catch (err) {
            setError(err as Error);
            console.error('Error fetching business:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                setIsAuthenticated(true);
                fetchBusiness();
            } else if (event === 'SIGNED_OUT') {
                setIsAuthenticated(false);
                setBusiness(null);
            }
        });

        // Initial check
        fetchBusiness();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Apply theme when business changes
    useEffect(() => {
        if (business?.business_type) {
            applyTheme(business.business_type);
        }
    }, [business]);


    const refetch = async () => {
        await fetchBusiness();
    };

    return (
        <BusinessContext.Provider value={{ business, loading, error, refetch }}>
            {children}
        </BusinessContext.Provider>
    );
};

/**
 * Hook para usar o Business Context
 */
export const useBusiness = (): BusinessContextType => {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
};

/**
 * Hook para obter apenas o business (sem loading/error)
 */
export const useCurrentBusiness = (): Business | null => {
    const { business } = useBusiness();
    return business;
};

/**
 * Hook para verificar se é barbearia ou salão
 */
export const useBusinessType = (): 'barbershop' | 'salon' | null => {
    const { business } = useBusiness();
    return business?.business_type || null;
};

/**
 * Hook para verificar se é barbearia
 */
export const useIsBarbershop = (): boolean => {
    const businessType = useBusinessType();
    return businessType === 'barbershop';
};

/**
 * Hook para verificar se é salão
 */
export const useIsSalon = (): boolean => {
    const businessType = useBusinessType();
    return businessType === 'salon';
};
