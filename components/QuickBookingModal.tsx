/**
 * QuickBookingModal.tsx
 * Modal simplificado para agendamentos a partir de"Disponíveis Agora"
 * SEM verificação de overlap (o slot já é verificado como livre)
 */
import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Mail, Phone, Copy, AlertTriangle, Link as LinkIcon,
  Banknote, CreditCard, CheckCircle, Zap, Sparkles, X, User, Check,
  Search, ArrowRight, Clock, UserPlus
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { createUTCFromBrazil, formatBrazil, fromUTC } from '../lib/timezone';
import { getCurrentBusinessId } from '../lib/database';
import { createStripePaymentLink } from '../lib/stripePaymentLinks';
import { copyToClipboard } from '../lib/bookingLinks';
import { isStripeConfigured } from '../lib/stripeConfig';
import Toast from './Toast';
import { Modal, Input, Button, Select } from './ui';
import type { Client, Service, Professional } from '../types';

interface QuickBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedDate: Date;
  selectedTime: string;
  professional: Professional;
  /** Optional: ID of the service filter used in AvailableNowBar */
  preSelectedServiceId?: string;
  /** Time until which the professional is free (from AvailableNowBar) */
  freeUntil?: Date;
}

type Step = 1 | 2 | 3;
type PaymentMethod = 'online' | 'presential' | null;

