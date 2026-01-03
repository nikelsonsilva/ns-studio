
import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  MessageCircle, 
  Plus, 
  ChevronRight, 
  ExternalLink, 
  Phone, 
  RefreshCw, 
  Scissors, 
  DollarSign, 
  Wallet, 
  Activity,
  Zap,
  UserPlus,
  Coffee,
  ArrowRight,
  Bell,
  Check,
  Armchair,
  Target
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { SystemSettings } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { useToast } from './ui/Toast';

// --- MOCK DATA ---

const nextAppointment = {
  id: 'apt-001',
  client: 'Ricardo Mendes',
  service: 'Corte Degradê + Barba',
  time: '14:45',
  professional: 'João Barber',
  status: 'confirmed',
  avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
  phone: '11999999999'
};

const todayStats = {
  total: 18,
  confirmed: 12,
  pending: 4,
  canceled: 2,
  occupancy: 72 // percentage
};

// FEATURE AGENDAMENTOS ONLINE (IMAGEM 3)
const onlineRequests = [
  { 
    id: 1, 
    name: 'Carlos Eduardo', 
    isNew: true, 
    time: '14:30', 
    source: 'Link Público', 
    service: 'Corte + Barba', 
    paymentStatus: 'paid' 
  },
  { 
    id: 2, 
    name: 'Marcos Silva', 
    isNew: false, 
    time: '16:00', 
    source: 'WhatsApp', 
    service: 'Degradê Navalhado', 
    paymentStatus: 'pending' 
  },
  { 
    id: 3, 
    name: 'Felipe Neto', 
    isNew: true, 
    time: '17:30', 
    source: 'Link Público', 
    service: 'Platinado', 
    paymentStatus: 'paid' 
  },
];

const availableNow = [
  { id: 1, name: 'Pedro Cortes', nextSlot: '15:00', services: ['Corte', 'Barba'] },
  { id: 2, name: 'Marcos Silva', nextSlot: '15:30', services: ['Corte'] },
];

// FEATURE CADEIRAS (IMAGEM 1)
const chairsStatus = [
  { id: 1, barber: 'João Barber', status: 'occupied', progress: 85, timeRemaining: '10 min' },
  { id: 2, barber: 'Disponível', status: 'free', progress: 0, timeRemaining: '' },
  { id: 3, barber: 'Matheus Jr', status: 'occupied', progress: 40, timeRemaining: '20 min' },
];

// DADOS RESTAURADOS
const alerts = [
  { id: 1, text: '3 Agendamentos pendentes', type: 'warning' },
  { id: 2, text: '1 Pagamento em aberto (Mesa 2)', type: 'danger' },
];

const teamStatus = {
  working: 3,
  free: 2,
  break: 1
};

const topServices = [
  { name: 'Corte Degradê', count: 45, color: '#f59e0b' },
  { name: 'Barba Terapia', count: 30, color: '#10b981' },
  { name: 'Platinado', count: 15, color: '#6366f1' },
];

const todayClients = {
  new: 3,
  recurring: 14,
  vip: 1
};

const financeToday = {
  received: 1250.00,
  pending: 450.00,
  projected: 1700.00
};

// FEATURE META MENSAL (IMAGEM 2)
const monthlyGoalData = {
    current: 14250,
    target: 20000,
    percentage: 71,
    today: 1250,
    ticket: 65
};

const activityFeed = [
  { id: 1, time: '14:30', text: 'Novo agendamento via Link Público', type: 'new_booking' },
  { id: 2, time: '14:15', text: 'Roberto finalizou "Corte Simples"', type: 'completed' },
  { id: 3, time: '13:50', text: 'Pagamento de R$ 85,00 confirmado', type: 'payment' },
  { id: 4, time: '13:10', text: 'Cliente Carlos remarcou para amanhã', type: 'reschedule' },
];

const weeklyData = [
  { day: 'Seg', value: 1200 },
  { day: 'Ter', value: 1450 },
  { day: 'Qua', value: 1300 },
  { day: 'Qui', value: 1900 },
  { day: 'Sex', value: 2800 },
  { day: 'Sáb', value: 3200 },
  { day: 'Dom', value: 800 },
];

interface DashboardProps {
    settings?: SystemSettings;
    onGoToSettings?: () => void;
    onGoToCalendar?: () => void;
}

