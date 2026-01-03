/**
 * availabilityNow.ts - Serviço para calcular disponibilidade em tempo real
 * "Quem tá livre agora?" feature
 */
import { supabase } from './supabase';
import { getNowInBrazil, getCurrentTimeBrazil, getCurrentDayOfWeekBrazil, getStartOfDayBrazil, getEndOfDayBrazil } from './timezone';

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
        // Usar timezone do Brasil para todos os cálculos
        const now = getNowInBrazil();
        const dayOfWeek = getCurrentDayOfWeekBrazil(); // 0 = domingo
        const currentTime = getCurrentTimeBrazil();
        const currentMinutes = timeToMinutes(currentTime);

        // Data de hoje no formato ISO para queries (usando timezone do Brasil)
        const todayStart = getStartOfDayBrazil();
        const todayEnd = getEndOfDayBrazil();

        // 1. Buscar profissionais ativos (incluindo campos de buffer)
        const { data: professionals, error: profError } = await supabase
            .from('professionals')
            .select('id, name, avatar_url, is_active, buffer_minutes, custom_buffer')
            .eq('business_id', businessId)
            .eq('is_active', true);

        if (profError || !professionals || professionals.length === 0) {
            console.error('❌ [AvailableNow] Error or no professionals found:', profError, 'count:', professionals?.length);
            return [];
        }

        // [LOG REMOVED]
        // [LOG REMOVED]
        console.log('⏰ [AvailableNow] Current time info:', {
            now: now.toISOString(),
            localTime: now.toLocaleString('pt-BR'),
            dayOfWeek: dayOfWeek,
            dayName: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayOfWeek],
            currentTime: currentTime,
            currentMinutes: currentMinutes
        });
        // [LOG REMOVED]

        // 1.5 Buscar horário de funcionamento e configurações do negócio
        const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('business_hours, booking_settings')
            .eq('id', businessId)
            .single();

        if (businessError) {
            console.error('❌ [AvailableNow] Error fetching business:', businessError);
        }

        // 🔴 LOG RAW DATA FROM DATABASE
        // [LOG REMOVED]
        // [LOG REMOVED]
        // [LOG REMOVED]

        // Buffer global da empresa (padrão: 60 minutos se não definido)
        const globalBufferMinutes = business?.booking_settings?.buffer_minutes || 60;

        // Mapear dias da semana para chaves do business_hours
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayKey = dayNames[dayOfWeek];

        // [LOG REMOVED]
        // [LOG REMOVED]

        const businessDay = business?.business_hours?.[todayKey as keyof typeof business.business_hours] as { open: string; close: string; closed: boolean } | undefined;

        // [LOG REMOVED]

        // 🔴 Se não há configuração de horário para hoje, retornar lista vazia
        if (!businessDay) {
            // [LOG REMOVED]
            return [];
        }

        // Se o negócio está fechado hoje, nenhum profissional está disponível
        if (businessDay.closed) {
            // [LOG REMOVED]
            return [];
        }

        // Validar que os horários existem
        if (!businessDay.open || !businessDay.close) {
            // [LOG REMOVED]
            return [];
        }

        // Obter horário de abertura e fechamento do negócio
        const businessOpenMinutes = timeToMinutes(businessDay.open);
        const businessCloseMinutes = timeToMinutes(businessDay.close);

        console.log('🏢 [AvailableNow] Business hours for today:', {
            day: todayKey,
            open: businessDay.open,
            close: businessDay.close,
            openMinutes: businessOpenMinutes,
            closeMinutes: businessCloseMinutes,
            currentMinutes: currentMinutes,
            currentTime: currentTime,
            businessNotYetOpen: currentMinutes < businessOpenMinutes,
            businessAlreadyClosed: currentMinutes >= businessCloseMinutes
        });

        // 🔴 IMPORTANTE: Verificar se o negócio já abriu ANTES de processar profissionais
        if (currentMinutes < businessOpenMinutes) {
            // [LOG REMOVED]
            return []; // Empresa ainda não abriu
        }

        // Verificar se já passou do horário de fechamento
        if (currentMinutes >= businessCloseMinutes) {
            // [LOG REMOVED]
            return []; // Empresa já fechou
        }

        // 2. Buscar disponibilidade (horários) dos profissionais para hoje
        // NOTA: is_active = true significa que o profissional TRABALHA neste dia
        // [LOG REMOVED]

        // DEBUG: First fetch ALL records for this day (including is_active=false) to see what's in the DB
        const { data: allAvailabilities } = await supabase
            .from('professional_availability')
            .select('*')
            .in('professional_id', professionals.map(p => p.id))
            .eq('day_of_week', dayOfWeek);

        // [LOG REMOVED]
        (allAvailabilities || []).forEach((a: any) => {
            const profName = professionals.find(p => p.id === a.professional_id)?.name || 'Unknown';
            // [LOG REMOVED]
        });

        // Now fetch only active ones
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

        // DEBUG: Show RAW availability data
        // [LOG REMOVED]
        // [LOG REMOVED]

        // DEBUG: Show which professionals have availability for today
        // [LOG REMOVED]
        professionals.forEach(p => {
            const config = (availabilities || []).find((a: ProfessionalAvailability) => a.professional_id === p.id);
            if (config) {
                // [LOG REMOVED]
            } else {
                // [LOG REMOVED]
            }
        });

        // 🔴 Se nenhum profissional trabalha hoje, retornar lista vazia
        if (!availabilities || availabilities.length === 0) {
            // [LOG REMOVED]
            return [];
        }

        // 3. Buscar agendamentos REGULARES de hoje (exclui cancelados, no_show e encaixes)
        // Encaixes não bloqueiam slots regulares
        const { data: appointments, error: apptError } = await supabase
            .from('appointments')
            .select('id, professional_id, start_datetime, end_datetime, status, is_encaixe')
            .eq('business_id', businessId)
            .gte('start_datetime', todayStart.toISOString())
            .lte('start_datetime', todayEnd.toISOString())
            .in('status', ['pending', 'confirmed', 'completed'])
            .or('is_encaixe.is.null,is_encaixe.eq.false'); // Excluir encaixes

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

        // 5. Buscar serviços por profissional da tabela professional_services
        const { data: profServices, error: psError } = await supabase
            .from('professional_services')
            .select('professional_id, service_id, services(id, name)')
            .in('professional_id', professionals.map(p => p.id));

        if (psError) {
            console.error('Error fetching professional services:', psError);
        }

        // Também buscar todos os serviços do negócio (para profissionais sem associações)
        const { data: allServices } = await supabase
            .from('services')
            .select('id, name')
            .eq('business_id', businessId)
            .eq('is_active', true);

        // Criar mapa de serviços por profissional
        // Profissionais com associações usam apenas seus serviços
        // Profissionais SEM associações oferecem TODOS os serviços (comportamento padrão)
        const servicesByProfessional: Record<string, Array<{ id: string; name: string }>> = {};
        professionals.forEach(p => {
            const profServiceRecords = (profServices || []).filter((ps: any) => ps.professional_id === p.id);

            if (profServiceRecords.length > 0) {
                // Professional has specific service associations
                servicesByProfessional[p.id] = profServiceRecords
                    .map((ps: any) => ps.services)
                    .filter(Boolean);
                // [LOG REMOVED]
            } else {
                // No associations = offers ALL services (default)
                servicesByProfessional[p.id] = allServices || [];
                // [LOG REMOVED]
            }
        });

        // 6. Calcular disponibilidade para cada profissional
        const availableNow: ProfessionalAvailableNow[] = [];

        // [LOG REMOVED]
        // [LOG REMOVED]

        for (const prof of professionals) {
            // Verificar se tem horário configurado para hoje
            const todayAvail = (availabilities || []).find(
                (a: ProfessionalAvailability) => a.professional_id === prof.id
            );

            if (!todayAvail) {
                // [LOG REMOVED]
                // [LOG REMOVED]
                continue; // Profissional não trabalha hoje
            }

            // [LOG REMOVED]

            const startMinutes = timeToMinutes(todayAvail.start_time);
            const endMinutes = timeToMinutes(todayAvail.end_time);

            // Verificar se está dentro do expediente do profissional
            if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
                // [LOG REMOVED]
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
                // [LOG REMOVED]
                continue; // Em atendimento
            }

            // [LOG REMOVED]
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

            let freeMinutes = freeUntilMinutes - currentMinutes;

            // [LOG REMOVED]

            // Verificar duração mínima
            // Se não tem tempo suficiente ANTES do intervalo, verificar se há tempo DEPOIS do intervalo
            if (freeMinutes < minDuration) {
                // Check if this is because of a break, and if there's time after the break
                if (todayAvail.break_start && todayAvail.break_end) {
                    const breakStartMin = timeToMinutes(todayAvail.break_start);
                    const breakEndMin = timeToMinutes(todayAvail.break_end);

                    // Se o limite era o intervalo E estamos antes do intervalo
                    if (freeUntilMinutes === breakStartMin && currentMinutes < breakStartMin) {
                        // [LOG REMOVED]

                        // Calcular tempo livre DEPOIS do intervalo
                        let freeAfterBreakUntil = effectiveEndMinutes;

                        // Verificar próximos agendamentos DEPOIS do intervalo
                        for (const appt of profAppointments) {
                            const apptStart = new Date(appt.start_datetime);
                            const apptStartMinutes = apptStart.getHours() * 60 + apptStart.getMinutes();
                            // Só considerar agendamentos que começam depois do fim do intervalo
                            if (apptStartMinutes > breakEndMin && apptStartMinutes < freeAfterBreakUntil) {
                                freeAfterBreakUntil = apptStartMinutes;
                            }
                        }

                        // Verificar bloqueios DEPOIS do intervalo
                        for (const block of profBlocks) {
                            const blockStart = new Date(block.start_datetime);
                            const blockStartMinutes = blockStart.getHours() * 60 + blockStart.getMinutes();
                            if (blockStartMinutes > breakEndMin && blockStartMinutes < freeAfterBreakUntil) {
                                freeAfterBreakUntil = blockStartMinutes;
                            }
                        }

                        const freeAfterBreakMinutes = freeAfterBreakUntil - breakEndMin;
                        // [LOG REMOVED]

                        if (freeAfterBreakMinutes >= minDuration) {
                            // Profissional está disponível DEPOIS do intervalo
                            // Atualizar freeUntil para refletir disponibilidade pós-intervalo
                            freeUntilMinutes = freeAfterBreakUntil;
                            freeMinutes = freeAfterBreakMinutes;

                            // Criar o freeFrom como o fim do intervalo (quando fica disponível)
                            const freeFromAfterBreak = new Date(now);
                            freeFromAfterBreak.setHours(Math.floor(breakEndMin / 60), breakEndMin % 60, 0, 0);

                            const freeUntilAfterBreak = new Date(now);
                            freeUntilAfterBreak.setHours(Math.floor(freeUntilMinutes / 60), freeUntilMinutes % 60, 0, 0);

                            // [LOG REMOVED]

                            // Verificar filtro por serviço
                            const profServicesArray = servicesByProfessional[prof.id] || [];
                            if (serviceId) {
                                const hasService = profServicesArray.some(s => s.id === serviceId);
                                if (!hasService) {
                                    // [LOG REMOVED]
                                    continue;
                                }
                            }

                            availableNow.push({
                                professionalId: prof.id,
                                name: prof.name,
                                avatarUrl: prof.avatar_url,
                                freeFrom: freeFromAfterBreak,
                                freeUntil: freeUntilAfterBreak,
                                freeMinutes,
                                services: profServicesArray.slice(0, 3)
                            });
                            continue; // Já adicionado, pular para próximo profissional
                        }
                    }
                }

                // [LOG REMOVED]
                continue; // Janela muito pequena
            }

            // Verificar filtro por serviço
            const profServicesArray = servicesByProfessional[prof.id] || [];
            // [LOG REMOVED]

            if (serviceId) {
                const hasService = profServicesArray.some(s => s.id === serviceId);
                // [LOG REMOVED]
                if (!hasService) {
                    // [LOG REMOVED]
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
