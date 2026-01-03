import { supabase } from './supabase';

/**
 * =====================================================
 * AUTO-COMPLETE SERVICE
 * =====================================================
 * Serviço para auto-completar agendamentos que já passaram
 */

/**
 * Buscar agendamentos que já passaram e precisam ser completados
 * @param businessId ID do negócio
 * @returns Lista de agendamentos passados
 */
export const fetchPastAppointmentsToComplete = async (businessId: string) => {
    try {
        const now = new Date();

        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('business_id', businessId)
            .in('status', ['confirmed', 'paid'])
            .lt('end_datetime', now.toISOString());

        if (error) {
            console.error('Error fetching past appointments:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Unexpected error fetching past appointments:', error);
        return [];
    }
};

/**
 * Marcar agendamento como completado
 * @param appointmentId ID do agendamento
 * @returns true se sucesso, false se erro
 */
export const markAppointmentAsCompleted = async (appointmentId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('appointments')
            .update({
                status: 'completed',
                updated_at: new Date().toISOString()
            })
            .eq('id', appointmentId);

        if (error) {
            console.error('Error marking appointment as completed:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Unexpected error marking appointment as completed:', error);
        return false;
    }
};

/**
 * Auto-completar todos os agendamentos passados
 * @param businessId ID do negócio
 * @returns Número de agendamentos completados
 */
export const autoCompletePastAppointments = async (businessId: string): Promise<number> => {
    try {
        const appointments = await fetchPastAppointmentsToComplete(businessId);

        if (appointments.length === 0) {
            return 0;
        }

        console.log(`🔄 [AutoComplete] Found ${appointments.length} past appointments to complete`);

        let completedCount = 0;
        for (const apt of appointments) {
            const success = await markAppointmentAsCompleted(apt.id);
            if (success) {
                completedCount++;
                console.log(`✅ [AutoComplete] Completed appointment ${apt.id} from ${apt.appointment_date} ${apt.appointment_time}`);
            }
        }

        if (completedCount > 0) {
            console.log(`✅ [AutoComplete] Successfully completed ${completedCount} appointments`);
        }

        return completedCount;
    } catch (error) {
        console.error('Unexpected error in autoCompletePastAppointments:', error);
        return 0;
    }
};
