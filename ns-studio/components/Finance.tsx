
import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, PieChart, Sparkles, Download, Lock, Settings, Key, ShieldCheck, Eye, EyeOff, X, CheckCircle2, PiggyBank, Receipt, Printer, FileText, Sheet } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Barber, RecurringExpense, Role } from '../types';
import Switch from './ui/Switch';
import Card from './ui/Card';
import Button from './ui/Button';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'commissions' | 'expenses'>('dashboard');
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

  // COLORBLIND SAFE PALETTE
  // Verde -> Emerald (Blueish Green)
  // Amarelo -> Amber/Orange
  // Cinza -> Slate/Purple Grey
  const paymentData = [
    { name: 'Pix', value: 4500, color: '#10b981' }, // Emerald-500
    { name: 'Cartão Crédito', value: 3200, color: '#f59e0b' }, // Amber-500
    { name: 'Dinheiro', value: 1100, color: '#64748b' }, // Slate-500
  ];

  const transactions = [
    { id: 1, desc: 'Corte + Barba (João)', amount: 85, type: 'income', method: 'Pix', time: '14:30' },
    { id: 2, desc: 'Compra Bebidas', amount: 150, type: 'expense', method: 'Cartão', time: '13:00' },
    { id: 3, desc: 'Selagem (Pedro)', amount: 120, type: 'income', method: 'Cartão', time: '11:45' },
    { id: 4, desc: 'Pagamento Internet', amount: 199.90, type: 'expense', method: 'Boleto', time: '09:00' },
    { id: 5, desc: 'Corte Simples (João)', amount: 45, type: 'income', method: 'Dinheiro', time: '09:30' },
  ];
  
  // Barber Profit Analysis Mock
  const barberProfits = [
    { name: 'João Barber', gross: 4200, costs: 300, net: 3900 },
    { name: 'Pedro Cortes', gross: 3800, costs: 150, net: 3650 },
  ];

  const handleSaveKey = () => {
    if (!stripeKeyInput) return;
    setIsSaving(true);
    // Simulate API verification
    setTimeout(() => {
        setIsSaving(false);
        if (onSaveConfig) {
            onSaveConfig({ isConnected: true, stripeKey: stripeKeyInput });
        }
        toast.success('Configuração de pagamento salva!');
        setTimeout(() => {
            setShowConfig(false);
        }, 1500);
    }, 1500);
  };

  const handleExport = (type: 'pdf' | 'excel') => {
      setIsExporting(type);
      setTimeout(() => {
          setIsExporting(null);
          toast.success(`Relatório ${type === 'pdf' ? 'PDF' : 'Excel'} baixado com sucesso!`);
      }, 2000);
  };

  const handlePrintPayslip = (barberName: string) => {
      toast.info(`Imprimindo Holerite de ${barberName}...`);
  };

  const toggleExpense = (id: string) => {
      setRecurringExpenses(prev => prev.map(exp => 
          exp.id === id ? { ...exp, active: !exp.active } : exp
      ));
  };

  return (
    <div className="space-y-6 animate-fade-in relative pb-20">
      
      {/* Header Actions */}
      <Card className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-500/5 via-barber-900 to-barber-900">
        <h2 className="text-xl font-bold text-main flex items-center gap-3">
            <div className="bg-barber-950 p-2 rounded-lg border border-barber-800 shrink-0">
                <Wallet size={20} className="text-emerald-500" />
            </div>
            Controle Financeiro
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
            {/* Navigation Tabs */}
            <div className="flex bg-barber-950 rounded-lg p-1 border border-barber-800 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
                      activeTab === 'dashboard' 
                      ? 'bg-barber-800 text-main shadow' 
                      : 'text-muted hover:text-main hover:bg-barber-800/50'
                    }`}
                >
                    Visão Geral
                </button>
                <button 
                    onClick={() => setActiveTab('commissions')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
                      activeTab === 'commissions' 
                      ? 'bg-barber-800 text-main shadow' 
                      : 'text-muted hover:text-main hover:bg-barber-800/50'
                    }`}
                >
                    Comissões
                </button>
                <button 
                    onClick={() => setActiveTab('expenses')}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${
                      activeTab === 'expenses' 
                      ? 'bg-barber-800 text-main shadow' 
                      : 'text-muted hover:text-main hover:bg-barber-800/50'
                    }`}
                >
                    Despesas
                </button>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
               {userRole === 'Admin' && (
                 <Button 
                   variant="outline"
                   onClick={() => setShowConfig(true)}
                   leftIcon={isKeySaved ? <CheckCircle2 size={14} /> : <Settings size={14} />}
                 >
                    {isKeySaved ? 'Ativo' : 'Configurar'}
                 </Button>
               )}
               <Button 
                    variant="success"
                    leftIcon={<Lock size={14} />}
               >
                  Fechar Caixa
               </Button>
            </div>
        </div>
      </Card>

      {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Export Buttons */}
             <div className="flex flex-col sm:flex-row justify-end gap-2">
                 <Button 
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-400 border border-red-500/20 bg-red-500/10"
                    onClick={() => handleExport('pdf')}
                    isLoading={isExporting === 'pdf'}
                    leftIcon={<FileText size={14} />}
                 >
                     Relatório PDF
                 </Button>
                 <Button 
                    variant="ghost"
                    size="sm"
                    className="text-emerald-500 hover:text-emerald-400 border border-emerald-500/20 bg-emerald-500/10"
                    onClick={() => handleExport('excel')}
                    isLoading={isExporting === 'excel'}
                    leftIcon={<Sheet size={14} />}
                 >
                     Relatório Excel
                 </Button>
             </div>

            {/* AI Financial Insight */}
            <div className="bg-gradient-to-r from-emerald-900/20 to-barber-900 border border-emerald-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4">
                <div className="bg-emerald-500/20 p-2 rounded-full text-emerald-500 shrink-0">
                <Sparkles size={20} />
                </div>
                <div>
                <h3 className="text-emerald-500 font-bold text-sm">Análise Inteligente de Caixa</h3>
                <p className="text-muted text-sm mt-1 leading-relaxed">
                    O volume de pagamentos via <strong>Pix</strong> cresceu 22% este mês. A redução nas taxas de cartão economizou <strong>R$ 340,00</strong>. Continue incentivando o Pix!
                </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="bg-barber-900 p-6 rounded-xl border border-barber-800 shadow-lg relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <DollarSign size={100} />
                </div>
                <h3 className="text-muted text-sm font-medium uppercase mb-2">Entradas (Mês)</h3>
                <div className="text-3xl font-bold text-emerald-500 flex items-center gap-2">
                    R$ 8.800
                    <ArrowUpRight size={20} />
                </div>
                <div className="mt-2 text-xs text-muted">+15% vs mês anterior</div>
                </div>

                <div className="bg-barber-900 p-6 rounded-xl border border-barber-800 shadow-lg relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wallet size={100} />
                </div>
                <h3 className="text-muted text-sm font-medium uppercase mb-2">Saídas (Mês)</h3>
                <div className="text-3xl font-bold text-rose-500 flex items-center gap-2">
                    R$ 2.450
                    <ArrowDownRight size={20} />
                </div>
                <div className="mt-2 text-xs text-muted">Dentro do orçamento</div>
                </div>

                {/* Tip Control Card */}
                <div className="bg-barber-900 p-6 rounded-xl border border-barber-800 shadow-lg relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <PiggyBank size={100} />
                    </div>
                    <h3 className="text-muted text-sm font-medium uppercase mb-2">Caixinha Acumulada</h3>
                    <div className="text-3xl font-bold text-sky-400 flex items-center gap-2">
                        R$ 385
                    </div>
                    <div className="mt-2 text-xs text-muted">Separado do faturamento</div>
                </div>

                {/* Saldo Líquido Card - Corrigido para evitar degradê sujo em tema Roxo */}
                <div className="bg-gradient-to-br from-barber-gold to-barber-goldhover p-6 rounded-xl shadow-lg relative overflow-hidden">
                <h3 className="text-black/70 dark:text-black/70 text-sm font-bold uppercase mb-2 mix-blend-multiply">Saldo Líquido</h3>
                {userRole === 'Admin' ? (
                     <div className="text-4xl font-extrabold text-inverted">
                        R$ 6.350
                    </div>
                ) : (
                    <div className="text-2xl font-extrabold text-inverted/50 flex items-center gap-2">
                        <Lock size={20} /> Acesso Restrito
                    </div>
                )}
                <div className="mt-4 inline-flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full text-inverted text-xs font-bold backdrop-blur-sm">
                    <PieChart size={14} /> Margem: 72%
                </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

                {/* Transactions List */}
                <Card noPadding className="lg:col-span-2 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-main">Fluxo de Caixa Diário</h3>
                    <button className="text-xs text-barber-gold hover:underline">Ver completo</button>
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
                        {transactions.map((tx) => (
                        <tr key={tx.id} className="border-b border-barber-800/50 hover:bg-barber-800/20 transition-colors">
                            <td className="py-4 pl-2 text-muted font-mono text-xs">{tx.time}</td>
                            <td className="py-4 text-main font-medium">{tx.desc}</td>
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
            </div>
            
            {/* Barber Profitability Analysis */}
            {userRole === 'Admin' && (
                <Card noPadding className="p-6">
                    <h3 className="text-lg font-bold text-main mb-6">Lucratividade por Barbeiro (Líquido)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                        <thead>
                            <tr className="text-xs text-muted uppercase border-b border-barber-800">
                                <th className="pb-3">Profissional</th>
                                <th className="pb-3">Receita Bruta</th>
                                <th className="pb-3">Despesas/Custos</th>
                                <th className="pb-3 text-right">Lucro Líquido</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {barberProfits.map((b, idx) => (
                                <tr key={idx} className="border-b border-barber-800/50 hover:bg-barber-800/20">
                                    <td className="py-4 font-bold text-main">{b.name}</td>
                                    <td className="py-4 text-emerald-500">R$ {b.gross.toFixed(2)}</td>
                                    <td className="py-4 text-rose-400">R$ {b.costs.toFixed(2)}</td>
                                    <td className="py-4 text-right font-bold text-barber-gold">R$ {b.net.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                </Card>
            )}
          </div>
      )}

      {/* Commission Calculator Tab (Payroll) */}
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
                                  <Button size="icon" variant="ghost" onClick={() => handlePrintPayslip(barber.name)} title="Imprimir Holerite">
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

      {/* Recurring Expenses Tab */}
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
