/**
 * =====================================================
 * AVAILABILITY API
 * =====================================================
 * Lógica de disponibilidade reutilizável para UI + WhatsApp + API
 * =====================================================
 */

import { supabase } from '../supabase';
import { generateTimeSlots, isOverlapping, toISODateTime, addMinutes } from '../utils/time';
import type { PublicAppointmentData, BookingSettings, AppointmentRange } from '../types/booking';

/**
 * Busca slots disponíveis para um profissional em uma data específica
 */
export async function getAvailableSlots(
    businessId: string,
    professionalId: string,
    date: string,     // '2025-12-05'
    serviceId: string
): Promise<string[]> {
    try {
        // 1) Buscar config do negócio
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('booking_settings')
            .eq('id', businessId)
            .single();

        if (businessError || !business) {
            console.error('Error fetching business:', businessError);
            return [];
        }

        const settings: BookingSettings = business.booking_settings || {};
        let bufferMinutes = settings.buffer_minutes ?? 15;
        const slotInterval = settings.slot_duration_minutes ?? 60; // Intervalo de exibição (default: 1h)

        // 1b) Check if professional has custom buffer
        const { data: professional } = await supabase
            .from('professionals')
            .select('custom_buffer, buffer_minutes')
            .eq('id', professionalId)
            .single();

        if (professional?.custom_buffer && professional?.buffer_minutes) {
            bufferMinutes = professional.buffer_minutes;
        }

        // 2) Buscar duração do serviço
        const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('duration_minutes')
            .eq('id', serviceId)
            .single();

        if (serviceError || !service) {
            console.error('Error fetching service:', serviceError);
            return [];
        }

        const durationMinutes = service.duration_minutes ?? 30;

        // 3) Descobrir dia da semana
        const targetDate = new Date(date + 'T00:00:00');
        const dayOfWeek = targetDate.getDay(); // 0-6

        // 4) Buscar disponibilidade básica do profissional
        const { data: availability, error: availError } = await supabase
            .from('professional_availability')
            .select('*')
            .eq('professional_id', professionalId)
            .eq('day_of_week', dayOfWeek)
            .eq('is_active', true)
            .maybeSingle();

        if (availError || !availability) {
            console.error('No availability found:', availError);
            return [];
        }

        // 5) Gerar slots brutos (usa slotInterval para exibição)
        const allSlots = generateTimeSlots(
            availability.start_time,
            availability.end_time,
            durationMinutes,
            bufferMinutes,
            slotInterval // Passa o intervalo de exibição
        );

        // 6) Buscar agendamentos já existentes nesse dia
        const startDay = new Date(date + 'T00:00:00Z').toISOString();
        const endDay = new Date(date + 'T23:59:59Z').toISOString();

        const { data: appointments } = await supabase
            .from('appointments')
            .select('start_datetime, end_datetime')
            .eq('professional_id', professionalId)
            .gte('start_datetime', startDay)
            .lte('start_datetime', endDay)
            .neq('status', 'cancelled');

        // 7) Buscar bloqueios
        const { data: blocks } = await supabase
            .from('time_blocks')
            .select('start_datetime, end_datetime')
            .eq('business_id', businessId)
            .or(`professional_id.eq.${professionalId},professional_id.is.null`)
            .gte('start_datetime', startDay)
            .lte('start_datetime', endDay);

        // 8) Filtrar slots disponíveis
        const available: string[] = [];

        for (const time of allSlots) {
            const slotStart = new Date(`${date}T${time}:00Z`);
            const slotEnd = addMinutes(slotStart, durationMinutes);

            const hasAppointmentConflict = isOverlapping(slotStart, slotEnd, appointments || []);
            const hasBlockConflict = isOverlapping(slotStart, slotEnd, blocks || []);

            // Verificar se está no intervalo de almoço
            let inBreak = false;
            if (availability.break_start && availability.break_end) {
                const breakStart = new Date(`${date}T${availability.break_start}Z`);
                const breakEnd = new Date(`${date}T${availability.break_end}Z`);
                inBreak = slotStart < breakEnd && slotEnd > breakStart;
            }

            if (!hasAppointmentConflict && !hasBlockConflict && !inBreak) {
                available.push(time);
            }
        }

        return available;
    } catch (error) {
        console.error('Error in getAvailableSlots:', error);
        return [];
    }
}

