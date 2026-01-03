import React, { useState, useEffect } from 'react';
import { X, Search, ArrowRight, ArrowLeft, Check, Copy, UserPlus, Phone, Mail, Clock, User, Briefcase, CreditCard, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

    const [isCreatingNewClient, setIsCreatingNewClient] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');
    const [newClientEmail, setNewClientEmail] = useState('');
    const [isCreatingClient, setIsCreatingClient] = useState(false);

    const [globalBufferMinutes, setGlobalBufferMinutes] = useState<number>(15);
    const [existingAppointments, setExistingAppointments] = useState<any[]>([]);

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
                setClients([data, ...clients]);
                setSelectedClient(data);
                setIsCreatingNewClient(false);
                setCurrentStep(2);
            }
        } catch (err: any) {
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
            if (paymentMethod === 'online' && !stripeConfigured) {
                setError('Configure o Stripe em Finanças → Configurar Stripe primeiro!');
                setIsLoading(false);
                return;
            }

            // Verificar apenas se há conflito direto de horário (sobreposição real)
            // O buffer define apenas o intervalo de slots, não impede agendamentos consecutivos
            if (existingAppointments.length > 0) {
                const [newHours, newMinutes] = selectedTime.split(':').map(Number);
                const newStartMinutes = newHours * 60 + newMinutes;
                const newEndMinutes = newStartMinutes + selectedService.duration_minutes;

                const hasOverlap = existingAppointments.some(apt => {
                    const aptStart = new Date(apt.start_datetime);
                    const aptEnd = new Date(apt.end_datetime);

                    const aptStartMinutes = aptStart.getHours() * 60 + aptStart.getMinutes();
                    const aptEndMinutes = aptEnd.getHours() * 60 + aptEnd.getMinutes();

                    // Verificar sobreposição real: novo começa antes do antigo terminar E novo termina depois do antigo começar
                    return newStartMinutes < aptEndMinutes && newEndMinutes > aptStartMinutes;
                });

                if (hasOverlap) {
                    setError('Este horário já está ocupado por outro agendamento!');
                    setIsLoading(false);
                    return;
                }
            }

            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const [hours, minutes] = selectedTime.split(':').map(Number);

            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();
            const day = selectedDate.getDate();

            const utcTimestamp = Date.UTC(year, month, day, hours, minutes, 0, 0);
            const startDateTime = new Date(utcTimestamp + (3 * 60 * 60 * 1000));
            const endDateTime = new Date(startDateTime.getTime() + selectedService.duration_minutes * 60000);

            const appointmentData = {
                business_id: businessId,
                client_id: selectedClient.id,
                service_id: selectedService.id,
                professional_id: selectedProfessional.id,
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

            if (paymentMethod === 'online' && data && selectedClient) {
                const stripeLink = await createStripePaymentLink(
                    data.id,
                    selectedService.id,
                    selectedClient.name,
                    selectedClient.email
                );

                if (stripeLink) {
                    setBookingLink(stripeLink);
                    await supabase
                        .from('appointments')
                        .update({ payment_link: stripeLink })
                        .eq('id', data.id);
                } else {
                    setError('Erro ao gerar link. Verifique se o serviço está sincronizado com o Stripe.');
                    setIsLoading(false);
                    return;
                }
            } else {
                onSuccess();
                onClose();
            }

            setIsLoading(false);
        } catch (err: any) {
            setError(err.message || 'Erro ao criar agendamento');
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    // Stepper configuration
    const steps = [
        { num: 1, label: 'Cliente', icon: User },
        { num: 2, label: 'Serviço', icon: Briefcase },
        { num: 3, label: 'Pagamento', icon: CreditCard }
    ];

    return (
        <>
            {/* Backdrop with blur */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
                style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)'
                }}
                onClick={onClose}
            >
                {/* Modal Container */}
                <div
                    className="w-full max-w-lg rounded-2xl overflow-hidden animate-slideUp"
                    style={{
                        background: 'linear-gradient(180deg, #1c1c1f 0%, #121214 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(245, 158, 11, 0.05)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Premium Header with Gradient */}
                    <div
                        className="relative px-6 py-5"
                        style={{
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, transparent 50%)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
                        }}
                    >
                        {/* Decorative glow */}
                        <div
                            className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-30 blur-3xl"
                            style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, transparent 70%)' }}
                        />

                        <div className="relative flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                                    }}
                                >
                                    <Sparkles size={20} className="text-black" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Novo Agendamento</h3>
                                    <p className="text-xs text-zinc-500">
                                        {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })} • {selectedTime}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                                style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Step Progress - Premium Design */}
                    <div className="px-6 py-4" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
                        <div className="flex items-center justify-between">
                            {steps.map((step, index) => {
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
                                                        ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                        : isActive
                                                            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                                            : 'rgba(255, 255, 255, 0.05)',
                                                    boxShadow: isCompleted
                                                        ? '0 4px 20px rgba(34, 197, 94, 0.3)'
                                                        : isActive
                                                            ? '0 4px 20px rgba(245, 158, 11, 0.3)'
                                                            : 'none',
                                                    border: !isCompleted && !isActive ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                                                }}
                                            >
                                                {isCompleted ? (
                                                    <Check size={20} className="text-white" />
                                                ) : (
                                                    <IconComponent
                                                        size={20}
                                                        style={{ color: isActive ? '#000' : 'rgba(255, 255, 255, 0.4)' }}
                                                    />
                                                )}

                                                {/* Pulse animation for active step */}
                                                {isActive && (
                                                    <div
                                                        className="absolute inset-0 rounded-2xl animate-pulse"
                                                        style={{
                                                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                            opacity: 0.3
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            <span
                                                className="text-[11px] font-medium tracking-wide"
                                                style={{
                                                    color: isCompleted
                                                        ? '#22c55e'
                                                        : isActive
                                                            ? '#f59e0b'
                                                            : 'rgba(255, 255, 255, 0.4)'
                                                }}
                                            >
                                                {step.label}
                                            </span>
                                        </div>

                                        {index < steps.length - 1 && (
                                            <div className="flex-1 mx-3 relative h-0.5">
                                                <div
                                                    className="absolute inset-0 rounded-full"
                                                    style={{ background: 'rgba(255, 255, 255, 0.08)' }}
                                                />
                                                <div
                                                    className="absolute inset-0 rounded-full transition-all duration-500"
                                                    style={{
                                                        background: isCompleted
                                                            ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
                                                            : 'transparent',
                                                        width: isCompleted ? '100%' : '0%'
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
                        {/* Error Message */}
                        {error && (
                            <div
                                className="mb-4 p-4 rounded-xl flex items-start gap-3 animate-shake"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)'
                                }}
                            >
                                <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <X size={12} className="text-red-400" />
                                </div>
                                <p className="text-sm text-red-400">{error}</p>
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
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            color: '#f59e0b',
                                            border: '1px solid rgba(245, 158, 11, 0.2)'
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
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.08)'
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.style.borderColor = 'rgba(245, 158, 11, 0.5)';
                                                        e.target.style.background = 'rgba(245, 158, 11, 0.05)';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                                        e.target.style.background = 'rgba(255, 255, 255, 0.03)';
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
                                                        background: 'rgba(255, 255, 255, 0.03)',
                                                        border: '1px solid rgba(255, 255, 255, 0.08)'
                                                    }}
                                                    onFocus={(e) => {
                                                        e.target.style.borderColor = 'rgba(245, 158, 11, 0.5)';
                                                        e.target.style.background = 'rgba(245, 158, 11, 0.05)';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                                        e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                                                    }}
                                                    value={newClientPhone}
                                                    onChange={(e) => setNewClientPhone(e.target.value)}
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
                                                    onFocus={(e) => {
                                                        e.target.style.borderColor = 'rgba(245, 158, 11, 0.5)';
                                                        e.target.style.background = 'rgba(245, 158, 11, 0.05)';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                                        e.target.style.background = 'rgba(255, 255, 255, 0.03)';
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
                                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                color: '#000',
                                                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.25)'
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
                                            <Search
                                                size={18}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-amber-500 transition-colors"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Buscar cliente..."
                                                className="w-full pl-12 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-zinc-500 outline-none transition-all"
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                                    boxShadow: '0 0 20px rgba(245, 158, 11, 0.05)'
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
                                                            background: 'rgba(255, 255, 255, 0.02)',
                                                            border: '1px solid rgba(255, 255, 255, 0.06)'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)';
                                                            e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.2)';
                                                            e.currentTarget.style.transform = 'translateX(4px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                                                            e.currentTarget.style.transform = 'translateX(0)';
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

                        {/* Step 2: Service & Professional */}
                        {currentStep === 2 && selectedClient && (
                            <div className="space-y-4">
                                {/* Selected Client Card */}
                                <div
                                    className="p-4 rounded-xl flex items-center justify-between"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%)',
                                        border: '1px solid rgba(245, 158, 11, 0.15)'
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                                            style={{
                                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                color: 'black'
                                            }}
                                        >
                                            {selectedClient.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-white text-sm">{selectedClient.name}</div>
                                            <div className="text-xs text-zinc-500">{selectedClient.phone}</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setCurrentStep(1)}
                                        className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
                                        style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}
                                    >
                                        Alterar
                                    </button>
                                </div>

                                {/* Service Select */}
                                <div>
                                    <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-2 font-medium">
                                        Serviço
                                    </label>
                                    <select
                                        value={selectedService?.id || ''}
                                        onChange={(e) => setSelectedService(services.find(s => s.id === e.target.value) || null)}
                                        className="w-full p-3.5 rounded-xl text-sm cursor-pointer outline-none transition-all appearance-none"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            color: 'white',
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f59e0b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right 12px center',
                                            backgroundSize: '20px',
                                            paddingRight: '40px'
                                        }}
                                    >
                                        {services.map((service) => (
                                            <option key={service.id} value={service.id} style={{ background: '#1c1c1f' }}>
                                                {service.name} - R$ {service.price.toFixed(2)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Professional Select */}
                                <div>
                                    <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-2 font-medium">
                                        Profissional
                                    </label>
                                    <select
                                        value={selectedProfessional.id}
                                        onChange={(e) => setSelectedProfessional(professionals.find(p => p.id === e.target.value)!)}
                                        className="w-full p-3.5 rounded-xl text-sm cursor-pointer outline-none transition-all appearance-none"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            color: 'white',
                                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23f59e0b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right 12px center',
                                            backgroundSize: '20px',
                                            paddingRight: '40px'
                                        }}
                                    >
                                        {professionals.map((prof) => (
                                            <option key={prof.id} value={prof.id} style={{ background: '#1c1c1f' }}>
                                                {prof.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Date/Time Info Card */}
                                <div
                                    className="p-4 rounded-xl"
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.02)',
                                        border: '1px solid rgba(255, 255, 255, 0.06)'
                                    }}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <Clock size={14} className="text-amber-500" />
                                        <span className="text-xs text-zinc-500 uppercase tracking-wider">Data e Horário</span>
                                    </div>
                                    <div className="text-white font-semibold">
                                        {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                                        <span className="text-amber-500 ml-2">às {selectedTime}</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setCurrentStep(1)}
                                        className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            color: 'white',
                                            border: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        onClick={handleContinueToPayment}
                                        className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all"
                                        style={{
                                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                            color: 'black',
                                            boxShadow: '0 4px 20px rgba(245, 158, 11, 0.25)'
                                        }}
                                    >
                                        Continuar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Payment */}
                        {currentStep === 3 && (
                            <div className="space-y-4">
                                {/* Summary Card */}
                                {!bookingLink && (
                                    <div
                                        className="p-5 rounded-xl space-y-4"
                                        style={{
                                            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
                                            border: '1px solid rgba(255, 255, 255, 0.06)'
                                        }}
                                    >
                                        <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
                                            Resumo do Agendamento
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <div className="text-[11px] text-zinc-600 uppercase">Cliente</div>
                                                <div className="text-sm font-medium text-white">{selectedClient?.name}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[11px] text-zinc-600 uppercase">Profissional</div>
                                                <div className="text-sm font-medium text-white">{selectedProfessional?.name}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[11px] text-zinc-600 uppercase">Serviço</div>
                                                <div className="text-sm font-medium text-white">{selectedService?.name}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="text-[11px] text-zinc-600 uppercase">Valor</div>
                                                <div className="text-sm font-bold text-emerald-400">
                                                    R$ {selectedService?.price.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            className="pt-4 space-y-1"
                                            style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
                                        >
                                            <div className="text-[11px] text-zinc-600 uppercase">Data e Horário</div>
                                            <div className="text-sm font-semibold text-amber-500">
                                                {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })} às {selectedTime}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Payment Method Selection */}
                                {!paymentMethod && !bookingLink && (
                                    <>
                                        {!stripeConfigured && (
                                            <div
                                                className="p-4 rounded-xl flex items-start gap-3"
                                                style={{
                                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%)',
                                                    border: '1px solid rgba(245, 158, 11, 0.2)'
                                                }}
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                                    <span className="text-amber-500">⚠️</span>
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-amber-400 text-sm mb-1">Stripe não configurado</div>
                                                    <div className="text-xs text-zinc-400">
                                                        Configure em <span className="text-amber-500 font-medium">Finanças → Stripe</span> para pagamentos online.
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                                                Forma de Pagamento
                                            </label>

                                            <div className="grid grid-cols-2 gap-3">
                                                {/* Online Payment */}
                                                <button
                                                    onClick={() => setPaymentMethod('online')}
                                                    disabled={!stripeConfigured}
                                                    className="p-4 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed group relative overflow-hidden"
                                                    style={{
                                                        background: stripeConfigured
                                                            ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.02) 100%)'
                                                            : 'rgba(255, 255, 255, 0.02)',
                                                        border: stripeConfigured
                                                            ? '1px solid rgba(59, 130, 246, 0.2)'
                                                            : '1px solid rgba(255, 255, 255, 0.06)'
                                                    }}
                                                >
                                                    <div
                                                        className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                                                        style={{
                                                            background: stripeConfigured
                                                                ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                                                                : 'rgba(255, 255, 255, 0.05)'
                                                        }}
                                                    >
                                                        <CreditCard size={22} style={{ color: stripeConfigured ? 'white' : '#52525b' }} />
                                                    </div>
                                                    <div className="font-semibold text-white text-sm mb-1">Link de Pagamento</div>
                                                    <div className="text-[10px] text-zinc-500">
                                                        {stripeConfigured ? 'Enviar link via WhatsApp' : 'Configure o Stripe'}
                                                    </div>
                                                </button>

                                                {/* Presential Payment */}
                                                <button
                                                    onClick={() => setPaymentMethod('presential')}
                                                    className="p-4 rounded-xl transition-all group relative overflow-hidden"
                                                    style={{
                                                        background: 'linear-gradient(180deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.02) 100%)',
                                                        border: '1px solid rgba(34, 197, 94, 0.2)'
                                                    }}
                                                >
                                                    <div
                                                        className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                                                        style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
                                                    >
                                                        <Check size={22} className="text-white" />
                                                    </div>
                                                    <div className="font-semibold text-white text-sm mb-1">Pago no Local</div>
                                                    <div className="text-[10px] text-zinc-500">Confirmar agendamento</div>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Back Button */}
                                        <button
                                            onClick={() => setCurrentStep(2)}
                                            className="w-full py-3 rounded-xl text-sm font-medium transition-all mt-2"
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.03)',
                                                color: 'rgba(255, 255, 255, 0.6)',
                                                border: '1px solid rgba(255, 255, 255, 0.06)'
                                            }}
                                        >
                                            <ArrowLeft size={16} className="inline mr-2" />
                                            Voltar
                                        </button>
                                    </>
                                )}

                                {/* Generate Link Button */}
                                {paymentMethod === 'online' && !bookingLink && (
                                    <div className="space-y-3">
                                        <button
                                            onClick={handleCreateAppointment}
                                            disabled={isLoading}
                                            className="w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                            style={{
                                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                color: 'white',
                                                boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)'
                                            }}
                                        >
                                            {isLoading ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <><CreditCard size={18} /> Gerar Link de Pagamento</>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => setPaymentMethod(null)}
                                            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                                            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                                        >
                                            Voltar
                                        </button>
                                    </div>
                                )}

                                {/* Link Generated Success */}
                                {paymentMethod === 'online' && bookingLink && (
                                    <div
                                        className="p-5 rounded-xl space-y-4"
                                        style={{
                                            background: 'linear-gradient(180deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.02) 100%)',
                                            border: '1px solid rgba(34, 197, 94, 0.2)'
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center"
                                                style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}
                                            >
                                                <Check size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-emerald-400">Link gerado com sucesso!</div>
                                                <div className="text-xs text-zinc-500">Envie para o cliente via WhatsApp</div>
                                            </div>
                                        </div>

                                        <div
                                            className="p-3 rounded-lg flex items-center gap-2"
                                            style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                                        >
                                            <span className="text-xs text-zinc-400 truncate flex-1 font-mono">{bookingLink}</span>
                                            <button
                                                onClick={() => {
                                                    copyToClipboard(bookingLink);
                                                    setShowToast(true);
                                                }}
                                                className="p-2 rounded-lg transition-all hover:bg-white/10"
                                                style={{ color: '#f59e0b' }}
                                            >
                                                <Copy size={16} />
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => { onSuccess(); onClose(); }}
                                            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all"
                                            style={{
                                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                                color: 'white',
                                                boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)'
                                            }}
                                        >
                                            Concluir
                                        </button>
                                    </div>
                                )}

                                {/* Confirm Presential Payment */}
                                {paymentMethod === 'presential' && (
                                    <div className="space-y-3">
                                        <button
                                            onClick={handleCreateAppointment}
                                            disabled={isLoading}
                                            className="w-full py-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                            style={{
                                                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                                                color: 'white',
                                                boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)'
                                            }}
                                        >
                                            {isLoading ? (
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <><Check size={18} /> Confirmar Agendamento</>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => setPaymentMethod(null)}
                                            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
                                            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                                        >
                                            Voltar
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Toast */}
            {showToast && (
                <Toast
                    message="Link copiado!"
                    type="success"
                    onClose={() => setShowToast(false)}
                />
            )}

            {/* Global Styles */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
                .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                .animate-shake { animation: shake 0.3s ease-in-out; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}</style>
        </>
    );
};

export default ManualBookingModal;
