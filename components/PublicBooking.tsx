import React, { useState, useEffect, useMemo } from 'react';
import { Calendar as CalendarIcon, Clock, Scissors, User, ChevronRight, CheckCircle2, MapPin, ArrowLeft, Check, ChevronLeft, ChevronDown, X, CreditCard, QrCode, Copy, ShieldCheck, Loader2, Crown, Star, Zap, AlertCircle, Phone, ExternalLink, Search } from 'lucide-react';
import { format, addMonths, addDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Service, Barber, MembershipPlan } from '../types';
import { useSupabaseQuery } from '../lib/hooks';
import { fetchServices, fetchProfessionals, getCurrentBusinessId, getBusinessBySlug } from '../lib/database';
import { fetchAvailableSlots, createAppointment, fetchAppointments } from '../lib/api/publicApi';
import { createPublicAppointment, getAvailableSlots, getAvailableSlotsForAllProfessionals } from '../lib/availability';
import { getProfessionalsAvailableNow, ProfessionalAvailableNow } from '../lib/availabilityNow';
import { supabase } from '../lib/supabase';
import { createPaymentSession } from '../lib/paymentGateway';

interface PublicBookingProps {
  onBack: () => void;
  businessSlug?: string; // NEW: Optional slug for multi-tenant public URLs
}

