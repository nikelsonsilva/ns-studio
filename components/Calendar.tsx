
import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Filter,
  Ban,
  Search,
  CheckCircle2,
  DollarSign,
  Calendar as CalendarIcon,
  TrendingUp,
  Zap,
  MoreHorizontal,
  Banknote,
  X,
  ShoppingBag,
  Check,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  GripVertical,
  Store,
  Info,
  Maximize2,
  Minimize2
} from 'lucide-react';
import {
  format,
  addDays,
  subDays,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  isSameDay,
  isToday,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Barber, Appointment, Status, Service, Product, PaymentStatus } from '../types';
import Button from './ui/Button';
import Select from './ui/Select';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Card from './ui/Card';
import Switch from './ui/Switch';
import { useToast } from './ui/Toast';

// Backend imports
import { supabase } from '../lib/supabase';
import { getNowInBrazil, getCurrentTimeBrazil, getCurrentDayOfWeekBrazil, getStartOfDayBrazil, getEndOfDayBrazil, fromUTC } from '../lib/timezone';
import { useSupabaseQuery } from '../lib/hooks';
import { fetchProfessionals, fetchServices, fetchProducts, fetchAppointments, getCurrentBusinessId, getBusinessHoursForDay, type DayHours } from '../lib/database';
import ManualBookingModal from './ManualBookingModal';
import QuickBookingModal from './QuickBookingModal';
import AppointmentModal from './AppointmentModal';

interface CalendarProps {
  initialDate?: Date;
  isFocusMode?: boolean;
  setFocusMode?: (focus: boolean) => void;
}