/**
 * Verifica se um slot específico está disponível
 */
export async function isSlotAvailable(
    businessId: string,
    professionalId: string,
    dateTimeISO: string,
    durationMinutes: number
): Promise<boolean> {
    try {
        const start = new Date(dateTimeISO);
        const end = addMinutes(start, durationMinutes);

        // Buscar agendamentos conflitantes
        const { data: appointments } = await supabase
            .from('appointments')
            .select('start_datetime, end_datetime')
            .eq('professional_id', professionalId)
            .gte('end_datetime', start.toISOString())
            .lte('start_datetime', end.toISOString())
            .neq('status', 'cancelled');

        // Buscar bloqueios conflitantes
        const { data: blocks } = await supabase
            .from('time_blocks')
            .select('start_datetime, end_datetime')
            .eq('business_id', businessId)
            .or(`professional_id.eq.${professionalId},professional_id.is.null`)
            .gte('end_datetime', start.toISOString())
            .lte('start_datetime', end.toISOString());

        const hasConflict = (ranges: AppointmentRange[]) =>
            ranges?.some((r) => {
                const rStart = new Date(r.start_datetime);
                const rEnd = new Date(r.end_datetime);
                return start < rEnd && end > rStart;
            });

        return !hasConflict(appointments || []) && !hasConflict(blocks || []);
    } catch (error) {
        console.error('Error in isSlotAvailable:', error);
        return false;
    }
}

/**
 * Cria um agendamento público (usado por link público, WhatsApp, API)
 */
export async function createPublicAppointment(
    apiToken: string,
    data: PublicAppointmentData
) {
    try {
        const { businessId, professionalId, serviceId, customerName, customerPhone, date, time } = data;

        // 1) Validar token
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('id, booking_settings')
            .eq('id', businessId)
            .single();

        if (businessError || !business) {
            throw new Error('Business not found');
        }

        const settings: BookingSettings = business.booking_settings || {};
        if (!settings.api_token || settings.api_token !== apiToken) {
            throw new Error('Invalid API token');
        }

        // 2) Buscar serviço
        const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('id, duration_minutes, price')
            .eq('id', serviceId)
            .single();

        if (serviceError || !service) {
            throw new Error('Service not found');
        }

        const durationMinutes = service.duration_minutes ?? 30;

        // 3) Montar datetime
        const start = new Date(`${date}T${time}:00Z`);
        const end = addMinutes(start, durationMinutes);

        // 4) Verificar disponibilidade
        const available = await isSlotAvailable(
            businessId,
            professionalId,
            start.toISOString(),
            durationMinutes
        );

        if (!available) {
            throw new Error('Slot not available');
        }

        // 5) Criar appointment
        const { data: appointment, error: insertError } = await supabase
            .from('appointments')
            .insert({
                business_id: businessId,
                professional_id: professionalId,
                service_id: serviceId,
                customer_name: customerName,
                customer_phone: customerPhone,
                start_datetime: start.toISOString(),
                end_datetime: end.toISOString(),
                duration_minutes: durationMinutes,
                amount_paid: service.price,
                status: settings.require_payment ? 'pending' : 'confirmed',
                payment_status: settings.require_payment ? 'pending' : 'paid',
                source: 'public_link'
            })
            .select('*')
            .single();

        if (insertError) {
            console.error('Error creating appointment:', insertError);
            throw insertError;
        }

        return appointment;
    } catch (error) {
        console.error('Error in createPublicAppointment:', error);
        throw error;
    }
}

/**
 * Busca agendamentos de um negócio em um período
 */
export async function getAppointments(
    businessId: string,
    from: string,  // ISO date
    to: string     // ISO date
) {
    try {
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                professional:professionals(id, name, specialty),
                service:services(id, name, duration_minutes, price),
                client:clients(id, name, phone, email)
            `)
            .eq('business_id', businessId)
            .gte('start_datetime', from)
            .lte('start_datetime', to)
            .order('start_datetime');

        if (error) {
            console.error('Error fetching appointments:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getAppointments:', error);
        return [];
    }
}
