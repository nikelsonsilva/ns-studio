/**
 * availabilityNow.ts - Serviço para calcular disponibilidade em tempo real
 * "Quem tá livre agora?" feature
 */
import { supabase } from './supabase';

export interface ProfessionalAvailableNow {
    professionalId: string;
    name: string;
    avatarUrl?: string;
    freeFrom: Date;
    freeUntil: Date;
    freeMinutes: number;
    services: Array<{ id: string; name: string }>;
}

interface Appointment {
    id: string;
    professional_id: string;
    start_datetime: string;
    end_datetime: string;
    status: string;
}

interface TimeBlock {
    id: string;
    professional_id: string;
    start_datetime: string;
    end_datetime: string;
}

interface ProfessionalAvailability {
    professional_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    break_start: string | null;
    break_end: string | null;
    is_active: boolean;
}

interface Professional {
    id: string;
    name: string;
    avatar_url?: string;
    is_active: boolean;
}

interface ProfessionalService {
    professional_id: string;
    service_id: string;
    services: { id: string; name: string };
}

/**
 * Converte horário HH:MM para minutos desde meia-noite
 */
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Converte minutos desde meia-noite para HH:MM
 */
function minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Busca profissionais disponíveis AGORA
 * @param businessId ID do negócio
 * @param serviceId (opcional) Filtrar por serviço específico
 * @param minDuration (opcional) Duração mínima em minutos (padrão 15)
 */
