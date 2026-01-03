import React, { useEffect, useState } from 'react';
import { CheckCircle2, Calendar, Clock, User, Scissors, Loader2, Check, Hourglass, Phone, MapPin, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { verifyCheckoutSession } from '../lib/stripeCheckout';
import { verifyAbacatePayBilling } from '../lib/abacatePayCheckout';

interface BookingSuccessProps {
  businessSlug?: string;
}

const BookingSuccess: React.FC<BookingSuccessProps> = ({ businessSlug }) => {
  // Parse URL params without React Router
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');
  const appointmentId = urlParams.get('appointment_id');

  // DEBUG: Log on component mount
  console.log('[BookingSuccess] ===== COMPONENT LOADED =====');
  console.log('[BookingSuccess] businessSlug:', businessSlug);
  console.log('[BookingSuccess] appointmentId:', appointmentId);
  console.log('[BookingSuccess] sessionId:', sessionId);
  console.log('[BookingSuccess] URL:', window.location.href);

  const navigate = (path: string) => { window.location.href = path; };

  // NEW: Dynamic back URL based on slug
  const bookingUrl = businessSlug ? `/${businessSlug}/agendamento` : '/agendamento';

  const [appointment, setAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[BookingSuccess] useEffect triggered - appointmentId:', appointmentId);

    const init = async () => {
      if (!appointmentId) {
        console.log('[BookingSuccess] No appointmentId, stopping');
        setLoading(false);
        return;
      }

      setVerifying(true);

      try {
        // Get appointment info first
        const { data: apt, error: aptError } = await supabase
          .from('appointments')
          .select('business_id, abacatepay_billing_id, payment_status')
          .eq('id', appointmentId)
          .single();

        console.log('[BookingSuccess] Appointment data:', apt);
        console.log('[BookingSuccess] Appointment error:', aptError);
        console.log('[BookingSuccess] Has abacatepay_billing_id:', !!apt?.abacatepay_billing_id);
        console.log('[BookingSuccess] Current payment_status:', apt?.payment_status);

        if (apt?.business_id) {
          // If Stripe session_id exists, verify with Stripe
          if (sessionId) {
            const result = await verifyCheckoutSession(sessionId, apt.business_id);
            console.log('[BookingSuccess] Stripe verification result:', result);

            if (!result.success && result.paymentStatus !== 'paid') {
              setError('Pagamento não confirmado');
              setLoading(false);
              setVerifying(false);
              return;
            }
          }
          // If Abacate Pay billing_id exists, verify with Abacate Pay
          // Uses polling to retry verification up to 5 times
          else if (apt.abacatepay_billing_id) {
            console.log('[BookingSuccess] Verifying Abacate Pay billing:', apt.abacatepay_billing_id);

            let isPaid = false;
            const maxRetries = 5;
            const retryDelay = 2000; // 2 seconds between retries

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
              console.log(`[BookingSuccess] Verification attempt ${attempt}/${maxRetries}...`);
              const result = await verifyAbacatePayBilling(apt.abacatepay_billing_id, apt.business_id);
              console.log('[BookingSuccess] Abacate Pay verification result:', result);

              if (result.success && result.paymentStatus === 'paid') {
                console.log('[BookingSuccess] ✅ Abacate Pay payment confirmed!');
                isPaid = true;
                // Wait for DB update to propagate
                await new Promise(resolve => setTimeout(resolve, 1000));
                break;
              } else {
                console.log(`[BookingSuccess] Status: ${result.paymentStatus}, devMode: ${result.devMode}`);
                if (attempt < maxRetries) {
                  console.log(`[BookingSuccess] Payment not confirmed yet, retrying in ${retryDelay / 1000}s...`);
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
              }
            }

            if (!isPaid) {
              console.log('[BookingSuccess] ⚠️ Payment not confirmed after all retries');
            }
          }

          // Additional delay to ensure DB update is complete
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (err) {
        console.error('Error verifying payment:', err);
      }
      setVerifying(false);

      // Load appointment details AFTER verification is complete
      await loadAppointment(appointmentId);
    };

    init();
  }, [sessionId, appointmentId]);

  const loadAppointment = async (id: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients(name, phone),
          service:services(name, price, duration_minutes),
          professional:professionals(name),
          business:businesses(business_name, address, complement, phone, city, state, zip_code)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setAppointment(data);
    } catch (err) {
      console.error('Error loading appointment:', err);
      setError('Agendamento não encontrado');
    } finally {
      setLoading(false);
    }
  };

  if (loading || verifying) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 text-[var(--brand-primary)] animate-spin" size={32} />
          <p className="text-[var(--text-primary)] text-sm">
            {verifying ? 'Verificando pagamento...' : 'Carregando...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center bg-zinc-900 p-6 rounded-xl border border-zinc-800 max-w-sm w-full">
          <h1 className="text-lg font-bold text-[var(--text-primary)] mb-2">{error || 'Agendamento não encontrado'}</h1>
          <button
            onClick={() => navigate('/booking')}
            className="bg-[var(--brand-primary)] text-black px-4 py-2 rounded-lg font-bold text-sm w-full mt-4"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // Parse date from date + time or start_datetime
  const appointmentDate = appointment.start_datetime
    ? new Date(appointment.start_datetime)
    : new Date(`${appointment.date}T${appointment.time}`);

  const isPaid = appointment.payment_status === 'paid';

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-zinc-900 max-w-md w-full rounded-xl border border-zinc-800 overflow-hidden">

        {/* Header - Clean & Compact */}
        <div className={`border-b p-5 text-center ${isPaid
          ? 'bg-emerald-500/10 border-emerald-500/20'
          : 'bg-amber-500/10 border-amber-500/20'
          }`}>
          <CheckCircle2 className={`mx-auto mb-2 ${isPaid ? 'text-emerald-500' : 'text-amber-500'}`} size={40} />
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{isPaid ? 'Confirmado!' : 'Pendente'}</h1>
          <p className="text-zinc-400 text-sm">
            {isPaid ? 'Pagamento aprovado' : 'Aguardando pagamento'}
          </p>
        </div>

        {/* Details - Compact Grid */}
        <div className="p-5 space-y-4">

          {/* Business */}
          <div className="text-center pb-3 border-b border-zinc-800 space-y-2">
            <p className="text-[var(--text-primary)] font-bold">{appointment.business?.business_name}</p>

            {/* Address with map link */}
            {appointment.business?.address && (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1 text-zinc-400 text-xs">
                  <MapPin size={12} />
                  <span>{appointment.business.address}{appointment.business.complement ? `, ${appointment.business.complement}` : ''}</span>
                </div>
                {appointment.business.city && (
                  <p className="text-zinc-500 text-xs">
                    {appointment.business.city}{appointment.business.state ? ` - ${appointment.business.state}` : ''}
                  </p>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    [appointment.business.address, appointment.business.complement, appointment.business.city, appointment.business.state, appointment.business.zip_code].filter(Boolean).join(', ')
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[var(--brand-primary)] hover:underline text-xs"
                >
                  <ExternalLink size={10} />
                  ver no mapa
                </a>
              </div>
            )}

            {/* Phone */}
            {appointment.business?.phone && (
              <a
                href={`tel:${appointment.business.phone}`}
                className="flex items-center justify-center gap-1 text-zinc-400 hover:text-[var(--brand-primary)] text-xs transition-colors"
              >
                <Phone size={12} />
                <span>{appointment.business.phone}</span>
              </a>
            )}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Service */}
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Scissors size={12} />
                <span className="text-[10px] uppercase">Serviço</span>
              </div>
              <p className="text-[var(--text-primary)] text-sm font-medium truncate">{appointment.service?.name}</p>
              <p className="text-emerald-500 text-xs">R$ {appointment.service?.price?.toFixed(2)}</p>
            </div>

            {/* Professional */}
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <User size={12} />
                <span className="text-[10px] uppercase">Profissional</span>
              </div>
              <p className="text-[var(--text-primary)] text-sm font-medium truncate">{appointment.professional?.name}</p>
            </div>

            {/* Date */}
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Calendar size={12} />
                <span className="text-[10px] uppercase">Data</span>
              </div>
              <p className="text-[var(--text-primary)] text-sm font-medium">
                {format(appointmentDate,"dd/MM", { locale: ptBR })}
              </p>
              <p className="text-zinc-500 text-xs capitalize">
                {format(appointmentDate, 'EEE', { locale: ptBR })}
              </p>
            </div>

            {/* Time */}
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-500 mb-1">
                <Clock size={12} />
                <span className="text-[10px] uppercase">Horário</span>
              </div>
              <p className="text-[var(--text-primary)] text-sm font-bold font-mono">
                {format(appointmentDate, 'HH:mm')}
              </p>
            </div>
          </div>

          {/* Payment Status Badge */}
          <div className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium ${isPaid
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
            {isPaid ? (
              <><Check size={14} /> Pago</>
            ) : (
              <><Hourglass size={14} /> Pendente</>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2">
            <button
              onClick={() => navigate(bookingUrl)}
              className="w-full bg-[var(--brand-primary)] text-black py-3 rounded-lg font-bold text-sm hover:brightness-110 transition-all"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;
