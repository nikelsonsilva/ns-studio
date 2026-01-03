import { supabase } from './supabase';
import type { Client, Appointment } from '../types';

/**
 * =====================================================
 * CLIENT SERVICE - Funções específicas para clientes
 * =====================================================
 */

export interface AppointmentHistory {
    id: string;
    date: string;
    service_name: string;
    professional_name: string;
    amount: number;
    payment_status: 'paid' | 'pending' | 'refunded' | 'failed' | 'awaiting_payment';
    status: 'confirmed' | 'completed' | 'canceled' | 'no_show' | 'pending' | 'blocked';

    // Campos de pagamento
    payment_method?: string;
    payment_link?: string;
    amount_paid?: number;
}

export interface ClientStats {
    totalVisits: number;
    lifetimeValue: number;
    averageTicket: number;
    lastVisitDate: string | null;
}

export interface ClientWithHistory {
    client: Client;
    history: AppointmentHistory[];
    stats: ClientStats;
}

/**
 * Buscar cliente com histórico completo de agendamentos
 */
export const fetchClientWithHistory = async (clientId: string): Promise<ClientWithHistory | null> => {
    try {
        // Buscar cliente
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

        if (clientError) {
            console.error('Error fetching client:', clientError);
            return null;
        }

        // Buscar agendamentos com joins para serviços e profissionais
        // NOTA: Apenas colunas confirmadas na tabela appointments
        const { data: appointments, error: appointmentsError } = await supabase
            .from('appointments')
            .select(`
        id,
        start_datetime,
        end_datetime,
        payment_status,
        status,
        services (
          name,
          price
        ),
        professionals (
          name
        )
      `)
            .eq('client_id', clientId)
            .order('start_datetime', { ascending: false });

        if (appointmentsError) {
            console.error('Error fetching appointments:', appointmentsError);
            // Continuar mesmo sem histórico
        }

        // Formatar histórico
        const history: AppointmentHistory[] = (appointments || []).map((apt: any) => ({
            id: apt.id,
            date: apt.start_datetime ? new Date(apt.start_datetime).toLocaleDateString('pt-BR') : 'Data não disponível',
            service_name: apt.services?.name || 'Serviço não especificado',
            professional_name: apt.professionals?.name || 'Profissional não especificado',
            // Usar preço do serviço como valor do agendamento
            amount: apt.services?.price || 0,
            payment_status: apt.payment_status || 'pending',
            status: apt.status || 'pending',
            payment_method: undefined,
            payment_link: undefined,
            amount_paid: apt.services?.price || 0
        }));

        // Calcular estatísticas
        const completedAppointments = appointments?.filter((apt: any) => apt.status === 'completed') || [];
        const totalVisits = completedAppointments.length;
        const lifetimeValue = completedAppointments.reduce((sum: number, apt: any) => {
            // Se pagamento confirmado, usar preço do serviço
            const paidAmount = apt.payment_status === 'paid'
                ? (apt.services?.price || 0)
                : 0;
            return sum + paidAmount;
        }, 0);
        const averageTicket = totalVisits > 0 ? lifetimeValue / totalVisits : 0;

        const lastVisitDate = completedAppointments.length > 0
            ? completedAppointments[0].start_datetime
            : null;

        const stats: ClientStats = {
            totalVisits,
            lifetimeValue,
            averageTicket,
            lastVisitDate
        };

        return {
            client: client as Client,
            history,
            stats
        };
    } catch (error) {
        console.error('Unexpected error fetching client with history:', error);
        return null;
    }
};

/**
 * Atualizar notas internas do cliente
 */
export const updateClientNotes = async (clientId: string, notes: string): Promise<boolean> => {
    console.log('📝 [updateClientNotes] Iniciando...', { clientId, notes });
    try {
        const { data, error } = await supabase
            .from('clients')
            .update({ internal_notes: notes })
            .eq('id', clientId)
            .select();

        console.log('📝 [updateClientNotes] Resultado:', { data, error });

        if (error) {
            console.error('❌ [updateClientNotes] Erro:', error);
            return false;
        }

        console.log('✅ [updateClientNotes] Sucesso!');
        return true;
    } catch (error) {
        console.error('❌ [updateClientNotes] Erro inesperado:', error);
        return false;
    }
};

/**
 * Atualizar tags do cliente
 */
export const updateClientTags = async (clientId: string, tags: string[]): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('clients')
            .update({ tags })
            .eq('id', clientId);

        if (error) {
            console.error('Error updating client tags:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Unexpected error updating client tags:', error);
        return false;
    }
};

/**
 * Atualizar preferências do cliente
 */
export const updateClientPreferences = async (
    clientId: string,
    preferences: {
        drink_preference?: string;
        conversation_style?: string;
        preferences?: any;
    }
): Promise<boolean> => {
    console.log('☕ [updateClientPreferences] Iniciando...', { clientId, preferences });
    try {
        const { data, error } = await supabase
            .from('clients')
            .update(preferences)
            .eq('id', clientId)
            .select();

        console.log('☕ [updateClientPreferences] Resultado:', { data, error });

        if (error) {
            console.error('❌ [updateClientPreferences] Erro:', error);
            return false;
        }

        console.log('✅ [updateClientPreferences] Sucesso!');
        return true;
    } catch (error) {
        console.error('❌ [updateClientPreferences] Erro inesperado:', error);
        return false;
    }
};

/**
 * Calcular dias desde a última visita
 */
export const getDaysSinceLastVisit = (lastVisitDate: string | null): number => {
    if (!lastVisitDate) return 999;

    const lastVisit = new Date(lastVisitDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lastVisit.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
};