const PublicBooking: React.FC<PublicBookingProps> = ({ onBack, businessSlug }) => {
  // Fetch data from database
  const { data: servicesData, loading: servicesLoading } = useSupabaseQuery(fetchServices);
  const { data: barbersData, loading: barbersLoading } = useSupabaseQuery(fetchProfessionals);

  const services = servicesData || [];
  // Filter only active professionals
  const barbers = (barbersData || []).filter(b => b.is_active !== false);
  const membershipPlans: MembershipPlan[] = [];

  const [step, setStep] = useState(1);
  const [activeTab, setActiveTab] = useState<'services' | 'plans'>('services');
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);

  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);

  // Date & Time State
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);

  // Client Details State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientCpf, setClientCpf] = useState(''); // Required for Abacate Pay

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('credit_card');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [cameFromFastTrack, setCameFromFastTrack] = useState(false);

  // Brazilian phone mask formatter: (11) 9 9999-9999
  const formatBrazilianPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  // Brazilian CPF mask formatter: 000.000.000-00
  const formatCpf = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length === 0) return '';
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Form errors state
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; phone?: string; cpf?: string }>({});

  // Email touched state (show error only after leaving field)
  const [emailTouched, setEmailTouched] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  // Show toast function
  const showToast = (text: string, type: 'error' | 'success' = 'error') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Calendar Modal State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [showBusinessHours, setShowBusinessHours] = useState(false);

  // Real slots state
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [businessId, setBusinessId] = useState<string>('');

  // Business data state
  interface BusinessHoursDay {
    open: string;
    close: string;
    closed: boolean;
  }
  interface BusinessHours {
    monday: BusinessHoursDay;
    tuesday: BusinessHoursDay;
    wednesday: BusinessHoursDay;
    thursday: BusinessHoursDay;
    friday: BusinessHoursDay;
    saturday: BusinessHoursDay;
    sunday: BusinessHoursDay;
    [key: string]: BusinessHoursDay;
  }
  const [businessData, setBusinessData] = useState<{
    name: string;
    logo_url: string | null;
    address: string | null;
    complement: string | null;
    phone: string | null;
    business_hours: BusinessHours | null;
    zip_code: string | null;
    city: string | null;
    state: string | null;
    buffer_minutes: number;
  }>({ name: '', logo_url: null, address: null, complement: null, phone: null, business_hours: null, zip_code: null, city: null, state: null, buffer_minutes: 60 });

  // NEW: Available Now state
  const [availableNowProfessionals, setAvailableNowProfessionals] = useState<ProfessionalAvailableNow[]>([]);
  const [isLoadingAvailableNow, setIsLoadingAvailableNow] = useState(false);
  const [nextAvailableSlot, setNextAvailableSlot] = useState<string>('');

  // NOTE: professionalsForTimeDisplay is computed via useMemo using availability data

  // Professional availability from database (same as Agenda.tsx)
  interface ProfessionalAvailability {
    professional_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    break_start: string | null;
    break_end: string | null;
    is_active: boolean;
  }
  const [profAvailability, setProfAvailability] = useState<ProfessionalAvailability[]>([]);

  // Appointments for the selected day (fetched when date changes)
  interface DayAppointment {
    professional_id: string;
    start_datetime: string;
    duration_minutes: number;
  }
  const [dayAppointments, setDayAppointments] = useState<DayAppointment[]>([]);

  // Time blocks (manual blocks) - same as Agenda.tsx
  interface TimeBlock {
    id: string;
    professional_id: string | null;
    start_datetime: string;
    end_datetime: string;
  }
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);

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
        return;
      }

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

  // Load appointments for the selected day (SAME as Agenda.tsx using fetchAppointments)
  useEffect(() => {
    const loadDayAppointments = async () => {
      if (!businessId || !selectedDateObj) {
        setDayAppointments([]);
        return;
      }

      // Use EXACT SAME format as Agenda.tsx loadAppointments
      // IMPORTANT: Query in UTC but expand range to capture Brazil timezone (UTC-3)
      // A 23:00 Brazil appointment is stored as 02:00 UTC next day
      const dateStr = format(selectedDateObj, 'yyyy-MM-dd');
      // Expand range: start 3h earlier (00:00 Brazil = 03:00 UTC)
      // and end 3h later (23:59 Brazil = 02:59 UTC next day)
      const from = dateStr + 'T03:00:00Z'; // 00:00 Brazil in UTC
      const to = dateStr + 'T26:59:59Z';  // overflow handled by Supabase

      // Alternative: use local timezone approach
      const fromLocal = dateStr + 'T00:00:00';
      const toLocal = dateStr + 'T23:59:59';

      // Use the SAME fetchAppointments function as Agenda.tsx
      const { appointments: data } = await fetchAppointments({ businessId, from: fromLocal, to: toLocal });

      // Map to the format we need - convert UTC to local Brazil time
      const appointments = data
        .filter(apt => apt.status !== 'cancelled' && apt.status !== 'no_show' && apt.status !== 'canceled')
        .map(apt => {
          // Convert UTC datetime to Brazil local time
          const utcDate = new Date(apt.start_datetime);
          const brazilHour = utcDate.getHours(); // JS automatically converts to local timezone
          const brazilMin = utcDate.getMinutes();
          const localTimeStr = `${brazilHour.toString().padStart(2, '0')}:${brazilMin.toString().padStart(2, '0')}`;

          return {
            professional_id: apt.professional_id,
            start_datetime: apt.start_datetime,
            local_time: localTimeStr, // Store converted local time
            duration_minutes: apt.duration_minutes || apt.service?.duration_minutes || 60
          };
        });

      console.log('📅 [PublicBooking] dayAppointments loaded:', appointments.map(a => ({
        prof: a.professional_id?.slice(0, 8),
        utc: a.start_datetime?.substring(11, 16),
        local: a.local_time,
        dur: a.duration_minutes
      })));
      setDayAppointments(appointments);
    };

    loadDayAppointments();
  }, [businessId, selectedDateObj]);

  // Load professional availability from database (same as Agenda.tsx loadAvailability)
  useEffect(() => {
    const loadAvailability = async () => {
      if (!businessId || barbers.length === 0) return;

      // Get professional IDs from the barbers array (same approach as Calendar.tsx)
      const professionalIds = barbers.map(b => b.id);

      const { data, error } = await supabase
        .from('professional_availability')
        .select('*')
        .in('professional_id', professionalIds);
      if (!error && data) {
        console.log('📅 [PublicBooking] Loaded', data.length, 'availability records for', professionalIds.length, 'professionals');
        setProfAvailability(data);
      } else if (error) {
        console.error('❌ [PublicBooking] Error loading availability:', error);
      }
    };
    loadAvailability();
  }, [businessId, barbers.length]);

  // Load time blocks when date changes (same as Agenda.tsx loadTimeBlocks)
  useEffect(() => {
    const loadTimeBlocks = async () => {
      if (!businessId || !selectedDateObj) return;

      const startOfDayDate = new Date(selectedDateObj);
      startOfDayDate.setHours(0, 0, 0, 0);
      const endOfDayDate = new Date(selectedDateObj);
      endOfDayDate.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('time_blocks')
        .select('*')
        .eq('business_id', businessId)
        .gte('start_datetime', startOfDayDate.toISOString())
        .lte('start_datetime', endOfDayDate.toISOString());
      if (!error && data) {
        console.log('🔒 [PublicBooking] Loaded', data.length, 'time blocks');
        setTimeBlocks(data);
      }
    };
    loadTimeBlocks();
  }, [businessId, selectedDateObj]);
  // Professionals with NO associations are shown for ALL services (default behavior)
  // Also filters by day-of-week availability (professional must work on selected day)
  const filteredBarbers = useMemo(() => {
    let candidates = [...barbers];
    const dayOfWeek = selectedDateObj?.getDay(); // 0=Sunday, 6=Saturday

    // STEP 1: Filter by service mapping (existing logic)
    if (selectedServices.length > 0 && Object.keys(professionalServiceMap).length > 0) {
      const selectedServiceIds = selectedServices.map(s => s.id);

      candidates = candidates.filter(barber => {
        const barberServices = professionalServiceMap[barber.id] || [];

        // If professional has NO service associations, show them for all services (unrestricted)
        if (barberServices.length === 0) {
          return true;
        }

        // Otherwise, barber must offer at least one of the selected services
        return selectedServiceIds.some(serviceId => barberServices.includes(serviceId));
      });
    }

    // STEP 2: Filter by day-of-week availability (NEW - fixes professionals showing when off)
    if (selectedDateObj && dayOfWeek !== undefined && profAvailability.length > 0) {
      candidates = candidates.filter(barber => {
        // Find availability config for this professional on this day
        const dayConfig = profAvailability.find(
          pa => pa.professional_id === barber.id &&
            pa.day_of_week === dayOfWeek &&
            pa.is_active === true
        );

        return !!dayConfig; // Professional must have is_active=true config for this day
      });
    }

    // FALLBACK: Only if NO profAvailability data exists (table not populated)
    if (candidates.length === 0 && barbers.length > 0 && profAvailability.length === 0) {
      return barbers;
    }

    return candidates;
  }, [barbers, selectedServices, professionalServiceMap, selectedDateObj, profAvailability]);

  // Generate dynamic dates (next 4 days - the 5th slot is calendar picker)
  // When today is closed, start from tomorrow
  const dates = useMemo(() => {
    const result = [];
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const dayNamesEn = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayNamesPt = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // Check if today is closed
    const todayHours = businessData.business_hours?.[dayNamesEn[todayDayOfWeek] as keyof typeof businessData.business_hours];
    const isClosedToday = !todayHours || todayHours.closed;

    // If closed today, start from tomorrow (offset = 1)
    const startOffset = isClosedToday ? 1 : 0;

    for (let i = startOffset; i < startOffset + 4; i++) {
      const date = addDays(today, i);
      // Label logic: first available day shows appropriate label
      let dayLabel: string;
      if (i === 0) {
        dayLabel = 'HOJE';
      } else if (i === 1) {
        dayLabel = 'AMANHÃ';
      } else {
        dayLabel = dayNamesPt[date.getDay()].toUpperCase();
      }

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
  }, [businessData.business_hours]);

  // Load business ID (by slug if provided, otherwise by current user)
  const [businessError, setBusinessError] = useState<string | null>(null);
  useEffect(() => {
    const loadBusinessId = async () => {
      // NEW: If businessSlug is provided, fetch by slug (multi-tenant public URL)
      if (businessSlug) {
        const business = await getBusinessBySlug(businessSlug);
        if (business) {
          setBusinessId(business.id);
          setBusinessError(null);
          // Load business data for header
          const businessAny = business as any;
          setBusinessData({
            name: businessAny.business_name || businessAny.name || 'Estabelecimento',
            logo_url: businessAny.logo_url || null,
            address: business.address || null,
            complement: businessAny.complement || null,
            phone: businessAny.phone || null,
            business_hours: businessAny.business_hours || null,
            zip_code: businessAny.zip_code || null,
            city: businessAny.city || null,
            state: businessAny.state || null,
            buffer_minutes: businessAny.booking_settings?.buffer_minutes || 60
          });
        } else {
          setBusinessError('Estabelecimento não encontrado');
        }
      } else {
        // Legacy: fetch by current user's business
        const id = await getCurrentBusinessId();
        if (id) {
          setBusinessId(id);
          // Also fetch business data
          const { data } = await supabase
            .from('businesses')
            .select('business_name, name, logo_url, address, complement, phone, business_hours, zip_code, city, state, booking_settings')
            .eq('id', id)
            .single();
          if (data) {
            setBusinessData({
              name: data.business_name || data.name || 'Estabelecimento',
              logo_url: data.logo_url || null,
              address: data.address || null,
              complement: data.complement || null,
              phone: data.phone || null,
              business_hours: data.business_hours || null,
              zip_code: data.zip_code || null,
              city: data.city || null,
              state: data.state || null,
              buffer_minutes: (data as any).booking_settings?.buffer_minutes || 60
            });
          }
        }
      }
    };
    loadBusinessId();
  }, [businessSlug]);

  // Calculate next available slot (next round hour)
  const getNextAvailableSlot = (): string => {
    const now = new Date();
    const nextHour = now.getHours() + 1;
    return `${nextHour.toString().padStart(2, '0')}:00`;
  };

  // Load"Available Now" professionals when on step 2 and Today is selected
  useEffect(() => {
    const loadAvailableNow = async () => {
      if (!businessId || step !== 2) {
        console.log('⏳ [AvailableNow] Skipping - businessId:', businessId, 'step:', step);
        return;
      }

      const todayDate = dates[0];
      const isToday = selectedDateObj && format(selectedDateObj, 'yyyy-MM-dd') === todayDate.dateStr;

      console.log('📅 [AvailableNow] isToday:', isToday, 'selectedDateObj:', selectedDateObj ? format(selectedDateObj, 'yyyy-MM-dd') : null, 'todayDate.dateStr:', todayDate.dateStr);

      if (!isToday) {
        setAvailableNowProfessionals([]);
        return;
      }

      setIsLoadingAvailableNow(true);
      try {
        const serviceId = selectedServices.length > 0 ? selectedServices[0].id : undefined;
        const serviceDuration = selectedServices.reduce((acc, s) => acc + (s.duration_minutes || 60), 0);

        console.log('🔍 [AvailableNow] Calling getProfessionalsAvailableNow with:', {
          businessId,
          serviceId,
          serviceDuration
        });

        const professionals = await getProfessionalsAvailableNow(businessId, serviceId, serviceDuration);

        console.log('✅ [AvailableNow] Got professionals:', professionals.length, professionals.map(p => p.name));

        setAvailableNowProfessionals(professionals);
        setNextAvailableSlot(getNextAvailableSlot());
      } catch (error) {
        console.error('❌ [AvailableNow] Error loading available now:', error);
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

  // Load available slots when date is selected (Step 2) - BASED ON PROFESSIONAL WORK SCHEDULES + APPOINTMENTS
  useEffect(() => {
    const loadSlots = async () => {
      if (!businessId || !selectedDateObj || !selectedServices.length || step !== 2) return;
      if (profAvailability.length === 0) return; // Wait for availability to load

      setIsLoadingSlots(true);
      try {
        const dayOfWeek = selectedDateObj.getDay();
        const serviceDuration = selectedServices.reduce((acc, s) => acc + (s.duration_minutes || 60), 0);
        const selectedServiceIds = selectedServices.map(s => s.id);

        console.log('📅 [PublicBooking] loadSlots - dayOfWeek:', dayOfWeek, 'serviceDuration:', serviceDuration);
        console.log('📋 [PublicBooking] loadSlots - selectedServiceIds:', selectedServiceIds);

        // Get professionals who work on this day
        let workingProfs = profAvailability.filter(
          pa => pa.day_of_week === dayOfWeek && pa.is_active === true
        );

        console.log('👥 [PublicBooking] Working professionals on day', dayOfWeek + ':', workingProfs.length);

        // FILTER: Only include professionals who offer the selected services
        // If professionalServiceMap has data, only show professionals who explicitly offer the service
        if (Object.keys(professionalServiceMap).length > 0) {
          workingProfs = workingProfs.filter(wp => {
            const profServices = professionalServiceMap[wp.professional_id] || [];

            // Professional MUST have explicit service associations
            // If they have no associations, they don't appear (stricter approach)
            if (profServices.length === 0) {
              console.log(`🚫 [loadSlots] Prof ${wp.professional_id.slice(0, 8)}: no service associations, excluding`);
              return false;
            }

            // Check if they offer at least one of the selected services
            const offersService = selectedServiceIds.some(sid => profServices.includes(sid));
            if (!offersService) {
              console.log(`🚫 [loadSlots] Prof ${wp.professional_id.slice(0, 8)}: does NOT offer selected services`);
            } else {
              console.log(`✅ [loadSlots] Prof ${wp.professional_id.slice(0, 8)}: offers selected service`);
            }
            return offersService;
          });

          console.log('👥 [PublicBooking] After service filter:', workingProfs.length, 'professionals');
        }

        if (workingProfs.length === 0) {
          console.log('❌ [PublicBooking] No professionals working/offering this service on this day');
          setAvailableSlots([]);
          setIsLoadingSlots(false);
          return;
        }

        // Find the earliest start and latest end among all working professionals
        let earliestStart = 24;
        let latestEnd = 0;

        workingProfs.forEach(wp => {
          const [startHour] = wp.start_time.split(':').map(Number);
          let [endHour] = wp.end_time.split(':').map(Number);
          if (endHour === 0) endHour = 24;

          if (startHour < earliestStart) earliestStart = startHour;
          if (endHour > latestEnd) latestEnd = endHour;
        });

        console.log(`📊 [PublicBooking] Professional hours: ${earliestStart}:00 - ${latestEnd}:00`);

        const slots: string[] = [];
        const now = new Date();
        const isToday = format(selectedDateObj, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
        const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

        // Usar buffer_minutes do estabelecimento para definir intervalo de slots
        const slotInterval = businessData.buffer_minutes || 60;
        const startMinutesTotal = earliestStart * 60;
        const endMinutesTotal = latestEnd * 60;

        console.log(`📊 [PublicBooking] Generating slots with ${slotInterval}min interval from ${earliestStart}:00 to ${latestEnd}:00`);

        for (let slotMinutes = startMinutesTotal; slotMinutes < endMinutesTotal; slotMinutes += slotInterval) {
          // Skip past slots for today
          if (isToday && slotMinutes <= currentMinutesNow) continue;

          const slotHour = Math.floor(slotMinutes / 60);
          const slotMin = slotMinutes % 60;
          const slotEndMinutes = slotMinutes + serviceDuration;

          // Check if at least one professional is AVAILABLE at this hour
          // (works at this hour AND has no conflicting appointment, break, or time block)
          const hasAvailableProf = workingProfs.some(wp => {
            // Check if within work hours
            const [startH, startM = 0] = wp.start_time.split(':').map(Number);
            let [endH, endM = 0] = wp.end_time.split(':').map(Number);
            if (endH === 0) endH = 24;

            const startMinutes = startH * 60 + startM;
            const endMinutes = endH * 60 + endM;

            if (slotMinutes < startMinutes || slotEndMinutes > endMinutes) {
              return false; // Outside work hours
            }

            // Check for BREAK conflict
            if (wp.break_start && wp.break_end) {
              const [breakStartH, breakStartM = 0] = wp.break_start.split(':').map(Number);
              const [breakEndH, breakEndM = 0] = wp.break_end.split(':').map(Number);
              const breakStartMinutes = breakStartH * 60 + breakStartM;
              const breakEndMinutes = breakEndH * 60 + breakEndM;

              if (slotMinutes < breakEndMinutes && slotEndMinutes > breakStartMinutes) {
                return false; // Overlaps with break
              }
            }

            // Check for TIME BLOCK conflict (bloqueios)
            const dateStr = format(selectedDateObj, 'yyyy-MM-dd');
            const slotDateTime = new Date(`${dateStr}T${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}:00`);
            const slotEndDateTime = new Date(slotDateTime.getTime() + serviceDuration * 60 * 1000);

            const hasBlockConflict = timeBlocks.some(block => {
              // Check if block applies to this professional or is global (null)
              if (block.professional_id !== null && block.professional_id !== wp.professional_id) {
                return false;
              }
              const blockStart = new Date(block.start_datetime);
              const blockEnd = new Date(block.end_datetime);
              return slotDateTime < blockEnd && slotEndDateTime > blockStart;
            });

            if (hasBlockConflict) {
              return false; // This professional has a time block
            }

            // Check for APPOINTMENT conflicts using dayAppointments
            const hasConflict = dayAppointments.some(apt => {
              if (apt.professional_id !== wp.professional_id) return false;

              // Use local_time if available, otherwise extract from start_datetime
              const aptTimeStr = (apt as any).local_time || (() => {
                const d = new Date(apt.start_datetime);
                return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
              })();

              const [aptH, aptM] = aptTimeStr.split(':').map(Number);
              const aptStartMinutes = aptH * 60 + aptM;
              const aptDuration = apt.duration_minutes || 60;
              const aptEndMinutes = aptStartMinutes + aptDuration;

              // Check overlap
              return (slotMinutes < aptEndMinutes && slotEndMinutes > aptStartMinutes);
            });

            if (hasConflict) {
              return false; // This professional has an appointment conflict
            }

            return true; // This professional is available
          });

          if (hasAvailableProf) {
            slots.push(`${slotHour.toString().padStart(2, '0')}:${slotMin.toString().padStart(2, '0')}`);
          }
        }

        console.log('✅ [PublicBooking] Generated', slots.length, 'slots:', slots);
        setAvailableSlots(slots);
      } catch (err) {
        console.error('❌ [PublicBooking] Error loading slots:', err);
        setAvailableSlots([]);
      }
      setIsLoadingSlots(false);
    };

    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, selectedDateObj, selectedServices.length, step, profAvailability.length, dayAppointments.length, timeBlocks.length, Object.keys(professionalServiceMap).length, businessData.buffer_minutes]);

  // Filter professionals by appointment conflicts at selected time
  // SIMPLIFIED: Only checks if professional has conflicting appointment
  const professionalsForTimeDisplay = useMemo(() => {
    if (step !== 3 || !selectedTime || !selectedDateObj) return [];

    const dayOfWeek = selectedDateObj.getDay();
    const [selectedHour, selectedMinute = 0] = selectedTime.split(':').map(Number);
    const selectedMinutes = selectedHour * 60 + selectedMinute;
    const serviceDuration = selectedServices.reduce((acc, s) => acc + (s.duration_minutes || 60), 0);
    const selectedEndMinutes = selectedMinutes + serviceDuration;

    console.log(`🔍 [professionalsForTimeDisplay] step=${step}, selectedTime=${selectedTime}, dayOfWeek=${dayOfWeek}`);
    console.log(`🔍 [professionalsForTimeDisplay] filteredBarbers=${filteredBarbers.length}, profAvailability=${profAvailability.length}`);
    console.log(`🔍 [professionalsForTimeDisplay] selectedMinutes=${selectedMinutes}, serviceEnd=${selectedEndMinutes}`);

    // Filter to professionals who:
    // 1. Offer the selected service
    // 2. Work at this specific hour (within their shift)
    // 3. DON'T have conflicts with existing appointments
    const selectedServiceIds = selectedServices.map(s => s.id);

    return filteredBarbers.filter(barber => {
      // FIRST: Check if professional offers the selected service
      if (Object.keys(professionalServiceMap).length > 0) {
        const profServices = professionalServiceMap[barber.id] || [];
        if (profServices.length === 0) {
          console.log(`🚫 [professionalsForTimeDisplay] ${barber.name}: no service associations`);
          return false;
        }
        const offersService = selectedServiceIds.some(sid => profServices.includes(sid));
        if (!offersService) {
          console.log(`🚫 [professionalsForTimeDisplay] ${barber.name}: does NOT offer selected services`);
          return false;
        }
      }

      // SECOND: Check if professional works at this hour
      const dayConfig = profAvailability.find(
        pa => pa.professional_id === barber.id &&
          pa.day_of_week === dayOfWeek &&
          pa.is_active === true
      );

      if (!dayConfig) {
        console.log(`🚫 [PublicBooking] ${barber.name}: No work config for day ${dayOfWeek}`);
        return false;
      }

      // Check if selected time is within their work hours
      const [startH, startM = 0] = dayConfig.start_time.split(':').map(Number);
      let [endH, endM = 0] = dayConfig.end_time.split(':').map(Number);
      if (endH === 0) endH = 24;

      const workStartMinutes = startH * 60 + startM;
      const workEndMinutes = endH * 60 + endM;

      // Check if service can be completed within work hours
      if (selectedMinutes < workStartMinutes || selectedEndMinutes > workEndMinutes) {
        console.log(`🚫 [PublicBooking] ${barber.name}: Selected time ${selectedTime} (ends ${Math.floor(selectedEndMinutes / 60)}:${selectedEndMinutes % 60}) is outside work hours ${dayConfig.start_time}-${dayConfig.end_time}`);
        return false;
      }

      // Check if in break time
      if (dayConfig.break_start && dayConfig.break_end) {
        const [breakStartH, breakStartM = 0] = dayConfig.break_start.split(':').map(Number);
        const [breakEndH, breakEndM = 0] = dayConfig.break_end.split(':').map(Number);
        const breakStartMinutes = breakStartH * 60 + breakStartM;
        const breakEndMinutes = breakEndH * 60 + breakEndM;

        // Check if appointment overlaps with break
        if (selectedMinutes < breakEndMinutes && selectedEndMinutes > breakStartMinutes) {
          console.log(`🚫 [PublicBooking] ${barber.name}: Time ${selectedTime} overlaps with break ${dayConfig.break_start}-${dayConfig.break_end}`);
          return false;
        }
      }

      // SECOND: Check if this professional has a conflicting appointment
      const conflict = dayAppointments.find(apt => {
        if (apt.professional_id !== barber.id) return false;

        // Use pre-computed local_time (already converted from UTC to Brazil time)
        const timeStr = (apt as any).local_time || apt.start_datetime?.substring(11, 16) || '00:00';
        const [aptHour, aptMin] = timeStr.split(':').map(Number);
        const aptStartMinutes = aptHour * 60 + aptMin;
        const aptDuration = apt.duration_minutes || 60;
        const aptEndMinutes = aptStartMinutes + aptDuration;

        // Check overlap
        const overlaps = (selectedMinutes < aptEndMinutes && selectedEndMinutes > aptStartMinutes);
        if (overlaps) {
          console.log(`🚫 [PublicBooking] ${barber.name}: Appointment conflict at ${timeStr} (${aptStartMinutes}-${aptEndMinutes})`);
        }
        return overlaps;
      });

      if (conflict) return false;

      console.log(`✅ [PublicBooking] ${barber.name}: Available at ${selectedTime} (works ${dayConfig.start_time}-${dayConfig.end_time})`);
      return true;
    });
  }, [step, selectedTime, selectedDateObj, filteredBarbers, dayAppointments, selectedServices, profAvailability]);

  // NEW: Step order - Service(1) -> Date/Time(2) -> Professional(3) -> Details(4) -> Payment(5) -> Success(6)
  const handleNext = () => setStep(step + 1);
  const handleBack = () => {
    if (step === 3) {
      // Going back from Professional to Date/Time - keep date, clear time
      setSelectedTime('');
      setStep(2);
    } else if (step === 4) {
      // Going back from Details
      if (cameFromFastTrack) {
        // Fast track: go back to date/time selection (step 2)
        setSelectedBarber(null);
        setSelectedTime('');
        setCameFromFastTrack(false);
        setStep(2);
      } else {
        // Normal flow: go back to professional selection (step 3)
        setStep(3);
      }
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

  // NEW: Fast track - select professional from"Available Now" and skip to details
  const handleSelectNow = (professional: ProfessionalAvailableNow) => {
    const todayDate = dates[0];
    setSelectedDate(todayDate.date);
    setSelectedDateObj(todayDate.dateObj);
    // Usar o horário real de disponibilidade do profissional
    const freeFromHours = professional.freeFrom.getHours();
    const freeFromMinutes = professional.freeFrom.getMinutes();
    const actualAvailableSlot = `${freeFromHours.toString().padStart(2, '0')}:${freeFromMinutes.toString().padStart(2, '0')}`;
    console.log(`✅ [handleSelectNow] ${professional.name} freeFrom: ${professional.freeFrom.toLocaleTimeString('pt-BR')} -> slot: ${actualAvailableSlot}`);
    setSelectedTime(actualAvailableSlot);
    setSelectedBarber(barbers.find(b => b.id === professional.professionalId) || null);
    setCameFromFastTrack(true); // Mark that we skipped step 3
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

      const professionalId = selectedBarber?.id || professionalsForTimeDisplay[0]?.id || barbers[0]?.id;
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

  // NEW: Handle Stripe Payment - creates pending appointment and redirects to Stripe Checkout
  const handleStripePayment = async () => {
    // Clear previous errors
    setFormErrors({});

    // Validate fields
    const errors: { name?: string; email?: string; phone?: string } = {};
    if (!clientName.trim()) errors.name = 'Nome é obrigatório';
    if (!clientEmail.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!isValidEmail(clientEmail)) {
      errors.email = 'Email inválido';
    }
    if (!clientPhone || clientPhone.replace(/\D/g, '').length < 11) {
      errors.phone = 'WhatsApp completo é obrigatório';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Por favor, corrija os campos em vermelho', 'error');
      return;
    }

    if (!businessId || !selectedDateObj || !selectedServices.length) {
      showToast('Dados incompletos. Tente novamente.', 'error');
      return;
    }

    setIsProcessingPayment(true);

    try {
      const professionalId = selectedBarber?.id || professionalsForTimeDisplay[0]?.id || barbers[0]?.id;
      if (!professionalId) {
        showToast('Nenhum profissional disponível.', 'error');
        setIsProcessingPayment(false);
        return;
      }

      const dateStr = format(selectedDateObj, 'yyyy-MM-dd');

      // 1. Create pending appointment
      const result = await createPublicAppointment(businessId, {
        professional_id: professionalId,
        service_id: selectedServices[0].id,
        client_name: clientName,
        client_phone: clientPhone.replace(/\D/g, ''), // Store only digits
        client_email: clientEmail,
        date: dateStr,
        time: selectedTime
      });

      if (!result.success || !result.appointmentId) {
        showToast(result.error || 'Erro ao criar agendamento', 'error');
        setIsProcessingPayment(false);
        return;
      }

      console.log('[PublicBooking] Pending appointment created:', result.appointmentId);

      // 2. Create Stripe Checkout Session
      const baseUrl = window.location.origin;
      // NEW: Use slug-based URLs when available
      const bookingPath = businessSlug ? `/${businessSlug}/agendamento` : '/agendamento';
      // 2. Create Payment Session (Stripe or Abacate Pay based on business config)
      const paymentResult = await createPaymentSession({
        appointmentId: result.appointmentId,
        serviceIds: selectedServices.map(s => s.id), // All selected services
        businessId,
        clientName,
        clientEmail,
        clientPhone: clientPhone.replace(/\D/g, ''),
        clientCpf: clientCpf.replace(/\D/g, ''), // Remove formatting, only digits
        successUrl: `${baseUrl}${bookingPath}/sucesso`,
        cancelUrl: `${baseUrl}${bookingPath}`,
      });

      if (!paymentResult.url) {
        console.error(`Payment checkout failed (${paymentResult.provider}):`, paymentResult.error);

        // Delete the pending appointment since payment creation failed
        console.log('[PublicBooking] Deleting failed appointment:', result.appointmentId);
        await supabase
          .from('appointments')
          .delete()
          .eq('id', result.appointmentId);

        showToast(paymentResult.error || 'Erro ao iniciar pagamento. Tente novamente.', 'error');
        setIsProcessingPayment(false);
        return;
      }

      console.log(`[PublicBooking] Redirecting to ${paymentResult.provider} Checkout...`);

      // 3. Redirect to Payment Checkout (Stripe or Abacate Pay)
      window.location.href = paymentResult.url;

    } catch (error) {
      console.error('Error in payment flow:', error);
      showToast('Erro ao processar pagamento. Tente novamente.', 'error');
      setIsProcessingPayment(false);
    }
  };

  // Calendar Logic
  const monthStart = startOfMonth(calendarViewDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  // Check if selected date is today
  const isSelectedDateToday = selectedDateObj && format(selectedDateObj, 'yyyy-MM-dd') === dates[0]?.dateStr;

  // Calculate if business is currently open
  const getBusinessOpenStatus = (): { isOpen: boolean; isTodayClosed: boolean; label: string; color: string } => {
    if (!businessData.business_hours) {
      return { isOpen: true, isTodayClosed: false, label: '', color: '' };
    }

    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = dayNames[now.getDay()];
    const todayHours = businessData.business_hours[todayKey];

    // Business is truly closed today (no hours configured or marked as closed)
    if (!todayHours || todayHours.closed) {
      return { isOpen: false, isTodayClosed: true, label: 'Hoje Fechado', color: 'text-red-500' };
    }

    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const isWithinHours = currentTime >= todayHours.open && currentTime < todayHours.close;

    if (isWithinHours) {
      return { isOpen: true, isTodayClosed: false, label: `Aberto até ${todayHours.close}`, color: 'text-[var(--status-success)]' };
    } else if (currentTime < todayHours.open) {
      // Not open yet, but will open today
      return { isOpen: false, isTodayClosed: false, label: `Abre às ${todayHours.open}`, color: 'text-yellow-500' };
    } else {
      // Already closed for today (after closing time)
      return { isOpen: false, isTodayClosed: true, label: 'Fechou por Hoje', color: 'text-red-500' };
    }
  };

  const businessStatus = getBusinessOpenStatus();

  // Generate Google Maps link with full address including complement, city, state and zip code
  const getGoogleMapsLink = (): string => {
    let addressStr = businessData.address || '';
    if (businessData.complement) addressStr += ', ' + businessData.complement;
    const parts = [addressStr];
    if (businessData.city) {
      let cityState = businessData.city;
      if (businessData.state) cityState += ' - ' + businessData.state;
      parts.push(cityState);
    }
    if (businessData.zip_code) parts.push(businessData.zip_code);
    const fullAddress = parts.filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;
  };

  return (
    <div className="min-h-screen bg-black text-[var(--text-primary)] flex flex-col items-center p-0 md:p-8 animate-fade-in relative z-50">

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-[200] max-w-sm w-full animate-slide-in-right
        flex items-start gap-3 rounded-xl border p-4 shadow-2xl shadow-black/50 backdrop-blur-md
        ${toastMessage.type === 'error'
            ? 'border-red-500/50 bg-red-500/10'
            : 'border-green-500/50 bg-green-500/10'
          }`}>
          <AlertCircle size={20} className={toastMessage.type === 'error' ? 'text-red-500' : 'text-[var(--status-success)]'} />
          <p className="text-sm font-medium text-[var(--text-primary)] flex-1">{toastMessage.text}</p>
          <button onClick={() => setToastMessage(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </div>
      )}

      <button onClick={onBack} className="absolute top-4 left-4 text-[var(--text-subtle)] hover:text-[var(--text-primary)] flex items-center gap-2 z-10 p-2">
        <ArrowLeft size={20} /> <span className="hidden sm:inline">Voltar ao Painel</span>
      </button>

      <div className="w-full max-w-lg mb-0 md:mb-24 pb-20 md:pb-0">

        {/* Branding Header */}
        <div className="text-center mb-6 pt-12 px-4">
          <div className="w-20 h-20 bg-[var(--surface-card)] rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-2xl shadow-black/50 border border-[var(--border-default)] overflow-hidden">
            {businessData.logo_url ? (
              <img
                src={businessData.logo_url}
                alt={businessData.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide broken image and show fallback icon
                  const img = e.target as HTMLImageElement;
                  img.style.display = 'none';
                  const parent = img.parentElement;
                  if (parent) {
                    const fallbackIcon = document.createElement('div');
                    fallbackIcon.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--brand-primary)]"><circle cx="6" cy="6" r="3"></circle><path d="M8.12 8.12 12 12"></path><path d="M20 4 8.12 15.88"></path><circle cx="6" cy="18" r="3"></circle><path d="M14.8 14.8 20 20"></path></svg>';
                    parent.appendChild(fallbackIcon);
                  }
                }}
              />
            ) : (
              <Scissors size={32} className="text-[var(--brand-primary)]" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {businessData.name || 'Estabelecimento'}
          </h1>

          {/* Business Info Row */}
          <div className="flex flex-col items-center gap-2 mt-3">
            {/* Open/Closed Status with Business Hours Accordion */}
            {businessStatus.label && (
              <div className="flex flex-col items-center gap-1">
                {/* Status Badge */}
                <div className={`flex items-center gap-1.5 text-sm font-medium ${businessStatus.color}`}>
                  <span className={`w-2 h-2 rounded-full ${businessStatus.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span>{businessStatus.label}</span>
                </div>

                {/* Business Hours Accordion */}
                {businessData.business_hours && (
                  <div className="w-full max-w-xs">
                    <button
                      onClick={() => setShowBusinessHours(!showBusinessHours)}
                      className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-gray-300 transition-colors mx-auto mt-1"
                    >
                      <Clock size={12} />
                      <span>Horários de Funcionamento</span>
                      <ChevronDown size={14} className={`transition-transform ${showBusinessHours ? 'rotate-180' : ''}`} />
                    </button>

                    {showBusinessHours && (
                      <div className="mt-3 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                        {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day, idx) => {
                          const dayNamesFull = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                          const hours = businessData.business_hours?.[day as keyof typeof businessData.business_hours];
                          const isTodayDay = new Date().getDay() === idx;
                          const isClosed = hours?.closed || !hours;

                          // Format hours like"09h às 18h"
                          const formatTime = (time: string) => time?.replace(':', 'h') || '--';
                          const hoursDisplay = isClosed
                            ? null
                            : `${formatTime(hours?.open || '')} às ${formatTime(hours?.close || '')}`;

                          return (
                            <div
                              key={day}
                              className={`flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 last:border-b-0 ${isTodayDay ? 'bg-zinc-800/50' : ''}`}
                            >
                              {/* Day Name */}
                              <div className="flex items-center gap-2 min-w-[160px]">
                                {/* Always show dot - green for open, red for closed */}
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isClosed ? 'bg-red-500' : isTodayDay ? 'bg-green-500 animate-pulse' : 'bg-green-500/60'}`} />
                                <span className={`text-sm ${isTodayDay ? 'font-semibold text-[var(--text-primary)]' : isClosed ? 'text-[var(--text-subtle)]' : 'text-gray-300'}`}>
                                  {isTodayDay ? `Hoje • ${dayNamesFull[idx]}` : dayNamesFull[idx]}
                                </span>
                              </div>

                              {/* Hours or Closed */}
                              {isClosed ? (
                                <span className="text-sm font-medium text-red-500">Fechado</span>
                              ) : (
                                <span className={`text-sm ${isTodayDay ? 'text-[var(--status-success)] font-medium' : 'text-[var(--status-success)]/80'}`}>
                                  {hoursDisplay}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Phone Number - Second */}
            {businessData.phone && (
              <a
                href={`tel:${businessData.phone}`}
                className="flex items-center gap-1.5 text-[var(--text-muted)] text-sm hover:text-[var(--brand-primary)] transition-colors"
              >
                <Phone size={14} />
                <span>{businessData.phone}</span>
              </a>
            )}

            {/* Address with Map Link */}
            {businessData.address && (
              <div className="flex flex-col items-center gap-0.5 text-[var(--text-muted)] text-sm">
                {/* Line 1: Street and complement */}
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} className="flex-shrink-0 text-[var(--text-subtle)]" />
                  <span>
                    {businessData.address}
                    {businessData.complement && `, ${businessData.complement}`}
                  </span>
                </div>
                {/* Line 2: City - State + Map link */}
                <div className="flex items-center gap-2">
                  <span>
                    {businessData.city || ''}
                    {businessData.state && ` - ${businessData.state}`}
                  </span>
                  <a
                    href={getGoogleMapsLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[var(--brand-primary)] hover:text-yellow-400 transition-colors"
                  >
                    <ExternalLink size={12} />
                    <span className="text-xs">ver no mapa</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-1 mb-6 px-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-[var(--brand-primary)]' : 'bg-gray-800'}`}></div>
          ))}
        </div>

        {/* Steps Content */}
        <div className="bg-zinc-900 md:border md:border-zinc-800 rounded-none md:rounded-2xl overflow-hidden shadow-2xl min-h-[400px]">

          {/* Step 1: Select Service or Plan */}
          {step === 1 && (
            <div className="p-6 pb-24 relative">
              {/* Closed Today Banner - Only shows when business doesn't operate today */}
              {businessStatus.isTodayClosed && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertCircle size={20} className="text-red-500" />
                  </div>
                  <div>
                    <div className="text-[var(--status-error)] font-bold">Hoje Estabelecimento Fechado</div>
                    <div className="text-[var(--status-error)]/70 text-sm">Agende para outro dia disponível</div>
                  </div>
                </div>
              )}
              <h2 className="text-xl font-bold mb-6">O que deseja hoje?</h2>

              {/* Tabs */}
              <div className="flex bg-zinc-950 p-1 rounded-xl mb-6 border border-zinc-800">
                <button
                  onClick={() => setActiveTab('services')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'services' ? 'bg-zinc-800 text-[var(--text-primary)] shadow' : 'text-[var(--text-subtle)] hover:text-gray-300'}`}
                >
                  Serviços
                </button>
                <button
                  disabled
                  className="flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all text-[var(--text-subtle)] cursor-not-allowed opacity-50"
                >
                  <Crown size={14} /> Clube <span className="text-xs text-yellow-500/60 ml-1">(em breve)</span>
                </button>
              </div>

              {activeTab === 'services' ? (
                <div className="space-y-3">
                  {/* Search Bar */}
                  <div className="relative flex items-center">
                    <Search size={18} className="absolute left-3 text-[var(--text-subtle)]" />
                    <input
                      type="text"
                      placeholder="Pesquisar serviço..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
                    />
                  </div>
                  {/* Scrollable Services List */}
                  <div className="max-h-[280px] overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
                    {services.filter(s => s.is_active && s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(service => {
                      const isSelected = selectedServices.some(s => s.id === service.id);
                      return (
                        <div
                          key={service.id}
                          onClick={() => toggleService(service)}
                          className={`p-4 border rounded-xl cursor-pointer transition-all flex justify-between items-center group relative overflow-hidden ${isSelected
                            ? 'bg-[var(--brand-primary)]/10 border-barber-gold shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                            : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'
                            }`}
                        >
                          <div className="flex gap-3 items-center">
                            {service.image_url && (
                              <img src={service.image_url} alt={service.name} className="w-12 h-12 rounded-lg object-cover hidden sm:block" />
                            )}
                            <div>
                              <div className={`font-bold transition-colors ${isSelected ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'}`}>{service.name}</div>
                              <div className="text-xs text-[var(--text-subtle)] mt-1">{service.duration_minutes || service.duration || 30} min • {service.category || 'Serviço'}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-[var(--text-primary)]">R$ {service.price.toFixed(2)}</div>
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-[var(--brand-primary)] border-barber-gold' : 'border-zinc-600'
                              }`}>
                              {isSelected && <Check size={14} className="text-black" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                        <h4 className="font-bold text-lg text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">{plan.name}</h4>
                        <span className="text-xs font-bold uppercase bg-zinc-800 px-2 py-1 rounded text-[var(--text-muted)]">{plan.billing_cycle}</span>
                      </div>
                      <p className="text-[var(--text-muted)] text-sm mb-4">{plan.description}</p>
                      <ul className="space-y-2 mb-4">
                        {plan.benefits?.map((benefit, idx) => (
                          <li key={idx} className="text-xs text-gray-300 flex items-center gap-2">
                            <Check size={12} className="text-[var(--status-success)]" /> {benefit}
                          </li>
                        ))}
                      </ul>
                      <div className="flex justify-between items-end border-t border-zinc-800 pt-4">
                        <span className="text-2xl font-bold text-[var(--text-primary)]">R$ {plan.price.toFixed(2)}</span>
                        <button className="bg-zinc-800 hover:bg-[var(--brand-primary)] hover:text-black text-[var(--text-primary)] px-4 py-2 rounded-lg text-xs font-bold transition-all">
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
                      <div className="text-xs text-[var(--text-muted)] uppercase font-bold">Resumo</div>
                      <div className="text-[var(--text-primary)] font-bold text-lg flex items-center gap-2">
                        R$ {totalPrice.toFixed(2)}
                        <span className="text-sm text-[var(--text-subtle)] font-normal">({totalDuration} min)</span>
                      </div>
                    </div>
                    <button
                      onClick={handleNext}
                      disabled={selectedServices.length === 0}
                      className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]hover text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
              <div className="flex items-center gap-2 mb-6 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={handleBack}>
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
                      ? 'bg-[var(--brand-primary)] border-barber-gold text-black'
                      : 'bg-zinc-950 border-zinc-800 text-[var(--text-muted)] hover:border-gray-600'
                      }`}
                  >
                    <span className="text-xs font-bold uppercase">{d.day}</span>
                    <span className="text-2xl font-bold">{d.dayNum}</span>
                  </button>
                ))}

                {/* Month Button */}
                <button
                  onClick={() => setIsCalendarOpen(true)}
                  className="min-w-[80px] p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all flex-shrink-0 bg-zinc-950 border-zinc-800 text-[var(--text-muted)] hover:border-gray-600"
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
                    <span className="text-sm font-bold uppercase text-[var(--text-primary)]">Disponível nesse momento</span>
                  </div>

                  {isLoadingAvailableNow ? (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex items-center justify-center">
                      <Loader2 className="animate-spin text-[var(--brand-primary)]" size={24} />
                    </div>
                  ) : availableNowProfessionals.length > 0 ? (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative overflow-hidden">
                      <Zap className="absolute right-4 top-4 text-[var(--brand-primary)]/20" size={40} />
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-3xl font-bold text-[var(--text-primary)]">{nextAvailableSlot}</span>
                        <span className="text-sm font-bold text-[var(--status-success)] uppercase">Imediato</span>
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
                                  <User size={20} className="text-[var(--text-muted)]" />
                                </div>
                              )}
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-zinc-950"></div>
                            </div>
                            <span className="text-xs text-gray-300 group-hover:text-[var(--brand-primary)] transition-colors">
                              {prof.name.split(' ')[0]}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center text-[var(--text-subtle)] text-sm">
                      Nenhum profissional disponível no momento
                    </div>
                  )}
                </div>
              )}

              {/* Time Grid */}
              <div>
                <h3 className="text-sm font-bold uppercase text-[var(--text-muted)] mb-3">
                  {isSelectedDateToday ? 'Outros Horários' : 'Horários Disponíveis'}
                </h3>

                {!selectedDateObj ? (
                  <div className="text-center py-10 text-[var(--text-subtle)] border-2 border-dashed border-zinc-800 rounded-xl">
                    Selecione uma data acima para ver os horários
                  </div>
                ) : isLoadingSlots ? (
                  <div className="text-center py-10 text-[var(--text-subtle)]">
                    <Loader2 className="animate-spin mx-auto mb-3" size={32} />
                    <p>Carregando horários disponíveis...</p>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-4 gap-3 animate-fade-in">
                    {availableSlots.map(time => (
                      <button
                        key={time}
                        onClick={() => handleTimeSelect(time)}
                        className="py-3 rounded-lg text-sm font-medium border transition-all bg-zinc-950 border-zinc-800 text-[var(--text-primary)] hover:border-gray-600 hover:bg-zinc-900"
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-[var(--text-subtle)] border-2 border-dashed border-zinc-800 rounded-xl">
                    Nenhum horário disponível para esta data
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Select Professional (NEW ORDER) */}
          {step === 3 && (
            <div className="p-6">
              <div className="flex items-center gap-2 mb-6 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={handleBack}>
                <ArrowLeft size={16} /> <span className="text-xs uppercase font-bold">Voltar</span>
              </div>
              <h2 className="text-xl font-bold mb-1">Com quem?</h2>
              <p className="text-sm text-[var(--text-muted)] mb-4">
                Profissionais disponíveis às <span className="font-bold text-[var(--text-primary)]">{selectedTime}</span>
              </p>

              {/* Selected Service Summary */}
              {selectedServices.length > 0 && (
                <div className="mb-6 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--brand-primary)]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Scissors size={18} className="text-[var(--brand-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[var(--text-primary)] truncate">
                        {selectedServices.map(s => s.name).join(' + ')}
                      </div>
                      <div className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                        <span>{totalDuration} min</span>
                        <span className="text-[var(--text-subtle)]">•</span>
                        <span className="text-[var(--brand-primary)] font-medium">R$ {totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* No loading needed - professionalsForTimeDisplay is computed synchronously */}
              <div className="grid grid-cols-1 gap-3">
                {/* First Available Option */}
                <div
                  onClick={() => handleSelectProfessional(null)}
                  className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-barber-gold cursor-pointer transition-all flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                    <Scissors size={20} className="text-[var(--brand-primary)]" />
                  </div>
                  <div className="font-bold">Primeiro Disponível</div>
                </div>

                {/* Available Professionals */}
                {professionalsForTimeDisplay.map(barber => (
                  <div
                    key={barber.id}
                    onClick={() => handleSelectProfessional(barber)}
                    className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-barber-gold cursor-pointer transition-all flex items-center gap-4"
                  >
                    {barber.avatar_url ? (
                      <img src={barber.avatar_url} className="w-12 h-12 rounded-full object-cover border border-zinc-700" />
                    ) : (
                      <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                        <User size={20} className="text-[var(--text-muted)]" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-[var(--text-primary)]">{barber.name}</div>
                      <div className="text-xs text-[var(--brand-primary)] flex items-center gap-1">
                        {barber.specialty || 'Profissional'}
                      </div>
                    </div>
                  </div>
                ))}

                {professionalsForTimeDisplay.length === 0 && (
                  <div className="text-center py-6 text-[var(--text-subtle)] border-2 border-dashed border-zinc-800 rounded-xl">
                    Nenhum profissional disponível para este serviço
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Details & Review */}
          {step === 4 && (
            <div className="p-6">
              <div className="flex items-center gap-2 mb-6 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={handleBack}>
                <ArrowLeft size={16} /> <span className="text-xs uppercase font-bold">Voltar</span>
              </div>
              <h2 className="text-xl font-bold mb-6">Seus Dados</h2>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-6 space-y-3">
                <div className="border-b border-zinc-800 pb-3 mb-3">
                  <span className="text-[var(--text-subtle)] text-sm block mb-2">Resumo do Pedido</span>
                  {selectedPlan ? (
                    <div className="flex justify-between items-center text-sm mb-1">
                      <span className="text-[var(--text-primary)] font-medium flex items-center gap-2">
                        <Crown size={14} className="text-[var(--brand-primary)]" /> {selectedPlan.name} (Assinatura)
                      </span>
                      <span className="text-[var(--text-muted)]">R$ {selectedPlan.price.toFixed(2)}</span>
                    </div>
                  ) : (
                    selectedServices.map(service => (
                      <div key={service.id} className="flex justify-between items-center text-sm mb-1">
                        <span className="text-[var(--text-primary)] font-medium">{service.name}</span>
                        <span className="text-[var(--text-muted)]">R$ {service.price.toFixed(2)}</span>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-between">
                  <span className="text-[var(--text-subtle)] text-sm">Profissional</span>
                  <span className="font-bold">{selectedBarber?.name || 'Primeiro Disponível'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-subtle)] text-sm">Data/Hora</span>
                  <span className="font-bold">{selectedDate} às {selectedTime}</span>
                </div>
                <div className="border-t border-zinc-800 pt-3 flex justify-between items-center">
                  <span className="text-[var(--text-primary)] font-bold">Total a Pagar</span>
                  <span className="text-[var(--brand-primary)] font-bold text-xl">R$ {totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3">
                {/* Name Input */}
                <div>
                  <input
                    type="text"
                    placeholder="Seu Nome Completo"
                    value={clientName}
                    onChange={(e) => { setClientName(e.target.value); setFormErrors(p => ({ ...p, name: undefined })); }}
                    className={`w-full bg-zinc-950 border rounded-lg p-3 text-[var(--text-primary)] outline-none transition-colors ${formErrors.name ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-[var(--brand-primary)]'}`}
                  />
                  {formErrors.name && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{formErrors.name}</p>}
                </div>
                {/* Email Input - Validation on blur */}
                <div>
                  <input
                    type="email"
                    placeholder="Seu Email"
                    value={clientEmail}
                    onChange={(e) => { setClientEmail(e.target.value); setFormErrors(p => ({ ...p, email: undefined })); }}
                    onBlur={() => setEmailTouched(true)}
                    onFocus={() => setEmailTouched(false)}
                    className={`w-full bg-zinc-950 border rounded-lg p-3 text-[var(--text-primary)] outline-none transition-colors ${emailTouched && clientEmail.length > 0 && !isValidEmail(clientEmail) ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-[var(--brand-primary)]'}`}
                  />
                  {emailTouched && clientEmail.length > 0 && !isValidEmail(clientEmail) && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />Email inválido (ex: nome@email.com)
                    </p>
                  )}
                  {formErrors.email && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{formErrors.email}</p>}
                </div>
                {/* Phone Input */}
                <div>
                  <input
                    type="tel"
                    placeholder="(11) 9 9999-9999"
                    value={clientPhone}
                    onChange={(e) => { setClientPhone(formatBrazilianPhone(e.target.value)); setFormErrors(p => ({ ...p, phone: undefined })); }}
                    className={`w-full bg-zinc-950 border rounded-lg p-3 text-[var(--text-primary)] outline-none transition-colors ${formErrors.phone ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-[var(--brand-primary)]'}`}
                  />
                  {formErrors.phone && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{formErrors.phone}</p>}
                </div>
                {/* CPF Input - Required for Abacate Pay */}
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="CPF: 000.000.000-00"
                    value={clientCpf}
                    onChange={(e) => { setClientCpf(formatCpf(e.target.value)); setFormErrors(p => ({ ...p, cpf: undefined })); }}
                    className={`w-full bg-zinc-950 border rounded-lg p-3 text-[var(--text-primary)] outline-none transition-colors ${formErrors.cpf ? 'border-red-500 focus:border-red-500' : 'border-zinc-800 focus:border-[var(--brand-primary)]'}`}
                  />
                  {formErrors.cpf && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{formErrors.cpf}</p>}
                </div>
              </div>
              <button
                onClick={handleStripePayment}
                disabled={!clientName || !clientPhone || !clientEmail || !clientCpf || clientCpf.replace(/\D/g, '').length !== 11 || isProcessingPayment}
                className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]hover text-black font-bold py-4 rounded-xl mt-6 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    Ir para Pagamento <ChevronRight size={18} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 5: Payment */}
          {step === 5 && (
            <div className="p-6">
              <div className="flex items-center gap-2 mb-6 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)]" onClick={handleBack}>
                <ArrowLeft size={16} /> <span className="text-xs uppercase font-bold">Voltar</span>
              </div>
              <h2 className="text-xl font-bold mb-6">Pagamento Seguro</h2>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-6 flex justify-between items-center">
                <span className="text-[var(--text-muted)]">Valor Total</span>
                <span className="text-2xl font-bold text-[var(--text-primary)]">R$ {totalPrice.toFixed(2)}</span>
              </div>

              {/* Payment Method Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'credit_card'
                    ? 'bg-white text-black border-white'
                    : 'bg-zinc-950 border-zinc-800 text-[var(--text-muted)] hover:border-gray-600'
                    }`}
                >
                  <CreditCard size={24} />
                  <span className="text-xs font-bold">Cartão de Crédito</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${paymentMethod === 'pix'
                    ? 'bg-green-500 text-black border-green-500'
                    : 'bg-zinc-950 border-zinc-800 text-[var(--text-muted)] hover:border-gray-600'
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
                    <Loader2 size={40} className="text-[var(--brand-primary)] animate-spin mb-4" />
                    <span className="text-[var(--text-primary)] font-bold">Processando Pagamento...</span>
                    <span className="text-xs text-[var(--text-muted)] mt-2">Não feche esta janela</span>
                  </div>
                )}

                {paymentMethod === 'credit_card' ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-[var(--text-subtle)] font-bold uppercase">Dados do Cartão (Stripe)</span>
                      <div className="flex gap-1 opacity-50">
                        <div className="w-8 h-5 bg-gray-700 rounded"></div>
                        <div className="w-8 h-5 bg-gray-700 rounded"></div>
                      </div>
                    </div>
                    <input
                      type="text"
                      placeholder="Número do Cartão"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] transition-colors font-mono"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="MM/AA"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] transition-colors font-mono"
                      />
                      <input
                        type="text"
                        placeholder="CVC"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] transition-colors font-mono"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Nome no Cartão"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] transition-colors"
                    />

                    <div className="flex items-center gap-2 text-[10px] text-[var(--text-subtle)] mt-2">
                      <ShieldCheck size={12} className="text-[var(--status-success)]" />
                      Pagamento criptografado e seguro
                    </div>

                    <button
                      onClick={handlePaymentProcess}
                      className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]hover text-black font-bold py-4 rounded-xl mt-4 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
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
                      <p className="text-xs text-[var(--text-muted)] mb-2">Escaneie o QR Code ou copie a chave abaixo:</p>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value="00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000"
                          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-[var(--text-muted)] outline-none truncate"
                        />
                        <button className="bg-zinc-800 hover:bg-zinc-700 text-[var(--text-primary)] p-2 rounded-lg border border-zinc-700">
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
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">
                {selectedPlan ? 'Assinatura Confirmada!' : 'Pagamento Confirmado!'}
              </h2>
              <p className="text-[var(--text-muted)] mb-8">
                {selectedPlan
                  ? 'Bem-vindo ao clube! Seu agendamento foi realizado e seus benefícios estão ativos.'
                  : 'Seu agendamento foi realizado com sucesso. Enviamos os detalhes para seu WhatsApp.'}
              </p>

              <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-xl w-full mb-6">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-zinc-800">
                  <span className="text-[var(--text-subtle)] text-sm">Agendamento</span>
                  <span className="text-[var(--brand-primary)] font-mono font-bold">#8823</span>
                </div>
                <div className="space-y-3 text-left">
                  <div className="flex gap-3 items-center">
                    <CalendarIcon size={16} className="text-[var(--text-subtle)]" />
                    <span className="text-[var(--text-primary)] font-bold">{selectedDate} às {selectedTime}</span>
                  </div>
                  <div className="flex gap-3 items-center">
                    <User size={16} className="text-[var(--text-subtle)]" />
                    <span className="text-[var(--text-primary)]">{selectedBarber?.name || 'Primeiro Disponível'}</span>
                  </div>
                  {businessData.address && (
                    <div className="flex gap-3 items-start">
                      <MapPin size={16} className="text-[var(--text-subtle)] flex-shrink-0 mt-0.5" />
                      <div className="flex flex-col gap-1">
                        <span className="text-[var(--text-primary)]">{businessData.address}{businessData.complement ? `, ${businessData.complement}` : ''}</span>
                        <a
                          href={getGoogleMapsLink()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[var(--brand-primary)] hover:underline text-sm"
                        >
                          <ExternalLink size={12} />
                          ver no mapa
                        </a>
                      </div>
                    </div>
                  )}
                  {businessData.phone && (
                    <div className="flex gap-3 items-center">
                      <Phone size={16} className="text-[var(--text-subtle)]" />
                      <a href={`tel:${businessData.phone}`} className="text-[var(--text-primary)] hover:text-[var(--brand-primary)] transition-colors">
                        {businessData.phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <button className="text-sm text-[var(--text-subtle)] hover:text-[var(--text-primary)] underline">
                Voltar ao início
              </button>
            </div>
          )}

        </div>

        <div className="text-center mt-8 text-[var(--text-subtle)] text-xs pb-8 md:pb-0">
          Powered by NS Studio
        </div>

      </div>

      {/* Calendar Modal */}
      {
        isCalendarOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="bg-zinc-900 w-full max-w-sm rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
              {/* Calendar Header */}
              <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-[var(--text-primary)] capitalize">
                  {format(calendarViewDate, "MMMM yyyy", { locale: ptBR })}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalendarViewDate(addMonths(calendarViewDate, -1))}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setCalendarViewDate(addMonths(calendarViewDate, 1))}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    <ChevronRight size={20} />
                  </button>
                  <button
                    onClick={() => setIsCalendarOpen(false)}
                    className="ml-2 p-2 hover:bg-zinc-800 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
                    <div key={i} className="text-center text-xs font-bold text-[var(--text-subtle)] py-2">
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
                            ? 'bg-[var(--brand-primary)] text-black shadow-lg shadow-amber-500/20'
                            : 'text-gray-300 hover:bg-zinc-800 hover:text-[var(--text-primary)]'}
               ${isDayToday && !isSelected ? 'border border-barber-gold/50 text-[var(--brand-primary)]' : ''}
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
        )
      }

    </div >
  );
};

export default PublicBooking;