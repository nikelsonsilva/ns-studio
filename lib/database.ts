import { supabase } from './supabase';
import type {
    Business,
    Professional,
    Service,
    Client,
    Appointment,
    Product,
    FinancialRecord,
    MembershipPlan,
    RecurringExpense
} from '../types';

/**
 * =====================================================
 * MULTI-TENANT DATABASE LAYER
 * =====================================================
 * Todas as queries automaticamente filtram por business_id
 * usando Row Level Security (RLS) do Supabase
 * =====================================================
 */

/**
 * Helper: Obter business_id do usuário atual
 */
export const getCurrentBusinessId = async (): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('businesses')
            .select('id')
            .single();

        if (error) {
            console.error('Error getting business_id:', error);
            return null;
        }

        return data?.id || null;
    } catch (error) {
        console.error('Unexpected error getting business_id:', error);
        return null;
    }
};

/**
 * Helper: Obter business completo do usuário atual
 */
export const getCurrentBusiness = async (): Promise<Business | null> => {
    try {
        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .single();

        if (error) {
            console.error('Error getting business:', error);
            return null;
        }

        return data as Business;
    } catch (error) {
        console.error('Unexpected error getting business:', error);
        return null;
    }
};

/**
 * =====================================================
 * GENERIC CRUD OPERATIONS (Multi-Tenant)
 * =====================================================
 */

/**
 * Buscar todos os registros (RLS filtra automaticamente por business_id)
 */
export const fetchAll = async <T>(tableName: string): Promise<T[] | null> => {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error(`Error fetching ${tableName}:`, error);
            return null;
        }

        return data as T[];
    } catch (error) {
        console.error(`Unexpected error fetching ${tableName}:`, error);
        return null;
    }
};

/**
 * Buscar um registro por ID
 */
export const fetchById = async <T>(
    tableName: string,
    id: string
): Promise<T | null> => {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error(`Error fetching ${tableName} by ID:`, error);
            return null;
        }

        return data as T;
    } catch (error) {
        console.error(`Unexpected error fetching ${tableName} by ID:`, error);
        return null;
    }
};

/**
 * Criar um novo registro (business_id é injetado automaticamente)
 */
export const create = async <T>(
    tableName: string,
    data: Partial<T>
): Promise<T | null> => {
    try {
        console.log(`🔍 database.ts: Criando registro em ${tableName}`);

        const businessId = await getCurrentBusinessId();
        console.log(`🔍 database.ts: Business ID obtido:`, businessId);

        if (!businessId) {
            console.error('❌ database.ts: No business_id found for user');
            return null;
        }

        const dataWithBusinessId = {
            ...data,
            business_id: businessId
        };

        console.log(`🔍 database.ts: Dados a inserir:`, dataWithBusinessId);

        const { data: newData, error } = await supabase
            .from(tableName)
            .insert(dataWithBusinessId)
            .select()
            .single();

        if (error) {
            console.error(`❌ database.ts: Error creating ${tableName}:`, error);
            return null;
        }

        console.log(`✅ database.ts: Registro criado com sucesso:`, newData);
        return newData as T;
    } catch (error) {
        console.error(`❌ database.ts: Unexpected error creating ${tableName}:`, error);
        return null;
    }
};

/**
 * Atualizar um registro
 */
export const update = async <T>(
    tableName: string,
    id: string,
    data: Partial<T>
): Promise<T | null> => {
    try {
        const { data: updatedData, error } = await supabase
            .from(tableName)
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error(`Error updating ${tableName}:`, error);
            return null;
        }

        return updatedData as T;
    } catch (error) {
        console.error(`Unexpected error updating ${tableName}:`, error);
        return null;
    }
};

/**
 * Deletar um registro
 */
export const deleteRecord = async (
    tableName: string,
    id: string
): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('id', id);

        if (error) {
            console.error(`Error deleting ${tableName}:`, error);
            return false;
        }

        return true;
    } catch (error) {
        console.error(`Unexpected error deleting ${tableName}:`, error);
        return false;
    }
};

/**
 * =====================================================
 * BUSINESS OPERATIONS
 * =====================================================
 */

export const createBusiness = (data: Partial<Business>) => create<Business>('businesses', data);
export const updateBusiness = (id: string, data: Partial<Business>) => update<Business>('businesses', id, data);

/**
 * Get business by public slug (for public booking pages)
 */
export const getBusinessBySlug = async (slug: string): Promise<Business | null> => {
    try {
        const { data, error } = await supabase
            .from('businesses')
            .select('*')
            .eq('public_slug', slug.toLowerCase())
            .single();

        if (error) {
            console.error('Error getting business by slug:', error);
            return null;
        }

        return data as Business;
    } catch (error) {
        console.error('Unexpected error getting business by slug:', error);
        return null;
    }
};

