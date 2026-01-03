import { supabase } from './supabase';
import { format, addMinutes, parse, isWithinInterval, isBefore, isAfter } from 'date-fns';

// =====================================================
// TYPES
// =====================================================

export interface BookingSettings {
    min_advance_hours: number;
    max_advance_days: number;
    buffer_minutes: number;
    allow_same_day: boolean;
    require_payment: boolean;
    api_token: string | null;
    slot_duration_minutes: number;
}

export interface ProfessionalAvailability {
    id: string;
    professional_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    break_start: string | null;
    break_end: string | null;
    is_active: boolean;
}

export interface TimeBlock {
    id: string;
    business_id: string;
    professional_id: string | null;
    start_datetime: string;
    end_datetime: string;
    reason: string | null;
    block_type: string;
}

export interface TimeSlot {
    time: string;
    available: boolean;
    reason?: string;
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Converte string de tempo "HH:mm" para minutos desde meia-noite
 */
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Converte minutos desde meia-noite para string "HH:mm"
 */
function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Gera array de slots de tempo entre start e end
 */
function generateTimeSlots(
    startTime: string,
    endTime: string,
    slotDuration: number,
    breakStart?: string | null,
    breakEnd?: string | null
): string[] {
    const slots: string[] = [];
    const startMinutes = timeToMinutes(startTime);
    let endMinutes = timeToMinutes(endTime);

    // Handle midnight (00:00) as end of day (24:00 = 1440 minutes)
    if (endMinutes === 0 || endMinutes <= startMinutes) {
        endMinutes = 1440; // 24:00 = midnight = end of day
    }

    const breakStartMinutes = breakStart ? timeToMinutes(breakStart) : null;
    const breakEndMinutes = breakEnd ? timeToMinutes(breakEnd) : null;

    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
        // Pular horário de intervalo
        if (breakStartMinutes && breakEndMinutes) {
            if (minutes >= breakStartMinutes && minutes < breakEndMinutes) {
                continue;
            }
        }

        slots.push(minutesToTime(minutes));
    }

    return slots;
}

// =====================================================
// MAIN FUNCTIONS
// =====================================================

/**
 * Busca as configurações de agendamento do negócio
 */
export async function getBookingSettings(businessId: string): Promise<BookingSettings | null> {
    const { data, error } = await supabase
        .from('businesses')
        .select('booking_settings')
        .eq('id', businessId)
        .single();

    if (error || !data) {
        console.error('Error fetching booking settings:', error);
        return null;
    }

    return data.booking_settings as BookingSettings;
}

/**
 * Busca a disponibilidade de um profissional para um dia da semana
 */
export async function getProfessionalAvailability(
    professionalId: string,
    dayOfWeek: number
): Promise<ProfessionalAvailability | null> {
    const { data, error } = await supabase
        .from('professional_availability')
        .select('*')
        .eq('professional_id', professionalId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_active', true)
        .single();

    if (error) {
        console.error('Error fetching professional availability:', error);
        return null;
    }

    return data;
}

/**
 * Busca bloqueios de tempo para uma data específica
 */
export async function getTimeBlocks(
    businessId: string,
    professionalId: string,
    date: string
): Promise<TimeBlock[]> {
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data, error } = await supabase
        .from('time_blocks')
        .select('*')
        .eq('business_id', businessId)
        .or(`professional_id.is.null,professional_id.eq.${professionalId}`)
        .lte('start_datetime', endOfDay)
        .gte('end_datetime', startOfDay);

    if (error) {
        console.error('Error fetching time blocks:', error);
        return [];
    }

    return data || [];
}

/**
 * Busca agendamentos existentes para um profissional em uma data
 */
export async function getExistingAppointments(
    professionalId: string,
    date: string
): Promise<any[]> {
    // Appointments use start_datetime in ISO format, not separate date/time columns
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const { data, error } = await supabase
        .from('appointments')
        .select('*, services(duration_minutes)')
        .eq('professional_id', professionalId)
        .gte('start_datetime', startOfDay)
        .lte('start_datetime', endOfDay)
        .in('status', ['pending', 'confirmed']);

    if (error) {
        console.error('Error fetching appointments:', error);
        return [];
    }

    // Transform to expected format with time and duration_minutes
    return (data || []).map(apt => ({
        ...apt,
        time: apt.start_datetime ? apt.start_datetime.substring(11, 16) : '00:00',
        duration_minutes: apt.services?.duration_minutes || apt.duration_minutes || 60
    }));
}

