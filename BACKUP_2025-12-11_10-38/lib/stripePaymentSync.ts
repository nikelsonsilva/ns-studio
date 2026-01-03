import { supabase } from './supabase';

/**
 * Sincroniza o status de pagamento de um agendamento com o Stripe
 * Verifica se o Payment Link foi pago e atualiza o status no banco
 */
export async function syncStripePaymentStatus(appointmentId: string): Promise<boolean> {
    try {
        // 1. Buscar agendamento
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('payment_link, payment_status, status')
            .eq('id', appointmentId)
            .single();

        if (fetchError || !appointment) {
            console.error('❌ Appointment not found:', appointmentId);
            return false;
        }

        // 2. Se já está pago, não precisa verificar
        if (appointment.payment_status === 'paid') {
            console.log('✅ Already paid:', appointmentId);
            return true;
        }

        // 3. Se não tem payment_link, não pode verificar
        if (!appointment.payment_link) {
            console.log('⚠️ No payment link:', appointmentId);
            return false;
        }

        // 4. Extrair Payment Link ID do URL
        const paymentLinkId = extractPaymentLinkId(appointment.payment_link);
        if (!paymentLinkId) {
            console.error('❌ Invalid payment link format');
            return false;
        }

        // 5. Verificar status no Stripe
        const isPaid = await checkStripePaymentLinkStatus(paymentLinkId);

        // 6. Se foi pago, atualizar banco de dados
        if (isPaid) {
            const { error: updateError } = await supabase
                .from('appointments')
                .update({
                    payment_status: 'paid',
                    status: 'confirmed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', appointmentId);

            if (updateError) {
                console.error('❌ Error updating appointment:', updateError);
                return false;
            }

            console.log('✅ Payment confirmed for appointment:', appointmentId);
            return true;
        }

        return false;
    } catch (error) {
        console.error('❌ Error syncing payment status:', error);
        return false;
    }
}

/**
 * Extrai o Payment Link ID do URL do Stripe
 */
function extractPaymentLinkId(paymentLink: string): string | null {
    try {
        // URL format: https://buy.stripe.com/test_XXXXX ou https://buy.stripe.com/XXXXX
        const match = paymentLink.match(/buy\.stripe\.com\/(test_)?([a-zA-Z0-9]+)/);
        return match ? match[2] : null;
    } catch {
        return null;
    }
}

/**
 * Verifica o status de um Payment Link no Stripe
 */
async function checkStripePaymentLinkStatus(paymentLinkId: string): Promise<boolean> {
    try {
        // ✅ CORRIGIDO: Carregar chave do banco de dados
        const { getStripeSecretKey } = await import('./stripeConfig');
        const stripeSecretKey = await getStripeSecretKey();

        if (!stripeSecretKey) {
            console.error('❌ Stripe secret key not configured in database');
            return false;
        }

        // Buscar todas as sessões de checkout para este Payment Link
        const response = await fetch(
            `https://api.stripe.com/v1/checkout/sessions?payment_link=${paymentLinkId}&limit=10`,
            {
                headers: {
                    'Authorization': `Bearer ${stripeSecretKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        if (!response.ok) {
            console.error('❌ Stripe API error:', response.status);
            return false;
        }

        const data = await response.json();

        // Verificar se alguma sessão foi paga
        const hasPaidSession = data.data?.some(
            (session: any) => session.payment_status === 'paid'
        );

        return hasPaidSession || false;
    } catch (error) {
        console.error('❌ Error checking Stripe status:', error);
        return false;
    }
}

/**
 * Sincroniza todos os agendamentos pendentes de pagamento
 */
export async function syncAllPendingPayments(): Promise<number> {
    try {
        // Buscar todos os agendamentos aguardando pagamento
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select('id')
            .eq('payment_status', 'awaiting_payment')
            .not('payment_link', 'is', null);

        if (error || !appointments) {
            console.error('❌ Error fetching pending appointments:', error);
            return 0;
        }

        console.log(`🔄 Syncing ${appointments.length} pending payments...`);

        let updatedCount = 0;

        // Verificar cada agendamento
        for (const appointment of appointments) {
            const wasUpdated = await syncStripePaymentStatus(appointment.id);
            if (wasUpdated) {
                updatedCount++;
            }
        }

        console.log(`✅ Updated ${updatedCount} payments`);
        return updatedCount;
    } catch (error) {
        console.error('❌ Error syncing all payments:', error);
        return 0;
    }
}