/**
 * Check if a slug is available (not used by another business)
 */
export const checkSlugAvailability = async (slug: string, excludeBusinessId?: string): Promise<boolean> => {
    try {
        let query = supabase
            .from('businesses')
            .select('id')
            .eq('public_slug', slug.toLowerCase());

        if (excludeBusinessId) {
            query = query.neq('id', excludeBusinessId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error checking slug availability:', error);
            return false;
        }

        return !data || data.length === 0;
    } catch (error) {
        console.error('Unexpected error checking slug availability:', error);
        return false;
    }
};

/**
 * Update business public slug
 */
export const updateBusinessSlug = async (businessId: string, slug: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('businesses')
            .update({ public_slug: slug.toLowerCase() })
            .eq('id', businessId);

        if (error) {
            console.error('Error updating business slug:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Unexpected error updating business slug:', error);
        return false;
    }
};

/**
 * =====================================================
 * PROFESSIONALS (Barbeiros, Cabeleireiros, etc)
 * =====================================================
 */

export const fetchProfessionals = () => fetchAll<Professional>('professionals');
export const fetchProfessionalById = (id: string) => fetchById<Professional>('professionals', id);
export const createProfessional = (data: Partial<Professional>) => create<Professional>('professionals', data);
export const updateProfessional = (id: string, data: Partial<Professional>) => update<Professional>('professionals', id, data);
export const deleteProfessional = (id: string) => deleteRecord('professionals', id);

/**
 * Buscar profissionais ativos
 */
export const fetchActiveProfessionals = async (): Promise<Professional[] | null> => {
    try {
        const { data, error } = await supabase
            .from('professionals')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching active professionals:', error);
            return null;
        }

        return data as Professional[];
    } catch (error) {
        console.error('Unexpected error fetching active professionals:', error);
        return null;
    }
};

/**
 * =====================================================
 * SERVICES
 * =====================================================
 */

export const fetchServices = () => fetchAll<Service>('services');
export const fetchServiceById = (id: string) => fetchById<Service>('services', id);
export const createService = (data: Partial<Service>) => create<Service>('services', data);
export const updateService = (id: string, data: Partial<Service>) => update<Service>('services', id, data);
export const deleteService = (id: string) => deleteRecord('services', id);

/**
 * Buscar serviços ativos
 */
export const fetchActiveServices = async (): Promise<Service[] | null> => {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching active services:', error);
            return null;
        }

        return data as Service[];
    } catch (error) {
        console.error('Unexpected error fetching active services:', error);
        return null;
    }
};

/**
 * =====================================================
 * CLIENTS
 * =====================================================
 */

export const fetchClients = () => fetchAll<Client>('clients');
export const fetchClientById = (id: string) => fetchById<Client>('clients', id);
export const createClient = (data: Partial<Client>) => create<Client>('clients', data);
export const updateClient = (id: string, data: Partial<Client>) => update<Client>('clients', id, data);
export const deleteClient = (id: string) => deleteRecord('clients', id);

/**
 * Buscar cliente por telefone
 */
export const fetchClientByPhone = async (phone: string): Promise<Client | null> => {
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('phone', phone)
            .single();

        if (error) {
            console.error('Error fetching client by phone:', error);
            return null;
        }

        return data as Client;
    } catch (error) {
        console.error('Unexpected error fetching client by phone:', error);
        return null;
    }
};

/**
 * =====================================================
 * APPOINTMENTS
 * =====================================================
 */

export const fetchAppointments = () => fetchAll<Appointment>('appointments');
export const fetchAppointmentById = (id: string) => fetchById<Appointment>('appointments', id);
export const createAppointment = (data: Partial<Appointment>) => create<Appointment>('appointments', data);
export const updateAppointment = (id: string, data: Partial<Appointment>) => update<Appointment>('appointments', id, data);
export const deleteAppointment = (id: string) => deleteRecord('appointments', id);

/**
 * Buscar agendamentos por data
 */
export const fetchAppointmentsByDate = async (date: string): Promise<Appointment[] | null> => {
    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('appointment_date', date)
            .order('appointment_time', { ascending: true });

        if (error) {
            console.error('Error fetching appointments by date:', error);
            return null;
        }

        return data as Appointment[];
    } catch (error) {
        console.error('Unexpected error fetching appointments by date:', error);
        return null;
    }
};

/**
 * Buscar agendamentos por profissional
 */
export const fetchAppointmentsByProfessional = async (professionalId: string): Promise<Appointment[] | null> => {
    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('professional_id', professionalId)
            .order('appointment_date', { ascending: false });

        if (error) {
            console.error('Error fetching appointments by professional:', error);
            return null;
        }

        return data as Appointment[];
    } catch (error) {
        console.error('Unexpected error fetching appointments by professional:', error);
        return null;
    }
};

