
import React, { useState, useRef } from 'react';
import { User, Mail, Phone, Lock, Camera, Check, ShieldCheck, LogOut, Key, Sparkles, CreditCard, History, FileText, AlertTriangle, Crown, Download, ChevronLeft, Smartphone, Globe, Activity, CheckCircle2 } from 'lucide-react';
import { UserProfile as UserProfileType } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { useToast } from './ui/Toast';

interface UserProfileProps {
  user: UserProfileType;
  businessName: string;
  onSave: (updatedUser: UserProfileType) => void;
  onClose: () => void;
  onLogout: () => void;
}

// Mock Data para Logs (Expandido para demonstrar scroll)
const mockLogs = [
    { id: 1, action: 'Login Realizado', date: 'Hoje, 09:30', device: 'Chrome / Windows', ip: '192.168.1.10', type: 'login' },
    { id: 2, action: 'Senha Alterada', date: 'Ontem, 14:20', device: 'App Mobile / iOS', ip: '200.123.45.67', type: 'security' },
    { id: 3, action: 'Login Realizado', date: '20 Out, 18:45', device: 'Safari / MacOS', ip: '177.10.20.30', type: 'login' },
    { id: 4, action: 'Tentativa de Login Falha', date: '18 Out, 03:12', device: 'Firefox / Linux', ip: '45.66.77.88', type: 'alert' },
    { id: 5, action: 'Login Realizado', date: '15 Out, 10:00', device: 'Chrome / Windows', ip: '192.168.1.10', type: 'login' },
    { id: 6, action: 'Alteração de Perfil', date: '10 Out, 16:30', device: 'App Mobile / Android', ip: '201.10.10.10', type: 'security' },
    { id: 7, action: 'Login Realizado', date: '05 Out, 09:00', device: 'Safari / MacOS', ip: '177.10.20.30', type: 'login' },
    { id: 8, action: 'Login Realizado', date: '01 Out, 08:00', device: 'Chrome / Windows', ip: '192.168.1.10', type: 'login' },
];

// Mock Data para Faturas (Expandido para scroll)
const mockInvoices = [
    { date: '20 Out 2023', amount: 'R$ 97,00', status: 'Pago', id: '#INV-001' },
    { date: '20 Set 2023', amount: 'R$ 97,00', status: 'Pago', id: '#INV-002' },
    { date: '20 Ago 2023', amount: 'R$ 97,00', status: 'Pago', id: '#INV-003' },
    { date: '20 Jul 2023', amount: 'R$ 97,00', status: 'Pago', id: '#INV-004' },
    { date: '20 Jun 2023', amount: 'R$ 97,00', status: 'Pago', id: '#INV-005' },
    { date: '20 Mai 2023', amount: 'R$ 97,00', status: 'Pago', id: '#INV-006' },
];

// Mock Data para Planos
const availablePlans = [
    { 
        id: 'starter', 
        name: 'Starter', 
        price: 0, 
        features: ['1 Barbeiro', 'Agenda Básica', 'Link Público'], 
        current: false 
    },
    { 
        id: 'pro', 
        name: 'Professional', 
        price: 97, 
        features: ['Até 5 Barbeiros', 'Financeiro Completo', 'Lembretes WhatsApp', 'Relatórios Avançados'], 
        current: true,
        recommended: true
    },
    { 
        id: 'empire', 
        name: 'Empire', 
        price: 197, 
        features: ['Barbeiros Ilimitados', 'Múltiplas Unidades', 'API de Integração', 'Gerente de Conta Dedicado'], 
        current: false 
    }
];

