import React, { useState, useEffect } from 'react';
import { X, Search, ArrowRight, ArrowLeft, Check, Copy, UserPlus, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { getCurrentBusinessId } from '../lib/database';
import { createStripePaymentLink } from '../lib/stripePaymentLinks';
import { copyToClipboard } from '../lib/bookingLinks';
import { isStripeConfigured } from '../lib/stripeConfig';
import Toast from './Toast';
import type { Client, Service, Professional } from '../types';

interface ManualBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    selectedDate: Date;
    selectedTime: string;
    professional: Professional;
}

type Step = 1 | 2 | 3;
type PaymentMethod = 'online' | 'presential' | null;

const ManualBookingModal: React.FC<ManualBookingModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    selectedDate,
    selectedTime,
    professional
}) => {
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [businessId, setBusinessId] = useState<string>('');

    const [services, setServices] = useState<Service[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedProfessional, setSelectedProfessional] = useState<Professional>(professional);
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

    // Buffer validation state
    const [globalBufferMinutes, setGlobalBufferMinutes] = useState<number>(15);
    const [existingAppointments, setExistingAppointments] = useState<any[]>([]);

    useEffect(() => {
        // Verificar se Stripe está configurado
        const checkStripe = async () => {
            const configured = await isStripeConfigured();
            setStripeConfigured(configured);
            console.log('🔑 Stripe configured:', configured);
        };
        checkStripe();
    }, []);

    useEffect(() => {
        if (isOpen) {
            resetModal();
            loadBusinessId();
            loadServices();
            loadClients();
            loadProfessionals();
            loadExistingAppointments();
        }
    }, [isOpen]);

    useEffect(() => {
        filterClients();
    }, [searchTerm, clients]);

    const resetModal = () => {
        setCurrentStep(1);
        setSelectedClient(null);
        setSelectedService(null);
        setSelectedProfessional(professional);
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
            .select('id, booking_settings')
            .single();

        if (data) {
            setBusinessId(data.id);
            const buffer = data.booking_settings?.buffer_minutes || 15;
            setGlobalBufferMinutes(buffer);
        }
    };

    const loadExistingAppointments = async () => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const { data } = await supabase
            .from('appointments')
            .select('*')
            .eq('professional_id', professional.id)
            .gte('start_datetime', `${dateStr}T00:00:00`)
            .lte('start_datetime', `${dateStr}T23:59:59`)
            .neq('status', 'cancelled');

        if (data) {
            setExistingAppointments(data);
        }
    };

    const loadServices = async () => {
        const { data } = await supabase
            .from('services')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (data) {
            setServices(data);
            if (data.length > 0) setSelectedService(data[0]);
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

    const loadProfessionals = async () => {
        const { data } = await supabase
            .from('professionals')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (data) setProfessionals(data);
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
            setError('Nome é obrigatório');
            return;
        }
        if (!newClientPhone.trim()) {
            setError('Telefone é obrigatório');
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
                console.log('✅ Client created:', data);
                // Add to clients list
                setClients([data, ...clients]);
                // Select the new client and go to step 2
                setSelectedClient(data);
                setIsCreatingNewClient(false);
                setCurrentStep(2);
            }
        } catch (err: any) {
            console.error('❌ Error creating client:', err);
            setError(err.message || 'Erro ao criar cliente');
        }

        setIsCreatingClient(false);
    };

    const handleContinueToPayment = () => {
        if (!selectedService) {
            setError('Selecione um serviço');
            return;
        }
        setCurrentStep(3);
    };

    const handleCreateAppointment = async () => {
        if (!selectedClient || !selectedService || !selectedProfessional) {
            setError('Por favor, preencha todos os campos');
            return;
        }

        if (!paymentMethod) {
            setError('Selecione um método de pagamento');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // ✅ VALIDAR STRIPE ANTES se for pagamento online
            if (paymentMethod === 'online' && !stripeConfigured) {
                setError('Configure o Stripe em Finanças → Configurar Stripe primeiro!');
                setIsLoading(false);
                return;
            }

            // ✅ VALIDAR BUFFER entre agendamentos
            const bufferMinutes = selectedProfessional.custom_buffer && selectedProfessional.buffer_minutes
                ? selectedProfessional.buffer_minutes
                : globalBufferMinutes;

            if (bufferMinutes > 0 && existingAppointments.length > 0) {
                const [newHours, newMinutes] = selectedTime.split(':').map(Number);
                const newStartMinutes = newHours * 60 + newMinutes;
                const newEndMinutes = newStartMinutes + selectedService.duration_minutes;

                const bufferConflict = existingAppointments.some(apt => {
                    const aptStart = new Date(apt.start_datetime);
                    const aptEnd = new Date(apt.end_datetime);

                    const aptStartMinutes = aptStart.getHours() * 60 + aptStart.getMinutes();
                    const aptEndMinutes = aptEnd.getHours() * 60 + aptEnd.getMinutes();

                    // Case 1: Previous appointment ends within buffer of new start
                    if (aptEndMinutes <= newStartMinutes && aptEndMinutes + bufferMinutes > newStartMinutes) {
                        return true;
                    }

                    // Case 2: New appointment ends within buffer of next's start
                    if (newEndMinutes <= aptStartMinutes && newEndMinutes + bufferMinutes > aptStartMinutes) {
                        return true;
                    }

                    // Case 3: Direct overlap
                    if (newStartMinutes < aptEndMinutes && newEndMinutes > aptStartMinutes) {
                        return true;
                    }

                    return false;
                });

                if (bufferConflict) {
                    setError(`É necessário um intervalo de ${bufferMinutes} minutos entre agendamentos!`);
                    setIsLoading(false);
                    return;
                }
            }

            // ✅ TIMEZONE CORRETO: Brasil = UTC-3
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const [hours, minutes] = selectedTime.split(':').map(Number);

            // Criar datetime em UTC DIRETO (sem conversão automática do navegador)
            // Brasil UTC-3: 14:00 local = 17:00 UTC
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const day = selectedDate.getDate();

            // Date.UTC retorna timestamp em UTC
            const utcTimestamp = Date.UTC(year, month, day, hours, minutes, 0, 0);

            // Adicionar 3h para compensar UTC-3
            const startDateTime = new Date(utcTimestamp + (3 * 60 * 60 * 1000));
            const endDateTime = new Date(startDateTime.getTime() + selectedService.duration_minutes * 60000);

            console.log('📅 Creating appointment:', {
                clickedTime: selectedTime,
                timezone: 'Brazil UTC-3',
                utcTimestamp: new Date(utcTimestamp).toISOString(),
                startDateTime: startDateTime.toISOString(),
                endDateTime: endDateTime.toISOString(),
                professional: selectedProfessional.name
            });

            const appointmentData = {
                business_id: businessId,
                client_id: selectedClient.id,
                service_id: selectedService.id,
                professional_id: selectedProfessional.id, // ✅ CRITICAL
                start_datetime: startDateTime.toISOString(),
                end_datetime: endDateTime.toISOString(),
                status: paymentMethod === 'presential' ? 'confirmed' : 'pending',
                payment_status: paymentMethod === 'presential' ? 'paid' : 'awaiting_payment',
                payment_method: paymentMethod,
                customer_name: selectedClient.name
            };

            const { data, error: insertError } = await supabase
                .from('appointments')
                .insert(appointmentData)
                .select()
                .single();

            if (insertError) throw insertError;

            console.log('✅ Appointment created:', data);

            if (paymentMethod === 'online' && data && selectedClient) {
                const stripeLink = await createStripePaymentLink(
                    data.id,
                    selectedService.id,
                    selectedClient.name,
                    selectedClient.email
                );

                if (stripeLink) {
                    console.log('✅ Payment link generated:', stripeLink);
                    setBookingLink(stripeLink);
                    await supabase
                        .from('appointments')
                        .update({ payment_link: stripeLink })
                        .eq('id', data.id);
                } else {
                    console.error('❌ Failed to generate payment link');
                    setError('Erro ao gerar link. Verifique se o serviço está sincronizado com o Stripe.');
                    setIsLoading(false);
                    return;
                }
            } else {
                // Presential payment - close immediately
                onSuccess();
                onClose();
            }

            setIsLoading(false);
        } catch (err: any) {
            console.error('❌ Error creating appointment:', err);
            setError(err.message || 'Erro ao criar agendamento');
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-barber-900 w-full max-w-md rounded-xl border border-barber-800 shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-barber-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Novo Agendamento</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Step Progress Indicator */}
                <div className="px-4 pt-4">
                    <div className="flex items-center justify-between">
                        {[
                            { num: 1, label: 'Cliente' },
                            { num: 2, label: 'Serviço' },
                            { num: 3, label: 'Pagamento' }
                        ].map((step, index) => (
                            <React.Fragment key={step.num}>
                                <div className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${currentStep > step.num
                                        ? 'bg-green-500 border-green-500 text-white'
                                        : currentStep === step.num
                                            ? 'bg-barber-gold border-barber-gold text-black'
                                            : 'bg-barber-950 border-barber-700 text-gray-500'
                                        }`}>
                                        {currentStep > step.num ? <Check size={14} /> : step.num}
                                    </div>
                                    <span className={`text-[10px] mt-1 ${currentStep >= step.num ? 'text-barber-gold' : 'text-gray-500'
                                        }`}>
                                        {step.label}
                                    </span>
                                </div>
                                {index < 2 && (
                                    <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.num ? 'bg-green-500' : 'bg-barber-700'
                                        }`} />
                                )}
                            </React.Fragment>
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
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-base font-bold text-white">
                                    {isCreatingNewClient ? 'Novo Cliente' : 'Selecionar Cliente'}
                                </h2>
                                <button
                                    onClick={() => {
                                        setIsCreatingNewClient(!isCreatingNewClient);
                                        setError('');
                                    }}
                                    className="text-xs text-barber-gold hover:text-barber-goldhover flex items-center gap-1"
                                >
                                    {isCreatingNewClient ? (
                                        <><Search size={12} /> Buscar existente</>
                                    ) : (
                                        <><UserPlus size={12} /> Novo cliente</>
                                    )}
                                </button>
                            </div>

                            {isCreatingNewClient ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Nome *</label>
                                        <input
                                            type="text"
                                            placeholder="Nome completo"
                                            className="w-full bg-barber-950 border border-barber-800 text-white px-3 py-2 rounded-lg text-sm focus:border-barber-gold"
                                            value={newClientName}
                                            onChange={(e) => setNewClientName(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Telefone *</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-2.5 text-gray-500" size={14} />
                                            <input
                                                type="tel"
                                                placeholder="(11) 99999-9999"
                                                className="w-full bg-barber-950 border border-barber-800 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:border-barber-gold"
                                                value={newClientPhone}
                                                onChange={(e) => setNewClientPhone(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Email (opcional)</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-2.5 text-gray-500" size={14} />
                                            <input
                                                type="email"
                                                placeholder="email@exemplo.com"
                                                className="w-full bg-barber-950 border border-barber-800 text-white pl-9 pr-3 py-2 rounded-lg text-sm focus:border-barber-gold"
                                                value={newClientEmail}
                                                onChange={(e) => setNewClientEmail(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleCreateClient}
                                        disabled={isCreatingClient || !newClientName.trim() || !newClientPhone.trim()}
                                        className="w-full bg-barber-gold hover:bg-barber-goldhover text-black py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isCreatingClient ? 'Criando...' : <><UserPlus size={16} /> Criar e Continuar</>}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Buscar por nome..."
                                            className="w-full bg-barber-950 border border-barber-gold text-white pl-9 pr-3 py-2 rounded-lg text-sm"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {filteredClients.length === 0 ? (
                                            <div className="text-center py-6 text-gray-500">
                                                <p className="text-sm">Nenhum cliente encontrado</p>
                                                <button
                                                    onClick={() => setIsCreatingNewClient(true)}
                                                    className="text-barber-gold text-sm mt-2 hover:underline"
                                                >
                                                    Criar novo cliente
                                                </button>
                                            </div>
                                        ) : (
                                            filteredClients.map((client) => (
                                                <button
                                                    key={client.id}
                                                    onClick={() => handleClientSelect(client)}
                                                    className="w-full bg-barber-950 hover:bg-barber-800 p-3 rounded-lg flex items-center justify-between"
                                                >
                                                    <div className="text-left">
                                                        <div className="font-bold text-white text-sm">{client.name}</div>
                                                        <div className="text-xs text-gray-400">{client.phone}</div>
                                                    </div>
                                                    <ArrowRight className="text-gray-500" size={16} />
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Step 2: Service & Time */}
                    {currentStep === 2 && selectedClient && (
                        <div className="space-y-3">
                            <h2 className="text-base font-bold text-white">Serviço e Horário</h2>

                            <div className="bg-barber-950 p-2 rounded-lg flex items-center justify-between">
                                <div className="font-bold text-white text-sm">{selectedClient.name}</div>
                                <button onClick={() => setCurrentStep(1)} className="text-barber-gold text-xs font-bold">
                                    Alterar
                                </button>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Serviço</label>
                                <select
                                    value={selectedService?.id || ''}
                                    onChange={(e) => setSelectedService(services.find(s => s.id === e.target.value) || null)}
                                    className="w-full bg-barber-950 border border-barber-800 text-white p-2 rounded-lg text-sm"
                                >
                                    {services.map((service) => (
                                        <option key={service.id} value={service.id}>
                                            {service.name} - R$ {service.price.toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-gray-400 mb-1">Profissional</label>
                                <select
                                    value={selectedProfessional.id}
                                    onChange={(e) => setSelectedProfessional(professionals.find(p => p.id === e.target.value)!)}
                                    className="w-full bg-barber-950 border border-barber-800 text-white p-2 rounded-lg text-sm"
                                >
                                    {professionals.map((prof) => (
                                        <option key={prof.id} value={prof.id}>{prof.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-barber-950 p-3 rounded-lg border border-barber-800">
                                <div className="text-xs text-gray-400 mb-1">Data e Hora Selecionadas:</div>
                                <div className="text-white font-bold">
                                    {format(selectedDate, "dd/MM/yyyy")} às {selectedTime}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setCurrentStep(1)} className="flex-1 bg-barber-800 text-white py-2 rounded-lg text-sm font-bold">
                                    Voltar
                                </button>
                                <button onClick={handleContinueToPayment} className="flex-1 bg-barber-gold text-black py-2 rounded-lg text-sm font-bold">
                                    Continuar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Confirmation & Payment */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            {/* Step header with back button */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        if (bookingLink) {
                                            // If link already generated, just close
                                            return;
                                        }
                                        if (paymentMethod) {
                                            // Go back to payment method selection
                                            setPaymentMethod(null);
                                        } else {
                                            // Go back to step 2
                                            setCurrentStep(2);
                                        }
                                    }}
                                    className="text-gray-400 hover:text-white"
                                    disabled={bookingLink !== ''}
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <h2 className="text-base font-bold text-white flex-1 text-center">
                                    {!paymentMethod ? 'Confirmar Agendamento' : bookingLink ? 'Link Gerado!' : 'Forma de Pagamento'}
                                </h2>
                                <div className="w-5" />
                            </div>

                            {/* Appointment Summary Card - Always visible */}
                            {!bookingLink && (
                                <div className="bg-barber-950 p-4 rounded-lg border border-barber-800 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider">Resumo</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <div className="text-gray-400 text-xs">Cliente</div>
                                            <div className="text-white font-medium">{selectedClient?.name}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-xs">Profissional</div>
                                            <div className="text-white font-medium">{selectedProfessional?.name}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-xs">Serviço</div>
                                            <div className="text-white font-medium">{selectedService?.name}</div>
                                        </div>
                                        <div>
                                            <div className="text-gray-400 text-xs">Valor</div>
                                            <div className="text-green-400 font-bold">R$ {selectedService?.price.toFixed(2)}</div>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-barber-800">
                                        <div className="text-gray-400 text-xs mb-1">Data e Hora</div>
                                        <div className="text-barber-gold font-bold">
                                            {format(selectedDate, "dd/MM/yyyy")} às {selectedTime}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment Method Selection */}
                            {!paymentMethod && !bookingLink && (
                                <>
                                    {!stripeConfigured && (
                                        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                                            <div className="flex items-start gap-2">
                                                <div className="text-yellow-500 mt-0.5">⚠️</div>
                                                <div className="flex-1">
                                                    <div className="text-yellow-500 font-bold text-sm mb-1">Stripe não configurado</div>
                                                    <div className="text-yellow-200 text-xs">
                                                        Configure suas chaves do Stripe em <span className="font-bold">Finanças → Configurar Stripe</span> para gerar links de pagamento.
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setPaymentMethod('online')}
                                            disabled={!stripeConfigured}
                                            className={`p-4 rounded-lg border-2 ${stripeConfigured
                                                ? 'border-barber-800 bg-barber-950 hover:border-barber-gold'
                                                : 'border-gray-700 bg-gray-900 opacity-50 cursor-not-allowed'
                                                }`}
                                        >
                                            <div className="text-2xl mb-2">🔗</div>
                                            <div className="font-bold text-white text-sm mb-1">Gerar Link</div>
                                            <div className="text-[10px] text-gray-400">
                                                {stripeConfigured ? 'Envia link para pagamento online' : 'Configure o Stripe primeiro'}
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setPaymentMethod('presential')}
                                            className="p-4 rounded-lg border-2 border-barber-800 bg-barber-950 hover:border-green-500"
                                        >
                                            <div className="text-2xl mb-2">✓</div>
                                            <div className="font-bold text-white text-sm mb-1">Pago no local</div>
                                            <div className="text-[10px] text-gray-400">Já foi pago no estabelecimento</div>
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Generate Link Button */}
                            {paymentMethod === 'online' && !bookingLink && (
                                <button
                                    onClick={handleCreateAppointment}
                                    disabled={isLoading}
                                    className="w-full bg-barber-gold text-black py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                                >
                                    {isLoading ? 'Gerando...' : '🔗 Gerar Link de Pagamento'}
                                </button>
                            )}

                            {/* Link Generated Success */}
                            {paymentMethod === 'online' && bookingLink && (
                                <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Check className="text-green-500" size={20} />
                                        <span className="text-green-400 font-bold">Link gerado com sucesso!</span>
                                    </div>
                                    <div className="bg-barber-900 p-2 rounded flex items-center gap-2 mb-3">
                                        <span className="text-xs text-white truncate flex-1">{bookingLink}</span>
                                        <button
                                            onClick={() => {
                                                copyToClipboard(bookingLink);
                                                setShowToast(true);
                                            }}
                                            className="text-barber-gold hover:text-barber-goldhover transition-colors flex-shrink-0"
                                            title="Copiar link"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => { onSuccess(); onClose(); }}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-bold text-sm"
                                    >
                                        Concluir
                                    </button>
                                </div>
                            )}

                            {/* Confirm Presential Payment */}
                            {paymentMethod === 'presential' && (
                                <button
                                    onClick={handleCreateAppointment}
                                    disabled={isLoading}
                                    className="w-full bg-green-500 text-white py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                                >
                                    <Check size={16} />
                                    {isLoading ? 'Criando...' : 'Confirmar Agendamento'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
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
    );
};

export default ManualBookingModal;
