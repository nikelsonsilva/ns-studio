
import React, { useState } from 'react';
import {
  TrendingUp,
  Users,
  Scissors,
  AlertCircle,
  MessageCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Target,
  Plus,
  DollarSign,
  Lock,
  Zap,
  Settings as SettingsIcon,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SystemSettings } from '../types';
import { useDashboardData } from '../lib/hooks/useDashboardData';

interface DashboardProps {
  settings?: SystemSettings;
  onGoToSettings?: () => void;
}


const StatCard = ({ title, value, subtext, icon: Icon, trend }: any) => (
  <div className="bg-barber-900 border border-barber-800 p-6 rounded-xl shadow-lg hover:border-barber-700 transition-colors">
    <div className="flex justify-between items-start mb-4">
      <div className="p-3 bg-barber-800 rounded-lg text-barber-gold">
        <Icon size={24} />
      </div>
      {trend && (
        <span className={`text-sm font-medium ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <h3 className="text-barber-700 text-sm font-medium uppercase tracking-wider mb-1">{title}</h3>
    <div className="text-3xl font-bold text-white mb-1">{value}</div>
    <p className="text-barber-700 text-xs">{subtext}</p>
  </div>
);

const AIInsightCard = ({ text, type, onClick }: { text: string, type: 'financial' | 'operational' | 'churn', onClick?: () => void }) => (
  <div
    onClick={onClick}
    className="bg-barber-950 border border-barber-800 p-4 rounded-lg flex items-start gap-3 relative overflow-hidden group hover:border-barber-gold/30 transition-all cursor-pointer"
  >
    <div className={`absolute top-0 left-0 w-1 h-full ${type === 'financial' ? 'bg-green-500' : type === 'operational' ? 'bg-blue-500' : 'bg-red-500'}`}></div>
    <div className="bg-barber-900 p-2 rounded-full shrink-0">
      <Sparkles size={16} className="text-barber-gold" />
    </div>
    <div>
      <h4 className="text-white text-sm font-bold mb-1 flex items-center gap-2">
        IA Insight
        <span className="text-[9px] text-gray-500 bg-black px-1.5 rounded uppercase">{type}</span>
      </h4>
      <p className="text-gray-400 text-xs leading-relaxed">{text}</p>
    </div>
    <button className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white">
      <ArrowRight size={16} />
    </button>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ settings, onGoToSettings }) => {
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Fetch real data from database
  const { stats, chairs, weeklyRevenue, monthlyGoal, pendingRequests, isLoading, error, refresh } = useDashboardData();

  const goalProgress = monthlyGoal.target > 0 ? (monthlyGoal.current / monthlyGoal.target) * 100 : 0;

  // Calculate trends
  const faturamentoTrend = stats.faturamentoOntem > 0
    ? ((stats.faturamentoHoje - stats.faturamentoOntem) / stats.faturamentoOntem) * 100
    : 0;
  const clientesTrend = stats.novosClientesMesAnterior > 0
    ? ((stats.novosClientesMes - stats.novosClientesMesAnterior) / stats.novosClientesMesAnterior) * 100
    : 0;

  // Determine which insights to show based on settings
  const showFinancial = settings?.aiConfig.enableInsights && settings?.aiConfig.insightTypes.financial;
  const showOperational = settings?.aiConfig.enableInsights && settings?.aiConfig.insightTypes.operational;
  const showChurn = settings?.aiConfig.enableInsights && settings?.aiConfig.insightTypes.churn;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-barber-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">

      {/* Quick Actions FAB */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col-reverse items-start gap-3">
        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isFabOpen ? 'bg-gray-800 text-white rotate-45' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
        >
          <Zap size={24} fill="currentColor" />
        </button>

        {isFabOpen && (
          <div className="flex flex-col-reverse gap-3 animate-fade-in">
            <button className="flex items-center gap-2 bg-barber-900 border border-barber-800 text-white px-4 py-2 rounded-full shadow-xl hover:bg-barber-800 transition-colors group">
              <span className="text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity absolute left-14 bg-black px-2 py-1 rounded">Novo Agendamento</span>
              <Plus size={20} className="text-green-500" />
            </button>
            {settings?.modules.finance && (
              <button className="flex items-center gap-2 bg-barber-900 border border-barber-800 text-white px-4 py-2 rounded-full shadow-xl hover:bg-barber-800 transition-colors group">
                <span className="text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity absolute left-14 bg-black px-2 py-1 rounded">Lançar Despesa</span>
                <DollarSign size={20} className="text-red-500" />
              </button>
            )}
            <button className="flex items-center gap-2 bg-barber-900 border border-barber-800 text-white px-4 py-2 rounded-full shadow-xl hover:bg-barber-800 transition-colors group">
              <span className="text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity absolute left-14 bg-black px-2 py-1 rounded">Bloquear Agenda</span>
              <Lock size={20} className="text-yellow-500" />
            </button>
          </div>
        )}
      </div>

      {/* Goal vs Realized Widget - Only if Finance enabled */}
      {settings?.modules.finance && (
        <div className="bg-gradient-to-r from-barber-900 to-barber-950 border border-barber-800 rounded-xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 p-8 opacity-5 pointer-events-none">
            <Target size={120} />
          </div>
          <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
            <div className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-2">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Target className="text-barber-gold" size={20} /> Meta {monthlyGoal.periodLabel}
                  </h2>
                  <p className="text-xs text-gray-400">Progresso atual de faturamento</p>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0 bg-barber-950/50 p-2 rounded-lg sm:bg-transparent sm:p-0">
                  <div className="text-2xl font-bold text-white">R$ {monthlyGoal.current.toLocaleString('pt-BR')}</div>
                  <div className="text-xs text-gray-500">Meta: R$ {monthlyGoal.target.toLocaleString('pt-BR')}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-4 w-full bg-barber-950 rounded-full border border-barber-800 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${Math.min(goalProgress, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                </div>
                {/* Goal Marker */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-white/50 z-20 right-0" style={{ left: '100%' }}></div>
              </div>
              <div className="mt-2 flex justify-between text-xs font-medium">
                <span className="text-green-500">{goalProgress.toFixed(1)}% Atingido</span>
                <span className="text-gray-500">Faltam R$ {(monthlyGoal.target - monthlyGoal.current).toLocaleString('pt-BR')}</span>
              </div>
            </div>

            <div className="shrink-0 flex w-full lg:w-auto items-center justify-between lg:justify-start gap-4 lg:border-l lg:border-barber-800 lg:pl-6 pt-4 lg:pt-0 border-t border-barber-800 lg:border-t-0">
              <div className="text-center flex-1 lg:flex-none">
                <div className="text-xs text-gray-500 uppercase font-bold">Projeção</div>
                <div className="text-xl font-bold text-blue-400">R$ {(monthlyGoal.projection / 1000).toFixed(1)}k</div>
              </div>
              <div className="text-center flex-1 lg:flex-none">
                <div className="text-xs text-gray-500 uppercase font-bold">Média Dia</div>
                <div className="text-xl font-bold text-barber-gold">R$ {monthlyGoal.dailyAverage.toFixed(0)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Chairs Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {chairs.map((chair, index) => {
          const progress = (chair.duration || 0) > 0 ? ((chair.elapsed || 0) / (chair.duration || 1)) * 100 : 0;
          return (
            <div key={chair.id} className={`bg-barber-900 border ${chair.status === 'busy' ? 'border-barber-800' : 'border-barber-800/50 opacity-80'} rounded-xl p-4 shadow-lg relative overflow-hidden group`}>
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${chair.status === 'busy' ? 'bg-barber-gold text-black' : 'bg-barber-800 text-gray-500'}`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 uppercase font-bold">Cadeira {index + 1}</div>
                    <div className="font-bold text-white text-sm">{chair.name}</div>
                  </div>
                </div>
                <span className={`w-2 h-2 rounded-full ${chair.status === 'busy' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
              </div>

              {chair.status === 'busy' ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-300 font-medium">{chair.currentClient}</span>
                    <span className="text-barber-gold">{chair.currentService}</span>
                  </div>

                  <div className="relative pt-1">
                    <div className="flex mb-1 items-center justify-between">
                      <span className="text-[10px] font-semibold inline-block text-gray-500">
                        {chair.elapsed || 0} min
                      </span>
                      <span className="text-[10px] font-semibold inline-block text-gray-500">
                        {chair.duration || 0} min
                      </span>
                    </div>
                    <div className="overflow-hidden h-1.5 mb-1 text-xs flex rounded bg-barber-950 border border-barber-800">
                      <div style={{ width: `${progress}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-1000"></div>
                    </div>
                  </div>
                  <div className="text-[10px] text-right text-green-400 font-bold">
                    Termina em {(chair.duration || 0) - (chair.elapsed || 0)} min
                  </div>
                </div>
              ) : (
                <div className="h-[74px] flex items-center justify-center flex-col text-gray-600">
                  <CheckCircle2 size={24} className="mb-1 opacity-50" />
                  <span className="text-xs font-medium">Disponível</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* AI Insights Section - Conditional Rendering */}
      {settings?.aiConfig.enableInsights && (showOperational || showChurn || showFinancial) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {showOperational && (
            <AIInsightCard
              type="operational"
              text="Sábado representa 30% do seu faturamento semanal. Considere abrir 1h mais cedo."
              onClick={onGoToSettings}
            />
          )}
          {showChurn && (
            <AIInsightCard
              type="churn"
              text="Detectei 12 clientes VIP que não retornaram há mais de 45 dias. Toque para ver a lista."
              onClick={() => alert("Abrindo lista de Churn...")}
            />
          )}
          {showFinancial && (
            <AIInsightCard
              type="financial"
              text="O serviço 'Combo' tem margem 15% maior que serviços avulsos. Sugira no checkout."
              onClick={() => alert("Ver análise de margem...")}
            />
          )}

          {/* If specific insights are hidden but AI is on, show a placeholder or link to config */}
          {(!showOperational && !showChurn && !showFinancial) && (
            <div className="col-span-full text-center p-4 border border-dashed border-barber-800 rounded-xl text-gray-500 text-sm">
              IA Ativada, mas nenhum tipo de insight selecionado. <button onClick={onGoToSettings} className="text-barber-gold hover:underline">Configurar</button>
            </div>
          )}
        </div>
      )}

      {!settings?.aiConfig.enableInsights && (
        <div className="bg-barber-900 border border-barber-800 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-center opacity-70 hover:opacity-100 transition-opacity gap-2">
          <span className="text-xs text-gray-400 text-center sm:text-left">Insights de IA desativados.</span>
          <button onClick={onGoToSettings} className="text-xs bg-barber-950 px-3 py-1 rounded text-white flex items-center gap-1 w-full sm:w-auto justify-center">
            <SettingsIcon size={12} /> Configurar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Faturamento Hoje"
          value={`R$ ${stats.faturamentoHoje.toLocaleString('pt-BR')}`}
          subtext={`${stats.agendamentosHoje - stats.agendamentosPendentes} agendamentos concluídos`}
          icon={TrendingUp}
          trend={Math.round(faturamentoTrend)}
        />
        <StatCard
          title="Agendamentos"
          value={stats.agendamentosHoje.toString()}
          subtext={`${stats.agendamentosPendentes} pendentes de confirmação`}
          icon={Scissors}
          trend={0}
        />
        <StatCard
          title="Novos Clientes"
          value={stats.novosClientesMes.toString()}
          subtext="Este mês"
          icon={Users}
          trend={Math.round(clientesTrend)}
        />
        <StatCard
          title="Taxa No-Show"
          value={`${stats.taxaNoShow.toFixed(1)}%`}
          subtext="Últimos 30 dias"
          icon={AlertCircle}
          trend={0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-barber-900 border border-barber-800 p-6 rounded-xl shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Receita Semanal</h3>
            <select className="bg-barber-950 border border-barber-800 text-xs text-gray-400 rounded px-2 py-1 outline-none">
              <option>Esta Semana</option>
              <option>Mês Passado</option>
            </select>
          </div>
          <div className="h-64 w-full" style={{ minWidth: 0, minHeight: 256 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
              <BarChart data={weeklyRevenue}>
                <XAxis
                  dataKey="name"
                  stroke="#71717a"
                  tick={{ fill: '#71717a' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#71717a"
                  tick={{ fill: '#71717a' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `R$${value}`}
                />
                <Tooltip
                  cursor={{ fill: '#27272a' }}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {weeklyRevenue.map((entry, index) => {
                    // Color based on if it's today (day with gold) or others (blue gradient)
                    const isToday = entry.date === new Date().toISOString().split('T')[0];
                    const hasValue = entry.total > 0;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isToday ? '#f59e0b' : hasValue ? '#3b82f6' : '#3f3f46'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* WhatsApp/Requests Feed */}
        <div className="bg-barber-900 border border-barber-800 p-6 rounded-xl shadow-lg flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="text-green-500" size={20} />
              Solicitações
            </h3>
            <span className="bg-green-500/20 text-green-500 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Bot Ativo
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 max-h-[300px] lg:max-h-none">
            {pendingRequests.map((req) => (
              <div key={req.id} className="bg-barber-950 p-4 rounded-lg border border-barber-800 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white">{req.clientName}</h4>
                    <p className="text-sm text-gray-400">{req.service}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-barber-gold font-bold">{req.time}</div>
                    <div className="text-xs text-gray-500">{req.date} • {req.source}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <button className="flex-1 bg-barber-gold hover:bg-barber-goldhover text-black py-2 rounded text-sm font-bold flex items-center justify-center gap-2 transition-colors">
                    <CheckCircle2 size={16} /> Confirmar
                  </button>
                  <button className="flex-1 bg-barber-800 hover:bg-barber-700 text-white py-2 rounded text-sm font-medium transition-colors">
                    Reagendar
                  </button>
                </div>
              </div>
            ))}

            <div className="bg-barber-950/50 p-4 rounded-lg border border-barber-800/50 border-dashed text-center text-gray-500 text-sm">
              <Clock size={20} className="mx-auto mb-2 opacity-50" />
              Aguardando novas mensagens...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
