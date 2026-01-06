
import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock,
  Filter,
  Calendar as CalendarIcon,
  TrendingUp,
  Zap,
  Banknote,
  X,
  Info,
  User,
  Maximize2,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  Trash2,
  ShoppingBag,
  Receipt,
  AlertOctagon,
  Coffee,
  Scissors,
  FileText,
  GripHorizontal,
  UserX,
  MessageCircle,
  Globe,
  Heart,
  Calculator,
  Percent,
  Coins,
  CreditCard,
  Wallet
} from 'lucide-react';
import { 
  format, 
  addDays, 
  subDays, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  startOfMonth, 
  endOfMonth, 
  isSameMonth,
  addWeeks,
  subWeeks,
  isBefore
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Barber, Service, Product, Client, SystemSettings, Appointment, Status, ConsumptionItem } from '../types';
import Button from './ui/Button';
import Select from './ui/Select';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Card from './ui/Card';
import Switch from './ui/Switch';
import Badge from './ui/Badge';
import { useToast } from './ui/Toast';

interface CalendarProps {
  barbers: Barber[];
  services: Service[];
  products: Product[];
  clients: Client[];
  settings: SystemSettings;
}

type ViewMode = 'day' | 'week' | 'month';

// Mock initial data
const initialAppointmentsMock: Appointment[] = [
    {
      id: '1',
      clientName: 'Ana Silva',
      barberId: '1',
      serviceId: '1',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '09:00',
      status: Status.COMPLETED,
      hasDeposit: false,
      consumption: []
    },
    {
      id: '2',
      clientName: 'Carlos Oliveira',
      barberId: '2',
      serviceId: '2',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '14:00',
      status: Status.CONFIRMED,
      hasDeposit: true,
      consumption: []
    },
    {
      id: '3',
      clientName: 'Ana Silva', // Same client later
      barberId: '2',
      serviceId: '2', // Another service
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '11:00',
      status: Status.PENDING,
      hasDeposit: false,
      consumption: []
    }
];

interface PaymentPart {
    id: string;
    method: 'Dinheiro' | 'Crédito' | 'Débito' | 'Pix';
    amount: number;
}

