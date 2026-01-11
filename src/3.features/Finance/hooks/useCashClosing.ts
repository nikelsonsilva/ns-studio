/**
 * useCashClosing.ts - Hook para gerenciar fechamento de caixa
 * Carrega dados do dia, calcula totais, fecha caixa e paga comissões
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { format, startOfDay, endOfDay } from 'date-fns';

// Types
export interface ProfessionalSummary {
    id: string;
    name: string;
    appointments_count: number;
    gross_revenue: number;
    commission_rate: number;
    commission_amount: number;
    commission_paid: boolean;
    commission_paid_amount: number;
}

export interface DaySummary {
    date: Date;
    appointments: any[];
    comandas: any[];
    professionals: ProfessionalSummary[];
    totals: {
        revenue: number;
        commissions: number;
        commissions_paid: number;
        tips: number;
        discounts: number;
        net_profit: number;
        by_payment_method: {
            pix: number;
            credit: number;
            debit: number;
            cash: number;
        };
    };
    is_closed: boolean;
    closing_id: string | null;
}

export interface CashClosing {
    id: string;
    closing_date: string;
    total_revenue: number;
    total_commissions: number;
    net_profit: number;
    appointments_count: number;
    status: 'open' | 'closed';
    closed_at: string | null;
}

export function useCashClosing(businessId: string) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [daySummary, setDaySummary] = useState<DaySummary | null>(null);

    // Load day summary
    const loadDaySummary = useCallback(async (date: Date) => {
        if (!businessId) return;

        setLoading(true);
        setError(null);

        try {
            const dateStr = format(date, 'yyyy-MM-dd');
            const startDt = startOfDay(date).toISOString();
            const endDt = endOfDay(date).toISOString();

            // 1. Check if day is already closed
            const { data: existingClosing } = await supabase
                .from('cash_closings')
                .select('*')
                .eq('business_id', businessId)
                .eq('closing_date', dateStr)
                .single();

            // 2. Load completed appointments for the day
            const { data: appointments, error: apptError } = await supabase
                .from('appointments')
                .select(`
          id,
          start_datetime,
          status,
          payment_status,
          payment_method,
          customer_name,
          professional_id,
          service_id,
          amount_paid,
          commission_amount,
          commission_paid
        `)
                .eq('business_id', businessId)
                .gte('start_datetime', startDt)
                .lte('start_datetime', endDt)
                .in('status', ['completed', 'confirmed'])
                .eq('payment_status', 'paid');

            if (apptError) throw apptError;

            // 3. Load professionals
            const { data: professionals } = await supabase
                .from('professionals')
                .select('id, name, commission_rate')
                .eq('business_id', businessId)
                .eq('is_active', true);

            // 4. Load services for prices
            const { data: services } = await supabase
                .from('services')
                .select('id, name, price')
                .eq('business_id', businessId);

            // 5. Load comandas for the day (for tips and discounts)
            const { data: comandas } = await supabase
                .from('comandas')
                .select('*')
                .eq('business_id', businessId)
                .eq('comanda_date', dateStr)
                .eq('status', 'closed');

            // 6. Load commission payments for the day
            const { data: commissionPayments } = await supabase
                .from('commission_payments')
                .select('*')
                .eq('business_id', businessId)
                .eq('reference_date', dateStr);

            // Create lookup maps
            const serviceMap = new Map(services?.map(s => [s.id, s]) || []);
            const professionalMap = new Map(professionals?.map(p => [p.id, p]) || []);

            // Calculate professional summaries
            const profSummaries: ProfessionalSummary[] = (professionals || []).map(prof => {
                const profAppointments = (appointments || []).filter(a => a.professional_id === prof.id);
                const grossRevenue = profAppointments.reduce((sum, apt) => {
                    const service = serviceMap.get(apt.service_id);
                    return sum + (service?.price || parseFloat(apt.amount_paid) || 0);
                }, 0);

                const commissionRate = prof.commission_rate || 50;
                const commissionAmount = grossRevenue * (commissionRate / 100);

                // Check if commission was paid today
                const payment = commissionPayments?.find(p => p.professional_id === prof.id);

                return {
                    id: prof.id,
                    name: prof.name,
                    appointments_count: profAppointments.length,
                    gross_revenue: grossRevenue,
                    commission_rate: commissionRate,
                    commission_amount: commissionAmount,
                    commission_paid: !!payment && payment.status === 'paid',
                    commission_paid_amount: payment?.amount_paid || 0
                };
            }).filter(p => p.appointments_count > 0);

            // Calculate totals
            const totalRevenue = profSummaries.reduce((sum, p) => sum + p.gross_revenue, 0);
            const totalCommissions = profSummaries.reduce((sum, p) => sum + p.commission_amount, 0);
            const totalCommissionsPaid = profSummaries.reduce((sum, p) => sum + p.commission_paid_amount, 0);
            const totalTips = (comandas || []).reduce((sum, c) => sum + (parseFloat(c.tip_amount) || 0), 0);
            const totalDiscounts = (comandas || []).reduce((sum, c) => sum + (parseFloat(c.discount_amount) || 0), 0);

            // Calculate by payment method
            const byPaymentMethod = (appointments || []).reduce((acc, apt) => {
                const method = apt.payment_method?.toLowerCase() || 'cash';
                const service = serviceMap.get(apt.service_id);
                const amount = service?.price || parseFloat(apt.amount_paid) || 0;

                if (method.includes('pix')) acc.pix += amount;
                else if (method.includes('credit') || method.includes('crédito')) acc.credit += amount;
                else if (method.includes('debit') || method.includes('débito')) acc.debit += amount;
                else acc.cash += amount;

                return acc;
            }, { pix: 0, credit: 0, debit: 0, cash: 0 });

            const summary: DaySummary = {
                date,
                appointments: appointments || [],
                comandas: comandas || [],
                professionals: profSummaries,
                totals: {
                    revenue: totalRevenue,
                    commissions: totalCommissions,
                    commissions_paid: totalCommissionsPaid,
                    tips: totalTips,
                    discounts: totalDiscounts,
                    net_profit: totalRevenue - totalCommissions,
                    by_payment_method: byPaymentMethod
                },
                is_closed: existingClosing?.status === 'closed',
                closing_id: existingClosing?.id || null
            };

            setDaySummary(summary);
            return summary;
        } catch (err: any) {
            console.error('❌ [useCashClosing] Error loading day summary:', err);
            setError(err.message || 'Erro ao carregar dados do dia');
            return null;
        } finally {
            setLoading(false);
        }
    }, [businessId]);

    // Close cash register for the day
    const closeCashRegister = useCallback(async (date: Date, notes?: string): Promise<boolean> => {
        if (!businessId || !daySummary) return false;

        setLoading(true);
        setError(null);

        try {
            const dateStr = format(date, 'yyyy-MM-dd');

            const closingData = {
                business_id: businessId,
                closing_date: dateStr,
                total_revenue: daySummary.totals.revenue,
                total_commissions: daySummary.totals.commissions,
                total_tips: daySummary.totals.tips,
                total_discounts: daySummary.totals.discounts,
                net_profit: daySummary.totals.net_profit,
                total_pix: daySummary.totals.by_payment_method.pix,
                total_credit: daySummary.totals.by_payment_method.credit,
                total_debit: daySummary.totals.by_payment_method.debit,
                total_cash: daySummary.totals.by_payment_method.cash,
                appointments_count: daySummary.appointments.length,
                comandas_count: daySummary.comandas.length,
                status: 'closed',
                closed_at: new Date().toISOString(),
                notes
            };

            // Upsert (insert or update)
            const { error: closeError } = await supabase
                .from('cash_closings')
                .upsert(closingData, { onConflict: 'business_id,closing_date' });

            if (closeError) throw closeError;

            // Reload summary
            await loadDaySummary(date);
            return true;
        } catch (err: any) {
            console.error('❌ [useCashClosing] Error closing cash register:', err);
            setError(err.message || 'Erro ao fechar caixa');
            return false;
        } finally {
            setLoading(false);
        }
    }, [businessId, daySummary, loadDaySummary]);

    // Pay commission to a professional
    const payCommission = useCallback(async (
        professionalId: string,
        amountDue: number,
        amountPaid: number,
        paymentMethod: string,
        referenceDate: Date,
        notes?: string
    ): Promise<boolean> => {
        if (!businessId) return false;

        setLoading(true);
        setError(null);

        try {
            const dateStr = format(referenceDate, 'yyyy-MM-dd');

            // Determine status
            const status = amountPaid >= amountDue ? 'paid' : amountPaid > 0 ? 'partial' : 'pending';

            const paymentData = {
                business_id: businessId,
                professional_id: professionalId,
                cash_closing_id: daySummary?.closing_id || null,
                amount_due: amountDue,
                amount_paid: amountPaid,
                payment_method: paymentMethod,
                reference_date: dateStr,
                status,
                paid_at: new Date().toISOString(),
                notes
            };

            const { error: payError } = await supabase
                .from('commission_payments')
                .insert(paymentData);

            if (payError) throw payError;

            // Reload summary
            await loadDaySummary(referenceDate);
            return true;
        } catch (err: any) {
            console.error('❌ [useCashClosing] Error paying commission:', err);
            setError(err.message || 'Erro ao pagar comissão');
            return false;
        } finally {
            setLoading(false);
        }
    }, [businessId, daySummary, loadDaySummary]);

    // Get closing history
    const getClosingHistory = useCallback(async (limit = 30): Promise<CashClosing[]> => {
        if (!businessId) return [];

        try {
            const { data, error } = await supabase
                .from('cash_closings')
                .select('*')
                .eq('business_id', businessId)
                .order('closing_date', { ascending: false })
                .limit(limit);

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('❌ [useCashClosing] Error loading history:', err);
            return [];
        }
    }, [businessId]);

    return {
        loading,
        error,
        daySummary,
        loadDaySummary,
        closeCashRegister,
        payCommission,
        getClosingHistory
    };
}