const QuickBookingModal: React.FC<QuickBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedDate,
  selectedTime,
  professional,
  preSelectedServiceId,
  freeUntil
}) => {
  // State
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [businessId, setBusinessId] = useState<string>('');

  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [bookingLink, setBookingLink] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(false);

  // New client creation state
  const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Duration warning state (if service extends past next appointment)
  const [showDurationWarning, setShowDurationWarning] = useState(false);
  const [nextAppointmentTime, setNextAppointmentTime] = useState<string | null>(null);

  useEffect(() => {
    const checkStripe = async () => {
      const configured = await isStripeConfigured();
      setStripeConfigured(configured);
    };
    checkStripe();
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetModal();
      loadBusinessId();
      loadServices();
      loadClients();
      loadNextAppointment();
    }
  }, [isOpen]);

  useEffect(() => {
    filterClients();
  }, [searchTerm, clients]);

  // Pre-select service if provided
  useEffect(() => {
    if (preSelectedServiceId && services.length > 0) {
      const service = services.find(s => s.id === preSelectedServiceId);
      if (service) setSelectedService(service);
    }
  }, [preSelectedServiceId, services]);

  const resetModal = () => {
    setCurrentStep(1);
    setSelectedClient(null);
    setSelectedService(null);
    setPaymentMethod(null);
    setBookingLink('');
    setSearchTerm('');
    setError('');
    setIsCreatingNewClient(false);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientEmail('');
  };

  const loadBusinessId = async () => {
    const { data } = await supabase
      .from('businesses')
      .select('id')
      .single();

    if (data) {
      setBusinessId(data.id);
    }
  };

  // Load the next REGULAR appointment for this professional after the current time
  // Encaixes are excluded - they don't block regular slots
  const loadNextAppointment = async () => {
    const now = new Date();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Get appointments for this professional after current time (excluding encaixes)
    const { data } = await supabase
      .from('appointments')
      .select('start_datetime, is_encaixe')
      .eq('professional_id', professional.id)
      .gte('start_datetime', now.toISOString())
      .not('status', 'in', '("cancelled","canceled","no_show")')
      .or('is_encaixe.is.null,is_encaixe.eq.false') // Exclude encaixes
      .order('start_datetime', { ascending: true })
      .limit(1);

    if (data && data.length > 0) {
      // IMPORTANT: Convert from UTC to Brazil timezone
      const nextAppt = fromUTC(data[0].start_datetime);
      const timeStr = `${String(nextAppt.getHours()).padStart(2, '0')}:${String(nextAppt.getMinutes()).padStart(2, '0')}`;
      console.log('[QuickBooking] Next regular appointment:', timeStr);
      setNextAppointmentTime(timeStr);
    } else {
      console.log('[QuickBooking] No next regular appointment found');
      setNextAppointmentTime(null);
    }
  };

  const loadServices = async () => {
    // Load only services this professional offers
    const { data: profServices } = await supabase
      .from('professional_services')
      .select('service_id')
      .eq('professional_id', professional.id);

    const serviceIds = profServices?.map(ps => ps.service_id) || [];

    if (serviceIds.length > 0) {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .in('id', serviceIds)
        .order('name');

      if (data && data.length > 0) {
        setServices(data);
        setSelectedService(data[0]);
      }
    } else {
      // Fallback: load all services
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (data && data.length > 0) {
        setServices(data);
        setSelectedService(data[0]);
      }
    }
  };

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('name');

    if (data) {
      setClients(data);
      setFilteredClients(data);
    }
  };

  const filterClients = () => {
    if (!searchTerm) {
      setFilteredClients(clients);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = clients.filter(client =>
      client.name.toLowerCase().includes(term) ||
      client.phone?.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term)
    );
    setFilteredClients(filtered);
  };

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
    setCurrentStep(2);
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      setError('Nome e obrigatorio');
      return;
    }
    if (!newClientPhone.trim()) {
      setError('Telefone e obrigatorio');
      return;
    }

    setIsCreatingClient(true);
    setError('');

    try {
      const { data, error: insertError } = await supabase
        .from('clients')
        .insert({
          business_id: businessId,
          name: newClientName.trim(),
          phone: newClientPhone.trim(),
          email: newClientEmail.trim() || null
        })
        .select()
        .single();

      if (insertError) throw insertError;

      if (data) {
        console.log('[QuickBooking] Client created:', data.name);
        setClients([data, ...clients]);
        setSelectedClient(data);
        setIsCreatingNewClient(false);
        setCurrentStep(2);
      }
    } catch (err: any) {
      console.error('[QuickBooking] Error creating client:', err);
      setError(err.message || 'Erro ao criar cliente');
    }

    setIsCreatingClient(false);
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setError('');
  };

  const handleContinueToPayment = () => {
    if (!selectedService) {
      setError('Selecione um servico');
      return;
    }

    // Check if service duration extends past the next appointment
    if (nextAppointmentTime && selectedService) {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const [nextHours, nextMinutes] = nextAppointmentTime.split(':').map(Number);

      const serviceStartMinutes = hours * 60 + minutes;
      const serviceEndMinutes = serviceStartMinutes + selectedService.duration_minutes;
      const nextApptMinutes = nextHours * 60 + nextMinutes;

      console.log('[QuickBooking] Checking conflict:', {
        serviceStart: selectedTime,
        serviceEnd: `${Math.floor(serviceEndMinutes / 60)}:${String(serviceEndMinutes % 60).padStart(2, '0')}`,
        nextAppointment: nextAppointmentTime
      });

      if (serviceEndMinutes > nextApptMinutes) {
        console.log('[QuickBooking] Service extends past next appointment - showing warning');
        setShowDurationWarning(true);
      } else {
        setShowDurationWarning(false);
      }
    } else {
      setShowDurationWarning(false);
    }

    setCurrentStep(3);
  };

  const handleCreateAppointment = async () => {
    if (!selectedClient || !selectedService) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    if (!paymentMethod) {
      setError('Selecione um metodo de pagamento');
      return;
    }

    // Ensure selectedDate is a valid Date object
    const effectiveDate = selectedDate && !isNaN(selectedDate.getTime()) ? selectedDate : new Date();

    setIsLoading(true);
    setError('');

    try {
      if (paymentMethod === 'online' && !stripeConfigured) {
        setError('Configure o Stripe em Financas -> Configurar Stripe primeiro!');
        setIsLoading(false);
        return;
      }

      // NO OVERLAP CHECK - this is the key difference!
      // The slot is already verified as available from AvailableNowBar

      const [hours, minutes] = selectedTime.split(':').map(Number);
      const year = effectiveDate.getFullYear();
      const month = effectiveDate.getMonth();
      const day = effectiveDate.getDate();

      // Usar utilitário de timezone do Brasil
      const startDateTime = createUTCFromBrazil(year, month, day, hours, minutes);
      const endDateTime = new Date(startDateTime.getTime() + selectedService.duration_minutes * 60000);

      console.log('[QuickBooking] Creating appointment:', {
        time: selectedTime,
        start: startDateTime.toISOString(),
        end: endDateTime.toISOString(),
        professional: professional.name
      });

      const appointmentData = {
        business_id: businessId,
        client_id: selectedClient.id,
        service_id: selectedService.id,
        professional_id: professional.id,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        status: paymentMethod === 'presential' ? 'confirmed' : 'pending',
        payment_status: paymentMethod === 'presential' ? 'pending' : 'awaiting_payment',
        payment_method: paymentMethod,
        customer_name: selectedClient.name,
        is_encaixe: true // Encaixes não bloqueiam slots regulares
      };

      const { data, error: insertError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('[QuickBooking] Appointment created:', data.id);

      if (paymentMethod === 'online' && data && selectedClient) {
        const stripeLink = await createStripePaymentLink(
          data.id,
          selectedService.id,
          selectedClient.name,
          selectedClient.email
        );

        if (stripeLink) {
          console.log('[QuickBooking] Payment link generated');
          setBookingLink(stripeLink);
          await supabase
            .from('appointments')
            .update({ payment_link: stripeLink })
            .eq('id', data.id);
        } else {
          console.error('[QuickBooking] Failed to generate payment link');
          setError('Erro ao gerar link. Verifique se o servico esta sincronizado com o Stripe.');
          setIsLoading(false);
          return;
        }
      } else {
        onSuccess();
        onClose();
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('[QuickBooking] Error creating appointment:', err);
      setError(err.message || 'Erro ao criar agendamento');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
        style={{
          backgroundColor: 'var(--dark-modal-overlay)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
        onClick={onClose}
      >
        {/* Modal Container */}
        <div
          className="w-full max-w-lg rounded-2xl overflow-hidden animate-slideUp"
          style={{
            background: 'var(--dark-modal-bg)',
            border: '1px solid var(--dark-modal-border)',
            boxShadow: 'var(--dark-modal-shadow)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Premium Header - Subtle Alignment */}
          <div
            className="relative px-6 py-5"
            style={{
              background: 'var(--dark-modal-header-bg)',
              borderBottom: '1px solid var(--dark-modal-border)'
            }}
          >
            {/* Decorative glow */}
            <div
              className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-10 blur-3xl"
              style={{ background: 'radial-gradient(circle, var(--dark-brand-primary) 0%, transparent 70%)' }}
            />

            <div className="relative flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'var(--dark-brand-10)',
                    border: '1px solid var(--dark-brand-20)'
                  }}
                >
                  <Zap size={20} style={{ color: 'var(--dark-brand-primary)' }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--dark-text-main)' }}>Agendamento Rápido</h3>
                  <p className="text-xs" style={{ color: 'var(--dark-text-muted)' }}>
                    {selectedDate && !isNaN(selectedDate.getTime()) ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR }) : 'Data não disponível'} • {selectedTime} • {professional.name}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                style={{ color: 'var(--dark-text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>
          </div>
          {/* Step Progress - Premium Design */}
          <div className="px-6 py-4" style={{ background: 'var(--dark-bg-elevated-30)' }}>
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Cliente', icon: User },
                { num: 2, label: 'Serviço', icon: Zap },
                { num: 3, label: 'Pagamento', icon: CreditCard }
              ].map((step, index, array) => {
                const IconComponent = step.icon;
                const isCompleted = currentStep > step.num;
                const isActive = currentStep === step.num;

                return (
                  <React.Fragment key={step.num}>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className="relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300"
                        style={{
                          background: isCompleted
                            ? 'var(--dark-status-confirmed-bg)'
                            : isActive
                              ? 'var(--dark-brand-10)'
                              : 'var(--dark-bg-subtle-20)',
                          border: isCompleted
                            ? '1px solid var(--dark-status-confirmed-border)'
                            : isActive
                              ? '1px solid var(--dark-brand-30)'
                              : '1px solid var(--dark-border-default)'
                        }}
                      >
                        {isCompleted ? (
                          <Check size={20} style={{ color: 'var(--dark-status-confirmed)' }} />
                        ) : (
                          <IconComponent
                            size={20}
                            style={{ color: isActive ? 'var(--dark-brand-primary)' : 'var(--dark-text-faint)' }}
                          />
                        )}

                        {/* Pulse animation for active step - very subtle */}
                        {isActive && (
                          <div
                            className="absolute inset-0 rounded-2xl animate-pulse"
                            style={{
                              background: 'var(--dark-brand-primary)',
                              opacity: 0.1
                            }}
                          />
                        )}
                      </div>
                      <span
                        className="text-[11px] font-medium tracking-wide"
                        style={{
                          color: isCompleted
                            ? 'var(--dark-status-confirmed)'
                            : isActive
                              ? 'var(--dark-brand-primary)'
                              : 'var(--dark-text-faint)'
                        }}
                      >
                        {step.label}
                      </span>
                    </div>

                    {index < array.length - 1 && (
                      <div className="flex-1 mx-3 relative h-0.5">
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{ background: 'var(--dark-border-subtle)' }}
                        />
                        <div
                          className="absolute inset-0 rounded-full transition-all duration-500"
                          style={{
                            background: isCompleted
                              ? 'var(--dark-status-confirmed)'
                              : 'transparent',
                            width: isCompleted ? '100%' : '0%',
                            opacity: 0.5
                          }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {/* Quick Booking Badge / Duration Warning */}
            {!showDurationWarning ? (
              <div
                className="mb-4 p-3 rounded-xl flex items-center gap-3"
                style={{
                  background: 'var(--dark-badge-success-bg)',
                  border: '1px solid var(--dark-badge-success-border)'
                }}
              >
                <Zap size={16} style={{ color: 'var(--dark-badge-success-text)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--dark-badge-success-text)' }}>
                  Encaixe disponível - horário livre
                </span>
              </div>
            ) : (
              <div
                className="mb-4 p-3 rounded-xl flex flex-col gap-1"
                style={{
                  background: 'var(--dark-badge-warning-bg)',
                  border: '1px solid var(--dark-badge-warning-border)'
                }}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle size={16} style={{ color: 'var(--dark-badge-warning-text)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--dark-badge-warning-text)' }}>
                    Aviso: Serviço pode conflitar com próximo agendamento
                  </span>
                </div>
                {nextAppointmentTime && (
                  <span className="text-[10px] ml-7 font-bold uppercase tracking-wider" style={{ color: 'var(--dark-text-subtle)' }}>
                    Próximo agendamento às {nextAppointmentTime}
                  </span>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                className="mb-4 p-4 rounded-xl flex items-start gap-3 animate-shake"
                style={{
                  background: 'var(--dark-badge-danger-bg)',
                  border: '1px solid var(--dark-badge-danger-border)'
                }}
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--dark-btn-danger-bg)' }}>
                  <X size={12} style={{ color: 'var(--dark-badge-danger-text)' }} />
                </div>
                <p className="text-sm" style={{ color: 'var(--dark-badge-danger-text)' }}>{error}</p>
              </div>
            )}

            {/* Step 1: Select Client */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-white">
                    {isCreatingNewClient ? 'Cadastrar Cliente' : 'Selecionar Cliente'}
                  </h2>
                  <button
                    onClick={() => {
                      setIsCreatingNewClient(!isCreatingNewClient);
                      setError('');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: 'var(--dark-brand-5)',
                      color: 'var(--dark-brand-primary)',
                      border: '1px solid var(--dark-brand-20)'
                    }}
                  >
                    {isCreatingNewClient ? (
                      <><Search size={12} /> Buscar</>
                    ) : (
                      <><UserPlus size={12} /> Novo</>
                    )}
                  </button>
                </div>

                {isCreatingNewClient ? (
                  <div className="space-y-4">
                    {/* Name Input */}
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-2 font-medium">
                        Nome Completo *
                      </label>
                      <div className="relative group">
                        <User
                          size={16}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors"
                        />
                        <input
                          type="text"
                          placeholder="Digite o nome..."
                          className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition-all"
                          style={{
                            background: 'var(--dark-bg-input)',
                            border: '1px solid var(--dark-border-default)'
                          }}
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Phone Input */}
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-2 font-medium">
                        Telefone *
                      </label>
                      <div className="relative group">
                        <Phone
                          size={16}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors"
                        />
                        <input
                          type="tel"
                          placeholder="(11) 99999-9999"
                          className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition-all"
                          style={{
                            background: 'var(--dark-bg-input)',
                            border: '1px solid var(--dark-border-default)'
                          }}
                          value={newClientPhone}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, '');
                            if (v.length > 11) v = v.substring(0, 11);
                            if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
                            if (v.length > 9) v = `${v.substring(0, 9)}-${v.substring(9)}`;
                            setNewClientPhone(v);
                          }}
                        />
                      </div>
                    </div>

                    {/* Email Input */}
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-2 font-medium">
                        Email <span className="text-zinc-600">(opcional)</span>
                      </label>
                      <div className="relative group">
                        <Mail
                          size={16}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors"
                        />
                        <input
                          type="email"
                          placeholder="email@exemplo.com"
                          className="w-full pl-11 pr-4 py-3 rounded-xl text-sm text-white placeholder-zinc-600 outline-none transition-all"
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)'
                          }}
                          value={newClientEmail}
                          onChange={(e) => setNewClientEmail(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Create Button */}
                    <button
                      onClick={handleCreateClient}
                      disabled={isCreatingClient || !newClientName.trim() || !newClientPhone.trim()}
                      className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{
                        background: 'var(--dark-brand-primary)',
                        color: 'var(--dark-text-inverted)'
                      }}
                    >
                      {isCreatingClient ? (
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      ) : (
                        <><UserPlus size={18} /> Criar e Continuar</>
                      )}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Search Input */}
                    <div className="relative group">
                      <div className="absolute left-4 top-0 bottom-0 flex items-center">
                        <Search size={18} className="text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar cliente..."
                        className="w-full pl-12 pr-4 py-3.5 rounded-xl text-sm outline-none transition-all"
                        style={{
                          background: 'var(--dark-bg-input)',
                          border: '1px solid var(--dark-border-default)',
                          color: 'var(--dark-text-main)'
                        }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                      />
                    </div>

                    {/* Client List */}
                    <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
                      {filteredClients.length === 0 ? (
                        <div className="text-center py-8">
                          <div
                            className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                            style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                          >
                            <User size={24} className="text-zinc-600" />
                          </div>
                          <p className="text-sm text-zinc-500 mb-2">Nenhum cliente encontrado</p>
                          <button
                            onClick={() => setIsCreatingNewClient(true)}
                            className="text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors"
                          >
                            + Criar novo cliente
                          </button>
                        </div>
                      ) : (
                        filteredClients.map((client, index) => (
                          <button
                            key={client.id}
                            onClick={() => handleClientSelect(client)}
                            className="w-full p-4 rounded-xl flex items-center justify-between transition-all group"
                            style={{
                              background: 'var(--dark-bg-elevated-30)',
                              border: '1px solid var(--dark-border-subtle)',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                                style={{
                                  background: `linear-gradient(135deg, hsl(${(index * 40) % 360}, 60%, 50%) 0%, hsl(${(index * 40 + 30) % 360}, 60%, 40%) 100%)`,
                                  color: 'white'
                                }}
                              >
                                {client.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="text-left">
                                <div className="font-semibold text-white text-sm">{client.name}</div>
                                <div className="text-xs text-zinc-500">{client.phone}</div>
                              </div>
                            </div>
                            <ArrowRight
                              size={18}
                              className="text-zinc-600 group-hover:text-amber-500 transition-colors"
                            />
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Service Selection */}
            {currentStep === 2 && selectedClient && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-white/5 active:scale-95"
                    style={{ background: 'var(--dark-bg-subtle-20)', border: '1px solid var(--dark-border-default)' }}
                  >
                    <ArrowLeft size={20} className="text-zinc-400" />
                  </button>
                  <h2 className="text-base font-semibold text-white">Selecionar Serviço</h2>
                </div>

                {/* Selected Client Summary */}
                <div
                  className="p-4 rounded-2xl flex items-center justify-between group transition-all"
                  style={{
                    background: 'var(--dark-brand-10)',
                    border: '1px solid var(--dark-brand-20)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500 text-black font-bold text-lg">
                        {selectedClient.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-[#1c1c1f] flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-500/70 uppercase font-bold tracking-widest block mb-0.5">Cliente Selecionado</span>
                      <h3 className="text-sm font-semibold text-white leading-none">{selectedClient.name}</h3>
                      <p className="text-xs text-zinc-500 mt-1">{selectedClient.phone}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ color: 'var(--dark-brand-primary)', background: 'var(--dark-brand-10)' }}
                  >
                    Alterar
                  </button>
                </div>

                {/* Service Search */}
                <div className="relative group">
                  <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Buscar serviço..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-zinc-500 outline-none transition-all"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Service List */}
                <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                  {services
                    .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((service) => (
                      <button
                        key={service.id}
                        onClick={() => handleServiceSelect(service)}
                        className={`w-full p-4 rounded-xl flex items-center justify-between transition-all group ${selectedService?.id === service.id ? 'ring-1 ring-[var(--dark-brand-primary)]/30' : ''}`}
                        style={{
                          background: selectedService?.id === service.id ? 'var(--dark-brand-5)' : 'var(--dark-card-bg)',
                          border: selectedService?.id === service.id ? '1px solid var(--dark-brand-20)' : '1px solid var(--dark-border-subtle)',
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'var(--dark-bg-subtle-20)' }}
                          >
                            <Zap size={20} style={{ color: 'var(--dark-brand-primary)' }} />
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-sm transition-colors"
                              style={{ color: selectedService?.id === service.id ? 'var(--dark-brand-primary)' : 'var(--dark-text-main)' }}
                            >
                              {service.name}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--dark-text-subtle)' }}>
                                <Clock size={12} style={{ color: 'var(--dark-text-faint)' }} />
                                {service.duration_minutes} min
                              </div>
                              <div className="w-1 h-1 rounded-full" style={{ background: 'var(--dark-border-strong)' }} />
                              <div className="text-[11px] font-bold" style={{ color: 'var(--dark-status-confirmed)' }}>
                                R$ {service.price.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                          style={{ background: 'var(--dark-bg-subtle-20)' }}
                        >
                          <ArrowRight size={16} style={{ color: 'var(--dark-brand-primary)' }} />
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (bookingLink) return;
                      setPaymentMethod(null);
                      setCurrentStep(2);
                    }}
                    className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:bg-white/5 active:scale-95"
                    style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
                    disabled={!!bookingLink}
                  >
                    <ArrowLeft size={20} className="text-zinc-400" />
                  </button>
                  <h2 className="text-base font-semibold text-white">
                    {bookingLink ? 'Link de Pagamento Gerado' : 'Finalizar Agendamento'}
                  </h2>
                </div>

                {/* Summary Card */}
                <div
                  className="p-5 rounded-2xl flex flex-col gap-4 transition-all"
                  style={{
                    background: 'var(--dark-bg-card)',
                    border: '1px solid var(--dark-border-default)'
                  }}
                >
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between" style={{ background: 'rgba(255, 255, 255, 0.01)' }}>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Resumo do Serviço</span>
                    <Sparkles size={14} className="text-amber-500/50" />
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Cliente</div>
                        <div className="text-sm font-semibold text-white">{selectedClient?.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mb-1">Serviço</div>
                        <div className="text-sm font-semibold text-white">{selectedService?.name}</div>
                      </div>
                    </div>

                    <div className="h-px bg-white/5" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                          <Clock size={16} className="text-zinc-500" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider leading-none mb-1" style={{ color: 'var(--dark-text-faint)' }}>Duração</p>
                          <p className="text-xs text-zinc-300 font-medium">{selectedService?.duration_minutes} min</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider leading-none mb-1" style={{ color: 'var(--dark-text-faint)' }}>Total</p>
                        <p className="text-xl font-bold" style={{ color: 'var(--dark-status-confirmed)' }}>
                          R$ {selectedService?.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection */}
                {!paymentMethod && !bookingLink && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setPaymentMethod('online')}
                        disabled={!stripeConfigured}
                        className={`group p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${stripeConfigured
                          ? 'hover:border-[var(--dark-brand-50)] hover:bg-[var(--dark-brand-5)]'
                          : 'opacity-40 cursor-not-allowed grayscale'
                          }`}
                        style={{
                          background: 'var(--dark-bg-subtle-20)',
                          borderColor: stripeConfigured ? 'var(--dark-border-default)' : 'transparent'
                        }}
                      >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${stripeConfigured ? 'shadow-lg shadow-[var(--dark-brand-shadow)]' : ''
                          }`}
                          style={{
                            background: stripeConfigured ? 'var(--dark-brand-primary)' : 'var(--dark-bg-subtle)',
                            color: stripeConfigured ? 'var(--dark-text-inverted)' : 'var(--dark-text-subtle)'
                          }}
                        >
                          <CreditCard size={24} />
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-white text-sm">Link de Pagamento</div>
                          <div className="text-[10px] font-bold uppercase mt-0.5 tracking-wider" style={{ color: 'var(--dark-text-subtle)' }}>Pagamento Online</div>
                        </div>
                      </button>

                      <button
                        onClick={() => setPaymentMethod('presential')}
                        className="group p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 hover:border-[var(--dark-status-confirmed-border)] hover:bg-[var(--dark-status-confirmed-bg)]"
                        style={{
                          background: 'var(--dark-bg-subtle-20)',
                          border: '1px solid var(--dark-border-default)'
                        }}
                      >
                        <div className="w-12 h-12 rounded-xl text-white flex items-center justify-center shadow-lg shadow-[var(--dark-status-confirmed-border)]"
                          style={{ background: 'var(--dark-btn-success-bg)' }}
                        >
                          <CheckCircle size={24} />
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-white text-sm">Pagar no Local</div>
                          <div className="text-[10px] font-bold uppercase mt-0.5 tracking-wider" style={{ color: 'var(--dark-text-subtle)' }}>Manual / POS</div>
                        </div>
                      </button>
                    </div>

                    {!stripeConfigured && (
                      <div
                        className="p-3 rounded-xl flex gap-3"
                        style={{
                          background: 'var(--dark-brand-5)',
                          border: '1px solid var(--dark-brand-20)'
                        }}
                      >
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--dark-brand-primary)' }} />
                        <p className="text-[11px] font-medium" style={{ color: 'var(--dark-brand-primary)', opacity: 0.7 }}>
                          Stripe não configurado. Ative em <strong style={{ color: 'var(--dark-brand-primary)' }}>Finanças</strong> para gerar links de pagamento.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Booking Link Result */}
                {paymentMethod === 'online' && bookingLink && (
                  <div className="space-y-4 animate-in zoom-in-95 duration-500">
                    <div
                      className="p-4 rounded-xl flex items-center justify-between gap-3"
                      style={{ background: 'var(--dark-badge-success-bg)', border: '1px solid var(--dark-badge-success-border)' }}
                    >
                      <div className="truncate flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--dark-status-confirmed)' }}>Link Gerado com Sucesso</p>
                        <p className="text-sm font-mono truncate" style={{ color: 'var(--dark-text-secondary)' }}>{bookingLink}</p>
                      </div>
                      <button
                        onClick={() => {
                          copyToClipboard(bookingLink);
                          setShowToast(true);
                        }}
                        className="w-10 h-10 rounded-lg flex items-center justify-center transition-all shadow-lg shadow-green-500/20"
                        style={{ background: 'var(--dark-btn-success-bg)', color: 'white' }}
                      >
                        <Copy size={18} />
                      </button>
                    </div>

                    <button
                      onClick={() => { onSuccess(); onClose(); }}
                      className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all"
                      style={{
                        background: 'var(--dark-bg-subtle-20)',
                        border: '1px solid var(--dark-border-default)'
                      }}
                    >
                      Concluir e Fechar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer - Final Actions */}
          {((currentStep === 2) || (currentStep === 3 && paymentMethod)) && !bookingLink && (
            <div className="p-6 border-t" style={{ background: 'var(--dark-modal-footer-bg)', borderTop: '1px solid var(--dark-modal-border)' }}>
              <div className="flex gap-4">
                {currentStep === 2 && (
                  <button
                    onClick={handleContinueToPayment}
                    className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all transition-all"
                    style={{
                      background: 'var(--dark-brand-primary)',
                      color: 'var(--dark-text-inverted)'
                    }}
                  >
                    CONTINUAR PARA PAGAMENTO <ArrowRight size={18} />
                  </button>
                )}
                {currentStep === 3 && paymentMethod === 'online' && !bookingLink && (
                  <button
                    onClick={handleCreateAppointment}
                    disabled={isLoading}
                    className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{
                      background: 'var(--dark-brand-primary)',
                      color: 'var(--dark-text-inverted)'
                    }}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                      <><CreditCard size={18} /> GERAR LINK DE PAGAMENTO</>
                    )}
                  </button>
                )}
                {currentStep === 3 && paymentMethod === 'presential' && (
                  <button
                    onClick={handleCreateAppointment}
                    disabled={isLoading}
                    className="w-full py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    style={{
                      background: 'var(--dark-btn-success-bg)',
                      color: 'var(--dark-btn-success-text)'
                    }}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><CheckCircle size={18} /> CONFIRMAR AGENDAMENTO</>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Toast Notification */}
        {showToast && (
          <Toast
            message="Link copiado!"
            type="success"
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    </>
  );
};

export default QuickBookingModal;
