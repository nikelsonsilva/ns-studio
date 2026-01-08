
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
  Target,
  Loader2,
  Star,
  History
} from 'lucide-react';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { SystemSettings } from '../types';
import { useDashboardData } from '../lib/hooks/useDashboardData';
import { supabase } from '../lib/supabase';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { useToast } from './ui/Toast';
import { getProfessionalsAvailableNow, type ProfessionalAvailableNow } from '../lib/availabilityNow';
import { getCurrentBusinessId } from '../lib/database';
import ManualBookingModal from './ManualBookingModal';
import type { Professional } from '../types';

interface DashboardProps {
  settings?: SystemSettings;
  onGoToSettings?: () => void;
  onGoToCalendar?: (date?: Date) => void;
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
      <div className="absolute flex items-center justify-center text-lg font-bold text-[var(--text-primary)]">
        {percentage.toFixed(0)}%
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ settings, onGoToSettings, onGoToCalendar }) => {
  const [filterDate, setFilterDate] = useState<'today' | 'tomorrow' | 'week'>('today');
  const toast = useToast();

  // States para o botão de Página Pública e Novo Agendamento
  const [businessSlug, setBusinessSlug] = React.useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = React.useState(false);
  const [professionals, setProfessionals] = React.useState<Professional[]>([]);
  const [selectedProfessional, setSelectedProfessional] = React.useState<Professional | null>(null);

  // =====================================================
  // DADOS REAIS DO BANCO DE DADOS
  // =====================================================
  const {
    stats,
    chairs,
    weeklyRevenue,
    monthlyGoal,
    pendingRequests,
    topServices,
    recentActivities,
    newClientsForWelcome,
    isLoading,
    error,
    refresh
  } = useDashboardData();

  // State para profissionais disponíveis em tempo real (com freeMinutes)
  const [availableNow, setAvailableNow] = React.useState<ProfessionalAvailableNow[]>([]);
  const [businessClosedMessage, setBusinessClosedMessage] = React.useState<string | null>(null);
  const [isBusinessOpen, setIsBusinessOpen] = React.useState<boolean | null>(null); // null = carregando
  const [businessHoursToday, setBusinessHoursToday] = React.useState<string>('');

  // Buscar profissionais disponíveis com minutos livres e status do negócio
  React.useEffect(() => {
    const loadAvailableNow = async () => {
      const businessId = await getCurrentBusinessId();
      if (!businessId) {
        // [LOG REMOVED]
        setIsBusinessOpen(false);
        setBusinessHoursToday('Não configurado');
        return;
      }

      // Buscar horários de funcionamento para verificar se está fechado
      const { data: business, error } = await supabase
        .from('businesses')
        .select('business_hours')
        .eq('id', businessId)
        .single();

      if (error) {
        console.error('[Dashboard] Error fetching business hours:', error);
        setIsBusinessOpen(false);
        return;
      }

      // [LOG REMOVED]

      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayNamesPt = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
      const now = new Date();
      const dayOfWeek = now.getDay();
      const todayKey = dayNames[dayOfWeek];
      const todayNamePt = dayNamesPt[dayOfWeek];

      // [LOG REMOVED]

      const businessDay = business?.business_hours?.[todayKey as keyof typeof business.business_hours] as { open: string; close: string; closed: boolean } | undefined;

      // [LOG REMOVED]

      // Verificar se está fechado (nao tem config OU closed = true)
      if (!businessDay || businessDay.closed === true) {
        // [LOG REMOVED]
        setBusinessClosedMessage(`O estabelecimento não abre ${todayNamePt}.`);
        setIsBusinessOpen(false);
        setBusinessHoursToday('Fechado');
        setAvailableNow([]);
        return;
      }

      // Salvar horário de funcionamento
      setBusinessHoursToday(`${businessDay.open} - ${businessDay.close}`);

      // Verificar se fora do horário de funcionamento
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      // [LOG REMOVED]

      if (currentTime < businessDay.open || currentTime >= businessDay.close) {
        // [LOG REMOVED]
        setBusinessClosedMessage(`Fora do horário de funcionamento (${businessDay.open} - ${businessDay.close}).`);
        setIsBusinessOpen(false);
        setAvailableNow([]);
        return;
      }

      // [LOG REMOVED]
      setIsBusinessOpen(true);
      setBusinessClosedMessage(null);
      const data = await getProfessionalsAvailableNow(businessId);
      setAvailableNow(data);
    };
    loadAvailableNow();
    // Removido auto-refresh - atualiza apenas no clique do botão ou ao navegar
  }, []);

  // Buscar slug do negócio e lista de profissionais
  React.useEffect(() => {
    const loadBusinessData = async () => {
      const businessId = await getCurrentBusinessId();
      if (!businessId) return;

      // Buscar slug
      const { data: business } = await supabase
        .from('businesses')
        .select('public_slug')
        .eq('id', businessId)
        .single();

      if (business?.public_slug) {
        setBusinessSlug(business.public_slug);
      }

      // Buscar profissionais ativos
      const { data: profs } = await supabase
        .from('professionals')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');

      if (profs && profs.length > 0) {
        setProfessionals(profs);
        setSelectedProfessional(profs[0]);
      }
    };
    loadBusinessData();
  }, []);

  // Calcular porcentagem da meta
  const goalPercentage = monthlyGoal.target > 0 ? (monthlyGoal.current / monthlyGoal.target) * 100 : 0;

  // Calcular status da equipe baseado nos chairs reais
  const teamStatus = {
    working: chairs.filter(c => c.status === 'busy').length,
    free: chairs.filter(c => c.status === 'free').length,
    break: chairs.filter(c => c.status === 'break').length
  };

  // Calcular ocupação
  const occupancy = chairs.length > 0 ? Math.round((teamStatus.working / chairs.length) * 100) : 0;

  // Próximo agendamento (primeiro pendente)
  const nextAppointment = pendingRequests.length > 0 ? pendingRequests[0] : null;

  // Alertas dinâmicos baseados nos dados reais
  const alerts = [];
  if (stats.agendamentosPendentes > 0) {
    alerts.push({ id: 1, text: `${stats.agendamentosPendentes} Agendamentos pendentes de confirmação`, type: 'warning' });
  }
  if (stats.taxaNoShow > 5) {
    alerts.push({ id: 2, text: `Taxa de No-Show alta: ${stats.taxaNoShow.toFixed(1)}%`, type: 'danger' });
  }

  // Loading state - Skeleton Loader
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in pb-24">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[var(--surface-card-50)] p-4 rounded-2xl border border-[var(--border-default)] animate-pulse">
          <div className="space-y-2">
            <div className="h-7 w-40 bg-[var(--surface-subtle)] rounded-lg" />
            <div className="h-4 w-32 bg-[var(--surface-subtle)] rounded" />
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-28 bg-[var(--surface-subtle)] rounded-xl" />
            <div className="h-9 w-24 bg-[var(--surface-subtle)] rounded-lg" />
            <div className="h-9 w-36 bg-[var(--brand-primary)]/20 rounded-lg" />
          </div>
        </div>

        {/* Grid 1: Priority Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Next Appointment Skeleton */}
          <Card noPadding className="p-5 border-l-4 border-l-[var(--brand-primary)] animate-pulse">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)]" />
                <div className="space-y-2">
                  <div className="h-3 w-20 bg-[var(--surface-subtle)] rounded" />
                  <div className="h-6 w-16 bg-[var(--surface-subtle)] rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-[var(--surface-subtle)] rounded-full" />
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-5 w-40 bg-[var(--surface-subtle)] rounded" />
              <div className="h-4 w-28 bg-[var(--surface-subtle)] rounded" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-9 bg-[var(--surface-subtle)] rounded-lg" />
              <div className="h-9 bg-[var(--surface-subtle)] rounded-lg" />
              <div className="h-9 bg-[var(--surface-subtle)] rounded-lg" />
            </div>
          </Card>

          {/* Online Appointments Skeleton */}
          <Card noPadding className="animate-pulse">
            <div className="p-4 border-b border-[var(--border-default)] flex justify-between items-center">
              <div className="h-5 w-40 bg-[var(--surface-subtle)] rounded" />
              <div className="h-5 w-8 bg-[var(--surface-subtle)] rounded-full" />
            </div>
            <div className="p-3 space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-[var(--surface-app)] border border-[var(--border-default)] rounded-xl p-3">
                  <div className="flex justify-between mb-2">
                    <div className="h-4 w-32 bg-[var(--surface-subtle)] rounded" />
                    <div className="h-4 w-16 bg-[var(--surface-subtle)] rounded-full" />
                  </div>
                  <div className="h-3 w-24 bg-[var(--surface-subtle)] rounded" />
                </div>
              ))}
            </div>
          </Card>

          {/* Alerts Skeleton */}
          <Card noPadding className="animate-pulse" style={{ background: 'var(--gradient-alert-card)' }}>
            <div className="p-5 border-b border-[var(--border-subtle)] flex justify-between items-center">
              <div className="h-5 w-32 bg-[var(--surface-subtle)] rounded" />
              <div className="h-5 w-6 bg-[var(--surface-subtle)] rounded-full" />
            </div>
            <div className="p-4 space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-[var(--surface-elevated)] rounded-lg p-3 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[var(--surface-subtle)]" />
                  <div className="h-3 flex-1 bg-[var(--surface-subtle)] rounded" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Section Header Skeleton */}
        <div className="flex items-center gap-2 mt-8 mb-4">
          <div className="h-4 w-4 bg-[var(--surface-subtle)] rounded" />
          <div className="h-4 w-48 bg-[var(--surface-subtle)] rounded" />
        </div>

        {/* Grid 2: Real-time Operations Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chairs Skeleton */}
          <Card noPadding className="animate-pulse">
            <div className="p-4 border-b border-[var(--border-default)] flex justify-between items-center">
              <div className="h-5 w-24 bg-[var(--surface-subtle)] rounded" />
              <div className="h-4 w-20 bg-[var(--surface-subtle)] rounded" />
            </div>
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-[var(--surface-app)] border border-[var(--border-default)] rounded-xl p-3 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--surface-subtle)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-[var(--surface-subtle)] rounded" />
                    <div className="h-2 w-full bg-[var(--surface-subtle)] rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Today's Agenda Skeleton */}
          <Card noPadding className="animate-pulse">
            <div className="p-4 border-b border-[var(--border-default)] flex justify-between items-center">
              <div className="h-5 w-32 bg-[var(--surface-subtle)] rounded" />
              <div className="h-4 w-12 bg-[var(--surface-subtle)] rounded" />
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <div className="h-8 w-16 bg-[var(--surface-subtle)] rounded" />
                  <div className="h-3 w-24 bg-[var(--surface-subtle)] rounded" />
                </div>
                <div className="space-y-1 text-right">
                  <div className="h-6 w-12 bg-[var(--surface-subtle)] rounded" />
                  <div className="h-3 w-16 bg-[var(--surface-subtle)] rounded" />
                </div>
              </div>
              <div className="h-3 w-full bg-[var(--surface-subtle)] rounded-full" />
            </div>
          </Card>

          {/* Team Online Skeleton */}
          <Card noPadding className="animate-pulse">
            <div className="p-4 border-b border-[var(--border-default)] flex justify-between items-center">
              <div className="h-5 w-28 bg-[var(--surface-subtle)] rounded" />
              <div className="h-4 w-16 bg-[var(--surface-subtle)] rounded" />
            </div>
            <div className="p-3 flex items-center justify-around">
              {[1, 2, 3].map(i => (
                <div key={i} className="text-center space-y-2">
                  <div className="h-8 w-8 mx-auto bg-[var(--surface-subtle)] rounded" />
                  <div className="h-3 w-16 bg-[var(--surface-subtle)] rounded" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Section Header Skeleton */}
        <div className="flex items-center gap-2 mt-8 mb-4">
          <div className="h-4 w-4 bg-[var(--surface-subtle)] rounded" />
          <div className="h-4 w-40 bg-[var(--surface-subtle)] rounded" />
        </div>

        {/* Grid 3: Financial Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Goal Gauge Skeleton */}
          <Card noPadding className="p-6 animate-pulse">
            <div className="flex items-center justify-between gap-4">
              <div className="w-24 h-24 rounded-full bg-[var(--surface-subtle)]" />
              <div className="space-y-2 flex-1">
                <div className="h-3 w-20 bg-[var(--surface-subtle)] rounded" />
                <div className="h-7 w-28 bg-[var(--surface-subtle)] rounded" />
                <div className="h-4 w-20 bg-[var(--surface-subtle)] rounded" />
              </div>
            </div>
          </Card>

          {/* Cash Today Skeleton */}
          <Card noPadding className="p-5 animate-pulse" style={{ background: 'var(--gradient-finance-card)' }}>
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <div className="h-4 w-24 bg-[var(--surface-subtle)] rounded" />
                <div className="h-9 w-36 bg-[var(--surface-subtle)] rounded" />
                <div className="h-4 w-28 bg-[var(--surface-subtle)] rounded" />
              </div>
              <div className="w-12 h-12 bg-[var(--surface-subtle)] rounded-lg" />
            </div>
          </Card>

          {/* Chart Skeleton */}
          <Card noPadding className="animate-pulse">
            <div className="p-4 border-b border-[var(--border-default)] flex justify-between items-center">
              <div className="h-5 w-36 bg-[var(--surface-subtle)] rounded" />
              <div className="h-5 w-16 bg-[var(--surface-subtle)] rounded-full" />
            </div>
            <div className="p-4">
              <div className="h-[120px] w-full bg-[var(--surface-subtle)] rounded-lg flex items-end gap-1 p-2">
                {[40, 60, 35, 80, 55, 70, 45].map((h, i) => (
                  <div key={i} className="flex-1 bg-[var(--brand-primary)]/20 rounded-t" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const handleWhatsApp = (phone: string) => {
    if (!phone) {
      toast.error('Número de telefone não disponível');
      return;
    }
    window.open(`https://wa.me/55${phone.replace(/\D/g, '')}`, '_blank');
  };

  // Enviar mensagem de boas-vindas para novos clientes
  const handleSendWelcomeMessage = () => {
    if (newClientsForWelcome.length === 0) {
      toast.info('Não há novos clientes com telefone este mês');
      return;
    }

    // Pegar o primeiro cliente novo para enviar mensagem
    const firstClient = newClientsForWelcome[0];
    const message = encodeURIComponent(
      `Olá ${firstClient.name}! 💈\n\nSeja bem-vindo(a) ao nosso salão! É um prazer tê-lo(a) como cliente.\n\nAgradecemos sua preferência!`
    );
    const phone = firstClient.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    toast.success(`Mensagem enviada para ${firstClient.name}`);
  };

  // Confirmar agendamento pendente
  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed', updated_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (error) {
        toast.error('Erro ao confirmar agendamento');
        console.error(error);
        return;
      }

      toast.success('Agendamento confirmado!');
      refresh(); // Atualiza os dados do dashboard
    } catch (err) {
      toast.error('Erro ao confirmar agendamento');
      console.error(err);
    }
  };

  // Realizar check-in (marcar como em andamento)
  const handleCheckIn = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'in_progress', updated_at: new Date().toISOString() })
        .eq('id', appointmentId);

      if (error) {
        toast.error('Erro ao realizar check-in');
        console.error(error);
        return;
      }

      toast.success('Check-in realizado com sucesso!');
      refresh();
    } catch (err) {
      toast.error('Erro ao realizar check-in');
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">

      {/* === HEADER === */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[var(--surface-card-50)] p-4 rounded-2xl border border-[var(--border-default)] backdrop-blur-sm sticky top-0 z-20">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Visão Geral</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`flex h-2 w-2 rounded-full ${isBusinessOpen === null ? 'bg-[var(--text-subtle)]' : isBusinessOpen ? 'bg-[var(--status-success)] animate-pulse' : 'bg-[var(--status-error)]'}`}></span>
            <p className="text-xs text-[var(--text-muted)]">
              {isBusinessOpen === null ? 'Carregando...' : isBusinessOpen ? 'Loja Aberta' : 'Loja Fechada'}
              {businessHoursToday && ` • ${businessHoursToday}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Filter Chips */}
          <div className="flex bg-[var(--surface-app)] p-1 rounded-xl border border-[var(--border-default)]">
            <button
              onClick={() => setFilterDate('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterDate === 'today'
                ? 'bg-[var(--surface-subtle)] text-[var(--text-primary)] shadow'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              Hoje
            </button>
            <button
              onClick={() => setFilterDate('tomorrow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterDate === 'tomorrow'
                ? 'bg-[var(--surface-subtle)] text-[var(--text-primary)] shadow'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              Amanhã
            </button>
            <button
              onClick={() => setFilterDate('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterDate === 'week'
                ? 'bg-[var(--surface-subtle)] text-[var(--text-primary)] shadow'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              Semana
            </button>
          </div>

          <div className="h-8 w-px bg-[var(--border-default)] hidden sm:block"></div>

          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex"
            leftIcon={<RefreshCw size={14} />}
            onClick={() => refresh()}
          >
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="hidden sm:flex"
            leftIcon={<ExternalLink size={14} />}
            onClick={() => {
              if (businessSlug) {
                window.open(`/${businessSlug}/agendamento`, '_blank');
              } else {
                toast.warning('Configure o slug do estabelecimento nas Configurações');
              }
            }}
          >
            Página Pública
          </Button>

          <Button
            onClick={() => {
              if (selectedProfessional) {
                setShowBookingModal(true);
              } else {
                toast.warning('Nenhum profissional cadastrado');
              }
            }}
            leftIcon={<Plus size={16} />}
            className="shadow-lg shadow-amber-500/20 flex-1 sm:flex-none"
          >
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* === LINHA 1: PRIORIDADE E STATUS IMEDIATO === */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

        {/* 1) PRÓXIMO ATENDIMENTO */}
        <Card noPadding className="relative overflow-hidden group bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--brand-primary)]/50 transition-all border-l-4 border-l-[var(--brand-primary)]">
          <div className="p-5 flex flex-col h-full justify-between relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle)] flex items-center justify-center text-[var(--brand-primary)] font-bold text-lg">
                  {nextAppointment?.clientName?.charAt(0) || '?'}
                </div>
                <div>
                  <div className="text-xs font-bold text-[var(--brand-primary)] uppercase tracking-wider mb-0.5">Próximo da Fila</div>
                  <h3 className="font-bold text-[var(--text-primary)] text-lg leading-none">{nextAppointment?.time || '--:--'}</h3>
                </div>
              </div>
              <Badge variant={nextAppointment ? 'warning' : 'outline'} size="sm">
                {nextAppointment ? 'Pendente' : 'Vazio'}
              </Badge>
            </div>

            <div className="mb-4">
              <div className="text-[var(--text-primary)] font-bold text-lg">{nextAppointment?.clientName || 'Sem agendamentos'}</div>
              <div className="text-sm text-[var(--text-muted)] flex items-center gap-1.5 mt-1">
                <Scissors size={14} /> {nextAppointment?.service || '-'}
              </div>
              <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 mt-1">
                <CalendarIcon size={14} /> {nextAppointment?.date || '-'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-auto">
              <Button size="sm" variant="secondary" className="col-span-1" onClick={() => nextAppointment && handleCheckIn(nextAppointment.id)} title="Realizar Check-in" disabled={!nextAppointment}>
                <CheckCircle2 size={16} /> Check-in
              </Button>
              <Button size="sm" variant="secondary" className="col-span-1 bg-green-600/10 text-[var(--status-success)] hover:bg-green-600 hover:text-[var(--text-primary)] border-green-600/20" onClick={() => handleWhatsApp('')} disabled={!nextAppointment}>
                <MessageCircle size={16} /> Whats
              </Button>
              <Button size="sm" variant="outline" className="col-span-1" onClick={onGoToCalendar} disabled={!nextAppointment}>
                <RefreshCw size={16} /> Mover
              </Button>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Clock size={100} />
          </div>
        </Card>

        {/* 2) AGENDAMENTOS ONLINE - DADOS REAIS */}
        <Card noPadding className="flex flex-col bg-[var(--surface-card)] border border-[var(--border-default)] h-full">
          <div className="p-4 border-b border-[var(--border-default)] flex justify-between items-center bg-[var(--surface-elevated)]">
            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-sm">
              <MessageCircle size={16} className="text-[var(--status-success)]" /> Agendamentos Online
            </h3>
            <Badge variant="success" size="sm" className="bg-[var(--dark-status-success-bg-20)] text-[var(--dark-status-success)] border-[var(--dark-status-success-border)]">{pendingRequests.length}</Badge>
          </div>

          <div className="overflow-y-auto p-3 space-y-3 max-h-[190px]" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
            {pendingRequests.map(req => {
              // Determinar ícone e cor baseado na origem
              const sourceConfig = {
                'public': { label: 'Link Público', color: 'bg-[var(--dark-status-info-bg)] text-[var(--dark-status-info-light)] border-[var(--dark-status-info-border)]' },
                'public_link': { label: 'Link Público', color: 'bg-[var(--dark-status-info-bg)] text-[var(--dark-status-info-light)] border-[var(--dark-status-info-border)]' },
                'whatsapp': { label: 'WhatsApp', color: 'bg-[var(--dark-accent-green-bg)] text-[var(--status-success)] border-[var(--dark-accent-green-border)]' },
                'manual': { label: 'Manual', color: 'bg-[var(--surface-subtle)] text-[var(--text-muted)] border-[var(--border-default)]' },
                'app': { label: 'App', color: 'bg-[var(--dark-accent-purple-bg)] text-[var(--dark-accent-purple-light)] border-[var(--dark-accent-purple-border)]' },
              };
              const source = (req.source || 'manual').toLowerCase();
              const config = sourceConfig[source as keyof typeof sourceConfig] || sourceConfig.manual;

              return (
                <div key={req.id} className="bg-[var(--surface-app)] border border-[var(--border-default)] rounded-xl p-3 flex flex-col gap-2 group hover:border-[var(--border-strong)] transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)] text-sm">{req.clientName}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${config.color}`}>{config.label}</span>
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                        <Clock size={10} /> {req.time} • {req.date}
                      </div>
                    </div>
                    {/* Status badge dinâmico */}
                    {req.status === 'confirmed' || req.paymentStatus === 'paid' ? (
                      <span className="text-[9px] font-bold bg-[var(--dark-status-success-bg)] text-[var(--dark-status-success)] px-2 py-0.5 rounded border border-[var(--dark-status-success-border)] uppercase">
                        {req.paymentStatus === 'paid' ? 'Pago' : 'Confirmado'}
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold bg-[var(--dark-status-warning-bg)] text-[var(--dark-status-warning)] px-2 py-0.5 rounded border border-[var(--dark-status-warning-border)] uppercase">Pendente</span>
                    )}
                  </div>

                  <div className="flex justify-between items-end border-t border-[var(--border-subtle)] pt-2 mt-1">
                    <span className="text-xs text-[var(--text-muted)] font-medium">{req.service}</span>
                    <button
                      onClick={() => onGoToCalendar?.(new Date(req.startDatetime))}
                      className="flex items-center gap-1 text-[10px] font-bold text-[var(--dark-status-info)] hover:text-[var(--dark-status-info-light)] bg-[var(--dark-status-info-bg)] hover:bg-[var(--dark-status-info-bg-20)] px-2 py-1 rounded transition-colors"
                    >
                      <CalendarIcon size={12} /> Ver na Agenda
                    </button>
                  </div>
                </div>
              );
            })}
            {pendingRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center h-[120px] text-center px-4">
                <div className="p-3 rounded-full bg-[var(--surface-subtle)] mb-3">
                  <MessageCircle size={20} className="text-[var(--dark-status-success)] opacity-50" />
                </div>
                <p className="text-[var(--text-muted)] text-xs font-medium">Nenhum agendamento pendente</p>
                <p className="text-[var(--text-muted)]/60 text-[10px] mt-1">Compartilhe seu link público para receber novos clientes!</p>
              </div>
            )}
          </div>
        </Card>

        {/* 3) ALERTAS E AÇÕES - DADOS REAIS */}
        <Card noPadding className="flex flex-col bg-[var(--surface-card)] border border-[var(--border-alert)]" style={{ background: 'var(--gradient-alert-card)' }}>
          <div className="p-5 border-b border-[var(--border-subtle)] flex justify-between items-center">
            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-sm">
              <AlertCircle size={18} className="text-[var(--accent-rose)]" /> Alertas e Ações
            </h3>
            <Badge variant="danger" size="sm">{alerts.length}</Badge>
          </div>
          <div className="p-4 flex-1 space-y-3 overflow-y-auto h-[200px]">
            {alerts.length > 0 ? alerts.map(alert => (
              <div key={alert.id} className="bg-[var(--surface-elevated)] border border-[var(--border-default)] rounded-lg p-3 flex items-start justify-between gap-3 group hover:border-[var(--border-strong)] transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full ${alert.type === 'danger' ? 'bg-[var(--accent-rose)]' : 'bg-[var(--status-warning)]'} animate-pulse`}></div>
                  <span className="text-xs text-[var(--text-muted)] font-medium leading-tight">{alert.text}</span>
                </div>
                <button onClick={onGoToCalendar} className="text-[10px] font-bold text-[var(--brand-primary)] hover:underline whitespace-nowrap">Resolver</button>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] text-xs">
                <CheckCircle2 size={24} className="mb-2 opacity-50" />
                Tudo certo por aqui!
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* === LINHA 2: OPERACIONAL AO VIVO === */}
      <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mt-8 mb-4 flex items-center gap-2">
        <Activity size={16} /> Operação em Tempo Real
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 4) CADEIRAS - DADOS REAIS */}
        <Card noPadding className="flex flex-col bg-[var(--dark-bg-card)] border border-[var(--dark-border-default)]">
          <div className="p-4 border-b border-[var(--dark-border-default)] bg-[var(--dark-bg-elevated-30)] flex justify-between items-center">
            <h3 className="font-bold text-[var(--dark-text-main)] flex items-center gap-2 text-sm">
              <Armchair size={16} className="text-[var(--dark-status-info)]" /> Cadeiras
            </h3>
            <span className="text-[10px] text-[var(--dark-text-muted)] font-bold uppercase">
              {teamStatus.working} / {chairs.length} Ocupadas
            </span>
          </div>

          <div className="flex-1 p-4 space-y-3 max-h-[240px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--dark-scrollbar-thumb) transparent' }}>
            {chairs.map((chair, index) => {
              const progress = chair.duration && chair.duration > 0 ? ((chair.elapsed || 0) / chair.duration) * 100 : 0;
              const timeRemaining = chair.status === 'busy' ? `${(chair.duration || 0) - (chair.elapsed || 0)} min` : '';

              return (
                <div key={chair.id} className="bg-[var(--dark-bg-elevated-50)] border border-[var(--dark-border-default)] rounded-xl p-3 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 shadow-lg ${chair.status === 'busy'
                    ? 'bg-[var(--dark-brand-primary)] text-[var(--dark-text-inverted)]'
                    : 'bg-[var(--dark-bg-subtle)] text-[var(--dark-text-subtle)]'
                    }`}>
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-sm font-bold truncate ${chair.status === 'busy' ? 'text-[var(--dark-text-main)]' : 'text-[var(--dark-text-muted)]'
                        }`}>
                        {chair.name}
                      </span>
                      {chair.status === 'busy' && (
                        <span className="text-[10px] font-bold text-[var(--dark-status-success)]">{timeRemaining}</span>
                      )}
                    </div>

                    {chair.status === 'busy' ? (
                      <>
                        <div className="text-[10px] text-[var(--dark-text-muted)] mb-1">{chair.currentClient} • {chair.currentService}</div>
                        <div className="h-1.5 w-full bg-[var(--dark-bg-subtle)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--dark-status-info)] rounded-full transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </>
                    ) : chair.status === 'break' ? (
                      <div className="text-[10px] text-[var(--dark-status-warning)] flex items-center gap-1">
                        <Coffee size={10} /> Em pausa
                      </div>
                    ) : (
                      <div className="text-[10px] text-[var(--dark-text-faint)] italic">Aguardando cliente...</div>
                    )}
                  </div>
                </div>
              );
            })}
            {chairs.length === 0 && (
              <div className="text-center text-[var(--dark-text-muted)] text-xs py-4">
                Nenhum profissional cadastrado
              </div>
            )}
          </div>
        </Card>

        {/* 5) AGENDA DE HOJE - DADOS REAIS */}
        <Card noPadding className="flex flex-col bg-[var(--surface-card)] border border-[var(--border-default)]">
          <div className="p-4 border-b border-[var(--border-default)] flex justify-between items-center bg-[var(--surface-header)]">
            <h3 className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-sm">
              <CalendarIcon size={16} className="text-[var(--status-info)]" /> Agenda de Hoje
            </h3>
            <button onClick={onGoToCalendar} className="text-xs font-bold text-[var(--status-info)] hover:underline flex items-center gap-1">
              Ver <ChevronRight size={12} />
            </button>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-[var(--text-primary)]">{stats.agendamentosHoje}</div>
                <div className="text-xs text-[var(--text-muted)] uppercase font-bold">Agendamentos</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-[var(--status-info)]">{occupancy}%</div>
                <div className="text-xs text-[var(--text-muted)] uppercase font-bold">Ocupação</div>
              </div>
            </div>

            <div className="w-full h-3 bg-[var(--surface-app)] rounded-full overflow-hidden flex border border-[var(--border-default)]">
              <div className="h-full bg-[var(--status-success)]" style={{ width: `${stats.agendamentosHoje > 0 ? ((stats.agendamentosHoje - stats.agendamentosPendentes) / stats.agendamentosHoje) * 100 : 0}%` }} title="Confirmados"></div>
              <div className="h-full bg-[var(--status-warning)]" style={{ width: `${stats.agendamentosHoje > 0 ? (stats.agendamentosPendentes / stats.agendamentosHoje) * 100 : 0}%` }} title="Pendentes"></div>
            </div>
            <div className="flex justify-between text-[10px] font-bold uppercase text-[var(--text-muted)] mt-1">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--status-success)]"></div> {stats.agendamentosHoje - stats.agendamentosPendentes} Conf</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[var(--status-warning)]"></div> {stats.agendamentosPendentes} Pend</span>
            </div>
          </div>
        </Card>

        {/* 6) EQUIPE ONLINE - DADOS REAIS */}
        <Card noPadding className="bg-[var(--surface-card)] border border-[var(--border-default)]">
          <div className="p-4 border-b border-[var(--border-default)] bg-[var(--surface-header)] flex justify-between items-center">
            <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
              <Users size={16} className="text-[var(--accent-indigo)]" /> Equipe Online
            </h3>
            <button className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1">
              Escala <ArrowRight size={10} />
            </button>
          </div>
          <div className="p-3 flex items-center justify-around">
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--status-success)]">{teamStatus.working}</div>
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] mt-1">Atendendo</div>
            </div>
            <div className="h-8 w-px bg-[var(--border-default)]"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--status-info)]">{teamStatus.free}</div>
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] mt-1">Livres</div>
            </div>
            <div className="h-8 w-px bg-[var(--border-default)]"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[var(--status-warning)]">{teamStatus.break}</div>
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] mt-1">Pausa</div>
            </div>
          </div>
        </Card>
      </div>

      {/* === LINHA 3: FINANCEIRO & METAS === */}
      <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mt-8 mb-4 flex items-center gap-2">
        <TrendingUp size={16} /> Gestão & Performance
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 7) META MENSAL - DADOS REAIS */}
        <Card noPadding className="bg-[var(--surface-card)] h-full flex flex-col justify-center">
          <div className="flex-1 p-6 flex items-center justify-between gap-4">
            <GoalGauge percentage={goalPercentage} />
            <div>
              <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                <Target size={12} /> Meta {monthlyGoal.periodLabel}
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">R$ {monthlyGoal.current.toLocaleString('pt-BR')}</div>
              <div className="text-xs text-[var(--text-muted)]">de R$ {monthlyGoal.target.toLocaleString('pt-BR')}</div>
            </div>
          </div>
          <div className="border-t border-[var(--border-default)] bg-[var(--surface-app)]/30 grid grid-cols-2 divide-x divide-[var(--dark-divider-barber)]">
            <div className="p-3 text-center">
              <div className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-0.5">Hoje</div>
              <div className="text-sm font-bold text-[var(--dark-status-success)]">R$ {stats.faturamentoHoje.toLocaleString('pt-BR')}</div>
            </div>
            <div className="p-3 text-center">
              <div className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-0.5">Média Diária</div>
              <div className="text-sm font-bold text-[var(--dark-status-info)]">R$ {monthlyGoal.dailyAverage.toFixed(0)}</div>
            </div>
          </div>
        </Card>

        {/* 8) FINANCEIRO DO DIA - DADOS REAIS */}
        <Card noPadding className="border border-[var(--border-finance)]" style={{ background: 'var(--gradient-finance-card)' }}>
          <div className="p-5 flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase flex items-center gap-2">
                <DollarSign size={16} className="text-[var(--dark-status-success)]" /> Caixa do Dia
              </h3>
              <div className="text-3xl font-bold text-[var(--text-primary)] mt-2">
                R$ {stats.faturamentoHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-[var(--dark-status-success-light)] mt-1 font-medium">
                Projeção: R$ {monthlyGoal.projection.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-2 bg-[var(--dark-status-success-bg)] rounded-lg text-[var(--dark-status-success)] border border-[var(--dark-status-success-border)]">
              <Wallet size={24} />
            </div>
          </div>
          <div className="px-5 pb-5">
            <div className="h-1.5 w-full bg-[var(--surface-subtle)] rounded-full overflow-hidden flex">
              <div className="h-full bg-[var(--dark-status-success)]" style={{ width: `${goalPercentage}%` }}></div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-[var(--text-muted)]">Meta: R$ {monthlyGoal.target.toLocaleString('pt-BR')}</span>
              <span className="text-[10px] font-bold text-[var(--text-primary)]">{goalPercentage.toFixed(1)}% atingido</span>
            </div>
          </div>
        </Card>

        {/* 9) RESUMO 7 DIAS - DADOS REAIS */}
        <Card noPadding className="relative group bg-[var(--surface-card)] border border-[var(--border-default)]">
          <div className="p-4 border-b border-[var(--border-default)] bg-[var(--surface-app)]/30 flex justify-between items-center">
            <h3 className="font-bold text-[var(--text-primary)] text-sm">Performance 7 Dias</h3>
            <Badge variant="outline" size="sm">Receita</Badge>
          </div>
          <div className="h-[140px] w-full p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyRevenue}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Receita']}
                />
                <Area type="monotone" dataKey="total" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* === LINHA 4: ANÁLISE DE DADOS === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 10) CLIENTES - DADOS REAIS */}
        <Card noPadding className="bg-[var(--surface-card)] border border-[var(--border-default)]">
          <div className="p-4 border-b border-[var(--border-default)] bg-[var(--surface-app)]/30 flex justify-between items-center">
            <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
              <UserPlus size={16} className="text-[var(--dark-accent-purple-light)]" /> Fluxo de Clientes
            </h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="bg-[var(--dark-accent-purple-bg)] border border-[var(--dark-accent-purple-border)] rounded-xl p-3 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-[var(--dark-accent-purple-light)]">{stats.novosClientesMes}</div>
              <div className="text-[10px] uppercase font-bold text-[var(--dark-accent-purple-lighter)]">Novos (Mês)</div>
            </div>
            <div className="bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl p-3 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.agendamentosHoje}</div>
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Atend. Hoje</div>
            </div>
          </div>
          <div className="px-4 pb-4">
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs h-8 border border-[var(--border-default)]"
              onClick={handleSendWelcomeMessage}
            >
              <MessageCircle size={14} className="mr-2" /> Enviar Msg Boas-vindas
            </Button>
          </div>
        </Card>

        {/* 11) DISPONÍVEIS AGORA - DADOS REAIS COM MINUTOS */}
        <Card noPadding className="bg-[var(--surface-card)] border border-[var(--border-default)]">
          <div className="p-4 border-b border-[var(--border-default)] bg-[var(--surface-app)]/30 flex justify-between items-center">
            <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
              <Zap size={16} className="text-[var(--dark-accent-yellow)]" /> Disponíveis Agora
            </h3>
            <span className="text-[10px] bg-[var(--dark-accent-green-bg)] text-[var(--status-success)] border border-[var(--dark-accent-green-border)] px-2 py-0.5 rounded font-bold uppercase">Encaixe Rápido</span>
          </div>
          <div className="divide-y divide-[var(--dark-divider-barber)]">
            {availableNow.map(prof => (
              <div key={prof.professionalId} className="p-3 flex items-center justify-between hover:bg-[var(--surface-subtle)]/20 transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center font-bold text-xs">
                    {prof.avatarUrl ? (
                      <img src={prof.avatarUrl} alt={prof.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      prof.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">{prof.name}</div>
                    <div className="text-[10px] text-[var(--text-muted)]">
                      {prof.services.length > 0 ? prof.services.map(s => s.name).slice(0, 2).join(', ') : 'Profissional'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-[var(--status-success)] bg-[var(--dark-accent-green-bg)] px-2 py-1 rounded mb-1">
                    Livre {prof.freeMinutes} min
                  </div>
                  <button className="text-[10px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] underline decoration-dashed" onClick={onGoToCalendar}>Agendar</button>
                </div>
              </div>
            ))}
            {availableNow.length === 0 && (
              <div className="p-6 flex flex-col items-center justify-center text-center">
                {businessClosedMessage ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-muted)]">
                        <path d="M3 21h18" />
                        <path d="M5 21V7l8-4v18" />
                        <path d="M19 21V11l-6-4" />
                        <path d="M9 9v.01" />
                        <path d="M9 12v.01" />
                        <path d="M9 15v.01" />
                        <path d="M9 18v.01" />
                      </svg>
                    </div>
                    <span className="text-[var(--text-muted)] text-xs">{businessClosedMessage}</span>
                  </>
                ) : (
                  <span className="text-[var(--text-muted)] text-xs">Todos ocupados no momento</span>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* 12) RESUMO FINANCEIRO */}
        <Card noPadding className="bg-[var(--surface-card)] border border-[var(--border-default)]">
          <div className="p-4 border-b border-[var(--border-default)] bg-[var(--surface-app)]/30">
            <h3 className="font-bold text-[var(--text-primary)] text-sm">Resumo Financeiro</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--surface-subtle)] text-[var(--brand-primary)]">
                <TrendingUp size={16} />
              </div>
              <div className="flex-1">
                <div className="text-xs text-[var(--text-muted)] uppercase font-bold">Faturamento Hoje</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">R$ {stats.faturamentoHoje.toLocaleString('pt-BR')}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--surface-subtle)] text-[var(--brand-primary)]">
                <Scissors size={16} />
              </div>
              <div className="flex-1">
                <div className="text-xs text-[var(--text-muted)] uppercase font-bold">vs Ontem</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">
                  R$ {stats.faturamentoOntem.toLocaleString('pt-BR')}
                  {stats.faturamentoOntem > 0 && (
                    <span className={`text-xs ml-2 ${stats.faturamentoHoje >= stats.faturamentoOntem ? 'text-[var(--dark-status-success)]' : 'text-[var(--dark-accent-rose)]'}`}>
                      {stats.faturamentoHoje >= stats.faturamentoOntem ? '+' : ''}{((stats.faturamentoHoje - stats.faturamentoOntem) / stats.faturamentoOntem * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--surface-subtle)] text-[var(--brand-primary)]">
                <AlertCircle size={16} />
              </div>
              <div className="flex-1">
                <div className="text-xs text-[var(--text-muted)] uppercase font-bold">Taxa No-Show</div>
                <div className="text-lg font-bold text-[var(--text-primary)]">{stats.taxaNoShow.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* === LINHA 5: TOP SERVIÇOS & ATIVIDADES RECENTES === */}
      <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mt-8 mb-4 flex items-center gap-2">
        <Star size={16} /> Insights & Atividades
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 13) TOP SERVIÇOS */}
        <Card noPadding className="bg-[var(--surface-card)] border border-[var(--border-default)]">
          <div className="p-4 border-b border-[var(--border-default)] bg-[var(--surface-elevated)] flex justify-between items-center">
            <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
              <Scissors size={16} className="text-[var(--brand-primary)]" /> Top Serviços
            </h3>
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Este Mês</span>
          </div>
          <div className="p-3 space-y-2 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
            {topServices && topServices.length > 0 ? topServices.map((service, index) => (
              <div key={service.id} className="bg-[var(--surface-muted)] border border-[var(--border-default)] rounded-lg p-2.5">
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[var(--brand-primary)] text-[var(--text-on-brand)] flex items-center justify-center text-[10px] font-bold">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-[var(--text-primary)] truncate">{service.name}</span>
                  </div>
                  <span className="text-xs font-bold text-[var(--text-muted)]">{service.count}x</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--dark-progress-bg)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--brand-primary)] rounded-full transition-all"
                    style={{ width: `${service.percentage}%` }}
                  />
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center h-[120px] text-center">
                <div className="p-3 rounded-full bg-[var(--surface-subtle)] mb-3">
                  <Scissors size={20} className="text-[var(--text-muted)] opacity-50" />
                </div>
                <p className="text-[var(--text-muted)] text-xs font-medium">Nenhum serviço realizado este mês</p>
              </div>
            )}
          </div>
        </Card>

        {/* 14) ATIVIDADES RECENTES */}
        <Card noPadding className="bg-[var(--surface-card)] border border-[var(--border-default)]">
          <div className="p-4 border-b border-[var(--border-default)] bg-[var(--surface-elevated)] flex justify-between items-center">
            <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
              <History size={16} className="text-[var(--status-info)]" /> Atividades Recentes
            </h3>
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Últimas</span>
          </div>
          <div className="divide-y divide-[var(--dark-divider-barber)] max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}>
            {recentActivities && recentActivities.length > 0 ? recentActivities.slice(0, 8).map(activity => {
              const iconConfig = {
                booking: { icon: CalendarIcon, bg: 'bg-[var(--dark-status-info-bg)]', color: 'text-[var(--status-info)]' },
                completed: { icon: CheckCircle2, bg: 'bg-[var(--dark-status-success-bg)]', color: 'text-[var(--status-success)]' },
                cancelled: { icon: AlertCircle, bg: 'bg-[var(--dark-status-error-bg)]', color: 'text-[var(--status-error)]' },
                payment: { icon: DollarSign, bg: 'bg-[var(--dark-accent-green-bg)]', color: 'text-[var(--accent-green)]' }
              };
              const config = iconConfig[activity.type] || iconConfig.booking;
              const IconComponent = config.icon;

              return (
                <div key={activity.id} className="p-3 flex items-center gap-3 hover:bg-[var(--surface-subtle)]/20 transition-colors">
                  <div className={`w-7 h-7 rounded-lg ${config.bg} ${config.color} flex items-center justify-center shrink-0`}>
                    <IconComponent size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--text-primary)] font-medium truncate">{activity.description}</p>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] font-bold shrink-0">{activity.timeAgo}</span>
                </div>
              );
            }) : (
              <div className="p-6 flex flex-col items-center justify-center text-center">
                <div className="p-3 rounded-full bg-[var(--surface-subtle)] mb-3">
                  <History size={20} className="text-[var(--text-muted)] opacity-50" />
                </div>
                <p className="text-[var(--text-muted)] text-xs font-medium">Nenhuma atividade recente</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Modal de Novo Agendamento */}
      {showBookingModal && selectedProfessional && (
        <ManualBookingModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            setShowBookingModal(false);
            refresh();
            toast.success('Agendamento criado com sucesso!');
          }}
          selectedDate={new Date()}
          selectedTime={new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          professional={selectedProfessional}
        />
      )}

    </div>
  );
};

export default Dashboard;

