/**
 * QuickBookingModal.tsx
 * Modal simplificado para agendamentos a partir de"Disponíveis Agora"
 * SEM verificação de overlap (o slot já é verificado como livre)
 */
import React, { useState, useEffect } from 'react';
import {
  Calendar, Clock, User, ArrowRight, Check, Search, UserPlus,
  ArrowLeft, Mail, Phone, Copy, AlertTriangle, Link as LinkIcon,
  Banknote, CreditCard, CheckCircle, Zap
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
        payment_status: paymentMethod === 'presential' ? 'paid' : 'awaiting_payment',
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agendamento Rapido"
      subtitle={`${selectedDate && !isNaN(selectedDate.getTime()) ? format(selectedDate, 'dd/MM') : format(new Date(), 'dd/MM')} as ${selectedTime} - ${professional.name}`}
      icon={<Zap size={24} />}
      footer={
        <div className="flex gap-4 w-full">
          {currentStep === 1 && isCreatingNewClient && (
            <Button
              className="w-full"
              onClick={handleCreateClient}
              disabled={isCreatingClient || !newClientName.trim() || !newClientPhone.trim()}
            >
              {isCreatingClient ? 'Cadastrando...' : <><Check size={20} /> Cadastrar e Continuar</>}
            </Button>
          )}
          {currentStep === 2 && (
            <Button className="w-full" onClick={handleContinueToPayment}>
              Continuar para Pagamento <ArrowRight size={20} />
            </Button>
          )}
          {currentStep === 3 && (
            <>
              {paymentMethod === 'online' && !bookingLink && (
                <Button
                  className="w-full"
                  onClick={handleCreateAppointment}
                  disabled={isLoading}
                >
                  {isLoading ? 'Gerando...' : <><CreditCard size={20} /> Gerar Link de Pagamento</>}
                </Button>
              )}
              {paymentMethod === 'online' && bookingLink && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => { onSuccess(); onClose(); }}
                >
                  Concluir e Fechar
                </Button>
              )}
              {paymentMethod === 'presential' && (
                <Button
                  className="w-full bg-success-500 hover:bg-success-600"
                  onClick={handleCreateAppointment}
                  disabled={isLoading}
                >
                  {isLoading ? 'Finalizando...' : <><CheckCircle size={22} /> Confirmar Agendamento</>}
                </Button>
              )}
            </>
          )}
        </div>
      }
    >
      {/* Quick Booking Badge */}
      {!showDurationWarning ? (
        <div className="mb-4 flex items-center gap-2 bg-success-500/10 border border-success-500/30 rounded-lg px-3 py-2">
          <Zap size={16} className="text-success-500" />
          <span className="text-xs text-success-400 font-medium">
            Encaixe disponivel - horario livre
          </span>
        </div>
      ) : (
        <div className="mb-4 flex flex-col gap-1 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            <span className="text-xs text-amber-400 font-medium">
              Aviso: Servico pode conflitar com proximo agendamento
            </span>
          </div>
          {nextAppointmentTime && (
            <span className="text-xs text-amber-300/70 ml-6">
              Proximo agendamento as {nextAppointmentTime}
            </span>
          )}
        </div>
      )}

      {/* Step Progress */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between relative">
          <div className="absolute top-3 left-0 right-0 h-[2px] bg-[var(--surface-subtle)] -z-10" />
          <div
            className="absolute top-3 left-0 h-[2px] bg-gradient-to-r from-barber-gold to-amber-500 transition-all duration-500 -z-10"
            style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
          />

          {[
            { num: 1, label: 'Cliente' },
            { num: 2, label: 'Servico' },
            { num: 3, label: 'Pagamento' }
          ].map((step) => (
            <div key={step.num} className="flex flex-col items-center gap-1.5 bg-[var(--surface-card)] px-2 rounded-lg">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${currentStep > step.num
                ? 'bg-green-500 text-[var(--text-primary)] border-0'
                : currentStep === step.num
                  ? 'bg-[var(--brand-primary)] text-black shadow-[0_0_10px_rgba(212,175,55,0.3)] scale-105'
                  : 'bg-[var(--surface-card)] text-[var(--text-subtle)] border border-[var(--border-default)]'
                }`}>
                {currentStep > step.num ? <Check size={12} /> : step.num}
              </div>
              <span className={`text-[10px] font-semibold tracking-tight transition-colors duration-300 ${currentStep >= step.num ? 'text-[var(--text-primary)]' : 'text-[var(--text-subtle)]'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-2 rounded mb-3">
            {error}
          </div>
        )}

        {/* Step 1: Select Client */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isCreatingNewClient && (
                  <button
                    onClick={() => setIsCreatingNewClient(false)}
                    className="w-8 h-8 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {isCreatingNewClient ? 'Novo Cliente' : 'Selecionar Cliente'}
                </h2>
              </div>
              {!isCreatingNewClient && (
                <button
                  onClick={() => {
                    setIsCreatingNewClient(true);
                    setNewClientName('');
                    setNewClientPhone('');
                    setNewClientEmail('');
                    setError('');
                  }}
                  className="text-xs font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary)]hover flex items-center gap-1.5 transition-colors"
                >
                  <UserPlus size={14} />
                  Cadastrar novo
                </button>
              )}
            </div>

            {isCreatingNewClient ? (
              <div className="space-y-4">
                <Input
                  label="Nome Completo"
                  placeholder="Ex: Joao Silva"
                  icon={<User size={18} />}
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  autoFocus
                />
                <Input
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  icon={<Phone size={18} />}
                  value={newClientPhone}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length > 11) v = v.substring(0, 11);
                    if (v.length > 2) v = `(${v.substring(0, 2)}) ${v.substring(2)}`;
                    if (v.length > 9) v = `${v.substring(0, 9)}-${v.substring(9)}`;
                    setNewClientPhone(v);
                  }}
                />
                <Input
                  label="E-mail (opcional)"
                  type="email"
                  placeholder="email@exemplo.com"
                  icon={<Mail size={18} />}
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <Input
                  placeholder="Buscar por nome ou telefone..."
                  icon={<Search size={20} />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredClients.length === 0 ? (
                    <div className="text-center py-8 bg-[var(--surface-app)]/30 rounded-xl border border-dashed border-[var(--border-default)]">
                      <div className="w-10 h-10 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center mx-auto mb-2 text-[var(--text-subtle)]">
                        <Search size={18} />
                      </div>
                      <p className="text-[var(--text-muted)] text-sm">Nenhum cliente encontrado</p>
                      <button
                        onClick={() => setIsCreatingNewClient(true)}
                        className="text-[var(--brand-primary)] text-xs font-bold mt-2 hover:underline"
                      >
                        Cadastrar novo
                      </button>
                    </div>
                  ) : (
                    filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleClientSelect(client)}
                        className="w-full bg-[var(--surface-app)]/50 hover:bg-[var(--surface-subtle)] border border-[var(--border-default)] hover:border-amber-500/40 p-2.5 rounded-lg flex items-center justify-between transition-all group"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--brand-primary)] font-bold text-[10px]">
                            {client.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="text-left">
                            <div className="font-semibold text-[var(--text-primary)] text-sm group-hover:text-[var(--brand-primary)] transition-colors">{client.name}</div>
                            <div className="text-[10px] text-[var(--text-subtle)] flex items-center gap-1">
                              <Phone size={9} />
                              {client.phone}
                            </div>
                          </div>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[var(--surface-card)] flex items-center justify-center text-[var(--text-subtle)] group-hover:text-[var(--brand-primary)] group-hover:bg-[var(--surface-subtle)] transition-all">
                          <ArrowRight size={14} />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Service Selection */}
        {currentStep === 2 && selectedClient && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => setCurrentStep(1)}
                className="w-8 h-8 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowLeft size={16} />
              </button>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Servico</h2>
            </div>

            {/* Client Info */}
            <div className="bg-[var(--surface-app)]/40 p-3 rounded-xl border border-[var(--border-default)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--brand-primary)] font-bold text-xs">
                  {selectedClient.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider">Cliente</div>
                  <div className="text-[var(--text-primary)] font-bold text-sm">{selectedClient.name}</div>
                </div>
              </div>
              <button
                onClick={() => setCurrentStep(1)}
                className="text-[var(--brand-primary)] text-xs font-bold hover:bg-[var(--brand)]/10 px-2 py-1 rounded transition-all"
              >
                Alterar
              </button>
            </div>

            {/* Service Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">Selecione o Servico</label>
              <Select
                value={selectedService?.id || ''}
                onChange={(e) => setSelectedService(services.find(s => s.id === e.target.value) || null)}
                options={services.map(s => ({
                  value: s.id,
                  label: `${s.name} - R$ ${s.price.toFixed(2)} (${s.duration_minutes} min)`
                }))}
              />
            </div>

            {/* Time Display (Read-Only) */}
            <div className="bg-[var(--surface-app)]/50 p-4 rounded-xl border border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--surface-card)] border border-[var(--border-default)] flex flex-col items-center justify-center text-[var(--brand-primary)]">
                  <span className="text-[9px] uppercase font-bold leading-none">{format(selectedDate, 'MMM', { locale: ptBR })}</span>
                  <span className="text-sm font-bold leading-none mt-0.5">{format(selectedDate, 'dd')}</span>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-widest">Data e Horario</div>
                  <div className="text-[var(--text-primary)] font-bold">
                    {format(selectedDate, "EEEE, dd/MM", { locale: ptBR })} as <span className="text-[var(--brand-primary)]">{selectedTime}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => {
                  if (bookingLink) return;
                  if (paymentMethod) setPaymentMethod(null);
                  else setCurrentStep(2);
                }}
                className="w-8 h-8 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                disabled={bookingLink !== ''}
              >
                <ArrowLeft size={16} />
              </button>
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex-1">
                {!paymentMethod ? 'Confirmar Agendamento' : bookingLink ? 'Link Gerado!' : 'Pagamento'}
              </h2>
            </div>

            {/* Summary Card */}
            {!bookingLink && (
              <div className="bg-[var(--surface-app)]/40 rounded-xl border border-[var(--border-default)] overflow-hidden">
                <div className="bg-[var(--surface-subtle)]/40 px-4 py-2 border-b border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Resumo</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-[var(--status-success)] text-[10px] font-bold border border-green-500/20">
                    <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                    PRONTO
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-[var(--text-subtle)] uppercase">Cliente</div>
                      <div className="text-[var(--text-primary)] font-bold text-sm truncate">{selectedClient?.name}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[var(--text-subtle)] uppercase">Profissional</div>
                      <div className="text-[var(--text-primary)] font-bold text-sm truncate">{professional.name}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[var(--text-subtle)] uppercase">Servico</div>
                      <div className="text-[var(--text-primary)] font-bold text-sm truncate">{selectedService?.name}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-[var(--text-subtle)] uppercase">Valor</div>
                      <div className="text-success-500 font-black text-base">R$ {selectedService?.price.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Method Selection */}
            {!paymentMethod && !bookingLink && (
              <div className="space-y-3">
                {!stripeConfigured && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-amber-500 font-bold text-sm">Stripe nao configurado</div>
                      <div className="text-amber-200/60 text-xs">
                        Configure em <b>Financas</b> para gerar links.
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('online')}
                    disabled={!stripeConfigured}
                    className={`group p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1.5 ${stripeConfigured
                      ? 'bg-[var(--surface-app)]/50 border-[var(--border-default)] hover:border-amber-500/50'
                      : 'bg-gray-900/20 border-gray-800 opacity-40 cursor-not-allowed'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stripeConfigured ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]' : 'bg-gray-800 text-[var(--text-subtle)]'}`}>
                      <LinkIcon size={18} />
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-[var(--text-primary)] text-sm">Gerar Link</div>
                      <div className="text-[9px] font-bold text-[var(--text-subtle)] uppercase">Stripe</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod('presential')}
                    className="group p-3 rounded-lg border-2 border-[var(--border-default)] bg-[var(--surface-app)]/50 hover:border-success-500/50 transition-all flex flex-col items-center gap-1.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-success-500/10 flex items-center justify-center text-success-500">
                      <Banknote size={18} />
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-[var(--text-primary)] text-sm">No Local</div>
                      <div className="text-[9px] font-bold text-[var(--text-subtle)] uppercase">Manual</div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Link Generated Success */}
            {paymentMethod === 'online' && bookingLink && (
              <div className="space-y-4 animate-in zoom-in-95 duration-300">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-[var(--status-success)] mx-auto border border-green-500/20">
                    <Check size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">Link Gerado!</h3>
                  <p className="text-[var(--text-muted)] text-xs">Copie e envie para o cliente</p>
                </div>

                <div className="bg-[var(--surface-subtle)] border border-[var(--border-default)] p-3 rounded-xl flex items-center gap-2">
                  <div className="flex-1 truncate text-xs text-[var(--brand-primary)] font-mono bg-[var(--surface-card)]/50 p-2 rounded-lg">
                    {bookingLink}
                  </div>
                  <button
                    onClick={() => {
                      copyToClipboard(bookingLink);
                      setShowToast(true);
                    }}
                    className="w-10 h-10 rounded-lg bg-[var(--brand-primary)] text-black flex items-center justify-center hover:bg-[var(--brand-hover)] transition-all"
                    title="Copiar link"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {showToast && (
        <Toast
          message="Link copiado!"
          type="success"
          onClose={() => setShowToast(false)}
        />
      )}
    </Modal>
  );
};

export default QuickBookingModal;