// Sub-componente para o Gráfico Circular (Gauge)
const GoalGauge = ({ percentage }: { percentage: number }) => {
    const radius = 36;
    const stroke = 6;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center w-24 h-24">
            <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
                <circle
                    stroke="#27272a"
                    strokeWidth={stroke}
                    fill="transparent"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <circle
                    stroke="url(#gradGoal)"
                    strokeWidth={stroke}
                    strokeDasharray={circumference + ' ' + circumference}
                    style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
                    strokeLinecap="round"
                    fill="transparent"
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                <defs>
                    <linearGradient id="gradGoal" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#eab308" />
                    </linearGradient>
                </defs>
            </svg>
            <div className="absolute flex items-center justify-center text-lg font-bold text-white">
                {percentage}%
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ settings, onGoToSettings, onGoToCalendar }) => {
  const [filterDate, setFilterDate] = useState<'today' | 'tomorrow' | 'week'>('today');
  const toast = useToast();

  const handleWhatsApp = (phone: string) => {
      window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      
      {/* === HEADER === */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-barber-900/50 p-4 rounded-2xl border border-barber-800 backdrop-blur-sm sticky top-0 z-20">
         <div>
            <h1 className="text-2xl font-bold text-main">Visão Geral</h1>
            <div className="flex items-center gap-2 mt-1">
               <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
               <p className="text-xs text-muted">Loja Aberta • Operação em andamento</p>
            </div>
         </div>

         <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
             {/* Filter Chips */}
             <div className="flex bg-barber-950 p-1 rounded-xl border border-barber-800">
                <button 
                  onClick={() => setFilterDate('today')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterDate === 'today' ? 'bg-barber-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                   Hoje
                </button>
                <button 
                  onClick={() => setFilterDate('tomorrow')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterDate === 'tomorrow' ? 'bg-barber-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                   Amanhã
                </button>
                <button 
                  onClick={() => setFilterDate('week')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterDate === 'week' ? 'bg-barber-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                   Semana
                </button>
             </div>

             <div className="h-8 w-px bg-barber-800 hidden sm:block"></div>

             <Button 
               variant="outline" 
               size="sm" 
               className="hidden sm:flex"
               leftIcon={<ExternalLink size={14} />}
               onClick={() => window.open('https://nsstudio.com/agendar', '_blank')}
             >
                Página Pública
             </Button>
             
             <Button 
               onClick={onGoToCalendar}
               leftIcon={<Plus size={16} />}
               className="shadow-lg shadow-amber-500/20 flex-1 sm:flex-none"
             >
                Novo Agendamento
             </Button>
         </div>
      </div>

      {/* === LINHA 1: PRIORIDADE E STATUS IMEDIATO === */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* 1) PRÓXIMO ATENDIMENTO (Mantido) */}
          <Card noPadding className="relative overflow-hidden group hover:border-barber-gold/50 transition-all border-l-4 border-l-barber-gold">
              <div className="p-5 flex flex-col h-full justify-between relative z-10">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                          <img src={nextAppointment.avatar} className="w-12 h-12 rounded-xl object-cover border border-barber-800" alt="Client" />
                          <div>
                              <div className="text-xs font-bold text-barber-gold uppercase tracking-wider mb-0.5">Próximo da Fila</div>
                              <h3 className="font-bold text-main text-lg leading-none">{nextAppointment.time}</h3>
                          </div>
                      </div>
                      <Badge variant="success" size="sm">Confirmado</Badge>
                  </div>
                  
                  <div className="mb-4">
                      <div className="text-main font-bold text-lg">{nextAppointment.client}</div>
                      <div className="text-sm text-muted flex items-center gap-1.5 mt-1">
                          <Scissors size={14} /> {nextAppointment.service}
                      </div>
                      <div className="text-xs text-muted flex items-center gap-1.5 mt-1">
                          <Users size={14} /> Prof: {nextAppointment.professional}
                      </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-auto">
                      <Button size="sm" variant="secondary" className="col-span-1" onClick={() => toast.success('Check-in realizado!')} title="Realizar Check-in">
                          <CheckCircle2 size={16} /> Check-in
                      </Button>
                      <Button size="sm" variant="secondary" className="col-span-1 bg-green-600/10 text-green-500 hover:bg-green-600 hover:text-white border-green-600/20" onClick={() => handleWhatsApp(nextAppointment.phone)}>
                          <MessageCircle size={16} /> Whats
                      </Button>
                      <Button size="sm" variant="outline" className="col-span-1" onClick={onGoToCalendar}>
                          <RefreshCw size={16} /> Mover
                      </Button>
                  </div>
              </div>
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Clock size={100} />
              </div>
          </Card>

          {/* 2) AGENDAMENTOS ONLINE (Novo Widget) */}
          <Card noPadding className="flex flex-col bg-barber-900 border border-barber-800 h-full">
              <div className="p-4 border-b border-barber-800 flex justify-between items-center bg-barber-950/50">
                  <h3 className="font-bold text-main flex items-center gap-2 text-sm">
                      <MessageCircle size={16} className="text-emerald-500" /> Agendamentos Online
                  </h3>
                  <Badge variant="success" size="sm" className="bg-emerald-500/20 text-emerald-500 border-emerald-500/20">{onlineRequests.length}</Badge>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar h-[200px]">
                  {onlineRequests.map(req => (
                      <div key={req.id} className="bg-barber-950 border border-barber-800 rounded-xl p-3 flex flex-col gap-2 group hover:border-barber-700 transition-colors">
                          <div className="flex justify-between items-start">
                              <div>
                                  <div className="flex items-center gap-2">
                                      <span className="font-bold text-white text-sm">{req.name}</span>
                                      {req.isNew && <span className="text-[9px] font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 uppercase">Novo</span>}
                                  </div>
                                  <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                                      <Clock size={10} /> {req.time} • {req.source}
                                  </div>
                              </div>
                              {req.paymentStatus === 'paid' ? (
                                  <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">Pago</span>
                              ) : (
                                  <span className="text-[9px] font-bold bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20 uppercase">Pendente</span>
                              )}
                          </div>
                          
                          <div className="flex justify-between items-end border-t border-barber-800/50 pt-2 mt-1">
                              <span className="text-xs text-muted font-medium">{req.service}</span>
                              <button className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded transition-colors">
                                  <Check size={12} /> Confirmar
                              </button>
                          </div>
                      </div>
                  ))}
              </div>
          </Card>

          {/* 3) ALERTAS E AÇÕES (Restaurado) */}
          <Card noPadding className="flex flex-col bg-gradient-to-br from-barber-900 to-red-950/20 border-red-900/30">
              <div className="p-5 border-b border-barber-800/50 flex justify-between items-center">
                  <h3 className="font-bold text-main flex items-center gap-2 text-sm">
                      <AlertCircle size={18} className="text-rose-500" /> Alertas e Ações
                  </h3>
                  <Badge variant="danger" size="sm">{alerts.length}</Badge>
              </div>
              <div className="p-4 flex-1 space-y-3 overflow-y-auto h-[200px]">
                  {alerts.length > 0 ? alerts.map(alert => (
                      <div key={alert.id} className="bg-barber-950/50 border border-barber-800 rounded-lg p-3 flex items-start justify-between gap-3 group hover:border-barber-700 transition-colors">
                          <div className="flex items-start gap-3">
                              <div className={`mt-0.5 w-2 h-2 rounded-full ${alert.type === 'danger' ? 'bg-rose-500' : 'bg-amber-500'} animate-pulse`}></div>
                              <span className="text-xs text-gray-300 font-medium leading-tight">{alert.text}</span>
                          </div>
                          <button className="text-[10px] font-bold text-barber-gold hover:underline whitespace-nowrap">Resolver</button>
                      </div>
                  )) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted text-xs">
                          <CheckCircle2 size={24} className="mb-2 opacity-50" />
                          Tudo certo por aqui!
                      </div>
                  )}
              </div>
          </Card>
      </div>

      {/* === LINHA 2: OPERACIONAL AO VIVO === */}
      <h2 className="text-sm font-bold text-muted uppercase tracking-widest mt-8 mb-4 flex items-center gap-2">
          <Activity size={16} /> Operação em Tempo Real
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 4) CADEIRAS (Novo Widget) */}
          <Card noPadding className="flex flex-col">
              <div className="p-4 border-b border-barber-800 bg-barber-950/30 flex justify-between items-center">
                  <h3 className="font-bold text-main flex items-center gap-2 text-sm">
                      <Armchair size={16} className="text-sky-500" /> Cadeiras
                  </h3>
                  <span className="text-[10px] text-muted font-bold uppercase">
                      {chairsStatus.filter(c => c.status === 'occupied').length} / {chairsStatus.length} Ocupadas
                  </span>
              </div>
              
              <div className="flex-1 p-4 space-y-3">
                  {chairsStatus.map(chair => (
                      <div key={chair.id} className="bg-barber-950/50 border border-barber-800 rounded-xl p-3 flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 shadow-lg ${chair.status === 'occupied' ? 'bg-barber-gold text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                              {chair.id}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-1.5">
                                  <span className={`text-sm font-bold truncate ${chair.status === 'occupied' ? 'text-white' : 'text-muted'}`}>
                                      {chair.barber}
                                  </span>
                                  {chair.status === 'occupied' && (
                                      <span className="text-[10px] font-bold text-emerald-500">{chair.timeRemaining}</span>
                                  )}
                              </div>
                              
                              {chair.status === 'occupied' ? (
                                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                      <div className="h-full bg-sky-500 rounded-full" style={{ width: `${chair.progress}%` }}></div>
                                  </div>
                              ) : (
                                  <div className="text-[10px] text-zinc-600 italic">Aguardando cliente...</div>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </Card>

          {/* 5) AGENDA DE HOJE (Mantido) */}
          <Card noPadding className="flex flex-col">
              <div className="p-4 border-b border-barber-800 flex justify-between items-center bg-barber-950/30">
                  <h3 className="font-bold text-main flex items-center gap-2 text-sm">
                      <CalendarIcon size={16} className="text-sky-500" /> Agenda de Hoje
                  </h3>
                  <button onClick={onGoToCalendar} className="text-xs font-bold text-sky-500 hover:underline flex items-center gap-1">
                      Ver <ChevronRight size={12} />
                  </button>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-center gap-4">
                  <div className="flex items-end justify-between mb-2">
                      <div>
                          <div className="text-3xl font-bold text-main">{todayStats.total}</div>
                          <div className="text-xs text-muted uppercase font-bold">Agendamentos</div>
                      </div>
                      <div className="text-right">
                          <div className="text-2xl font-bold text-sky-500">{todayStats.occupancy}%</div>
                          <div className="text-xs text-muted uppercase font-bold">Ocupação</div>
                      </div>
                  </div>
                  
                  <div className="w-full h-3 bg-barber-950 rounded-full overflow-hidden flex border border-barber-800">
                      <div className="h-full bg-emerald-500" style={{ width: `${(todayStats.confirmed / todayStats.total) * 100}%` }} title="Confirmados"></div>
                      <div className="h-full bg-amber-500" style={{ width: `${(todayStats.pending / todayStats.total) * 100}%` }} title="Pendentes"></div>
                      <div className="h-full bg-rose-500" style={{ width: `${(todayStats.canceled / todayStats.total) * 100}%` }} title="Cancelados"></div>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase text-muted mt-1">
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> {todayStats.confirmed} Conf</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> {todayStats.pending} Pend</span>
                      <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> {todayStats.canceled} Canc</span>
                  </div>
              </div>
          </Card>

          {/* 6) EQUIPE ONLINE (Restaurado) */}
          <Card noPadding>
              <div className="p-4 border-b border-barber-800 bg-barber-950/30 flex justify-between items-center">
                  <h3 className="font-bold text-main text-sm flex items-center gap-2">
                      <Users size={16} className="text-indigo-400" /> Equipe Online
                  </h3>
                  <button className="text-[10px] font-bold text-muted hover:text-white flex items-center gap-1">
                      Escala <ArrowRight size={10} />
                  </button>
              </div>
              <div className="p-4 flex items-center justify-around h-full">
                  <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-500">{teamStatus.working}</div>
                      <div className="text-[10px] uppercase font-bold text-muted mt-1">Atendendo</div>
                  </div>
                  <div className="h-8 w-px bg-barber-800"></div>
                  <div className="text-center">
                      <div className="text-2xl font-bold text-sky-500">{teamStatus.free}</div>
                      <div className="text-[10px] uppercase font-bold text-muted mt-1">Livres</div>
                  </div>
                  <div className="h-8 w-px bg-barber-800"></div>
                  <div className="text-center">
                      <div className="text-2xl font-bold text-amber-500">{teamStatus.break}</div>
                      <div className="text-[10px] uppercase font-bold text-muted mt-1">Pausa</div>
                  </div>
              </div>
              <div className="px-4 pb-4 pt-0">
                  <div className="text-[10px] text-muted bg-barber-950 p-2 rounded border border-barber-800 flex items-center gap-2">
                      <Coffee size={12} /> <span className="font-bold">Em pausa:</span> Ana Silva (volta 15:00)
                  </div>
              </div>
          </Card>
      </div>

      {/* === LINHA 3: FINANCEIRO & METAS === */}
      <h2 className="text-sm font-bold text-muted uppercase tracking-widest mt-8 mb-4 flex items-center gap-2">
          <TrendingUp size={16} /> Gestão & Performance
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 7) META MENSAL (Novo Widget) */}
          <Card noPadding className="bg-barber-900 h-full flex flex-col justify-center">
              <div className="flex-1 p-6 flex items-center justify-between gap-4">
                  <GoalGauge percentage={monthlyGoalData.percentage} />
                  <div>
                      <div className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Target size={12} /> Meta Mensal
                      </div>
                      <div className="text-2xl font-bold text-white">R$ {monthlyGoalData.current.toLocaleString('pt-BR')}</div>
                      <div className="text-xs text-muted">de R$ {monthlyGoalData.target.toLocaleString('pt-BR')}</div>
                  </div>
              </div>
              <div className="border-t border-barber-800 bg-barber-950/30 grid grid-cols-2 divide-x divide-barber-800">
                  <div className="p-3 text-center">
                      <div className="text-[9px] text-muted font-bold uppercase mb-0.5">Hoje</div>
                      <div className="text-sm font-bold text-emerald-500">R$ {monthlyGoalData.today.toLocaleString('pt-BR')}</div>
                  </div>
                  <div className="p-3 text-center">
                      <div className="text-[9px] text-muted font-bold uppercase mb-0.5">Ticket Médio</div>
                      <div className="text-sm font-bold text-sky-500">R$ {monthlyGoalData.ticket}</div>
                  </div>
              </div>
          </Card>

          {/* 8) FINANCEIRO DO DIA (Mantido) */}
          <Card noPadding className="bg-gradient-to-br from-barber-900 to-emerald-950/10 border-emerald-900/30">
              <div className="p-5 flex justify-between items-start">
                  <div>
                      <h3 className="text-sm font-bold text-muted uppercase flex items-center gap-2">
                          <DollarSign size={16} className="text-emerald-500" /> Caixa do Dia
                      </h3>
                      <div className="text-3xl font-bold text-white mt-2">
                          R$ {financeToday.received.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-emerald-400 mt-1 font-medium">
                          + R$ {financeToday.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} a receber
                      </div>
                  </div>
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/20">
                      <Wallet size={24} />
                  </div>
              </div>
              <div className="px-5 pb-5">
                  <div className="h-1.5 w-full bg-barber-950 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500" style={{ width: `${(financeToday.received / (financeToday.received + financeToday.pending)) * 100}%` }}></div>
                  </div>
                  <div className="flex justify-between mt-2">
                      <span className="text-[10px] text-muted">Meta Diária: R$ 2.000</span>
                      <span className="text-[10px] font-bold text-white">Proj: R$ {financeToday.projected}</span>
                  </div>
              </div>
          </Card>

          {/* 9) TOP SERVIÇOS (Restaurado) */}
          <Card noPadding>
              <div className="p-4 border-b border-barber-800 bg-barber-950/30">
                  <h3 className="font-bold text-main text-sm">Top Serviços (Vol.)</h3>
              </div>
              <div className="p-4 space-y-4">
                  {topServices.map((service, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                          <div className="font-bold text-muted text-xs w-4">#{idx + 1}</div>
                          <div className="flex-1">
                              <div className="flex justify-between text-xs mb-1">
                                  <span className="text-main font-bold">{service.name}</span>
                                  <span className="text-muted">{service.count}</span>
                              </div>
                              <div className="h-1.5 w-full bg-barber-950 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full" 
                                    style={{ width: `${(service.count / 50) * 100}%`, backgroundColor: service.color }}
                                  ></div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </Card>
      </div>

      {/* === LINHA 4: ANÁLISE DE DADOS === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 10) RESUMO 7 DIAS (Mantido) */}
          <Card noPadding className="relative group">
              <div className="p-4 border-b border-barber-800 bg-barber-950/30 flex justify-between items-center">
                  <h3 className="font-bold text-main text-sm">Performance 7 Dias</h3>
                  <Badge variant="outline" size="sm">+12% vs semana ant.</Badge>
              </div>
              <div className="h-[140px] w-full p-2">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyData}>
                          <defs>
                              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <Tooltip 
                              contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                              itemStyle={{ color: '#fff' }}
                          />
                          <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </Card>

          {/* 11) CLIENTES DE HOJE (Mantido) */}
          <Card noPadding>
              <div className="p-4 border-b border-barber-800 bg-barber-950/30 flex justify-between items-center">
                  <h3 className="font-bold text-main text-sm flex items-center gap-2">
                      <UserPlus size={16} className="text-purple-400" /> Fluxo de Clientes
                  </h3>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 flex flex-col items-center justify-center">
                      <div className="text-2xl font-bold text-purple-400">{todayClients.new}</div>
                      <div className="text-[10px] uppercase font-bold text-purple-300">Novos (Hoje)</div>
                  </div>
                  <div className="bg-barber-950 border border-barber-800 rounded-xl p-3 flex flex-col items-center justify-center">
                      <div className="text-2xl font-bold text-main">{todayClients.recurring}</div>
                      <div className="text-[10px] uppercase font-bold text-muted">Recorrentes</div>
                  </div>
              </div>
              <div className="px-4 pb-4">
                  <Button size="sm" variant="ghost" className="w-full text-xs h-8 border border-barber-800">
                      <MessageCircle size={14} className="mr-2" /> Enviar Msg Boas-vindas
                  </Button>
              </div>
          </Card>

          {/* 12) DISPONÍVEIS AGORA (Mantido) */}
          <Card noPadding>
              <div className="p-4 border-b border-barber-800 bg-barber-950/30 flex justify-between items-center">
                  <h3 className="font-bold text-main text-sm flex items-center gap-2">
                      <Zap size={16} className="text-yellow-400" /> Disponíveis Agora
                  </h3>
                  <span className="text-[10px] bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded font-bold uppercase">Encaixe Rápido</span>
              </div>
              <div className="divide-y divide-barber-800">
                  {availableNow.map(barber => (
                      <div key={barber.id} className="p-3 flex items-center justify-between hover:bg-barber-800/20 transition-colors group cursor-pointer">
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-barber-800 flex items-center justify-center font-bold text-xs">
                                  {barber.name.charAt(0)}
                              </div>
                              <div>
                                  <div className="text-sm font-bold text-main">{barber.name}</div>
                                  <div className="text-[10px] text-muted">{barber.services.join(', ')}</div>
                              </div>
                          </div>
                          <div className="text-right">
                              <div className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded mb-1">{barber.nextSlot}</div>
                              <button className="text-[10px] text-muted group-hover:text-main underline decoration-dashed">Agendar</button>
                          </div>
                      </div>
                  ))}
              </div>
          </Card>
      </div>

      {/* === SEÇÃO 5: ATIVIDADES RECENTES (FEED) === */}
      <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
                  <Bell size={16} /> Atividades Recentes
              </h2>
              <button className="text-xs text-barber-gold hover:underline">Ver Histórico</button>
          </div>
          
          <div className="bg-barber-900 border border-barber-800 rounded-xl overflow-hidden divide-y divide-barber-800">
              {activityFeed.map((activity) => (
                  <div key={activity.id} className="p-4 flex items-center gap-4 hover:bg-barber-800/20 transition-colors">
                      <div className={`p-2 rounded-full shrink-0 ${
                          activity.type === 'new_booking' ? 'bg-sky-500/10 text-sky-500' :
                          activity.type === 'completed' ? 'bg-green-500/10 text-green-500' :
                          activity.type === 'payment' ? 'bg-emerald-500/10 text-emerald-500' :
                          'bg-amber-500/10 text-amber-500'
                      }`}>
                          {activity.type === 'new_booking' && <CalendarIcon size={16} />}
                          {activity.type === 'completed' && <CheckCircle2 size={16} />}
                          {activity.type === 'payment' && <DollarSign size={16} />}
                          {activity.type === 'reschedule' && <RefreshCw size={16} />}
                      </div>
                      <div className="flex-1">
                          <div className="text-sm text-main font-medium">{activity.text}</div>
                      </div>
                      <div className="text-xs text-muted font-mono">
                          {activity.time}
                      </div>
                  </div>
              ))}
          </div>
      </div>

    </div>
  );
};

export default Dashboard;
