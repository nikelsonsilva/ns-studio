/**
 * useComanda.ts - Hook for managing comanda (checkout) logic
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { format } from 'date-fns';

export interface ComandaAppointment {
    id: string;
    start_datetime: string;
    status: string;
    professional_id: string;
    professional: {
        id: string;
        name: string;
        commission_rate: number;
    };
    service: {
        id: string;
        name: string;
        price: number;
        duration_minutes: number;
    };
    commission_amount?: number;
}

export interface Comanda {
    id?: string;
    business_id: string;
    client_id?: string;
    client_name: string;
    client_phone?: string;
    client_email?: string;
    comanda_date: string;
    appointments: ComandaAppointment[];
    subtotal: number;
    discount_amount: number;
    discount_type?: 'fixed' | 'percent';
    discount_reason?: string;
    tip_amount: number;
    tip_professional_id?: string;
    total: number;
    status: 'open' | 'closed' | 'cancelled';
}

export interface PaymentSplit {
    payment_method: 'pix' | 'credit' | 'debit' | 'cash';
    amount: number;
}

interface UseComandaResult {
    comanda: Comanda | null;
    loading: boolean;
    error: string | null;
    loadComandaByAppointment: (appointmentId: string) => Promise<void>;
    setDiscount: (amount: number, type: 'fixed' | 'percent', reason?: string) => void;
    setTip: (amount: number, professionalId?: string) => void;
    closeComanda: (payments: PaymentSplit[], emitNfse: boolean) => Promise<boolean>;
    updateAppointmentStatus: (appointmentId: string, status: string) => Promise<boolean>;
}

export function useComanda(businessId: string): UseComandaResult {
    const [comanda, setComanda] = useState<Comanda | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Load comanda by clicking on any appointment
     * Fetches ALL appointments for the same client on the same day
     */
    const loadComandaByAppointment = useCallback(async (appointmentId: string) => {
        setLoading(true);
        setError(null);

        try {
            // 1. Fetch the clicked appointment with client info
            const { data: clickedAppt, error: apptError } = await supabase
                .from('appointments')
                .select('*')
                .eq('id', appointmentId)
                .single();

            if (apptError || !clickedAppt) {
                console.error('[useComanda] Error fetching appointment:', apptError);
                throw new Error('Agendamento não encontrado');
            }

            // 2. Extract client identifiers and date (using correct field names)
            const clientId = clickedAppt.client_id;
            const customerName = clickedAppt.customer_name;
            const customerPhone = clickedAppt.customer_phone;
            const appointmentDate = format(new Date(clickedAppt.start_datetime), 'yyyy-MM-dd');

            // 3. Fetch ALL appointments for this client on this day
            let query = supabase
                .from('appointments')
                .select('*')
                .eq('business_id', businessId)
                .gte('start_datetime', `${appointmentDate}T00:00:00`)
                .lt('start_datetime', `${appointmentDate}T23:59:59`)
                .neq('status', 'cancelled')
                .neq('status', 'no_show');

            // Filter by client_id (most reliable) OR customer_name
            if (clientId) {
                query = query.eq('client_id', clientId);
            } else if (customerName) {
                query = query.eq('customer_name', customerName);
            }

            const { data: allAppointments, error: allError } = await query.order('start_datetime');

            if (allError) {
                console.error('[useComanda] Error fetching all appointments:', allError);
                throw new Error('Erro ao buscar agendamentos do cliente');
            }

            // 4. Fetch professionals and services for these appointments
            const professionalIds = [...new Set(allAppointments?.map(a => a.professional_id).filter(Boolean) || [])];
            const serviceIds = [...new Set(allAppointments?.map(a => a.service_id).filter(Boolean) || [])];

            let professionalsMap: Record<string, any> = {};
            let servicesMap: Record<string, any> = {};

            if (professionalIds.length > 0) {
                const { data: profs } = await supabase
                    .from('professionals')
                    .select('id, name, commission_rate')
                    .in('id', professionalIds);

                profs?.forEach(p => {
                    professionalsMap[p.id] = p;
                });
            }

            if (serviceIds.length > 0) {
                const { data: srvs } = await supabase
                    .from('services')
                    .select('id, name, price, duration_minutes')
                    .in('id', serviceIds);

                srvs?.forEach(s => {
                    servicesMap[s.id] = s;
                });
            }

            // 5. Calculate values with enriched data
            const appointments = (allAppointments || []).map((appt: any) => {
                const professional = professionalsMap[appt.professional_id] || { name: 'Profissional', commission_rate: 50 };
                const service = servicesMap[appt.service_id] || { name: 'Serviço', price: parseFloat(appt.amount_paid) || 0, duration_minutes: 60 };

                const servicePrice = service.price || parseFloat(appt.amount_paid) || 0;
                const commissionRate = professional.commission_rate || 50;
                const commissionAmount = servicePrice * (commissionRate / 100);

                return {
                    id: appt.id,
                    start_datetime: appt.start_datetime,
                    status: appt.status,
                    professional_id: appt.professional_id,
                    professional,
                    service,
                    commission_amount: commissionAmount
                };
            });

            const subtotal = appointments.reduce((sum: number, appt: any) =>
                sum + (appt.service?.price || 0), 0
            );

            // 6. Create comanda object
            const newComanda: Comanda = {
                business_id: businessId,
                client_id: clientId,
                client_name: customerName || 'Cliente',
                client_phone: customerPhone,
                client_email: undefined, // Not stored in appointments table
                comanda_date: appointmentDate,
                appointments,
                subtotal,
                discount_amount: 0,
                tip_amount: 0,
                total: subtotal,
                status: 'open'
            };

            console.log('[useComanda] Loaded comanda:', newComanda);
            setComanda(newComanda);

        } catch (err: any) {
            console.error('[useComanda] Error:', err);
            setError(err.message || 'Erro ao carregar comanda');
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    /**
     * Apply discount to comanda
     */
    const setDiscount = useCallback((amount: number, type: 'fixed' | 'percent', reason?: string) => {
        if (!comanda) return;

        let discountValue = amount;
        if (type === 'percent') {
            discountValue = comanda.subtotal * (amount / 100);
        }

        const newTotal = comanda.subtotal - discountValue + comanda.tip_amount;

        setComanda({
            ...comanda,
            discount_amount: discountValue,
            discount_type: type,
            discount_reason: reason,
            total: Math.max(0, newTotal)
        });
    }, [comanda]);

    /**
     * Add tip to comanda
     */
    const setTip = useCallback((amount: number, professionalId?: string) => {
        if (!comanda) return;

        const newTotal = comanda.subtotal - comanda.discount_amount + amount;

        setComanda({
            ...comanda,
            tip_amount: amount,
            tip_professional_id: professionalId,
            total: Math.max(0, newTotal)
        });
    }, [comanda]);

    /**
     * Close comanda and process payment
     */
    const closeComanda = useCallback(async (
        payments: PaymentSplit[],
        emitNfse: boolean
    ): Promise<boolean> => {
        if (!comanda) return false;

        try {
            // Validate payment total
            const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
            if (Math.abs(paymentTotal - comanda.total) > 0.01) {
                throw new Error('Total dos pagamentos não confere com o valor da comanda');
            }

            // 1. Insert comanda
            const { data: insertedComanda, error: insertError } = await supabase
                .from('comandas')
                .insert({
                    business_id: comanda.business_id,
                    client_id: comanda.client_id,
                    client_name: comanda.client_name,
                    client_phone: comanda.client_phone,
                    client_email: comanda.client_email,
                    comanda_date: comanda.comanda_date,
                    subtotal: comanda.subtotal,
                    discount_amount: comanda.discount_amount,
                    discount_type: comanda.discount_type,
                    discount_reason: comanda.discount_reason,
                    tip_amount: comanda.tip_amount,
                    tip_professional_id: comanda.tip_professional_id,
                    total: comanda.total,
                    status: 'closed',
                    closed_at: new Date().toISOString(),
                    nfse_issued: emitNfse
                })
                .select()
                .single();

            if (insertError || !insertedComanda) {
                throw new Error('Erro ao criar comanda');
            }

            // 2. Insert payment splits
            const paymentSplits = payments.map(p => ({
                comanda_id: insertedComanda.id,
                payment_method: p.payment_method,
                amount: p.amount
            }));

            const { error: splitError } = await supabase
                .from('payment_splits')
                .insert(paymentSplits);

            if (splitError) {
                console.error('[closeComanda] Payment splits error:', splitError);
            }

            // 3. Update appointments with comanda reference and status
            for (const appt of comanda.appointments) {
                await supabase
                    .from('appointments')
                    .update({
                        comanda_id: insertedComanda.id,
                        commission_amount: appt.commission_amount,
                        status: 'completed',
                        payment_status: 'paid',
                        payment_method: payments[0]?.payment_method || 'cash'
                    })
                    .eq('id', appt.id);
            }

            // 4. Emit NFS-e if requested
            if (emitNfse && comanda.client_email) {
                // TODO: Call Nuvem Fiscal API
                console.log('[closeComanda] NFS-e emission requested');
            }

            return true;

        } catch (err: any) {
            console.error('[closeComanda] Error:', err);
            setError(err.message || 'Erro ao fechar comanda');
            return false;
        }
    }, [comanda]);

    /**
     * Update single appointment status
     */
    const updateAppointmentStatus = useCallback(async (
        appointmentId: string,
        status: string
    ): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('appointments')
                .update({ status })
                .eq('id', appointmentId);

            if (error) throw error;

            // Update local state
            if (comanda) {
                setComanda({
                    ...comanda,
                    appointments: comanda.appointments.map(a =>
                        a.id === appointmentId ? { ...a, status } : a
                    )
                });
            }

            return true;
        } catch (err) {
            console.error('[updateAppointmentStatus] Error:', err);
            return false;
        }
    }, [comanda]);

    return {
        comanda,
        loading,
        error,
        loadComandaByAppointment,
        setDiscount,
        setTip,
        closeComanda,
        updateAppointmentStatus
    };
}

export default useComanda;
