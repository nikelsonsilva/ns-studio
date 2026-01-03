import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { getCurrentUser, onAuthStateChange } from './auth';
import type { Business } from '../types';
import { getCurrentBusiness } from './database';

/**
 * =====================================================
 * CUSTOM HOOKS
 * =====================================================
 */

/**
 * Hook para gerenciar o estado de autenticação
 */
export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Verificar usuário atual ao montar
        getCurrentUser().then((currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });

        // Escutar mudanças no estado de autenticação
        const subscription = onAuthStateChange((newUser) => {
            setUser(newUser);
            setLoading(false);
        });

        // Cleanup
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    return { user, loading, isAuthenticated: !!user };
};

/**
 * Hook para carregar dados de uma tabela
 */
export const useSupabaseQuery = <T,>(
    queryFn: () => Promise<T[] | null>,
    dependencies: any[] = []
) => {
    const [data, setData] = useState<T[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const result = await queryFn();
                setData(result);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, dependencies);

    const refetch = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await queryFn();
            setData(result);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, refetch };
};

/**
 * Hook para carregar um único item
 */
export const useSupabaseSingle = <T,>(
    queryFn: () => Promise<T | null>,
    dependencies: any[] = []
) => {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const result = await queryFn();
                setData(result);
            } catch (err) {
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, dependencies);

    const refetch = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await queryFn();
            setData(result);
        } catch (err) {
            setError(err as Error);
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, refetch };
};

/**
 * Hook para obter o business atual (com auto-refresh)
 */
export const useCurrentBusiness = () => {
    return useSupabaseSingle<Business>(getCurrentBusiness, []);
};
