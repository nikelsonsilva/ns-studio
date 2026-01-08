import { supabase } from './supabase';
import { format, addMinutes, parse, isWithinInterval, isBefore, isAfter } from 'date-fns';
import { getNowInBrazil, getCurrentTimeBrazil, getStartOfDayBrazil } from './timezone';

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
    // [LOG REMOVED]

    // 1. Buscar configurações do negócio
    const settings = await getBookingSettings(businessId);
    if (!settings) {
        // [LOG REMOVED]
        return [];
    }
    // [LOG REMOVED]

    // 2. Verificar se a data está dentro do período permitido
    // Usar timezone do Brasil para cálculos de data
    const now = getNowInBrazil();
    const targetDate = new Date(date + 'T00:00:00'); // Force local midnight
    const todayStart = getStartOfDayBrazil();
    const maxDate = new Date(todayStart);
    maxDate.setDate(maxDate.getDate() + settings.max_advance_days);

    // Para o mesmo dia, verificar se ainda há tempo suficiente (min_advance_hours)
    const isSameDay = targetDate.getTime() === todayStart.getTime();
    if (isSameDay && settings.min_advance_hours > 0) {
        // Só bloqueia se NÃO houver horários possíveis após agora + min_advance_hours
        // A verificação de horário individual vai filtrar os slots
    }

    // [LOG REMOVED]

    // Verificar apenas se a data está no futuro (ou hoje) e dentro do limite máximo
    if (targetDate < todayStart || targetDate > maxDate) {
        // [LOG REMOVED]
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
    // [LOG REMOVED]

    // Se o estabelecimento está fechado neste dia
    if (!businessHours || businessHours.closed) {
        // [LOG REMOVED]
        return [];
    }

    // 4. Buscar work_schedule do profissional (campo JSONB na tabela professionals)
    // IMPORTANTE: Usar work_schedule igual ao Calendar.tsx para sincronização
    // [LOG REMOVED]
    const { data: professional, error: profError } = await supabase
        .from('professionals')
        .select('work_schedule')
        .eq('id', professionalId)
        .single();

    // 5. Calcular horário efetivo (interseção entre estabelecimento e profissional)
    const businessOpen = businessHours.open;
    const businessClose = businessHours.close;

    // FALLBACK: Se o profissional não tem work_schedule configurado, usar horário do estabelecimento
    let professionalStart: string;
    let professionalEnd: string;
    let breakStart: string | null = null;
    let breakEnd: string | null = null;

    const workSchedule = professional?.work_schedule as any[] || [];
    const daySchedule = workSchedule.find(s => s.dayOfWeek === dayOfWeek && s.active);

    if (daySchedule) {
        // [LOG REMOVED]
        professionalStart = daySchedule.startTime;
        professionalEnd = daySchedule.endTime;
        breakStart = daySchedule.breakStart || null;
        breakEnd = daySchedule.breakEnd || null;
    } else if (workSchedule.length > 0) {
        // Has schedule but not active on this day = day off
        // [LOG REMOVED]
        return [];
    } else {
        // No schedule at all = use business hours
        // [LOG REMOVED]
        professionalStart = businessOpen;
        professionalEnd = businessClose;
    }

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

    // 6. Buscar buffer do profissional (já temos professional da query anterior, vamos buscar buffer separadamente)
    const { data: profBuffer } = await supabase
        .from('professionals')
        .select('custom_buffer, buffer_minutes')
        .eq('id', professionalId)
        .single();

    const bufferMinutes = profBuffer?.custom_buffer
        ? (profBuffer.buffer_minutes || 15)
        : (settings.buffer_minutes || 15);

    // 7. Gerar slots base (usando horário efetivo)
    // IMPORTANT: Always use 60 min slots to sync with internal Calendar view
    const baseSlots = generateTimeSlots(
        effectiveStart,
        effectiveEnd,
        60, // Fixed 60-min slots to match Calendar.tsx
        breakStart,
        breakEnd
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

        // Para hoje, excluir apenas horários passados (sincronizado com Calendar.tsx)
        // NOTA: min_advance_hours não é aplicado para sincronizar com a Agenda interna
        if (isToday && slotMinutes < currentMinutes) {
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

        // NOTA: Não verificamos mais se o serviço cabe antes do fim do expediente
        // para sincronizar com o Calendar.tsx que também não faz essa verificação.
        // O profissional pode ajustar o horário de término se necessário.

        // Verificar apenas conflito com intervalo
        const breakStartMinutes = breakStart ? timeToMinutes(breakStart) : null;
        if (breakStartMinutes && slotMinutes + serviceDurationMinutes > breakStartMinutes) {
            const breakEndMinutes = breakEnd ? timeToMinutes(breakEnd) : breakStartMinutes;
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
 * SIMPLIFIED: Checks basic availability without strict slot matching
 */
export async function isSlotAvailable(
    businessId: string,
    professionalId: string,
    date: string,
    time: string,
    durationMinutes: number
): Promise<{ available: boolean; reason?: string }> {
    try {
        // 1. Get professional availability from professional_availability table
        const targetDate = new Date(date + 'T00:00:00');
        const dayOfWeek = targetDate.getDay();

        const { data: availability } = await supabase
            .from('professional_availability')
            .select('start_time, end_time, break_start, break_end, is_active')
            .eq('professional_id', professionalId)
            .eq('day_of_week', dayOfWeek)
            .single();

        // Check if professional works on this day
        if (!availability || !availability.is_active) {
            return { available: false, reason: 'Profissional não trabalha neste dia' };
        }

        // 2. Check if time is within professional's work hours
        const timeMinutes = timeToMinutes(time);
        const startMinutes = timeToMinutes(availability.start_time);
        let endMinutes = timeToMinutes(availability.end_time);
        if (endMinutes === 0) endMinutes = 1440;

        if (timeMinutes < startMinutes || timeMinutes + durationMinutes > endMinutes) {
            return { available: false, reason: 'Fora do horário de trabalho do profissional' };
        }

        // 3. Check if it overlaps with break
        if (availability.break_start && availability.break_end) {
            const breakStartMinutes = timeToMinutes(availability.break_start);
            const breakEndMinutes = timeToMinutes(availability.break_end);
            if (timeMinutes < breakEndMinutes && timeMinutes + durationMinutes > breakStartMinutes) {
                return { available: false, reason: 'Conflito com horário de intervalo' };
            }
        }

        // 4. Check for conflicting appointments
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;

        const { data: appointments } = await supabase
            .from('appointments')
            .select('start_datetime, duration_minutes')
            .eq('professional_id', professionalId)
            .gte('start_datetime', startOfDay)
            .lte('start_datetime', endOfDay)
            .in('status', ['pending', 'confirmed']);

        for (const apt of (appointments || [])) {
            const aptTime = apt.start_datetime.substring(11, 16);
            const aptStartMinutes = timeToMinutes(aptTime);
            const aptEndMinutes = aptStartMinutes + (apt.duration_minutes || 60);

            if (timeMinutes < aptEndMinutes && timeMinutes + durationMinutes > aptStartMinutes) {
                return { available: false, reason: 'Horário ocupado' };
            }
        }

        // 5. Check for time blocks
        const { data: blocks } = await supabase
            .from('time_blocks')
            .select('start_datetime, end_datetime')
            .eq('business_id', businessId)
            .or(`professional_id.is.null,professional_id.eq.${professionalId}`)
            .lte('start_datetime', endOfDay)
            .gte('end_datetime', startOfDay);

        const checkDateTime = new Date(`${date}T${time}:00`);
        for (const block of (blocks || [])) {
            const blockStart = new Date(block.start_datetime);
            const blockEnd = new Date(block.end_datetime);
            if (checkDateTime >= blockStart && checkDateTime < blockEnd) {
                return { available: false, reason: 'Horário bloqueado' };
            }
        }

        return { available: true };
    } catch (error) {
        console.error('Error in isSlotAvailable:', error);
        return { available: true }; // Default to available on error to not block bookings
    }
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
                    email: appointmentData.client_email,
                    source: 'public_link' // Cliente criado via link público
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
        // Calculate start_datetime and end_datetime from date + time + duration
        const startDateTime = new Date(`${appointmentData.date}T${appointmentData.time}:00`);
        const endDateTime = new Date(startDateTime.getTime() + service.duration_minutes * 60 * 1000);

        const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .insert({
                business_id: businessId,
                client_id: clientId,
                professional_id: appointmentData.professional_id,
                service_id: appointmentData.service_id,
                start_datetime: startDateTime.toISOString(),
                end_datetime: endDateTime.toISOString(),
                duration_minutes: service.duration_minutes,
                status: 'pending',
                payment_status: 'pending',
                amount_paid: service.price,
                notes: appointmentData.notes,
                customer_name: appointmentData.client_name, // Nome do cliente para exibição
                source: 'public_link' // Agendamento feito pelo link público
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
    // [LOG REMOVED]

    if (professionalIds.length === 0) return [];

    // 1. Buscar TODAS as configurações necessárias em paralelo (apenas 5 queries)
    // Usar timezone do Brasil para cálculos
    const now = getNowInBrazil();
    const targetDate = new Date(date + 'T00:00:00');
    const todayStart = getStartOfDayBrazil();
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

        // Query 2: All professionals with work_schedule and buffer settings (replaces old professional_availability query)
        supabase
            .from('professionals')
            .select('id, work_schedule, custom_buffer, buffer_minutes')
            .in('id', professionalIds),

        // Query 3: REMOVED - consolidated into Query 2
        Promise.resolve({ data: null, error: null }),

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
    // [LOG REMOVED]

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
    // NEW: Build schedule map from work_schedule field in professionals table
    interface WorkDay {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        breakStart?: string;
        breakEnd?: string;
        active: boolean;
    }

    const workScheduleMap = new Map<string, WorkDay | null>();
    const professionalBufferMap = new Map<string, number>();

    // availabilityResult now contains professionals with work_schedule
    (availabilityResult.data || []).forEach((p: any) => {
        // Extract schedule for this day of week
        const workSchedule = p.work_schedule as WorkDay[] || [];
        const daySchedule = workSchedule.find(s => s.dayOfWeek === dayOfWeek && s.active);

        if (daySchedule) {
            workScheduleMap.set(p.id, daySchedule);
        } else if (workSchedule.length > 0) {
            // Has schedule but not active = day off
            workScheduleMap.set(p.id, null); // null = day off
        }
        // If no schedule at all, don't set (will use business hours fallback)

        // Buffer settings
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
        const daySchedule = workScheduleMap.get(profId);

        // If explicitly marked as day off (schedule exists but day inactive)
        if (daySchedule === null) {
            // [LOG REMOVED]
            continue;
        }

        // FALLBACK: Use business hours if professional has no work_schedule configured
        const businessOpen = businessHours.open;
        const businessClose = businessHours.close;
        let profStart: string;
        let profEnd: string;
        let breakStart: string | null = null;
        let breakEnd: string | null = null;

        if (daySchedule) {
            profStart = daySchedule.startTime;
            profEnd = daySchedule.endTime;
            breakStart = daySchedule.breakStart || null;
            breakEnd = daySchedule.breakEnd || null;
        } else {
            // No schedule at all = use business hours
            // [LOG REMOVED]
            profStart = businessOpen;
            profEnd = businessClose;
        }

        const effectiveStart = timeToMinutes(profStart) > timeToMinutes(businessOpen)
            ? profStart : businessOpen;
        let effectiveEndMinutes = timeToMinutes(profEnd) < timeToMinutes(businessClose)
            ? timeToMinutes(profEnd) : timeToMinutes(businessClose);

        // Handle midnight
        if (effectiveEndMinutes === 0) effectiveEndMinutes = 1440;

        if (timeToMinutes(effectiveStart) >= effectiveEndMinutes) continue;

        const effectiveEnd = minutesToTime(effectiveEndMinutes);

        // Generate base slots - ALWAYS use 60 min to sync with Calendar.tsx
        const slotDuration = 60; // Fixed 60-min slots to match Calendar.tsx
        const baseSlots = generateTimeSlots(
            effectiveStart,
            effectiveEnd,
            slotDuration,
            breakStart,
            breakEnd
        );

        const bufferMinutes = professionalBufferMap.get(profId) || 15;
        const appointments = appointmentsByProf.get(profId) || [];
        const blocks = blocksByProf.get(profId) || [];

        // Check each slot
        for (const time of baseSlots) {
            const slotMinutes = timeToMinutes(time);

            // Skip only past times for today (synced with Calendar.tsx)
            // NOTE: min_advance_hours is NOT applied to sync with internal Agenda
            if (isToday && slotMinutes < currentMinutes) continue;

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

            // NOTE: Removed service duration check to sync with Calendar.tsx
            // The calendar doesn't block slots based on service duration.

            // Check if service fits before break only
            if (breakStart) {
                const breakStartMinutes = timeToMinutes(breakStart);
                const breakEndMinutes = breakEnd
                    ? timeToMinutes(breakEnd)
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
    // [LOG REMOVED]

    return Array.from(allAvailableSlots).sort();
}