/**
 * Verifica se um horário específico está bloqueado
 */
function isTimeBlocked(
    time: string,
    date: string,
    timeBlocks: TimeBlock[]
): boolean {
    const checkDateTime = new Date(`${date}T${time}:00`);

    return timeBlocks.some(block => {
        const blockStart = new Date(block.start_datetime);
        const blockEnd = new Date(block.end_datetime);
        return isWithinInterval(checkDateTime, { start: blockStart, end: blockEnd });
    });
}

/**
 * Verifica se um horário tem conflito com agendamentos existentes
 */
function hasAppointmentConflict(
    time: string,
    durationMinutes: number,
    bufferMinutes: number,
    existingAppointments: any[]
): boolean {
    const slotStart = timeToMinutes(time);
    const slotEnd = slotStart + durationMinutes + bufferMinutes;

    return existingAppointments.some(apt => {
        const aptStart = timeToMinutes(apt.time);
        const aptEnd = aptStart + (apt.duration_minutes || 60) + bufferMinutes;

        // Verifica se há sobreposição
        return (slotStart < aptEnd && slotEnd > aptStart);
    });
}

/**
 * Calcula os slots disponíveis para um profissional em uma data
 */
export async function getAvailableSlots(
    businessId: string,
    professionalId: string,
    date: string,
    serviceDurationMinutes: number
): Promise<TimeSlot[]> {
    console.log(`🔍 getAvailableSlots: businessId=${businessId}, professionalId=${professionalId}, date=${date}, duration=${serviceDurationMinutes}`);

    // 1. Buscar configurações do negócio
    const settings = await getBookingSettings(businessId);
    if (!settings) {
        console.log('❌ No booking settings found');
        return [];
    }
    console.log('📋 Settings:', settings);

    // 2. Verificar se a data está dentro do período permitido
    const now = new Date();
    const targetDate = new Date(date + 'T00:00:00'); // Force local midnight
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const maxDate = new Date(todayStart);
    maxDate.setDate(maxDate.getDate() + settings.max_advance_days);

    // Para o mesmo dia, verificar se ainda há tempo suficiente (min_advance_hours)
    const isSameDay = targetDate.getTime() === todayStart.getTime();
    if (isSameDay && settings.min_advance_hours > 0) {
        // Só bloqueia se NÃO houver horários possíveis após agora + min_advance_hours
        // A verificação de horário individual vai filtrar os slots
    }

    console.log(`📅 Date check: targetDate=${targetDate.toDateString()}, today=${todayStart.toDateString()}, maxDate=${maxDate.toDateString()}, isSameDay=${isSameDay}`);

    // Verificar apenas se a data está no futuro (ou hoje) e dentro do limite máximo
    if (targetDate < todayStart || targetDate > maxDate) {
        console.log('❌ Date is outside allowed range');
        return [];
    }

    // 3. Buscar horário de funcionamento do estabelecimento
    const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('business_hours')
        .eq('id', businessId)
        .single();

    if (businessError || !business) {
        return [];
    }

    const dayOfWeek = targetDate.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayNames[dayOfWeek];
    const businessHours = business.business_hours?.[dayKey];
    console.log(`🏪 Business hours for ${dayKey}:`, businessHours);

    // Se o estabelecimento está fechado neste dia
    if (!businessHours || businessHours.closed) {
        console.log('❌ Business is closed on this day');
        return [];
    }

    // 4. Buscar disponibilidade do profissional para o dia da semana
    console.log(`👤 Fetching availability for professional ${professionalId} on day ${dayOfWeek}`);
    const availability = await getProfessionalAvailability(professionalId, dayOfWeek);
    console.log('👤 Professional availability:', availability);

    if (!availability) {
        console.log('❌ No availability found for professional on this day');
        return [];
    }

    // 5. Calcular horário efetivo (interseção entre estabelecimento e profissional)
    const businessOpen = businessHours.open;
    const businessClose = businessHours.close;
    const professionalStart = availability.start_time;
    const professionalEnd = availability.end_time;

    // Usar o horário mais restritivo
    const effectiveStart = timeToMinutes(professionalStart) > timeToMinutes(businessOpen)
        ? professionalStart
        : businessOpen;
    const effectiveEnd = timeToMinutes(professionalEnd) < timeToMinutes(businessClose)
        ? professionalEnd
        : businessClose;

    // Se não há interseção válida
    if (timeToMinutes(effectiveStart) >= timeToMinutes(effectiveEnd)) {
        return [];
    }

    // 6. Buscar buffer do profissional
    const { data: professional } = await supabase
        .from('professionals')
        .select('custom_buffer, buffer_minutes')
        .eq('id', professionalId)
        .single();

    const bufferMinutes = professional?.custom_buffer
        ? (professional.buffer_minutes || 15)
        : (settings.buffer_minutes || 15);

    // 7. Gerar slots base (usando horário efetivo)
    const baseSlots = generateTimeSlots(
        effectiveStart,
        effectiveEnd,
        settings.slot_duration_minutes,
        availability.break_start,
        availability.break_end
    );

    // 8. Buscar bloqueios e agendamentos
    const [timeBlocks, existingAppointments] = await Promise.all([
        getTimeBlocks(businessId, professionalId, date),
        getExistingAppointments(professionalId, date)
    ]);

    // Calcular horário mínimo para hoje (agora + min_advance_hours)
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const minAdvanceMinutes = settings.min_advance_hours * 60;
    const isToday = targetDate.getTime() === todayStart.getTime();

    // 9. Verificar disponibilidade de cada slot
    const slots: TimeSlot[] = baseSlots.map(time => {
        const slotMinutes = timeToMinutes(time);

        // Para hoje, excluir horários passados ou muito próximos
        if (isToday && slotMinutes < currentMinutes + minAdvanceMinutes) {
            return { time, available: false, reason: 'Horário passado' };
        }

        // Verificar se está bloqueado
        if (isTimeBlocked(time, date, timeBlocks)) {
            return { time, available: false, reason: 'Horário bloqueado' };
        }

        // Verificar conflito com agendamentos (usando buffer do profissional)
        if (hasAppointmentConflict(time, serviceDurationMinutes, bufferMinutes, existingAppointments)) {
            return { time, available: false, reason: 'Horário ocupado' };
        }

        // Verificar se o serviço cabe antes do fim do expediente ou intervalo
        const endMinutes = timeToMinutes(effectiveEnd);
        const breakStartMinutes = availability.break_start ? timeToMinutes(availability.break_start) : null;

        if (slotMinutes + serviceDurationMinutes > endMinutes) {
            return { time, available: false, reason: 'Serviço não cabe no horário' };
        }

        if (breakStartMinutes && slotMinutes + serviceDurationMinutes > breakStartMinutes) {
            const breakEndMinutes = availability.break_end ? timeToMinutes(availability.break_end) : breakStartMinutes;
            if (slotMinutes < breakEndMinutes) {
                return { time, available: false, reason: 'Conflito com intervalo' };
            }
        }

        return { time, available: true };
    });

    return slots.filter(slot => slot.available);
}