/**
 * Buscar agendamentos pendentes de pagamento
 */
export const fetchPendingPaymentAppointments = async (): Promise<Appointment[] | null> => {
    try {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('payment_status', 'pending')
            .order('appointment_date', { ascending: true });

        if (error) {
            console.error('Error fetching pending payment appointments:', error);
            return null;
        }

        return data as Appointment[];
    } catch (error) {
        console.error('Unexpected error fetching pending payment appointments:', error);
        return null;
    }
};

/**
 * =====================================================
 * PRODUCTS
 * =====================================================
 */

export const fetchProducts = () => fetchAll<Product>('products');
export const fetchProductById = (id: string) => fetchById<Product>('products', id);
export const createProduct = (data: Partial<Product>) => create<Product>('products', data);
export const updateProduct = (id: string, data: Partial<Product>) => update<Product>('products', id, data);
export const deleteProduct = (id: string) => deleteRecord('products', id);

/**
 * Buscar produtos com estoque baixo
 */
export const fetchLowStockProducts = async (): Promise<Product[] | null> => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .filter('stock', 'lte', 'min_stock')
            .eq('is_active', true);

        if (error) {
            console.error('Error fetching low stock products:', error);
            return null;
        }

        return data as Product[];
    } catch (error) {
        console.error('Unexpected error fetching low stock products:', error);
        return null;
    }
};

/**
 * =====================================================
 * FINANCIAL RECORDS
 * =====================================================
 */

export const fetchFinancialRecords = () => fetchAll<FinancialRecord>('financial_records');
export const fetchFinancialRecordById = (id: string) => fetchById<FinancialRecord>('financial_records', id);
export const createFinancialRecord = (data: Partial<FinancialRecord>) => create<FinancialRecord>('financial_records', data);
export const updateFinancialRecord = (id: string, data: Partial<FinancialRecord>) => update<FinancialRecord>('financial_records', id, data);
export const deleteFinancialRecord = (id: string) => deleteRecord('financial_records', id);

/**
 * Buscar registros financeiros por período
 */
export const fetchFinancialRecordsByDateRange = async (
    startDate: string,
    endDate: string
): Promise<FinancialRecord[] | null> => {
    try {
        const { data, error } = await supabase
            .from('financial_records')
            .select('*')
            .gte('record_date', startDate)
            .lte('record_date', endDate)
            .order('record_date', { ascending: false });

        if (error) {
            console.error('Error fetching financial records by date range:', error);
            return null;
        }

        return data as FinancialRecord[];
    } catch (error) {
        console.error('Unexpected error fetching financial records by date range:', error);
        return null;
    }
};

/**
 * =====================================================
 * MEMBERSHIP PLANS
 * =====================================================
 */

export const fetchMembershipPlans = () => fetchAll<MembershipPlan>('membership_plans');
export const fetchMembershipPlanById = (id: string) => fetchById<MembershipPlan>('membership_plans', id);
export const createMembershipPlan = (data: Partial<MembershipPlan>) => create<MembershipPlan>('membership_plans', data);
export const updateMembershipPlan = (id: string, data: Partial<MembershipPlan>) => update<MembershipPlan>('membership_plans', id, data);
export const deleteMembershipPlan = (id: string) => deleteRecord('membership_plans', id);

/**
 * =====================================================
 * RECURRING EXPENSES
 * =====================================================
 */

export const fetchRecurringExpenses = () => fetchAll<RecurringExpense>('recurring_expenses');
export const fetchRecurringExpenseById = (id: string) => fetchById<RecurringExpense>('recurring_expenses', id);
export const createRecurringExpense = (data: Partial<RecurringExpense>) => create<RecurringExpense>('recurring_expenses', data);
export const updateRecurringExpense = (id: string, data: Partial<RecurringExpense>) => update<RecurringExpense>('recurring_expenses', id, data);
export const deleteRecurringExpense = (id: string) => deleteRecord('recurring_expenses', id);

/**
 * =====================================================
 * LEGACY COMPATIBILITY
 * =====================================================
 */

/** @deprecated Use fetchProfessionals instead */
export const fetchBarbers = fetchProfessionals;

/** @deprecated Use fetchProfessionalById instead */
export const fetchBarberById = fetchProfessionalById;

/** @deprecated Use createProfessional instead */
export const createBarber = createProfessional;

/** @deprecated Use updateProfessional instead */
export const updateBarber = updateProfessional;

/** @deprecated Use deleteProfessional instead */
export const deleteBarber = deleteProfessional;