export async function getProfessionalsAvailableNow(
    businessId: string,
    serviceId?: string,
    minDuration: number = 15
): Promise<ProfessionalAvailableNow[]> {
    try {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = domingo
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const currentMinutes = timeToMinutes(currentTime);

        // Data de hoje no formato ISO para queries
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        // 1. Buscar profissionais ativos (incluindo campos de buffer)
        const { data: professionals, error: profError } = await supabase
            .from('professionals')
            .select('id, name, avatar_url, is_active, buffer_minutes, custom_buffer')
            .eq('business_id', businessId)
            .eq('is_active', true);

        if (profError || !professionals || professionals.length === 0) {
            console.error('Error fetching professionals:', profError);
            return [];
        }

        // 1.5 Buscar horário de funcionamento e configurações do negócio
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('business_hours, booking_settings')
            .eq('id', businessId)
            .single();

        if (businessError) {
            console.error('Error fetching business hours:', businessError);
        }

        // Buffer global da empresa (padrão: 60 minutos se não definido)
        const globalBufferMinutes = business?.booking_settings?.buffer_minutes || 60;

        // Mapear dias da semana para chaves do business_hours
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayKey = dayNames[dayOfWeek];
        const businessDay = business?.business_hours?.[todayKey as keyof typeof business.business_hours] as { open: string; close: string; closed: boolean } | undefined;

        // Se o negócio está fechado hoje, nenhum profissional está disponível
        if (businessDay?.closed) {
            console.log('Business is closed today');
            return [];
        }

        // Obter horário de fechamento do negócio
        const businessCloseMinutes = businessDay ? timeToMinutes(businessDay.close) : 1440; // 24:00 como fallback
        const businessOpenMinutes = businessDay ? timeToMinutes(businessDay.open) : 0;

        // 2. Buscar disponibilidade (horários) dos profissionais para hoje
        const { data: availabilities, error: availError } = await supabase
            .from('professional_availability')
            .select('*')
            .in('professional_id', professionals.map(p => p.id))
            .eq('day_of_week', dayOfWeek)
            .eq('is_active', true);

        if (availError) {
            console.error('Error fetching availability:', availError);
            return [];
        }

        // 3. Buscar agendamentos de hoje (apenas ativos)
        const { data: appointments, error: apptError } = await supabase
            .from('appointments')
            .select('id, professional_id, start_datetime, end_datetime, status')
            .eq('business_id', businessId)
            .gte('start_datetime', todayStart.toISOString())
            .lte('start_datetime', todayEnd.toISOString())
            .not('status', 'in', '("cancelled","no_show")');

        if (apptError) {
            console.error('Error fetching appointments:', apptError);
            return [];
        }

        // 4. Buscar bloqueios de hoje
        const { data: blocks, error: blockError } = await supabase
            .from('time_blocks')
            .select('id, professional_id, start_datetime, end_datetime')
            .gte('start_datetime', todayStart.toISOString())
            .lte('start_datetime', todayEnd.toISOString());

        if (blockError) {
            console.error('Error fetching blocks:', blockError);
        }

        // 5. Buscar serviços (para todo o negócio, não por profissional - tabela professional_services não existe)
        // NOTA: Se a tabela professional_services for criada no futuro, descomentar o código abaixo
        /*
        const { data: profServices, error: psError } = await supabase
            .from('professional_services')
            .select('professional_id, service_id, services(id, name)')
            .in('professional_id', professionals.map(p => p.id));

        if (psError) {
            console.error('Error fetching professional services:', psError);
        }
        */

        // Por enquanto, buscar todos os serviços do negócio
        const { data: allServices } = await supabase
            .from('services')
            .select('id, name')
            .eq('business_id', businessId)
            .eq('is_active', true);

        // Criar mapa de serviços por profissional (todos profissionais oferecem todos serviços)
        const servicesByProfessional: Record<string, Array<{ id: string; name: string }>> = {};
        professionals.forEach(p => {
            servicesByProfessional[p.id] = allServices || [];
        });

        // 6. Calcular disponibilidade para cada profissional
        const availableNow: ProfessionalAvailableNow[] = [];

        for (const prof of professionals) {
            // Verificar se tem horário configurado para hoje
            const todayAvail = (availabilities || []).find(
                (a: ProfessionalAvailability) => a.professional_id === prof.id
            );

            if (!todayAvail) {
                continue; // Profissional não trabalha hoje
            }

            const startMinutes = timeToMinutes(todayAvail.start_time);
            const endMinutes = timeToMinutes(todayAvail.end_time);

            // Verificar se está dentro do expediente do profissional
            if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
                continue; // Fora do expediente do profissional
            }

            // Verificar se está fora do horário de funcionamento do negócio
            if (currentMinutes < businessOpenMinutes || currentMinutes >= businessCloseMinutes) {
                continue; // Fora do horário do negócio
            }

            // Verificar se está no intervalo
            if (todayAvail.break_start && todayAvail.break_end) {
                const breakStartMin = timeToMinutes(todayAvail.break_start);
                const breakEndMin = timeToMinutes(todayAvail.break_end);
                if (currentMinutes >= breakStartMin && currentMinutes < breakEndMin) {
                    continue; // No intervalo
                }
            }

            // Verificar conflitos com agendamentos
            const profAppointments = (appointments || []).filter(
                (a: Appointment) => a.professional_id === prof.id
            );

            let hasConflict = false;
            for (const appt of profAppointments) {
                const apptStart = new Date(appt.start_datetime);
                const apptEnd = new Date(appt.end_datetime);
                if (now >= apptStart && now < apptEnd) {
                    hasConflict = true;
                    break;
                }
            }

            if (hasConflict) {
                continue; // Em atendimento
            }

            // Verificar conflitos com bloqueios
            const profBlocks = (blocks || []).filter(
                (b: TimeBlock) => b.professional_id === prof.id
            );

            for (const block of profBlocks) {
                const blockStart = new Date(block.start_datetime);
                const blockEnd = new Date(block.end_datetime);
                if (now >= blockStart && now < blockEnd) {
                    hasConflict = true;
                    break;
                }
            }

            if (hasConflict) {
                continue; // Bloqueado
            }

            // Calcular freeUntil (próximo compromisso ou fechamento)
            // Determinar o buffer do profissional (custom ou global)
            const profBuffer = (prof as any).custom_buffer ? ((prof as any).buffer_minutes || globalBufferMinutes) : globalBufferMinutes;

            // O último horário disponível para INICIAR um atendimento é: fechamento - buffer
            // Isso garante que o atendimento termine antes do fechamento
            const lastAvailableSlotMinutes = businessCloseMinutes - profBuffer;

            // Usar o menor entre: fim do expediente do profissional OU último slot disponível
            const effectiveEndMinutes = Math.min(endMinutes, lastAvailableSlotMinutes);

            // Se já passou do último horário disponível, profissional não está disponível
            if (currentMinutes >= effectiveEndMinutes) {
                continue; // Não há tempo suficiente para um atendimento antes do fechamento
            }

            let freeUntilMinutes = effectiveEndMinutes; // Usa o horário mais restritivo

            // Verificar intervalo
            if (todayAvail.break_start) {
                const breakStartMin = timeToMinutes(todayAvail.break_start);
                if (currentMinutes < breakStartMin && breakStartMin < freeUntilMinutes) {
                    freeUntilMinutes = breakStartMin;
                }
            }

            // Verificar próximos agendamentos
            for (const appt of profAppointments) {
                const apptStart = new Date(appt.start_datetime);
                if (apptStart > now) {
                    const apptStartMinutes = apptStart.getHours() * 60 + apptStart.getMinutes();
                    if (apptStartMinutes < freeUntilMinutes) {
                        freeUntilMinutes = apptStartMinutes;
                    }
                }
            }

            // Verificar próximos bloqueios
            for (const block of profBlocks) {
                const blockStart = new Date(block.start_datetime);
                if (blockStart > now) {
                    const blockStartMinutes = blockStart.getHours() * 60 + blockStart.getMinutes();
                    if (blockStartMinutes < freeUntilMinutes) {
                        freeUntilMinutes = blockStartMinutes;
                    }
                }
            }

            const freeMinutes = freeUntilMinutes - currentMinutes;

            // Verificar duração mínima
            if (freeMinutes < minDuration) {
                continue; // Janela muito pequena
            }

            // Verificar filtro por serviço
            const profServicesArray = servicesByProfessional[prof.id] || [];
            if (serviceId) {
                const hasService = profServicesArray.some(s => s.id === serviceId);
                if (!hasService) {
                    continue; // Não oferece o serviço
                }
            }

            // Criar objeto freeUntil como Date
            const freeUntil = new Date(now);
            freeUntil.setHours(Math.floor(freeUntilMinutes / 60), freeUntilMinutes % 60, 0, 0);

            availableNow.push({
                professionalId: prof.id,
                name: prof.name,
                avatarUrl: prof.avatar_url,
                freeFrom: now,
                freeUntil,
                freeMinutes,
                services: profServicesArray.slice(0, 3) // Limitar a 3 serviços para exibição
            });
        }

        // Ordenar por tempo livre (maior primeiro)
        availableNow.sort((a, b) => b.freeMinutes - a.freeMinutes);

        return availableNow;
    } catch (error) {
        console.error('Error in getProfessionalsAvailableNow:', error);
        return [];
    }
}

/**
 * Busca todos os serviços do negócio (para o filtro)
 */
export async function getServicesForFilter(businessId: string): Promise<Array<{ id: string; name: string; duration_minutes: number }>> {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('id, name, duration_minutes')
            .eq('business_id', businessId)
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error('Error fetching services:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getServicesForFilter:', error);
        return [];
    }
}