const Calendar: React.FC<CalendarProps> = ({ initialDate, isFocusMode = false, setFocusMode }) => {
  // ╔════════════════════════════════════════════════════════════════════════════╗
  // ║  SECTION: SUPABASE DATA FETCHING                                           ║
  // ║  Queries for professionals, services, products, and appointments           ║
  // ╚════════════════════════════════════════════════════════════════════════════╝
  const { data: barbersData, loading: loadingBarbers } = useSupabaseQuery(fetchProfessionals);
  const { data: servicesData, loading: loadingServices } = useSupabaseQuery(fetchServices);
  const { data: productsData, loading: loadingProducts } = useSupabaseQuery(fetchProducts);
  const { data: appointmentsData, loading: loadingAppointments } = useSupabaseQuery(fetchAppointments);

  // Combined loading state for skeleton
  const isDataLoading = loadingBarbers || loadingServices || loadingAppointments;

  const barbers = barbersData || [];
  const services = servicesData || [];
  const products = productsData || [];

  // ╔════════════════════════════════════════════════════════════════════════════╗
  // ║  SECTION: COMPONENT STATE                                                  ║
  // ║  All useState hooks for calendar UI state                                  ║
  // ╚════════════════════════════════════════════════════════════════════════════╝
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(initialDate || new Date());
  const [selectedBarberId, setSelectedBarberId] = useState('all');
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | null>(null);

  // View Mode State (Day / Week / Month)
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');

  // Mobile Sidebar State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // New Visual State
  const [highlightFreeSlots, setHighlightFreeSlots] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [widgetServiceFilter, setWidgetServiceFilter] = useState<string>('all'); // Filter by service in Available Now widget
  const [showInactive, setShowInactive] = useState(false); // Toggle to show inactive professionals

  // Real-time Clock
  const [currentTime, setCurrentTime] = useState(getNowInBrazil());

  // Appointments State (from Supabase)
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Command State (existing backend logic)
  const [activeCommandApp, setActiveCommandApp] = useState<string | null>(null);

  // === BACKEND STATE (from Agenda.tsx) ===
  const [businessId, setBusinessId] = useState<string>('');
  const [businessHoursForDay, setBusinessHoursForDay] = useState<DayHours | null>(null);
  const [isLoadingBusinessHours, setIsLoadingBusinessHours] = useState(true);
  const [globalBufferMinutes, setGlobalBufferMinutes] = useState<number>(15);
  const [dynamicTimeSlots, setDynamicTimeSlots] = useState<string[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<Barber | null>(null);

  // Details Modal
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Reschedule state - stores original appointment data when rescheduling
  const [rescheduleData, setRescheduleData] = useState<Appointment | null>(null);

  // Quick Booking Modal state (for"Disponíveis Agora")
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [quickBookingProfessional, setQuickBookingProfessional] = useState<Barber | null>(null);
  const [quickBookingFreeUntil, setQuickBookingFreeUntil] = useState<Date | null>(null);

  // Time Blocks
  interface TimeBlock {
    id: string;
    professional_id: string | null;
    start_datetime: string;
    end_datetime: string;
    reason?: string;
  }
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  // Professional Availability
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

  // Professional Services Map (which services each professional offers)
  const [professionalServiceMap, setProfessionalServiceMap] = useState<Record<string, string[]>>({});

  const toast = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // === DRAG AND DROP STATE ===
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [isDragConfirmOpen, setIsDragConfirmOpen] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<{
    appointment: Appointment;
    targetProfessionalId: string;
    targetTime: string;
  } | null>(null);

  // Draggable focus button position state
  const [focusButtonPos, setFocusButtonPos] = useState({ x: 12, y: 12 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Sync header scroll with timeline scroll
  const handleTimelineScroll = () => {
    if (scrollRef.current && headerRef.current) {
      headerRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
  };

  // Drag handlers for the floating focus button
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = {
      x: clientX - focusButtonPos.x,
      y: clientY - focusButtonPos.y
    };
  };

  const handleDrag = (e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Calculate new position with bounds
    const newX = Math.max(8, Math.min(window.innerWidth - 120, clientX - dragOffset.current.x));
    const newY = Math.max(8, Math.min(window.innerHeight - 50, clientY - dragOffset.current.y));

    setFocusButtonPos({ x: newX, y: newY });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Effect to add/remove global drag listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDrag);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDrag);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);

  // Sync appointments from Supabase
  useEffect(() => {
    if (appointmentsData) {
      setAppointments(appointmentsData);
    }
  }, [appointmentsData]);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getNowInBrazil()), 60000);
    return () => clearInterval(timer);
  }, [currentDate]);

  // Keyboard shortcuts for Focus Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // Escape exits focus mode
      if (e.key === 'Escape' && isFocusMode && setFocusMode) {
        setFocusMode(false);
      }

      // F toggles focus mode
      if ((e.key === 'f' || e.key === 'F') && setFocusMode) {
        setFocusMode(!isFocusMode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode, setFocusMode]);

  // ===== AUTO-SCROLL TO CURRENT TIME =====
  // Scrolls smoothly to position red line at top with upcoming appointments visible
  useEffect(() => {
    if (isLoadingBusinessHours || !businessHoursForDay) return;
    if (!scrollRef.current) return;
    if (!isSameDay(currentDate, new Date())) return;

    const [openHour, openMin = 0] = businessHoursForDay.open.split(':').map(Number);
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();

    // If before opening, don't scroll
    const openTotalMinutes = openHour * 60 + openMin;
    const nowTotalMinutes = currentHour * 60 + currentMinutes;
    if (nowTotalMinutes < openTotalMinutes) return;

    // Calculate red line position
    const slotHeight = 120;
    const minutesSinceOpen = nowTotalMinutes - openTotalMinutes;
    const redLinePosition = (minutesSinceOpen / 60) * slotHeight;

    // Scroll AFTER the red line - add offset to scroll past it
    // This positions the line near the top, showing upcoming slots below
    const scrollPosition = Math.max(0, redLinePosition + 50);

    // Delay to ensure DOM is ready, then smooth scroll
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        // Reset horizontal scroll to show time column
        scrollRef.current.scrollLeft = 0;
        // Scroll to current time with smooth animation
        scrollRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [isLoadingBusinessHours, businessHoursForDay, currentDate]);
  // ===== END AUTO-SCROLL =====

  // === BACKEND DATA LOADING (from Agenda.tsx) ===

  // Load business ID and buffer settings on mount and when page becomes visible
  useEffect(() => {
    const loadBusinessSettings = async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, booking_settings')
        .single();
      if (!error && data) {
        setBusinessId(data.id);
        // Load global buffer from business settings
        const buffer = (data.booking_settings as any)?.buffer_minutes || 30;

        setGlobalBufferMinutes(buffer);
      }
    };

    // Load on mount
    loadBusinessSettings();

    // Also reload when page becomes visible (user navigates back from Settings)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadBusinessSettings();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also reload on focus (for SPA navigation)
    const handleFocus = () => loadBusinessSettings();
    window.addEventListener('focus', handleFocus);

    // ✅ REALTIME: Subscribe to changes in business settings (buffer and hours)
    const subscription = supabase
      .channel('business_settings_changes')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'businesses' },
        (payload) => {
          console.log('🔄 [Calendar] Business settings updated:', payload);
          const newSettings = payload.new as any;

          // Update buffer if changed
          const newBuffer = newSettings?.booking_settings?.buffer_minutes;
          if (newBuffer && newBuffer !== globalBufferMinutes) {
            console.log(`🔄 [Calendar] Buffer changed: ${globalBufferMinutes} → ${newBuffer}`);
            setGlobalBufferMinutes(newBuffer);
          }

          // Reload business hours when they change
          if (newSettings?.business_hours) {
            console.log('🔄 [Calendar] Business hours changed, reloading...');
            // Trigger reload of business hours by re-running the effect
            const dayOfWeek = currentDate.getDay();
            getBusinessHoursForDay(dayOfWeek).then(hours => {
              setBusinessHoursForDay(hours);
              if (hours) {
                const [openHour, openMin = 0] = hours.open.split(':').map(Number);
                let [closeHour, closeMin = 0] = hours.close.split(':').map(Number);
                if (closeHour === 0 && closeMin === 0) closeHour = 24;

                const slotInterval = Math.max(newBuffer || globalBufferMinutes || 30, 5);
                const rawStartMinutes = openHour * 60 + openMin;
                const endMinutes = closeHour * 60 + closeMin;
                const startMinutes = Math.floor(rawStartMinutes / slotInterval) * slotInterval;

                const slots: string[] = [];
                for (let minutes = startMinutes; minutes < endMinutes; minutes += slotInterval) {
                  const h = Math.floor(minutes / 60);
                  const m = minutes % 60;
                  slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
                }
                setDynamicTimeSlots(slots);
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      subscription.unsubscribe();
    };
  }, []);

  // Load business hours when date or buffer changes
  useEffect(() => {
    const loadBusinessHours = async () => {
      setIsLoadingBusinessHours(true);
      const dayOfWeek = currentDate.getDay();
      const hours = await getBusinessHoursForDay(dayOfWeek);
      setBusinessHoursForDay(hours);

      if (hours) {
        // Gerar slots de horário baseado no horário de funcionamento e buffer global
        const [openHour, openMin = 0] = hours.open.split(':').map(Number);
        let [closeHour, closeMin = 0] = hours.close.split(':').map(Number);

        // Tratar 00:00 como meia-noite (24:00)
        if (closeHour === 0 && closeMin === 0) closeHour = 24;

        // Usar o buffer global como intervalo entre slots (mínimo 5min, padrão 30min para calendário)
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

        setDynamicTimeSlots(slots);
      } else {
        setDynamicTimeSlots([]);
      }
      setIsLoadingBusinessHours(false);
    };
    loadBusinessHours();
  }, [currentDate, globalBufferMinutes]);

  // Load availability and time blocks when businessId changes
  useEffect(() => {
    if (!businessId) return;

    const loadAvailability = async () => {
      const professionalIds = barbers.map(b => b.id);
      if (professionalIds.length === 0) return;

      const { data, error } = await supabase
        .from('professional_availability')
        .select('*')
        .in('professional_id', professionalIds);

      if (data) setProfAvailability(data);
    };

    const loadTimeBlocks = async () => {
      // Use timezone-aware date range for Brazil
      const startOfDay = getStartOfDayBrazil(currentDate);
      const endOfDay = getEndOfDayBrazil(currentDate);

      const { data } = await supabase
        .from('time_blocks')
        .select('*')
        .eq('business_id', businessId)
        .gte('start_datetime', startOfDay.toISOString())
        .lte('start_datetime', endOfDay.toISOString());
      if (data) setTimeBlocks(data);
    };

    const loadProfessionalServices = async () => {
      const professionalIds = barbers.map(b => b.id);
      if (professionalIds.length === 0) return;

      const { data } = await supabase
        .from('professional_services')
        .select('professional_id, service_id')
        .in('professional_id', professionalIds);

      if (data) {
        const map: Record<string, string[]> = {};
        data.forEach((ps: { professional_id: string; service_id: string }) => {
          if (!map[ps.professional_id]) map[ps.professional_id] = [];
          map[ps.professional_id].push(ps.service_id);
        });
        setProfessionalServiceMap(map);
      }
    };

    loadAvailability();
    loadTimeBlocks();
    loadProfessionalServices();

    // Refresh availability periodically
    const refreshInterval = setInterval(() => {
      loadAvailability();
    }, 30000);

    // ✅ REALTIME: Subscribe to professional availability changes
    const availabilitySubscription = supabase
      .channel('professional_availability_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'professional_availability' },
        (payload) => {
          console.log('🔄 [Calendar] Professional availability changed:', payload);
          loadAvailability();
        }
      )
      .subscribe();

    // ✅ REALTIME: Subscribe to time block changes
    const timeBlocksSubscription = supabase
      .channel('time_blocks_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'time_blocks' },
        (payload) => {
          console.log('🔄 [Calendar] Time blocks changed:', payload);
          loadTimeBlocks();
        }
      )
      .subscribe();

    return () => {
      clearInterval(refreshInterval);
      availabilitySubscription.unsubscribe();
      timeBlocksSubscription.unsubscribe();
    };
  }, [businessId, currentDate, barbers.length]);

  // === BACKEND HELPER FUNCTIONS ===

  const isTimeSlotPast = (time: string): boolean => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const selectedDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    if (selectedDay < today) return true;

    if (isSameDay(currentDate, now)) {
      const [hours, minutes] = time.split(':').map(Number);
      const slotTime = new Date();
      slotTime.setHours(hours, minutes, 0, 0);
      return slotTime < now;
    }

    return false;
  };

  const isSlotInBreak = (professionalId: string, time: string): boolean => {
    const dayOfWeek = currentDate.getDay();
    const availability = profAvailability.find(
      a => a.professional_id === professionalId && a.day_of_week === dayOfWeek && a.is_active
    );
    if (!availability || !availability.break_start || !availability.break_end) return false;

    const [hour, minute] = time.split(':').map(Number);
    const timeMinutes = hour * 60 + minute;
    const [bsH, bsM] = availability.break_start.split(':').map(Number);
    const [beH, beM] = availability.break_end.split(':').map(Number);
    return timeMinutes >= (bsH * 60 + bsM) && timeMinutes < (beH * 60 + beM);
  };

  const isProfessionalWorkingAt = (professionalId: string, time: string): boolean => {
    const dayOfWeek = currentDate.getDay();
    const availability = profAvailability.find(
      a => a.professional_id === professionalId && a.day_of_week === dayOfWeek
    );
    if (!availability) return true;
    if (!availability.is_active) return false;

    const [hour, minute] = time.split(':').map(Number);
    const timeMinutes = hour * 60 + minute;
    const [startH, startM] = availability.start_time.split(':').map(Number);
    const [endH, endM] = availability.end_time.split(':').map(Number);
    let endMinutes = endH * 60 + endM;
    if (endMinutes === 0) endMinutes = 1440;
    return timeMinutes >= (startH * 60 + startM) && timeMinutes < endMinutes;
  };

  const getBlockForSlot = (professionalId: string, time: string): TimeBlock | null => {
    // Debug: Log timeBlocks when checking
    if (timeBlocks.length > 0) {
      console.log('[getBlockForSlot] Checking blocks:', timeBlocks.length, 'for professional:', professionalId, 'at time:', time);
      console.log('[getBlockForSlot] All blocks:', timeBlocks.map(b => ({ id: b.id, professional_id: b.professional_id, start: b.start_datetime })));
    }

    return timeBlocks.find(block => {
      // Only match blocks for this specific professional (null professional_id = "Outros" category, not global)
      const matchesProfessional = block.professional_id === professionalId;
      console.log('[getBlockForSlot] Block', block.id, 'professional_id:', block.professional_id, 'vs', professionalId, '=', matchesProfessional);

      if (!matchesProfessional) return false;

      // Parse block times and convert from UTC to local for comparison
      const blockStart = parseISO(block.start_datetime);
      const blockEnd = parseISO(block.end_datetime);

      // Create slot date in local time
      const [hours, minutes] = time.split(':').map(Number);
      const slotDate = new Date(currentDate);
      slotDate.setHours(hours, minutes, 0, 0);

      // Compare using local times - parseISO returns Date with correct UTC offset,
      // and JavaScript Date comparison handles timezone automatically
      const isInRange = slotDate >= blockStart && slotDate < blockEnd;
      console.log('[getBlockForSlot] Time check:', slotDate.toISOString(), 'between', blockStart.toISOString(), 'and', blockEnd.toISOString(), '=', isInRange);

      return isInRange;
    }) || null;
  };

  const isBusinessClosed = (): boolean => {
    return businessHoursForDay === null;
  };

  const handleSlotClick = (professional: Barber, time: string) => {
    if (isBusinessClosed()) {
      toast.warning('O estabelecimento está fechado neste dia!');
      return;
    }
    if (isTimeSlotPast(time)) {
      toast.warning('Este horário já passou!');
      return;
    }
    if (getBlockForSlot(professional.id, time)) {
      toast.warning('Este horário está bloqueado!');
      return;
    }
    if (!isProfessionalWorkingAt(professional.id, time)) {
      toast.warning('Profissional não disponível neste horário!');
      return;
    }
    if (isSlotInBreak(professional.id, time)) {
      toast.warning('Profissional em pausa neste horário!');
      return;
    }
    setSelectedProfessional(professional);
    setSelectedSlotTime(time);
    setIsAppointmentModalOpen(true);
  };

  const handleOpenDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);
  };

  const refetchAppointments = async () => {
    const data = await fetchAppointments();
    if (data) {
      setAppointments(data);
    }
  };

  const refetchTimeBlocks = async () => {
    // Use timezone-aware date range for Brazil
    const startOfDay = getStartOfDayBrazil(currentDate);
    const endOfDay = getEndOfDayBrazil(currentDate);

    const { data } = await supabase
      .from('time_blocks')
      .select('*')
      .eq('business_id', businessId)
      .gte('start_datetime', startOfDay.toISOString())
      .lte('start_datetime', endOfDay.toISOString());
    if (data) setTimeBlocks(data);
  };

  const handleModalSuccess = () => {
    refetchAppointments();
    refetchTimeBlocks();
  };

  const handleBlockSlot = async (professionalId: string, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const startDateTime = new Date(currentDate);
    startDateTime.setHours(hours, minutes, 0, 0);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60000);

    const { error } = await supabase.from('time_blocks').insert({
      business_id: businessId,
      professional_id: professionalId,
      start_datetime: startDateTime.toISOString(),
      end_datetime: endDateTime.toISOString(),
      reason: 'Bloqueio manual',
      block_type: 'personal'
    });

    if (!error) {
      toast.success('Horário bloqueado!');
      refetchAppointments();
    } else {
      toast.error('Erro ao bloquear horário');
    }
  };

  const handleUnblockSlot = async (blockId: string) => {
    const { error } = await supabase.from('time_blocks').delete().eq('id', blockId);
    if (!error) {
      toast.success('Bloqueio removido!');
      refetchTimeBlocks();
      setIsBlockModalOpen(false);
      setSelectedBlock(null);
    } else {
      toast.error('Erro ao desbloquear');
    }
  };

  const handleOpenBlockDetails = (block: TimeBlock) => {
    setSelectedBlock(block);
    setIsBlockModalOpen(true);
  };

  // === DRAG AND DROP HANDLERS ===
  const handleAppointmentDragStart = (e: React.DragEvent, appointment: Appointment) => {
    setDraggedAppointment(appointment);
    e.currentTarget.classList.add('opacity-50', 'scale-95');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleAppointmentDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50', 'scale-95');
    setDraggedAppointment(null);
  };

  const handleSlotDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSlotDrop = async (e: React.DragEvent, professionalId: string, time: string) => {
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
    const existingAppointments = appointments.filter(a => {
      if (a.status === 'cancelled' || a.status === 'no_show') return false;
      const profId = a.professional_id || (a as any).barberId;
      if (profId !== professionalId) return false;
      const d = a.start_datetime ? fromUTC(a.start_datetime) : null;
      if (!d || !isSameDay(d, currentDate)) return false;
      const aptHour = d.getHours();
      const [slotHour] = time.split(':').map(Number);
      return aptHour === slotHour && a.id !== draggedAppointment.id;
    });

    if (existingAppointments.length > 0) {
      toast.error('Este horário já está ocupado por outro agendamento!');
      setDraggedAppointment(null);
      return;
    }

    // 5. All validations passed - open confirmation modal
    setPendingDrop({
      appointment: draggedAppointment,
      targetProfessionalId: professionalId,
      targetTime: time
    });
    setIsDragConfirmOpen(true);
    setDraggedAppointment(null);
  };

  const confirmDrop = async () => {
    if (!pendingDrop) return;

    const { appointment, targetProfessionalId, targetTime } = pendingDrop;
    const serviceId = appointment.service_id || (appointment as any).serviceId;
    const service = services.find(s => s.id === serviceId);
    const duration = service?.duration_minutes || 60;

    // Create datetime in LOCAL time
    const [hours, minutes] = targetTime.split(':').map(Number);
    const newStartDateTime = new Date(currentDate);
    newStartDateTime.setHours(hours, minutes, 0, 0);
    const newEndDateTime = new Date(newStartDateTime.getTime() + duration * 60000);

    const { error } = await supabase
      .from('appointments')
      .update({
        professional_id: targetProfessionalId,
        start_datetime: newStartDateTime.toISOString(),
        end_datetime: newEndDateTime.toISOString()
      })
      .eq('id', appointment.id);

    if (error) {
      console.error('❌ [DragDrop] Error:', error);
      toast.error('Erro ao mover agendamento: ' + error.message);
    } else {
      toast.success('Agendamento movido com sucesso!');
      refetchAppointments();
    }

    setIsDragConfirmOpen(false);
    setPendingDrop(null);
  };

  const cancelDrop = () => {
    setIsDragConfirmOpen(false);
    setPendingDrop(null);
  };

  // === HANDLERS ===
  const handlePrevMonth = () => setMiniCalendarMonth(subMonths(miniCalendarMonth, 1));
  const handleNextMonth = () => setMiniCalendarMonth(addMonths(miniCalendarMonth, 1));

  const onDateClick = (day: Date) => {
    setCurrentDate(day);
    if (window.innerWidth < 1280) {
      setIsMobileSidebarOpen(false);
    }
  };

  const handleOpenNewAppointment = (time?: string, barberId?: string) => {
    let slotTime: string;

    if (time) {
      slotTime = time;
    } else {
      const now = new Date();
      const isToday = isSameDay(currentDate, now);

      if (isToday) {
        const minutes = now.getMinutes();
        let roundedMinutes: number;
        let roundedHours = now.getHours();

        if (minutes < 15) roundedMinutes = 15;
        else if (minutes < 30) roundedMinutes = 30;
        else if (minutes < 45) roundedMinutes = 45;
        else {
          roundedMinutes = 0;
          roundedHours = roundedHours + 1;
        }

        slotTime = `${String(roundedHours).padStart(2, '0')}:${String(roundedMinutes).padStart(2, '0')}`;
      } else {
        slotTime = businessHoursForDay?.open || '09:00';
      }
    }

    if (isBusinessClosed()) {
      toast.warning('O estabelecimento está fechado neste dia!');
      return;
    }

    if (isTimeSlotPast(slotTime)) {
      if (isSameDay(currentDate, new Date())) {
        toast.warning('Este horário já passou! Selecione um horário futuro na agenda.');
      } else {
        toast.warning('Este horário já passou!');
      }
      return;
    }

    setSelectedSlotTime(slotTime);
    if (barberId) {
      const prof = barbers.find(b => b.id === barberId);
      if (prof) setSelectedProfessional(prof);
    }
    setIsAppointmentModalOpen(true);
  };

  const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1));
  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1));
  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setMiniCalendarMonth(today);
  };

  // === EXISTING BACKEND LOGIC ===
  const handleStatusChange = (id: string, newStatus: Status) => {
    setAppointments(prev => prev.map(app =>
      app.id === id ? { ...app, status: newStatus } : app
    ));
  };

  const handleAddToCommand = (productId: string) => {
    if (!activeCommandApp) return;

    const product = products.find(p => p.id === productId);
    if (!product) return;

    setAppointments(prev => prev.map(app => {
      if (app.id === activeCommandApp) {
        const currentConsumption = app.consumption || [];
        return {
          ...app,
          consumption: [...currentConsumption, {
            id: Math.random().toString(),
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1
          }]
        };
      }
      return app;
    }));
  };

  const handleReschedule = (appointment: Appointment) => {
    setRescheduleData(appointment);
    const prof = barbers.find(b => b.id === appointment.professional_id);
    if (prof) {
      setSelectedProfessional(prof);
    }
    const aptTime = (appointment as any).start_datetime || (appointment as any).time || '';
    setSelectedSlotTime(aptTime ? format(new Date(aptTime), 'HH:mm') : '');
    setIsAppointmentModalOpen(true);
  };

  // === HELPERS FOR GRID ===
  const startHour = businessHoursForDay ? parseInt(businessHoursForDay.open.split(':')[0]) : 8;
  const endHour = businessHoursForDay ? parseInt(businessHoursForDay.close.split(':')[0]) : 20;
  const actualEndHour = endHour === 0 ? 24 : endHour;

  // Base slot height calculation (visibleBarbers-dependent parts moved below visibleBarbers declaration)
  const baseHeight = Math.max(60, Math.min(120, globalBufferMinutes * 2.5));

  // Use dynamicTimeSlots (based on buffer) if available, otherwise fallback to hourly slots
  const timeSlots = dynamicTimeSlots.length > 0
    ? dynamicTimeSlots
    : Array.from({ length: actualEndHour - startHour }, (_, i) => `${(startHour + i).toString().padStart(2, '0')}:00`);

  // Mini Calendar Generation
  const generateCalendarGrid = () => {
    const monthStart = startOfMonth(miniCalendarMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: startDate, end: endDate });
  };
  const calendarDays = generateCalendarGrid();
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  // === STATS CALCULATION ===
  const getStatsForPeriod = () => {
    const now = new Date();

    if (viewMode === 'day') {
      const dayAppts = appointments.filter(a => isSameDay(new Date(a.start_datetime || a.date), currentDate));
      const revenue = dayAppts.reduce((acc, curr) => {
        if (curr.status === Status.CANCELED || curr.status === Status.BLOCKED) return acc;
        const serviceId = curr.service_id || curr.serviceId;
        const service = services.find(s => s.id === serviceId);
        return acc + (service?.price || 0);
      }, 0);
      const totalSlots = timeSlots.length * Math.max(barbers.length, 1);
      const occupancy = totalSlots > 0 ? Math.round((dayAppts.filter(a => a.status !== Status.BLOCKED).length / totalSlots) * 100) : 0;
      return { count: dayAppts.length, revenue, occupancy, label: 'hoje' };
    }

    if (viewMode === 'week') {
      const weekStartDate = subDays(currentDate, 6);
      const weekAppts = appointments.filter(a => {
        const aptDate = new Date(a.start_datetime || a.date);
        return aptDate >= startOfDay(weekStartDate) && aptDate <= endOfDay(currentDate);
      });
      const revenue = weekAppts.reduce((acc, curr) => {
        if (curr.status === Status.CANCELED || curr.status === Status.BLOCKED) return acc;
        const serviceId = curr.service_id || curr.serviceId;
        const service = services.find(s => s.id === serviceId);
        return acc + (service?.price || 0);
      }, 0);
      const totalSlots = 7 * timeSlots.length * Math.max(barbers.length, 1);
      const occupancy = totalSlots > 0 ? Math.round((weekAppts.filter(a => a.status !== Status.BLOCKED).length / totalSlots) * 100) : 0;
      return { count: weekAppts.length, revenue, occupancy, label: 'semana' };
    }

    const monthAppts = appointments.filter(a => isSameMonth(new Date(a.start_datetime || a.date), currentDate));
    const revenue = monthAppts.reduce((acc, curr) => {
      if (curr.status === Status.CANCELED || curr.status === Status.BLOCKED) return acc;
      const serviceId = curr.service_id || curr.serviceId;
      const service = services.find(s => s.id === serviceId);
      return acc + (service?.price || 0);
    }, 0);
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const totalSlots = daysInMonth * timeSlots.length * Math.max(barbers.length, 1);
    const occupancy = totalSlots > 0 ? Math.round((monthAppts.filter(a => a.status !== Status.BLOCKED).length / totalSlots) * 100) : 0;
    return { count: monthAppts.length, revenue, occupancy, label: 'mês' };
  };

  const periodStats = getStatsForPeriod();

  // === VISUAL HELPERS ===
  const getAppointmentStyles = (status: Status | string) => {
    const normalizedStatus = status === 'cancelled' ? Status.CANCELED : status;

    switch (normalizedStatus) {
      case Status.CONFIRMED:
      case 'confirmed':
        return { border: 'border-l-[var(--calendar-status-scheduled)]', bg: 'bg-[var(--calendar-status-scheduled-bg)]', text: 'text-[var(--calendar-status-scheduled-text)]', icon: CheckCircle2 };
      case Status.COMPLETED:
      case 'completed':
        return { border: 'border-l-[var(--calendar-status-completed)]', bg: 'bg-[var(--calendar-status-completed-bg)]', text: 'text-[var(--calendar-status-completed-text)]', icon: CheckCircle2 };
      case Status.PENDING:
      case 'pending':
        return { border: 'border-l-[var(--calendar-status-pending)]', bg: 'bg-[var(--calendar-status-pending-bg)]', text: 'text-[var(--calendar-status-pending-text)]', icon: Clock };
      case Status.CANCELED:
      case 'canceled':
      case 'cancelled':
        return { border: 'border-l-[var(--calendar-status-canceled)]', bg: 'bg-[var(--calendar-status-canceled-bg)]', text: 'text-[var(--calendar-status-canceled-text)]', decoration: 'line-through', opacity: 'opacity-50', icon: Ban };
      case Status.BLOCKED:
      case 'blocked':
        return { border: 'border-l-[var(--calendar-status-blocked)]', bg: 'bg-[var(--calendar-status-blocked-bg)]', text: 'text-[var(--calendar-status-blocked-text)]', pattern: true, icon: Ban };
      default:
        return { border: 'border-l-[var(--calendar-status-blocked)]', bg: 'bg-[var(--surface-subtle)]', text: 'text-[var(--text-muted)]', icon: MoreHorizontal };
    }
  };

  // Helper for determining visible barbers based on filter
  const filteredBarbers = selectedBarberId === 'all'
    ? (showInactive ? barbers : barbers.filter(b => b.is_active !== false))
    : barbers.filter(b => b.id === selectedBarberId);

  // Helper to check if a professional is currently working
  const isProfessionalWorkingNow = (professionalId: string): boolean => {
    const now = currentTime;
    const dayOfWeek = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const availability = profAvailability.find(
      a => a.professional_id === professionalId && a.day_of_week === dayOfWeek
    );

    if (!availability || !availability.is_active) return false;

    const [startH, startM] = availability.start_time.split(':').map(Number);
    const [endH, endM] = availability.end_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;
    if (endMinutes === 0) endMinutes = 1440; // Midnight = end of day

    // Check if in break
    if (availability.break_start && availability.break_end) {
      const [bsH, bsM] = availability.break_start.split(':').map(Number);
      const [beH, beM] = availability.break_end.split(':').map(Number);
      const breakStart = bsH * 60 + bsM;
      const breakEnd = beH * 60 + beM;
      if (currentMinutes >= breakStart && currentMinutes < breakEnd) return false;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  };

  // Sort professionals: working now first, then alphabetically
  const visibleBarbers = [...filteredBarbers].sort((a, b) => {
    const aWorking = isProfessionalWorkingNow(a.id);
    const bWorking = isProfessionalWorkingNow(b.id);
    if (aWorking && !bWorking) return -1;
    if (!aWorking && bWorking) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  // Dynamic slot height - increases when many professionals for better readability
  const profBonus = visibleBarbers.length > 3 ? Math.floor((visibleBarbers.length - 3) / 5) * 10 : 0;
  const SLOT_HEIGHT_PX = Math.min(baseHeight + profBonus, 150);

  // Minimum column width per professional - increases for better readability
  const MIN_COLUMN_WIDTH = visibleBarbers.length > 10 ? 130 : visibleBarbers.length > 5 ? 120 : 100;

  // Helper for grid rendering - fully responsive, columns share available space
  // Using minmax for time column to ensure it works on all screen sizes
  const getGridTemplate = () => {
    const count = visibleBarbers.length;
    // MIN_COLUMN_WIDTH is calculated above based on number of professionals
    if (viewMode === 'day') return `minmax(40px, 60px) repeat(${count || 1}, minmax(${MIN_COLUMN_WIDTH}px, 1fr))`;
    if (viewMode === 'week') return `minmax(40px, 60px) repeat(7, minmax(80px, 1fr))`;
    return '1fr';
  };

  const currentWeekDays = eachDayOfInterval({ start: startOfWeek(currentDate, { weekStartsOn: 0 }), end: endOfWeek(currentDate, { weekStartsOn: 0 }) });

  // Current Time Line Logic - updated for dynamic slot sizes
  const getCurrentTimePosition = () => {
    const now = currentTime;
    if (!isSameDay(now, currentDate)) return null;
    if (!businessHoursForDay) return null;

    const [openHour, openMin = 0] = businessHoursForDay.open.split(':').map(Number);
    const [closeHour, closeMin = 0] = businessHoursForDay.close.split(':').map(Number);

    const currentHour = now.getHours();
    const currentMin = now.getMinutes();

    // Convert to minutes from midnight
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour === 0 ? 1440 : closeHour * 60 + closeMin;
    const currentMinutes = currentHour * 60 + currentMin;

    // Check if current time is within business hours
    if (currentMinutes < openMinutes || currentMinutes > closeMinutes) return null;

    // Calculate position based on slot interval (buffer)
    const slotInterval = Math.max(globalBufferMinutes || 15, 5);
    const minutesSinceOpen = currentMinutes - openMinutes;
    const slotIndex = minutesSinceOpen / slotInterval;

    // Position = slot index * slot height + header offset (h-12 = 48px)
    const HEADER_HEIGHT_PX = 48;
    const position = (slotIndex * SLOT_HEIGHT_PX) + HEADER_HEIGHT_PX;

    return { position, time: getCurrentTimeBrazil() };
  };
  const timeIndicator = getCurrentTimePosition();

  // ========== SKELETON LOADER ==========
  if (isDataLoading) {
    return (
      <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden animate-fade-in bg-black">
        {/* Left Sidebar Skeleton */}
        <div className="hidden lg:flex w-[230px] bg-zinc-900 border-r border-zinc-700 p-3 flex-col gap-3 animate-pulse">
          {/* Mini Calendar Skeleton */}
          <div className="bg-zinc-800/50 rounded-xl p-3">
            <div className="h-5 bg-zinc-700 rounded w-24 mx-auto mb-3" />
            <div className="grid grid-cols-7 gap-1">
              {[...Array(35)].map((_, i) => (
                <div key={i} className="h-6 bg-zinc-700/50 rounded" />
              ))}
            </div>
          </div>
          {/* Available Now Skeleton */}
          <div className="bg-zinc-800/50 rounded-xl p-3 flex-1">
            <div className="h-4 bg-zinc-700 rounded w-28 mb-3" />
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-2 p-2 bg-zinc-700/30 rounded-lg">
                  <div className="w-8 h-8 bg-zinc-700 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 bg-zinc-700 rounded w-20" />
                    <div className="h-2 bg-zinc-700/50 rounded w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Skeleton */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header Skeleton */}
          <div className="bg-zinc-900/80 border-b border-zinc-800 p-3 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
                <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
              </div>
              <div className="h-5 bg-zinc-800 rounded w-40" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 bg-zinc-800/50 rounded-lg w-24" />
              <div className="h-8 bg-zinc-800/50 rounded-lg w-32" />
              <div className="h-8 bg-zinc-800 rounded-lg w-28" />
            </div>
          </div>

          {/* Grid Header Skeleton */}
          <div className="bg-zinc-900/50 border-b border-zinc-800 grid grid-cols-4 gap-px animate-pulse">
            <div className="p-2">
              <div className="h-4 bg-zinc-800/50 rounded w-10" />
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="p-2 flex items-center gap-2">
                <div className="w-7 h-7 bg-zinc-800 rounded-full" />
                <div className="h-4 bg-zinc-800 rounded w-20" />
              </div>
            ))}
          </div>

          {/* Time Grid Skeleton */}
          <div className="flex-1 overflow-auto animate-pulse">
            <div className="grid grid-cols-4 gap-px">
              {[...Array(12)].map((_, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  <div className="h-20 bg-zinc-900 border-b border-zinc-800/50 p-2">
                    <div className="h-3 bg-zinc-800/50 rounded w-10" />
                  </div>
                  {[1, 2, 3].map(colIndex => (
                    <div key={colIndex} className="h-20 bg-zinc-900/50 border-b border-zinc-800/30 p-1">
                      {rowIndex % 3 === colIndex - 1 && (
                        <div className="h-full bg-zinc-800/30 rounded-lg p-2">
                          <div className="h-3 bg-zinc-700/50 rounded w-16 mb-1" />
                          <div className="h-2 bg-zinc-700/30 rounded w-12" />
                        </div>
                      )}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden animate-fade-in relative bg-black">

      {/* === MOBILE OVERLAY === */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileSidebarOpen(false)} />
      )}

      {/* === LEFT SIDEBAR === */}
      {!isFocusMode && (
        <div className={`
            fixed inset-y-0 left-0 z-50 w-[230px] bg-zinc-900 border-r border-zinc-700 transform transition-transform duration-300 ease-in-out p-3 flex flex-col gap-3 overflow-y-auto shadow-2xl
            ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 lg:static lg:w-[230px] lg:p-3 lg:border-r-0 lg:overflow-hidden lg:flex
        `}>
          <div className="flex items-center justify-between lg:hidden mb-2 shrink-0">
            <h3 className="text-lg font-bold text-white">Navegação</h3>
            <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 bg-zinc-800 rounded-full text-white">
              <X size={20} />
            </button>
          </div>

          {/* Sidebar Scrollable Content */}
          <div className="flex flex-col gap-3 overflow-y-auto pr-1 h-full">
            {/* 1. Mini Calendar */}
            <Card noPadding className="p-3 bg-zinc-950 border-zinc-800 shadow-md shrink-0">
              <div className="flex justify-between items-center mb-3">
                <button onClick={handlePrevMonth} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"><ChevronLeft size={14} /></button>
                <span className="font-bold text-white capitalize text-xs">{format(miniCalendarMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                <button onClick={handleNextMonth} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"><ChevronRight size={14} /></button>
              </div>
              <div className="grid grid-cols-7 mb-1 text-center text-[9px] font-bold text-zinc-500 h-5">
                {weekDays.map((day, i) => <div key={i}>{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((day, idx) => {
                  const isSelected = isSameDay(day, currentDate);
                  const isCurrentMonth = isSameMonth(day, miniCalendarMonth);
                  const isDayToday = isToday(day);
                  const hasEvents = appointments.some(a => isSameDay(new Date(a.start_datetime || a.date), day));

                  return (
                    <button
                      key={idx}
                      onClick={() => onDateClick(day)}
                      className={`h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-medium transition-all relative
                                        ${!isCurrentMonth ? 'text-zinc-600 opacity-30' : 'text-white'}
                                        ${isSelected ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20' : 'hover:bg-zinc-800'}
                                        ${isDayToday && !isSelected ? 'border border-amber-500 text-amber-500' : ''}
                                    `}
                    >
                      {format(day, 'd')}
                      {hasEvents && !isSelected && (
                        <span className="absolute bottom-1 w-1 h-1 bg-amber-500 rounded-full"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* 2. "Available Now" Widget */}
            <Card noPadding className="flex-1 bg-zinc-950 border-zinc-800 flex flex-col overflow-hidden shadow-md shrink-0 min-h-[0px]">
              {/* Header */}
              <div className="p-3 border-b border-zinc-800 bg-zinc-900/50 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20">
                      <Zap size={14} className="text-emerald-500 fill-emerald-500" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <h3 className="font-bold text-white text-xs leading-tight">Disponíveis agora</h3>
                      <span className="text-[9px] text-zinc-500 whitespace-nowrap">{format(currentTime, 'HH:mm')} • Tempo Real</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${isFilterOpen ? 'border-amber-500 text-amber-500 bg-amber-500/10' : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:text-white hover:border-zinc-600'}`}
                  >
                    <Filter size={12} />
                  </button>
                </div>

                {/* Toggle Row */}
                <div className="flex items-center justify-between bg-zinc-950/80 px-2 py-1.5 rounded border border-zinc-800">
                  <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wide">Destacar na grade</span>
                  <button
                    onClick={() => setHighlightFreeSlots(!highlightFreeSlots)}
                    className={`w-7 h-3.5 rounded-full flex items-center transition-colors shrink-0 ${highlightFreeSlots ? 'bg-emerald-500 justify-end' : 'bg-zinc-700 justify-start'}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white shadow mx-0.5" />
                  </button>
                </div>
              </div>

              {/* Professional Cards List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative custom-scrollbar">
                {/* Service Filter Dropdown */}
                {isFilterOpen && (
                  <div className="absolute top-0 right-2 z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl w-44 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 border-b border-zinc-800 text-[9px] font-bold text-zinc-500 uppercase">Filtrar por serviço</div>
                    <div className="max-h-40 overflow-y-auto">
                      <button
                        onClick={() => { setWidgetServiceFilter('all'); setIsFilterOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-zinc-800 transition-colors ${widgetServiceFilter === 'all' ? 'text-amber-500 font-bold' : 'text-zinc-300'}`}
                      >
                        Todos os Serviços
                      </button>
                      {services.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { setWidgetServiceFilter(s.id); setIsFilterOpen(false); }}
                          className={`w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-zinc-800 transition-colors flex justify-between items-center ${widgetServiceFilter === s.id ? 'text-amber-500 font-bold' : 'text-zinc-300'}`}
                        >
                          <span className="truncate">{s.name}</span>
                          <span className="text-zinc-500 text-[9px] ml-1 shrink-0">({s.duration}min)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show message when not viewing today */}
                {!isSameDay(currentDate, new Date()) ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-6 opacity-60">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
                      <CalendarIcon size={16} className="text-zinc-600" />
                    </div>
                    <h4 className="text-zinc-400 font-bold text-[10px] mb-1">Visualizando {format(currentDate, 'dd/MM')}</h4>
                    <p className="text-zinc-600 text-[9px] max-w-[140px] leading-relaxed">Volte para hoje para ver profissionais disponíveis agora</p>
                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="mt-3 text-[9px] text-amber-500 font-bold uppercase tracking-wider hover:underline"
                    >
                      Ir para hoje
                    </button>
                  </div>
                ) : isBusinessClosed() ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-6 opacity-50">
                    <Store size={24} className="text-zinc-700 mb-2" />
                    <p className="text-zinc-500 text-[10px]">O estabelecimento não abre hoje.</p>
                  </div>
                ) : (() => {
                  const availableNowList = barbers.filter(b => {
                    if (b.is_active === false) return false;

                    // Filter by Service
                    if (widgetServiceFilter !== 'all') {
                      const profServices = professionalServiceMap[b.id] || [];
                      if (!profServices.includes(widgetServiceFilter)) return false;
                    }

                    // Check if working and not on break
                    const isAvailable = isProfessionalWorkingAt(b.id, format(currentTime, 'HH:mm')) && !isSlotInBreak(b.id, format(currentTime, 'HH:mm'));
                    if (!isAvailable) return false;

                    // Check if currently in an ongoing appointment
                    const nowTime = currentTime.getTime();
                    const hasOngoingAppointment = appointments.some(a => {
                      if (a.professional_id !== b.id && a.barberId !== b.id) return false;
                      if (a.status === 'cancelled') return false;
                      const aptStart = new Date(a.start_datetime || a.date);
                      if (!isSameDay(aptStart, currentDate)) return false;

                      // Get appointment duration from service
                      const serviceId = a.service_id || a.serviceId;
                      const service = services.find(s => s.id === serviceId);
                      const durationMins = service?.duration || 30;

                      const aptEnd = new Date(aptStart.getTime() + durationMins * 60 * 1000);

                      // Check if appointment is ongoing (started <= now < ended)
                      return aptStart.getTime() <= nowTime && nowTime < aptEnd.getTime();
                    });

                    return !hasOngoingAppointment;
                  }).map(b => {
                    // Calculate Availability Details
                    const dayOfWeek = currentDate.getDay();
                    const availability = profAvailability.find(a => a.professional_id === b.id && a.day_of_week === dayOfWeek);

                    if (!availability) return { ...b, minutesFree: 0, limitTime: '', percentage: 0 };

                    const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
                    const [endH, endM] = availability.end_time.split(':').map(Number);
                    const shiftEndMins = (endH * 60 + endM) || 1440;

                    // Find next blocking event (appt or block)
                    let nextBlockMins = shiftEndMins;

                    // Check appointments
                    const todayAppts = appointments.filter(a => {
                      if (a.professional_id !== b.id && a.barberId !== b.id) return false;
                      if (a.status === 'cancelled') return false;
                      const d = new Date(a.start_datetime || a.date);
                      return isSameDay(d, currentDate);
                    });

                    todayAppts.forEach(a => {
                      const d = new Date(a.start_datetime || a.date);
                      const startMins = d.getHours() * 60 + d.getMinutes();
                      if (startMins > nowMins && startMins < nextBlockMins) {
                        nextBlockMins = startMins;
                      }
                    });

                    // Check blocks
                    const todayBlocks = timeBlocks.filter(tk => tk.professional_id === b.id && isSameDay(parseISO(tk.start_datetime), currentDate));
                    todayBlocks.forEach(tk => {
                      const d = parseISO(tk.start_datetime);
                      const startMins = d.getHours() * 60 + d.getMinutes();
                      if (startMins > nowMins && startMins < nextBlockMins) {
                        nextBlockMins = startMins;
                      }
                    });

                    const minutesFree = Math.max(0, nextBlockMins - nowMins);
                    const limitTime = `${Math.floor(nextBlockMins / 60).toString().padStart(2, '0')}:${(nextBlockMins % 60).toString().padStart(2, '0')}`;

                    const percentage = Math.min(100, Math.max(5, (minutesFree / 480) * 100));

                    return { ...b, minutesFree, limitTime, percentage };
                  }).sort((a, b) => b.minutesFree - a.minutesFree).slice(0, 5);

                  if (availableNowList.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center h-full text-center py-6 opacity-60">
                        <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
                          <Clock size={16} className="text-zinc-600" />
                        </div>
                        <h4 className="text-zinc-400 font-bold text-[10px] mb-1">Nenhum profissional</h4>
                        <p className="text-zinc-600 text-[9px] max-w-[130px] leading-relaxed">Todos ocupados ou fora do expediente</p>
                      </div>
                    );
                  }

                  return availableNowList.map((barber) => {
                    // Calculate freeUntil Date from limitTime
                    const [limitHour, limitMin] = barber.limitTime.split(':').map(Number);
                    const freeUntilDate = new Date();
                    freeUntilDate.setHours(limitHour, limitMin, 0, 0);

                    return (
                      <div
                        key={barber.id}
                        onClick={() => {
                          setQuickBookingProfessional(barber);
                          setQuickBookingFreeUntil(freeUntilDate);
                          setIsQuickBookingOpen(true);
                        }}
                        className="relative bg-zinc-900/50 rounded-lg overflow-hidden cursor-pointer group transition-all hover:bg-zinc-800/60 active:scale-[0.98] border border-zinc-800"
                      >
                        {/* Green Left Border */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />

                        {/* Content */}
                        <div className="pl-3 pr-2 py-2">
                          <div className="flex items-center gap-2">
                            {/* Avatar */}
                            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                              {barber.avatar ? (
                                <img src={barber.avatar} className="w-full h-full object-cover" alt={barber.name} />
                              ) : (
                                <span className="text-[9px] font-bold text-zinc-400">{barber.name?.[0]?.toUpperCase()}</span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="font-bold text-white text-[11px] truncate">{barber.name}</h4>
                                <span className="text-[8px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">Livre</span>
                              </div>
                              <div className="flex items-center gap-1 text-[9px] text-zinc-500">
                                <span>Até {barber.limitTime}</span>
                                <span>•</span>
                                <span>{barber.minutesFree} min livres</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* === MAIN CALENDAR AREA === */}
      <div className={`flex-1 flex flex-col bg-zinc-950 lg:border-l border-zinc-700 overflow-hidden shadow-2xl relative h-full w-full min-w-0 ${isFocusMode ? 'lg:border-0 w-full' : ''}`}>

        {/* === HEADER PRINCIPAL === */}
        <div className="bg-zinc-900 p-3 shrink-0 z-20 space-y-3 border-b border-zinc-700 shadow-md">

          {/* LINHA 1: Controles Superiores */}
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-3">

            {/* ESQUERDA: Navegação e Data */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden p-1.5 bg-zinc-950 border border-zinc-700 rounded-md text-zinc-400 hover:text-white"
              >
                <CalendarIcon size={16} />
              </button>

              {/* Nav Buttons */}
              <div className="flex items-center bg-zinc-950 rounded-lg p-0.5 border border-zinc-700 shadow-inner shrink-0">
                <button onClick={handlePrevDay} className="px-2 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"><ChevronLeft size={16} /></button>
                <button onClick={handleToday} className="px-3 py-1.5 text-[10px] font-extrabold text-white uppercase hover:bg-zinc-800 rounded transition-colors tracking-wide">HOJE</button>
                <button onClick={handleNextDay} className="px-2 py-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"><ChevronRight size={16} /></button>
              </div>

              {/* Data Principal */}
              <div className="flex items-baseline gap-2 whitespace-nowrap">
                <div className="text-lg font-black text-white capitalize leading-none tracking-tight">
                  {viewMode === 'day' && format(currentDate, "EEEE, d", { locale: ptBR })}
                  {viewMode === 'week' && `Semana ${format(subDays(currentDate, 6), 'd')} - ${format(currentDate, 'd MMM', { locale: ptBR })}`}
                  {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                </div>
                <span className="text-zinc-500 text-xs font-medium">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</span>
              </div>
            </div>

            {/* DIREITA: Filtros e Ações */}
            <div className="flex flex-nowrap items-center gap-2 lg:ml-auto overflow-x-auto no-scrollbar">

              {/* View Switcher */}
              <div className="flex bg-zinc-950 rounded-lg p-0.5 border border-zinc-700 shrink-0 shadow-inner">
                {(['day', 'week', 'month'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${viewMode === mode
                      ? 'bg-zinc-800 text-white shadow-sm border border-zinc-600'
                      : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                      }`}
                  >
                    {mode === 'day' ? 'Dia' : mode === 'week' ? 'Sem' : 'Mês'}
                  </button>
                ))}
              </div>

              {/* Filtro Profissional */}
              <div className="relative shrink-0">
                <select
                  value={selectedBarberId}
                  onChange={(e) => setSelectedBarberId(e.target.value)}
                  className="w-auto min-w-[140px] appearance-none bg-zinc-950 text-white text-[11px] font-medium pl-7 pr-3 py-2 rounded-lg border border-zinc-700 outline-none hover:border-zinc-600 cursor-pointer transition-all focus:border-amber-500 shadow-sm h-9 text-left"
                >
                  <option value="all">Todos Profissionais</option>
                  {barbers.filter(b => showInactive ? true : b.is_active !== false).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <div className="absolute left-2.5 top-0 bottom-0 flex items-center pointer-events-none">
                  <Filter size={14} className="text-zinc-500" />
                </div>
              </div>

              {/* Divisor Vertical */}
              <div className="hidden lg:block w-px h-6 bg-zinc-700 mx-1 shrink-0"></div>

              {/* Grupo de Ações */}
              <div className="flex items-center gap-2 shrink-0">
                {setFocusMode && (
                  <button
                    onClick={() => setFocusMode(!isFocusMode)}
                    className={`w-9 h-9 flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all shrink-0 hover:bg-zinc-900 ${isFocusMode ? 'text-white border-zinc-600 shadow-inner bg-zinc-800' : ''}`}
                    title={isFocusMode ? 'Sair do modo foco' : 'Expandir'}
                  >
                    {isFocusMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                )}

                <button
                  onClick={() => setShowInactive(!showInactive)}
                  className={`flex items-center gap-1.5 px-3 h-9 bg-zinc-950 rounded-lg border border-zinc-700 text-[10px] font-bold transition-all shrink-0 hover:bg-zinc-900 ${showInactive ? 'text-white border-zinc-600 shadow-inner bg-zinc-800' : 'text-zinc-500'}`}
                >
                  {showInactive ? <Eye size={14} /> : <EyeOff size={14} />}
                  <span className="hidden sm:inline">Inativos</span>
                </button>

                <Button
                  onClick={() => handleOpenNewAppointment()}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold h-9 px-4 text-xs rounded-lg shadow-[0_0_10px_rgba(245,158,11,0.2)] hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] shrink-0 transition-all active:scale-95"
                  leftIcon={<Plus size={16} />}
                >
                  NOVO
                </Button>
              </div>
            </div>
          </div>

          {/* LINHA 2: Métricas */}
          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 border-t border-zinc-700 pt-3 transition-all ${isFocusMode ? 'hidden' : ''}`}>
            {/* Card Agendamentos */}
            <div className="bg-zinc-950 rounded-lg p-2.5 flex items-center gap-3 border border-zinc-700 shadow-inner">
              <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shrink-0">
                <CalendarIcon size={16} />
              </div>
              <div>
                <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Agendamentos</div>
                <div className="text-white font-black text-sm leading-none">
                  {periodStats.count}
                </div>
              </div>
            </div>

            {/* Card Faturamento */}
            <div className="bg-zinc-950 rounded-lg p-2.5 flex items-center gap-3 border border-zinc-700 shadow-inner">
              <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shrink-0">
                <Banknote size={16} />
              </div>
              <div>
                <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Faturamento</div>
                <div className="text-white font-black text-sm leading-none">
                  R$ {periodStats.revenue.toFixed(0)}
                </div>
              </div>
            </div>

            {/* Card Ocupação */}
            <div className="bg-zinc-950 rounded-lg p-2.5 flex items-center gap-3 border border-zinc-700 shadow-inner">
              <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                <TrendingUp size={16} />
              </div>
              <div>
                <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Ocupação</div>
                <div className="text-white font-black text-sm leading-none">
                  {periodStats.occupancy}%
                </div>
              </div>
            </div>
          </div>

          {/* LINHA 3: Legenda */}
          <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-zinc-500 border-t border-zinc-700 pt-2 ${isFocusMode ? 'hidden' : ''}`}>
            <div className="flex items-center gap-1 font-bold uppercase text-white tracking-wider">
              <Info size={10} className="text-amber-500" /> Legenda
            </div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-emerald-500"></div> Confirmado</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-amber-500"></div> Pendente</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-zinc-600"></div> Concluído</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-rose-500/50 border border-rose-500"></div> Cancelado</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-zinc-800 border border-zinc-600"></div> Bloqueado</div>
          </div>
        </div>

        {/* SCROLLABLE GRID AREA */}
        <div
          className="flex-1 overflow-y-auto overflow-x-auto relative scroll-smooth bg-black custom-scrollbar w-full min-w-0"
          ref={scrollRef}
          onScroll={handleTimelineScroll}
        >
          {viewMode === 'month' ? (
            <div className="p-4 grid grid-cols-7 gap-px bg-zinc-800 border border-zinc-700">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="bg-zinc-900 py-3 text-center text-xs font-bold text-zinc-500 uppercase tracking-wider">{day}</div>
              ))}
              {calendarDays.map((day, idx) => {
                const dayAppts = appointments.filter(a => isSameDay(fromUTC(a.date || a.start_datetime), day)); // Handle both data formats
                const isCurrentMonth = isSameMonth(day, miniCalendarMonth);
                return (
                  <div
                    key={idx}
                    onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                    className={`min-h-[120px] bg-zinc-950 p-2 flex flex-col gap-1 cursor-pointer transition-colors hover:bg-zinc-900 ${!isCurrentMonth ? 'opacity-30' : ''}`}
                  >
                    <span className={`text-xs font-bold mb-2 w-7 h-7 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-amber-500 text-black shadow-lg' : 'text-zinc-500'}`}>{format(day, 'd')}</span>
                    {dayAppts.slice(0, 3).map(apt => (
                      <div key={apt.id} className="text-[10px] bg-zinc-800 rounded-sm px-1.5 py-1 text-white truncate border-l-2 border-amber-500 shadow-sm mb-0.5">
                        <span className="font-bold mr-1">{apt.time ? apt.time : format(fromUTC(apt.start_datetime), 'HH:mm')}</span> {apt.clientName || apt.customer_name}
                      </div>
                    ))}
                    {dayAppts.length > 3 && <div className="text-[9px] text-zinc-500 text-center font-bold">+{dayAppts.length - 3} mais</div>}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="w-full relative">
              {/* ===== STICKY HEADER WITH GLASSMORPHISM ===== */}
              <div
                ref={headerRef}
                className="sticky top-0 z-40 backdrop-blur-md bg-zinc-900/80 border-b border-white/10 grid shadow-2xl"
                style={{
                  gridTemplateColumns: getGridTemplate(),
                  minWidth: `calc(60px + ${visibleBarbers.length * MIN_COLUMN_WIDTH}px)`
                }}
              >
                {/* Corner Cell - Shows clock icon */}
                <div className="border-r border-white/10 h-12 flex items-center justify-center backdrop-blur-md bg-zinc-950/80 sticky left-0 z-50">
                  <Clock size={14} className="text-amber-500" />
                </div>

                {/* Headers */}
                {viewMode === 'day' ? (
                  visibleBarbers.map(barber => {
                    const isAvailable = isProfessionalWorkingAt(barber.id, format(currentTime, 'HH:mm'));
                    return (
                      <div key={barber.id} className="h-12 px-2 flex items-center justify-center gap-1.5 border-r border-white/10 hover:bg-white/5 transition-colors backdrop-blur-md bg-zinc-900/60 min-w-0">
                        <div className="relative shrink-0">
                          {barber.avatar ? <img src={barber.avatar} className="w-6 h-6 rounded-full object-cover border border-zinc-600 shadow-sm" /> : <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center border border-zinc-600"><span className="text-white font-bold text-[10px]">{barber.name[0]}</span></div>}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 border-[1.5px] border-zinc-800 rounded-full ${isAvailable ? 'bg-green-500' : 'bg-zinc-500'}`}></div>
                        </div>
                        <div className="overflow-hidden min-w-0 flex-1">
                          <div className="font-semibold text-sm text-white truncate">{barber.name}</div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  currentWeekDays.map((day, i) => (
                    <div key={i} className={`h-12 flex flex-col items-center justify-center border-r border-zinc-700 bg-zinc-800 ${isSameDay(day, currentDate) ? 'bg-zinc-700' : ''}`}>
                      <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">{format(day, 'EEE', { locale: ptBR })}</span>
                      <span className={`text-lg font-black ${isSameDay(day, currentDate) ? 'text-amber-500' : 'text-white'}`}>{format(day, 'd')}</span>
                    </div>
                  ))
                )}
              </div>

              {/* ===== TIMELINE BODY START ===== */}
              <div style={{ minWidth: `calc(60px + ${visibleBarbers.length * MIN_COLUMN_WIDTH}px)` }}>
                {timeSlots.map((timeSlot) => {
                  // timeSlot is now a string like "09:00", "09:30", etc.
                  const timeString = timeSlot;
                  const isPast = isTimeSlotPast(timeString);
                  const [slotHour, slotMinute] = timeString.split(':').map(Number);

                  // ===== SLOT ROW - One row per time slot =====
                  return (
                    <div
                      key={timeSlot}
                      className="grid relative group w-full"
                      style={{ gridTemplateColumns: getGridTemplate(), minHeight: `${SLOT_HEIGHT_PX}px` }}
                    >
                      {/* Time Label Column - sticky left for horizontal scroll */}
                      <div className={`border-r border-b border-zinc-800 bg-zinc-900 flex items-start justify-center pt-2 text-[10px] sm:text-xs font-bold transition-colors sticky left-0 z-30 ${isPast ? 'text-zinc-600' : 'text-zinc-300'}`}>
                        {timeString}
                      </div>

                      {/* Professional Slot Columns - one per professional */}
                      {viewMode === 'day' ? (
                        visibleBarbers.map((barber) => {
                          // Filter appointments that overlap with this time slot
                          const slotAppointments = appointments.filter(a => {
                            const profId = a.professional_id || a.barberId;
                            if (profId !== barber.id) return false;

                            // IMPORTANT: Convert from UTC to Brazil timezone before comparison
                            const d = a.start_datetime ? fromUTC(a.start_datetime) : (a.date ? fromUTC(a.date) : null);
                            if (!d || !isSameDay(d, currentDate)) return false;

                            const aptMinutes = d.getHours() * 60 + d.getMinutes();
                            const slotMinutes = slotHour * 60 + slotMinute;
                            const slotInterval = globalBufferMinutes || 30;

                            // Check if appointment starts within this slot interval
                            // Slot 18:00 with 30min buffer = accepts 18:00 to 18:29
                            return aptMinutes >= slotMinutes && aptMinutes < slotMinutes + slotInterval;
                          });

                          const activeApt = slotAppointments.find(a => a.status !== 'cancelled');
                          const cancelledApt = slotAppointments.find(a => a.status === 'cancelled');
                          const hasCancelledWithFreeSlot = !activeApt && cancelledApt;
                          const block = getBlockForSlot(barber.id, timeString);
                          const isInactive = barber.is_active === false;
                          const isNotWorking = !isProfessionalWorkingAt(barber.id, timeString);
                          const isInBreak = isSlotInBreak(barber.id, timeString);

                          // Slot is truly available only if: not past, no appointment, no block, professional is active, working, and not on break
                          const isUnavailable = isPast || activeApt || block || isInactive || isNotWorking || isInBreak;
                          const isFree = !isUnavailable && !cancelledApt;
                          const isDimmed = highlightFreeSlots && !isFree && !hasCancelledWithFreeSlot;

                          return (
                            <div
                              key={barber.id}
                              className={`relative border-r border-b transition-all 
                              ${isPast || isNotWorking || isInBreak
                                  ? 'bg-zinc-800/40 border-zinc-700/50 cursor-not-allowed'
                                  : 'bg-zinc-950 border-zinc-800 hover:bg-zinc-900/80 cursor-pointer'
                                }
                              ${!isUnavailable && !cancelledApt ? 'shadow-[inset_0_0_20px_rgba(0,0,0,0.3)]' : ''}
                              ${highlightFreeSlots && isFree ? 'bg-zinc-800/80 ring-1 ring-inset ring-emerald-500/20' : ''}
                              ${isDimmed ? 'opacity-20 grayscale brightness-50' : ''}
                              ${draggedAppointment && !isPast && !block && !isNotWorking && !isInBreak ? 'ring-2 ring-amber-500/30' : ''}
                              group/cell`}
                              style={{ height: `${SLOT_HEIGHT_PX}px` }}
                              onDragOver={!isUnavailable ? handleSlotDragOver : undefined}
                              onDrop={!isUnavailable ? (e) => handleSlotDrop(e, barber.id, timeString) : undefined}
                            >

                              {/* Background Pattern for Available Slots */}
                              {!isUnavailable && !cancelledApt && (
                                <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]"></div>
                              )}

                              {/* Full slot available (no cancelled) */}
                              {!isUnavailable && !cancelledApt && (
                                <div
                                  className="absolute inset-1 flex items-center justify-center opacity-0 group-hover/cell:opacity-100 transition-all z-10 border border-dashed border-[var(--brand-primary)]/50 rounded-lg cursor-pointer bg-[var(--brand-primary)]/5"
                                  onClick={() => handleOpenNewAppointment(timeString, barber.id)}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
                                      <Plus size={12} className="text-black" />
                                    </div>
                                    <span className="text-[9px] font-medium text-[var(--brand-primary)] uppercase tracking-wide">Agendar</span>
                                  </div>
                                </div>
                              )}

                              {/* Split slot: Cancelled on left + Available/Active on right */}
                              {cancelledApt && (() => {
                                const cancelledService = (cancelledApt as any).service || services.find(s => s.id === cancelledApt.service_id);
                                const cancelledTime = cancelledApt.start_datetime ? format(fromUTC(cancelledApt.start_datetime), 'HH:mm') : timeString;
                                const cancelledClientName = cancelledApt.customer_name || (cancelledApt as any).clientName || 'Cliente';

                                return (
                                  <div className="absolute inset-1 flex gap-1">
                                    {/* Cancelled appointment (left half - 50%) */}
                                    <div
                                      className="w-1/2 rounded-lg bg-red-500/10 border-l-4 border-l-red-400 p-2 flex flex-col overflow-hidden opacity-60 cursor-pointer"
                                      onClick={() => handleOpenDetails(cancelledApt)}
                                    >
                                      <div className="flex items-start justify-between mb-0.5">
                                        <div className="font-bold text-[10px] text-white/70 truncate flex-1 leading-tight line-through">
                                          {cancelledClientName}
                                        </div>
                                        <X size={10} className="text-red-400 shrink-0" />
                                      </div>
                                      <div className="text-[9px] text-red-400/70 truncate mb-auto">
                                        {cancelledService?.name || 'Cancelado'}
                                      </div>
                                      <div className="flex items-center gap-1 text-zinc-500 mt-1">
                                        <Clock size={9} />
                                        <span className="text-[8px] font-medium">{cancelledTime}</span>
                                      </div>
                                    </div>

                                    {/* Right half: Active appointment OR Available slot */}
                                    {activeApt ? (() => {
                                      const service = (activeApt as any).service || services.find(s => s.id === activeApt.service_id);
                                      const aptStartDate = activeApt.start_datetime ? fromUTC(activeApt.start_datetime) : getNowInBrazil();
                                      const aptTime = format(aptStartDate, 'HH:mm');
                                      const durationMins = service?.duration || 30;
                                      const aptEndDate = new Date(aptStartDate.getTime() + durationMins * 60 * 1000);
                                      const aptEndTime = format(aptEndDate, 'HH:mm');
                                      const clientName = activeApt.customer_name || (activeApt as any).clientName || 'Cliente';

                                      const bgColors: Record<string, string> = {
                                        confirmed: 'bg-emerald-500/15',
                                        pending: 'bg-amber-500/15',
                                        completed: 'bg-zinc-700/60',
                                        awaiting_payment: 'bg-amber-500/10',
                                      };
                                      const bgColor = bgColors[activeApt.status] || 'bg-zinc-800/80';

                                      const borderColors: Record<string, string> = {
                                        confirmed: 'border-l-emerald-400',
                                        pending: 'border-l-amber-400',
                                        completed: 'border-l-zinc-400',
                                        awaiting_payment: 'border-l-amber-400',
                                      };
                                      const borderColor = borderColors[activeApt.status] || 'border-l-zinc-500';

                                      // Time badge styles for split slot
                                      const timeBadge = activeApt.status === 'confirmed'
                                        ? { bg: 'bg-[#0d3320]', text: 'text-emerald-400', icon: 'check' as const }
                                        : { bg: 'bg-[#422006]', text: 'text-amber-400', icon: 'clock' as const };

                                      return (
                                        <div
                                          className={`w-1/2 rounded-lg ${bgColor} border-l-4 ${borderColor} p-2 cursor-pointer hover:brightness-110 transition-all overflow-hidden flex flex-col`}
                                          onClick={() => handleOpenDetails(activeApt)}
                                        >
                                          <div className="font-bold text-[10px] text-white truncate leading-tight">
                                            {clientName}
                                          </div>
                                          <div className="text-[9px] text-zinc-400 truncate mb-auto">
                                            {service?.name || 'Serviço'}
                                          </div>
                                          <div className="mt-1">
                                            <div className={`inline-flex items-center gap-0.5 ${timeBadge.bg} px-1 py-0.5 rounded`}>
                                              {timeBadge.icon === 'check' ? (
                                                <CheckCircle2 size={8} className={timeBadge.text} />
                                              ) : (
                                                <Clock size={8} className={timeBadge.text} />
                                              )}
                                              <span className={`text-[7px] font-bold ${timeBadge.text}`}>
                                                {aptTime}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })() : !isUnavailable && (
                                      <div
                                        className="w-1/2 rounded-lg border-2 border-dashed border-emerald-500/50 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-500/10 transition-all"
                                        onClick={() => handleOpenNewAppointment(timeString, barber.id)}
                                      >
                                        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg mb-1">
                                          <Plus size={16} className="text-black" />
                                        </div>
                                        <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">Novo</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Full-width active appointment (only when NO cancelled) */}
                              {activeApt && !cancelledApt && (() => {
                                const service = (activeApt as any).service || services.find(s => s.id === activeApt.service_id);
                                const aptStartDate = activeApt.start_datetime ? fromUTC(activeApt.start_datetime) : getNowInBrazil();
                                const aptTime = format(aptStartDate, 'HH:mm');
                                const durationMins = service?.duration || 30;
                                const aptEndDate = new Date(aptStartDate.getTime() + durationMins * 60 * 1000);
                                const aptEndTime = format(aptEndDate, 'HH:mm');
                                const clientName = activeApt.customer_name || (activeApt as any).clientName || 'Cliente';
                                const professional = barbers.find(b => b.id === activeApt.professional_id);
                                const profInitial = professional?.name?.charAt(0).toUpperCase() || 'P';

                                // Background colors based on status - very light/transparent
                                const bgColors: Record<string, string> = {
                                  confirmed: 'bg-emerald-500/15',
                                  pending: 'bg-amber-500/15',
                                  completed: 'bg-zinc-700/60',
                                  awaiting_payment: 'bg-amber-500/10',
                                  cancelled: 'bg-red-500/10',
                                };
                                const bgColor = bgColors[activeApt.status] || 'bg-zinc-800/80';

                                // Border colors for left accent
                                const borderColors: Record<string, string> = {
                                  confirmed: 'border-l-emerald-400',
                                  pending: 'border-l-amber-400',
                                  completed: 'border-l-zinc-400',
                                  awaiting_payment: 'border-l-amber-400',
                                  cancelled: 'border-l-red-400',
                                };
                                const borderColor = borderColors[activeApt.status] || 'border-l-zinc-500';

                                // Avatar colors
                                const avatarColors: Record<string, string> = {
                                  confirmed: 'bg-emerald-500 text-white',
                                  pending: 'bg-zinc-600 text-zinc-300',
                                  completed: 'bg-zinc-500 text-white',
                                  awaiting_payment: 'bg-amber-500 text-black',
                                  cancelled: 'bg-red-500 text-white',
                                };
                                const avatarColor = avatarColors[activeApt.status] || 'bg-zinc-600 text-zinc-300';

                                // Time badge styles based on status (matching reference images)
                                const timeBadgeStyles: Record<string, { bg: string; text: string; icon: 'check' | 'clock' }> = {
                                  confirmed: { bg: 'bg-[#0d3320]', text: 'text-emerald-400', icon: 'check' },
                                  pending: { bg: 'bg-[#422006]', text: 'text-amber-400', icon: 'clock' },
                                  completed: { bg: 'bg-zinc-800', text: 'text-zinc-400', icon: 'check' },
                                  awaiting_payment: { bg: 'bg-[#422006]', text: 'text-amber-400', icon: 'clock' },
                                  cancelled: { bg: 'bg-red-900/50', text: 'text-red-400', icon: 'clock' },
                                };
                                const timeBadge = timeBadgeStyles[activeApt.status] || { bg: 'bg-zinc-800', text: 'text-zinc-400', icon: 'clock' };

                                return (
                                  <div
                                    className={`absolute inset-1 rounded-lg ${bgColor} border-l-4 ${borderColor} p-1.5 sm:p-2 cursor-grab active:cursor-grabbing hover:brightness-110 transition-all overflow-hidden flex flex-col gap-0.5`}
                                    onClick={() => handleOpenDetails(activeApt)}
                                    draggable={activeApt.status !== 'completed'}
                                    onDragStart={(e) => handleAppointmentDragStart(e, activeApt)}
                                    onDragEnd={handleAppointmentDragEnd}
                                  >
                                    {/* Top: Client name + Payment icon */}
                                    <div className="flex items-start justify-between gap-1 shrink-0">
                                      <div className="font-bold text-[11px] sm:text-xs text-white truncate flex-1 leading-tight">
                                        {clientName}
                                      </div>
                                      <div className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded flex items-center justify-center shrink-0 ${activeApt.payment_status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                        <DollarSign size={7} className="text-black" />
                                      </div>
                                    </div>

                                    {/* Service name - always show */}
                                    <div className="text-[9px] sm:text-[10px] text-zinc-400 truncate flex-1 min-h-[12px]">
                                      {service?.name || 'Serviço'}
                                    </div>

                                    {/* Footer: Time Badge - shrink-0 to not overlap */}
                                    <div className="shrink-0">
                                      <div className={`inline-flex items-center gap-1 ${timeBadge.bg} px-1.5 py-0.5 rounded`}>
                                        {timeBadge.icon === 'check' ? (
                                          <CheckCircle2 size={10} className={timeBadge.text} />
                                        ) : (
                                          <Clock size={10} className={timeBadge.text} />
                                        )}
                                        <span className={`text-[9px] font-bold ${timeBadge.text}`}>
                                          {aptTime} até {aptEndTime}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Professional Break/Pause slot - Subtle diagonal stripes */}
                              {isInBreak && !activeApt && !cancelledApt && !block && (
                                <div className="absolute inset-0 overflow-hidden bg-zinc-800/40">
                                  {/* Subtle diagonal stripes */}
                                  <div
                                    className="absolute inset-0 opacity-20"
                                    style={{
                                      background: 'repeating-linear-gradient(135deg, transparent, transparent 6px, rgba(63, 63, 70, 0.5) 6px, rgba(63, 63, 70, 0.5) 12px)',
                                    }}
                                  />

                                  {/* Small centered PAUSA badge */}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="inline-flex items-center gap-1.5 bg-zinc-800/80 border border-zinc-600/50 rounded-full px-2.5 py-1">
                                      {/* Pause icon */}
                                      <div className="w-4 h-4 rounded-full border border-amber-500/70 flex items-center justify-center">
                                        <div className="flex gap-[2px]">
                                          <div className="w-[2px] h-1.5 bg-amber-500/80 rounded-sm" />
                                          <div className="w-[2px] h-1.5 bg-amber-500/80 rounded-sm" />
                                        </div>
                                      </div>
                                      <span className="text-zinc-400 text-[10px] font-medium uppercase tracking-wide">Pausa</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {block && (() => {
                                const professional = barbers.find(b => b.id === block.professional_id);
                                const blockStartTime = block.start_datetime ? format(fromUTC(block.start_datetime), 'HH:mm') : timeString;
                                const blockEndTime = block.end_datetime ? format(fromUTC(block.end_datetime), 'HH:mm') : '';

                                return (
                                  <div
                                    className="absolute inset-1 rounded-lg bg-amber-900/30 border-l-4 border-l-amber-500 p-2 sm:p-3 z-20 flex flex-col overflow-hidden cursor-pointer hover:brightness-110 transition-all"
                                    onClick={() => handleOpenBlockDetails(block)}
                                  >
                                    {/* Dot pattern background */}
                                    <div className="absolute inset-0 opacity-30" style={{
                                      backgroundImage: 'radial-gradient(circle, rgba(251,191,36,0.4) 1px, transparent 1px)',
                                      backgroundSize: '8px 8px'
                                    }}></div>

                                    {/* Content */}
                                    <div className="relative z-10 flex flex-col h-full">
                                      {/* Title */}
                                      <div className="font-bold text-xs sm:text-sm text-amber-400 truncate">
                                        {block.reason || 'Pausa'}
                                      </div>
                                      <div className="text-[10px] sm:text-[11px] text-amber-500/70 truncate mb-auto">
                                        Bloqueio de Agenda
                                      </div>

                                      {/* Footer: Time range (left) + Professional (right - hidden on mobile) */}
                                      <div className="flex items-center justify-between mt-1 sm:mt-2 pt-1">
                                        <div className="flex items-center gap-1 text-zinc-400">
                                          <Clock size={10} className="sm:hidden" />
                                          <Clock size={11} className="hidden sm:block" />
                                          <span className="text-[9px] sm:text-[10px] font-medium">{blockStartTime}{blockEndTime ? ` às ${blockEndTime} ` : ''}</span>
                                        </div>
                                        <span className="hidden sm:block text-[10px] text-zinc-400 truncate">
                                          {professional?.name || 'Profissional'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          )
                        })
                      ) : (
                        currentWeekDays.map((day, idx) => (
                          <div key={idx} className={`relative border-r border-b border-zinc-800 bg-black ${isSameDay(day, currentDate) ? 'bg-zinc-900/10' : ''}`}>

                          </div>
                        ))
                      )}
                    </div>
                  );
                })}



                {/* ===== FIM DE EXPEDIENTE FOOTER ===== */}
                {viewMode !== 'month' && businessHoursForDay && (
                  <div className="flex items-center justify-center gap-2 py-2 px-3 border-t border-zinc-800 bg-zinc-950/80 sticky left-0">
                    <Store size={12} className="text-zinc-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">Fim de Expediente</span>
                    <span className="text-[10px] text-zinc-600">•</span>
                    <span className="text-xs font-bold text-white">{businessHoursForDay.close}</span>
                  </div>
                )}
                {/* ===== END FIM DE EXPEDIENTE FOOTER ===== */}
              </div>

              {/* ===== CURRENT TIME INDICATOR ===== */}
              {/* Uses calculated width to span full scrollable grid content */}
              {isSameDay(currentDate, getNowInBrazil()) && timeIndicator && (
                <div
                  className="absolute z-30 pointer-events-none flex items-center"
                  style={{
                    // Position already includes header offset from getCurrentTimePosition
                    top: `${timeIndicator.position}px`,
                    left: 0,
                    // Width: 100% of viewport OR calculated grid width, whichever is larger
                    width: '100%',
                    minWidth: `calc(60px + ${visibleBarbers.length * MIN_COLUMN_WIDTH}px)`
                  }}
                >
                  {/* Sticky time badge - stays visible when scrolling */}
                  <div
                    className="sticky left-0 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-r-md shadow-md z-50 flex items-center gap-1 shrink-0"
                  >
                    <Clock size={10} className="text-white animate-pulse" />
                    {timeIndicator.time}
                  </div>
                  {/* Line extends full width of grid */}
                  <div className="h-[2px] bg-red-600 flex-1 shadow-sm opacity-80"></div>
                </div>
              )}
              {/* ===== END CURRENT TIME INDICATOR ===== */}

            </div>
          )}
        </div>

        {
          isAppointmentModalOpen && (
            <ManualBookingModal
              isOpen={isAppointmentModalOpen}
              onClose={() => setIsAppointmentModalOpen(false)}
              selectedDate={currentDate}
              selectedTime={selectedSlotTime || '09:00'}
              professional={selectedProfessional || barbers[0]}
              onSuccess={handleModalSuccess}
            />
          )
        }

        {
          activeCommandApp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-zinc-900 text-white p-4 rounded-xl">Command Modal Placeholder</div>
            </div>
          )
        }

        {
          isDetailsModalOpen && selectedAppointment && businessId && (
            <AppointmentModal
              isOpen={isDetailsModalOpen}
              onClose={() => setIsDetailsModalOpen(false)}
              appointment={selectedAppointment}
              onUpdate={handleModalSuccess}
              professionals={barbers}
              services={services}
              businessId={businessId}
              onReschedule={handleReschedule}
            />
          )
        }

        {/* Block Details Modal */}
        {
          isBlockModalOpen && selectedBlock && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-amber-900/30 px-6 py-4 border-b border-amber-500/30">
                  <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                    <Lock className="text-amber-500" size={20} />
                    Detalhes do Bloqueio
                  </h3>
                  <p className="text-xs text-amber-500/70 mt-1">
                    {selectedBlock.start_datetime ? format(fromUTC(selectedBlock.start_datetime), "EEEE, d 'de' MMMM • HH:mm", { locale: ptBR }) : ''}
                  </p>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Motivo do Bloqueio</label>
                    <div className="text-white font-bold">{selectedBlock.reason || 'Bloqueio manual'}</div>
                  </div>

                  <div className="bg-zinc-800 rounded-lg p-4">
                    <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Profissional</label>
                    <div className="text-white">{barbers.find(b => b.id === selectedBlock.professional_id)?.name || 'Todos'}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-800 rounded-lg p-3">
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Início</label>
                      <div className="text-white text-sm font-bold">
                        {selectedBlock.start_datetime ? format(fromUTC(selectedBlock.start_datetime), 'HH:mm') : '--:--'}
                      </div>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-3">
                      <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Fim</label>
                      <div className="text-white text-sm font-bold">
                        {selectedBlock.end_datetime ? format(fromUTC(selectedBlock.end_datetime), 'HH:mm') : '--:--'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-zinc-700 flex gap-2">
                  <button
                    onClick={() => {
                      setIsBlockModalOpen(false);
                      setSelectedBlock(null);
                    }}
                    className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2.5 rounded-lg font-bold text-sm transition-colors"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => {
                      handleUnblockSlot(selectedBlock.id);
                    }}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Unlock size={16} />
                    Remover Bloqueio
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {
          isQuickBookingOpen && quickBookingProfessional && (
            <QuickBookingModal
              isOpen={isQuickBookingOpen}
              onClose={() => setIsQuickBookingOpen(false)}
              onSuccess={() => {
                setIsQuickBookingOpen(false);
                handleModalSuccess();
              }}
              selectedDate={getNowInBrazil()}
              selectedTime={getCurrentTimeBrazil()}
              professional={quickBookingProfessional}
              freeUntil={quickBookingFreeUntil || undefined}
            />
          )
        }

        {/* Drag & Drop Confirmation Modal */}
        {
          isDragConfirmOpen && pendingDrop && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-zinc-800 px-6 py-4 border-b border-zinc-700">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <CalendarIcon className="text-amber-500" size={20} />
                    Confirmar Reagendamento
                  </h3>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Client Info */}
                  <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Cliente</div>
                    <div className="text-white font-bold">
                      {pendingDrop.appointment.customer_name || (pendingDrop.appointment as any).clientName || 'Cliente'}
                    </div>
                    <div className="text-sm text-amber-500">
                      {services.find(s => s.id === pendingDrop.appointment.service_id)?.name || 'Serviço'}
                    </div>
                  </div>

                  {/* Change Details */}
                  <div className="flex items-center gap-3">
                    {/* From */}
                    <div className="flex-1 bg-zinc-800 rounded-lg p-3 border border-zinc-700">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">De</div>
                      <div className="text-sm text-white font-medium">
                        {barbers.find(b => b.id === pendingDrop.appointment.professional_id)?.name || 'Profissional'}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {pendingDrop.appointment.start_datetime
                          ? format(fromUTC(pendingDrop.appointment.start_datetime), 'HH:mm')
                          : '--:--'}
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="text-amber-500">
                      <ChevronRight size={24} />
                    </div>

                    {/* To */}
                    <div className="flex-1 bg-emerald-900/30 rounded-lg p-3 border border-emerald-800">
                      <div className="text-[10px] text-emerald-500 uppercase tracking-wider mb-1">Para</div>
                      <div className="text-sm text-white font-medium">
                        {barbers.find(b => b.id === pendingDrop.targetProfessionalId)?.name || 'Profissional'}
                      </div>
                      <div className="text-xs text-emerald-400">
                        {pendingDrop.targetTime}
                      </div>
                    </div>
                  </div>

                  {/* Date info */}
                  <div className="text-center text-sm text-zinc-500">
                    {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </div>
                </div>

                {/* Footer */}
                <div className="bg-zinc-800 px-6 py-4 border-t border-zinc-700 flex gap-3">
                  <button
                    onClick={cancelDrop}
                    className="flex-1 px-4 py-2.5 border border-zinc-600 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmDrop}
                    className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )
        }

      </div >
    </div >
  );
};

export default Calendar;
