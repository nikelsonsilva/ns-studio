
import React, { useState, useEffect } from 'react';
import { 
  Save, 
  Store, 
  Layout, 
  DollarSign, 
  Globe, 
  Clock, 
  MapPin, 
  Building2, 
  Phone, 
  Mail, 
  Lock, 
  Check, 
  Cpu, 
  Calendar, 
  Grid, 
  Instagram, 
  Facebook,
  Search,
  Loader2,
  FileText,
  Smartphone,
  QrCode,
  MessageSquare,
  Power,
  RefreshCw,
  Unplug,
  Battery,
  Bot
} from 'lucide-react';
import { SystemSettings, WorkDay } from '../types';
import AISettings from './AISettings';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Switch from './ui/Switch';
import Select from './ui/Select';
import { useToast } from './ui/Toast';

interface SettingsProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
}

type SettingsTab = 'general' | 'schedule' | 'modules' | 'whatsapp';

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
  
  // WhatsApp Integration States
  const [waConnectionState, setWaConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  
  // Estado para armazenar as configurações originais ao montar o componente
  const [originalSettings, setOriginalSettings] = useState<SystemSettings | null>(null);
  
  const toast = useToast();

  // Inicializa o estado original apenas uma vez
  useEffect(() => {
      if (!originalSettings) {
          setOriginalSettings(JSON.parse(JSON.stringify(settings)));
      }
      // Set initial whatsapp connection state based on props
      if (settings.whatsappConfig?.isConnected) {
          setWaConnectionState('connected');
      }
  }, []);

  // Verifica se há alterações comparando o estado atual com o original
  const hasChanges = originalSettings ? JSON.stringify(settings) !== JSON.stringify(originalSettings) : false;

  // Stats for Header
  const activeModulesCount = Object.values(settings.modules).filter(Boolean).length;
  const totalModules = Object.keys(settings.modules).length;
  const openDaysCount = settings.businessHours.filter(d => d.active).length;

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
        setIsSaving(false);
        // Atualiza o estado original para o atual, "limpando" o status de alteração
        setOriginalSettings(JSON.parse(JSON.stringify(settings)));
        toast.success('Configurações salvas com sucesso!');
    }, 1000);
  };
  
  const handleToggleModule = (module: keyof SystemSettings['modules']) => {
    const newValue = !settings.modules[module];
    
    // Feedback específico para o módulo de IA
    if (module === 'aiChatbot') {
        if (newValue) {
            toast.success("IA Humanizada ativada! Configure a conexão na aba 'WhatsApp & IA'.");
        } else {
            toast.info("IA Humanizada desativada.");
            // Se estiver na aba whatsapp e desativar, voltar para módulos
            if (activeTab === 'whatsapp') {
                setActiveTab('modules');
            }
        }
    }

    onUpdateSettings({
      ...settings,
      modules: {
        ...settings.modules,
        [module]: newValue
      }
    });
  };

  const updateBusinessHours = (dayOfWeek: number, field: keyof WorkDay, value: any) => {
    const newHours = [...settings.businessHours];
    const index = newHours.findIndex(h => h.dayOfWeek === dayOfWeek);

    if (index >= 0) {
        newHours[index] = { ...newHours[index], [field]: value };
    } else {
        const newDay: WorkDay = {
            dayOfWeek,
            startTime: '09:00',
            endTime: '18:00',
            active: true,
            [field]: value 
        };
        newHours.push(newDay);
    }
    
    onUpdateSettings({ ...settings, businessHours: newHours });
  };

  // --- API INTEGRATION: BrasilAPI ---

  const handleFetchCnpj = async () => {
      const cnpj = settings.businessCnpj?.replace(/\D/g, '');
      if (!cnpj || cnpj.length !== 14) return;

      setIsLoadingCnpj(true);
      try {
          const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
          if (!response.ok) throw new Error('CNPJ não encontrado');
          
          const data = await response.json();
          
          const newAddress = `${data.logradouro}, ${data.numero} ${data.complemento} - ${data.bairro} - ${data.municipio}/${data.uf}`;
          
          onUpdateSettings({
              ...settings,
              businessName: data.nome_fantasia || data.razao_social || settings.businessName,
              businessAddress: newAddress,
              businessCep: data.cep,
              businessPhone: data.ddd_telefone_1 || settings.businessPhone,
              businessEmail: data.email || settings.businessEmail
          });
          toast.success('Dados da empresa carregados com sucesso!');
      } catch (error) {
          toast.error('Erro ao buscar CNPJ. Verifique o número.');
      } finally {
          setIsLoadingCnpj(false);
      }
  };

  const handleFetchCep = async () => {
      const cep = settings.businessCep?.replace(/\D/g, '');
      if (!cep || cep.length !== 8) return;

      setIsLoadingCep(true);
      try {
          const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
          if (!response.ok) throw new Error('CEP não encontrado');
          
          const data = await response.json();
          const addressPart = `${data.street} - ${data.neighborhood} - ${data.city}/${data.state}`;
          
          onUpdateSettings({
              ...settings,
              businessAddress: addressPart
          });
          toast.success('Endereço encontrado!');
      } catch (error) {
          toast.error('CEP não encontrado.');
      } finally {
          setIsLoadingCep(false);
      }
  };

  // --- WHATSAPP INTEGRATION HANDLERS (EVOLUTION API MOCK) ---
  const handleConnectWhatsApp = () => {
      setWaConnectionState('connecting');
      // Mock API call to fetch QR Code
      setTimeout(() => {
          // Generates a mock QR code image URL (Google Chart API for demo)
          setQrCodeData('https://chart.googleapis.com/chart?cht=qr&chl=EvolutionAPI-Auth&chs=300x300&choe=UTF-8');
          toast.info('QR Code gerado. Leia com seu WhatsApp.');
      }, 1500);
  };

  const handleSimulateScan = () => {
      setWaConnectionState('connected');
      onUpdateSettings({
          ...settings,
          whatsappConfig: {
              ...(settings.whatsappConfig || {
                  aiEnabled: true,
                  aiName: 'Atendente Virtual',
                  aiTone: 'descontraido',
                  allowCancellation: true,
                  responseDelay: 5
              }),
              isConnected: true,
              instanceName: 'NS Studio Principal',
              phoneNumber: '5511999990000',
              batteryLevel: 85,
              profilePicUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100&h=100&fit=crop'
          }
      });
      toast.success('WhatsApp conectado com sucesso!');
  };

  const handleDisconnectWhatsApp = () => {
      if(confirm('Tem certeza que deseja desconectar o WhatsApp? A IA parará de responder.')) {
          setWaConnectionState('disconnected');
          setQrCodeData(null);
          onUpdateSettings({
              ...settings,
              whatsappConfig: {
                  ...(settings.whatsappConfig!),
                  isConnected: false
              }
          });
          toast.info('Instância desconectada.');
      }
  };

  const daysMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const sortedDayIndices = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Sticky Header Wrapper */}
      <div className="sticky top-0 z-20 bg-barber-950/90 backdrop-blur-xl -mx-4 px-4 pt-4 pb-4 md:-mx-8 md:px-8 border-b border-barber-800/50 shadow-sm transition-all duration-300">
          {/* Header Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <Card noPadding className="md:col-span-2 p-5 bg-gradient-to-r from-barber-900 to-barber-950 border-l-4 border-l-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-none border-t-0 border-r-0 border-b-0">
                  <div className="text-center sm:text-left w-full sm:flex-1">
                      <h2 className="text-xl font-bold text-main">Configurações do Sistema</h2>
                      <p className="text-sm text-muted mt-1">Personalize sua experiência e regras de negócio.</p>
                  </div>
                  
                  <div className={`transition-all duration-300 transform ${hasChanges ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none absolute'}`}>
                      {hasChanges && (
                        <Button 
                            onClick={handleSave} 
                            isLoading={isSaving} 
                            leftIcon={<Save size={18} />} 
                            className="w-full sm:w-auto sm:shrink-0 shadow-lg shadow-green-900/20 animate-fade-in"
                            variant="success"
                        >
                            Salvar Tudo
                        </Button>
                      )}
                  </div>
              </Card>
              
              <Card noPadding className="col-span-1 p-4 flex flex-col justify-center border-l-4 border-l-blue-500 shadow-none border-t-0 border-r-0 border-b-0 bg-barber-900/50">
                  <span className="text-xs font-bold uppercase text-muted tracking-wider">Módulos Ativos</span>
                  <div className="text-2xl font-bold text-main mt-1">{activeModulesCount} <span className="text-sm text-muted font-normal">/ {totalModules}</span></div>
                  <div className="text-[10px] text-blue-500 font-bold mt-1 flex items-center gap-1">
                      <Grid size={12} /> Funcionalidades
                  </div>
              </Card>

              <Card noPadding className="col-span-1 p-4 flex flex-col justify-center border-l-4 border-l-amber-500 shadow-none border-t-0 border-r-0 border-b-0 bg-barber-900/50">
                  <span className="text-xs font-bold uppercase text-muted tracking-wider">Dias de Funcionamento</span>
                  <div className="text-2xl font-bold text-main mt-1">{openDaysCount} <span className="text-sm text-muted font-normal">dias/sem</span></div>
                  <div className="text-[10px] text-amber-500 font-bold mt-1 flex items-center gap-1">
                      <Clock size={12} /> Escala Global
                  </div>
              </Card>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-barber-900/50 p-1 rounded-xl border border-barber-800">
              <div className="flex bg-barber-950 p-1 rounded-lg border border-barber-800 overflow-x-auto scrollbar-hide w-full md:w-auto">
                    <button 
                        onClick={() => setActiveTab('general')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'general' ? 'bg-barber-800 text-main shadow' : 'text-muted hover:text-main'}`}
                    >
                        <Building2 size={14} /> Geral
                    </button>
                    <button 
                        onClick={() => setActiveTab('schedule')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'schedule' ? 'bg-barber-800 text-main shadow' : 'text-muted hover:text-main'}`}
                    >
                        <Clock size={14} /> Horários
                    </button>
                    <button 
                        onClick={() => setActiveTab('modules')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'modules' ? 'bg-barber-800 text-main shadow' : 'text-muted hover:text-main'}`}
                    >
                        <Grid size={14} /> Módulos
                    </button>
                    
                    {/* Botão Condicional da IA/WhatsApp */}
                    {settings.modules.aiChatbot && (
                        <button 
                            onClick={() => setActiveTab('whatsapp')}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 animate-fade-in ${activeTab === 'whatsapp' ? 'bg-[#25D366] text-black shadow' : 'text-muted hover:text-main'}`}
                        >
                            <MessageSquare size={14} /> WhatsApp & IA
                        </button>
                    )}
              </div>
          </div>
      </div>

      {/* Content Area */}
      <div className="pt-2">
          {/* --- TAB CONTENT: GENERAL --- */}
          {activeTab === 'general' && (
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
                 <Card>
                    <h3 className="text-main font-bold text-lg mb-6 flex items-center gap-2 border-b border-barber-800 pb-2">
                       <Store size={18} className="text-barber-gold" /> Identidade do Negócio
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="relative">
                                <Input 
                                    label="CNPJ (Opcional)"
                                    placeholder="00.000.000/0000-00"
                                    value={settings.businessCnpj || ''}
                                    onChange={(e) => onUpdateSettings({...settings, businessCnpj: e.target.value})}
                                    onBlur={handleFetchCnpj}
                                    icon={isLoadingCnpj ? <Loader2 size={16} className="animate-spin text-barber-gold" /> : <FileText size={16}/>}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <Input 
                                    label="Nome do Estabelecimento"
                                    value={settings.businessName}
                                    onChange={(e) => onUpdateSettings({...settings, businessName: e.target.value})}
                                    icon={<Store size={16}/>}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input 
                                label="CEP"
                                placeholder="00000-000"
                                value={settings.businessCep || ''}
                                onChange={(e) => onUpdateSettings({...settings, businessCep: e.target.value})}
                                onBlur={handleFetchCep}
                                icon={isLoadingCep ? <Loader2 size={16} className="animate-spin text-barber-gold" /> : <MapPin size={16}/>}
                            />
                            <div className="md:col-span-2">
                                <Input 
                                    label="Endereço Completo"
                                    value={settings.businessAddress}
                                    onChange={(e) => onUpdateSettings({...settings, businessAddress: e.target.value})}
                                    icon={<MapPin size={16}/>}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input 
                                label="Telefone"
                                type="tel"
                                value={settings.businessPhone}
                                onChange={(e) => onUpdateSettings({...settings, businessPhone: e.target.value})}
                                icon={<Phone size={16}/>}
                            />
                            <Input 
                                label="E-mail"
                                type="email"
                                value={settings.businessEmail}
                                onChange={(e) => onUpdateSettings({...settings, businessEmail: e.target.value})}
                                icon={<Mail size={16}/>}
                            />
                        </div>
                    </div>
                 </Card>

                 <Card>
                    <h3 className="text-main font-bold text-lg mb-6 flex items-center gap-2 border-b border-barber-800 pb-2">
                       <Globe size={18} className="text-blue-500" /> Presença Digital
                    </h3>
                    <div className="space-y-4">
                        <Input 
                            label="Website / Link de Agendamento"
                            placeholder="https://nsstudio.com/agendar"
                            icon={<Globe size={16}/>}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Input 
                                label="Instagram"
                                placeholder="@seu.negocio"
                                icon={<Instagram size={16}/>}
                            />
                            <Input 
                                label="Facebook"
                                placeholder="/pagina.facebook"
                                icon={<Facebook size={16}/>}
                            />
                        </div>
                        <div className="bg-barber-950 p-4 rounded-xl border border-barber-800 mt-4">
                            <h4 className="text-xs font-bold text-muted uppercase mb-2">Logo do Estabelecimento</h4>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-barber-900 rounded-lg border border-barber-800 flex items-center justify-center text-muted">
                                    <Store size={24} />
                                </div>
                                <div>
                                    <Button size="sm" variant="outline">Carregar Logo</Button>
                                    <p className="text-[10px] text-muted mt-1">Recomendado: 500x500px (PNG)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                 </Card>
             </div>
          )}

          {/* --- TAB CONTENT: SCHEDULE --- */}
          {activeTab === 'schedule' && (
              <div className="space-y-6 animate-fade-in">
                 {/* ... (Existing Schedule Content) ... */}
                 <Card noPadding className="bg-barber-950 border border-barber-800">
                    <div className="p-6 border-b border-barber-800">
                        <h3 className="text-main font-bold text-lg flex items-center gap-2">
                            <Clock size={18} className="text-emerald-500" /> Intervalo entre Serviços
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="bg-barber-900 rounded-xl p-6 border border-barber-800">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h4 className="font-bold text-main text-sm">Intervalo entre Atendimentos</h4>
                                    <p className="text-xs text-muted mt-1">Tempo de preparação entre um cliente e outro</p>
                                </div>
                                <div className="text-2xl font-bold text-barber-gold">{settings.appointmentInterval || 30} min</div>
                            </div>
                            
                            <div className="relative mb-6 px-1">
                                <input 
                                    type="range" 
                                    min="5" 
                                    max="60" 
                                    step="5"
                                    value={settings.appointmentInterval || 30}
                                    onChange={(e) => onUpdateSettings({ ...settings, appointmentInterval: Number(e.target.value) })}
                                    className="w-full h-2 bg-barber-800 rounded-lg appearance-none cursor-pointer accent-barber-gold relative z-10"
                                />
                                <div className="relative w-full h-4 mt-2 text-[10px] text-muted font-bold uppercase tracking-wider pointer-events-none">
                                    <span className="absolute left-0 transform -translate-x-0">5</span>
                                    <span className="absolute left-[18.18%] transform -translate-x-1/2">15</span>
                                    <span className="absolute left-[45.45%] transform -translate-x-1/2 text-center">30</span>
                                    <span className="absolute left-[72.72%] transform -translate-x-1/2">45</span>
                                    <span className="absolute right-0 transform translate-x-0">60 min</span>
                                </div>
                            </div>
                            
                            <p className="text-center text-xs text-muted">Este intervalo define os slots de horário do calendário</p>
                        </div>
                    </div>
                 </Card>

                 {/* Business Hours List */}
                 <Card className="animate-fade-in" noPadding>
                    <div className="p-6 border-b border-barber-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h3 className="text-main font-bold text-lg flex items-center gap-2">
                                <Clock size={18} className="text-amber-500" /> Horário de Funcionamento
                            </h3>
                            <p className="text-xs text-muted mt-1">Define o horário global do negócio.</p>
                        </div>
                        <div className="text-[10px] text-muted bg-barber-950 px-3 py-1 rounded-full border border-barber-800">
                            Fuso: Brasília (GMT-3)
                        </div>
                    </div>
                    
                    <div className="p-4 sm:p-6 grid grid-cols-1 gap-3">
                        {sortedDayIndices.map((dayIdx) => {
                            const dayConfig = settings.businessHours.find(h => h.dayOfWeek === dayIdx) || { dayOfWeek: dayIdx, startTime: '09:00', endTime: '18:00', active: true };
                            return (
                                <div key={dayIdx} className={`flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl border transition-all ${dayConfig.active ? 'bg-barber-900 border-barber-800' : 'bg-barber-950/50 border-barber-800/50 opacity-60 grayscale'}`}>
                                    <div className="flex items-center justify-between w-full md:w-40 shrink-0">
                                        <span className={`font-bold text-sm ${dayConfig.active ? 'text-main' : 'text-muted'}`}>{daysMap[dayIdx]}</span>
                                        <Switch checked={dayConfig.active} onCheckedChange={(c) => updateBusinessHours(dayIdx, 'active', c)} />
                                    </div>
                                    <div className="flex-1 w-full flex flex-col sm:flex-row gap-4 items-center">
                                        {dayConfig.active ? (
                                            <>
                                                <div className="flex items-center gap-2 bg-barber-950 p-1.5 rounded-lg border border-barber-800 w-full sm:w-auto flex-1">
                                                    <span className="text-[9px] font-bold text-muted uppercase w-10 text-right shrink-0">ABRE</span>
                                                    <input 
                                                        type="time" 
                                                        value={dayConfig.startTime}
                                                        onChange={(e) => updateBusinessHours(dayIdx, 'startTime', e.target.value)}
                                                        className="bg-transparent text-main font-bold text-sm outline-none flex-1 text-center min-w-[80px]"
                                                    />
                                                </div>
                                                <span className="text-muted hidden sm:block">➜</span>
                                                <div className="flex items-center gap-2 bg-barber-950 p-1.5 rounded-lg border border-barber-800 w-full sm:w-auto flex-1">
                                                    <span className="text-[9px] font-bold text-muted uppercase w-10 text-right shrink-0">FECHA</span>
                                                    <input 
                                                        type="time" 
                                                        value={dayConfig.endTime}
                                                        onChange={(e) => updateBusinessHours(dayIdx, 'endTime', e.target.value)}
                                                        className="bg-transparent text-main font-bold text-sm outline-none flex-1 text-center min-w-[80px]"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-full text-center py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                <span className="text-xs font-bold text-red-500/70 uppercase">Fechado</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                 </Card>
              </div>
          )}

          {/* --- TAB CONTENT: MODULES --- */}
          {activeTab === 'modules' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  {[
                      { id: 'finance', label: 'Gestão Financeira', desc: 'Controle de caixa, comissões e despesas.', icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
                      { id: 'publicBooking', label: 'Agendamento Online', desc: 'Link público para clientes marcarem horários.', icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                      { id: 'loyaltyProgram', label: 'Programa de Fidelidade', desc: 'Pontuação automática e cashback.', icon: Store, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
                      { 
                          id: 'aiChatbot', 
                          label: 'IA Humanizada no WhatsApp', 
                          desc: 'Agendamento automático com atendimento natural.', 
                          icon: MessageSquare, 
                          color: 'text-[#25D366]', 
                          bg: 'bg-[#25D366]/10', 
                          border: 'border-[#25D366]/20',
                          disabled: false // Enabled now
                      },
                      { id: 'products', label: 'Estoque de Produtos', desc: 'Controle de vendas e inventário.', icon: Layout, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' }
                  ].map((mod) => (
                      <div key={mod.id} className={`p-6 rounded-xl border ${mod.border} bg-barber-900 flex items-start justify-between gap-4 transition-all hover:scale-[1.02] ${mod.disabled ? 'opacity-60 cursor-not-allowed grayscale' : ''}`}>
                          <div className="flex gap-4 min-w-0 flex-1">
                              <div className={`p-3 rounded-xl ${mod.bg} ${mod.color} h-fit shrink-0`}>
                                  <mod.icon size={24} />
                              </div>
                              <div>
                                  <h4 className="text-main font-bold text-lg truncate">{mod.label}</h4>
                                  <p className="text-sm text-muted mt-1 leading-tight">{mod.desc}</p>
                              </div>
                          </div>
                          <Switch 
                            checked={settings.modules[mod.id as keyof SystemSettings['modules']]} 
                            onCheckedChange={() => !mod.disabled && handleToggleModule(mod.id as keyof SystemSettings['modules'])} 
                            disabled={mod.disabled}
                          />
                      </div>
                  ))}
              </div>
          )}

          {/* --- TAB CONTENT: WHATSAPP & AI (REPLACED OLD AI TAB) --- */}
          {activeTab === 'whatsapp' && settings.modules.aiChatbot && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
                  
                  {/* Left Column: Connection Status & QR Code (Evolution API Simulation) */}
                  <div className="space-y-6">
                      <Card className="border-[#25D366]/20 bg-[#25D366]/5 relative overflow-hidden">
                          <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#25D366]/10 rounded-full blur-3xl pointer-events-none"></div>
                          <div className="flex justify-between items-start mb-6 relative z-10">
                              <div>
                                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                      <Smartphone size={18} className="text-[#25D366]" /> Conexão WhatsApp
                                  </h3>
                                  <p className="text-xs text-muted mt-1">Integração via Whatsapp para agendamento automático.</p>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${waConnectionState === 'connected' ? 'bg-[#25D366]/20 text-[#25D366] border-[#25D366]/30' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                  {waConnectionState === 'connected' ? 'Online' : 'Desconectado'}
                              </div>
                          </div>

                          {/* CONNECTION STATES */}
                          {waConnectionState === 'disconnected' && (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                  <div className="w-16 h-16 bg-barber-950 rounded-full flex items-center justify-center mb-4 border border-barber-800 shadow-inner">
                                      <QrCode size={32} className="text-muted" />
                                  </div>
                                  <p className="text-sm text-gray-300 font-medium mb-6 max-w-xs">
                                      Conecte o WhatsApp do seu estabelecimento para ativar a IA de agendamento.
                                  </p>
                                  <Button 
                                      onClick={handleConnectWhatsApp}
                                      className="bg-[#25D366] hover:bg-[#20b857] text-black font-bold border-none shadow-lg shadow-[#25D366]/20"
                                      leftIcon={<Unplug size={18} />}
                                  >
                                      Conectar Instância
                                  </Button>
                              </div>
                          )}

                          {waConnectionState === 'connecting' && (
                              <div className="flex flex-col items-center justify-center py-4 text-center animate-fade-in">
                                  <div className="bg-white p-2 rounded-xl mb-4 shadow-lg">
                                      {qrCodeData ? (
                                          <img src={qrCodeData} alt="QR Code" className="w-48 h-48 mix-blend-multiply" />
                                      ) : (
                                          <div className="w-48 h-48 flex items-center justify-center">
                                              <Loader2 size={32} className="text-barber-900 animate-spin" />
                                          </div>
                                      )}
                                  </div>
                                  <p className="text-sm text-white font-bold mb-2">Escaneie com seu WhatsApp</p>
                                  <p className="text-xs text-muted mb-4">Abra o WhatsApp {'>'} Aparelhos Conectados {'>'} Conectar Aparelho</p>
                                  
                                  {qrCodeData && (
                                      <Button size="sm" variant="ghost" className="text-xs" onClick={handleSimulateScan}>
                                          (Simular Leitura do QR)
                                      </Button>
                                  )}
                              </div>
                          )}

                          {waConnectionState === 'connected' && (
                              <div className="space-y-4 animate-fade-in">
                                  <div className="bg-barber-950 p-4 rounded-xl border border-barber-800 flex items-center gap-4">
                                      <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-[#25D366]">
                                          <img src={settings.whatsappConfig?.profilePicUrl || 'https://via.placeholder.com/100'} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1">
                                          <div className="font-bold text-white text-lg">{settings.whatsappConfig?.instanceName}</div>
                                          <div className="text-xs text-muted font-mono">{settings.whatsappConfig?.phoneNumber}</div>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                          <div className="flex items-center gap-1 text-[10px] text-[#25D366] font-bold">
                                              <Battery size={12} className="fill-current" /> {settings.whatsappConfig?.batteryLevel}%
                                          </div>
                                          <Button size="sm" variant="danger" className="h-7 text-[10px] px-2" onClick={handleDisconnectWhatsApp}>
                                              Desconectar
                                          </Button>
                                      </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-3 text-center">
                                      <div className="bg-barber-900/50 p-3 rounded-lg border border-barber-800">
                                          <div className="text-2xl font-bold text-white">128</div>
                                          <div className="text-[10px] text-muted uppercase">Msgs Hoje</div>
                                      </div>
                                      <div className="bg-barber-900/50 p-3 rounded-lg border border-barber-800">
                                          <div className="text-2xl font-bold text-emerald-500">12</div>
                                          <div className="text-[10px] text-muted uppercase">Agendamentos via IA</div>
                                      </div>
                                  </div>
                              </div>
                          )}
                      </Card>
                  </div>

                  {/* Right Column: AI Brain Configuration */}
                  <div className={`space-y-6 transition-all duration-300 ${waConnectionState !== 'connected' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                      <Card>
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="text-main font-bold text-lg flex items-center gap-2">
                                  <Bot size={18} className="text-purple-500" /> Cérebro da IA
                              </h3>
                              <Switch 
                                  checked={settings.whatsappConfig?.aiEnabled ?? false} 
                                  onCheckedChange={(c) => onUpdateSettings({
                                      ...settings, 
                                      whatsappConfig: { ...settings.whatsappConfig!, aiEnabled: c }
                                  })}
                              />
                          </div>

                          <div className="space-y-4">
                              <Input 
                                  label="Nome do Assistente"
                                  placeholder="Ex: Assistente NS Studio"
                                  value={settings.whatsappConfig?.aiName || ''}
                                  onChange={(e) => onUpdateSettings({
                                      ...settings,
                                      whatsappConfig: { ...settings.whatsappConfig!, aiName: e.target.value }
                                  })}
                              />

                              <div className="space-y-1">
                                  <label className="block text-xs font-bold text-muted uppercase ml-1">Tom de Voz</label>
                                  <div className="grid grid-cols-3 gap-2">
                                      {['formal', 'descontraido', 'vendedor'].map(tone => (
                                          <button 
                                              key={tone}
                                              onClick={() => onUpdateSettings({
                                                  ...settings,
                                                  whatsappConfig: { ...settings.whatsappConfig!, aiTone: tone as any }
                                              })}
                                              className={`py-2 rounded-lg text-xs font-bold capitalize transition-all border ${settings.whatsappConfig?.aiTone === tone ? 'bg-purple-500 text-white border-purple-500 shadow-md' : 'bg-barber-950 border-barber-800 text-muted hover:border-purple-500/50'}`}
                                          >
                                              {tone}
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              <div className="bg-barber-950 p-4 rounded-xl border border-barber-800 space-y-3">
                                  <div className="flex justify-between items-center">
                                      <div>
                                          <span className="text-sm font-bold text-white block">Permitir Cancelamentos</span>
                                          <span className="text-xs text-muted">IA pode cancelar horários se o cliente pedir?</span>
                                      </div>
                                      <Switch 
                                          checked={settings.whatsappConfig?.allowCancellation ?? true}
                                          onCheckedChange={(c) => onUpdateSettings({
                                              ...settings,
                                              whatsappConfig: { ...settings.whatsappConfig!, allowCancellation: c }
                                          })}
                                      />
                                  </div>
                                  <div className="h-px bg-barber-800"></div>
                                  <div className="flex justify-between items-center">
                                      <div>
                                          <span className="text-sm font-bold text-white block">Delay de Resposta</span>
                                          <span className="text-xs text-muted">Tempo simulado de digitação (segundos)</span>
                                      </div>
                                      <div className="w-20">
                                          <input 
                                              type="number" 
                                              className="w-full bg-barber-900 border border-barber-800 rounded px-2 py-1 text-white text-center text-sm outline-none focus:border-purple-500"
                                              value={settings.whatsappConfig?.responseDelay || 5}
                                              onChange={(e) => onUpdateSettings({
                                                  ...settings,
                                                  whatsappConfig: { ...settings.whatsappConfig!, responseDelay: Number(e.target.value) }
                                              })}
                                          />
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="text-xs text-muted bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg flex gap-2 items-start">
                                  <RefreshCw size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                                  <span>As alterações no comportamento da IA são enviadas instantaneamente para o n8n.</span>
                              </div>
                          </div>
                      </Card>
                  </div>
              </div>
          )}
      </div>

    </div>
  );
};

export default Settings;
