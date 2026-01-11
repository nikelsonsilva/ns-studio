/**
 * useAgendaData Hook
 * Gerencia todo o fetch de dados e estado da agenda
 * Centraliza a lógica que estava espalhada no Calendar.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getNowInBrazil, getStartOfDayBrazil, getEndOfDayBrazil } from '@/lib/timezone';
import { getBusinessHoursForDay } from '@/lib/database';
import type { TimeBlock, ProfessionalAvailability, DayHours } from '../types';
import type { Barber, Appointment } from '@/types';

interface UseAgendaDataProps {
    initialDate?: Date;
    barbers: Barber[];
    appointmentsData: Appointment[] | null;
}

interface UseAgendaDataResult {
    // Estado
    currentDate: Date;
    setCurrentDate: (date: Date) => void;
    businessId: string;
    businessHoursForDay: DayHours | null;
    isLoadingBusinessHours: boolean;
    globalBufferMinutes: number;
    dynamicTimeSlots: string[];
    profAvailability: ProfessionalAvailability[];
    timeBlocks: TimeBlock[];
    professionalServiceMap: Record<string, string[]>;
    appointments: Appointment[];
    currentTime: Date;

    // Ações
    refetchAppointments: () => Promise<void>;
    refetchTimeBlocks: () => Promise<void>;
    isBusinessClosed: boolean;
}

export function useAgendaData({
    initialDate,
    barbers,
    appointmentsData
}: UseAgendaDataProps): UseAgendaDataResult {
    // === STATE ===
    const [currentDate, setCurrentDate] = useState(initialDate || new Date());
    const [businessId, setBusinessId] = useState<string>('');
    const [businessHoursForDay, setBusinessHoursForDay] = useState<DayHours | null>(null);
    const [isLoadingBusinessHours, setIsLoadingBusinessHours] = useState(true);
    const [globalBufferMinutes, setGlobalBufferMinutes] = useState<number>(15);
    const [dynamicTimeSlots, setDynamicTimeSlots] = useState<string[]>([]);
    const [profAvailability, setProfAvailability] = useState<ProfessionalAvailability[]>([]);
    const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
    const [professionalServiceMap, setProfessionalServiceMap] = useState<Record<string, string[]>>({});
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [currentTime, setCurrentTime] = useState(getNowInBrazil());

    // Sync appointments from prop
    useEffect(() => {
        if (appointmentsData) {
            setAppointments(appointmentsData);
        }
    }, [appointmentsData]);

    // Update clock every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(getNowInBrazil()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Load business ID and buffer settings
    useEffect(() => {
        const loadBusinessSettings = async () => {
            const { data, error } = await supabase
                .from('businesses')
                .select('id, booking_settings')
                .single();
            if (!error && data) {
                setBusinessId(data.id);
                const buffer = (data.booking_settings as any)?.buffer_minutes || 30;
                setGlobalBufferMinutes(buffer);
            }
        };

        loadBusinessSettings();

        // Realtime subscription for business settings
        const subscription = supabase
            .channel('business_settings_changes')
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'businesses' },
                (payload) => {
                    const newSettings = payload.new as any;
                    const newBuffer = newSettings?.booking_settings?.buffer_minutes;
                    if (newBuffer && newBuffer !== globalBufferMinutes) {
                        setGlobalBufferMinutes(newBuffer);
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Load business hours when date or buffer changes
    useEffect(() => {
        const loadBusinessHours = async () => {
            setIsLoadingBusinessHours(true);
            const dayOfWeek = currentDate.getDay();
            const hours = await getBusinessHoursForDay(dayOfWeek);
            setBusinessHoursForDay(hours);

            if (hours) {
                const [openHour, openMin = 0] = hours.open.split(':').map(Number);
                let [closeHour, closeMin = 0] = hours.close.split(':').map(Number);
                if (closeHour === 0 && closeMin === 0) closeHour = 24;

                const slotInterval = Math.max(globalBufferMinutes || 30, 5);
                const rawStartMinutes = openHour * 60 + openMin;
                const endMinutes = closeHour * 60 + closeMin;
                const startMinutes = Math.floor(rawStartMinutes / slotInterval) * slotInterval;

                const slots: string[] = [];
                for (let minutes = startMinutes; minutes < endMinutes; minutes += slotInterval) {
                    const h = Math.floor(minutes / 60);
                    const m = minutes % 60;
                    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                }
                setDynamicTimeSlots(slots);
            } else {
                setDynamicTimeSlots([]);
            }
            setIsLoadingBusinessHours(false);
        };
        loadBusinessHours();
    }, [currentDate, globalBufferMinutes]);

    // Load availability and time blocks
    useEffect(() => {
        if (!businessId) return;

        const loadAvailability = async () => {
            const professionalIds = barbers.map(b => b.id);
            if (professionalIds.length === 0) return;

            const { data } = await supabase
                .from('professional_availability')
                .select('*')
                .in('professional_id', professionalIds);

            if (data) setProfAvailability(data);
        };

        const loadTimeBlocks = async () => {
            const startOfDay = getStartOfDayBrazil(currentDate);
            const endOfDay = getEndOfDayBrazil(currentDate);

            const { data } = await supabase
                .from('time_blocks')
                .select('*')
                .eq('business_id', businessId)
                .gte('start_datetime', startOfDay.toISOString())
                .lte('start_datetime', endOfDay.toISOString());
            if (data) setTimeBlocks(data);
        };

        const loadProfessionalServices = async () => {
            const professionalIds = barbers.map(b => b.id);
            if (professionalIds.length === 0) return;

            const { data } = await supabase
                .from('professional_services')
                .select('professional_id, service_id')
                .in('professional_id', professionalIds);

            if (data) {
                const map: Record<string, string[]> = {};
                data.forEach((ps: { professional_id: string; service_id: string }) => {
                    if (!map[ps.professional_id]) map[ps.professional_id] = [];
                    map[ps.professional_id].push(ps.service_id);
                });
                setProfessionalServiceMap(map);
            }
        };

        loadAvailability();
        loadTimeBlocks();
        loadProfessionalServices();

        // Realtime subscriptions
        const availabilitySubscription = supabase
            .channel('professional_availability_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'professional_availability' },
                () => loadAvailability()
            )
            .subscribe();

        const timeBlocksSubscription = supabase
            .channel('time_blocks_changes')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'time_blocks' },
                () => loadTimeBlocks()
            )
            .subscribe();

        return () => {
            availabilitySubscription.unsubscribe();
            timeBlocksSubscription.unsubscribe();
        };
    }, [businessId, currentDate, barbers.length]);

    // Refetch functions
    const refetchAppointments = useCallback(async () => {
        // This will trigger through the parent's useSupabaseQuery refetch
        // For now, we rely on realtime or manual refresh
    }, []);

    const refetchTimeBlocks = useCallback(async () => {
        const startOfDay = getStartOfDayBrazil(currentDate);
        const endOfDay = getEndOfDayBrazil(currentDate);

        const { data } = await supabase
            .from('time_blocks')
            .select('*')
            .eq('business_id', businessId)
            .gte('start_datetime', startOfDay.toISOString())
            .lte('start_datetime', endOfDay.toISOString());
        if (data) setTimeBlocks(data);
    }, [businessId, currentDate]);

    return {
        currentDate,
        setCurrentDate,
        businessId,
        businessHoursForDay,
        isLoadingBusinessHours,
        globalBufferMinutes,
        dynamicTimeSlots,
        profAvailability,
        timeBlocks,
        professionalServiceMap,
        appointments,
        currentTime,
        refetchAppointments,
        refetchTimeBlocks,
        isBusinessClosed: businessHoursForDay === null
    };
}
