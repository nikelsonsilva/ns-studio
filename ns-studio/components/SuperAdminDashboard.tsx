
import React, { useState } from 'react';
import { 
  Users, 
  Store, 
  TrendingUp, 
  ShieldAlert, 
  Activity, 
  Globe, 
  Plus, 
  Search, 
  MoreVertical, 
  CreditCard,
  Ban,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Server,
  Zap,
  Cpu,
  Database,
  BarChart3,
  LogIn,
  Mail,
  ArrowDownRight,
  Filter,
  Settings
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { Tenant } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Input from './ui/Input';
import { useToast } from './ui/Toast';

const mrrData = [
  { month: 'Jan', revenue: 12500, tenants: 45 },
  { month: 'Fev', revenue: 15800, tenants: 52 },
  { month: 'Mar', revenue: 19200, tenants: 60 },
  { month: 'Abr', revenue: 24500, tenants: 78 },
  { month: 'Mai', revenue: 31000, tenants: 95 },
  { month: 'Jun', revenue: 38500, tenants: 112 },
];

const planDistribution = [
  { name: 'Free', value: 40, color: '#71717a' },
  { name: 'Pro', value: 45, color: '#f59e0b' },
  { name: 'Enterprise', value: 15, color: '#6366f1' },
];

const mockTenants: Tenant[] = [
  { id: '1', name: 'NS Studio Barber', type: 'barbershop', ownerEmail: 'joao@barber.com', plan: 'Pro', status: 'active', createdAt: '2023-01-15', lastBilling: '2024-05-15', revenue: 4200 },
  { id: '2', name: 'Vintage Gold', type: 'barbershop', ownerEmail: 'contato@vintage.com', plan: 'Enterprise', status: 'active', createdAt: '2023-03-20', lastBilling: '2024-05-20', revenue: 8500 },
  { id: '3', name: 'Studio Bella', type: 'beauty_salon', ownerEmail: 'ana@bella.com', plan: 'Pro', status: 'active', createdAt: '2023-06-10', lastBilling: '2024-05-10', revenue: 3100 },
  { id: '4', name: 'Corte Real', type: 'barbershop', ownerEmail: 'pedro@real.com', plan: 'Free', status: 'trial', createdAt: '2024-05-01', lastBilling: '-', revenue: 0 },
  { id: '5', name: 'Glow Beauty', type: 'beauty_salon', ownerEmail: 'julia@glow.com', plan: 'Pro', status: 'suspended', createdAt: '2023-02-15', lastBilling: '2024-04-15', revenue: 1200 },
];

const SuperAdminDashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();
  
  const totalMRR = 38500;
  const totalARR = totalMRR * 12;
  const activeSubscriptions = mockTenants.filter(t => t.status === 'active').length;
  const churnRate = 2.4;

  const filteredTenants = mockTenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImpersonate = (tenantName: string) => {
    toast.info(`Iniciando sessão como administrador de: ${tenantName}`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* SaaS Global Header */}
      <Card className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-500/10 via-barber-900 to-barber-900">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20">
            <Globe className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-main">Cockpit da Plataforma</h2>
            <p className="text-muted text-sm">Gerenciando {mockTenants.length} tenants em 2 regiões.</p>
          </div>
        </div>
        <div className="flex gap-3">
            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <div className="relative">
                  <Server size={18} className="text-emerald-500" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-emerald-500 uppercase leading-none">Status Cloud</div>
                  <div className="text-xs font-bold text-main">99.9% Uptime</div>
                </div>
            </div>
            <Button variant="primary" size="sm" leftIcon={<Plus size={16} />}>Novo Cliente</Button>
        </div>
      </Card>

      {/* Primary SaaS Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card noPadding className="p-4 border-b-2 border-b-emerald-500">
            <div className="flex justify-between items-start">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><TrendingUp size={20} /></div>
                <div className="flex items-center gap-1 text-emerald-500 text-xs font-bold">
                  <ArrowUpRight size={14} /> 12.5%
                </div>
            </div>
            <div className="mt-4">
                <div className="text-[10px] text-muted uppercase font-bold tracking-widest">MRR (Recorrência Mensal)</div>
                <div className="text-2xl font-bold text-main">R$ {totalMRR.toLocaleString('pt-BR')}</div>
                <div className="text-[10px] text-muted mt-1">ARR: R$ {totalARR.toLocaleString('pt-BR')}</div>
            </div>
        </Card>

        <Card noPadding className="p-4 border-b-2 border-b-blue-500">
            <div className="flex justify-between items-start">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Users size={20} /></div>
                <div className="flex items-center gap-1 text-blue-500 text-xs font-bold">
                  +8 este mês
                </div>
            </div>
            <div className="mt-4">
                <div className="text-[10px] text-muted uppercase font-bold tracking-widest">Total de Estabelecimentos</div>
                <div className="text-2xl font-bold text-main">{mockTenants.length}</div>
                <div className="text-[10px] text-muted mt-1">45% Barbearias | 55% Salões</div>
            </div>
        </Card>

        <Card noPadding className="p-4 border-b-2 border-b-rose-500">
            <div className="flex justify-between items-start">
                <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500"><ShieldAlert size={20} /></div>
                <div className="flex items-center gap-1 text-rose-500 text-xs font-bold">
                  <ArrowDownRight size={14} /> 0.4%
                </div>
            </div>
            <div className="mt-4">
                <div className="text-[10px] text-muted uppercase font-bold tracking-widest">Plataforma Churn</div>
                <div className="text-2xl font-bold text-main">{churnRate}%</div>
                <div className="text-[10px] text-muted mt-1">Meta: Abaixo de 3%</div>
            </div>
        </Card>

        <Card noPadding className="p-4 border-b-2 border-b-barber-gold">
            <div className="flex justify-between items-start">
                <div className="p-2 bg-barber-gold/10 rounded-lg text-barber-gold"><CreditCard size={20} /></div>
                <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                  Estável
                </div>
            </div>
            <div className="mt-4">
                <div className="text-[10px] text-muted uppercase font-bold tracking-widest">ARPU (Médio por Unidade)</div>
                <div className="text-2xl font-bold text-main">R$ 343,75</div>
                <div className="text-[10px] text-muted mt-1">LTV Estimado: R$ 8.250</div>
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Growth & Infrastructure Section */}
        <div className="lg:col-span-2 space-y-6">
            <Card noPadding>
                <div className="p-6 border-b border-barber-800 flex justify-between items-center bg-barber-950/30">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="text-indigo-500" size={18} />
                      <h3 className="font-bold text-main">Crescimento de Receita vs Tenants</h3>
                    </div>
                    <select className="bg-barber-950 border border-barber-800 text-[10px] font-bold uppercase text-muted rounded-lg px-2 py-1 outline-none">
                        <option>Semestre Atual</option>
                        <option>Ano Anterior</option>
                    </select>
                </div>
                <div className="p-6 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mrrData}>
                            <defs>
                              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="month" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis yAxisId="left" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                            <YAxis yAxisId="right" orientation="right" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                            />
                            <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                            <Line yAxisId="right" type="monotone" dataKey="tenants" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="p-4 bg-barber-950/50 flex justify-center gap-8 border-t border-barber-800">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                    <span className="text-[10px] font-bold text-muted uppercase">Receita (MRR)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-[10px] font-bold text-muted uppercase">Novas Unidades</span>
                  </div>
                </div>
            </Card>

            {/* Infrastructure Health */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card noPadding className="p-5">
                <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Zap size={14} className="text-amber-500" /> Latência Gemini API
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-main font-bold">Pro-3 Preview</span>
                    <span className="text-xs text-emerald-500 font-bold">120ms</span>
                  </div>
                  <div className="h-1.5 w-full bg-barber-950 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[20%]"></div>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-main font-bold">Flash-3 Preview</span>
                    <span className="text-xs text-emerald-500 font-bold">45ms</span>
                  </div>
                  <div className="h-1.5 w-full bg-barber-950 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[10%]"></div>
                  </div>
                </div>
              </Card>

              <Card noPadding className="p-5">
                <h3 className="text-xs font-bold text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Database size={14} className="text-blue-500" /> Database Load
                </h3>
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-full h-full rotate-[-90deg]">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#18181b" strokeWidth="6" />
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#3b82f6" strokeWidth="6" strokeDasharray="175" strokeDashoffset="120" strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-main">32%</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-main">IOPS: 1.2k/s</div>
                    <div className="text-[10px] text-muted uppercase">Região: us-east-1</div>
                  </div>
                </div>
              </Card>
            </div>
        </div>

        {/* Sidebar Analytics */}
        <div className="space-y-6">
            {/* Plan Distribution */}
            <Card noPadding>
                <div className="p-6 border-b border-barber-800 font-bold text-main flex items-center gap-2">
                    <Activity size={18} className="text-indigo-500" /> Mix de Planos
                </div>
                <div className="p-6 h-56 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={planDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {planDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <div className="text-2xl font-bold text-main">112</div>
                      <div className="text-[8px] text-muted uppercase font-bold">Total</div>
                    </div>
                </div>
                <div className="p-4 bg-barber-950/30 space-y-2">
                    {planDistribution.map(plan => (
                      <div key={plan.name} className="flex justify-between items-center text-[10px] font-bold">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: plan.color }}></div>
                          <span className="text-muted uppercase">{plan.name}</span>
                        </div>
                        <span className="text-main">{plan.value}%</span>
                      </div>
                    ))}
                </div>
            </Card>

            {/* Platform Health Logs */}
            <Card noPadding className="flex flex-col bg-barber-950 border-dashed">
                <div className="p-4 border-b border-barber-800 font-bold text-[10px] text-muted uppercase tracking-widest flex justify-between items-center">
                    <span>Logs de Atividade</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                </div>
                <div className="flex-1 p-4 space-y-4 max-h-[250px] overflow-y-auto">
                    <div className="flex gap-3 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                        <div>
                            <div className="text-main font-bold">Provisionamento OK</div>
                            <div className="text-muted">Tenant "Studio Bella" migrado para v3.1.</div>
                            <div className="text-muted/40 mt-1">Há 12 minutos</div>
                        </div>
                    </div>
                    <div className="flex gap-3 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1 shrink-0"></div>
                        <div>
                            <div className="text-main font-bold">Alerta de Renovação</div>
                            <div className="text-muted">"Glow Beauty" falhou na cobrança via Pix.</div>
                            <div className="text-muted/40 mt-1">Há 1 hora</div>
                        </div>
                    </div>
                    <div className="flex gap-3 text-[10px]">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0"></div>
                        <div>
                            <div className="text-main font-bold">Upgrade de Plano</div>
                            <div className="text-muted">"Vintage Gold" subiu para Enterprise.</div>
                            <div className="text-muted/40 mt-1">Hoje às 08:45</div>
                        </div>
                    </div>
                </div>
                <button className="p-3 text-[10px] text-indigo-400 font-bold border-t border-barber-800 hover:bg-indigo-500/5 transition-colors">
                  Ver todos os logs do sistema
                </button>
            </Card>
        </div>
      </div>

      {/* Tenants Management Table */}
      <Card noPadding className="overflow-hidden border-indigo-500/30 shadow-2xl shadow-indigo-500/5">
        <div className="p-6 border-b border-barber-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-barber-950/20">
            <div>
              <h3 className="font-bold text-main">Estabelecimentos Gerenciados</h3>
              <p className="text-xs text-muted">Acesso administrativo e suporte global.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <Input 
                    placeholder="Nome, e-mail ou ID..." 
                    icon={<Search size={16} />} 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 w-full md:w-64"
                />
                <Button size="icon" variant="outline" className="h-10 w-10 shrink-0"><Filter size={18} /></Button>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-barber-950 text-muted text-[10px] uppercase font-bold tracking-widest border-b border-barber-800">
                        <th className="p-4 pl-6">Unidade</th>
                        <th className="p-4">Administrador</th>
                        <th className="p-4 text-center">Modelo</th>
                        <th className="p-4">Billing</th>
                        <th className="p-4 text-right">Performance</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right pr-6">Cockpit</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-barber-800">
                    {filteredTenants.map((tenant) => (
                        <tr key={tenant.id} className="hover:bg-indigo-500/5 transition-colors group">
                            <td className="p-4 pl-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-barber-800 border border-barber-700 flex items-center justify-center font-bold text-barber-gold">
                                    {tenant.name[0]}
                                  </div>
                                  <div>
                                    <div className="font-bold text-main text-sm">{tenant.name}</div>
                                    <div className="text-[10px] text-muted font-mono">ID: {tenant.id}773x</div>
                                  </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <Mail size={12} className="text-muted" />
                                  <span className="text-xs text-main">{tenant.ownerEmail}</span>
                                </div>
                                <div className="text-[10px] text-muted mt-1 italic">Membro desde {tenant.createdAt}</div>
                            </td>
                            <td className="p-4 text-center">
                                {tenant.type === 'barbershop' ? (
                                    <Badge variant="default" size="sm" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Barbearia</Badge>
                                ) : (
                                    <Badge variant="info" size="sm" className="bg-purple-500/10 text-purple-500 border-purple-500/20">Salão</Badge>
                                )}
                            </td>
                            <td className="p-4">
                                <div className={`text-xs font-bold ${tenant.plan === 'Enterprise' ? 'text-indigo-400' : tenant.plan === 'Pro' ? 'text-barber-gold' : 'text-muted'}`}>
                                    {tenant.plan}
                                </div>
                                <div className="text-[10px] text-muted mt-0.5">Vencimento: {tenant.lastBilling}</div>
                            </td>
                            <td className="p-4 text-right">
                                <div className="text-xs font-bold text-main">R$ {tenant.revenue.toLocaleString('pt-BR')}</div>
                                <div className="text-[9px] text-emerald-500 font-bold uppercase tracking-tighter">Acima da média</div>
                            </td>
                            <td className="p-4">
                                {tenant.status === 'active' && <Badge variant="success" size="sm" icon={<CheckCircle2 size={10} />}>Online</Badge>}
                                {tenant.status === 'suspended' && <Badge variant="danger" size="sm" icon={<Ban size={10} />}>Suspenso</Badge>}
                                {tenant.status === 'trial' && <Badge variant="warning" size="sm" icon={<AlertCircle size={10} />}>Teste</Badge>}
                            </td>
                            <td className="p-4 text-right pr-6">
                                <div className="flex justify-end gap-2">
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      title="Logar como Administrador"
                                      className="hover:text-indigo-400 hover:bg-indigo-500/10"
                                      onClick={() => handleImpersonate(tenant.name)}
                                    >
                                      <LogIn size={16} />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="hover:text-amber-400 hover:bg-amber-500/10"><Settings size={16} /></Button>
                                    <Button size="icon" variant="ghost" className="text-rose-500 hover:bg-rose-500/10"><Ban size={16} /></Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </Card>

    </div>
  );
};

export default SuperAdminDashboard;
