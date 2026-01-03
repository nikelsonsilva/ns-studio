/**
 * =====================================================
 * BOOKING TYPES
 * =====================================================
 * Tipos TypeScript para sistema de agendamento
 * =====================================================
 */

export interface PublicAppointmentData {
    businessId: string;
    professionalId: string;
    serviceId: string;
    customerName: string;
    customerPhone: string;
    date: string;  // '2025-12-05'
    time: string;  // '13:30'
}

export interface BookingSettings {
    min_advance_hours: number;
    max_advance_days: number;
    buffer_minutes: number;
    slot_duration_minutes: number; // Intervalo de exibição dos slots (ex: 30 ou 60 min)
    allow_same_day: boolean;
    require_payment: boolean;
    api_token: string | null;
}

export interface TimeSlot {
    time: string;
    available: boolean;
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
    block_type: 'vacation' | 'holiday' | 'personal' | 'maintenance' | 'event';
}

export interface AppointmentRange {
    start_datetime: string;
    end_datetime: string;
}
