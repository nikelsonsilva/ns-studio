/**
 * =====================================================
 * useDashboardData Hook - FIXED
 * =====================================================
 * Busca dados reais do banco para o Dashboard (Visão Geral)
 * CORRIGIDO: Usa service:services(price) ao invés de amount
 * =====================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getCurrentBusinessId } from '../database';

// =====================================================
// TYPES
// =====================================================

export interface DashboardStats {
    faturamentoHoje: number;
    faturamentoOntem: number;
    agendamentosHoje: number;
    agendamentosPendentes: number;
    novosClientesMes: number;
    novosClientesMesAnterior: number;
    taxaNoShow: number;
    taxaNoShowAnterior: number;
}

export interface ProfessionalChair {
    id: string;
    name: string;
    specialty: string;
    status: 'busy' | 'free' | 'break';
    currentClient?: string;
    currentService?: string;
    startTime?: string;
    duration?: number;
    elapsed?: number;
}

export interface WeeklyRevenue {
    name: string;
    date: string;
    total: number;
}

export interface MonthlyGoal {
    current: number;
    target: number;
    projection: number;
    dailyAverage: number;
    period: 1 | 3 | 6 | 12;
    periodLabel: string;
}

export interface PendingRequest {
    id: string;
    clientName: string;
    service: string;
    time: string;
    date: string;
    source: string;
}

export interface DashboardData {
    stats: DashboardStats;
    chairs: ProfessionalChair[];
    weeklyRevenue: WeeklyRevenue[];
    monthlyGoal: MonthlyGoal;
    pendingRequests: PendingRequest[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

// Helper to get price from appointment
const getAppointmentPrice = (apt: any): number => {
    // Try different sources of price
    if (apt.service?.price) return Number(apt.service.price);
    if (apt.amount) return Number(apt.amount);
    if (apt.services?.price) return Number(apt.services.price);
    return 0;
};

// =====================================================
// HOOK
// =====================================================

export function useDashboardData(): DashboardData {
    const [stats, setStats] = useState<DashboardStats>({
        faturamentoHoje: 0,
        faturamentoOntem: 0,
        agendamentosHoje: 0,
        agendamentosPendentes: 0,
        novosClientesMes: 0,
        novosClientesMesAnterior: 0,
        taxaNoShow: 0,
        taxaNoShowAnterior: 0,
    });

    const [chairs, setChairs] = useState<ProfessionalChair[]>([]);
    const [weeklyRevenue, setWeeklyRevenue] = useState<WeeklyRevenue[]>([]);
    const [monthlyGoal, setMonthlyGoal] = useState<MonthlyGoal>({
        current: 0,
        target: 0,
        projection: 0,
        dailyAverage: 0,
        period: 1,
        periodLabel: 'Mensal',
    });
    const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const businessId = await getCurrentBusinessId();
            if (!businessId) {
                throw new Error('Business ID not found');
            }

            const now = new Date();
            const todayStart = startOfDay(now).toISOString();
            const todayEnd = endOfDay(now).toISOString();
            const yesterdayStart = startOfDay(subDays(now, 1)).toISOString();
            const yesterdayEnd = endOfDay(subDays(now, 1)).toISOString();
            const monthStart = startOfMonth(now).toISOString();
            const monthEnd = endOfMonth(now).toISOString();
            const lastMonthStart = startOfMonth(subDays(startOfMonth(now), 1)).toISOString();
            const lastMonthEnd = endOfMonth(subDays(startOfMonth(now), 1)).toISOString();
            const weekStart = startOfWeek(now, { locale: ptBR }).toISOString();
            const weekEnd = endOfWeek(now, { locale: ptBR }).toISOString();
            const thirtyDaysAgo = subDays(now, 30).toISOString();
            const nowTime = now.toISOString();

            console.log('📊 [Dashboard] Loading data for business:', businessId);

            // =========================================
            // FETCH ALL DATA IN PARALLEL
            // =========================================
            const [
                todayRes,
                yesterdayRes,
                clientsThisMonthRes,
                clientsLastMonthRes,
                last30DaysRes,
                professionalsRes,
                businessRes,
                currentApptsRes,
                monthApptsRes,
                weekApptsRes,
                pendingApptsRes
            ] = await Promise.all([
                // 1. Today's appointments - include service for price
                supabase
                    .from('appointments')
                    .select('id, status, payment_status, service:services(price)')
                    .eq('business_id', businessId)
                    .gte('start_datetime', todayStart)
                    .lte('start_datetime', todayEnd),

                // 2. Yesterday's appointments
                supabase
                    .from('appointments')
                    .select('id, status, payment_status, service:services(price)')
                    .eq('business_id', businessId)
                    .gte('start_datetime', yesterdayStart)
                    .lte('start_datetime', yesterdayEnd),

                // 3. New clients this month
                supabase
                    .from('clients')
                    .select('id', { count: 'exact', head: true })
                    .eq('business_id', businessId)
                    .gte('created_at', monthStart)
                    .lte('created_at', monthEnd),

                // 4. New clients last month
                supabase
                    .from('clients')
                    .select('id', { count: 'exact', head: true })
                    .eq('business_id', businessId)
                    .gte('created_at', lastMonthStart)
                    .lte('created_at', lastMonthEnd),

                // 5. Last 30 days for no-show rate
                supabase
                    .from('appointments')
                    .select('status')
                    .eq('business_id', businessId)
                    .gte('start_datetime', thirtyDaysAgo),

                // 6. Professionals
                supabase
                    .from('professionals')
                    .select('id, name, specialty, monthly_goal')
                    .eq('business_id', businessId)
                    .eq('is_active', true)
                    .order('name'),

                // 7. Business settings (for monthly_goal)
                supabase
                    .from('businesses')
                    .select('booking_settings')
                    .eq('id', businessId)
                    .single(),

                // 8. Current appointments (for chairs)
                supabase
                    .from('appointments')
                    .select(`
                        id,
                        professional_id,
                        start_datetime,
                        duration_minutes,
                        status,
                        customer_name,
                        client:clients(name),
                        service:services(name)
                    `)
                    .eq('business_id', businessId)
                    .lte('start_datetime', nowTime)
                    .in('status', ['confirmed', 'in_progress']),

                // 9. Month appointments (for goal progress) - include service for price
                supabase
                    .from('appointments')
                    .select('id, payment_status, status, service:services(price)')
                    .eq('business_id', businessId)
                    .gte('start_datetime', monthStart)
                    .lte('start_datetime', monthEnd),

                // 10. Week appointments (for chart) - include service for price
                supabase
                    .from('appointments')
                    .select('id, start_datetime, payment_status, status, service:services(price)')
                    .eq('business_id', businessId)
                    .gte('start_datetime', weekStart)
                    .lte('start_datetime', weekEnd),

                // 11. Pending appointments
                supabase
                    .from('appointments')
                    .select(`
                        id,
                        start_datetime,
                        customer_name,
                        client:clients(name),
                        service:services(name),
                        source
                    `)
                    .eq('business_id', businessId)
                    .eq('status', 'pending')
                    .order('start_datetime', { ascending: true })
                    .limit(5)
            ]);

            // =========================================
            // PROCESS RESULTS
            // =========================================

            // 1. Today's Stats
            const todayAppointments = todayRes.data || [];
            console.log('📊 [Dashboard] Today appointments:', todayAppointments.length);

            const paidToday = todayAppointments.filter(a => a.payment_status === 'paid' || a.status === 'completed');
            const faturamentoHoje = paidToday.reduce((sum, a) => sum + getAppointmentPrice(a), 0);
            const agendamentosHoje = todayAppointments.length;
            const agendamentosPendentes = todayAppointments.filter(a => a.status === 'pending').length;

            console.log('💰 [Dashboard] Faturamento hoje:', faturamentoHoje, 'de', paidToday.length, 'pagos');

            // 2. Yesterday's Stats
            const yesterdayAppointments = yesterdayRes.data || [];
            const faturamentoOntem = yesterdayAppointments
                .filter(a => a.payment_status === 'paid' || a.status === 'completed')
                .reduce((sum, a) => sum + getAppointmentPrice(a), 0);

            // 3. Clients
            const novosClientesMes = clientsThisMonthRes.count || 0;
            const novosClientesMesAnterior = clientsLastMonthRes.count || 0;

            // 4. No-Show Rate
            const last30DaysAppointments = last30DaysRes.data || [];
            const totalLast30 = last30DaysAppointments.length;
            const noShowCount = last30DaysAppointments.filter(a => a.status === 'noshow').length;
            const taxaNoShow = totalLast30 > 0 ? (noShowCount / totalLast30) * 100 : 0;

            setStats({
                faturamentoHoje,
                faturamentoOntem,
                agendamentosHoje,
                agendamentosPendentes,
                novosClientesMes,
                novosClientesMesAnterior,
                taxaNoShow,
                taxaNoShowAnterior: 0,
            });

            // 5. Professional Chairs
            const professionals = professionalsRes.data || [];
            const currentAppointments = currentApptsRes.data || [];

            const chairsData: ProfessionalChair[] = professionals.map(prof => {
                const activeAppointment = currentAppointments.find(apt => {
                    if (apt.professional_id !== prof.id) return false;
                    const start = new Date(apt.start_datetime);
                    const end = new Date(start.getTime() + (apt.duration_minutes || 60) * 60000);
                    return now >= start && now <= end;
                });

                if (activeAppointment) {
                    const start = new Date(activeAppointment.start_datetime);
                    const elapsed = Math.floor((now.getTime() - start.getTime()) / 60000);
                    const duration = activeAppointment.duration_minutes || 60;

                    return {
                        id: prof.id,
                        name: prof.name,
                        specialty: prof.specialty || '',
                        status: 'busy' as const,
                        currentClient: activeAppointment.customer_name || (activeAppointment.client as any)?.name || 'Cliente',
                        currentService: (activeAppointment.service as any)?.name || 'Serviço',
                        startTime: format(start, 'HH:mm'),
                        duration,
                        elapsed,
                    };
                }

                return {
                    id: prof.id,
                    name: prof.name,
                    specialty: prof.specialty || '',
                    status: 'free' as const,
                };
            });

            setChairs(chairsData);

            // 6. Goal with Period Support
            const bookingSettings = businessRes.data?.booking_settings || {};
            const goalAmount = bookingSettings.goal_amount || bookingSettings.monthly_goal;
            const goalPeriod: 1 | 3 | 6 | 12 = bookingSettings.goal_period || 1;
            const professionalsGoalSum = professionals.reduce((sum, p) => sum + (p.monthly_goal || 0), 0);
            // Use business goal if set, otherwise sum of professional goals (monthly)
            const totalGoal = goalAmount || (professionalsGoalSum * goalPeriod) || 20000;

            // Period labels
            const periodLabels: Record<number, string> = {
                1: 'Mensal',
                3: 'Trimestral',
                6: 'Semestral',
                12: 'Anual'
            };

            // Calculate revenue for the entire goal period
            const monthAppointments = monthApptsRes.data || [];
            const paidThisMonth = monthAppointments.filter(a => a.payment_status === 'paid' || a.status === 'completed');
            const currentMonthRevenue = paidThisMonth.reduce((sum, a) => sum + getAppointmentPrice(a), 0);

            // For periods > 1 month, we'd need to fetch more data, but for now we'll estimate based on current month
            // The monthApptsRes already gives us this month's revenue
            const currentRevenue = currentMonthRevenue;

            console.log('🎯 [Dashboard] Goal:', periodLabels[goalPeriod], 'revenue=', currentRevenue, 'goal=', totalGoal, 'period=', goalPeriod);

            const dayOfMonth = now.getDate();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            const daysInPeriod = daysInMonth * goalPeriod;
            const daysElapsedInPeriod = dayOfMonth; // For now just current month, could be improved

            const dailyAverage = daysElapsedInPeriod > 0 ? currentRevenue / daysElapsedInPeriod : 0;
            const projection = dailyAverage * daysInPeriod;

            setMonthlyGoal({
                current: currentRevenue,
                target: totalGoal,
                projection,
                dailyAverage,
                period: goalPeriod,
                periodLabel: periodLabels[goalPeriod],
            });

            // 7. Weekly Revenue Chart
            const weekDays = eachDayOfInterval({
                start: startOfWeek(now, { locale: ptBR }),
                end: endOfWeek(now, { locale: ptBR })
            });

            const weekAppointments = weekApptsRes.data || [];
            const weeklyData: WeeklyRevenue[] = weekDays.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const dayAppointments = weekAppointments.filter(a => {
                    const aptDate = format(new Date(a.start_datetime), 'yyyy-MM-dd');
                    return aptDate === dayStr && (a.payment_status === 'paid' || a.status === 'completed');
                });
                const dayRevenue = dayAppointments.reduce((sum, a) => sum + getAppointmentPrice(a), 0);

                return {
                    name: format(day, 'EEE', { locale: ptBR }).charAt(0).toUpperCase() + format(day, 'EEE', { locale: ptBR }).slice(1, 3),
                    date: dayStr,
                    total: dayRevenue,
                };
            });

            setWeeklyRevenue(weeklyData);

            // 8. Pending Requests
            const pendingApts = pendingApptsRes.data || [];
            const pendingData: PendingRequest[] = pendingApts.map(apt => ({
                id: apt.id,
                clientName: apt.customer_name || (apt.client as any)?.name || 'Cliente',
                service: (apt.service as any)?.name || 'Serviço',
                time: format(new Date(apt.start_datetime), 'HH:mm'),
                date: format(new Date(apt.start_datetime), 'dd/MM'),
                source: apt.source || 'App',
            }));

            setPendingRequests(pendingData);

            console.log('✅ [Dashboard] Data loaded successfully');

        } catch (err: any) {
            console.error('❌ [Dashboard] Error loading data:', err);
            setError(err.message || 'Erro ao carregar dados');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        // Removed auto-refresh to prevent reload loop
        // User can manually refresh via the refresh button
    }, [loadData]);

    return {
        stats,
        chairs,
        weeklyRevenue,
        monthlyGoal,
        pendingRequests,
        isLoading,
        error,
        refresh: loadData,
    };
}