/**
 * Verifica se um horário específico está disponível
 */
export async function isSlotAvailable(
    businessId: string,
    professionalId: string,
    date: string,
    time: string,
    durationMinutes: number
): Promise<{ available: boolean; reason?: string }> {
    const slots = await getAvailableSlots(businessId, professionalId, date, durationMinutes);
    const slot = slots.find(s => s.time === time);

    if (!slot) {
        return { available: false, reason: 'Horário não encontrado' };
    }

    return { available: slot.available, reason: slot.reason };
}

/**
 * Cria um agendamento público (usado pelo WhatsApp bot e link público)
 */
export async function createPublicAppointment(
    businessId: string,
    appointmentData: {
        professional_id: string;
        service_id: string;
        client_name: string;
        client_phone: string;
        client_email?: string;
        date: string;
        time: string;
        notes?: string;
    }
): Promise<{ success: boolean; appointmentId?: string; error?: string }> {
    try {
        // 1. Buscar informações do serviço
        const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('duration_minutes, price')
            .eq('id', appointmentData.service_id)
            .single();

        if (serviceError || !service) {
            return { success: false, error: 'Serviço não encontrado' };
        }

        // 2. Verificar disponibilidade
        const availability = await isSlotAvailable(
            businessId,
            appointmentData.professional_id,
            appointmentData.date,
            appointmentData.time,
            service.duration_minutes
        );

        if (!availability.available) {
            return { success: false, error: availability.reason || 'Horário não disponível' };
        }

        // 3. Buscar ou criar cliente
        let clientId: string | null = null;

        const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq('business_id', businessId)
            .eq('phone', appointmentData.client_phone)
            .single();

        if (existingClient) {
            clientId = existingClient.id;
        } else {
            const { data: newClient, error: clientError } = await supabase
                .from('clients')
                .insert({
                    business_id: businessId,
                    name: appointmentData.client_name,
                    phone: appointmentData.client_phone,
                    email: appointmentData.client_email
                })
                .select('id')
                .single();

            if (clientError || !newClient) {
                console.error('Error creating client:', clientError);
                // Continuar sem client_id
            } else {
                clientId = newClient.id;
            }
        }

        // 4. Criar agendamento
        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert({
                business_id: businessId,
                client_id: clientId,
                professional_id: appointmentData.professional_id,
                service_id: appointmentData.service_id,
                date: appointmentData.date,
                time: appointmentData.time,
                status: 'pending',
                payment_status: 'pending',
                amount_paid: service.price,
                notes: appointmentData.notes
            })
            .select('id')
            .single();

        if (appointmentError || !appointment) {
            console.error('Error creating appointment:', appointmentError);
            return { success: false, error: 'Erro ao criar agendamento' };
        }

        return { success: true, appointmentId: appointment.id };

    } catch (error) {
        console.error('Error in createPublicAppointment:', error);
        return { success: false, error: 'Erro interno do servidor' };
    }
}