const UserProfile: React.FC<UserProfileProps> = ({ user, businessName, onSave, onClose, onLogout }) => {
  const [formData, setFormData] = useState<UserProfileType>(user);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'billing'>('profile');
  
  // Estado para controlar sub-telas (Logs e Planos)
  const [subView, setSubView] = useState<'main' | 'logs' | 'plans'>('main');
  
  const [isLoading, setIsLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleSave = () => {
    setIsLoading(true);
    setTimeout(() => {
        onSave(formData);
        setIsLoading(false);
        toast.success('Perfil atualizado com sucesso!');
        onClose();
    }, 1000);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          setFormData({ ...formData, avatar: url });
      }
  };

  const handleChangePlan = (planName: string) => {
      toast.success(`Solicitação de alteração para o plano ${planName} enviada!`);
      setSubView('main');
  };

  // --- RENDER FUNCTIONS FOR SUB-VIEWS ---

  const renderLogs = () => (
      <div className="animate-slide-up space-y-4">
          <button 
            onClick={() => setSubView('main')} 
            className="text-xs text-muted hover:text-white flex items-center gap-1 mb-2 font-bold uppercase tracking-wider"
          >
              <ChevronLeft size={14} /> Voltar para Segurança
          </button>
          
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                  <h3 className="font-bold text-white flex items-center gap-2">
                      <Activity size={18} className="text-barber-gold" /> Logs de Atividade Recente
                  </h3>
              </div>
              {/* Adicionado max-h e overflow-y-auto para criar a barra de rolagem */}
              <div className="divide-y divide-zinc-800 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {mockLogs.map(log => (
                      <div key={log.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/30 transition-colors">
                          <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-full ${
                                  log.type === 'login' ? 'bg-blue-500/10 text-blue-500' :
                                  log.type === 'security' ? 'bg-green-500/10 text-green-500' :
                                  'bg-red-500/10 text-red-500'
                              }`}>
                                  {log.type === 'login' ? <Globe size={16} /> : 
                                   log.type === 'security' ? <Key size={16} /> : 
                                   <AlertTriangle size={16} />}
                              </div>
                              <div>
                                  <p className="text-sm font-bold text-white">{log.action}</p>
                                  <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
                                      <Smartphone size={10} /> {log.device}
                                      <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                      <span>IP: {log.ip}</span>
                                  </p>
                              </div>
                          </div>
                          <span className="text-xs text-zinc-500 font-mono">{log.date}</span>
                      </div>
                  ))}
              </div>
          </div>
          <p className="text-[10px] text-center text-muted mt-4">
              Mostrando os últimos 30 dias de atividade. Para logs mais antigos, contate o suporte.
          </p>
      </div>
  );

  const renderPlans = () => (
      <div className="animate-slide-up space-y-4">
          <button 
            onClick={() => setSubView('main')} 
            className="text-xs text-muted hover:text-white flex items-center gap-1 mb-4 font-bold uppercase tracking-wider"
          >
              <ChevronLeft size={14} /> Voltar para Plano & Pagamento
          </button>

          <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white">Escolha o plano ideal</h3>
              <p className="text-sm text-muted">Escale seu negócio com recursos premium.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availablePlans.map(plan => (
                  <div key={plan.id} className={`relative p-4 rounded-xl border flex flex-col ${plan.current ? 'bg-zinc-900 border-barber-gold shadow-lg shadow-amber-500/10' : 'bg-zinc-950 border-zinc-800'}`}>
                      {plan.recommended && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-barber-gold text-black text-[10px] font-bold px-3 py-0.5 rounded-full">
                              MAIS POPULAR
                          </div>
                      )}
                      
                      <h4 className="text-lg font-bold text-white mb-2">{plan.name}</h4>
                      <div className="text-2xl font-bold text-white mb-4">
                          {plan.price === 0 ? 'Grátis' : `R$ ${plan.price}`}
                          {plan.price > 0 && <span className="text-xs text-muted font-normal">/mês</span>}
                      </div>

                      <ul className="space-y-2 mb-6 flex-1">
                          {plan.features.map((feat, idx) => (
                              <li key={idx} className="text-xs text-zinc-400 flex items-start gap-2">
                                  <CheckCircle2 size={12} className="text-green-500 shrink-0 mt-0.5" />
                                  {feat}
                              </li>
                          ))}
                      </ul>

                      <Button 
                          variant={plan.current ? 'outline' : 'primary'} 
                          size="sm"
                          disabled={plan.current}
                          onClick={() => handleChangePlan(plan.name)}
                      >
                          {plan.current ? 'Plano Atual' : 'Selecionar'}
                      </Button>
                  </div>
              ))}
          </div>
      </div>
  );

  return (
    <Modal
        isOpen={true}
        onClose={onClose}
        title="Meu Perfil"
        size={subView === 'plans' ? 'xl' : 'lg'} // Aumenta o modal quando vendo planos
        footer={
            subView === 'main' ? (
                <div className="flex justify-between w-full">
                    <Button 
                        variant="danger" 
                        onClick={onLogout}
                        leftIcon={<LogOut size={18} />}
                        className="border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                        Sair
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button 
                            variant="primary" 
                            onClick={handleSave} 
                            isLoading={isLoading} 
                            leftIcon={<Check size={18} />}
                        >
                            Salvar
                        </Button>
                    </div>
                </div>
            ) : null // Remove footer in sub-views to force usage of back button or make clean
        }
    >
        <div className="animate-fade-in pb-4">
            
            {/* Header Profile Section - ALWAYS VISIBLE unless in full sub-view focus mode, but let's keep it consistent */}
            {subView === 'main' && (
                <div className="relative mb-8">
                    {/* Banner Background */}
                    <div className="h-32 rounded-xl bg-gradient-to-r from-zinc-800 to-zinc-950 border border-zinc-700 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Sparkles size={100} className="text-white" />
                        </div>
                    </div>

                    {/* Avatar & Info Overlay */}
                    <div className="absolute -bottom-10 left-6 flex items-end gap-4">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-full bg-zinc-900 border-4 border-zinc-900 p-1 shadow-xl">
                                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center relative">
                                    {formData.avatar ? (
                                        <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={32} className="text-zinc-500" />
                                    )}
                                    {/* Upload Overlay */}
                                    <div 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                    >
                                        <Camera size={20} className="text-white" />
                                    </div>
                                </div>
                            </div>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleAvatarChange} 
                            />
                        </div>
                        <div className="mb-2">
                            <h3 className="text-xl font-bold text-main leading-tight">
                                {businessName} {formData.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="vip" size="sm" className="text-[10px]">{formData.role}</Badge>
                                <span className="text-xs text-zinc-400">{formData.email}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Spacing for Avatar Overlap */}
            {subView === 'main' && <div className="mt-12"></div>}

            {/* Navigation Tabs - Only visible in Main view */}
            {subView === 'main' && (
                <div className="flex bg-zinc-950 p-1 rounded-xl mb-6 border border-zinc-800 overflow-x-auto">
                    <button 
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap px-4 ${activeTab === 'profile' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                    >
                        <User size={14} /> Dados Pessoais
                    </button>
                    <button 
                        onClick={() => setActiveTab('billing')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap px-4 ${activeTab === 'billing' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                    >
                        <CreditCard size={14} /> Plano & Pagamento
                    </button>
                    <button 
                        onClick={() => setActiveTab('security')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap px-4 ${activeTab === 'security' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                    >
                        <ShieldCheck size={14} /> Segurança
                    </button>
                </div>
            )}

            {/* --- MAIN CONTENT AREAS --- */}
            
            {subView === 'logs' && renderLogs()}
            
            {subView === 'plans' && renderPlans()}

            {subView === 'main' && activeTab === 'profile' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Custom Input for Name with Fixed Prefix */}
                        <div className="space-y-1">
                            <label className="block text-xs font-bold text-muted uppercase mb-1 ml-1 tracking-wide">
                                Nome Completo
                            </label>
                            <div className="relative group flex items-center bg-input-bg border border-barber-800 rounded-xl overflow-hidden focus-within:border-barber-gold transition-colors">
                                <div className="absolute left-3 text-muted pointer-events-none">
                                    <User size={16} />
                                </div>
                                <div className="pl-10 pr-2 py-3 bg-zinc-900/50 text-zinc-500 text-sm font-medium select-none border-r border-barber-800/50 whitespace-nowrap">
                                    {businessName}
                                </div>
                                <input 
                                    className="w-full bg-transparent text-main py-3 px-3 text-sm outline-none placeholder:text-muted/50"
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="Seu Nome"
                                />
                            </div>
                        </div>

                        <Input 
                            label="E-mail"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            icon={<Mail size={16} />}
                        />
                        <Input 
                            label="Telefone"
                            type="tel"
                            value={formData.phone || ''}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            placeholder="(00) 00000-0000"
                            icon={<Phone size={16} />}
                        />
                        <div className="flex items-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl mt-6 md:mt-0 h-fit">
                            <div className="mr-3 p-2 bg-blue-500/20 rounded-full text-blue-400">
                                <Sparkles size={16} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-blue-400">Dica Pro</h4>
                                <p className="text-[10px] text-zinc-400 mt-0.5">Mantenha seu telefone atualizado para receber notificações de segurança.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {subView === 'main' && activeTab === 'billing' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Current Plan Card */}
                    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Crown size={120} className="text-white" />
                        </div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="vip" size="sm">Professional</Badge>
                                    <span className="text-xs text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">Ativo</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-1">R$ 97,00 <span className="text-sm font-normal text-muted">/ mês</span></h3>
                                <p className="text-xs text-muted">Próxima renovação em: <span className="text-white font-bold">20/11/2023</span></p>
                            </div>
                            
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="text-xs" onClick={() => setSubView('plans')}>
                                    Ver Planos
                                </Button>
                                <Button size="sm" variant="secondary" className="text-xs" onClick={() => setSubView('plans')}>
                                    Gerenciar Assinatura
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Payment Method */}
                    <Card noPadding className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-8 bg-zinc-800 rounded flex items-center justify-center border border-zinc-700">
                                <div className="flex -space-x-1">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white">Mastercard terminando em 4242</p>
                                <p className="text-xs text-muted">Expira em 12/25</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs">Alterar</Button>
                    </Card>

                    {/* Billing History (Updated with Scroll) */}
                    <div>
                        <h4 className="text-xs font-bold text-muted uppercase mb-3 flex items-center gap-2">
                            <History size={14} /> Histórico de Cobranças
                        </h4>
                        <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
                            <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                {mockInvoices.map((invoice, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-900/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-zinc-800 rounded text-muted">
                                                <FileText size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-white">{invoice.date}</p>
                                                <p className="text-[10px] text-muted">{invoice.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-bold text-white">{invoice.amount}</span>
                                            <Badge variant="success" size="sm" className="text-[9px]">{invoice.status}</Badge>
                                            <button className="text-muted hover:text-white"><Download size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800 flex justify-center">
                        <button className="text-xs text-red-500 hover:text-red-400 hover:underline flex items-center gap-1">
                            <AlertTriangle size={12} /> Cancelar assinatura
                        </button>
                    </div>
                </div>
            )}

            {subView === 'main' && activeTab === 'security' && (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 border border-green-500/20">
                            <ShieldCheck size={20} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-bold text-white">Status da Conta: Protegida</h4>
                            <p className="text-xs text-zinc-400 mt-0.5">Última alteração de senha: 32 dias atrás</p>
                        </div>
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs h-8"
                            onClick={() => setSubView('logs')}
                        >
                            Ver Logs
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <Input 
                            label="Senha Atual"
                            type="password"
                            value={passwordData.current}
                            onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                            icon={<Lock size={16} />}
                            placeholder="••••••••"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Nova Senha"
                                type="password"
                                value={passwordData.new}
                                onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                                icon={<Key size={16} />}
                                placeholder="••••••••"
                            />
                            <Input 
                                label="Confirmar Nova Senha"
                                type="password"
                                value={passwordData.confirm}
                                onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                                icon={<Key size={16} />}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    </Modal>
  );
};

export default UserProfile;
