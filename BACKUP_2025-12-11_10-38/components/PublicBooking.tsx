import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, Scissors, User, ChevronRight, CheckCircle2, MapPin, ArrowLeft, Check, ChevronLeft, X, CreditCard, QrCode, Copy, ShieldCheck, Loader2, Crown, Star, Zap } from 'lucide-react';
import { format, addMonths, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Service, Barber, MembershipPlan } from '../types';
import { useSupabaseQuery } from '../lib/hooks';
import { fetchServices, fetchProfessionals, getCurrentBusinessId } from '../lib/database';
import { fetchAvailableSlots, createAppointment } from '../lib/api/publicApi';
import { createPublicAppointment, getAvailableSlots, getAvailableSlotsForAllProfessionals } from '../lib/availability';
import { getProfessionalsAvailableNow, ProfessionalAvailableNow } from '../lib/availabilityNow';
import { supabase } from '../lib/supabase';

interface PublicBookingProps {
   onBack: () => void;
}

const PublicBooking: React.FC<PublicBookingProps> = ({ onBack }) => {
   // Fetch data from database
   const { data: servicesData, loading: servicesLoading } = useSupabaseQuery(fetchServices);
   const { data: barbersData, loading: barbersLoading } = useSupabaseQuery(fetchProfessionals);

   const services = servicesData || [];
   const barbers = barbersData || [];
   const membershipPlans: MembershipPlan[] = [];

   const [step, setStep] = useState(1);
   const [activeTab, setActiveTab] = useState<'services' | 'plans'>('services');
   const [selectedServices, setSelectedServices] = useState<Service[]>([]);
   const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);

   const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);

   // Date & Time State
   const [selectedDate, setSelectedDate] = useState<string>('');
   const [selectedTime, setSelectedTime] = useState<string>('');
   const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);

   // Client Details State
   const [clientName, setClientName] = useState('');
   const [clientPhone, setClientPhone] = useState('');

   // Payment State
   const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('credit_card');
   const [isProcessingPayment, setIsProcessingPayment] = useState(false);

   // Calendar Modal State
   const [isCalendarOpen, setIsCalendarOpen] = useState(false);
   const [calendarViewDate, setCalendarViewDate] = useState(new Date());

   // Real slots state
   const [availableSlots, setAvailableSlots] = useState<string[]>([]);
   const [isLoadingSlots, setIsLoadingSlots] = useState(false);
   const [businessId, setBusinessId] = useState<string>('');

   // NEW: Available Now state
   const [availableNowProfessionals, setAvailableNowProfessionals] = useState<ProfessionalAvailableNow[]>([]);
   const [isLoadingAvailableNow, setIsLoadingAvailableNow] = useState(false);
   const [nextAvailableSlot, setNextAvailableSlot] = useState<string>('');

   // NEW: Available professionals for selected time
   const [professionalsForTime, setProfessionalsForTime] = useState<Barber[]>([]);
   const [isLoadingProfessionals, setIsLoadingProfessionals] = useState(false);

   // Professional-Service mapping: which professionals offer which services
   const [professionalServiceMap, setProfessionalServiceMap] = useState<Record<string, string[]>>({});

   // Load professional-service associations
   useEffect(() => {
      const loadProfessionalServices = async () => {
         const { data, error } = await supabase
            .from('professional_services')
            .select('professional_id, service_id');

         if (error) {
            console.log('⚠️ professional_services table may not exist yet:', error.message);
            // If table doesn't exist, show all professionals for all services
            return;
         }

         // Group by professional_id -> list of service_ids
         const mapping: Record<string, string[]> = {};
         (data || []).forEach(row => {
            if (!mapping[row.professional_id]) {
               mapping[row.professional_id] = [];
            }
            mapping[row.professional_id].push(row.service_id);
         });

         console.log('📋 [PublicBooking] Loaded professional-service mapping:', mapping);
         setProfessionalServiceMap(mapping);
      };

      loadProfessionalServices();
   }, []);

   // Filter barbers to only those who offer AT LEAST ONE selected service
   // Professionals with NO associations are shown for ALL services (default behavior)
   const filteredBarbers = useMemo(() => {
      // If no services selected, show all barbers
      if (selectedServices.length === 0) return barbers;

      // If no mapping loaded yet (table doesn't exist or error), show all barbers
      if (Object.keys(professionalServiceMap).length === 0) return barbers;

      const selectedServiceIds = selectedServices.map(s => s.id);

      const filtered = barbers.filter(barber => {
         const barberServices = professionalServiceMap[barber.id] || [];

         // If professional has NO service associations, show them for all services (unrestricted)
         if (barberServices.length === 0) {
            return true;
         }

         // Otherwise, barber must offer at least one of the selected services
         return selectedServiceIds.some(serviceId => barberServices.includes(serviceId));
      });

      // FALLBACK: If filtering results in empty list but we have barbers, show all barbers
      // This prevents booking from being blocked when professional_services table has incomplete data
      if (filtered.length === 0 && barbers.length > 0) {
         console.log('⚠️ [PublicBooking] No barbers matched service filter, falling back to all barbers');
         return barbers;
      }

      return filtered;
   }, [barbers, selectedServices, professionalServiceMap]);

   // Generate dynamic dates (next 7 days)
   const dates = useMemo(() => {
      const result = [];
      const today = new Date();
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

      for (let i = 0; i < 7; i++) {
         const date = addDays(today, i);
         const dayLabel = i === 0 ? 'HOJE' : i === 1 ? 'AMANHÃ' : dayNames[date.getDay()].toUpperCase();
         result.push({
            day: dayLabel,
            dayNum: format(date, 'd'),
            date: format(date, 'dd MMM', { locale: ptBR }),
            dateObj: date,
            dateStr: format(date, 'yyyy-MM-dd'),
            isToday: i === 0
         });
      }
      return result;
   }, []);

   // Load business ID
   useEffect(() => {
      const loadBusinessId = async () => {
         const id = await getCurrentBusinessId();
         if (id) setBusinessId(id);
      };
      loadBusinessId();
   }, []);

   // Calculate next available slot (next round hour)
   const getNextAvailableSlot = (): string => {
      const now = new Date();
      const nextHour = now.getHours() + 1;
      return `${nextHour.toString().padStart(2, '0')}:00`;
   };

   // Load "Available Now" professionals when on step 2 and Today is selected
   useEffect(() => {
      const loadAvailableNow = async () => {
         if (!businessId || step !== 2) return;

         const todayDate = dates[0];
         const isToday = selectedDateObj && format(selectedDateObj, 'yyyy-MM-dd') === todayDate.dateStr;

         if (!isToday) {
            setAvailableNowProfessionals([]);
            return;
         }

         setIsLoadingAvailableNow(true);
         try {
            const serviceId = selectedServices.length > 0 ? selectedServices[0].id : undefined;
            const serviceDuration = selectedServices.reduce((acc, s) => acc + (s.duration_minutes || 60), 0);

            const professionals = await getProfessionalsAvailableNow(businessId, serviceId, serviceDuration);
            setAvailableNowProfessionals(professionals);
            setNextAvailableSlot(getNextAvailableSlot());
         } catch (error) {
            console.error('Error loading available now:', error);
            setAvailableNowProfessionals([]);
         }
         setIsLoadingAvailableNow(false);
      };

      loadAvailableNow();
   }, [businessId, step, selectedDateObj, selectedServices, dates]);

   // Auto-select HOJE (first date) when entering Step 2 if no date selected
   useEffect(() => {
      if (step === 2 && !selectedDateObj && dates.length > 0) {
         const today = dates[0];
         setSelectedDate(today.date);
         setSelectedDateObj(today.dateObj);
         console.log('📅 [PublicBooking] Auto-selected HOJE:', today.dateStr);
      }
   }, [step, selectedDateObj, dates]);

   // Load available slots when date is selected (Step 2) - OPTIMIZED
   useEffect(() => {
      const loadSlots = async () => {
         if (!businessId || !selectedDateObj || !selectedServices.length || step !== 2) return;
         if (filteredBarbers.length === 0) {
            setAvailableSlots([]);
            return;
         }

         setIsLoadingSlots(true);
         try {
            const serviceDuration = selectedServices.reduce((acc, s) => acc + (s.duration_minutes || 60), 0);
            const dateStr = format(selectedDateObj, 'yyyy-MM-dd');
            const professionalIds = filteredBarbers.map(b => b.id);

            console.log('📅 [PublicBooking] Loading slots for:', dateStr, 'duration:', serviceDuration, 'professionals:', professionalIds.length);

            // Use optimized batch function (5 queries instead of ~30)
            const slots = await getAvailableSlotsForAllProfessionals(
               businessId,
               professionalIds,
               dateStr,
               serviceDuration
            );

            console.log('✅ [PublicBooking] Found', slots.length, 'unique slots');
            setAvailableSlots(slots);
         } catch (err) {
            console.error('❌ [PublicBooking] Error loading slots:', err);
            setAvailableSlots([]);
         }
         setIsLoadingSlots(false);
      };

      loadSlots();
   }, [businessId, selectedDateObj, selectedServices, step, filteredBarbers]);

   // Load available professionals for selected time (Step 3)
   useEffect(() => {
      const loadProfessionalsForTime = async () => {
         if (!businessId || !selectedDateObj || !selectedTime || !selectedServices.length || step !== 3) return;

         setIsLoadingProfessionals(true);
         try {
            const serviceDuration = selectedServices.reduce((acc, s) => acc + (s.duration_minutes || 60), 0);
            const dateStr = format(selectedDateObj, 'yyyy-MM-dd');

            const availableProfessionals: Barber[] = [];

            for (const barber of filteredBarbers) {
               const slots = await getAvailableSlots(businessId, barber.id, dateStr, serviceDuration);
               const isAvailable = slots.some(s => s.time === selectedTime && s.available);
               if (isAvailable) {
                  availableProfessionals.push(barber);
               }
            }

            setProfessionalsForTime(availableProfessionals);
         } catch (error) {
            console.error('Error loading professionals for time:', error);
            setProfessionalsForTime([]);
         }
         setIsLoadingProfessionals(false);
      };

      loadProfessionalsForTime();
   }, [businessId, selectedDateObj, selectedTime, selectedServices, step, filteredBarbers]);

   // NEW: Step order - Service(1) -> Date/Time(2) -> Professional(3) -> Details(4) -> Payment(5) -> Success(6)
   const handleNext = () => setStep(step + 1);
   const handleBack = () => {
      if (step === 3) {
         // Going back from Professional to Date/Time - keep date, clear time
         setSelectedTime('');
         setStep(2);
      } else if (step === 4 && selectedBarber) {
         // Going back from Details - could be from fast track or normal flow
         setStep(3);
      } else {
         setStep(step - 1);
      }
   };

   const toggleService = (service: Service) => {
      if (selectedPlan) setSelectedPlan(null);

      if (selectedServices.find(s => s.id === service.id)) {
         setSelectedServices(selectedServices.filter(s => s.id !== service.id));
      } else {
         setSelectedServices([...selectedServices, service]);
      }
   };

   const handleSelectPlan = (plan: MembershipPlan) => {
      setSelectedPlan(plan);
      setSelectedServices([]);
      handleNext();
   };

   const handleDateSelect = (dateItem: typeof dates[0]) => {
      setSelectedDate(dateItem.date);
      setSelectedDateObj(dateItem.dateObj);
      setSelectedTime(''); // Reset time when date changes
   };

   const handleTimeSelect = (time: string) => {
      setSelectedTime(time);
      handleNext(); // Go to Step 3: Professional selection
   };

   // NEW: Fast track - select professional from "Available Now" and skip to details
   const handleSelectNow = (professional: ProfessionalAvailableNow) => {
      const todayDate = dates[0];
      setSelectedDate(todayDate.date);
      setSelectedDateObj(todayDate.dateObj);
      setSelectedTime(nextAvailableSlot);
      setSelectedBarber(barbers.find(b => b.id === professional.professionalId) || null);
      setStep(4); // Skip to Details step
   };

   const handleSelectProfessional = (barber: Barber | null) => {
      setSelectedBarber(barber);
      handleNext(); // Go to Step 4: Details
   };

   const handleDateSelectFromCalendar = (date: Date) => {
      const formattedDate = format(date, 'dd MMM', { locale: ptBR });
      setSelectedDate(formattedDate);
      setSelectedDateObj(date);
      setSelectedTime('');
      setIsCalendarOpen(false);
   };

   const handlePaymentProcess = async () => {
      setIsProcessingPayment(true);

      try {
         if (!businessId || !selectedDateObj || !clientName || !clientPhone) {
            console.error('Missing required data for appointment');
            setIsProcessingPayment(false);
            return;
         }

         const professionalId = selectedBarber?.id || professionalsForTime[0]?.id || barbers[0]?.id;
         if (!professionalId || !selectedServices.length) {
            console.error('Missing professional or service');
            setIsProcessingPayment(false);
            return;
         }

         const dateStr = format(selectedDateObj, 'yyyy-MM-dd');

         const result = await createPublicAppointment(businessId, {
            professional_id: professionalId,
            service_id: selectedServices[0].id,
            client_name: clientName,
            client_phone: clientPhone,
            date: dateStr,
            time: selectedTime
         });

         if (result.success) {
            console.log('✅ Appointment created:', result.appointmentId);
            handleNext();
         } else {
            console.error('❌ Failed to create appointment:', result.error);
            alert(result.error || 'Erro ao criar agendamento');
         }
      } catch (error) {
         console.error('Error creating appointment:', error);
         alert('Erro ao processar agendamento. Tente novamente.');
      }

      setIsProcessingPayment(false);
   };

   const totalPrice = selectedPlan
      ? selectedPlan.price
      : selectedServices.reduce((acc, curr) => acc + curr.price, 0);

   const totalDuration = selectedServices.reduce((acc, curr) => acc + (curr.duration_minutes || curr.duration || 30), 0);

   // Calendar Logic
   const monthStart = startOfMonth(calendarViewDate);
   const monthEnd = endOfMonth(monthStart);
   const startDate = startOfWeek(monthStart);
   const endDate = endOfWeek(monthEnd);
   const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
   const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

   // Check if selected date is today
   const isSelectedDateToday = selectedDateObj && format(selectedDateObj, 'yyyy-MM-dd') === dates[0]?.dateStr;

   return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center p-0 md:p-8 animate-fade-in relative z-50">
         <button onClick={onBack} className="absolute top-4 left-4 text-gray-500 hover:text-white flex items-center gap-2 z-10 p-2">
            <ArrowLeft size={20} /> <span className="hidden sm:inline">Voltar ao Painel</span>
         </button>

         <div className="w-full max-w-lg mb-0 md:mb-24 pb-20 md:pb-0">

            {/* Branding Header */}
            <div className="text-center mb-6 pt-12 px-4">
               <div className="w-16 h-16 bg-barber-gold rounded-full mx-auto flex items-center justify-center mb-3 shadow-2xl shadow-amber-500/20">
                  <Scissors size={28} className="text-black" />
               </div>
               <h1 className="text-2xl font-bold tracking-tight">NS <span className="text-barber-gold">Studio</span></h1>
               <div className="flex items-center justify-center gap-1 text-gray-400 text-sm mt-1">
                  <MapPin size={14} /> Av. Paulista, 1000 - SP
               </div>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-1 mb-6 px-4">
               {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-barber-gold' : 'bg-gray-800'}`}></div>
               ))}
            </div>

            {/* Steps Content */}
            <div className="bg-zinc-900 md:border md:border-zinc-800 rounded-none md:rounded-2xl overflow-hidden shadow-2xl min-h-[400px]">

               {/* Step 1: Select Service or Plan */}
               {step === 1 && (
                  <div className="p-6 pb-24 relative">
                     <h2 className="text-xl font-bold mb-6">O que deseja hoje?</h2>

                     {/* Tabs */}
                     <div className="flex bg-zinc-950 p-1 rounded-xl mb-6 border border-zinc-800">
                        <button
                           onClick={() => setActiveTab('services')}
                           className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'services' ? 'bg-zinc-800 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                           Serviços
                        </button>
                        <button
                           onClick={() => setActiveTab('plans')}
                           className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'plans' ? 'bg-barber-gold text-black shadow' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                           <Crown size={14} /> Clube
                        </button>
                     </div>

                     {activeTab === 'services' ? (
                        <div className="space-y-3">
                           {services.filter(s => s.is_active).map(service => {
                              const isSelected = selectedServices.some(s => s.id === service.id);
                              return (
                                 <div
                                    key={service.id}
                                    onClick={() => toggleService(service)}
                                    className={`p-4 border rounded-xl cursor-pointer transition-all flex justify-between items-center group relative overflow-hidden ${isSelected
                                       ? 'bg-barber-gold/10 border-barber-gold shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                                       : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'
                                       }`}
                                 >
                                    <div className="flex gap-3 items-center">
                                       {service.image_url && (
                                          <img src={service.image_url} alt={service.name} className="w-12 h-12 rounded-lg object-cover hidden sm:block" />
                                       )}
                                       <div>
                                          <div className={`font-bold transition-colors ${isSelected ? 'text-barber-gold' : 'text-white'}`}>{service.name}</div>
                                          <div className="text-xs text-gray-500 mt-1">{service.duration_minutes || service.duration || 30} min • {service.category || 'Serviço'}</div>
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
                           })}
                        </div>
                     ) : (
                        <div className="space-y-4">
                           <div className="bg-gradient-to-br from-barber-gold to-yellow-600 p-6 rounded-xl shadow-lg relative overflow-hidden">
                              <Crown className="absolute -right-4 -top-4 text-black/10 w-32 h-32" />
                              <h3 className="text-black font-bold text-lg mb-1 relative z-10">Vantagens de Assinar</h3>
                              <ul className="text-black/80 text-sm space-y-1 relative z-10">
                                 <li className="flex items-center gap-2"><Star size={12} fill="black" /> Economia Garantida</li>
                                 <li className="flex items-center gap-2"><Star size={12} fill="black" /> Prioridade na Agenda</li>
                                 <li className="flex items-center gap-2"><Star size={12} fill="black" /> Bebida Cortesia</li>
                              </ul>
                           </div>

                           {membershipPlans.map(plan => (
                              <div
                                 key={plan.id}
                                 className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 hover:border-barber-gold transition-colors cursor-pointer group"
                                 onClick={() => handleSelectPlan(plan)}
                              >
                                 <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-lg text-white group-hover:text-barber-gold transition-colors">{plan.name}</h4>
                                    <span className="text-xs font-bold uppercase bg-zinc-800 px-2 py-1 rounded text-gray-400">{plan.billing_cycle}</span>
                                 </div>
                                 <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                                 <ul className="space-y-2 mb-4">
                                    {plan.benefits?.map((benefit, idx) => (
                                       <li key={idx} className="text-xs text-gray-300 flex items-center gap-2">
                                          <Check size={12} className="text-green-500" /> {benefit}
                                       </li>
                                    ))}
                                 </ul>
                                 <div className="flex justify-between items-end border-t border-zinc-800 pt-4">
                                    <span className="text-2xl font-bold text-white">R$ {plan.price.toFixed(2)}</span>
                                    <button className="bg-zinc-800 hover:bg-barber-gold hover:text-black text-white px-4 py-2 rounded-lg text-xs font-bold transition-all">
                                       Assinar Agora
                                    </button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}

                     {/* Sticky Footer for Step 1 */}
                     {activeTab === 'services' && (
                        <div className="fixed bottom-0 left-0 w-full bg-zinc-900 border-t border-zinc-800 p-4 md:static md:bg-transparent md:border-0 md:p-0 md:mt-6 animate-fade-in z-20">
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
                     )}
                  </div>
               )}

               {/* Step 2: Date & Time (NEW ORDER) */}
               {step === 2 && (
                  <div className="p-6">
                     <div className="flex items-center gap-2 mb-6 cursor-pointer text-gray-400 hover:text-white" onClick={handleBack}>
                        <ArrowLeft size={16} /> <span className="text-xs uppercase font-bold">Voltar</span>
                     </div>
                     <h2 className="text-xl font-bold mb-6">Quando?</h2>

                     {/* Date Carousel */}
                     <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                        {dates.map((d, i) => (
                           <button
                              key={i}
                              onClick={() => handleDateSelect(d)}
                              className={`min-w-[80px] p-3 rounded-xl border flex flex-col items-center gap-1 transition-all flex-shrink-0 ${format(selectedDateObj || new Date(), 'yyyy-MM-dd') === d.dateStr
                                 ? 'bg-barber-gold border-barber-gold text-black'
                                 : 'bg-zinc-950 border-zinc-800 text-gray-400 hover:border-gray-600'
                                 }`}
                           >
                              <span className="text-xs font-bold uppercase">{d.day}</span>
                              <span className="text-2xl font-bold">{d.dayNum}</span>
                           </button>
                        ))}

                        {/* Month Button */}
                        <button
                           onClick={() => setIsCalendarOpen(true)}
                           className="min-w-[80px] p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all flex-shrink-0 bg-zinc-950 border-zinc-800 text-gray-400 hover:border-gray-600"
                        >
                           <CalendarIcon size={24} className="mb-1" />
                           <span className="text-xs font-bold uppercase">Mês</span>
                        </button>
                     </div>

                     {/* Available Now Card - Only show for Today */}
                     {isSelectedDateToday && (
                        <div className="mb-6">
                           <div className="flex items-center gap-2 mb-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="text-sm font-bold uppercase text-white">Disponível Agora</span>
                           </div>

                           {isLoadingAvailableNow ? (
                              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex items-center justify-center">
                                 <Loader2 className="animate-spin text-barber-gold" size={24} />
                              </div>
                           ) : availableNowProfessionals.length > 0 ? (
                              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative overflow-hidden">
                                 <Zap className="absolute right-4 top-4 text-barber-gold/20" size={40} />
                                 <div className="flex items-baseline gap-2 mb-4">
                                    <span className="text-3xl font-bold text-white">{nextAvailableSlot}</span>
                                    <span className="text-sm font-bold text-green-500 uppercase">Imediato</span>
                                 </div>
                                 <div className="flex gap-4 flex-wrap">
                                    {availableNowProfessionals.slice(0, 4).map((prof) => (
                                       <button
                                          key={prof.professionalId}
                                          onClick={() => handleSelectNow(prof)}
                                          className="flex flex-col items-center gap-1 group cursor-pointer"
                                       >
                                          <div className="relative">
                                             {prof.avatarUrl ? (
                                                <img
                                                   src={prof.avatarUrl}
                                                   alt={prof.name}
                                                   className="w-14 h-14 rounded-full object-cover border-2 border-zinc-700 group-hover:border-barber-gold transition-colors"
                                                />
                                             ) : (
                                                <div className="w-14 h-14 rounded-full bg-zinc-800 border-2 border-zinc-700 group-hover:border-barber-gold transition-colors flex items-center justify-center">
                                                   <User size={20} className="text-gray-400" />
                                                </div>
                                             )}
                                             <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-zinc-950"></div>
                                          </div>
                                          <span className="text-xs text-gray-300 group-hover:text-barber-gold transition-colors">
                                             {prof.name.split(' ')[0]}
                                          </span>
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           ) : (
                              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center text-gray-500 text-sm">
                                 Nenhum profissional disponível no momento
                              </div>
                           )}
                        </div>
                     )}

                     {/* Time Grid */}
                     <div>
                        <h3 className="text-sm font-bold uppercase text-gray-400 mb-3">
                           {isSelectedDateToday ? 'Outros Horários' : 'Horários Disponíveis'}
                        </h3>

                        {!selectedDateObj ? (
                           <div className="text-center py-10 text-gray-500 border-2 border-dashed border-zinc-800 rounded-xl">
                              Selecione uma data acima para ver os horários
                           </div>
                        ) : isLoadingSlots ? (
                           <div className="text-center py-10 text-gray-500">
                              <Loader2 className="animate-spin mx-auto mb-3" size={32} />
                              <p>Carregando horários disponíveis...</p>
                           </div>
                        ) : availableSlots.length > 0 ? (
                           <div className="grid grid-cols-4 gap-3 animate-fade-in">
                              {availableSlots.map(time => (
                                 <button
                                    key={time}
                                    onClick={() => handleTimeSelect(time)}
                                    className="py-3 rounded-lg text-sm font-medium border transition-all bg-zinc-950 border-zinc-800 text-white hover:border-gray-600 hover:bg-zinc-900"
                                 >
                                    {time}
                                 </button>
                              ))}
                           </div>
                        ) : (
                           <div className="text-center py-10 text-gray-500 border-2 border-dashed border-zinc-800 rounded-xl">
                              Nenhum horário disponível para esta data
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {/* Step 3: Select Professional (NEW ORDER) */}
               {step === 3 && (
                  <div className="p-6">
                     <div className="flex items-center gap-2 mb-6 cursor-pointer text-gray-400 hover:text-white" onClick={handleBack}>
                        <ArrowLeft size={16} /> <span className="text-xs uppercase font-bold">Voltar</span>
                     </div>
                     <h2 className="text-xl font-bold mb-1">Com quem?</h2>
                     <p className="text-sm text-gray-400 mb-6">
                        Profissionais disponíveis às <span className="font-bold text-white">{selectedTime}</span>
                     </p>

                     {isLoadingProfessionals ? (
                        <div className="text-center py-10 text-gray-500">
                           <Loader2 className="animate-spin mx-auto mb-3" size={32} />
                           <p>Carregando profissionais...</p>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 gap-3">
                           {/* First Available Option */}
                           <div
                              onClick={() => handleSelectProfessional(null)}
                              className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-barber-gold cursor-pointer transition-all flex items-center gap-4"
                           >
                              <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                                 <Scissors size={20} className="text-barber-gold" />
                              </div>
                              <div className="font-bold">Primeiro Disponível</div>
                           </div>

                           {/* Available Professionals */}
                           {professionalsForTime.map(barber => (
                              <div
                                 key={barber.id}
                                 onClick={() => handleSelectProfessional(barber)}
                                 className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-barber-gold cursor-pointer transition-all flex items-center gap-4"
                              >
                                 {barber.avatar_url ? (
                                    <img src={barber.avatar_url} className="w-12 h-12 rounded-full object-cover border border-zinc-700" />
                                 ) : (
                                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                                       <User size={20} className="text-gray-400" />
                                    </div>
                                 )}
                                 <div>
                                    <div className="font-bold text-white">{barber.name}</div>
                                    <div className="text-xs text-barber-gold flex items-center gap-1">
                                       {barber.specialty || 'Profissional'}
                                    </div>
                                 </div>
                              </div>
                           ))}

                           {professionalsForTime.length === 0 && (
                              <div className="text-center py-6 text-gray-500 border-2 border-dashed border-zinc-800 rounded-xl">
                                 Nenhum profissional disponível neste horário
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               )}

               {/* Step 4: Details & Review */}
               {step === 4 && (
                  <div className="p-6">
                     <div className="flex items-center gap-2 mb-6 cursor-pointer text-gray-400 hover:text-white" onClick={handleBack}>
                        <ArrowLeft size={16} /> <span className="text-xs uppercase font-bold">Voltar</span>
                     </div>
                     <h2 className="text-xl font-bold mb-6">Seus Dados</h2>

                     <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-6 space-y-3">
                        <div className="border-b border-zinc-800 pb-3 mb-3">
                           <span className="text-gray-500 text-sm block mb-2">Resumo do Pedido</span>
                           {selectedPlan ? (
                              <div className="flex justify-between items-center text-sm mb-1">
                                 <span className="text-white font-medium flex items-center gap-2">
                                    <Crown size={14} className="text-barber-gold" /> {selectedPlan.name} (Assinatura)
                                 </span>
                                 <span className="text-gray-400">R$ {selectedPlan.price.toFixed(2)}</span>
                              </div>
                           ) : (
                              selectedServices.map(service => (
                                 <div key={service.id} className="flex justify-between items-center text-sm mb-1">
                                    <span className="text-white font-medium">{service.name}</span>
                                    <span className="text-gray-400">R$ {service.price.toFixed(2)}</span>
                                 </div>
                              ))
                           )}
                        </div>

                        <div className="flex justify-between">
                           <span className="text-gray-500 text-sm">Profissional</span>
                           <span className="font-bold">{selectedBarber?.name || 'Primeiro Disponível'}</span>
                        </div>
                        <div className="flex justify-between">
                           <span className="text-gray-500 text-sm">Data/Hora</span>
                           <span className="font-bold">{selectedDate} às {selectedTime}</span>
                        </div>
                        <div className="border-t border-zinc-800 pt-3 flex justify-between items-center">
                           <span className="text-white font-bold">Total a Pagar</span>
                           <span className="text-barber-gold font-bold text-xl">R$ {totalPrice.toFixed(2)}</span>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <input
                           type="text"
                           placeholder="Seu Nome Completo"
                           value={clientName}
                           onChange={(e) => setClientName(e.target.value)}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-barber-gold"
                        />
                        <input
                           type="tel"
                           placeholder="Seu WhatsApp (11) 9..."
                           value={clientPhone}
                           onChange={(e) => setClientPhone(e.target.value)}
                           className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white outline-none focus:border-barber-gold"
                        />
                     </div>

                     <button
                        onClick={handleNext}
                        disabled={!clientName || !clientPhone}
                        className="w-full bg-barber-gold hover:bg-barber-goldhover text-black font-bold py-4 rounded-xl mt-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                     >
                        Ir para Pagamento <ChevronRight size={18} />
                     </button>
                  </div>
               )}

               {/* Step 5: Payment */}
               {step === 5 && (
                  <div className="p-6">
                     <div className="flex items-center gap-2 mb-6 cursor-pointer text-gray-400 hover:text-white" onClick={handleBack}>
                        <ArrowLeft size={16} /> <span className="text-xs uppercase font-bold">Voltar</span>
                     </div>
                     <h2 className="text-xl font-bold mb-6">Pagamento Seguro</h2>

                     <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-6 flex justify-between items-center">
                        <span className="text-gray-400">Valor Total</span>
                        <span className="text-2xl font-bold text-white">R$ {totalPrice.toFixed(2)}</span>
                     </div>

                     {/* Payment Method Selector */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                        <button
                           onClick={() => setPaymentMethod('credit_card')}
                           className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'credit_card'
                              ? 'bg-white text-black border-white'
                              : 'bg-zinc-950 border-zinc-800 text-gray-400 hover:border-gray-600'
                              }`}
                        >
                           <CreditCard size={24} />
                           <span className="text-xs font-bold">Cartão de Crédito</span>
                        </button>
                        <button
                           onClick={() => setPaymentMethod('pix')}
                           className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'pix'
                              ? 'bg-green-500 text-black border-green-500'
                              : 'bg-zinc-950 border-zinc-800 text-gray-400 hover:border-gray-600'
                              }`}
                        >
                           <QrCode size={24} />
                           <span className="text-xs font-bold">Pix Instantâneo</span>
                        </button>
                     </div>

                     {/* Form Area */}
                     <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
                        {isProcessingPayment && (
                           <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center backdrop-blur-sm animate-fade-in">
                              <Loader2 size={40} className="text-barber-gold animate-spin mb-4" />
                              <span className="text-white font-bold">Processando Pagamento...</span>
                              <span className="text-xs text-gray-400 mt-2">Não feche esta janela</span>
                           </div>
                        )}

                        {paymentMethod === 'credit_card' ? (
                           <div className="space-y-4 animate-fade-in">
                              <div className="flex justify-between items-center mb-2">
                                 <span className="text-xs text-gray-500 font-bold uppercase">Dados do Cartão (Stripe)</span>
                                 <div className="flex gap-1 opacity-50">
                                    <div className="w-8 h-5 bg-gray-700 rounded"></div>
                                    <div className="w-8 h-5 bg-gray-700 rounded"></div>
                                 </div>
                              </div>
                              <input
                                 type="text"
                                 placeholder="Número do Cartão"
                                 className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white outline-none focus:border-barber-gold transition-colors font-mono"
                              />
                              <div className="grid grid-cols-2 gap-4">
                                 <input
                                    type="text"
                                    placeholder="MM/AA"
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white outline-none focus:border-barber-gold transition-colors font-mono"
                                 />
                                 <input
                                    type="text"
                                    placeholder="CVC"
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white outline-none focus:border-barber-gold transition-colors font-mono"
                                 />
                              </div>
                              <input
                                 type="text"
                                 placeholder="Nome no Cartão"
                                 className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white outline-none focus:border-barber-gold transition-colors"
                              />

                              <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-2">
                                 <ShieldCheck size={12} className="text-green-500" />
                                 Pagamento criptografado e seguro
                              </div>

                              <button
                                 onClick={handlePaymentProcess}
                                 className="w-full bg-barber-gold hover:bg-barber-goldhover text-black font-bold py-4 rounded-xl mt-4 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                              >
                                 {selectedPlan ? 'Assinar & Pagar' : `Pagar R$ ${totalPrice.toFixed(2)}`}
                              </button>
                           </div>
                        ) : (
                           <div className="flex flex-col items-center text-center animate-fade-in space-y-4">
                              <div className="bg-white p-2 rounded-lg">
                                 <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ExamplePixPayment" alt="QR Pix" className="w-40 h-40" />
                              </div>
                              <div className="w-full">
                                 <p className="text-xs text-gray-400 mb-2">Escaneie o QR Code ou copie a chave abaixo:</p>
                                 <div className="flex gap-2">
                                    <input
                                       readOnly
                                       value="00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000"
                                       className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-gray-400 outline-none truncate"
                                    />
                                    <button className="bg-zinc-800 hover:bg-zinc-700 text-white p-2 rounded-lg border border-zinc-700">
                                       <Copy size={16} />
                                    </button>
                                 </div>
                              </div>
                              <button
                                 onClick={handlePaymentProcess}
                                 className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2"
                              >
                                 <CheckCircle2 size={18} /> Já fiz o Pix
                              </button>
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {/* Step 6: Success */}
               {step === 6 && (
                  <div className="p-8 flex flex-col items-center justify-center h-full text-center min-h-[400px]">
                     <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <CheckCircle2 size={40} className="text-black" />
                     </div>
                     <h2 className="text-2xl font-bold text-white mb-2">
                        {selectedPlan ? 'Assinatura Confirmada!' : 'Pagamento Confirmado!'}
                     </h2>
                     <p className="text-gray-400 mb-8">
                        {selectedPlan
                           ? 'Bem-vindo ao clube! Seu agendamento foi realizado e seus benefícios estão ativos.'
                           : 'Seu agendamento foi realizado com sucesso. Enviamos os detalhes para seu WhatsApp.'}
                     </p>

                     <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl w-full mb-6">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-zinc-800">
                           <span className="text-gray-500 text-sm">Agendamento</span>
                           <span className="text-barber-gold font-mono font-bold">#8823</span>
                        </div>
                        <div className="space-y-2 text-left">
                           <div className="flex gap-3 items-center">
                              <CalendarIcon size={16} className="text-gray-500" />
                              <span className="text-white font-bold">{selectedDate} às {selectedTime}</span>
                           </div>
                           <div className="flex gap-3 items-center">
                              <User size={16} className="text-gray-500" />
                              <span className="text-white">{selectedBarber?.name || 'Primeiro Disponível'}</span>
                           </div>
                           <div className="flex gap-3 items-center">
                              <MapPin size={16} className="text-gray-500" />
                              <span className="text-white">Av. Paulista, 1000 - SP</span>
                           </div>
                        </div>
                     </div>

                     <button className="text-sm text-gray-500 hover:text-white underline">
                        Voltar ao início
                     </button>
                  </div>
               )}

            </div>

            <div className="text-center mt-8 text-gray-600 text-xs pb-8 md:pb-0">
               Powered by NS Studio & Stripe
            </div>

         </div>

         {/* Calendar Modal */}
         {isCalendarOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
               <div className="bg-zinc-900 w-full max-w-sm rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
                  {/* Calendar Header */}
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

                  {/* Calendar Grid */}
                  <div className="p-4">
                     {/* Week Days */}
                     <div className="grid grid-cols-7 mb-2">
                        {weekDays.map((day, i) => (
                           <div key={i} className="text-center text-xs font-bold text-gray-500 py-2">
                              {day}
                           </div>
                        ))}
                     </div>

                     {/* Days */}
                     <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => {
                           const isCurrentMonth = isSameMonth(day, calendarViewDate);
                           const isSelected = selectedDateObj && isSameDay(day, selectedDateObj);
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
                             ${isSelected
                                       ? 'bg-barber-gold text-black shadow-lg shadow-amber-500/20'
                                       : 'text-gray-300 hover:bg-zinc-800 hover:text-white'}
                             ${isDayToday && !isSelected ? 'border border-barber-gold/50 text-barber-gold' : ''}
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
};

export default PublicBooking;