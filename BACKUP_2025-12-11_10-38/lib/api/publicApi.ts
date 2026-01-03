/**
 * =====================================================
 * PUBLIC API WRAPPER
 * =====================================================
 * Funções wrapper para uso no frontend
 * Simula endpoints REST mas roda client-side
 * =====================================================
 */

import { getAvailableSlots, createPublicAppointment, isSlotAvailable, getAppointments } from './availability';
import type { PublicAppointmentData } from '../types/booking';

/**
 * API Pública - Buscar slots disponíveis
 * GET /api/public/availability
 */
export async function fetchAvailableSlots(params: {
    businessId: string;
    professionalId: string;
    serviceId: string;
    date: string;
}): Promise<{ slots: string[]; error?: string }> {
    try {
        const slots = await getAvailableSlots(
            params.businessId,
            params.professionalId,
            params.date,
            params.serviceId
        );

        return { slots };
    } catch (error: any) {
        console.error('Error fetching available slots:', error);
        return { slots: [], error: error.message || 'Error fetching slots' };
    }
}

/**
 * API Pública - Criar agendamento
 * POST /api/public/appointments
 */
export async function createAppointment(
    apiToken: string,
    data: PublicAppointmentData
): Promise<{ appointment?: any; error?: string }> {
    try {
        const appointment = await createPublicAppointment(apiToken, data);
        return { appointment };
    } catch (error: any) {
        console.error('Error creating appointment:', error);
        return { error: error.message || 'Error creating appointment' };
    }
}

/**
 * API Privada - Buscar agendamentos
 * GET /api/appointments
 */
export async function fetchAppointments(params: {
    businessId: string;
    from: string;
    to: string;
}): Promise<{ appointments: any[]; error?: string }> {
    try {
        const appointments = await getAppointments(
            params.businessId,
            params.from,
            params.to
        );

        return { appointments };
    } catch (error: any) {
        console.error('Error fetching appointments:', error);
        return { appointments: [], error: error.message || 'Error fetching appointments' };
    }
}

/**
 * API Privada - Verificar disponibilidade de slot
 * GET /api/slot-available
 */
export async function checkSlotAvailability(params: {
    businessId: string;
    professionalId: string;
    dateTimeISO: string;
    durationMinutes: number;
}): Promise<{ available: boolean; error?: string }> {
    try {
        const available = await isSlotAvailable(
            params.businessId,
            params.professionalId,
            params.dateTimeISO,
            params.durationMinutes
        );

        return { available };
    } catch (error: any) {
        console.error('Error checking slot availability:', error);
        return { available: false, error: error.message || 'Error checking availability' };
    }
}
