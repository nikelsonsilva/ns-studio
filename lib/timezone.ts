/**
 * timezone.ts - Utilitário central para manipulação de datas com timezone do Brasil
 * 
 * Todas as operações de data/hora devem usar este módulo para garantir
 * consistência com o horário de São Paulo/Brasília (America/Sao_Paulo).
 */
import { format as dateFnsFormat, parse, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

/**
 * Timezone do Brasil (São Paulo/Brasília)
 * UTC-3 (sem horário de verão desde 2019)
 */
export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Obtém a data/hora atual no horário de São Paulo
 * Use isto em vez de `new Date()` para cálculos de disponibilidade
 */
export function getNowInBrazil(): Date {
    return toZonedTime(new Date(), BRAZIL_TIMEZONE);
}

/**
 * Converte uma data/hora local do Brasil para UTC
 * Use antes de salvar no banco de dados
 * 
 * @param date - Data base (dia/mês/ano)
 * @param time - Horário no formato "HH:mm" ou "HH:mm:ss"
 * @returns Date em UTC para salvar no banco
 */
export function toUTC(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const localDate = new Date(date);
    localDate.setHours(hours, minutes, 0, 0);
    return fromZonedTime(localDate, BRAZIL_TIMEZONE);
}

/**
 * Converte uma data UTC (do banco de dados) para o horário de São Paulo
 * Use ao ler datas do banco para exibir ao usuário
 * 
 * @param utcDate - Data em UTC (string ISO ou Date)
 * @returns Date no horário de São Paulo
 */
export function fromUTC(utcDate: Date | string): Date {
    const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
    return toZonedTime(date, BRAZIL_TIMEZONE);
}

/**
 * Formata uma data no horário de São Paulo
 * 
 * @param date - Data a formatar (UTC ou local)
 * @param formatStr - String de formato (ex: 'dd/MM/yyyy', 'HH:mm')
 * @returns String formatada no timezone do Brasil
 */
export function formatBrazil(date: Date | string, formatStr: string): string {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(dateObj, BRAZIL_TIMEZONE, formatStr, { locale: ptBR });
}

/**
 * Obtém o horário atual em formato HH:mm no timezone do Brasil
 */
export function getCurrentTimeBrazil(): string {
    return formatInTimeZone(new Date(), BRAZIL_TIMEZONE, 'HH:mm');
}

/**
 * Obtém o dia da semana atual (0-6, onde 0 = Domingo) no timezone do Brasil
 */
export function getCurrentDayOfWeekBrazil(): number {
    const now = getNowInBrazil();
    return now.getDay();
}

/**
 * Cria uma data UTC a partir de componentes de data e hora
 * Considera que a data/hora informada está no timezone do Brasil
 * 
 * @param year - Ano
 * @param month - Mês (0-11)
 * @param day - Dia
 * @param hours - Horas
 * @param minutes - Minutos
 * @returns Date em UTC
 */
export function createUTCFromBrazil(
    year: number,
    month: number,
    day: number,
    hours: number,
    minutes: number
): Date {
    const localDate = new Date(year, month, day, hours, minutes, 0, 0);
    return fromZonedTime(localDate, BRAZIL_TIMEZONE);
}

/**
 * Obtém o início do dia atual no timezone do Brasil (00:00:00)
 */
export function getStartOfDayBrazil(date?: Date): Date {
    const baseDate = date || new Date();
    const brazilDate = toZonedTime(baseDate, BRAZIL_TIMEZONE);
    brazilDate.setHours(0, 0, 0, 0);
    return fromZonedTime(brazilDate, BRAZIL_TIMEZONE);
}

/**
 * Obtém o fim do dia atual no timezone do Brasil (23:59:59)
 */
export function getEndOfDayBrazil(date?: Date): Date {
    const baseDate = date || new Date();
    const brazilDate = toZonedTime(baseDate, BRAZIL_TIMEZONE);
    brazilDate.setHours(23, 59, 59, 999);
    return fromZonedTime(brazilDate, BRAZIL_TIMEZONE);
}
