/**
 * Agenda Service
 * Todas as chamadas Supabase relacionadas à agenda
 */

import { supabase } from '@core/infra/supabase';
import type { TimeBlock, ProfessionalAvailability, DayHours } from '../types';
import { getStartOfDayBrazil, getEndOfDayBrazil } from '@/lib/timezone';

/**
 * Carrega os horários de funcionamento para um dia da semana
 */
export async function getBusinessHoursForDay(dayOfWeek: number): Promise<DayHours | null> {
    const { data, error } = await supabase
        .from('businesses')
        .select('business_hours')
        .single();

    if (error || !data?.business_hours) return null;

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayNames[dayOfWeek];
    const hours = (data.business_hours as Record<string, any>)[dayKey];

    if (!hours || hours.closed) return null;

    return {
        open: hours.open,
        close: hours.close,
        closed: false
    };
}

/**
 * Carrega disponibilidade de todos os profissionais
 */
export async function loadProfessionalAvailability(
    professionalIds: string[]
): Promise<ProfessionalAvailability[]> {
    if (professionalIds.length === 0) return [];

    const { data, error } = await supabase
        .from('professional_availability')
        .select('*')
        .in('professional_id', professionalIds);

    if (error) {
        console.error('[agendaService] Error loading availability:', error);
        return [];
    }

    return data || [];
}

/**
 * Carrega bloqueios de horário para uma data específica
 */
export async function loadTimeBlocks(
    businessId: string,
    date: Date
): Promise<TimeBlock[]> {
    const startOfDay = getStartOfDayBrazil(date);
    const endOfDay = getEndOfDayBrazil(date);

    const { data, error } = await supabase
        .from('time_blocks')
        .select('*')
        .eq('business_id', businessId)
        .gte('start_datetime', startOfDay.toISOString())
        .lte('start_datetime', endOfDay.toISOString());

    if (error) {
        console.error('[agendaService] Error loading time blocks:', error);
        return [];
    }

    return data || [];
}

/**
 * Carrega mapa de serviços por profissional
 */
export async function loadProfessionalServices(
    professionalIds: string[]
): Promise<Record<string, string[]>> {
    if (professionalIds.length === 0) return {};

    const { data, error } = await supabase
        .from('professional_services')
        .select('professional_id, service_id')
        .in('professional_id', professionalIds);

    if (error) {
        console.error('[agendaService] Error loading professional services:', error);
        return {};
    }

    const map: Record<string, string[]> = {};
    data?.forEach((ps: { professional_id: string; service_id: string }) => {
        if (!map[ps.professional_id]) map[ps.professional_id] = [];
        map[ps.professional_id].push(ps.service_id);
    });

    return map;
}

/**
 * Carrega configurações do negócio
 */
export async function loadBusinessSettings(): Promise<{
    id: string;
    bufferMinutes: number;
} | null> {
    const { data, error } = await supabase
        .from('businesses')
        .select('id, booking_settings')
        .single();

    if (error || !data) return null;

    return {
        id: data.id,
        bufferMinutes: (data.booking_settings as any)?.buffer_minutes || 30
    };
}

/**
 * Cria um bloqueio de horário
 */
export async function createTimeBlock(
    businessId: string,
    professionalId: string,
    startDateTime: Date,
    endDateTime: Date,
    reason: string = 'Bloqueio manual'
): Promise<boolean> {
    const { error } = await supabase.from('time_blocks').insert({
        business_id: businessId,
        professional_id: professionalId,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        reason,
        block_type: 'personal'
    });

    if (error) {
        console.error('[agendaService] Error creating time block:', error);
        return false;
    }

    return true;
}

/**
 * Remove um bloqueio de horário
 */
export async function deleteTimeBlock(blockId: string): Promise<boolean> {
    const { error } = await supabase
        .from('time_blocks')
        .delete()
        .eq('id', blockId);

    if (error) {
        console.error('[agendaService] Error deleting time block:', error);
        return false;
    }

    return true;
}

/**
 * Atualiza um agendamento (para drag & drop)
 */
export async function updateAppointment(
    appointmentId: string,
    updates: {
        professional_id?: string;
        start_datetime?: string;
    }
): Promise<boolean> {
    const { error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId);

    if (error) {
        console.error('[agendaService] Error updating appointment:', error);
        return false;
    }

    return true;
}

/**
 * Configura subscription realtime para mudanças na agenda
 */
export function subscribeToAgendaChanges(
    onAvailabilityChange: () => void,
    onTimeBlocksChange: () => void,
    onBusinessSettingsChange: (payload: any) => void
) {
    const availabilityChannel = supabase
        .channel('professional_availability_changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'professional_availability' },
            onAvailabilityChange
        )
        .subscribe();

    const timeBlocksChannel = supabase
        .channel('time_blocks_changes')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'time_blocks' },
            onTimeBlocksChange
        )
        .subscribe();

    const businessChannel = supabase
        .channel('business_settings_changes')
        .on('postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'businesses' },
            (payload) => onBusinessSettingsChange(payload.new)
        )
        .subscribe();

    // Retorna função para cleanup
    return () => {
        availabilityChannel.unsubscribe();
        timeBlocksChannel.unsubscribe();
        businessChannel.unsubscribe();
    };
}
