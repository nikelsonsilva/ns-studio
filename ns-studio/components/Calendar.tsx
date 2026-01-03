
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
  Lock
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
import { Barber, Service, Product, Client, SystemSettings, Appointment, Status } from '../types';
import Button from './ui/Button';
import Select from './ui/Select';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Card from './ui/Card';
import Switch from './ui/Switch';
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
      hasDeposit: false
    },
    {
      id: '2',
      clientName: 'Carlos Oliveira',
      barberId: '2',
      serviceId: '2',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '14:00',
      status: Status.CONFIRMED,
      hasDeposit: true
    },
    {
      id: '3',
      clientName: 'Roberto Martins',
      barberId: '1',
      serviceId: '2',
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '16:00',
      status: Status.PENDING,
      hasDeposit: false
    }
];

const Calendar: React.FC<CalendarProps> = ({ barbers, services, products, clients, settings }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  
  const [selectedBarberId, setSelectedBarberId] = useState('all');
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [showInactives, setShowInactives] = useState(false);
  
  const [newAppt, setNewAppt] = useState<Partial<Appointment>>({
    clientName: '',
    barberId: '',
    serviceId: '',
    time: '09:00',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointmentsMock);
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Real-time Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  const toast = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Layout Constants
  const SLOT_HEIGHT = 120; 
  const startHour = 8;
  const endHour = 20;

  useEffect(() => {
    // Atualiza o relógio a cada minuto
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll para o horário atual
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
          status: Status.CONFIRMED,
          hasDeposit: false
      };
      setAppointments([...appointments, newAppointment]);
      setIsAppointmentModalOpen(false);
      toast.success("Agendamento criado!");
  };

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

  // --- Helpers for Grid ---
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

  // Check if a specific hour is in the past
  const isSlotPast = (hour: number) => {
    if (!isToday(currentDate)) return isBefore(currentDate, new Date());
    return hour < currentTime.getHours();
  };

  // --- Styles ---
  const getAppointmentStyles = (status: Status) => {
      // Cores sólidas e de alto contraste para garantir visibilidade no fundo preto
      const base = "border-l-4 shadow-lg transition-all hover:scale-[1.02] hover:z-50 hover:shadow-2xl rounded-r-md cursor-pointer";
      
      switch(status) {
          case Status.CONFIRMED: return { 
              className: `${base} border-emerald-400 bg-emerald-900 text-emerald-50 shadow-emerald-900/20`,
              icon: <CheckCircle2 size={12} className="text-emerald-400" />
          };
          case Status.COMPLETED: return { 
              className: `${base} border-zinc-400 bg-zinc-800 text-zinc-200 grayscale`,
              icon: <CheckCircle2 size={12} className="text-zinc-400" />
          };
          case Status.PENDING: return { 
              className: `${base} border-amber-400 bg-amber-900 text-amber-50 shadow-amber-900/20`,
              icon: <Clock size={12} className="text-amber-400" />
          };
          case Status.CANCELED: return { 
              className: `${base} border-rose-500 bg-rose-950 text-rose-100 opacity-70`,
              icon: <X size={12} className="text-rose-500" />
          };
          case Status.BLOCKED: return { 
              className: `${base} border-zinc-600 bg-zinc-950 text-zinc-500 pattern-diagonal-lines`,
              icon: <Lock size={12} className="text-zinc-500" />
          };
          default: return { 
              className: `${base} border-zinc-500 bg-zinc-800 text-gray-300`,
              icon: <Info size={12} />
          };
      }
  };

  const visibleBarbers = selectedBarberId === 'all' ? barbers : barbers.filter(b => b.id === selectedBarberId);
  const currentWeekDays = eachDayOfInterval({ start: startOfWeek(currentDate), end: endOfWeek(currentDate) });

  // Grid Template
  const getGridTemplate = () => {
      if (viewMode === 'day') return `70px repeat(${visibleBarbers.length}, 1fr)`;
      if (viewMode === 'week') return `70px repeat(7, 1fr)`;
      return '1fr';
  };

  // --- Header Stats Calculation ---
  const dailyApps = appointments.filter(a => isSameDay(new Date(a.date), currentDate));
  const dailyRevenue = dailyApps.reduce((acc, curr) => {
      if (curr.status === Status.CANCELED) return acc;
      const s = services.find(serv => serv.id === curr.serviceId);
      return acc + (s?.price || 0);
  }, 0);
  const totalSlots = (endHour - startHour) * visibleBarbers.length;
  const occupancy = Math.round((dailyApps.length / totalSlots) * 100) || 0;

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden animate-fade-in relative bg-black">
        
        {/* === LEFT SIDEBAR (Navegação) === */}
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

            {/* Sidebar Scrollable Content */}
            <div className="flex flex-col gap-4 overflow-y-auto pr-1 h-full">
                {/* 1. Mini Calendar */}
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

                {/* 2. "Available Now" Widget */}
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
                        const minutes = now.getMinutes();
                        const remainder = 15 - (minutes % 15);
                        const nextSlotDate = new Date(now.getTime() + remainder * 60000);
                        const nextSlotTime = format(nextSlotDate, 'HH:mm');

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
            
            {/* === HEADER PRINCIPAL (Controles) - Fundo Escuro para Contraste === */}
            <div className="bg-zinc-900 p-3 shrink-0 z-20 space-y-3 border-b border-zinc-700 shadow-md">
                
                {/* LINHA 1: Controles Superiores */}
                <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-3">
                    
                    {/* ESQUERDA: Navegação e Data */}
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Nav Buttons (Segmented Look) */}
                        <div className="flex items-center bg-zinc-950 rounded-lg p-0.5 border border-zinc-700 shadow-inner">
                            <button onClick={handlePrev} className="px-2 py-1.5 text-muted hover:text-white hover:bg-zinc-800 rounded transition-colors"><ChevronLeft size={16} /></button>
                            <button onClick={handleToday} className="px-3 py-1.5 text-[10px] font-extrabold text-main uppercase hover:bg-zinc-800 rounded transition-colors tracking-wide">HOJE</button>
                            <button onClick={handleNext} className="px-2 py-1.5 text-muted hover:text-white hover:bg-zinc-800 rounded transition-colors"><ChevronRight size={16} /></button>
                        </div>

                        {/* Data Principal (High Contrast) */}
                        <div className="flex items-baseline gap-2">
                            <div className="text-lg font-black text-white capitalize leading-none tracking-tight">
                                {format(currentDate, "EEEE, d", { locale: ptBR })}
                            </div>
                            <span className="text-muted text-xs font-medium">{format(currentDate, "MMMM yyyy", { locale: ptBR })}</span>
                        </div>
                    </div>

                    {/* DIREITA: Filtros e Ações */}
                    <div className="flex flex-wrap items-center gap-2 xl:ml-auto">
                        
                        {/* View Switcher */}
                        <div className="flex bg-zinc-950 rounded-lg p-0.5 border border-zinc-700 shrink-0 shadow-inner">
                            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                                <button 
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${
                                        viewMode === mode 
                                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-600' 
                                        : 'text-muted hover:text-main hover:bg-zinc-900'
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
                                className="w-full xl:w-40 appearance-none bg-zinc-950 text-main text-xs font-bold pl-8 pr-6 py-2 rounded-lg border border-zinc-700 outline-none hover:border-zinc-600 cursor-pointer transition-all focus:border-barber-gold shadow-sm h-9"
                            >
                                <option value="all">Todos Profissionais</option>
                                {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                            <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                        </div>

                        {/* Divisor Vertical */}
                        <div className="hidden xl:block w-px h-6 bg-zinc-700 mx-1"></div>

                        {/* Grupo de Ações */}
                        <div className="flex items-center gap-2 ml-auto xl:ml-0">
                            <button 
                                className="w-9 h-9 flex items-center justify-center bg-zinc-950 rounded-lg border border-zinc-700 text-muted hover:text-white hover:border-zinc-600 transition-all shrink-0 hover:bg-zinc-900"
                                title="Expandir"
                            >
                                <Maximize2 size={16} />
                            </button>
                            
                            <button 
                                onClick={() => setShowInactives(!showInactives)}
                                className={`flex items-center gap-1.5 px-3 h-9 bg-zinc-950 rounded-lg border border-zinc-700 text-[10px] font-bold transition-all shrink-0 hover:bg-zinc-900 ${showInactives ? 'text-white border-zinc-600 shadow-inner bg-zinc-800' : 'text-muted'}`}
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

                {/* LINHA 2: Métricas */}
                <div className="grid grid-cols-3 gap-3 border-t border-zinc-700 pt-3">
                    {/* Card Agendamentos */}
                    <div className="bg-zinc-950 rounded-lg p-2.5 flex items-center gap-3 border border-zinc-700 shadow-inner">
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

                    {/* Card Faturamento */}
                    <div className="bg-zinc-950 rounded-lg p-2.5 flex items-center gap-3 border border-zinc-700 shadow-inner">
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

                    {/* Card Ocupação */}
                    <div className="bg-zinc-950 rounded-lg p-2.5 flex items-center gap-3 border border-zinc-700 shadow-inner">
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

                {/* LINHA 3: Legenda */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] text-muted border-t border-zinc-700 pt-2">
                    <div className="flex items-center gap-1 font-bold uppercase text-white tracking-wider">
                        <Info size={10} className="text-barber-gold" /> Legenda
                    </div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-emerald-500"></div> Confirmado</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-amber-500"></div> Pendente</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-zinc-600"></div> Concluído</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-rose-500/50 border border-rose-500"></div> Cancelado</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-zinc-800 border border-zinc-600"></div> Bloqueado</div>
                </div>
            </div>

            {/* SCROLLABLE GRID AREA */}
            <div className="flex-1 overflow-y-scroll overflow-x-auto relative scroll-smooth bg-black custom-scrollbar" ref={scrollRef}>
                {viewMode === 'month' ? (
                   /* === MONTH VIEW === */
                   <div className="p-4 grid grid-cols-7 gap-px bg-zinc-800 border border-zinc-700">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                          <div key={day} className="bg-zinc-900 py-3 text-center text-xs font-bold text-muted uppercase tracking-wider">{day}</div>
                      ))}
                      {calendarDays.map((day, idx) => {
                          const dayAppts = appointments.filter(a => isSameDay(new Date(a.date), day));
                          const isCurrentMonth = isSameMonth(day, miniCalendarMonth);
                          return (
                              <div 
                                key={idx} 
                                onClick={() => onDateClick(day)}
                                className={`min-h-[120px] bg-zinc-950 p-2 flex flex-col gap-1 cursor-pointer transition-colors hover:bg-zinc-900 ${!isCurrentMonth ? 'opacity-30' : ''}`}
                              >
                                  <span className={`text-xs font-bold mb-2 w-7 h-7 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-barber-gold text-black shadow-lg' : 'text-muted'}`}>{format(day, 'd')}</span>
                                  {dayAppts.slice(0, 3).map(apt => (
                                      <div key={apt.id} className="text-[10px] bg-zinc-800 rounded-sm px-1.5 py-1 text-main truncate border-l-2 border-barber-gold shadow-sm mb-0.5">
                                          <span className="font-bold mr-1">{apt.time}</span> {apt.clientName}
                                      </div>
                                  ))}
                                  {dayAppts.length > 3 && <div className="text-[9px] text-muted text-center font-bold">+{dayAppts.length - 3} mais</div>}
                              </div>
                          )
                      })}
                   </div>
                ) : (
                   /* === DAY & WEEK VIEW === */
                   <div className="min-w-[700px] relative pb-10">
                      
                      {/* HEADER: BARBERS / DAYS (Visual Hierarchy Fix: Zinc-800 para contraste médio contra o fundo preto e header escuro) */}
                      <div className="sticky top-0 z-40 bg-zinc-800 border-b border-zinc-700 grid shadow-xl" style={{ gridTemplateColumns: getGridTemplate() }}>
                          {/* Top-Left Empty Cell (Corner) */}
                          <div className="border-r border-zinc-700 h-14 flex items-center justify-center bg-zinc-900">
                             <Clock size={18} className="text-barber-gold" />
                          </div>

                          {/* Columns Headers */}
                          {viewMode === 'day' ? (
                             visibleBarbers.map(barber => (
                                <div key={barber.id} className="h-14 px-3 flex items-center gap-3 border-r border-zinc-700 hover:bg-zinc-700/80 transition-colors bg-zinc-800">
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

                      {/* BODY: SLOTS & APPOINTMENTS */}
                      <div className="relative grid" style={{ gridTemplateColumns: getGridTemplate() }}>
                          
                          {/* Column 1: TIME LABELS (Sidebar) - Dark Grey (Zinc-900) to stand out from Black Grid */}
                          <div className="border-r border-zinc-700 bg-zinc-900 z-30">
                              {timeSlots.map(hour => {
                                  const isPast = isSlotPast(hour);
                                  return (
                                    <div 
                                      key={hour} 
                                      className={`border-b border-zinc-800 text-xs font-bold flex justify-center pt-2 transition-colors
                                        ${isPast ? 'text-zinc-600' : 'text-zinc-300'}
                                      `} 
                                      style={{ height: SLOT_HEIGHT }}
                                    >
                                        {hour}:00
                                    </div>
                                  )
                              })}
                          </div>

                          {/* Columns 2+: APPOINTMENT SLOTS - Pure Black Background */}
                          {viewMode === 'day' ? (
                              visibleBarbers.map(barber => (
                                  <div key={barber.id} className="relative border-r border-zinc-800">
                                      {/* Grid Lines & Background */}
                                      {timeSlots.map(hour => {
                                          const isPast = isSlotPast(hour);
                                          return (
                                            <div 
                                                key={hour} 
                                                className={`border-b border-zinc-800 w-full relative group transition-colors
                                                    ${isPast ? 'bg-zinc-900/30' : 'bg-black'} 
                                                    ${isPast ? 'pointer-events-none cursor-not-allowed' : ''}
                                                `}
                                                style={{ height: SLOT_HEIGHT }}
                                            >
                                                {/* Invisible Hover Slot (Only Future) */}
                                                {!isPast && (
                                                    <div 
                                                        onClick={() => handleOpenNewAppointment(`${hour}:00`, barber.id)}
                                                        className="absolute inset-0 hover:bg-white/[0.03] cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                                    >
                                                        <Plus size={24} className="text-barber-gold/50" />
                                                    </div>
                                                )}
                                            </div>
                                          )
                                      })}

                                      {/* Appointment Cards */}
                                      {appointments
                                        .filter(a => a.barberId === barber.id && isSameDay(new Date(a.date), currentDate))
                                        .map(appt => {
                                            const [h, m] = appt.time.split(':').map(Number);
                                            const top = ((h - startHour) * SLOT_HEIGHT) + ((m / 60) * SLOT_HEIGHT);
                                            const service = services.find(s => s.id === appt.serviceId);
                                            const duration = service?.duration || 45;
                                            const height = (duration / 60) * SLOT_HEIGHT;
                                            const style = getAppointmentStyles(appt.status);

                                            return (
                                                <div
                                                    key={appt.id}
                                                    className={`absolute inset-x-1.5 rounded-r-lg p-2.5 text-xs z-10 cursor-pointer overflow-hidden group ${style.className}`}
                                                    style={{ top: `${top}px`, height: `${height}px` }}
                                                    onClick={(e) => { e.stopPropagation(); /* Open Edit */ }}
                                                >
                                                    <div className="flex justify-between items-start mb-1 relative z-10">
                                                       <span className="font-black bg-black/40 backdrop-blur-sm px-1.5 rounded text-[10px] text-white flex items-center gap-1 shadow-sm border border-white/10">
                                                           {style.icon}
                                                           {appt.time}
                                                       </span>
                                                       {appt.hasDeposit && <span className="text-[9px] bg-emerald-500 text-black font-bold px-1.5 rounded">$</span>}
                                                    </div>
                                                    <div className="font-black text-sm truncate leading-tight mb-0.5 relative z-10 text-white drop-shadow-md">{appt.clientName}</div>
                                                    <div className="text-[10px] opacity-90 truncate relative z-10 font-medium">{service?.name || 'Serviço'}</div>
                                                    
                                                    {/* Decorative shine */}
                                                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 blur-2xl rounded-full -mr-10 -mt-10 group-hover:bg-white/15 transition-colors"></div>
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
                                         return (
                                           <div key={hour} className={`border-b border-zinc-800 w-full h-full ${isPast ? 'bg-zinc-900/30 pointer-events-none' : ''}`} style={{ height: SLOT_HEIGHT }}>
                                           </div>
                                         )
                                      })}
                                      {/* Simple Weekly Appointments */}
                                      {appointments
                                          .filter(a => isSameDay(new Date(a.date), day) && (selectedBarberId === 'all' || a.barberId === selectedBarberId))
                                          .map(appt => {
                                              const [h, m] = appt.time.split(':').map(Number);
                                              const top = ((h - startHour) * SLOT_HEIGHT) + ((m / 60) * SLOT_HEIGHT);
                                              const service = services.find(s => s.id === appt.serviceId);
                                              const duration = service?.duration || 45;
                                              const height = (duration / 60) * SLOT_HEIGHT;
                                              const style = getAppointmentStyles(appt.status);
                                              
                                              return (
                                                  <div
                                                      key={appt.id}
                                                      className={`absolute inset-x-1 rounded-md p-1.5 text-[10px] z-10 overflow-hidden shadow-sm ${style.className}`}
                                                      style={{ top: `${top}px`, height: `${height}px` }}
                                                  >
                                                      <span className="font-bold block text-white drop-shadow-md">{appt.time}</span>
                                                      <span className="truncate block opacity-90">{appt.clientName}</span>
                                                  </div>
                                              )
                                          })
                                      }
                                  </div>
                              ))
                          )}

                          {/* CURRENT TIME LINE (Enhanced) */}
                          {isSameDay(currentDate, new Date()) && (
                              <div 
                                className="absolute left-0 right-0 z-50 pointer-events-none flex items-center"
                                style={{ top: `${((currentTime.getHours() - startHour) * SLOT_HEIGHT) + ((currentTime.getMinutes() / 60) * SLOT_HEIGHT)}px` }}
                              >
                                  {/* Time Badge on the Left */}
                                  <div className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-r-md -ml-[2px] shadow-[0_0_10px_rgba(220,38,38,0.5)] z-50 flex items-center gap-1">
                                      <Clock size={10} className="text-white animate-pulse" />
                                      {format(currentTime, 'HH:mm')}
                                  </div>
                                  {/* The Line */}
                                  <div className="h-[2px] bg-red-600 w-full shadow-[0_0_8px_rgba(239,68,68,0.8)] relative opacity-80">
                                      <div className="absolute right-0 -top-[3px] w-2 h-2 bg-red-600 rounded-full shadow-[0_0_10px_rgba(239,68,68,1)] animate-ping"></div>
                                      <div className="absolute right-0 -top-[3px] w-2 h-2 bg-red-600 rounded-full"></div>
                                  </div>
                              </div>
                          )}
                      </div>
                   </div>
                )}
            </div>
        </div>

        {/* Modal: New Appointment */}
        <Modal
            isOpen={isAppointmentModalOpen}
            onClose={() => setIsAppointmentModalOpen(false)}
            title="Novo Agendamento"
            footer={
                <>
                    <Button variant="ghost" onClick={() => setIsAppointmentModalOpen(false)}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSaveAppointment} leftIcon={<CheckCircle2 size={18} />}>Confirmar</Button>
                </>
            }
        >
            <div className="space-y-4">
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

                <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-800 flex items-center justify-between">
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
            </div>
        </Modal>

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
