/**
 * useClients Hook
 * Gerencia dados e operações de clientes
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentBusinessId, fetchClients } from '@/lib/database';
import type { Client } from '@/types';

interface ClientStats {
    totalVisits: number;
    lifetimeValue: number;
    averageTicket: number;
    lastVisitDate: string | null;
}

interface UseClientsResult {
    clients: Client[];
    isLoading: boolean;
    error: string | null;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredClients: Client[];
    refresh: () => Promise<void>;
    saveClient: (client: Partial<Client>) => Promise<Client | null>;
    deleteClient: (id: string) => Promise<boolean>;
    getClientStats: (clientId: string) => Promise<ClientStats>;
}

export function useClients(): UseClientsResult {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const loadClients = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchClients();
            setClients(data || []);
        } catch (err) {
            setError('Erro ao carregar clientes');
            console.error('[useClients] Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const filteredClients = clients.filter(client => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            client.name?.toLowerCase().includes(query) ||
            client.email?.toLowerCase().includes(query) ||
            client.phone?.includes(query)
        );
    });

    const saveClient = useCallback(async (client: Partial<Client>): Promise<Client | null> => {
        try {
            const businessId = await getCurrentBusinessId();

            if (client.id) {
                // Update
                const { data, error } = await supabase
                    .from('clients')
                    .update(client)
                    .eq('id', client.id)
                    .select()
                    .single();

                if (error) throw error;
                await loadClients();
                return data;
            } else {
                // Insert
                const { data, error } = await supabase
                    .from('clients')
                    .insert({ ...client, business_id: businessId })
                    .select()
                    .single();

                if (error) throw error;
                await loadClients();
                return data;
            }
        } catch (err) {
            console.error('[useClients] Error saving client:', err);
            return null;
        }
    }, [loadClients]);

    const deleteClient = useCallback(async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await loadClients();
            return true;
        } catch (err) {
            console.error('[useClients] Error deleting client:', err);
            return false;
        }
    }, [loadClients]);

    const getClientStats = useCallback(async (clientId: string): Promise<ClientStats> => {
        const { data: appointments } = await supabase
            .from('appointments')
            .select('start_datetime, service:services(price)')
            .eq('client_id', clientId)
            .eq('payment_status', 'paid')
            .order('start_datetime', { ascending: false });

        const appts = appointments || [];
        const lifetimeValue = appts.reduce((sum: number, a: any) => sum + (a.service?.price || 0), 0);

        return {
            totalVisits: appts.length,
            lifetimeValue,
            averageTicket: appts.length > 0 ? lifetimeValue / appts.length : 0,
            lastVisitDate: appts.length > 0 ? appts[0].start_datetime : null
        };
    }, []);

    useEffect(() => {
        loadClients();
    }, [loadClients]);

    return {
        clients,
        isLoading,
        error,
        searchQuery,
        setSearchQuery,
        filteredClients,
        refresh: loadClients,
        saveClient,
        deleteClient,
        getClientStats
    };
}
