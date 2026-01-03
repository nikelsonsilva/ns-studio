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
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, subDays, eachDayOfInterval } from 'date-fns';
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
    status: string;
    paymentStatus: string | null;
    startDatetime: string;
}

export interface TopService {
    id: string;
    name: string;
    count: number;
    percentage: number;
}

export interface RecentActivity {
    id: string;
    type: 'booking' | 'completed' | 'cancelled' | 'payment';
    description: string;
    timestamp: string;
    timeAgo: string;
}

export interface DashboardData {
    stats: DashboardStats;
    chairs: ProfessionalChair[];
    weeklyRevenue: WeeklyRevenue[];
    monthlyGoal: MonthlyGoal;
    pendingRequests: PendingRequest[];
    topServices: TopService[];
    recentActivities: RecentActivity[];
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
    const [topServices, setTopServices] = useState<TopService[]>([]);
    const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
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
            // Últimos 7 dias (do dia atual para trás)
            const weekStart = startOfDay(subDays(now, 6)).toISOString();
            const weekEnd = endOfDay(now).toISOString();
            const thirtyDaysAgo = subDays(now, 30).toISOString();
            const nowTime = now.toISOString();


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
                pendingApptsRes,
                recentApptsRes
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

                // 8. Current appointments (for chairs) - Today's appointments that have started
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
                        service:services(name, duration_minutes)
                    `)
                    .eq('business_id', businessId)
                    .gte('start_datetime', todayStart) // Only today's appointments
                    .lte('start_datetime', nowTime)    // That have already started
                    .in('status', ['confirmed', 'in_progress', 'paid']),

                // 9. Month appointments (for goal progress) - include service for price AND name
                supabase
                    .from('appointments')
                    .select('id, payment_status, status, service:services(price, name)')
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

                // 11. Pending and recent online appointments
                supabase
                    .from('appointments')
                    .select(`
                        id,
                        start_datetime,
                        created_at,
                        customer_name,
                        client:clients(name),
                        service:services(name),
                        source,
                        status,
                        payment_status
                    `)
                    .eq('business_id', businessId)
                    .in('status', ['pending', 'confirmed'])
                    .gte('start_datetime', new Date().toISOString())
                    .order('created_at', { ascending: false })
                    .limit(10),

                // 12. Recent activities (last 10 appointments of any status)
                supabase
                    .from('appointments')
                    .select(`
                        id,
                        start_datetime,
                        created_at,
                        updated_at,
                        customer_name,
                        client:clients(name),
                        service:services(name),
                        status,
                        payment_status
                    `)
                    .eq('business_id', businessId)
                    .order('updated_at', { ascending: false })
                    .limit(10)
            ]);

            // =========================================
            // PROCESS RESULTS
            // =========================================

            // 1. Today's Stats
            const todayAppointments = todayRes.data || [];

            const paidToday = todayAppointments.filter(a => a.payment_status === 'paid' || a.status === 'completed');
            const faturamentoHoje = paidToday.reduce((sum, a) => sum + getAppointmentPrice(a), 0);
            const agendamentosHoje = todayAppointments.length;
            const agendamentosPendentes = todayAppointments.filter(a => a.status === 'pending').length;


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

            // 5. Professional Chairs - Real-time status based on current appointments
            const professionals = professionalsRes.data || [];
            const currentAppointments = currentApptsRes.data || [];


            const chairsData: ProfessionalChair[] = professionals.map((prof, index) => {
                // Find appointment that is currently in progress for this professional
                const activeAppointment = currentAppointments.find(apt => {
                    if (apt.professional_id !== prof.id) return false;

                    const start = new Date(apt.start_datetime);
                    // Use appointment duration, or service duration, or default 60 min
                    const durationMins = apt.duration_minutes || (apt.service as any)?.duration_minutes || 60;
                    const durationMs = durationMins * 60000;
                    const end = new Date(start.getTime() + durationMs);

                    // Check if NOW is between start and end
                    const isActive = now >= start && now <= end;

                    return isActive;
                });

                if (activeAppointment) {
                    const start = new Date(activeAppointment.start_datetime);
                    const duration = activeAppointment.duration_minutes || (activeAppointment.service as any)?.duration_minutes || 60;
                    const elapsed = Math.floor((now.getTime() - start.getTime()) / 60000);


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

            // 7. Weekly Revenue Chart - Últimos 7 dias (do dia atual para trás)
            const weekDays = eachDayOfInterval({
                start: subDays(now, 6),
                end: now
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
                status: (apt as any).status || 'pending',
                paymentStatus: (apt as any).payment_status || null,
                startDatetime: apt.start_datetime,
            }));

            setPendingRequests(pendingData);

            // 9. Top Services (from month appointments)
            const serviceCountMap = new Map<string, { id: string; name: string; count: number }>();
            monthAppointments.forEach(apt => {
                const serviceName = (apt.service as any)?.name;
                if (serviceName) {
                    const existing = serviceCountMap.get(serviceName);
                    if (existing) {
                        existing.count++;
                    } else {
                        serviceCountMap.set(serviceName, {
                            id: serviceName,
                            name: serviceName,
                            count: 1
                        });
                    }
                }
            });

            const totalServicesCount = Array.from(serviceCountMap.values()).reduce((sum, s) => sum + s.count, 0);
            const topServicesData: TopService[] = Array.from(serviceCountMap.values())
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .map(s => ({
                    ...s,
                    percentage: totalServicesCount > 0 ? (s.count / totalServicesCount) * 100 : 0
                }));

            setTopServices(topServicesData);

            // 10. Recent Activities
            const recentApts = recentApptsRes.data || [];
            const getTimeAgo = (date: Date): string => {
                const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
                if (seconds < 60) return 'agora';
                const minutes = Math.floor(seconds / 60);
                if (minutes < 60) return `${minutes}min`;
                const hours = Math.floor(minutes / 60);
                if (hours < 24) return `${hours}h`;
                const days = Math.floor(hours / 24);
                return `${days}d`;
            };

            const getActivityType = (status: string, paymentStatus: string | null): RecentActivity['type'] => {
                if (paymentStatus === 'paid') return 'payment';
                if (status === 'completed') return 'completed';
                if (status === 'cancelled' || status === 'noshow') return 'cancelled';
                return 'booking';
            };

            const getActivityDescription = (apt: any): string => {
                const clientName = apt.customer_name || (apt.client as any)?.name || 'Cliente';
                const serviceName = (apt.service as any)?.name || 'Serviço';
                const status = apt.status;
                const paymentStatus = apt.payment_status;

                if (paymentStatus === 'paid') return `${clientName} pagou ${serviceName}`;
                if (status === 'completed') return `${clientName} concluiu ${serviceName}`;
                if (status === 'cancelled') return `${clientName} cancelou ${serviceName}`;
                if (status === 'noshow') return `${clientName} não compareceu`;
                if (status === 'confirmed') return `${clientName} confirmou ${serviceName}`;
                return `${clientName} agendou ${serviceName}`;
            };

            const recentActivitiesData: RecentActivity[] = recentApts.map(apt => ({
                id: apt.id,
                type: getActivityType(apt.status, apt.payment_status),
                description: getActivityDescription(apt),
                timestamp: apt.updated_at || apt.created_at,
                timeAgo: getTimeAgo(new Date(apt.updated_at || apt.created_at))
            }));

            setRecentActivities(recentActivitiesData);


        } catch (err: any) {
            console.error('❌ [Dashboard] Error loading data:', err);
            setError(err.message || 'Erro ao carregar dados');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        // Removido auto-refresh - atualiza apenas manualmente ou ao navegar para a aba
    }, [loadData]);

    return {
        stats,
        chairs,
        weeklyRevenue,
        monthlyGoal,
        pendingRequests,
        topServices,
        recentActivities,
        isLoading,
        error,
        refresh: loadData,
    };
}
