/**
 * =====================================================
 * PUBLIC API ENDPOINTS
 * =====================================================
 * Endpoints públicos para integração com WhatsApp bot e link público
 * Autenticação via API token no header Authorization
 * =====================================================
 */

import { supabase } from './supabase';
import { getCurrentBusinessId } from './database';
import {
    getAvailableSlots,
    isSlotAvailable,
    createPublicAppointment,
    getBookingSettings
} from './availability';

// =====================================================
// TYPES
// =====================================================

export interface PublicAPIResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PublicService {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    price: number;
    duration_minutes: number;
    image_url: string | null;
}

export interface PublicProfessional {
    id: string;
    name: string;
    specialty: string | null;
    avatar_url: string | null;
    rating: number;
}

export interface AvailabilityRequest {
    professional_id: string;
    service_id: string;
    date: string; // YYYY-MM-DD
}

export interface CreateAppointmentRequest {
    professional_id: string;
    service_id: string;
    client_name: string;
    client_phone: string;
    client_email?: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    notes?: string;
}

// =====================================================
// AUTHENTICATION
// =====================================================

/**
 * Valida o token de API e retorna o business_id
 */
export async function validateAPIToken(token: string): Promise<string | null> {
    if (!token || !token.startsWith('bk_')) {
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('businesses')
            .select('id')
            .eq('booking_settings->>api_token', token)
            .single();

        if (error || !data) {
            console.error('Invalid API token:', error);
            return null;
        }

        return data.id;
    } catch (error) {
        console.error('Error validating API token:', error);
        return null;
    }
}

/**
 * Middleware para autenticar requisições públicas
 */
export async function authenticatePublicRequest(
    authHeader: string | null
): Promise<{ authenticated: boolean; businessId?: string; error?: string }> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authenticated: false, error: 'Missing or invalid Authorization header' };
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    const businessId = await validateAPIToken(token);

    if (!businessId) {
        return { authenticated: false, error: 'Invalid API token' };
    }

    return { authenticated: true, businessId };
}

// =====================================================
// PUBLIC ENDPOINTS
// =====================================================

/**
 * GET /api/public/services
 * Lista todos os serviços ativos do negócio
 */
export async function getPublicServices(
    businessId: string
): Promise<PublicAPIResponse<PublicService[]>> {
    try {
        const { data, error } = await supabase
            .from('services')
            .select('id, name, description, category, price, duration_minutes, image_url')
            .eq('business_id', businessId)
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching public services:', error);
            return { success: false, error: 'Failed to fetch services' };
        }

        return { success: true, data: data as PublicService[] };
    } catch (error) {
        console.error('Unexpected error in getPublicServices:', error);
        return { success: false, error: 'Internal server error' };
    }
}

/**
 * GET /api/public/professionals
 * Lista todos os profissionais ativos do negócio
 */
export async function getPublicProfessionals(
    businessId: string
): Promise<PublicAPIResponse<PublicProfessional[]>> {
    try {
        const { data, error } = await supabase
            .from('professionals')
            .select('id, name, specialty, avatar_url, rating')
            .eq('business_id', businessId)
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching public professionals:', error);
            return { success: false, error: 'Failed to fetch professionals' };
        }

        return { success: true, data: data as PublicProfessional[] };
    } catch (error) {
        console.error('Unexpected error in getPublicProfessionals:', error);
        return { success: false, error: 'Internal server error' };
    }
}

/**
 * GET /api/public/availability
 * Retorna os horários disponíveis para um profissional em uma data
 */
export async function getPublicAvailability(
    businessId: string,
    request: AvailabilityRequest
): Promise<PublicAPIResponse<{ slots: string[]; date: string }>> {
    try {
        // Validar dados
        if (!request.professional_id || !request.service_id || !request.date) {
            return { success: false, error: 'Missing required fields' };
        }

        // Buscar duração do serviço
        const { data: service, error: serviceError } = await supabase
            .from('services')
            .select('duration_minutes')
            .eq('id', request.service_id)
            .eq('business_id', businessId)
            .single();

        if (serviceError || !service) {
            return { success: false, error: 'Service not found' };
        }

        // Calcular slots disponíveis
        const slots = await getAvailableSlots(
            businessId,
            request.professional_id,
            request.date,
            service.duration_minutes
        );

        const availableTimes = slots.filter(s => s.available).map(s => s.time);

        return {
            success: true,
            data: {
                date: request.date,
                slots: availableTimes
            }
        };
    } catch (error) {
        console.error('Unexpected error in getPublicAvailability:', error);
        return { success: false, error: 'Internal server error' };
    }
}

/**
 * POST /api/public/appointments
 * Cria um novo agendamento
 */
export async function createPublicAppointmentEndpoint(
    businessId: string,
    request: CreateAppointmentRequest
): Promise<PublicAPIResponse<{ appointment_id: string }>> {
    try {
        // Validar dados obrigatórios
        if (!request.professional_id || !request.service_id ||
            !request.client_name || !request.client_phone ||
            !request.date || !request.time) {
            return { success: false, error: 'Missing required fields' };
        }

        // Criar agendamento
        const result = await createPublicAppointment(businessId, {
            professional_id: request.professional_id,
            service_id: request.service_id,
            client_name: request.client_name,
            client_phone: request.client_phone,
            client_email: request.client_email,
            date: request.date,
            time: request.time,
            notes: request.notes
        });

        if (!result.success) {
            return { success: false, error: result.error || 'Failed to create appointment' };
        }

        return {
            success: true,
            data: { appointment_id: result.appointmentId! },
            message: 'Appointment created successfully'
        };
    } catch (error) {
        console.error('Unexpected error in createPublicAppointmentEndpoint:', error);
        return { success: false, error: 'Internal server error' };
    }
}

/**
 * GET /api/public/business-info
 * Retorna informações básicas do negócio
 */
export async function getPublicBusinessInfo(
    businessId: string
): Promise<PublicAPIResponse<{ name: string; address: string | null; phone: string | null }>> {
    try {
        const { data, error } = await supabase
            .from('businesses')
            .select('business_name, address, phone')
            .eq('id', businessId)
            .single();

        if (error || !data) {
            return { success: false, error: 'Business not found' };
        }

        return {
            success: true,
            data: {
                name: data.business_name,
                address: data.address,
                phone: data.phone
            }
        };
    } catch (error) {
        console.error('Unexpected error in getPublicBusinessInfo:', error);
        return { success: false, error: 'Internal server error' };
    }
}

// =====================================================
// HELPER: Gerar novo API token
// =====================================================

/**
 * Gera um novo API token para o negócio
 */
export async function generateNewAPIToken(): Promise<string | null> {
    try {
        const businessId = await getCurrentBusinessId();
        if (!businessId) {
            console.error('No business found for current user');
            return null;
        }

        // Gerar token
        const token = `bk_${Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')}`;

        // Atualizar no banco
        const { error } = await supabase
            .from('businesses')
            .update({
                booking_settings: {
                    ...((await getBookingSettings(businessId)) || {}),
                    api_token: token
                }
            })
            .eq('id', businessId);

        if (error) {
            console.error('Error updating API token:', error);
            return null;
        }

        return token;
    } catch (error) {
        console.error('Unexpected error generating API token:', error);
        return null;
    }
}
