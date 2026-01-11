/**
 * Agenda Feature Types
 * Tipos específicos do domínio de agendamento
 */

import type { Appointment, Service, Product } from '@core/infra/types';
export type { Appointment, Service, Product };

/**
 * Bloqueio de horário (férias, pausas, etc.)
 */
export interface TimeBlock {
    id: string;
    business_id?: string;
    professional_id: string | null;
    start_datetime: string;
    end_datetime: string;
    reason?: string;
    block_type?: 'personal' | 'vacation' | 'holiday';
}

/**
 * Disponibilidade de um profissional para um dia da semana
 */
export interface ProfessionalAvailability {
    id?: string;
    professional_id: string;
    day_of_week: number; // 0 = Domingo, 6 = Sábado
    start_time: string; // "09:00"
    end_time: string; // "18:00"
    break_start: string | null;
    break_end: string | null;
    is_active: boolean;
}

/**
 * Horário de funcionamento do dia
 */
export interface DayHours {
    open: string;
    close: string;
    closed: boolean;
}

/**
 * Estado de um slot de horário
 */
export type SlotStatus =
    | 'available'
    | 'booked'
    | 'blocked'
    | 'past'
    | 'break'
    | 'off-hours';

/**
 * Props para o slot de horário renderizado
 */
export interface TimeSlotProps {
    time: string;
    professionalId: string;
    status: SlotStatus;
    appointment?: Appointment;
    block?: TimeBlock;
    onClick: () => void;
}

/**
 * Props para cards de agendamento
 */
export interface AppointmentCardProps {
    appointment: Appointment;
    onOpenDetails: (appointment: Appointment) => void;
    onDragStart?: (e: React.DragEvent, appointment: Appointment) => void;
    onDragEnd?: (e: React.DragEvent) => void;
}

/**
 * Estado do drag & drop
 */
export interface PendingDrop {
    appointment: Appointment;
    targetProfessionalId: string;
    targetTime: string;
}

/**
 * Mapa de serviços por profissional
 */
export type ProfessionalServiceMap = Record<string, string[]>;
