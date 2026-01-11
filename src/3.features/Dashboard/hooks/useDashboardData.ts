/**
 * useDashboardData Hook
 * Gerencia dados e métricas do dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentBusinessId } from '@/lib/database';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subDays } from 'date-fns';

interface DashboardStats {
    todayRevenue: number;
    todayAppointments: number;
    monthRevenue: number;
    monthAppointments: number;
    newClientsThisMonth: number;
    occupancyRate: number;
    averageTicket: number;
    pendingAppointments: number;
}

interface RecentActivity {
    id: string;
    type: 'appointment' | 'payment' | 'client';
    description: string;
    timestamp: string;
    amount?: number;
}

interface UseDashboardDataResult {
    stats: DashboardStats;
    recentActivity: RecentActivity[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useDashboardData(): UseDashboardDataResult {
    const [stats, setStats] = useState<DashboardStats>({
        todayRevenue: 0,
        todayAppointments: 0,
        monthRevenue: 0,
        monthAppointments: 0,
        newClientsThisMonth: 0,
        occupancyRate: 0,
        averageTicket: 0,
        pendingAppointments: 0
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadDashboardData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const businessId = await getCurrentBusinessId();
            const now = new Date();
            const todayStart = startOfDay(now).toISOString();
            const todayEnd = endOfDay(now).toISOString();
            const monthStart = startOfMonth(now).toISOString();
            const monthEnd = endOfMonth(now).toISOString();

            // Fetch today's appointments
            const { data: todayAppts } = await supabase
                .from('appointments')
                .select('*, service:services(price)')
                .eq('business_id', businessId)
                .gte('start_datetime', todayStart)
                .lte('start_datetime', todayEnd);

            // Fetch month's paid appointments
            const { data: monthAppts } = await supabase
                .from('appointments')
                .select('*, service:services(price)')
                .eq('business_id', businessId)
                .eq('payment_status', 'paid')
                .gte('start_datetime', monthStart)
                .lte('start_datetime', monthEnd);

            // Fetch new clients this month
            const { data: newClients } = await supabase
                .from('clients')
                .select('id')
                .eq('business_id', businessId)
                .gte('created_at', monthStart);

            // Fetch pending appointments
            const { data: pendingAppts } = await supabase
                .from('appointments')
                .select('id')
                .eq('business_id', businessId)
                .eq('status', 'pending')
                .gte('start_datetime', todayStart);

            // Calculate stats
            const todayRevenue = (todayAppts || [])
                .filter((a: any) => a.payment_status === 'paid')
                .reduce((sum: number, a: any) => sum + (a.service?.price || 0), 0);

            const monthRevenue = (monthAppts || [])
                .reduce((sum: number, a: any) => sum + (a.service?.price || 0), 0);

            const monthAppointmentsCount = (monthAppts || []).length;
            const averageTicket = monthAppointmentsCount > 0 ? monthRevenue / monthAppointmentsCount : 0;

            setStats({
                todayRevenue,
                todayAppointments: (todayAppts || []).length,
                monthRevenue,
                monthAppointments: monthAppointmentsCount,
                newClientsThisMonth: (newClients || []).length,
                occupancyRate: 0, // Would need slots data to calculate
                averageTicket,
                pendingAppointments: (pendingAppts || []).length
            });

            // Load recent activity (last 10 appointments)
            const { data: recentAppts } = await supabase
                .from('appointments')
                .select('id, status, start_datetime, client:clients(name), service:services(name, price)')
                .eq('business_id', businessId)
                .order('start_datetime', { ascending: false })
                .limit(10);

            const activities: RecentActivity[] = (recentAppts || []).map((apt: any) => ({
                id: apt.id,
                type: 'appointment' as const,
                description: `${apt.client?.name || 'Cliente'} - ${apt.service?.name || 'Serviço'}`,
                timestamp: apt.start_datetime,
                amount: apt.service?.price
            }));

            setRecentActivity(activities);

        } catch (err) {
            setError('Erro ao carregar dados do dashboard');
            console.error('[useDashboardData] Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    return {
        stats,
        recentActivity,
        isLoading,
        error,
        refresh: loadDashboardData
    };
}