/**
 * OTIMIZADO: Busca slots disponíveis para TODOS os profissionais de uma vez
 * Reduz ~30 queries para ~5 queries
 */
export async function getAvailableSlotsForAllProfessionals(
    businessId: string,
    professionalIds: string[],
    date: string,
    serviceDurationMinutes: number
): Promise<string[]> {
    const startTime = performance.now();
    console.log(`🚀 [BATCH] Starting optimized slot fetch for ${professionalIds.length} professionals`);

    if (professionalIds.length === 0) return [];

    // 1. Buscar TODAS as configurações necessárias em paralelo (apenas 5 queries)
    const now = new Date();
    const targetDate = new Date(date + 'T00:00:00');
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = targetDate.getDay();
    const startOfDay = `${date}T00:00:00`;
    const endOfDay = `${date}T23:59:59`;

    const [
        businessResult,
        availabilityResult,
        professionalsResult,
        appointmentsResult,
        blocksResult
    ] = await Promise.all([
        // Query 1: Business settings and hours
        supabase
            .from('businesses')
            .select('booking_settings, business_hours')
            .eq('id', businessId)
            .single(),

        // Query 2: All professional availabilities for this day
        supabase
            .from('professional_availability')
            .select('*')
            .in('professional_id', professionalIds)
            .eq('day_of_week', dayOfWeek)
            .eq('is_active', true),

        // Query 3: All professionals (for buffer settings)
        supabase
            .from('professionals')
            .select('id, custom_buffer, buffer_minutes')
            .in('id', professionalIds),

        // Query 4: All appointments for this day
        supabase
            .from('appointments')
            .select('*, services(duration_minutes)')
            .in('professional_id', professionalIds)
            .gte('start_datetime', startOfDay)
            .lte('start_datetime', endOfDay)
            .in('status', ['pending', 'confirmed']),

        // Query 5: All time blocks for this day
        supabase
            .from('time_blocks')
            .select('*')
            .eq('business_id', businessId)
            .or(`professional_id.is.null,professional_id.in.(${professionalIds.join(',')})`)
            .lte('start_datetime', endOfDay)
            .gte('end_datetime', startOfDay)
    ]);

    const queryTime = performance.now() - startTime;
    console.log(`⚡ [BATCH] All queries completed in ${queryTime.toFixed(0)}ms`);

    // Validate essential data
    if (businessResult.error || !businessResult.data) {
        console.error('Business fetch error:', businessResult.error);
        return [];
    }

    const settings = businessResult.data.booking_settings as BookingSettings;
    if (!settings) {
        console.error('No booking settings found');
        return [];
    }

    // Check date range
    const maxDate = new Date(todayStart);
    maxDate.setDate(maxDate.getDate() + settings.max_advance_days);
    if (targetDate < todayStart || targetDate > maxDate) {
        return [];
    }

    // Get business hours for this day
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayNames[dayOfWeek];
    const businessHours = businessResult.data.business_hours?.[dayKey];

    if (!businessHours || businessHours.closed) {
        return [];
    }

    // Create lookup maps for O(1) access
    const availabilityMap = new Map<string, ProfessionalAvailability>();
    (availabilityResult.data || []).forEach(a => availabilityMap.set(a.professional_id, a));

    const professionalBufferMap = new Map<string, number>();
    (professionalsResult.data || []).forEach(p => {
        const buffer = p.custom_buffer ? (p.buffer_minutes || 15) : (settings.buffer_minutes || 15);
        professionalBufferMap.set(p.id, buffer);
    });

    const appointmentsByProf = new Map<string, any[]>();
    (appointmentsResult.data || []).forEach(apt => {
        const list = appointmentsByProf.get(apt.professional_id) || [];
        list.push({
            ...apt,
            time: apt.start_datetime ? apt.start_datetime.substring(11, 16) : '00:00',
            duration_minutes: apt.services?.duration_minutes || apt.duration_minutes || 60
        });
        appointmentsByProf.set(apt.professional_id, list);
    });

    const blocksByProf = new Map<string, TimeBlock[]>();
    (blocksResult.data || []).forEach(block => {
        if (block.professional_id) {
            const list = blocksByProf.get(block.professional_id) || [];
            list.push(block);
            blocksByProf.set(block.professional_id, list);
        }
    });

    // Calculate time constraints
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const minAdvanceMinutes = settings.min_advance_hours * 60;
    const isToday = targetDate.getTime() === todayStart.getTime();

    // Process each professional and collect available slots
    const allAvailableSlots = new Set<string>();

    for (const profId of professionalIds) {
        const availability = availabilityMap.get(profId);
        if (!availability) continue;

        // Calculate effective hours (intersection of business and professional)
        const businessOpen = businessHours.open;
        const businessClose = businessHours.close;
        const profStart = availability.start_time;
        const profEnd = availability.end_time;

        const effectiveStart = timeToMinutes(profStart) > timeToMinutes(businessOpen)
            ? profStart : businessOpen;
        let effectiveEndMinutes = timeToMinutes(profEnd) < timeToMinutes(businessClose)
            ? timeToMinutes(profEnd) : timeToMinutes(businessClose);

        // Handle midnight
        if (effectiveEndMinutes === 0) effectiveEndMinutes = 1440;

        if (timeToMinutes(effectiveStart) >= effectiveEndMinutes) continue;

        const effectiveEnd = minutesToTime(effectiveEndMinutes);

        // Generate base slots
        const baseSlots = generateTimeSlots(
            effectiveStart,
            effectiveEnd,
            settings.slot_duration_minutes,
            availability.break_start,
            availability.break_end
        );

        const bufferMinutes = professionalBufferMap.get(profId) || 15;
        const appointments = appointmentsByProf.get(profId) || [];
        const blocks = blocksByProf.get(profId) || [];

        // Check each slot
        for (const time of baseSlots) {
            const slotMinutes = timeToMinutes(time);

            // Skip past or too-close times for today
            if (isToday && slotMinutes < currentMinutes + minAdvanceMinutes) continue;

            // Check if blocked
            const checkDateTime = new Date(`${date}T${time}:00`);
            const isBlocked = blocks.some(block => {
                const blockStart = new Date(block.start_datetime);
                const blockEnd = new Date(block.end_datetime);
                return checkDateTime >= blockStart && checkDateTime < blockEnd;
            });
            if (isBlocked) continue;

            // Check appointment conflicts
            let hasConflict = false;
            const slotEnd = slotMinutes + serviceDurationMinutes + bufferMinutes;
            for (const apt of appointments) {
                const aptStart = timeToMinutes(apt.time);
                const aptEnd = aptStart + (apt.duration_minutes || 60) + bufferMinutes;
                if (slotMinutes < aptEnd && slotEnd > aptStart) {
                    hasConflict = true;
                    break;
                }
            }
            if (hasConflict) continue;

            // Check if service fits before end of day
            if (slotMinutes + serviceDurationMinutes > effectiveEndMinutes) continue;

            // Check if service fits before break
            if (availability.break_start) {
                const breakStartMinutes = timeToMinutes(availability.break_start);
                const breakEndMinutes = availability.break_end
                    ? timeToMinutes(availability.break_end)
                    : breakStartMinutes;
                if (slotMinutes + serviceDurationMinutes > breakStartMinutes && slotMinutes < breakEndMinutes) {
                    continue;
                }
            }

            // Slot is available!
            allAvailableSlots.add(time);
        }
    }

    const totalTime = performance.now() - startTime;
    console.log(`✅ [BATCH] Completed in ${totalTime.toFixed(0)}ms - Found ${allAvailableSlots.size} unique slots`);

    return Array.from(allAvailableSlots).sort();
}