/** @deprecated Use fetchAppointmentsByProfessional instead */
export const fetchAppointmentsByBarber = fetchAppointmentsByProfessional;

/**
 * =====================================================
 * PROFESSIONAL AVAILABILITY
 * =====================================================
 */

export interface ProfessionalAvailability {
    id: string;
    business_id: string;
    professional_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    break_start: string | null;
    break_end: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export const fetchProfessionalAvailability = (professionalId: string) =>
    supabase
        .from('professional_availability')
        .select('*')
        .eq('professional_id', professionalId)
        .order('day_of_week', { ascending: true });

export const createProfessionalAvailability = (data: Partial<ProfessionalAvailability>) =>
    create<ProfessionalAvailability>('professional_availability', data);

export const updateProfessionalAvailability = (id: string, data: Partial<ProfessionalAvailability>) =>
    update<ProfessionalAvailability>('professional_availability', id, data);

export const deleteProfessionalAvailability = (id: string) =>
    deleteRecord('professional_availability', id);

/**
 * =====================================================
 * TIME BLOCKS
 * =====================================================
 */

export interface TimeBlock {
    id: string;
    business_id: string;
    professional_id: string | null;
    start_datetime: string;
    end_datetime: string;
    reason: string | null;
    block_type: 'vacation' | 'holiday' | 'personal' | 'maintenance' | 'event';
    created_at: string;
    updated_at: string;
}


export const fetchTimeBlocks = () => fetchAll<TimeBlock>('time_blocks');
export const fetchTimeBlockById = (id: string) => fetchById<TimeBlock>('time_blocks', id);
export const createTimeBlock = (data: Partial<TimeBlock>) => create<TimeBlock>('time_blocks', data);
export const updateTimeBlock = (id: string, data: Partial<TimeBlock>) => update<TimeBlock>('time_blocks', id, data);
export const deleteTimeBlock = (id: string) => deleteRecord('time_blocks', id);

/**
 * =====================================================
 * BUSINESS HOURS HELPERS
 * =====================================================
 */

export interface DayHours {
    open: string;
    close: string;
    closed: boolean;
}

export interface BusinessHours {
    monday: DayHours;
    tuesday: DayHours;
    wednesday: DayHours;
    thursday: DayHours;
    friday: DayHours;
    saturday: DayHours;
    sunday: DayHours;
}

/**
 * Obter horários de funcionamento para um dia específico da semana
 * @param dayOfWeek 0=Domingo, 1=Segunda, ..., 6=Sábado
 */
export const getBusinessHoursForDay = async (dayOfWeek: number): Promise<DayHours | null> => {
    try {
        const business = await getCurrentBusiness();
        if (!business?.business_hours) return null;

        const dayNames: (keyof BusinessHours)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const dayKey = dayNames[dayOfWeek];
        const dayHours = (business.business_hours as any)[dayKey];

        if (!dayHours || dayHours.closed) return null;

        return {
            open: dayHours.open,
            close: dayHours.close,
            closed: false
        };
    } catch (error) {
        console.error('Error getting business hours for day:', error);
        return null;
    }
};

/**
 * Verificar se um profissional está disponível em um horário específico
 * @param professional Profissional
 * @param dayOfWeek 0=Domingo, 1=Segunda, ..., 6=Sábado
 * @param time Horário no formato "HH:mm"
 */
export const isProfessionalAvailable = (
    professional: Professional,
    dayOfWeek: number,
    time: string
): boolean => {
    // Se não tem horário configurado, está disponível
    if (!professional.work_schedule || professional.work_schedule.length === 0) {
        return true;
    }

    // Buscar horário para o dia da semana
    const schedule = professional.work_schedule.find(
        s => s.dayOfWeek === dayOfWeek && s.active
    );

    // Se não tem horário para este dia, não está disponível
    if (!schedule) return false;

    // Verificar se o horário está dentro do período de trabalho
    const [hour, minute] = time.split(':').map(Number);
    const timeMinutes = hour * 60 + minute;

    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;

    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
    const endMinutes = endHour * 60 + endMinute;

    // Verificar break (se existir)
    if (schedule.breakStart && schedule.breakEnd) {
        const [breakStartHour, breakStartMinute] = schedule.breakStart.split(':').map(Number);
        const breakStartMinutes = breakStartHour * 60 + breakStartMinute;

        const [breakEndHour, breakEndMinute] = schedule.breakEnd.split(':').map(Number);
        const breakEndMinutes = breakEndHour * 60 + breakEndMinute;

        // Se está no horário de break, não está disponível
        if (timeMinutes >= breakStartMinutes && timeMinutes < breakEndMinutes) {
            return false;
        }
    }

    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
};
