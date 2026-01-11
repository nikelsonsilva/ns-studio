/**
 * useTeam Hook
 * Gerencia dados e operações da equipe de profissionais
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentBusinessId, fetchProfessionals } from '@/lib/database';
import type { Professional } from '@/types';

interface ProfessionalStats {
    revenue: number;
    appointments: number;
    avgTicket: number;
}

interface UseTeamResult {
    professionals: Professional[];
    isLoading: boolean;
    error: string | null;
    stats: Map<string, ProfessionalStats>;
    refresh: () => Promise<void>;
    saveProfessional: (professional: Partial<Professional>) => Promise<boolean>;
    deleteProfessional: (id: string) => Promise<boolean>;
    updateProfessionalServices: (professionalId: string, serviceIds: string[]) => Promise<boolean>;
}

export function useTeam(): UseTeamResult {
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<Map<string, ProfessionalStats>>(new Map());

    const loadProfessionals = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchProfessionals();
            setProfessionals(data || []);

            // Carregar stats de cada profissional
            if (data && data.length > 0) {
                await loadStats(data.map(p => p.id));
            }
        } catch (err) {
            setError('Erro ao carregar profissionais');
            console.error('[useTeam] Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadStats = async (professionalIds: string[]) => {
        const businessId = await getCurrentBusinessId();
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const { data: appointments } = await supabase
            .from('appointments')
            .select('professional_id, service:services(price)')
            .eq('business_id', businessId)
            .eq('payment_status', 'paid')
            .gte('start_datetime', startOfMonth.toISOString())
            .in('professional_id', professionalIds);

        const statsMap = new Map<string, ProfessionalStats>();

        professionalIds.forEach(id => {
            const profAppts = (appointments || []).filter((a: any) => a.professional_id === id);
            const revenue = profAppts.reduce((sum: number, a: any) => sum + (a.service?.price || 0), 0);
            statsMap.set(id, {
                revenue,
                appointments: profAppts.length,
                avgTicket: profAppts.length > 0 ? revenue / profAppts.length : 0
            });
        });

        setStats(statsMap);
    };

    const saveProfessional = useCallback(async (professional: Partial<Professional>): Promise<boolean> => {
        try {
            const businessId = await getCurrentBusinessId();

            if (professional.id) {
                // Update
                const { error } = await supabase
                    .from('professionals')
                    .update(professional)
                    .eq('id', professional.id);

                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from('professionals')
                    .insert({ ...professional, business_id: businessId });

                if (error) throw error;
            }

            await loadProfessionals();
            return true;
        } catch (err) {
            console.error('[useTeam] Error saving professional:', err);
            return false;
        }
    }, [loadProfessionals]);

    const deleteProfessional = useCallback(async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('professionals')
                .update({ is_active: false })
                .eq('id', id);

            if (error) throw error;
            await loadProfessionals();
            return true;
        } catch (err) {
            console.error('[useTeam] Error deleting professional:', err);
            return false;
        }
    }, [loadProfessionals]);

    const updateProfessionalServices = useCallback(async (
        professionalId: string,
        serviceIds: string[]
    ): Promise<boolean> => {
        try {
            // Remove existing
            await supabase
                .from('professional_services')
                .delete()
                .eq('professional_id', professionalId);

            // Add new
            if (serviceIds.length > 0) {
                const inserts = serviceIds.map(serviceId => ({
                    professional_id: professionalId,
                    service_id: serviceId
                }));

                const { error } = await supabase
                    .from('professional_services')
                    .insert(inserts);

                if (error) throw error;
            }

            return true;
        } catch (err) {
            console.error('[useTeam] Error updating services:', err);
            return false;
        }
    }, []);

    useEffect(() => {
        loadProfessionals();
    }, [loadProfessionals]);

    return {
        professionals,
        isLoading,
        error,
        stats,
        refresh: loadProfessionals,
        saveProfessional,
        deleteProfessional,
        updateProfessionalServices
    };
}
