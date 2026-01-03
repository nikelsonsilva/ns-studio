import React, { useState, useEffect, useMemo } from 'react';
import { Scissors, MapPin, Crown, Check, ChevronRight, Loader2, ArrowLeft, User, Calendar as CalendarIcon, ChevronLeft, X, Clock } from 'lucide-react';
import { format, addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Service, Professional } from '../types';
import { supabase } from '../lib/supabase';
import { fetchAvailableSlots } from '../lib/api/publicApi';

interface BusinessData {
    id: string;
    name: string;
    address?: string;
    logo_url?: string;
}

export default function PaymentLinkPage() {
    // Extract businessId from URL: /agendar/{businessId}
    const pathParts = window.location.pathname.split('/');
    const businessId = pathParts[2];

    // State
    const [step, setStep] = useState(1);
    const [business, setBusiness] = useState<BusinessData | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [selectedServices, setSelectedServices] = useState<Service[]>([]);
    const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'services' | 'clube'>('services');

    // Time slots
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    // Calendar modal
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [calendarViewDate, setCalendarViewDate] = useState(new Date());

    // Generate next 5 days
    const dates = useMemo(() => {
        const result = [];
        const today = new Date();
        const dayNames = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

        for (let i = 0; i < 5; i++) {
            const date = addDays(today, i);
            const dayLabel = i === 0 ? 'HOJE' : i === 1 ? 'AMANHÃ' : dayNames[date.getDay()];
            result.push({
                day: dayLabel,
                date: format(date, 'dd MMM', { locale: ptBR }),
                dateObj: date,
                dateStr: format(date, 'yyyy-MM-dd')
            });
        }
        return result;
    }, []);

    // Load initial data
    useEffect(() => {
        if (businessId) {
            loadData();
        } else {
            setError('ID do negócio não encontrado');
            setLoading(false);
        }
    }, [businessId]);

    // Load available slots when professional + date are selected
    useEffect(() => {
        if (selectedProfessional && selectedDateObj && selectedServices.length > 0) {
            loadAvailableSlots();
        }
    }, [selectedProfessional, selectedDateObj, selectedServices]);

    const loadData = async () => {
        try {
            // Fetch business data
            const { data: businessData, error: businessError } = await supabase
                .from('businesses')
                .select('id, name, address, logo_url')
                .eq('id', businessId)
                .single();

            if (businessError) throw businessError;
            setBusiness(businessData);

            // Fetch active services
            const { data: servicesData, error: servicesError } = await supabase
                .from('services')
                .select('*')
                .eq('business_id', businessId)
                .eq('is_active', true)
                .order('name');

            if (servicesError) throw servicesError;
            setServices(servicesData || []);

            // Fetch active professionals
            const { data: professionalsData, error: professionalsError } = await supabase
                .from('professionals')
                .select('*')
                .eq('business_id', businessId)
                .eq('is_active', true)
                .order('name');

            if (professionalsError) throw professionalsError;
            setProfessionals(professionalsData || []);
        } catch (err: any) {
            setError('Negócio não encontrado');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableSlots = async () => {
        if (!selectedProfessional || !selectedDateObj || !selectedServices.length) return;

        setIsLoadingSlots(true);
        try {
            const dateStr = format(selectedDateObj, 'yyyy-MM-dd');
            const { slots, error } = await fetchAvailableSlots({
                businessId,
                professionalId: selectedProfessional.id,
                serviceId: selectedServices[0].id,
                date: dateStr
            });

            if (!error && slots) {
                setAvailableSlots(slots);
            } else {
                setAvailableSlots([]);
            }
        } catch (err) {
            console.error('Error loading slots:', err);
            setAvailableSlots([]);
        }
        setIsLoadingSlots(false);
    };

    const toggleService = (service: Service) => {
        if (selectedServices.find(s => s.id === service.id)) {
            setSelectedServices(selectedServices.filter(s => s.id !== service.id));
        } else {
            setSelectedServices([...selectedServices, service]);
        }
    };

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSelectDate = (dateObj: Date, dateStr: string) => {
        setSelectedDate(dateStr);
        setSelectedDateObj(dateObj);
        setSelectedTime(''); // Reset time when date changes
    };

    const handleSelectTime = (time: string) => {
        setSelectedTime(time);
        handleNext(); // Go to next step (client details)
    };

    const handleDateSelectFromCalendar = (date: Date) => {
        const formattedDate = format(date, 'dd MMM', { locale: ptBR });
        setSelectedDate(formattedDate);
        setSelectedDateObj(date);
        setSelectedTime('');
        setIsCalendarOpen(false);
    };

    const totalPrice = useMemo(() =>
        selectedServices.reduce((acc, curr) => acc + curr.price, 0),
        [selectedServices]
    );

    const totalDuration = useMemo(() =>
        selectedServices.reduce((acc, curr) => acc + (curr.duration_minutes || 30), 0),
        [selectedServices]
    );

    // Calendar logic
    const monthStart = startOfMonth(calendarViewDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStartDate = startOfWeek(monthStart);
    const calendarEndDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: calendarStartDate, end: calendarEndDate });
    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-barber-gold animate-spin" />
                    <p className="text-white">Carregando...</p>
                </div>
            </div>
        );
    }

    if (error || !business) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-xl mb-4">{error || 'Erro ao carregar'}</div>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="text-barber-gold hover:underline"
                    >
                        Voltar ao início
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center p-0 md:p-8">
            <div className="w-full max-w-lg mb-0 md:mb-24 pb-28 md:pb-0">

                {/* Branding Header */}
                <div className="text-center mb-6 pt-12 px-4">
                    <div className="w-16 h-16 bg-barber-gold rounded-full mx-auto flex items-center justify-center mb-3 shadow-2xl shadow-amber-500/20">
                        <Scissors size={28} className="text-black" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        NS <span className="text-barber-gold">Studio</span>
                    </h1>
                    {business.address && (
                        <div className="flex items-center justify-center gap-1 text-gray-400 text-sm mt-1">
                            <MapPin size={14} /> {business.address}
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="flex gap-1 mb-6 px-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-barber-gold' : 'bg-gray-800'}`}></div>
                    ))}
                </div>

                {/* Main Content Card */}
                <div className="bg-zinc-900 md:border md:border-zinc-800 rounded-none md:rounded-2xl overflow-hidden shadow-2xl min-h-[400px]">

                    {/* Step 1: Select Services */}
                    {step === 1 && (
                        <div className="p-6 pb-24 relative">
                            <h2 className="text-xl font-bold mb-6">O que deseja hoje?</h2>

                            {/* Tabs */}
                            <div className="flex bg-zinc-950 p-1 rounded-xl mb-6 border border-zinc-800">
                                <button
                                    onClick={() => setActiveTab('services')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'services'
                                        ? 'bg-zinc-800 text-white shadow'
                                        : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    Serviços
                                </button>
                                <button
                                    disabled
                                    className="flex-1 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 text-gray-600 cursor-not-allowed"
                                >
                                    <Crown size={14} /> Clube
                                    <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-gray-500">Em Breve</span>
                                </button>
                            </div>

                            {/* Services List */}
                            <div className="space-y-3">
                                {services.length === 0 ? (
                                    <div className="text-center py-10 text-gray-500">
                                        Nenhum serviço disponível
                                    </div>
                                ) : (
                                    services.map(service => {
                                        const isSelected = selectedServices.some(s => s.id === service.id);
                                        return (
                                            <div
                                                key={service.id}
                                                onClick={() => toggleService(service)}
                                                className={`p-4 border rounded-xl cursor-pointer transition-all flex justify-between items-center ${isSelected
                                                    ? 'bg-barber-gold/10 border-barber-gold shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'
                                                    }`}
                                            >
                                                <div className="flex gap-3 items-center">
                                                    {service.image_url && (
                                                        <img src={service.image_url} alt={service.name} className="w-12 h-12 rounded-lg object-cover" />
                                                    )}
                                                    <div>
                                                        <div className={`font-bold transition-colors ${isSelected ? 'text-barber-gold' : 'text-white'}`}>
                                                            {service.name}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {service.duration_minutes || 30} min • {service.category || 'Serviço'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="font-bold text-white">R$ {service.price.toFixed(2)}</div>
                                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-barber-gold border-barber-gold' : 'border-zinc-600'
                                                        }`}>
                                                        {isSelected && <Check size={14} className="text-black" />}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Sticky Footer */}
                            <div className="fixed bottom-0 left-0 w-full bg-zinc-900 border-t border-zinc-800 p-4 md:static md:bg-transparent md:border-0 md:p-0 md:mt-6 z-20">
                                <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-xs text-gray-400 uppercase font-bold">Resumo</div>
                                        <div className="text-white font-bold text-lg flex items-center gap-2">
                                            R$ {totalPrice.toFixed(2)}
                                            <span className="text-sm text-gray-500 font-normal">({totalDuration} min)</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleNext}
                                        disabled={selectedServices.length === 0}
                                        className="bg-barber-gold hover:bg-barber-goldhover text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Continuar <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Select Professional */}
                    {step === 2 && (
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-6 cursor-pointer text-gray-400 hover:text-white" onClick={handleBack}>
                                <ArrowLeft size={16} /> <span className="text-xs uppercase font-bold">Voltar</span>
                            </div>
                            <h2 className="text-xl font-bold mb-6">Escolha o Profissional</h2>
                            <div className="space-y-3">
                                {professionals.map(professional => (
                                    <div
                                        key={professional.id}
                                        onClick={() => { setSelectedProfessional(professional); handleNext(); }}
                                        className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-barber-gold cursor-pointer transition-all flex items-center gap-4"
                                    >
                                        {professional.avatar_url ? (
                                            <img src={professional.avatar_url} className="w-12 h-12 rounded-full object-cover border border-zinc-700" />
                                        ) : (
                                            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                                                <User size={20} className="text-gray-400" />
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-bold text-white">{professional.name}</div>
                                            <div className="text-xs text-barber-gold">{professional.specialty || 'Profissional'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Date & Time */}
                    {step === 3 && (
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-6 cursor-pointer text-gray-400 hover:text-white" onClick={handleBack}>
                                <ArrowLeft size={16} /> <span className="text-xs uppercase font-bold">Voltar</span>
                            </div>
                            <h2 className="text-xl font-bold mb-6">Data e Horário</h2>

                            {/* Date Slider */}
                            <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                                {dates.map((d, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSelectDate(d.dateObj, d.date)}
                                        className={`min-w-[80px] p-3 rounded-xl border flex flex-col items-center gap-1 transition-all flex-shrink-0 ${selectedDate === d.date
                                            ? 'bg-barber-gold border-barber-gold text-black'
                                            : 'bg-zinc-950 border-zinc-800 text-gray-400 hover:border-gray-600'
                                            }`}
                                    >
                                        <span className="text-xs font-bold uppercase">{d.day}</span>
                                        <span className="text-lg font-bold whitespace-nowrap">{d.date}</span>
                                    </button>
                                ))}

                                {/* Month button */}
                                <button
                                    onClick={() => setIsCalendarOpen(true)}
                                    className="min-w-[80px] p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all flex-shrink-0 bg-zinc-950 border-zinc-800 text-gray-400 hover:border-gray-600"
                                >
                                    <CalendarIcon size={24} className="mb-1" />
                                    <span className="text-xs font-bold uppercase">Mês</span>
                                </button>
                            </div>

                            {/* Time Slots */}
                            {selectedDate ? (
                                isLoadingSlots ? (
                                    <div className="text-center py-10 text-gray-500">
                                        <Loader2 className="animate-spin mx-auto mb-3" size={32} />
                                        <p>Carregando horários disponíveis...</p>
                                    </div>
                                ) : availableSlots.length > 0 ? (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {availableSlots.map(time => (
                                            <button
                                                key={time}
                                                onClick={() => handleSelectTime(time)}
                                                className={`py-3 rounded-lg text-sm font-medium border transition-all ${selectedTime === time
                                                    ? 'bg-white text-black border-white'
                                                    : 'bg-zinc-950 border-zinc-800 text-white hover:border-gray-600 hover:bg-zinc-900'
                                                    }`}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 text-gray-500 border-2 border-dashed border-zinc-800 rounded-xl">
                                        Nenhum horário disponível para esta data
                                    </div>
                                )
                            ) : (
                                <div className="text-center py-10 text-gray-500 border-2 border-dashed border-zinc-800 rounded-xl">
                                    Selecione uma data acima para ver os horários
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Confirmation Summary */}
                    {step === 4 && (
                        <div className="p-6">
                            <div className="flex items-center gap-2 mb-6 cursor-pointer text-gray-400 hover:text-white" onClick={handleBack}>
                                <ArrowLeft size={16} /> <span className="text-xs uppercase font-bold">Voltar</span>
                            </div>
                            <h2 className="text-xl font-bold mb-6">Confirme seu Agendamento</h2>

                            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
                                <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                                    <Clock size={20} className="text-barber-gold" />
                                    <div>
                                        <div className="text-gray-400 text-xs">Data e Horário</div>
                                        <div className="text-white font-bold">{selectedDate} às {selectedTime}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
                                    <User size={20} className="text-barber-gold" />
                                    <div>
                                        <div className="text-gray-400 text-xs">Profissional</div>
                                        <div className="text-white font-bold">{selectedProfessional?.name}</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-gray-400 text-xs mb-2">Serviços</div>
                                    {selectedServices.map(service => (
                                        <div key={service.id} className="flex justify-between items-center text-sm mb-1">
                                            <span className="text-white">{service.name}</span>
                                            <span className="text-gray-400">R$ {service.price.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-4 border-t border-zinc-800 flex justify-between items-center">
                                    <span className="text-white font-bold">Total</span>
                                    <span className="text-barber-gold font-bold text-xl">R$ {totalPrice.toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => alert('Implementar criação do agendamento')}
                                className="w-full bg-barber-gold hover:bg-barber-goldhover text-black font-bold py-4 rounded-xl mt-6 flex items-center justify-center gap-2"
                            >
                                Confirmar Agendamento <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-gray-600 text-xs pb-8 md:pb-0">
                    Powered by NS Studio & Stripe
                </div>
            </div>

            {/* Calendar Modal */}
            {isCalendarOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
                    <div className="bg-zinc-900 w-full max-w-sm rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
                        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white capitalize">
                                {format(calendarViewDate, "MMMM yyyy", { locale: ptBR })}
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCalendarViewDate(addMonths(calendarViewDate, -1))}
                                    className="p-2 hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-white"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={() => setCalendarViewDate(addMonths(calendarViewDate, 1))}
                                    className="p-2 hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-white"
                                >
                                    <ChevronRight size={20} />
                                </button>
                                <button
                                    onClick={() => setIsCalendarOpen(false)}
                                    className="ml-2 p-2 hover:bg-zinc-800 rounded-lg text-gray-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-4">
                            <div className="grid grid-cols-7 mb-2">
                                {weekDays.map(day => (
                                    <div key={day} className="text-center text-xs font-bold text-gray-500 py-2">{day}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((day, idx) => {
                                    const isCurrentMonth = isSameMonth(day, calendarViewDate);
                                    const isDayToday = isToday(day);
                                    const isPast = isBefore(day, startOfDay(new Date()));

                                    return (
                                        <button
                                            key={idx}
                                            disabled={!isCurrentMonth || isPast}
                                            onClick={() => handleDateSelectFromCalendar(day)}
                                            className={`
                                                h-10 w-full rounded-lg flex items-center justify-center text-sm font-bold transition-all
                                                ${!isCurrentMonth || isPast ? 'opacity-30 pointer-events-none' : ''}
                                                ${isDayToday ? 'border border-barber-gold/50 text-barber-gold' : 'text-gray-300 hover:bg-zinc-800 hover:text-white'}
                                            `}
                                        >
                                            {format(day, 'd')}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
