/**
 * Date Utils - Helpers de data configurados para pt-BR
 * Usa date-fns com locale brasileiro
 */

import {
    format,
    formatDistance,
    isToday,
    isTomorrow,
    isYesterday,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    addDays,
    addMinutes,
    differenceInMinutes,
    differenceInDays,
    parse,
    parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata data no padrão brasileiro
 */
export const formatDate = (date: Date | string, pattern: string = 'dd/MM/yyyy'): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, pattern, { locale: ptBR });
};

/**
 * Formata data e hora
 */
export const formatDateTime = (date: Date | string): string => {
    return formatDate(date, "dd/MM/yyyy 'às' HH:mm");
};

/**
 * Formata hora
 */
export const formatTime = (date: Date | string): string => {
    return formatDate(date, 'HH:mm');
};

/**
 * Retorna label amigável: "Hoje", "Amanhã", "Ontem" ou data formatada
 */
export const formatDateLabel = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;

    if (isToday(dateObj)) return 'Hoje';
    if (isTomorrow(dateObj)) return 'Amanhã';
    if (isYesterday(dateObj)) return 'Ontem';

    return formatDate(dateObj, "EEEE, dd 'de' MMMM");
};

/**
 * Retorna distância relativa: "há 2 horas", "em 3 dias"
 */
export const formatRelative = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatDistance(dateObj, new Date(), {
        addSuffix: true,
        locale: ptBR
    });
};

/**
 * Formata duração em minutos: "1h 30min"
 */
export const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
};

/**
 * Gera array de horários entre start e end
 */
export const generateTimeSlots = (
    startTime: string,
    endTime: string,
    intervalMinutes: number = 30
): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes < endMinutes) {
        const hours = Math.floor(currentMinutes / 60);
        const mins = currentMinutes % 60;
        slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
        currentMinutes += intervalMinutes;
    }

    return slots;
};

/**
 * Converte string HH:mm para minutos desde meia-noite
 */
export const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Converte minutos desde meia-noite para HH:mm
 */
export const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// Re-export funções úteis do date-fns
export {
    isToday,
    isTomorrow,
    isYesterday,
    startOfDay,
    endOfDay,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    addDays,
    addMinutes,
    differenceInMinutes,
    differenceInDays,
    parse,
    parseISO
};
