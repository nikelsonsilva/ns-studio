import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  PieChart, 
  Sparkles, 
  Download, 
  Lock, 
  Settings, 
  Key, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  X, 
  CheckCircle2, 
  PiggyBank, 
  Receipt, 
  Printer, 
  FileText, 
  Sheet,
  Search,
  LayoutGrid,
  List,
  Filter,
  Landmark,
  Calculator,
  CalendarCheck,
  AlertTriangle,
  UploadCloud,
  Building2,
  Zap,
  TrendingUp
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Barber, RecurringExpense, Role } from '../types';
import Switch from './ui/Switch';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Badge from './ui/Badge';
import { useToast } from './ui/Toast';

interface FinanceProps {
  paymentConfig?: {
    isConnected: boolean;
    stripeKey: string;
  };
  onSaveConfig?: (config: { isConnected: boolean; stripeKey: string }) => void;
  barbers: Barber[];
  userRole?: Role;
}

const Finance: React.FC<FinanceProps> = ({ paymentConfig, onSaveConfig, barbers, userRole = 'Admin' }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cash_close' | 'commissions' | 'expenses' | 'fiscal'>('dashboard');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();
  
  // State for Payment Configuration
  const [showConfig, setShowConfig] = useState(false);
  const [stripeKeyInput, setStripeKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Recurring Expenses State
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([
      { id: '1', description: 'Aluguel Barbearia', amount: 2500, dayOfMonth: 5, active: true, category: 'Aluguel' },
      { id: '2', description: 'Internet Fibra', amount: 150, dayOfMonth: 10, active: true, category: 'Internet' },
      { id: '3', description: 'Sistema de Gestão', amount: 120, dayOfMonth: 15, active: true, category: 'Software' },
  ]);

  const [isExporting, setIsExporting] = useState<string | null>(null);

  useEffect(() => {
    if (paymentConfig?.stripeKey) {
        setStripeKeyInput(paymentConfig.stripeKey);
    }
  }, [paymentConfig]);

  const isKeySaved = paymentConfig?.isConnected || false;

  // --- MOCK DATA ---
  
  const paymentData = [
    { name: 'Pix', value: 4500, color: '#10b981' }, // Emerald
    { name: 'Cartão Crédito', value: 3200, color: '#f59e0b' }, // Amber
    { name: 'Dinheiro', value: 1100, color: '#64748b' }, // Slate
  ];

  const transactions = [
    { id: 1, desc: 'Corte + Barba (João)', amount: 85, type: 'income', method: 'Pix', time: '14:30', status: 'confirmed' },
    { id: 2, desc: 'Compra Bebidas', amount: 150, type: 'expense', method: 'Cartão', time: '13:00', status: 'confirmed' },
    { id: 3, desc: 'Selagem (Pedro)', amount: 120, type: 'income', method: 'Cartão', time: '11:45', status: 'confirmed' },
    { id: 4, desc: 'Pagamento Internet', amount: 199.90, type: 'expense', method: 'Boleto', time: '09:00', status: 'pending' },
    { id: 5, desc: 'Corte Simples (João)', amount: 45, type: 'income', method: 'Dinheiro', time: '09:30', status: 'confirmed' },
  ];

  // Cash Close Mock Data
  const cashCloseStats = {
      revenue: 8800.00,
      commissions: 3250.00,
      netProfit: 5550.00,
      pending: 450.00,
      paymentMethods: [
          { method: 'Pix', amount: 4500, percent: 51, icon: Zap, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { method: 'Crédito', amount: 3200, percent: 36, icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { method: 'Débito', amount: 0, percent: 0, icon: CreditCard, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { method: 'Dinheiro', amount: 1100, percent: 13, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
      ]
  };

  const fiscalInvoices = [
      { id: 'NFS-1023', value: 85.00, client: 'João Silva', status: 'Emitida', date: 'Hoje, 14:30' },
      { id: 'NFS-1022', value: 120.00, client: 'Pedro Santos', status: 'Emitida', date: 'Hoje, 11:45' },
      { id: 'NFS-1021', value: 45.00, client: 'Marcos Oliveira', status: 'Processando', date: 'Hoje, 09:30' },
  ];

  // --- ACTIONS ---

  const handleSaveKey = () => {
    if (!stripeKeyInput) return;
    setIsSaving(true);
    setTimeout(() => {
        setIsSaving(false);
        if (onSaveConfig) {
            onSaveConfig({ isConnected: true, stripeKey: stripeKeyInput });
        }
        toast.success('Configuração de pagamento salva!');
        setTimeout(() => setShowConfig(false), 1500);
    }, 1500);
  };

  const handleExport = (type: 'pdf' | 'excel') => {
      setIsExporting(type);
      setTimeout(() => {
          setIsExporting(null);
          toast.success(`Relatório ${type === 'pdf' ? 'PDF' : 'Excel'} baixado com sucesso!`);
      }, 2000);
  };

  const handleConfirmClose = () => {
      toast.success('Caixa fechado com sucesso! Relatório enviado por e-mail.');
  };

  const handlePayCommission = (barberName: string) => {
      toast.success(`Pagamento registrado para ${barberName}.`);
  };

  const toggleExpense = (id: string) => {
      setRecurringExpenses(prev => prev.map(exp => 
          exp.id === id ? { ...exp, active: !exp.active } : exp
      ));
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card noPadding className="md:col-span-2 p-5 bg-gradient-to-r from-zinc-900 to-zinc-950 border-l-4 border-l-emerald-500 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left w-full">
                  <h2 className="text-xl font-bold text-white">Controle Financeiro</h2>
                  <p className="text-sm text-muted mt-1">Gestão de caixa, comissões e fiscal.</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowConfig(true)}
                    leftIcon={<Settings size={18} />}
                    className="w-full sm:w-auto"
                  >
                      Config
                  </Button>
                  <Button onClick={() => setActiveTab('cash_close')} leftIcon={<Lock size={18} />} className="w-full sm:w-auto" variant="success">
                    Fechar Caixa
                  </Button>
              </div>
          </Card>
          
          <Card noPadding className="col-span-1 p-4 flex flex-col justify-center border-l-4 border-l-barber-gold">
              <span className="text-xs font-bold uppercase text-muted tracking-wider">Saldo Líquido</span>
              <div className="text-2xl font-bold text-white mt-1">R$ 5.550,00</div>
              <div className="text-[10px] text-barber-gold font-bold mt-1 flex items-center gap-1">
                  <TrendingUp size={12} /> Margem: 63%
              </div>
          </Card>

          <Card noPadding className="col-span-1 p-4 flex flex-col justify-center border-l-4 border-l-sky-500">
              <span className="text-xs font-bold uppercase text-muted tracking-wider">A Receber</span>
              <div className="text-2xl font-bold text-white mt-1">R$ 450,00</div>
              <div className="text-[10px] text-sky-500 font-bold mt-1">
                  3 agendamentos pendentes
              </div>
          </Card>
      </div>

      {/* Main List Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
          <div className="w-full flex flex-col lg:flex-row gap-4">
            {/* Filter Tabs */}
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 overflow-x-auto scrollbar-hide w-full lg:w-auto">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                    <PieChart size={14} /> Visão Geral
                </button>
                <button 
                    onClick={() => setActiveTab('cash_close')}
                    className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'cash_close' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                    <Lock size={14} /> Fechamento
                </button>
                <button 
                    onClick={() => setActiveTab('commissions')}
                    className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'commissions' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                    <Receipt size={14} /> Comissões
                </button>
                <button 
                    onClick={() => setActiveTab('expenses')}
                    className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'expenses' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                    <Wallet size={14} /> Despesas
                </button>
                <button 
                    onClick={() => setActiveTab('fiscal')}
                    className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'fiscal' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                    <Landmark size={14} /> Fiscal
                </button>
            </div>
          </div>

          <div className="flex gap-2">
             <Button 
                variant="ghost"
                size="sm"
                className="text-muted hover:text-white border border-zinc-800"
                onClick={() => handleExport('excel')}
                isLoading={isExporting === 'excel'}
                leftIcon={<Sheet size={14} />}
             >
                 Exportar
             </Button>
          </div>
      </div>

      {/* === TAB: DASHBOARD === */}
      {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Fluxo de Caixa (Lista) */}
                  <Card noPadding className="lg:col-span-2 p-6 flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                          <h3 className="text-lg font-bold text-main">Fluxo de Caixa Recente</h3>
                          <div className="flex gap-2">
                              <Input 
                                  placeholder="Buscar transação..." 
                                  value={searchTerm}
                                  onChange={e => setSearchTerm(e.target.value)}
                                  className="h-8 text-xs bg-zinc-950 border-zinc-800 w-48"
                                  containerClassName="mb-0"
                              />
                          </div>
                      </div>
                      
                      <div className="flex-1 overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[500px]">
                          <thead>
                              <tr className="text-muted text-xs uppercase border-b border-barber-800">
                              <th className="pb-3 pl-2">Hora</th>
                              <th className="pb-3">Descrição</th>
                              <th className="pb-3">Pagamento</th>
                              <th className="pb-3 text-right pr-2">Valor</th>
                              </tr>
                          </thead>
                          <tbody className="text-sm">
                              {transactions
                                .filter(t => t.desc.toLowerCase().includes(searchTerm.toLowerCase()))
                                .map((tx) => (
                              <tr key={tx.id} className="border-b border-barber-800/50 hover:bg-barber-800/20 transition-colors">
                                  <td className="py-4 pl-2 text-muted font-mono text-xs">{tx.time}</td>
                                  <td className="py-4 text-main font-medium">
                                      {tx.desc}
                                      {tx.status === 'pending' && <span className="ml-2 text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase font-bold">Pendente</span>}
                                  </td>
                                  <td className="py-4">
                                  <span className={`text-xs px-2 py-1 rounded border ${
                                      tx.method === 'Pix' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' :
                                      tx.method === 'Cartão' ? 'border-amber-500/30 text-amber-500 bg-amber-500/10' :
                                      'border-gray-500/30 text-gray-400 bg-gray-500/10'
                                  }`}>
                                      {tx.method}
                                  </span>
                                  </td>
                                  <td className={`py-4 text-right pr-2 font-bold ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                  {tx.type === 'income' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                                  </td>
                              </tr>
                              ))}
                          </tbody>
                          </table>
                      </div>
                  </Card>

                  {/* Payment Methods Chart */}
                  <Card noPadding className="p-6">
                      <h3 className="text-lg font-bold text-main mb-6 flex items-center gap-2">
                          <CreditCard size={20} className="text-barber-gold" />
                          Métodos de Pagamento
                      </h3>
                      <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                              <Pie
                              data={paymentData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                              >
                              {paymentData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                              </Pie>
                              <Tooltip 
                              contentStyle={{ backgroundColor: 'rgb(var(--color-surface))', borderColor: 'rgb(var(--color-border))', color: 'rgb(var(--color-text-main))' }}
                              itemStyle={{ color: 'rgb(var(--color-text-main))' }}
                              />
                              <Legend iconType="circle" />
                          </RePieChart>
                          </ResponsiveContainer>
                      </div>
                  </Card>
              </div>
          </div>
      )}

      {/* === TAB: CASH CLOSE (FECHAMENTO) === */}
      {activeTab === 'cash_close' && (
          <div className="space-y-6 animate-slide-up">
              {/* Resumo do Fechamento */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <Lock size={24} className="text-emerald-500" /> Fechamento de Caixa
                      </h3>
                      <Badge variant="outline" className="px-3 py-1 text-xs">
                          {new Date().toLocaleDateString('pt-BR')}
                      </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                          <span className="text-[10px] text-emerald-500 font-bold uppercase flex items-center gap-1"><DollarSign size={12}/> Faturamento</span>
                          <div className="text-2xl font-bold text-emerald-500 mt-1">R$ {cashCloseStats.revenue.toLocaleString('pt-BR')}</div>
                          <span className="text-[10px] text-muted">6 atendimentos</span>
                      </div>
                      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                          <span className="text-[10px] text-amber-500 font-bold uppercase flex items-center gap-1"><LayoutGrid size={12}/> Comissões</span>
                          <div className="text-2xl font-bold text-amber-500 mt-1">R$ {cashCloseStats.commissions.toLocaleString('pt-BR')}</div>
                          <span className="text-[10px] text-muted">Pago: R$ 0,00</span>
                      </div>
                      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                          <span className="text-[10px] text-blue-500 font-bold uppercase flex items-center gap-1"><TrendingUp size={12}/> Lucro Líquido</span>
                          <div className="text-2xl font-bold text-blue-500 mt-1">R$ {cashCloseStats.netProfit.toLocaleString('pt-BR')}</div>
                          <span className="text-[10px] text-muted">Após comissões</span>
                      </div>
                      <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                          <span className="text-[10px] text-red-500 font-bold uppercase flex items-center gap-1"><AlertTriangle size={12}/> Pendente</span>
                          <div className="text-2xl font-bold text-red-500 mt-1">R$ {cashCloseStats.pending.toLocaleString('pt-BR')}</div>
                          <span className="text-[10px] text-muted">Comissões a pagar</span>
                      </div>
                  </div>
              </div>

              {/* Formas de Pagamento Breakdown */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                      <CreditCard size={16} /> Formas de Pagamento
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {cashCloseStats.paymentMethods.map((pm) => (
                          <div key={pm.method} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${pm.bg} ${pm.color}`}>
                                  <pm.icon size={18} />
                              </div>
                              <div className="flex-1">
                                  <div className="text-xs font-bold text-muted uppercase">{pm.method}</div>
                                  <div className="text-lg font-bold text-white">R$ {pm.amount.toLocaleString('pt-BR')}</div>
                                  <div className="text-[10px] text-muted">({pm.percent}%)</div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Lista de Profissionais (Pagar Comissões) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <LayoutGrid size={16} /> Profissionais (Comissões do Dia)
                      </h4>
                      <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-8 text-xs">Filtrar</Button>
                          <Button size="sm" variant="outline" className="h-8 text-xs">Exportar</Button>
                      </div>
                  </div>
                  <div className="divide-y divide-zinc-800">
                      {barbers.map((barber) => {
                          const totalGenerated = barber.currentSales || 0; // Mock value
                          const commissionVal = totalGenerated * (barber.commissionRate / 100);
                          
                          return (
                              <div key={barber.id} className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-zinc-800/20 transition-colors">
                                  <div className="flex items-center gap-3 w-full sm:w-auto">
                                      <div className="relative">
                                          <img src={barber.avatar} className="w-10 h-10 rounded-full object-cover border border-zinc-700" />
                                          <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded text-[10px] font-bold px-1 border border-zinc-700">
                                              {barber.name.charAt(0)}
                                          </div>
                                      </div>
                                      <div>
                                          <div className="font-bold text-white">{barber.name}</div>
                                          <div className="text-xs text-muted">3 atendimentos • R$ {totalGenerated.toFixed(2)} gerados</div>
                                      </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                      <div className="text-right">
                                          <div className="text-[10px] text-muted uppercase font-bold">Comissão ({barber.commissionRate}%)</div>
                                          <div className="text-lg font-bold text-amber-500">R$ {commissionVal.toFixed(2)}</div>
                                      </div>
                                      <Button 
                                          size="sm" 
                                          className="bg-green-600 hover:bg-green-500 text-white border-none"
                                          onClick={() => handlePayCommission(barber.name)}
                                          leftIcon={<DollarSign size={14} />}
                                      >
                                          Pagar
                                      </Button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

              {/* Botão de Fechamento */}
              <div className="bg-gradient-to-r from-emerald-900/20 to-zinc-900 border border-emerald-500/20 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                      <h4 className="text-lg font-bold text-white flex items-center gap-2">
                          <Lock size={20} className="text-emerald-500" /> Pronto para fechar o caixa?
                      </h4>
                      <p className="text-sm text-muted mt-1">
                          6 atendimentos • R$ {cashCloseStats.revenue.toLocaleString('pt-BR')} faturado • R$ {cashCloseStats.pending.toLocaleString('pt-BR')} pendente
                      </p>
                  </div>
                  <Button 
                      size="lg" 
                      variant="success" 
                      onClick={handleConfirmClose}
                      className="w-full md:w-auto shadow-lg shadow-emerald-500/20"
                      leftIcon={<CheckCircle2 size={20} />}
                  >
                      Confirmar Fechamento
                  </Button>
              </div>
          </div>
      )}

      {/* === TAB: FISCAL (NEW) === */}
      {activeTab === 'fiscal' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                  <div className="flex justify-between items-center mb-6">
                      <div>
                          <h3 className="text-xl font-bold text-white flex items-center gap-2">
                              <Landmark size={24} className="text-barber-gold" /> Status Fiscal
                          </h3>
                          <p className="text-sm text-muted mt-1">Complete a configuração para emitir notas fiscais automaticamente</p>
                      </div>
                      <Badge variant="warning">Pendente</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Empresa Card */}
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col items-center text-center hover:border-barber-gold/50 transition-colors cursor-pointer group">
                          <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                              <Building2 size={20} className="text-white" />
                          </div>
                          <h4 className="font-bold text-white">Empresa</h4>
                          <p className="text-xs text-muted mb-2">CNPJ: 61.871.049/0001-04</p>
                          <Badge variant="success" size="sm" className="mt-auto">Configurado</Badge>
                          <Button variant="ghost" size="sm" className="mt-3 text-xs w-full">Editar Dados</Button>
                      </div>

                      {/* Certificado Card */}
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col items-center text-center hover:border-red-500/50 transition-colors cursor-pointer group relative overflow-hidden">
                          <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                              <ShieldCheck size={20} className="text-red-500" />
                          </div>
                          <h4 className="font-bold text-white">Certificado A1</h4>
                          <p className="text-xs text-muted mb-2">Vencido ou não enviado</p>
                          <Badge variant="danger" size="sm" className="mt-auto">Pendente</Badge>
                          <Button variant="ghost" size="sm" className="mt-3 text-xs w-full text-red-400 hover:text-red-300">Enviar Arquivo</Button>
                      </div>

                      {/* Config NFS-e Card */}
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 flex flex-col items-center text-center hover:border-amber-500/50 transition-colors cursor-pointer group">
                          <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                              <Settings size={20} className="text-amber-500" />
                          </div>
                          <h4 className="font-bold text-white">Config NFS-e</h4>
                          <p className="text-xs text-muted mb-2">Série, RPS e Alíquotas</p>
                          <Badge variant="warning" size="sm" className="mt-auto">Pendente</Badge>
                          <Button variant="ghost" size="sm" className="mt-3 text-xs w-full text-amber-400 hover:text-amber-300">Configurar</Button>
                      </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                      <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold border-none">
                          Configurar Emissão Automática
                      </Button>
                  </div>
              </div>

              {/* Lista de Notas Fiscais */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <FileText size={16} /> Notas Fiscais Emitidas
                      </h4>
                      <Button size="sm" variant="ghost" className="text-xs" rightIcon={<ArrowUpRight size={12}/>}>Atualizar</Button>
                  </div>
                  
                  {fiscalInvoices.length > 0 ? (
                      <div className="divide-y divide-zinc-800">
                          {fiscalInvoices.map((nf) => (
                              <div key={nf.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/20 transition-colors">
                                  <div className="flex items-center gap-3">
                                      <div className={`p-2 rounded-lg ${nf.status === 'Emitida' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                          <FileText size={16} />
                                      </div>
                                      <div>
                                          <div className="font-bold text-white text-sm">{nf.id}</div>
                                          <div className="text-xs text-muted">{nf.date} • {nf.client}</div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <span className="font-bold text-white text-sm">R$ {nf.value.toFixed(2)}</span>
                                      <Badge variant={nf.status === 'Emitida' ? 'success' : 'warning'} size="sm">
                                          {nf.status}
                                      </Badge>
                                      <button className="text-muted hover:text-white p-1"><Download size={14} /></button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="p-12 flex flex-col items-center justify-center text-center">
                          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                              <FileText size={24} className="text-zinc-600" />
                          </div>
                          <h3 className="text-white font-bold mb-1">Nenhuma nota fiscal emitida ainda</h3>
                          <p className="text-xs text-muted">As notas aparecerão aqui após pagamentos confirmados e processados.</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* === TAB: COMMISSIONS === */}
      {activeTab === 'commissions' && (
          <Card noPadding className="animate-fade-in p-6">
             <h3 className="text-xl font-bold text-main mb-6 flex items-center gap-2">
                <Receipt className="text-barber-gold" /> Calculadora de Comissões (Holerite)
             </h3>

             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                   <thead>
                      <tr className="text-xs text-muted uppercase border-b border-barber-800 bg-barber-950">
                         <th className="p-3">Profissional</th>
                         <th className="p-3">Total Serviços</th>
                         <th className="p-3">Taxa (%)</th>
                         <th className="p-3 text-emerald-500">Valor Comissão</th>
                         <th className="p-3 text-sky-400">+ Produtos</th>
                         <th className="p-3 text-yellow-500">+ Caixinha</th>
                         <th className="p-3 text-rose-400">- Taxas</th>
                         <th className="p-3 text-rose-400">- Vales</th>
                         <th className="p-3 text-right font-bold text-main">A Pagar</th>
                         <th className="p-3 text-center">Ações</th>
                      </tr>
                   </thead>
                   <tbody className="text-sm divide-y divide-barber-800">
                      {barbers.map(barber => {
                         const totalServices = barber.currentSales || 0;
                         const commissionValue = totalServices * (barber.commissionRate / 100);
                         const productCommission = 120; // Mocked
                         const tips = 45; // Mocked
                         const cardFees = totalServices * 0.02; // Mocked 2% fee
                         const advances = 200; // Mocked advance
                         const netPay = commissionValue + productCommission + tips - cardFees - advances;

                         return (
                            <tr key={barber.id} className="hover:bg-barber-800/30 transition-colors">
                               <td className="p-3 font-medium text-main flex items-center gap-2">
                                  <img src={barber.avatar} className="w-6 h-6 rounded-full" />
                                  {barber.name}
                               </td>
                               <td className="p-3">R$ {totalServices.toFixed(2)}</td>
                               <td className="p-3">{barber.commissionRate}%</td>
                               <td className="p-3 font-bold text-emerald-500">R$ {commissionValue.toFixed(2)}</td>
                               <td className="p-3 text-sky-400">R$ {productCommission.toFixed(2)}</td>
                               <td className="p-3 text-yellow-500">R$ {tips.toFixed(2)}</td>
                               <td className="p-3 text-rose-400">- R$ {cardFees.toFixed(2)}</td>
                               <td className="p-3 text-rose-400">- R$ {advances.toFixed(2)}</td>
                               <td className="p-3 text-right font-bold text-barber-gold text-base border-l border-barber-800 bg-barber-950/30">
                                  R$ {netPay.toFixed(2)}
                               </td>
                               <td className="p-3 text-center">
                                  <Button size="icon" variant="ghost" onClick={() => toast.info(`Imprimindo Holerite de ${barber.name}...`)} title="Imprimir Holerite">
                                     <Printer size={16} />
                                  </Button>
                               </td>
                            </tr>
                         )
                      })}
                   </tbody>
                </table>
             </div>
          </Card>
      )}

      {/* === TAB: EXPENSES === */}
      {activeTab === 'expenses' && (
          <div className="animate-fade-in space-y-6">
              <Card noPadding className="p-6">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-main flex items-center gap-2">
                       <CreditCard className="text-rose-500" /> Despesas Recorrentes (Contas Fixas)
                    </h3>
                    <Button size="sm">+ Nova Despesa</Button>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                    {recurringExpenses.map(expense => (
                        <div key={expense.id} className="bg-barber-950 border border-barber-800 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between group hover:border-barber-700 transition-colors gap-4">
                           <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-lg ${expense.active ? 'bg-rose-500/10 text-rose-500' : 'bg-gray-800 text-gray-500'}`}>
                                 <Wallet size={20} />
                              </div>
                              <div>
                                 <h4 className="font-bold text-main">{expense.description}</h4>
                                 <p className="text-xs text-muted">Vence dia {expense.dayOfMonth} • Categoria: {expense.category}</p>
                              </div>
                           </div>
                           
                           <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                              <div className="text-right">
                                 <div className="font-bold text-main">R$ {expense.amount.toFixed(2)}</div>
                                 <div className="text-[10px] text-muted uppercase font-bold">Mensal</div>
                              </div>
                              <Switch 
                                checked={expense.active} 
                                onCheckedChange={() => toggleExpense(expense.id)} 
                              />
                           </div>
                        </div>
                    ))}
                 </div>
              </Card>
          </div>
      )}

      {/* Payment Configuration Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-barber-900 w-full max-w-md rounded-xl border border-barber-800 shadow-2xl relative overflow-hidden">
              <div className="p-6 border-b border-barber-800 flex justify-between items-center bg-barber-950">
                 <h3 className="text-lg font-bold text-main flex items-center gap-2">
                    <ShieldCheck className="text-barber-gold" /> Gateway de Pagamento
                 </h3>
                 <button onClick={() => setShowConfig(false)} className="text-gray-400 hover:text-white">
                    <X size={20} />
                 </button>
              </div>

              <div className="p-6 space-y-6">
                 <div className="flex items-center gap-3 p-3 bg-barber-950 rounded-lg border border-barber-800">
                    <div className="w-10 h-10 bg-[#635BFF] rounded flex items-center justify-center font-bold text-white italic">S</div>
                    <div>
                       <div className="font-bold text-main">Stripe Payments</div>
                       <div className="text-xs text-muted">Provedor selecionado</div>
                    </div>
                    {isKeySaved && <CheckCircle2 className="ml-auto text-emerald-500" size={20} />}
                 </div>

                 <div className="space-y-2">
                    <label className="text-sm font-medium text-muted flex items-center gap-2">
                       <Key size={14} /> API Key (Secret Key)
                    </label>
                    <div className="relative">
                       <input 
                         type={showKey ? "text" : "password"} 
                         value={stripeKeyInput}
                         onChange={(e) => setStripeKeyInput(e.target.value)}
                         placeholder="sk_live_..."
                         className="w-full bg-barber-950 border border-barber-800 text-main rounded-lg pl-4 pr-10 py-3 text-sm focus:border-barber-gold outline-none"
                       />
                       <button 
                         onClick={() => setShowKey(!showKey)}
                         className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                       >
                          {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                       </button>
                    </div>
                    <p className="text-[10px] text-muted">
                       Insira sua chave secreta do Stripe para habilitar pagamentos automáticos antes da confirmação de agendamentos.
                    </p>
                 </div>

                 {isKeySaved && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm p-3 rounded-lg flex items-center gap-2 animate-fade-in">
                       <CheckCircle2 size={16} /> Chave API salva e verificada com sucesso!
                    </div>
                 )}

                 <Button 
                   onClick={handleSaveKey}
                   disabled={isSaving || !stripeKeyInput}
                   isLoading={isSaving}
                   variant={isKeySaved ? 'success' : 'primary'}
                   className="w-full"
                 >
                    {isKeySaved ? 'Atualizar Configuração' : 'Salvar Configuração'}
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Finance;