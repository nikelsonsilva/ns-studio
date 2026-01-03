import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Clock, Check, Lock, Unlock, AlertCircle, Plus, Scissors, TrendingUp, Target, Eye, XCircle, CalendarX2, List, Grid3X3 } from 'lucide-react';
import { format, addDays, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ManualBookingModal from './ManualBookingModal';
import QuickBookingModal from './QuickBookingModal';
import AppointmentDetailsModal from './AppointmentDetailsModal';
import AvailableNowBar from './AvailableNowBar';
import { fetchAppointments } from '../lib/api/publicApi';
import { getCurrentBusinessId, getBusinessHoursForDay, type BusinessHours, type DayHours } from '../lib/database';
import { supabase } from '../lib/supabase';
import { getNowInBrazil, createUTCFromBrazil, fromUTC } from '../lib/timezone';
import { syncAllPendingPayments } from '../lib/stripePaymentSync';
import { autoCompletePastAppointments } from '../lib/autoCompleteService';
import type { Professional, Service } from '../types';

// UI Components (Design System)
import Card from './ui/Card';
import Button from './ui/Button';
import { useToast } from './ui/Toast';

interface Appointment {
  id: string;
  start_datetime: string;
  end_datetime: string;
  status: string;
  payment_status?: string;
  payment_method?: string;
  customer_name?: string;
  client_id?: string;
  client?: { id: string; name: string; phone?: string; email?: string };
  service_id?: string;
  service?: { id: string; name: string; duration_minutes: number; price: number };
  professional_id: string;
  professional?: { id: string; name: string };
  notes?: string;
}

interface TimeBlock {
  id: string;
  professional_id: string | null;
  start_datetime: string;
  end_datetime: string;
  reason?: string;
}

type ViewMode = 'day' | 'month';

const Agenda: React.FC = () => {
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState(() => getNowInBrazil());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string>('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<{ time: string; professionalId: string } | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [businessHoursForDay, setBusinessHoursForDay] = useState<DayHours | null>(null);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  // Quick Booking Modal state (for"Disponíveis Agora")
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [quickBookingProfessional, setQuickBookingProfessional] = useState<Professional | null>(null);
  const [quickBookingTime, setQuickBookingTime] = useState<string>('');
  const [quickBookingFreeUntil, setQuickBookingFreeUntil] = useState<Date | null>(null);

  // Details modal state
  const [services, setServices] = useState<Service[]>([]);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Payment polling notification
  const [hasNewPayments, setHasNewPayments] = useState(false);

  // Time blocks state
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);

  // Global buffer from business settings
  const [globalBufferMinutes, setGlobalBufferMinutes] = useState<number>(15);

  // Available Now feature state
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [highlightedProfessionalId, setHighlightedProfessionalId] = useState<string | null>(null);
  const [availableProfessionalIds, setAvailableProfessionalIds] = useState<string[]>([]);
  const [availabilityRefreshTrigger, setAvailabilityRefreshTrigger] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Professional availability (with breaks)
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

  // Drag confirmation modal state
  const [isDragConfirmOpen, setIsDragConfirmOpen] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{
    appointment: Appointment;
    targetProfessionalId: string;
    targetTime: string;
  } | null>(null);


  // Verifica se um horário já passou (só para o dia atual)
  const isTimeSlotPast = (time: string): boolean => {
    if (!isSameDay(currentDate, new Date())) return false;

    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);

    return slotTime < now;
  };

  useEffect(() => {
    loadBusinessId();
    loadProfessionals();
    loadServices();

    // ✅ REALTIME: Subscribe to changes in business settings (buffer and hours)
    const businessSubscription = supabase
      .channel('agenda_business_settings')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'businesses' },
        (payload) => {
          console.log('🔄 [Agenda] Business settings updated:', payload);
          const newSettings = payload.new as any;

          // Update buffer if changed
          const newBuffer = newSettings?.booking_settings?.buffer_minutes;
          if (newBuffer) {
            console.log(`🔄 [Agenda] Buffer changed → ${newBuffer}`);
            setGlobalBufferMinutes(newBuffer);
          }

          // Reload business hours when they change
          if (newSettings?.business_hours) {
            console.log('🔄 [Agenda] Business hours changed, reloading...');
            loadBusinessHoursForCurrentDay();
          }
        }
      )
      .subscribe();

    // ✅ REALTIME: Subscribe to professional availability changes
    const availabilitySubscription = supabase
      .channel('agenda_availability_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'professional_availability' },
        (payload) => {
          console.log('🔄 [Agenda] Professional availability changed:', payload);
          loadAvailability();
        }
      )
      .subscribe();

    // ✅ REALTIME: Subscribe to time block changes
    const timeBlocksSubscription = supabase
      .channel('agenda_time_blocks_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'time_blocks' },
        (payload) => {
          console.log('🔄 [Agenda] Time blocks changed:', payload);
          loadTimeBlocks();
        }
      )
      .subscribe();

    return () => {
      businessSubscription.unsubscribe();
      availabilitySubscription.unsubscribe();
      timeBlocksSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (businessId) {
      loadAppointments();
      loadAvailability();
    }
  }, [businessId, currentDate, viewMode]);


  // Carregar horários de funcionamento quando a data ou buffer mudar
  useEffect(() => {
    loadBusinessHoursForCurrentDay();
  }, [currentDate, globalBufferMinutes]);

  // Auto-scroll para o horário atual quando a agenda carrega
  useEffect(() => {
    // [LOG REMOVED]

    // Verificações básicas
    if (!isSameDay(currentDate, new Date())) {
      // [LOG REMOVED]
      return;
    }
    if (!scrollContainerRef.current) {
      // [LOG REMOVED]
      return;
    }
    if (timeSlots.length === 0) {
      // [LOG REMOVED]
      return;
    }
    if (!businessHoursForDay) {
      // [LOG REMOVED]
      return;
    }

    // [LOG REMOVED]

    const scrollTimer = setTimeout(() => {
      if (!scrollContainerRef.current) return;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      const [openHour] = businessHoursForDay.open.split(':').map(Number);
      let [closeHour] = businessHoursForDay.close.split(':').map(Number);
      if (closeHour === 0) closeHour = 24;

      // Fora do horário
      if (currentHour < openHour || currentHour >= closeHour) {
        // [LOG REMOVED]
        return;
      }

      // Calcular posição da linha vermelha
      const minutesSinceOpen = (currentHour - openHour) * 60 + currentMinutes;
      const slotHeight = 80;
      const redLinePosition = (minutesSinceOpen / 60) * slotHeight;

      // Dimensões
      const container = scrollContainerRef.current;
      const viewportHeight = container.clientHeight;
      const scrollTop = container.scrollTop;

      // [LOG REMOVED]
      // [LOG REMOVED]
      // [LOG REMOVED]

      // A linha está visível se está entre scrollTop e scrollTop+viewportHeight
      const lineIsVisible = redLinePosition >= scrollTop && redLinePosition <= scrollTop + viewportHeight - 80;

      // [LOG REMOVED]

      if (lineIsVisible) {
        // [LOG REMOVED]
        return;
      }

      // Só rola se não visível - coloca a linha 1 slot abaixo do topo
      const scrollTo = Math.max(0, redLinePosition - slotHeight);
      // [LOG REMOVED]

      container.scrollTo({ top: scrollTo, behavior: 'smooth' });
    }, 800);

    return () => clearTimeout(scrollTimer);
  }, [currentDate, timeSlots, businessHoursForDay]);

  // Auto-completar agendamentos passados a cada 5 minutos
  useEffect(() => {
    if (!businessId) return;

    const checkAndComplete = async () => {
      const count = await autoCompletePastAppointments(businessId);
      if (count > 0) {
        // [LOG REMOVED]
        loadAppointments(); // Recarregar agenda
      }
    };

    // Executar imediatamente
    checkAndComplete();

    // Executar a cada 5 minutos
    const interval = setInterval(checkAndComplete, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [businessId]);

  // Verificar pagamentos pendentes a cada 30 segundos
  useEffect(() => {
    if (!businessId) return;

    let lastPaymentCount = 0;

    const checkPayments = async () => {
      try {
        const { data: pendingPayments } = await supabase
          .from('appointments')
          .select('id, payment_status')
          .eq('business_id', businessId)
          .in('payment_status', ['awaiting_payment', 'pending'])
          .not('payment_link', 'is', null);

        const currentCount = pendingPayments?.length || 0;

        // Only set notification if there was a change (payment processed)
        if (lastPaymentCount > 0 && currentCount < lastPaymentCount) {
          // [LOG REMOVED]
          setHasNewPayments(true);
        } else if (currentCount > 0) {
          // [LOG REMOVED]
        }

        lastPaymentCount = currentCount;
      } catch (error) {
        console.error('❌ [Polling] Error:', error);
      }
    };

    // Check after 5 seconds initially (not immediately to avoid double load)
    const initialTimeout = setTimeout(checkPayments, 5000);

    // Then check every 30 seconds
    const interval = setInterval(checkPayments, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [businessId]);

  const loadBusinessId = async () => {
    // [LOG REMOVED]
    const { data, error } = await supabase
      .from('businesses')
      .select('id, booking_settings')
      .single();

    if (error) {
      console.error('❌ [Agenda] Error loading business:', error);
    } else if (data) {
      // [LOG REMOVED]
      setBusinessId(data.id);

      // Load global buffer from business settings
      const globalBuffer = data.booking_settings?.buffer_minutes || 15;
      setGlobalBufferMinutes(globalBuffer);
      // [LOG REMOVED]
    }
  };

  const loadProfessionals = async () => {
    // [LOG REMOVED]
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('❌ [Agenda] Error loading professionals:', error);
    } else if (data) {
      // [LOG REMOVED]
      setProfessionals(data);
    }
  };

  const loadAvailability = async () => {
    if (!businessId) return;

    const { data, error } = await supabase
      .from('professional_availability')
      .select('*')
      .eq('business_id', businessId);

    if (!error && data) {
      // [LOG REMOVED]
      setProfAvailability(data);
    }
  };

  const loadServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (!error && data) {
      setServices(data);
    }
  };

  // Check if a slot is during professional's break
  const isSlotInBreak = (professionalId: string, time: string): boolean => {
    const dayOfWeek = currentDate.getDay();
    const availability = profAvailability.find(
      a => a.professional_id === professionalId && a.day_of_week === dayOfWeek && a.is_active
    );

    if (!availability || !availability.break_start || !availability.break_end) {
      return false;
    }

    const [hour, minute] = time.split(':').map(Number);
    const timeMinutes = hour * 60 + minute;

    const [breakStartHour, breakStartMinute] = availability.break_start.split(':').map(Number);
    const breakStartMinutes = breakStartHour * 60 + breakStartMinute;

    const [breakEndHour, breakEndMinute] = availability.break_end.split(':').map(Number);
    const breakEndMinutes = breakEndHour * 60 + breakEndMinute;

    return timeMinutes >= breakStartMinutes && timeMinutes < breakEndMinutes;
  };

  // Check if a professional is working at a given time (based on their schedule)
  const isProfessionalWorkingAt = (professionalId: string, time: string): boolean => {
    const dayOfWeek = currentDate.getDay();
    const availability = profAvailability.find(
      a => a.professional_id === professionalId && a.day_of_week === dayOfWeek
    );

    // If no schedule defined, assume available during business hours
    if (!availability) {
      return true;
    }

    // If day is not active, professional is off
    if (!availability.is_active) {
      return false;
    }

    const [hour, minute] = time.split(':').map(Number);
    const timeMinutes = hour * 60 + minute;

    const [startHour, startMinute] = availability.start_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;

    const [endHour, endMinute] = availability.end_time.split(':').map(Number);
    // Handle midnight (00:00) as end of day (24:00 = 1440 minutes)
    let endMinutes = endHour * 60 + endMinute;
    if (endMinutes === 0 || endMinutes <= startMinutes) {
      endMinutes = 1440; // 24:00 = midnight = end of day
    }

    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  };

  // Get buffer minutes for a professional (custom or global)
  const getBufferMinutes = (prof: Professional): number => {
    if (prof.custom_buffer && prof.buffer_minutes) {
      // Use professional's custom buffer
      return prof.buffer_minutes;
    }
    // Use global buffer from business settings
    return globalBufferMinutes;
  };

  const handleOpenDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);
  };

  const loadBusinessHoursForCurrentDay = async () => {
    const dayOfWeek = currentDate.getDay();
    const hours = await getBusinessHoursForDay(dayOfWeek);

    setBusinessHoursForDay(hours);

    if (hours) {
      // Gerar slots de horário baseado no horário de funcionamento e buffer global
      const [openHour, openMin = 0] = hours.open.split(':').map(Number);
      let [closeHour, closeMin = 0] = hours.close.split(':').map(Number);

      // Tratar 00:00 como meia-noite (24:00) para que os slots sejam gerados corretamente
      if (closeHour === 0 && closeMin === 0) {
        closeHour = 24;
      }

      // Usar o buffer global como intervalo entre slots (mínimo 5min, padrão 30min para agenda)
      const slotInterval = Math.max(globalBufferMinutes || 30, 5);

      // Calcular os minutos de abertura/fechamento
      const rawStartMinutes = openHour * 60 + openMin;
      const endMinutes = closeHour * 60 + closeMin;

      // IMPORTANTE: Arredondar o início para o slot mais próximo (para baixo)
      // Isso garante que os slots sempre comecem em horários redondos (:00, :15, :30, :45 dependendo do intervalo)
      // Ex: se abre às 10:06 e intervalo é 30min, começa às 10:00
      const startMinutes = Math.floor(rawStartMinutes / slotInterval) * slotInterval;

      const slots: string[] = [];
      for (let minutes = startMinutes; minutes < endMinutes; minutes += slotInterval) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }

      setTimeSlots(slots);
      // [LOG REMOVED]
      // [LOG REMOVED]
    } else {
      setTimeSlots([]);
      // [LOG REMOVED]
    }
  };

  const loadAppointments = async () => {
    if (!businessId) {
      console.warn('⚠️ [Agenda] Cannot load appointments: no business ID');
      return;
    }

    // [LOG REMOVED]
    setIsLoading(true);

    let from, to;
    if (viewMode === 'day') {
      from = format(currentDate, 'yyyy-MM-dd') + 'T00:00:00Z';
      to = format(currentDate, 'yyyy-MM-dd') + 'T23:59:59Z';
    } else {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      from = format(monthStart, 'yyyy-MM-dd') + 'T00:00:00Z';
      to = format(monthEnd, 'yyyy-MM-dd') + 'T23:59:59Z';
    }

    // [LOG REMOVED]

    const { appointments: data } = await fetchAppointments({
      businessId,
      from,
      to
    });

    console.log(`✅ [Agenda] Loaded ${data.length} appointments:`, data.map(a => ({
      id: a.id,
      customer: a.customer_name || a.client?.name,
      time: format(parseISO(a.start_datetime), 'HH:mm'),
      status: a.status,
      payment_status: a.payment_status,
      professional: a.professional?.name
    })));

    setAppointments(data);
    setIsLoading(false);

    // Also load time blocks for the current period
    await loadTimeBlocks();
  };

  const loadTimeBlocks = async () => {
    if (!businessId) return;

    // Create date range in LOCAL time
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('business_id', businessId)
      .gte('start_datetime', startOfDay.toISOString())
      .lte('start_datetime', endOfDay.toISOString());

    if (!error && data) {
      console.log('📋 [TimeBlocks] Loaded blocks:', data.map(b => ({
        id: b.id,
        professional_id: b.professional_id || 'NULL (para todos)',
        start: b.start_datetime,
        end: b.end_datetime,
        reason: b.reason
      })));
      setTimeBlocks(data);
    } else if (error) {
      console.error('❌ [TimeBlocks] Error loading:', error);
    }
  };

  const handlePreviousDate = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, -1));
    } else {
      setCurrentDate(addMonths(currentDate, -1));
    }
  };

  const handleNextDate = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(monthIndex);
    setCurrentDate(newDate);
    setShowMonthPicker(false);
  };

  const handleSlotClick = (professional: Professional, time: string) => {
    setSelectedProfessional(professional);
    setSelectedTime(time);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    loadAppointments();
    // Trigger refresh of AvailableNowBar
    setAvailabilityRefreshTrigger(prev => prev + 1);
  };

  // Get ACTIVE appointment for a slot (excludes cancelled/no_show)
  const getAppointmentForSlot = (professionalId: string, time: string): Appointment | null => {
    return appointments.find(apt => {
      if (apt.professional_id !== professionalId) return false;
      // Skip cancelled and no_show appointments - slot is free
      if (apt.status === 'cancelled' || apt.status === 'no_show') return false;

      // Converter UTC para horário local do Brasil
      const aptStart = parseISO(apt.start_datetime);
      const aptEnd = parseISO(apt.end_datetime);

      // Horário do slot em formato local
      const [hours, minutes] = time.split(':').map(Number);
      const slotDate = new Date(currentDate);
      slotDate.setHours(hours, minutes, 0, 0);

      // Comparar em horário local
      return slotDate >= aptStart && slotDate < aptEnd;
    }) || null;
  };

  // Get cancelled appointment for display (to show it was cancelled)
  const getCancelledAppointmentForSlot = (professionalId: string, time: string): Appointment | null => {
    return appointments.find(apt => {
      if (apt.professional_id !== professionalId) return false;
      if (apt.status !== 'cancelled') return false;

      const aptStart = parseISO(apt.start_datetime);
      const aptEnd = parseISO(apt.end_datetime);

      const [hours, minutes] = time.split(':').map(Number);
      const slotDate = new Date(currentDate);
      slotDate.setHours(hours, minutes, 0, 0);

      return slotDate >= aptStart && slotDate < aptEnd;
    }) || null;
  };

  // Get block for a specific slot
  const getBlockForSlot = (professionalId: string, time: string): TimeBlock | null => {
    return timeBlocks.find(block => {
      // Check if block applies to this professional (or all if professional_id is null)
      if (block.professional_id && block.professional_id !== professionalId) return false;

      // Convert UTC dates from database to Brazil timezone for proper comparison
      const blockStart = fromUTC(block.start_datetime);
      const blockEnd = fromUTC(block.end_datetime);

      const [hours, minutes] = time.split(':').map(Number);
      const slotDate = new Date(currentDate);
      slotDate.setHours(hours, minutes, 0, 0);

      // Compare in local time
      return slotDate >= blockStart && slotDate < blockEnd;
    }) || null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'paid':
        // VERDE - Confirmado/Pago
        return 'bg-[var(--status-success-bg)] border-l-4 border-[var(--status-success)]';
      case 'pending':
        // AZUL - Pendente
        return 'bg-[var(--status-info-bg)] border-l-4 border-[var(--status-info)]';
      case 'awaiting_payment':
        // LARANJA - Aguardando Pagamento
        return 'bg-[var(--status-warning-bg)] border-l-4 border-[var(--status-warning)]';
      case 'cancelled':
        return 'bg-[var(--status-error-bg)] border-l-4 border-[var(--status-error)]';
      case 'completed':
        return 'bg-[var(--status-success-bg)] border-l-4 border-[var(--status-success)]';
      case 'blocked':
        return 'bg-[var(--surface-subtle)] border-l-4 border-[var(--border-strong)]';
      default:
        return 'bg-[var(--surface-subtle)] border-l-4 border-[var(--border-strong)]';
    }
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, appointment: Appointment) => {
    setDraggedAppointment(appointment);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedAppointment(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, professionalId: string, time: string) => {
    e.preventDefault();

    if (!draggedAppointment) return;

    // 1. Check if dropping on past time slot
    if (isTimeSlotPast(time)) {
      toast.error('Não é possível mover para um horário passado!');
      setDraggedAppointment(null);
      return;
    }

    // 2. Check if slot is blocked
    const block = getBlockForSlot(professionalId, time);
    if (block) {
      toast.error('Este horário está bloqueado!');
      setDraggedAppointment(null);
      return;
    }

    // 3. Check if professional works at this time
    if (!isProfessionalWorkingAt(professionalId, time)) {
      toast.error('Este profissional está de folga neste horário!');
      setDraggedAppointment(null);
      return;
    }

    // 3b. Check if slot is during break
    if (isSlotInBreak(professionalId, time)) {
      toast.error('Este profissional está em pausa neste horário!');
      setDraggedAppointment(null);
      return;
    }

    // 4. Check for existing appointments (excluding the one being moved)
    const existingAppointment = getAppointmentForSlot(professionalId, time);
    if (existingAppointment && existingAppointment.id !== draggedAppointment.id) {
      toast.error('Este horário já está ocupado por outro agendamento!');
      setDraggedAppointment(null);
      return;
    }

    // 5. Check for overlapping appointments (considering service duration)
    const duration = draggedAppointment.service?.duration_minutes || 60;
    const [startHour, startMin] = time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = startMinutes + duration;

    const hasConflict = appointments.some(apt => {
      if (apt.id === draggedAppointment.id) return false;
      if (apt.professional_id !== professionalId) return false;

      const aptStart = parseISO(apt.start_datetime);
      const aptEnd = parseISO(apt.end_datetime);

      if (!isSameDay(aptStart, currentDate)) return false;

      const aptStartMinutes = aptStart.getHours() * 60 + aptStart.getMinutes();
      const aptEndMinutes = aptEnd.getHours() * 60 + aptEnd.getMinutes();

      return (startMinutes < aptEndMinutes && endMinutes > aptStartMinutes);
    });

    if (hasConflict) {
      toast.error('O serviço de ' + duration + ' minutos conflita com outro agendamento!');
      setDraggedAppointment(null);
      return;
    }

    // Nota: O buffer define apenas o intervalo de slots, não impede agendamentos consecutivos
    // A validação de conflito já foi feita acima (hasConflict)

    // 7. All validations passed - open confirmation modal
    setPendingDrop({
      appointment: draggedAppointment,
      targetProfessionalId: professionalId,
      targetTime: time
    });
    setIsDragConfirmOpen(true);
    setDraggedAppointment(null);
  };

  // Confirm the drag & drop operation
  const confirmDrop = async () => {
    if (!pendingDrop) {
      // [LOG REMOVED]
      return;
    }

    const { appointment, targetProfessionalId, targetTime } = pendingDrop;
    const duration = appointment.service?.duration_minutes || 60;
    const oldProfessionalName = appointment.professional?.name || 'N/A';
    const oldTime = format(parseISO(appointment.start_datetime), 'HH:mm');
    const newProfessionalName = professionals.find(p => p.id === targetProfessionalId)?.name || 'N/A';

    console.log('📦 [DragDrop] Confirming move:', {
      appointmentId: appointment.id,
      client: appointment.customer_name || appointment.client?.name,
      from: `${oldProfessionalName} @ ${oldTime}`,
      to: `${newProfessionalName} @ ${targetTime}`,
      duration: `${duration}min`
    });

    // Create datetime in LOCAL time (not UTC)
    const [hours, minutes] = targetTime.split(':').map(Number);
    const newStartDateTime = new Date(currentDate);
    newStartDateTime.setHours(hours, minutes, 0, 0);

    const newEndDateTime = new Date(newStartDateTime.getTime() + duration * 60000);

    console.log('📅 [DragDrop] New datetime range (local):', {
      start: newStartDateTime.toISOString(),
      end: newEndDateTime.toISOString(),
      localStart: format(newStartDateTime, 'HH:mm'),
      localEnd: format(newEndDateTime, 'HH:mm')
    });

    const { error, data } = await supabase
      .from('appointments')
      .update({
        professional_id: targetProfessionalId,
        start_datetime: newStartDateTime.toISOString(),
        end_datetime: newEndDateTime.toISOString()
      })
      .eq('id', appointment.id)
      .select();

    if (error) {
      console.error('❌ [DragDrop] Error moving appointment:', error);
      toast.error('Erro ao mover agendamento: ' + error.message);
    } else {
      // [LOG REMOVED]
      loadAppointments();
    }

    setIsDragConfirmOpen(false);
    setPendingDrop(null);
  };

  // Cancel the drag & drop operation
  const cancelDrop = () => {
    setIsDragConfirmOpen(false);
    setPendingDrop(null);
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'completed' })
      .eq('id', appointmentId);

    if (!error) {
      loadAppointments();
    }
  };

  const handleBlockSlot = async (professionalId: string, time: string) => {
    // [LOG REMOVED]

    // Create datetime using Brazil timezone utility
    const [hours, minutes] = time.split(':').map(Number);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();
    const startDateTime = createUTCFromBrazil(year, month, day, hours, minutes);

    const endDateTime = new Date(startDateTime.getTime() + 60 * 60000);

    console.log('📅 [Block] Datetime range (local):', {
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      localStart: format(startDateTime, 'HH:mm'),
      localEnd: format(endDateTime, 'HH:mm')
    });

    const { error } = await supabase
      .from('time_blocks')
      .insert({
        business_id: businessId,
        professional_id: professionalId,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        reason: 'Bloqueio manual',
        block_type: 'personal'
      });

    if (error) {
      console.error('❌ [Block] Error blocking slot:', error);
    } else {
      // [LOG REMOVED]
      loadAppointments();
    }
  };

  const handleUnblockSlot = async (blockId: string) => {
    // [LOG REMOVED]

    const { error } = await supabase
      .from('time_blocks')
      .delete()
      .eq('id', blockId);

    if (error) {
      console.error('❌ [Unblock] Error unblocking slot:', error);
    } else {
      // [LOG REMOVED]
      loadAppointments();
    }
  };

  const getCurrentTimePosition = () => {
    if (!businessHoursForDay) return null;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const [openHour] = businessHoursForDay.open.split(':').map(Number);
    let [closeHour] = businessHoursForDay.close.split(':').map(Number);

    // Tratar 00:00 como meia-noite (24:00)
    if (closeHour === 0) {
      closeHour = 24;
    }

    if (hours < openHour || hours >= closeHour) return null;

    const totalMinutes = (hours - openHour) * 60 + minutes;
    const totalBusinessMinutes = (closeHour - openHour) * 60;
    const percentage = (totalMinutes / totalBusinessMinutes) * 100;

    return percentage;
  };

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_datetime);
      return isSameDay(aptDate, date);
    });
  };

  const getDayRevenue = (date: Date) => {
    const dayAppointments = getAppointmentsForDay(date);
    return dayAppointments.reduce((sum, apt) => sum + (apt.service?.price || 0), 0);
  };

  const getTodayStats = () => {
    // Use currentDate (the date being viewed) not today
    const dayAppointments = getAppointmentsForDay(currentDate);
    // Only count active appointments (exclude cancelled/no_show)
    const activeAppointments = dayAppointments.filter(apt =>
      apt.status !== 'cancelled' && apt.status !== 'no_show'
    );
    // Calculate revenue only from confirmed/paid appointments
    const confirmedAppointments = dayAppointments.filter(apt =>
      apt.status === 'confirmed' || apt.status === 'paid' || apt.status === 'completed'
    );
    const revenue = confirmedAppointments.reduce((sum, apt) => sum + (apt.service?.price || 0), 0);
    const completed = dayAppointments.filter(apt => apt.status === 'completed').length;

    return {
      total: activeAppointments.length,
      revenue,
      completed
    };
  };

  const renderDayView = () => {
    const currentTimePos = getCurrentTimePosition();

    // Show closed day message
    if (!businessHoursForDay || timeSlots.length === 0) {
      return (
        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-lg)] overflow-hidden">
          <div className="flex flex-col items-center justify-center py-20 px-8">
            <div className="w-24 h-24 bg-[var(--surface-subtle)] rounded-full flex items-center justify-center mb-6 border-2 border-[var(--border-default)]">
              <CalendarX2 className="text-[var(--brand-primary)]" size={48} />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Estabelecimento Fechado</h3>
            <p className="text-[var(--text-muted)] text-center max-w-md">
              Não há expediente para <span className="text-[var(--brand-primary)] font-bold">{format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}</span>.
            </p>
            <p className="text-[var(--text-subtle)] text-sm mt-4">
              Navegue para outro dia para visualizar a agenda.
            </p>
            <div className="flex gap-3 mt-8">
              <button
                onClick={handlePreviousDate}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-subtle)] hover:bg-[var(--hover-background-strong)] text-[var(--text-primary)] rounded-lg transition-colors"
              >
                <ChevronLeft size={16} />
                Dia Anterior
              </button>
              <button
                onClick={handleNextDate}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] font-bold rounded-lg transition-colors"
              >
                Próximo Dia
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-lg)] overflow-hidden">
        {/* Payment update notification */}
        {hasNewPayments && (
          <div className="bg-green-500/10 border-b border-green-500/30 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[var(--status-success)] text-sm font-medium">
                Novos pagamentos confirmados!
              </span>
            </div>
            <button
              onClick={() => {
                setHasNewPayments(false);
                loadAppointments();
              }}
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-[var(--text-primary)] text-xs font-bold rounded transition-colors"
            >
              Atualizar Agenda
            </button>
          </div>
        )}

        {/* Header dos profissionais */}
        <div className="grid border-b border-[var(--border-default)] bg-[var(--surface-subtle)] sticky top-0 z-10"
          style={{ gridTemplateColumns: `100px repeat(${professionals.length}, 1fr)` }}>
          <div className="p-4 border-r border-[var(--border-default)] flex items-center justify-center">
            <Clock className="text-[var(--text-subtle)]" size={18} />
          </div>
          {professionals.map((prof) => {
            const isAvailable = availableProfessionalIds.includes(prof.id);
            const isHighlighted = highlightedProfessionalId === prof.id;
            const shouldDim = showOnlyAvailable && !isAvailable && isSameDay(currentDate, new Date());

            // Determine if professional is currently busy
            const now = new Date();
            const currentTimeStr = format(now, 'HH:mm');
            const currentAppointment = getAppointmentForSlot(prof.id, currentTimeStr);
            const isCurrentlyBusy = !!currentAppointment;
            const isOnBreak = isSlotInBreak(prof.id, currentTimeStr);

            return (
              <div
                key={prof.id}
                className={`p-3 text-center border-r border-[var(--border-default)] last:border-r-0 transition-all duration-300 ${isHighlighted ? 'bg-[var(--brand-subtle)] ring-2 ring-[var(--brand-primary)] ring-inset' : ''
                  } ${shouldDim ? 'opacity-30' : ''}`}
              >
                {/* Mini-card style */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-1 ${isHighlighted ? 'bg-[var(--brand-muted)]' : 'bg-[var(--surface-subtle)]'}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isHighlighted ? 'bg-[var(--brand-primary)]' : 'bg-[var(--surface-subtle)]'}`}>
                    <Scissors className={isHighlighted ? 'text-[var(--text-on-brand)]' : 'text-[var(--brand-primary)]'} size={14} />
                  </div>
                  <span className="text-sm font-bold text-[var(--text-primary)]">{prof.name}</span>
                </div>

                {/* Status Badge - Only on today */}
                {isSameDay(currentDate, new Date()) && (
                  <div className="mt-1">
                    {isOnBreak ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[9px] text-orange-400 font-bold">
                        <span className="w-1 h-1 rounded-full bg-orange-400"></span>
                        Pausa
                      </span>
                    ) : isCurrentlyBusy ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[9px] text-[var(--status-error)] font-bold">
                        <span className="w-1 h-1 rounded-full bg-red-400"></span>
                        Ocupado
                      </span>
                    ) : isAvailable ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[9px] text-[var(--status-success)] font-bold">
                        <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse"></span>
                        Livre
                      </span>
                    ) : null}
                  </div>
                )}

                {/* Specialty - subtle */}
                {prof.specialty && (
                  <div className="text-[10px] text-[var(--text-subtle)] mt-0.5 truncate">{prof.specialty}</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Grid de horários */}
        <div
          ref={scrollContainerRef}
          className="relative max-h-[600px] overflow-y-auto scroll-smooth"
        >
          {timeSlots.map((time) => (
            <div key={time} className="grid border-b border-[var(--border-default)] last:border-b-0"
              style={{ gridTemplateColumns: `100px repeat(${professionals.length}, 1fr)` }}>
              {/* Coluna de horário - Contraste reduzido */}
              <div className={`p-4 border-r border-[var(--border-default)] bg-[var(--surface-subtle)] text-xs font-mono sticky left-0 ${isTimeSlotPast(time) ? 'text-[var(--text-faint)]' : 'text-[var(--text-subtle)]'
                }`}>
                {time}
              </div>

              {/* Slots para cada profissional */}
              {professionals.map((prof) => {
                const appointment = getAppointmentForSlot(prof.id, time);
                const cancelledAppointment = getCancelledAppointmentForSlot(prof.id, time);
                const block = getBlockForSlot(prof.id, time);
                const isHovered = hoveredSlot?.time === time && hoveredSlot?.professionalId === prof.id;
                const isBreak = isSlotInBreak(prof.id, time);
                const isWorking = isProfessionalWorkingAt(prof.id, time);

                // Availability highlight logic
                const isAvailable = availableProfessionalIds.includes(prof.id);
                const isHighlighted = highlightedProfessionalId === prof.id;
                const shouldDim = showOnlyAvailable && !isAvailable && isSameDay(currentDate, new Date());

                return (
                  <div
                    key={prof.id}
                    className={`p-2 border-r border-[var(--border-default)] last:border-r-0 min-h-[80px] relative transition-all duration-300 ${isBreak ? 'bg-[var(--status-warning-bg)]' :
                      !isWorking ? 'bg-[var(--surface-muted)]' : 'bg-[var(--surface-card)]'
                      } ${isHighlighted ? 'bg-[var(--brand-subtle)] ring-1 ring-[var(--brand-primary)]/30 ring-inset' : ''
                      } ${shouldDim ? 'opacity-30' : ''}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, prof.id, time)}
                    onMouseEnter={() => !appointment && !block && !isBreak && setHoveredSlot({ time, professionalId: prof.id })}
                    onMouseLeave={() => setHoveredSlot(null)}
                  >
                    {appointment ? (
                      <div
                        draggable={appointment.status !== 'completed'}
                        onDragStart={(e) => handleDragStart(e, appointment)}
                        onDragEnd={handleDragEnd}
                        onMouseEnter={() => setHoveredCard(appointment.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        className={`h-full rounded-lg p-3 cursor-move transition-all relative ${getStatusColor(appointment.status)}`}
                      >
                        {/* Card Content */}
                        <div className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {appointment.customer_name || appointment.client?.name || 'Cliente'}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-1">
                          <Clock size={12} className={appointment.status === 'confirmed' ? 'text-[var(--status-success)]' : 'text-yellow-500'} />
                          <span className="font-mono">{format(new Date(appointment.start_datetime), 'HH:mm')}</span>
                          <span>({appointment.service?.duration_minutes || 60}min)</span>
                        </div>
                        <div className={`text-xs mt-1 ${appointment.status === 'confirmed' ? 'text-[var(--status-success)]' : 'text-yellow-500'}`}>
                          {appointment.service?.name || 'Serviço'}
                        </div>

                        {/* Status indicator */}
                        {appointment.status === 'pending' && (
                          <AlertCircle className="absolute top-2 right-2 text-yellow-400 animate-pulse" size={14} />
                        )}

                        {/* Quick Actions Menu (on hover) */}
                        {hoveredCard === appointment.id && appointment.status !== 'completed' && (
                          <div className="absolute inset-0 bg-[var(--surface-app)]/95 rounded-lg flex items-center justify-center gap-2 animate-fade-in">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenDetails(appointment); }}
                              className="p-2 bg-[var(--surface-subtle)] hover:bg-[var(--hover-background-strong)] text-[var(--text-primary)] rounded-lg transition-colors"
                              title="Ver Detalhes"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCompleteAppointment(appointment.id); }}
                              className="p-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] rounded-lg transition-colors"
                              title="Concluir"
                            >
                              <Check size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : isBreak ? (
                      /* BREAK TIME - Subtle visual */
                      <div
                        className="w-full h-full rounded-lg border border-dashed border-orange-600/20 bg-orange-950/10 flex items-center justify-center cursor-not-allowed"
                      >
                        <div className="flex items-center gap-1.5 opacity-60">
                          <Clock className="text-orange-400" size={14} />
                          <span className="text-[10px] text-orange-400/80 font-medium">Pausa</span>
                        </div>
                      </div>
                    ) : !isWorking ? (
                      <div className="w-full h-full rounded-lg border border-dashed border-gray-800 bg-gray-900/10 cursor-not-allowed flex items-center justify-center">
                        <span className="text-[10px] text-gray-700 uppercase font-bold">Folga</span>
                      </div>
                    ) : cancelledAppointment ? (
                      /* Cancelled Appointment - Show faded but slot is clickable */
                      <div
                        onClick={() => !isTimeSlotPast(time) && handleSlotClick(prof, time)}
                        className={`w-full h-full rounded-lg border border-dashed transition-all relative ${isTimeSlotPast(time)
                          ? 'border-gray-800 bg-gray-900/20 cursor-not-allowed'
                          : 'border-red-900/50 hover:border-indigo-400 dark:hover:border-amber-500/30 hover:bg-[var(--surface-app)]/50 cursor-pointer'
                          }`}
                      >
                        {/* Cancelled appointment info */}
                        <div className="absolute inset-0 p-2 opacity-40">
                          <div className="text-xs text-red-500 font-bold line-through truncate">
                            {cancelledAppointment.customer_name || cancelledAppointment.client?.name || 'Cancelado'}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-[var(--text-subtle)] mt-0.5">
                            <XCircle size={10} />
                            <span>Cancelado</span>
                          </div>
                        </div>
                        {/* Overlay with plus icon to book */}
                        {!isTimeSlotPast(time) && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-[var(--surface-card)]/80 rounded-lg transition-opacity">
                            <Plus className="text-[var(--brand-primary)]" size={24} />
                          </div>
                        )}
                      </div>
                    ) : block ? (
                      /* Blocked Slot - Striped Pattern */
                      <div
                        className="w-full h-full rounded-lg relative overflow-hidden cursor-default group"
                        style={{
                          background: 'repeating-linear-gradient(45deg, #1a1a1a, #1a1a1a 10px, #252525 10px, #252525 20px)'
                        }}
                      >
                        {/* Block info */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                          <Lock className="text-[var(--text-subtle)] mb-1" size={18} />
                          <span className="text-[10px] text-[var(--text-subtle)] font-bold uppercase tracking-wider">Bloqueado</span>
                          {block.reason && (
                            <span className="text-[9px] text-gray-700 mt-0.5 truncate max-w-full">{block.reason}</span>
                          )}
                        </div>
                        {/* Unblock button (on hover) */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnblockSlot(block.id);
                          }}
                          className="absolute inset-0 flex items-center justify-center bg-[var(--surface-card)]/90 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg"
                        >
                          <div className="flex flex-col items-center">
                            <Unlock className="text-[var(--brand-primary)] mb-1" size={20} />
                            <span className="text-xs text-[var(--brand-primary)] font-bold">Desbloquear</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Empty slot - Clean, hover reveals action */
                      <div
                        onClick={() => !isTimeSlotPast(time) && handleSlotClick(prof, time)}
                        className={`w-full h-full rounded-lg border transition-all group relative flex items-center justify-center ${isTimeSlotPast(time)
                          ? 'border-transparent bg-[var(--surface-app)]/30 cursor-not-allowed'
                          : 'border-transparent hover:border-indigo-400 dark:hover:border-amber-500/30 hover:bg-[var(--surface-subtle)] cursor-pointer'
                          }`}
                        onMouseEnter={() => !isTimeSlotPast(time) && setHoveredSlot({ time, professionalId: prof.id })}
                        onMouseLeave={() => setHoveredSlot(null)}
                      >
                        {/* Only show + on hover */}
                        {!isTimeSlotPast(time) && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center">
                            <Plus className="text-[var(--brand-primary)] mb-0.5" size={18} />
                            <span className="text-[9px] text-[var(--text-subtle)] font-medium">Novo agendamento</span>
                          </div>
                        )}

                        {/* Quick Block (on hover) */}
                        {isHovered && !isTimeSlotPast(time) && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBlockSlot(prof.id, time);
                            }}
                            className="absolute top-1 right-1 p-1 bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] rounded transition-colors cursor-pointer"
                            title="Bloquear horário"
                          >
                            <Lock size={12} className="text-[var(--text-muted)]" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Current time indicator - Enhanced */}
          {currentTimePos !== null && isSameDay(currentDate, new Date()) && (
            <div
              data-current-time-indicator
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: `${currentTimePos}%` }}
            >
              {/* Time label */}
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 bg-red-500 text-[var(--text-primary)] text-[10px] font-bold px-2 py-0.5 rounded-r-lg shadow-lg flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[var(--surface-card)] rounded-full animate-pulse"></span>
                {format(new Date(), 'HH:mm')}
              </div>
              {/* Main line */}
              <div className="h-0.5 bg-red-500 shadow-lg shadow-red-500/30 ml-16"></div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { locale: ptBR });
    const calendarEnd = endOfWeek(monthEnd, { locale: ptBR });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-lg)] p-6">
        <div className="grid grid-cols-7 gap-4">
          {/* Header dos dias da semana */}
          {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map((day) => (
            <div key={day} className="text-center text-xs font-bold text-[var(--text-subtle)] uppercase tracking-wider pb-2">
              {day}
            </div>
          ))}

          {/* Células dos dias */}
          {days.map((day) => {
            const dayAppointments = getAppointmentsForDay(day);
            const revenue = getDayRevenue(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={day.toString()}
                onClick={() => {
                  setCurrentDate(day);
                  setViewMode('day');
                }}
                className={`bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-lg min-h-[100px] p-3 relative hover:border-[var(--brand-primary)] hover:border-2 cursor-pointer transition-all ${!isCurrentMonth ? 'opacity-40' : ''
                  }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`text-sm font-bold ${isToday
                    ? 'w-6 h-6 bg-[var(--brand-primary)] text-[var(--text-on-brand)] rounded-full flex items-center justify-center'
                    : 'text-[var(--text-primary)]'
                    }`}>
                    {format(day, 'd')}
                  </div>
                  {dayAppointments.length > 0 && (
                    <div className="flex gap-1">
                      {dayAppointments.slice(0, 3).map((apt, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 rounded-full ${apt.status === 'confirmed' ? 'bg-green-500' :
                            apt.status === 'pending' ? 'bg-yellow-500' :
                              apt.status === 'completed' ? 'bg-blue-500' :
                                'bg-red-500'
                            }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {dayAppointments.length > 0 && (
                  <div className="text-xs space-y-1">
                    <div className="text-[var(--text-muted)]">
                      {dayAppointments.length} agend.
                    </div>
                    {revenue > 0 && (
                      <div className="text-[var(--status-success-text)] font-bold">
                        R$ {revenue.toFixed(0)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const stats = getTodayStats();

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header com navegação e stats */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-[var(--shadow-lg)]">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
          {/* Left side - Date Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePreviousDate}
              className="p-3 bg-[var(--surface-subtle)] hover:bg-[var(--hover-background-strong)] rounded-lg transition-colors"
            >
              <ChevronLeft className="text-[var(--text-primary)]" size={20} />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="flex items-center gap-2 px-4 py-3 bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors border border-[var(--border-default)]"
              >
                <CalendarIcon className="text-[var(--brand-primary)]" size={18} />
                <div className="text-left">
                  <div className="text-[var(--text-primary)] font-bold capitalize text-sm">
                    {viewMode === 'day'
                      ? format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })
                      : format(currentDate, "MMMM yyyy", { locale: ptBR })
                    }
                  </div>
                </div>
              </button>

              {showMonthPicker && (
                <div className="absolute top-full mt-2 left-0 bg-[var(--surface-card)] rounded-lg shadow-xl border border-[var(--border-strong)] p-3 z-50 min-w-[240px]">
                  <div className="grid grid-cols-3 gap-2">
                    {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((month, index) => (
                      <button
                        key={month}
                        onClick={() => handleMonthSelect(index)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentDate.getMonth() === index
                          ? 'bg-[var(--brand-primary)] text-[var(--text-on-brand)]'
                          : 'text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
                          }`}
                      >
                        {month}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleNextDate}
              className="p-3 bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
            >
              <ChevronRight className="text-[var(--text-primary)]" size={20} />
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-[var(--surface-app)] rounded-lg p-1 border border-[var(--border-default)] ml-2">
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2 ${viewMode === 'day'
                  ? 'bg-[var(--surface-subtle)] text-[var(--text-primary)] shadow'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <List size={14} />
                Dia
              </button>
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2 ${viewMode === 'month'
                  ? 'bg-[var(--surface-subtle)] text-[var(--text-primary)] shadow'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <Grid3X3 size={14} />
                Mês
              </button>
            </div>
          </div>

          {/* Right side - Stats */}
          <div className="flex items-center gap-4 border-t lg:border-t-0 lg:border-l border-[var(--border-default)] pt-4 lg:pt-0 lg:pl-6">
            <div className="text-center">
              <div className="text-xs text-[var(--text-subtle)] uppercase font-bold">Agendamentos</div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[var(--text-subtle)] uppercase font-bold">Receita Hoje</div>
              <div className="text-2xl font-bold text-[var(--brand-primary)]">R$ {stats.revenue.toFixed(0)}</div>
            </div>
            <button
              onClick={() => {
                if (professionals.length > 0) {
                  setSelectedProfessional(professionals[0]);
                  setSelectedTime('09:00');
                  setIsModalOpen(true);
                }
              }}
              className="px-6 py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-[var(--text-on-brand)] font-bold rounded-lg transition-colors flex items-center gap-2 ml-4"
            >
              <Plus size={18} />
              Novo
            </button>
          </div>
        </div>
      </div>

      {/* Available Now Bar - Only on day view for today */}
      {viewMode === 'day' && businessId && isSameDay(currentDate, new Date()) && (
        <AvailableNowBar
          businessId={businessId}
          showOnlyAvailable={showOnlyAvailable}
          onToggleShowOnlyAvailable={setShowOnlyAvailable}
          onAvailableProfessionalsChange={setAvailableProfessionalIds}
          refreshTrigger={availabilityRefreshTrigger}
          onProfessionalClick={(profId, freeUntil) => {
            // [LOG REMOVED]

            // Find the professional
            const prof = professionals.find(p => p.id === profId);
            if (prof) {
              // Use exact current time - professional is available NOW
              const now = new Date();
              const exactTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

              // [LOG REMOVED]
              // [LOG REMOVED]

              // Close the manual modal if it's open to avoid conflict
              if (isModalOpen) {
                // [LOG REMOVED]
                setIsModalOpen(false);
              }
              // Also clear selectedProfessional to prevent ManualBookingModal from rendering
              setSelectedProfessional(null);

              // Open the QUICK booking modal with freeUntil for validation
              setQuickBookingProfessional(prof);
              setQuickBookingTime(exactTime);
              setQuickBookingFreeUntil(freeUntil);
              setIsQuickBookingOpen(true);

              // Also highlight the professional in the grid
              setHighlightedProfessionalId(profId);
              setTimeout(() => setHighlightedProfessionalId(null), 3000);
            }
          }}
        />
      )}

      {/* Content Area */}
      {viewMode === 'day' ? renderDayView() : renderMonthView()}

      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-barber-gold mx-auto"></div>
            <p className="text-[var(--text-primary)] mt-4">Carregando agendamentos...</p>
          </div>
        </div>
      )}

      {/* Quick Booking Modal (for"Disponíveis Agora" - no overlap check) - RENDER FIRST */}
      {quickBookingProfessional && (
        <QuickBookingModal
          isOpen={isQuickBookingOpen}
          onClose={() => {
            setIsQuickBookingOpen(false);
            setQuickBookingProfessional(null);
          }}
          onSuccess={handleModalSuccess}
          selectedDate={currentDate}
          selectedTime={quickBookingTime}
          professional={quickBookingProfessional}
          freeUntil={quickBookingFreeUntil || undefined}
        />
      )}

      {/* Manual Booking Modal */}
      {selectedProfessional && !isQuickBookingOpen && (
        <ManualBookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleModalSuccess}
          selectedDate={currentDate}
          selectedTime={selectedTime}
          professional={selectedProfessional}
        />
      )}

      {/* Appointment Details Modal */}
      <AppointmentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onUpdate={() => {
          loadAppointments();
          // Trigger refresh of AvailableNowBar when status changes (including cancellation)
          setAvailabilityRefreshTrigger(prev => prev + 1);
          setIsDetailsModalOpen(false);
        }}
        appointment={selectedAppointment}
        professionals={professionals}
        services={services}
      />

      {/* Drag & Drop Confirmation Modal */}
      {isDragConfirmOpen && pendingDrop && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-[var(--surface-subtle)] px-6 py-4 border-b border-[var(--border-default)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <CalendarIcon className="text-[var(--brand-primary)]" size={20} />
                Confirmar Reagendamento
              </h3>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Client Info */}
              <div className="bg-[var(--surface-subtle)] rounded-lg p-4 border border-[var(--border-default)]">
                <div className="text-xs text-[var(--text-[var(--text-muted)])] uppercase tracking-wider mb-1">Cliente</div>
                <div className="text-[var(--text-primary)] font-bold">
                  {pendingDrop.appointment.customer_name || pendingDrop.appointment.client?.name || 'Cliente'}
                </div>
                <div className="text-sm text-[var(--brand-primary)]">
                  {pendingDrop.appointment.service?.name || 'Serviço'}
                </div>
              </div>

              {/* Change Details */}
              <div className="flex items-center gap-3">
                {/* From */}
                <div className="flex-1 bg-[var(--surface-subtle)] rounded-lg p-3 border border-[var(--border-default)]">
                  <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider mb-1">De</div>
                  <div className="text-sm text-[var(--text-primary)] font-medium">
                    {pendingDrop.appointment.professional?.name || 'Profissional'}
                  </div>
                  <div className="text-xs text-[var(--text-[var(--text-muted)])]">
                    {format(parseISO(pendingDrop.appointment.start_datetime), 'HH:mm')}
                  </div>
                </div>

                {/* Arrow */}
                <div className="text-[var(--brand-primary)]">
                  <ChevronRight size={24} />
                </div>

                {/* To */}
                <div className="flex-1 bg-green-900/30 rounded-lg p-3 border border-green-800">
                  <div className="text-[10px] text-[var(--status-success)] uppercase tracking-wider mb-1">Para</div>
                  <div className="text-sm text-[var(--text-primary)] font-medium">
                    {professionals.find(p => p.id === pendingDrop.targetProfessionalId)?.name || 'Profissional'}
                  </div>
                  <div className="text-xs text-[var(--status-success)]">
                    {pendingDrop.targetTime}
                  </div>
                </div>
              </div>

              {/* Date info */}
              <div className="text-center text-sm text-[var(--text-[var(--text-muted)])]">
                {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[var(--surface-subtle)] px-6 py-4 border-t border-[var(--border-default)] flex gap-3">
              <button
                onClick={cancelDrop}
                className="flex-1 px-4 py-2.5 border border-[var(--border-strong)] text-gray-300 rounded-lg hover:bg-[var(--surface-subtle)] transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDrop}
                className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-[var(--text-primary)] rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Check size={18} />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agenda;