const Calendar: React.FC<CalendarProps> = ({ barbers, services, products, clients, settings }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  
  const [selectedBarberId, setSelectedBarberId] = useState('all');
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [showInactives, setShowInactives] = useState(false);
  
  // State for Managing an Existing Appointment
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // Checkout States
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1); // 1 = Review Items, 2 = Payment
  const [issueInvoice, setIssueInvoice] = useState(false);
  
  // Advanced Payment States
  const [paymentParts, setPaymentParts] = useState<PaymentPart[]>([]);
  const [discount, setDiscount] = useState<number>(0); // Value
  const [tip, setTip] = useState<number>(0); // Value

  // Creating State
  const [isBlockingMode, setIsBlockingMode] = useState(false);
  const [newAppt, setNewAppt] = useState<Partial<Appointment>>({
    clientName: '',
    barberId: '',
    serviceId: '',
    time: '09:00',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  // Drag and Drop State
  const [draggedApptId, setDraggedApptId] = useState<string | null>(null);
  
  // Drag to Create State
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{barberId: string, time: string, date: Date} | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{time: string} | null>(null);

  // Consumables State within Appointment Details
  const [newItemId, setNewItemId] = useState('');

  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointmentsMock);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const toast = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const SLOT_HEIGHT = 120; 
  const startHour = 8;
  const endHour = 20;

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
      if (viewMode === 'month') return;
      const timer = setTimeout(() => {
          if (scrollRef.current) {
              const now = new Date();
              const currentHour = now.getHours();
              if (currentHour >= startHour && currentHour <= endHour) {
                  const scrollOffset = ((currentHour - startHour) * SLOT_HEIGHT) - 100;
                  scrollRef.current.scrollTo({ top: Math.max(0, scrollOffset), behavior: 'smooth' });
              }
          }
      }, 300);
      return () => clearTimeout(timer);
  }, [viewMode, currentDate]);

  // --- Handlers ---
  const handlePrevMonth = () => setMiniCalendarMonth(subMonths(miniCalendarMonth, 1));
  const handleNextMonth = () => setMiniCalendarMonth(addMonths(miniCalendarMonth, 1));
  
  const onDateClick = (day: Date) => {
      setCurrentDate(day);
      if (viewMode === 'month') setViewMode('day');
      setIsMobileSidebarOpen(false);
  };

  const handleOpenNewAppointment = (time?: string, barberId?: string, date?: Date) => {
      setIsBlockingMode(false);
      setNewAppt({
          clientName: '',
          barberId: barberId || barbers[0]?.id || '',
          serviceId: services[0]?.id || '',
          time: time || '09:00',
          date: date ? format(date, 'yyyy-MM-dd') : format(currentDate, 'yyyy-MM-dd'),
      });
      setIsAppointmentModalOpen(true);
  };

  const handleSaveAppointment = () => {
      // Logic for Blocked Slot
      if (isBlockingMode) {
          const reason = newAppt.clientName?.trim() || 'BLOQUEIO DE AGENDA';
          const blockAppointment: Appointment = {
              id: Math.random().toString(36).substr(2, 9),
              clientName: reason,
              barberId: newAppt.barberId!,
              serviceId: 'blocked',
              date: newAppt.date!,
              time: newAppt.time!,
              status: Status.BLOCKED,
              hasDeposit: false,
              consumption: []
          };
          setAppointments([...appointments, blockAppointment]);
          setIsAppointmentModalOpen(false);
          toast.success("Horário bloqueado com sucesso.");
          return;
      }

      // Logic for Normal Appointment
      if (!newAppt.clientName) {
          toast.error("Preencha o nome do cliente");
          return;
      }
      
      const newAppointment: Appointment = {
          id: Math.random().toString(36).substr(2, 9),
          clientName: newAppt.clientName,
          barberId: newAppt.barberId!,
          serviceId: newAppt.serviceId!,
          date: newAppt.date!,
          time: newAppt.time!,
          status: Status.PENDING,
          hasDeposit: newAppt.hasDeposit || false,
          consumption: []
      };
      
      setAppointments([...appointments, newAppointment]);
      setIsAppointmentModalOpen(false);
      toast.success("Agendamento criado com sucesso!");
  };

  const handleUpdateStatus = (id: string, status: Status) => {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      if (selectedAppointment && selectedAppointment.id === id) {
          setSelectedAppointment({ ...selectedAppointment, status });
      }
      if (status === Status.NOSHOW) {
          toast.warning(`Marcado como Faltou (No-Show).`);
      } else {
          toast.success(`Status atualizado para: ${status}`);
      }
  };

  const handleDeleteAppointment = (id: string) => {
      if(confirm('Tem certeza que deseja excluir?')) {
          setAppointments(prev => prev.filter(a => a.id !== id));
          setSelectedAppointment(null);
          toast.success("Removido.");
      }
  };

  // --- Consumption Logic ---
  const handleAddConsumption = () => {
      if (!selectedAppointment || !newItemId) return;
      
      // Check if it's a product
      const product = products.find(p => p.id === newItemId);
      // Or a service (extra service in same slot)
      const service = services.find(s => s.id === newItemId);

      let newItem: ConsumptionItem;

      if (product) {
          newItem = { id: Math.random().toString(), productId: product.id, name: product.name, price: product.price, quantity: 1 };
      } else if (service) {
          newItem = { id: Math.random().toString(), productId: service.id, name: service.name, price: service.price, quantity: 1 };
      } else {
          return;
      }

      const updatedAppt = {
          ...selectedAppointment,
          consumption: [...(selectedAppointment.consumption || []), newItem]
      };

      setAppointments(prev => prev.map(a => a.id === selectedAppointment.id ? updatedAppt : a));
      setSelectedAppointment(updatedAppt);
      setNewItemId('');
      toast.success('Item adicionado à comanda!');
  };

  const handleRemoveConsumption = (itemId: string) => {
      if (!selectedAppointment) return;
      const updatedAppt = {
          ...selectedAppointment,
          consumption: selectedAppointment.consumption?.filter(c => c.id !== itemId) || []
      };
      setAppointments(prev => prev.map(a => a.id === selectedAppointment.id ? updatedAppt : a));
      setSelectedAppointment(updatedAppt);
  };

  // --- Checkout Logic ---
  const getClientDailyAppointments = (clientName: string, date: string) => {
      return appointments.filter(a => 
          a.clientName === clientName && 
          a.date === date && 
          a.status !== Status.BLOCKED
      );
  };

  const handleOpenCheckout = () => {
      setCheckoutStep(1);
      setIssueInvoice(false);
      setPaymentParts([]); // Reset
      setDiscount(0);
      setTip(0);
      setIsCheckoutOpen(true);
  };

  const calculateTotals = () => {
      if (!selectedAppointment) return { subtotal: 0, total: 0 };
      const clientAppts = getClientDailyAppointments(selectedAppointment.clientName, selectedAppointment.date);
      let subtotal = 0;
      clientAppts.forEach(a => {
          if (a.status !== Status.CANCELED) {
              const s = services.find(srv => srv.id === a.serviceId);
              subtotal += (s?.price || 0);
              a.consumption?.forEach(c => subtotal += (c.price * c.quantity));
          }
      });
      const total = Math.max(0, subtotal + tip - discount);
      return { subtotal, total };
  };

  const handleAddPaymentPart = (method: PaymentPart['method'], amount: number) => {
      setPaymentParts([...paymentParts, { id: Math.random().toString(), method, amount }]);
  };

  const handleRemovePaymentPart = (id: string) => {
      setPaymentParts(paymentParts.filter(p => p.id !== id));
  };

  const handleFinalizeCheckout = () => {
      if (!selectedAppointment) return;
      
      const { total } = calculateTotals();
      const paidAmount = paymentParts.reduce((acc, p) => acc + p.amount, 0);

      // Simple validation
      if (Math.abs(paidAmount - total) > 0.01) {
          if(paidAmount < total) {
              toast.error(`Faltam R$ ${(total - paidAmount).toFixed(2)} para fechar a conta.`);
              return;
          }
          // If paid more, it's usually "Change" (Troco) - for simplicity assume exact or change handled externally
          // toast.info(`Troco: R$ ${(paidAmount - total).toFixed(2)}`);
      }

      // 1. Update Appointments Status
      const clientAppts = getClientDailyAppointments(selectedAppointment.clientName, selectedAppointment.date);
      const idsToComplete = clientAppts.map(a => a.id);
      setAppointments(prev => prev.map(a => idsToComplete.includes(a.id) ? { ...a, status: Status.COMPLETED } : a));
      
      // 2. Calculate Commissions (Simulation)
      let commissionSummary = "";
      clientAppts.forEach(a => {
          if (a.status !== Status.CANCELED) {
              const barber = barbers.find(b => b.id === a.barberId);
              const s = services.find(srv => srv.id === a.serviceId);
              if (barber && s) {
                  const commValue = s.price * (barber.commissionRate / 100);
                  commissionSummary += `${barber.name}: +R$ ${commValue.toFixed(2)} | `;
              }
          }
      });

      setIsCheckoutOpen(false);
      setSelectedAppointment(null);
      
      toast.success(`Pagamento confirmado! Comissões geradas.`);
      console.log("Comissões:", commissionSummary); // In a real app, dispatch to store
  };

  // --- Navigation Handlers ---
  const handlePrev = () => {
      if (viewMode === 'day') setCurrentDate(subDays(currentDate, 1));
      if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
      if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
      if (viewMode === 'day') setCurrentDate(addDays(currentDate, 1));
      if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
      if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setMiniCalendarMonth(today);
  };

  // --- Date Parsing Helper ---
  const parseLocal = (dateStr: string) => {
      if (!dateStr) return new Date();
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
  };

  // --- Drag and Drop Handlers (Reschedule) ---
  const onDragStart = (e: React.DragEvent, apptId: string) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", apptId);
      setDraggedApptId(apptId);
  };

  const onDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping
      e.dataTransfer.dropEffect = "move";
  };

  const onDragEnd = () => {
      // Safety reset if drop happens outside
      setDraggedApptId(null);
  };

  const onDrop = (e: React.DragEvent, targetTime: string, targetBarberId: string, targetDate: Date) => {
      e.preventDefault();
      const apptId = e.dataTransfer.getData("text/plain");
      setDraggedApptId(null);

      if (apptId) {
          const apptToMove = appointments.find(a => a.id === apptId);
          if (apptToMove) {
              const updatedAppt = {
                  ...apptToMove,
                  time: targetTime,
                  barberId: targetBarberId,
                  date: format(targetDate, 'yyyy-MM-dd')
              };
              setAppointments(prev => prev.map(a => a.id === apptId ? updatedAppt : a));
              toast.success("Agendamento reagendado com sucesso!");
          }
      }
  };

  // --- Drag to Create Handlers ---
  const onSlotMouseDown = (e: React.MouseEvent, time: string, barberId: string, date: Date, isOccupied: boolean) => {
      if (e.button !== 0 || isOccupied) return; // Only Left Click and if not occupied
      e.stopPropagation();
      setIsSelecting(true);
      setSelectionStart({ barberId, time, date });
      setSelectionEnd({ time });
  };

  const onSlotMouseEnter = (time: string, barberId: string) => {
      if (isSelecting && selectionStart && selectionStart.barberId === barberId) {
          setSelectionEnd({ time });
      }
  };

  const onSlotMouseUp = () => {
      if (isSelecting && selectionStart && selectionEnd) {
          // Open Modal
          handleOpenNewAppointment(selectionStart.time, selectionStart.barberId, selectionStart.date);
      }
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
  };

  // Helper to render selection overlay
  const renderSelectionOverlay = (hourStr: string, barberId: string) => {
      if (!isSelecting || !selectionStart || !selectionEnd || selectionStart.barberId !== barberId) return null;

      try {
        const startHour = parseInt(selectionStart.time.split(':')[0]);
        const currentHour = parseInt(hourStr.split(':')[0]);
        const endHour = parseInt(selectionEnd.time.split(':')[0]);

        const minH = Math.min(startHour, endHour);
        const maxH = Math.max(startHour, endHour);

        if (currentHour >= minH && currentHour <= maxH) {
            return <div className="absolute inset-0 bg-barber-gold/20 border-l-4 border-barber-gold z-10 pointer-events-none flex items-center justify-center animate-pulse"></div>;
        }
      } catch (e) {
        return null;
      }
      return null;
  };

  // Helper: Check if slot is occupied
  const checkSlotOccupancy = (time: string, barberId: string, date: Date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      return appointments.some(a => 
          a.barberId === barberId && 
          a.date === dateStr && 
          a.time === time &&
          a.status !== Status.CANCELED
      );
  };


  // --- Grid Helpers ---
  const timeSlots = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const generateCalendarGrid = () => {
      const monthStart = startOfMonth(miniCalendarMonth);
      const monthEnd = endOfMonth(monthStart);
      const startDate = startOfWeek(monthStart);
      const endDate = endOfWeek(monthEnd);
      return eachDayOfInterval({ start: startDate, end: endDate });
  };
  const calendarDays = generateCalendarGrid();
  const weekDaysLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const isSlotPast = (hour: number) => {
    if (!isToday(currentDate)) return isBefore(currentDate, new Date());
    return hour < currentTime.getHours();
  };

  // --- Styles ---
  const getAppointmentStyles = (status: Status) => {
      // Full width style: inset-x-0, w-full, z-20 to sit above grid lines
      const base = "border-l-4 shadow-md transition-all hover:brightness-110 hover:shadow-xl rounded-sm cursor-grab active:cursor-grabbing select-none w-full";
      switch(status) {
          case Status.CONFIRMED: return { 
              className: `${base} border-emerald-400 bg-emerald-900/90 text-emerald-50 shadow-emerald-900/20`,
              icon: <CheckCircle2 size={12} className="text-emerald-400" />
          };
          case Status.COMPLETED: return { 
              className: `${base} border-zinc-400 bg-zinc-800/90 text-zinc-200 grayscale`,
              icon: <CheckCircle2 size={12} className="text-zinc-400" />
          };
          case Status.PENDING: return { 
              className: `${base} border-amber-400 bg-amber-900/90 text-amber-50 shadow-amber-900/20`,
              icon: <Clock size={12} className="text-amber-400" />
          };
          case Status.CANCELED: return { 
              className: `${base} border-rose-500 bg-rose-950/90 text-rose-100 opacity-70`,
              icon: <X size={12} className="text-rose-500" />
          };
          case Status.NOSHOW: return {
              className: `${base} border-red-800 bg-red-950/80 text-red-200 opacity-75`,
              icon: <UserX size={12} className="text-red-500" />
          };
          case Status.BLOCKED: return { 
              className: `${base} border-zinc-600 bg-zinc-950/80 text-zinc-500 pattern-diagonal-lines cursor-not-allowed`,
              icon: <Lock size={12} className="text-zinc-500" />
          };
          default: return { 
              className: `${base} border-zinc-500 bg-zinc-800/90 text-gray-300`,
              icon: <Info size={12} />
          };
      }
  };

  const visibleBarbers = selectedBarberId === 'all' ? barbers : barbers.filter(b => b.id === selectedBarberId);
  const currentWeekDays = eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) });
  const getGridTemplate = () => {
      if (viewMode === 'day') return `70px repeat(${visibleBarbers.length}, 1fr)`;
      if (viewMode === 'week') return `70px repeat(7, 1fr)`;
      return '1fr';
  };

  // --- Header Stats ---
  const dailyApps = appointments.filter(a => isSameDay(parseLocal(a.date), currentDate) && a.status !== Status.BLOCKED);
  const dailyRevenue = dailyApps.reduce((acc, curr) => {
      if (curr.status === Status.CANCELED) return acc;
      const s = services.find(serv => serv.id === curr.serviceId);
      const servicePrice = s?.price || 0;
      const consumptionTotal = curr.consumption?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
      return acc + servicePrice + consumptionTotal;
  }, 0);
  const totalSlots = (endHour - startHour) * visibleBarbers.length;
  const occupancy = Math.round((dailyApps.length / totalSlots) * 100) || 0;

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden animate-fade-in relative bg-black" onMouseUp={onSlotMouseUp}>
        
        {/* === LEFT SIDEBAR === */}
        <div className={`
            fixed inset-y-0 left-0 z-50 w-72 bg-zinc-900 border-r border-zinc-700 transform transition-transform duration-300 ease-in-out p-4 flex flex-col gap-4 overflow-y-auto shadow-2xl
            ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            lg:translate-x-0 lg:static lg:w-72 lg:p-4 lg:border-r-0 lg:overflow-hidden lg:flex
        `}>
             <div className="flex items-center justify-between lg:hidden mb-2 shrink-0">
                <h3 className="text-lg font-bold text-main">Navegação</h3>
                <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 bg-zinc-800 rounded-full text-white">
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-4 overflow-y-auto pr-1 h-full">
                <Card noPadding className="p-4 bg-zinc-950 border-zinc-800 shadow-md shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={handlePrevMonth} className="p-1 hover:bg-zinc-800 rounded text-muted hover:text-main transition-colors"><ChevronLeft size={16}/></button>
                        <span className="font-bold text-main capitalize text-sm">{format(miniCalendarMonth, 'MMMM yyyy', { locale: ptBR })}</span>
                        <button onClick={handleNextMonth} className="p-1 hover:bg-zinc-800 rounded text-muted hover:text-main transition-colors"><ChevronRight size={16}/></button>
                    </div>
                    <div className="grid grid-cols-7 mb-2 text-center text-[10px] font-bold text-muted h-6">
                        {weekDaysLabels.map((day, i) => <div key={i}>{day}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, idx) => {
                            const isSelected = isSameDay(day, currentDate);
                            const isCurrentMonth = isSameMonth(day, miniCalendarMonth);
                            return (
                                <button
                                    key={idx}
                                    onClick={() => onDateClick(day)}
                                    className={`h-8 w-8 rounded-md flex items-center justify-center text-xs font-medium transition-all
                                        ${!isCurrentMonth ? 'text-gray-600 opacity-30' : 'text-main'}
                                        ${isSelected ? 'bg-barber-gold text-inverted font-bold shadow-lg shadow-amber-500/20' : 'hover:bg-zinc-800'}
                                        ${isToday(day) && !isSelected ? 'border border-barber-gold text-barber-gold' : ''}
                                    `}
                                >
                                    {format(day, 'd')}
                                </button>
                            );
                        })}
                    </div>
                </Card>

                {/* Available Widget */}
                <Card noPadding className="flex-1 bg-zinc-950 border-zinc-800 flex flex-col overflow-hidden shadow-md shrink-0 min-h-[250px]">
                    <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                            <Zap size={16} className="text-emerald-500 fill-emerald-500 animate-pulse" />
                            <div>
                                <h3 className="font-bold text-main text-sm leading-none">Disponíveis agora</h3>
                                <span className="text-[10px] text-muted">{format(currentTime, 'HH:mm')} • Tempo Real</span>
                            </div>
                        </div>
                    </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {barbers.slice(0, 5).map((barber, index) => {
                        const nextBusy = index === 0 ? 120 : 45; 
                        const progressColor = nextBusy > 60 ? 'bg-emerald-500' : 'bg-amber-500';
                        const now = new Date();
                        const nextSlotTime = format(new Date(now.getTime() + (15 - (now.getMinutes() % 15)) * 60000), 'HH:mm');

                        return (
                            <div 
                                key={barber.id}
                                onClick={() => handleOpenNewAppointment(nextSlotTime, barber.id, new Date())}
                                className="border border-zinc-800 rounded-xl p-3 hover:border-emerald-500/50 hover:bg-zinc-800/60 transition-all cursor-pointer group relative overflow-hidden active:scale-[0.98]"
                            >
                                <div className="absolute bottom-0 left-0 h-0.5 bg-zinc-800 w-full">
                                    <div className={`h-full ${progressColor}`} style={{ width: `${Math.min(nextBusy, 100)}%` }}></div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0">
                                    <img src={barber.avatar} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-main text-xs truncate">{barber.name}</h4>
                                        <span className="text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 rounded">Livre</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted mt-0.5">
                                        <span>Próx: {nextSlotTime}</span>
                                    </div>
                                    </div>
                                </div>
                            </div>
                        );
                        })}
                    </div>
                </Card>
            </div>
        </div>

        {/* === MAIN CALENDAR AREA === */}
        <div className="flex-1 flex flex-col bg-zinc-950 lg:border-l border-zinc-700 overflow-hidden shadow-2xl relative h-full min-w-0">
            
            {/* Header Controls */}
            <div className="bg-zinc-800 p-4 shrink-0 z-20 space-y-3 border-b border-t border-zinc-700 shadow-xl relative">
                
                <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-3">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-700 shadow-inner">
                            <button onClick={handlePrev} className="px-2 py-1.5 text-muted hover:text-white hover:bg-zinc-800 rounded transition-colors"><ChevronLeft size={16} /></button>
                            <button onClick={handleToday} className="px-3 py-1.5 text-[10px] font-extrabold text-main uppercase hover:bg-zinc-800 rounded transition-colors tracking-wide">HOJE</button>
                            <button onClick={handleNext} className="px-2 py-1.5 text-muted hover:text-white hover:bg-zinc-800 rounded transition-colors"><ChevronRight size={16} /></button>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <div className="text-xl font-black text-white capitalize leading-none tracking-tight drop-shadow-md">
                                {format(currentDate, "EEEE, d", { locale: ptBR })}
                            </div>
                            <span className="text-zinc-400 text-sm font-medium">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
                        <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-700 shrink-0 shadow-inner">
                            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                                <button 
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                                        viewMode === mode 
                                        ? 'bg-zinc-700 text-white shadow-sm border border-zinc-600' 
                                        : 'text-muted hover:text-main hover:bg-zinc-800'
                                    }`}
                                >
                                    {mode === 'day' ? 'Dia' : mode === 'week' ? 'Sem' : 'Mês'}
                                </button>
                            ))}
                        </div>

                        <div className="relative shrink-0">
                            <select 
                                value={selectedBarberId}
                                onChange={(e) => setSelectedBarberId(e.target.value)}
                                className="w-full xl:w-40 appearance-none bg-zinc-900 text-main text-xs font-bold pl-8 pr-6 py-2 rounded-lg border border-zinc-700 outline-none hover:border-zinc-600 cursor-pointer transition-all focus:border-barber-gold shadow-sm h-9"
                            >
                                <option value="all">Todos Profissionais</option>
                                {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        </div>

                        <div className="hidden xl:block w-px h-6 bg-zinc-700 mx-1"></div>

                        <div className="flex items-center gap-2 ml-auto xl:ml-0">
                            <button 
                                className="w-9 h-9 flex items-center justify-center bg-zinc-900 rounded-lg border border-zinc-700 text-muted hover:text-white hover:border-zinc-600 transition-all shrink-0 hover:bg-zinc-800"
                                title="Expandir"
                            >
                                <Maximize2 size={16} />
                            </button>
                            
                            <button 
                                onClick={() => setShowInactives(!showInactives)}
                                className={`flex items-center gap-1.5 px-3 h-9 bg-zinc-900 rounded-lg border border-zinc-700 text-[10px] font-bold transition-all shrink-0 hover:bg-zinc-800 ${showInactives ? 'text-white border-zinc-600 shadow-inner bg-zinc-800' : 'text-muted'}`}
                            >
                                {showInactives ? <Eye size={14} /> : <EyeOff size={14} />}
                                <span className="hidden sm:inline">Inativos</span>
                            </button>

                            <Button 
                                onClick={() => handleOpenNewAppointment()} 
                                className="bg-barber-gold hover:bg-barber-goldhover text-black font-bold h-9 px-4 text-xs rounded-lg shadow-[0_0_10px_rgba(245,158,11,0.2)] hover:shadow-[0_0_15px_rgba(245,158,11,0.4)] shrink-0 transition-all active:scale-95"
                                leftIcon={<Plus size={16} />}
                            >
                                NOVO
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-zinc-700 pt-3">
                    <div className="bg-zinc-900 rounded-lg p-2.5 flex items-center gap-3 border border-zinc-700 shadow-inner">
                        <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shrink-0">
                            <CalendarIcon size={16} />
                        </div>
                        <div>
                            <div className="text-[9px] text-muted font-bold uppercase tracking-wider">Agendamentos</div>
                            <div className="text-white font-black text-sm leading-none">
                                {dailyApps.length}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 rounded-lg p-2.5 flex items-center gap-3 border border-zinc-700 shadow-inner">
                        <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20 shrink-0">
                            <Banknote size={16} />
                        </div>
                        <div>
                            <div className="text-[9px] text-muted font-bold uppercase tracking-wider">Faturamento</div>
                            <div className="text-white font-black text-sm leading-none">
                                R$ {dailyRevenue.toFixed(0)}
                            </div>
                        </div>
                    </div>

                    <div className="bg-zinc-900 rounded-lg p-2.5 flex items-center gap-3 border border-zinc-700 shadow-inner">
                        <div className="w-8 h-8 rounded bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shrink-0">
                            <TrendingUp size={16} />
                        </div>
                        <div>
                            <div className="text-[9px] text-muted font-bold uppercase tracking-wider">Ocupação</div>
                            <div className="text-white font-black text-sm leading-none">
                                {occupancy}%
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-muted border-t border-zinc-700 pt-2">
                    <div className="flex items-center gap-1 font-bold uppercase text-white tracking-wider">
                        <Info size={10} className="text-barber-gold" /> Legenda
                    </div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-emerald-500"></div> Confirmado</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-amber-500"></div> Pendente</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-zinc-600"></div> Concluído</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-rose-500/50 border border-rose-500"></div> Cancelado</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-zinc-900 border border-zinc-600 pattern-diagonal-lines"></div> Bloqueado</div>
                </div>
            </div>

            {/* Grid Area */}
            <div className="flex-1 overflow-y-scroll overflow-x-auto relative scroll-smooth bg-black custom-scrollbar" ref={scrollRef}>
                {viewMode === 'month' ? (
                   <div className="p-4 grid grid-cols-7 gap-px bg-zinc-800 border border-zinc-700">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                          <div key={day} className="bg-zinc-800 py-3 text-center text-xs font-bold text-muted uppercase tracking-wider">{day}</div>
                      ))}
                      {calendarDays.map((day, idx) => {
                          const dayAppts = appointments.filter(a => isSameDay(parseLocal(a.date), day));
                          const isCurrentMonth = isSameMonth(day, miniCalendarMonth);
                          return (
                              <div 
                                key={idx} 
                                onClick={() => onDateClick(day)}
                                className={`min-h-[120px] bg-zinc-950 p-2 flex flex-col gap-1 cursor-pointer transition-colors hover:bg-zinc-900 ${!isCurrentMonth ? 'opacity-30' : ''}`}
                              >
                                  <span className={`text-xs font-bold mb-2 w-7 h-7 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-barber-gold text-black shadow-lg' : 'text-muted'}`}>{format(day, 'd')}</span>
                                  {dayAppts.slice(0, 3).map(apt => (
                                      <div key={apt.id} className={`text-[10px] rounded-sm px-1.5 py-1 truncate border-l-2 mb-0.5 ${apt.status === Status.BLOCKED ? 'bg-zinc-900 text-zinc-500 border-zinc-500' : 'bg-zinc-800 text-main border-barber-gold'}`}>
                                          <span className="font-bold mr-1">{apt.time}</span> {apt.clientName}
                                      </div>
                                  ))}
                                  {dayAppts.length > 3 && <div className="text-[9px] text-muted text-center font-bold">+{dayAppts.length - 3} mais</div>}
                              </div>
                          )
                      })}
                   </div>
                ) : (
                   <div className="min-w-[700px] relative pb-10">
                      <div className="sticky top-0 z-40 bg-zinc-800 border-b border-zinc-700 grid shadow-lg" style={{ gridTemplateColumns: getGridTemplate() }}>
                          <div className="border-r border-zinc-700 h-14 flex items-center justify-center bg-zinc-900 border-b border-zinc-700">
                             <Clock size={18} className="text-barber-gold" />
                          </div>
                          {viewMode === 'day' ? (
                             visibleBarbers.map(barber => (
                                <div key={barber.id} className="h-14 px-3 flex items-center gap-3 border-r border-zinc-700 hover:bg-zinc-700 transition-colors bg-zinc-800">
                                    <div className="relative">
                                       <img src={barber.avatar} className="w-9 h-9 rounded-full object-cover border-2 border-zinc-600 shadow-md" />
                                       <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-800 rounded-full shadow-sm"></div>
                                    </div>
                                    <div className="overflow-hidden">
                                       <div className="font-bold text-sm text-white truncate">{barber.name}</div>
                                       <div className="text-[10px] text-zinc-400 truncate uppercase tracking-wide">{barber.specialty}</div>
                                    </div>
                                </div>
                             ))
                          ) : (
                             currentWeekDays.map((day, i) => (
                                <div key={i} className={`h-14 flex flex-col items-center justify-center border-r border-zinc-700 bg-zinc-800 ${isSameDay(day, currentDate) ? 'bg-zinc-700' : ''}`}>
                                   <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">{format(day, 'EEE', { locale: ptBR })}</span>
                                   <span className={`text-xl font-black ${isSameDay(day, currentDate) ? 'text-barber-gold' : 'text-white'}`}>{format(day, 'd')}</span>
                                </div>
                             ))
                          )}
                      </div>

                      <div className="relative grid" style={{ gridTemplateColumns: getGridTemplate() }}>
                          <div className="border-r border-zinc-700 bg-zinc-900 z-30">
                              {timeSlots.map(hour => {
                                  const isPast = isSlotPast(hour);
                                  return (
                                    <div 
                                      key={hour} 
                                      className={`border-b border-zinc-800 text-xs font-bold flex justify-center pt-2 transition-colors
                                        ${isPast ? 'text-zinc-600 bg-zinc-950' : 'text-zinc-300 bg-zinc-900'}
                                      `} 
                                      style={{ height: SLOT_HEIGHT }}
                                    >
                                        {hour}:00
                                    </div>
                                  )
                              })}
                          </div>

                          {viewMode === 'day' ? (
                              visibleBarbers.map(barber => (
                                  <div key={barber.id} className="relative border-r border-zinc-800">
                                      {timeSlots.map(hour => {
                                          const isPast = isSlotPast(hour);
                                          const timeString = `${hour}:00`;
                                          // Check if slot is occupied to prevent new bookings
                                          const isOccupied = checkSlotOccupancy(timeString, barber.id, currentDate);

                                          return (
                                            <div 
                                                key={hour} 
                                                className={`border-b border-zinc-800 w-full relative group transition-all duration-200
                                                    ${isPast 
                                                        ? 'bg-[linear-gradient(45deg,rgba(0,0,0,0.02)_25%,rgba(0,0,0,0.05)_25%,rgba(0,0,0,0.05)_50%,rgba(0,0,0,0.02)_50%,rgba(0,0,0,0.02)_75%,rgba(0,0,0,0.05)_75%,rgba(0,0,0,0.05)_100%)] bg-[length:20px_20px] bg-zinc-900/50' 
                                                        : 'bg-black hover:bg-zinc-900'} 
                                                    ${isPast || isOccupied ? 'pointer-events-none cursor-not-allowed' : ''}
                                                `}
                                                style={{ height: SLOT_HEIGHT }}
                                                onDragOver={isOccupied ? undefined : onDragOver}
                                                onDrop={isOccupied ? undefined : (e) => onDrop(e, timeString, barber.id, currentDate)}
                                                onMouseDown={(e) => onSlotMouseDown(e, timeString, barber.id, currentDate, isOccupied)}
                                                onMouseEnter={() => onSlotMouseEnter(timeString, barber.id)}
                                            >
                                                {!isPast && !isOccupied && (
                                                    <div 
                                                        onClick={() => handleOpenNewAppointment(timeString, barber.id)}
                                                        className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-20"
                                                    >
                                                        <button className="bg-barber-gold text-black text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg transform scale-95 group-hover:scale-105 transition-transform flex items-center gap-1 hover:bg-white">
                                                            <Plus size={12} /> Agendar
                                                        </button>
                                                    </div>
                                                )}
                                                {renderSelectionOverlay(timeString, barber.id)}
                                            </div>
                                          )
                                      })}

                                      {appointments
                                        .filter(a => a.barberId === barber.id && isSameDay(parseLocal(a.date), currentDate))
                                        .map(appt => {
                                            const [h, m] = appt.time.split(':').map(Number);
                                            const top = ((h - startHour) * SLOT_HEIGHT) + ((m / 60) * SLOT_HEIGHT);
                                            const service = services.find(s => s.id === appt.serviceId);
                                            const duration = service?.duration || 60;
                                            const height = (duration / 60) * SLOT_HEIGHT;
                                            const style = getAppointmentStyles(appt.status);
                                            const isDragging = draggedApptId === appt.id;

                                            return (
                                                <div
                                                    key={appt.id}
                                                    draggable={appt.status !== Status.BLOCKED}
                                                    onDragStart={(e) => onDragStart(e, appt.id)}
                                                    onDragEnd={onDragEnd}
                                                    className={`absolute inset-x-0 w-full rounded-sm p-2 text-xs z-20 overflow-hidden group ${style.className} ${isDragging ? 'opacity-50' : 'opacity-100'}`}
                                                    style={{ top: `${top}px`, height: `${height}px` }}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedAppointment(appt); }}
                                                >
                                                    {appt.status !== Status.BLOCKED ? (
                                                        <>
                                                            <div className="flex justify-between items-start mb-1 relative z-10 pointer-events-none">
                                                                <span className="font-black bg-black/40 backdrop-blur-sm px-1.5 rounded text-[10px] text-white flex items-center gap-1 shadow-sm border border-white/10">
                                                                    {style.icon}
                                                                    {appt.time}
                                                                </span>
                                                                {appt.hasDeposit && <span className="text-[9px] bg-emerald-500 text-black font-bold px-1.5 rounded">$</span>}
                                                            </div>
                                                            <div className="font-black text-sm truncate leading-tight mb-0.5 relative z-10 text-white drop-shadow-md pointer-events-none">{appt.clientName}</div>
                                                            <div className="text-[10px] opacity-90 truncate relative z-10 font-medium pointer-events-none">{service?.name || 'Serviço'}</div>
                                                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-2xl rounded-full -mr-10 -mt-10 group-hover:bg-white/15 transition-colors pointer-events-none"></div>
                                                            
                                                            {/* Drag Handle Indicator */}
                                                            <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-white/50 pointer-events-none">
                                                                <GripHorizontal size={14} />
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full gap-2 opacity-50 pointer-events-none font-bold text-[10px] uppercase tracking-wider text-center px-1">
                                                            <Lock size={12} className="shrink-0" /> {appt.clientName}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })
                                      }
                                  </div>
                              ))
                          ) : (
                              currentWeekDays.map((day, i) => (
                                  <div key={i} className="relative border-r border-zinc-800">
                                      {timeSlots.map(hour => {
                                         const isPast = isBefore(day, new Date()) && !isSameDay(day, new Date()) || (isSameDay(day, new Date()) && hour < currentTime.getHours());
                                         const timeString = `${hour}:00`;
                                         const isOccupied = checkSlotOccupancy(timeString, selectedBarberId === 'all' ? barbers[0].id : selectedBarberId, day);

                                         return (
                                           <div 
                                              key={hour} 
                                              className={`border-b border-zinc-800 w-full h-full relative group transition-all duration-200
                                                ${isPast ? 'bg-zinc-900/50' : 'hover:bg-zinc-900'} 
                                                ${isOccupied ? 'pointer-events-none' : ''}
                                              `} 
                                              style={{ height: SLOT_HEIGHT }}
                                              onDragOver={isOccupied ? undefined : onDragOver}
                                              onDrop={isOccupied ? undefined : (e) => onDrop(e, timeString, selectedBarberId === 'all' ? barbers[0].id : selectedBarberId, day)}
                                              onMouseDown={(e) => onSlotMouseDown(e, timeString, selectedBarberId === 'all' ? barbers[0].id : selectedBarberId, day, isOccupied)}
                                              onMouseEnter={() => onSlotMouseEnter(timeString, selectedBarberId === 'all' ? barbers[0].id : selectedBarberId)}
                                           >
                                                {!isPast && !isOccupied && (
                                                    <div 
                                                        onClick={() => handleOpenNewAppointment(timeString, selectedBarberId === 'all' ? barbers[0].id : selectedBarberId)}
                                                        className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-20"
                                                    >
                                                        <button className="bg-barber-gold text-black text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg transform scale-95 group-hover:scale-105 transition-transform flex items-center gap-1 hover:bg-white">
                                                            <Plus size={12} /> Agendar
                                                        </button>
                                                    </div>
                                                )}
                                                {renderSelectionOverlay(timeString, selectedBarberId === 'all' ? barbers[0].id : selectedBarberId)}
                                           </div>
                                         )
                                      })}
                                      {appointments
                                          .filter(a => isSameDay(parseLocal(a.date), day) && (selectedBarberId === 'all' || a.barberId === selectedBarberId))
                                          .map(appt => {
                                              const [h, m] = appt.time.split(':').map(Number);
                                              const top = ((h - startHour) * SLOT_HEIGHT) + ((m / 60) * SLOT_HEIGHT);
                                              const duration = 60;
                                              const height = (duration / 60) * SLOT_HEIGHT;
                                              const style = getAppointmentStyles(appt.status);
                                              const isDragging = draggedApptId === appt.id;
                                              
                                              return (
                                                  <div
                                                      key={appt.id}
                                                      draggable={appt.status !== Status.BLOCKED}
                                                      onDragStart={(e) => onDragStart(e, appt.id)}
                                                      onDragEnd={onDragEnd}
                                                      className={`absolute inset-x-0 w-full rounded-sm p-1.5 text-[10px] z-20 overflow-hidden shadow-sm ${style.className} ${isDragging ? 'opacity-50' : ''}`}
                                                      style={{ top: `${top}px`, height: `${height}px` }}
                                                      onClick={(e) => { e.stopPropagation(); setSelectedAppointment(appt); }}
                                                  >
                                                      <span className="font-bold block text-white drop-shadow-md pointer-events-none">{appt.time}</span>
                                                      <span className="truncate block opacity-90 pointer-events-none">{appt.clientName}</span>
                                                  </div>
                                              )
                                          })
                                      }
                                  </div>
                              ))
                          )}

                          {isSameDay(currentDate, new Date()) && (
                              <div 
                                className="absolute left-0 right-0 z-50 pointer-events-none flex items-center"
                                style={{ top: `${((currentTime.getHours() - startHour) * SLOT_HEIGHT) + ((currentTime.getMinutes() / 60) * SLOT_HEIGHT)}px` }}
                              >
                                  <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-r-md -ml-[2px] shadow-[0_0_10px_rgba(220,38,38,0.5)] z-50 flex items-center gap-1">
                                      <Clock size={10} className="text-white" />
                                      {format(currentTime, 'HH:mm')}
                                  </div>
                                  <div className="h-[2px] bg-red-600 w-full shadow-[0_0_8px_rgba(239,68,68,0.8)] relative opacity-80">
                                      <div className="absolute right-0 -top-[3px] w-2 h-2 bg-red-600 rounded-full shadow-sm"></div>
                                  </div>
                              </div>
                          )}
                      </div>
                   </div>
                )}
            </div>
        </div>

        {/* Modal: New Appointment / Block */}
        <Modal
            isOpen={isAppointmentModalOpen}
            onClose={() => setIsAppointmentModalOpen(false)}
            title="Adicionar à Agenda"
            footer={
                <>
                    <Button variant="ghost" onClick={() => setIsAppointmentModalOpen(false)}>Cancelar</Button>
                    <Button variant={isBlockingMode ? 'danger' : 'primary'} onClick={handleSaveAppointment} leftIcon={isBlockingMode ? <Lock size={18}/> : <CheckCircle2 size={18} />}>
                        {isBlockingMode ? 'Confirmar Bloqueio' : 'Confirmar Agendamento'}
                    </Button>
                </>
            }
        >
            <div className="space-y-6">
                <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                    <button 
                        onClick={() => { setIsBlockingMode(false); setNewAppt(prev => ({...prev, clientName: ''})); }}
                        className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${!isBlockingMode ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                    >
                        Agendamento
                    </button>
                    <button 
                        onClick={() => { setIsBlockingMode(true); setNewAppt(prev => ({...prev, clientName: ''})); }}
                        className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${isBlockingMode ? 'bg-red-900/50 text-red-200 shadow' : 'text-muted hover:text-white'}`}
                    >
                        Bloquear Horário
                    </button>
                </div>

                {!isBlockingMode ? (
                    <>
                        <Input 
                            label="Nome do Cliente" 
                            value={newAppt.clientName} 
                            onChange={e => setNewAppt({...newAppt, clientName: e.target.value})}
                            placeholder="Buscar ou digitar nome..."
                            icon={<User size={16} />}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <Select 
                                label="Profissional"
                                options={barbers.map(b => ({ value: b.id, label: b.name }))}
                                value={newAppt.barberId}
                                onChange={e => setNewAppt({...newAppt, barberId: e.target.value})}
                                icon={<User size={16} />}
                            />
                            <Select 
                                label="Serviço"
                                options={services.map(s => ({ value: s.id, label: `${s.name} (R$ ${s.price})` }))}
                                value={newAppt.serviceId}
                                onChange={e => setNewAppt({...newAppt, serviceId: e.target.value})}
                            />
                        </div>
                    </>
                ) : (
                    <div className="p-4 bg-red-900/10 border border-red-900/30 rounded-lg text-center">
                        <AlertOctagon className="mx-auto text-red-500 mb-2" size={32} />
                        <p className="text-red-200 text-sm font-bold">Modo de Bloqueio</p>
                        <p className="text-red-300/70 text-xs">Este horário ficará indisponível para agendamentos online e internos.</p>
                        <div className="mt-4 text-left space-y-4">
                             <Select 
                                label="Profissional a Bloquear"
                                options={barbers.map(b => ({ value: b.id, label: b.name }))}
                                value={newAppt.barberId}
                                onChange={e => setNewAppt({...newAppt, barberId: e.target.value})}
                            />
                            <Input 
                                label="Motivo do Bloqueio"
                                placeholder="Ex: Almoço, Manutenção, Ausência..."
                                value={newAppt.clientName}
                                onChange={e => setNewAppt({...newAppt, clientName: e.target.value})}
                            />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="Data" 
                        type="date"
                        value={newAppt.date} 
                        onChange={e => setNewAppt({...newAppt, date: e.target.value})}
                    />
                    <Input 
                        label="Horário" 
                        type="time"
                        value={newAppt.time} 
                        onChange={e => setNewAppt({...newAppt, time: e.target.value})}
                        icon={<Clock size={16} />}
                    />
                </div>

                {!isBlockingMode && (
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-green-500/10 flex items-center justify-center text-green-500">
                            <Banknote size={16} />
                            </div>
                            <div>
                            <div className="text-sm font-bold text-main">Pagamento Antecipado</div>
                            <div className="text-xs text-muted">Solicitar sinal via Pix?</div>
                            </div>
                        </div>
                        <Switch checked={newAppt.hasDeposit || false} onCheckedChange={(c) => setNewAppt({...newAppt, hasDeposit: c})} />
                    </div>
                )}
            </div>
        </Modal>

        {/* Modal: Appointment Details */}
        {selectedAppointment && !isCheckoutOpen && (
            <Modal
                isOpen={!!selectedAppointment}
                onClose={() => setSelectedAppointment(null)}
                title={selectedAppointment.status === Status.BLOCKED ? "Detalhes do Bloqueio" : "Gestão do Atendimento"}
                size="lg"
                footer={
                    <div className="flex justify-between w-full items-center">
                        <Button variant="danger" size="icon" onClick={() => handleDeleteAppointment(selectedAppointment.id)} title="Excluir"><Trash2 size={18} /></Button>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setSelectedAppointment(null)}>Fechar</Button>
                            {selectedAppointment.status !== Status.BLOCKED && (
                                <Button 
                                    variant="success" 
                                    onClick={handleOpenCheckout}
                                    leftIcon={<Receipt size={18} />}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-lg shadow-emerald-900/20"
                                >
                                    Fechar Conta / Pagar
                                </Button>
                            )}
                        </div>
                    </div>
                }
            >
                {selectedAppointment.status === Status.BLOCKED ? (
                    <div className="text-center py-8">
                        <Lock size={48} className="mx-auto text-zinc-500 mb-4" />
                        <h3 className="text-xl font-bold text-white">{selectedAppointment.clientName || 'Horário Bloqueado'}</h3>
                        <p className="text-muted mt-2">Este horário foi travado manualmente.</p>
                        <p className="text-zinc-500 text-sm mt-1">{selectedAppointment.date} às {selectedAppointment.time}</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div className="flex items-center gap-4 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-white border border-zinc-700">
                                {selectedAppointment.clientName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">{selectedAppointment.clientName}</h3>
                                <div className="text-sm text-muted flex items-center gap-2">
                                    <Clock size={14} /> {selectedAppointment.date} às {selectedAppointment.time}
                                </div>
                            </div>
                            <div className="ml-auto">
                                <Badge variant={selectedAppointment.status === Status.CONFIRMED ? 'success' : selectedAppointment.status === Status.PENDING ? 'warning' : 'default'}>
                                    {selectedAppointment.status}
                                </Badge>
                            </div>
                        </div>

                        {/* Status Actions */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {[Status.PENDING, Status.CONFIRMED, Status.COMPLETED, Status.NOSHOW, Status.CANCELED].map(status => {
                                let icon = <Info size={14} />;
                                let colorClass = "text-muted";
                                
                                if(status === Status.PENDING) { icon = <Clock size={14} />; colorClass = "text-amber-500"; }
                                if(status === Status.CONFIRMED) { icon = <CheckCircle2 size={14} />; colorClass = "text-emerald-500"; }
                                if(status === Status.COMPLETED) { icon = <CheckCircle2 size={14} />; colorClass = "text-zinc-400"; }
                                if(status === Status.NOSHOW) { icon = <UserX size={14} />; colorClass = "text-red-600"; }
                                if(status === Status.CANCELED) { icon = <X size={14} />; colorClass = "text-rose-500"; }

                                return (
                                    <button
                                        key={status}
                                        onClick={() => handleUpdateStatus(selectedAppointment.id, status)}
                                        className={`px-1 py-2 rounded-lg text-[10px] font-bold uppercase border transition-all flex flex-col items-center gap-1 ${
                                            selectedAppointment.status === status 
                                            ? 'bg-zinc-800 text-white border-zinc-600 shadow-inner' 
                                            : 'bg-zinc-950 text-muted border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                                        }`}
                                    >
                                        <div className={colorClass}>{icon}</div>
                                        {status}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left: Service Details */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                                    <Scissors size={14} /> Serviço Principal
                                </h4>
                                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-bold text-white text-sm">{services.find(s => s.id === selectedAppointment.serviceId)?.name || 'Serviço'}</div>
                                            <div className="text-xs text-muted mt-1">{barbers.find(b => b.id === selectedAppointment.barberId)?.name}</div>
                                        </div>
                                        <div className="font-bold text-emerald-500">
                                            R$ {services.find(s => s.id === selectedAppointment.serviceId)?.price.toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Consumption & Extras */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
                                    <Coffee size={14} /> Consumo & Extras
                                </h4>
                                <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 min-h-[120px] flex flex-col">
                                    <div className="space-y-2 flex-1 mb-4">
                                        {selectedAppointment.consumption && selectedAppointment.consumption.length > 0 ? (
                                            selectedAppointment.consumption.map((item) => (
                                                <div key={item.id} className="flex justify-between items-center text-xs bg-zinc-950 p-2 rounded border border-zinc-800">
                                                    <span className="text-gray-300">{item.quantity}x {item.name}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-white font-bold">R$ {item.price.toFixed(2)}</span>
                                                        <button onClick={() => handleRemoveConsumption(item.id)} className="text-red-500 hover:text-red-400"><X size={12} /></button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center text-zinc-600 text-xs py-2 italic">Nenhum extra adicionado.</div>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <div className="flex-1">
                                            <select 
                                                value={newItemId}
                                                onChange={(e) => setNewItemId(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-700 text-white text-xs rounded-lg px-2 py-2 outline-none"
                                            >
                                                <option value="">Adicionar item...</option>
                                                <optgroup label="Produtos">
                                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} - R$ {p.price}</option>)}
                                                </optgroup>
                                                <optgroup label="Serviços Extras">
                                                    {services.map(s => <option key={s.id} value={s.id}>{s.name} - R$ {s.price}</option>)}
                                                </optgroup>
                                            </select>
                                        </div>
                                        <button onClick={handleAddConsumption} className="bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg px-3 py-2 border border-zinc-700">
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        )}

        {/* Modal: CHECKOUT (Comanda Unificada Redesenhada) */}
        {isCheckoutOpen && selectedAppointment && (
            <Modal
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                title=""
                size="lg"
            >
                <div className="relative">
                    {/* Header Vermelho Personalizado */}
                    <div className="-mx-6 -mt-6 bg-red-600 p-3 text-center text-white font-bold uppercase tracking-widest mb-6 shadow-md flex items-center justify-between px-6">
                        <span>Comanda</span>
                        <div className="flex gap-2 text-xs font-bold opacity-80">
                            <span className={checkoutStep === 1 ? 'text-white' : 'text-red-200'}>1. Itens</span>
                            <span>&rarr;</span>
                            <span className={checkoutStep === 2 ? 'text-white' : 'text-red-200'}>2. Pagamento</span>
                        </div>
                    </div>

                    {/* Logic for Totals */}
                    {(() => {
                        const { subtotal, total } = calculateTotals();
                        const clientDailyApps = getClientDailyAppointments(selectedAppointment.clientName, selectedAppointment.date);
                        const paidAmount = paymentParts.reduce((acc, p) => acc + p.amount, 0);
                        const remaining = Math.max(0, total - paidAmount);

                        return (
                            <>
                                {/* STEP 1: REVIEW ITEMS */}
                                {checkoutStep === 1 && (
                                    <div className="animate-fade-in">
                                        <div className="flex justify-between items-start mb-4 px-2">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-zinc-800 p-2 rounded-lg border border-zinc-700">
                                                        <User size={24} className="text-zinc-300" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-xl font-bold text-white leading-none">{selectedAppointment.clientName}</h2>
                                                        <div className="mt-2">
                                                            <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 w-fit shadow-sm shadow-green-900/20">
                                                                (11) 97487-0717 <MessageCircle size={12} fill="white" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-zinc-800 px-4 py-2 rounded-lg text-right border border-zinc-700 shadow-sm">
                                                <span className="text-zinc-400 text-[10px] font-bold uppercase block">Total</span>
                                                <span className="text-2xl font-black text-white">R$ {total.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center text-xs text-zinc-400 border-b border-zinc-800 pb-3 mb-5 px-2">
                                            <span className="font-medium">Hoje, {format(parseLocal(selectedAppointment.date), "d MMM yyyy", { locale: ptBR })}</span>
                                            <span className="font-bold">{clientDailyApps.length} agendamentos</span>
                                        </div>

                                        <div className="space-y-3 pb-6">
                                            {clientDailyApps.map((appt) => {
                                                const s = services.find(srv => srv.id === appt.serviceId);
                                                const b = barbers.find(bar => bar.id === appt.barberId);
                                                const isCanceled = appt.status === Status.CANCELED;
                                                const isPending = appt.status === Status.PENDING;
                                                const totalItem = (s?.price || 0) + (appt.consumption?.reduce((acc, c) => acc + (c.price * c.quantity), 0) || 0);

                                                const [h, m] = appt.time.split(':').map(Number);
                                                const startDate = new Date(); startDate.setHours(h, m, 0);
                                                const endDate = new Date(startDate.getTime() + (s?.duration || 60) * 60000);
                                                const endTime = format(endDate, 'HH:mm');

                                                return (
                                                    <div key={appt.id} className={`border rounded-lg p-3 relative ${isCanceled ? 'bg-zinc-950/50 border-zinc-800 opacity-60' : 'bg-zinc-900 border-zinc-700 shadow-sm'}`}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <div>
                                                                {isPending ? (
                                                                    <span className="bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">Em espera ▼</span>
                                                                ) : isCanceled ? (
                                                                    <span className="text-zinc-500 text-xs font-bold px-2">Cancelado</span>
                                                                ) : (
                                                                    <span className="bg-zinc-700 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded">{appt.status}</span>
                                                                )}
                                                            </div>
                                                            <div className="font-bold text-sm text-white absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                                                                {appt.time} <span className="text-zinc-500 text-[10px]">➜</span> {endTime}
                                                            </div>
                                                            <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                                                                ID: {appt.id.substring(0,4)}
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-between items-center mb-2 border-t border-zinc-800/50 pt-2 mt-1">
                                                            <div className="flex items-center gap-2 font-bold text-white text-sm">
                                                                <Scissors size={14} className="text-zinc-500" /> {s?.name}
                                                            </div>
                                                            <div className="font-bold text-white">R$ {totalItem.toFixed(2)}</div>
                                                        </div>

                                                        {appt.consumption?.map(extra => (
                                                            <div key={extra.id} className="flex justify-between text-xs text-zinc-400 pl-6 mb-1">
                                                                <span>+ {extra.quantity}x {extra.name}</span>
                                                                <span>R$ {(extra.price * extra.quantity).toFixed(2)}</span>
                                                            </div>
                                                        ))}

                                                        <div className="flex items-center gap-2 text-xs text-zinc-400 mt-2">
                                                            <User size={12} /> {b?.name} <Heart size={10} className="text-orange-500 fill-orange-500" />
                                                        </div>
                                                        
                                                        {isCanceled && <Lock size={14} className="absolute bottom-3 right-3 text-zinc-600" />}
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-zinc-800">
                                            <div className="flex gap-3">
                                                <button className="flex-1 py-3 text-sm text-zinc-400 font-bold hover:text-white border border-zinc-700 rounded-xl hover:bg-zinc-800 transition-colors">
                                                    + Adicionar Item
                                                </button>
                                                <button 
                                                    onClick={() => setCheckoutStep(2)}
                                                    className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                                >
                                                    Ir para Pagamento <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* STEP 2: PAYMENT */}
                                {checkoutStep === 2 && (
                                    <div className="animate-slide-up flex flex-col md:flex-row gap-6">
                                        {/* Left: Summary Panel */}
                                        <div className="w-full md:w-1/3 bg-zinc-950 p-4 rounded-xl border border-zinc-800 h-fit">
                                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 border-b border-zinc-800 pb-2">Resumo da Conta</h4>
                                            <div className="space-y-2 mb-4">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-zinc-400">Subtotal</span>
                                                    <span className="text-white">R$ {subtotal.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-zinc-400 flex items-center gap-1"><Percent size={12} /> Desconto</span>
                                                    <input 
                                                        type="number" 
                                                        value={discount} 
                                                        onChange={(e) => setDiscount(Number(e.target.value))}
                                                        className="w-16 bg-zinc-900 border border-zinc-700 text-right text-red-400 rounded px-1 text-xs outline-none focus:border-red-500"
                                                    />
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-zinc-400 flex items-center gap-1"><Coins size={12} /> Gorjeta/Taxa</span>
                                                    <input 
                                                        type="number" 
                                                        value={tip} 
                                                        onChange={(e) => setTip(Number(e.target.value))}
                                                        className="w-16 bg-zinc-900 border border-zinc-700 text-right text-green-400 rounded px-1 text-xs outline-none focus:border-green-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="border-t border-zinc-800 pt-3">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-sm font-bold text-white">Total Final</span>
                                                    <span className="text-xl font-black text-emerald-500">R$ {total.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Payment Methods */}
                                        <div className="flex-1 space-y-4">
                                            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                                        <Wallet size={16} className="text-blue-500" /> Pagamento
                                                    </h4>
                                                    <div className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-300">
                                                        Restante: <span className={remaining > 0 ? 'text-red-400 font-bold' : 'text-green-500 font-bold'}>R$ {remaining.toFixed(2)}</span>
                                                    </div>
                                                </div>

                                                {/* Payment Parts List */}
                                                <div className="space-y-2 mb-4">
                                                    {paymentParts.map(part => (
                                                        <div key={part.id} className="flex justify-between items-center bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                                                            <div className="flex items-center gap-2">
                                                                {part.method === 'Crédito' && <CreditCard size={14} className="text-blue-400" />}
                                                                {part.method === 'Dinheiro' && <Banknote size={14} className="text-green-400" />}
                                                                {part.method === 'Pix' && <Zap size={14} className="text-emerald-400" />}
                                                                <span className="text-sm font-bold text-white">{part.method}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-white font-mono">R$ {part.amount.toFixed(2)}</span>
                                                                <button onClick={() => handleRemovePaymentPart(part.id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {paymentParts.length === 0 && (
                                                        <div className="text-center text-xs text-zinc-600 py-4 italic border border-dashed border-zinc-800 rounded-lg">
                                                            Nenhum pagamento adicionado
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Add Payment Controls */}
                                                {remaining > 0 && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button onClick={() => handleAddPaymentPart('Crédito', remaining)} className="bg-blue-600/10 border border-blue-600/30 text-blue-400 hover:bg-blue-600 hover:text-white py-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1">
                                                            <CreditCard size={16} /> Crédito
                                                        </button>
                                                        <button onClick={() => handleAddPaymentPart('Débito', remaining)} className="bg-cyan-600/10 border border-cyan-600/30 text-cyan-400 hover:bg-cyan-600 hover:text-white py-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1">
                                                            <CreditCard size={16} /> Débito
                                                        </button>
                                                        <button onClick={() => handleAddPaymentPart('Dinheiro', remaining)} className="bg-green-600/10 border border-green-600/30 text-green-400 hover:bg-green-600 hover:text-white py-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1">
                                                            <Banknote size={16} /> Dinheiro
                                                        </button>
                                                        <button onClick={() => handleAddPaymentPart('Pix', remaining)} className="bg-emerald-600/10 border border-emerald-600/30 text-emerald-400 hover:bg-emerald-600 hover:text-white py-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-1">
                                                            <Zap size={16} /> Pix
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex gap-2 pt-4">
                                                <button onClick={() => setCheckoutStep(1)} className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm">
                                                    Voltar
                                                </button>
                                                <button 
                                                    onClick={handleFinalizeCheckout}
                                                    disabled={remaining > 0.01} // Floating point tolerance
                                                    className="flex-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl shadow-lg shadow-green-900/20 flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <CheckCircle2 size={18} /> Confirmar (R$ {total.toFixed(2)})
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </Modal>
        )}

    </div>
  );
};

// Helper for 'isBefore' to fix typescript if needed or just use logic
function startOfDay(d: Date) {
    const n = new Date(d);
    n.setHours(0,0,0,0);
    return n;
}

export default Calendar;
