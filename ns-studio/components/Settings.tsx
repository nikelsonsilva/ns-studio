
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
  Facebook
} from 'lucide-react';
import { SystemSettings, WorkDay } from '../types';
import AISettings from './AISettings';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Switch from './ui/Switch';
import { useToast } from './ui/Toast';

interface SettingsProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
}

type SettingsTab = 'general' | 'schedule' | 'modules' | 'ai';

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isSaving, setIsSaving] = useState(false);
  
  // Estado para armazenar as configurações originais ao montar o componente
  const [originalSettings, setOriginalSettings] = useState<SystemSettings | null>(null);
  
  const toast = useToast();

  // Inicializa o estado original apenas uma vez
  useEffect(() => {
      if (!originalSettings) {
          setOriginalSettings(JSON.parse(JSON.stringify(settings)));
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
    onUpdateSettings({
      ...settings,
      modules: {
        ...settings.modules,
        [module]: !settings.modules[module]
      }
    });
  };

  const updateAIConfig = (newAIConfig: SystemSettings['aiConfig']) => {
      onUpdateSettings({
          ...settings,
          aiConfig: newAIConfig
      });
  };

  const updateBusinessHours = (dayIndex: number, field: keyof WorkDay, value: any) => {
    const newHours = [...settings.businessHours];
    newHours[dayIndex] = { ...newHours[dayIndex], [field]: value };
    onUpdateSettings({ ...settings, businessHours: newHours });
  };

  const daysMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  // Reorder to start with Monday (Index 1) for better UX, ending with Sunday (Index 0)
  const sortedDayIndices = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card noPadding className="md:col-span-2 p-5 bg-gradient-to-r from-zinc-900 to-zinc-950 border-l-4 border-l-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left w-full sm:flex-1">
                  <h2 className="text-xl font-bold text-white">Configurações do Sistema</h2>
                  <p className="text-sm text-muted mt-1">Personalize sua experiência e regras de negócio.</p>
              </div>
              
              {/* Botão Salvar Tudo - Só aparece se houver mudanças */}
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
          
          <Card noPadding className="col-span-1 p-4 flex flex-col justify-center border-l-4 border-l-blue-500">
              <span className="text-xs font-bold uppercase text-muted tracking-wider">Módulos Ativos</span>
              <div className="text-2xl font-bold text-white mt-1">{activeModulesCount} <span className="text-sm text-muted font-normal">/ {totalModules}</span></div>
              <div className="text-[10px] text-blue-500 font-bold mt-1 flex items-center gap-1">
                  <Grid size={12} /> Funcionalidades
              </div>
          </Card>

          <Card noPadding className="col-span-1 p-4 flex flex-col justify-center border-l-4 border-l-amber-500">
              <span className="text-xs font-bold uppercase text-muted tracking-wider">Dias de Funcionamento</span>
              <div className="text-2xl font-bold text-white mt-1">{openDaysCount} <span className="text-sm text-muted font-normal">dias/sem</span></div>
              <div className="text-[10px] text-amber-500 font-bold mt-1 flex items-center gap-1">
                  <Clock size={12} /> Escala Global
              </div>
          </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 overflow-x-auto scrollbar-hide w-full md:w-auto">
                <button 
                    onClick={() => setActiveTab('general')}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'general' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                    <Building2 size={14} /> Geral
                </button>
                <button 
                    onClick={() => setActiveTab('schedule')}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'schedule' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                    <Clock size={14} /> Horários
                </button>
                <button 
                    onClick={() => setActiveTab('modules')}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'modules' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                    <Grid size={14} /> Módulos
                </button>
                <button 
                    onClick={() => setActiveTab('ai')}
                    className={`flex-1 md:flex-none px-6 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'ai' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                    <Cpu size={14} /> Inteligência Artificial
                </button>
          </div>
      </div>

      {/* --- TAB CONTENT: GENERAL --- */}
      {activeTab === 'general' && (
         <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
             <Card>
                <h3 className="text-main font-bold text-lg mb-6 flex items-center gap-2 border-b border-zinc-800 pb-2">
                   <Store size={18} className="text-barber-gold" /> Identidade do Negócio
                </h3>
                <div className="space-y-4">
                    <Input 
                        label="Nome do Estabelecimento"
                        value={settings.businessName}
                        onChange={(e) => onUpdateSettings({...settings, businessName: e.target.value})}
                        icon={<Store size={16}/>}
                    />
                    <Input 
                        label="Endereço Completo"
                        value={settings.businessAddress}
                        onChange={(e) => onUpdateSettings({...settings, businessAddress: e.target.value})}
                        icon={<MapPin size={16}/>}
                    />
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
                <h3 className="text-main font-bold text-lg mb-6 flex items-center gap-2 border-b border-zinc-800 pb-2">
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
                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mt-4">
                        <h4 className="text-xs font-bold text-muted uppercase mb-2">Logo do Estabelecimento</h4>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-center text-muted">
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
             
             {/* Interval Slider Card */}
             <Card noPadding className="bg-zinc-950 border border-zinc-800">
                <div className="p-6 border-b border-zinc-800">
                    <h3 className="text-main font-bold text-lg flex items-center gap-2">
                        <Clock size={18} className="text-emerald-500" /> Intervalo entre Serviços
                    </h3>
                </div>
                <div className="p-6">
                    <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h4 className="font-bold text-white text-sm">Intervalo entre Atendimentos</h4>
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
                                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-barber-gold relative z-10"
                            />
                            <div className="relative w-full h-4 mt-2 text-[10px] text-muted font-bold uppercase tracking-wider pointer-events-none">
                                <span className="absolute left-0 transform -translate-x-0">5</span>
                                <span className="absolute left-[18.18%] transform -translate-x-1/2">15</span>
                                <span className="absolute left-[45.45%] transform -translate-x-1/2 text-center">30</span>
                                <span className="absolute left-[72.72%] transform -translate-x-1/2">45</span>
                                <span className="absolute right-0 transform translate-x-0">60 min</span>
                            </div>
                        </div>
                        
                        <p className="text-center text-xs text-zinc-600">Este intervalo define os slots de horário do calendário</p>
                    </div>
                </div>
             </Card>

             {/* Business Hours List */}
             <Card className="animate-fade-in" noPadding>
                <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-main font-bold text-lg flex items-center gap-2">
                            <Clock size={18} className="text-amber-500" /> Horário de Funcionamento
                        </h3>
                        <p className="text-xs text-muted mt-1">Define o horário global do negócio.</p>
                    </div>
                    <div className="text-[10px] text-muted bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">
                        Fuso: Brasília (GMT-3)
                    </div>
                </div>
                
                <div className="p-4 sm:p-6 grid grid-cols-1 gap-3">
                    {sortedDayIndices.map((dayIdx) => {
                        const dayConfig = settings.businessHours.find(h => h.dayOfWeek === dayIdx) || { dayOfWeek: dayIdx, startTime: '09:00', endTime: '18:00', active: true };
                        const originalIndex = settings.businessHours.findIndex(h => h.dayOfWeek === dayIdx);
                        
                        return (
                            <div key={dayIdx} className={`flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl border transition-all ${dayConfig.active ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-950/50 border-zinc-800/50 opacity-60 grayscale'}`}>
                                
                                {/* Day & Toggle */}
                                <div className="flex items-center justify-between w-full md:w-40 shrink-0">
                                    <span className={`font-bold text-sm ${dayConfig.active ? 'text-white' : 'text-zinc-500'}`}>{daysMap[dayIdx]}</span>
                                    <Switch checked={dayConfig.active} onCheckedChange={(c) => updateBusinessHours(originalIndex, 'active', c)} />
                                </div>
                                
                                {/* Time Inputs */}
                                <div className="flex-1 w-full flex flex-col sm:flex-row gap-4 items-center">
                                    {dayConfig.active ? (
                                        <>
                                            <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-lg border border-zinc-800 w-full sm:w-auto flex-1">
                                                <span className="text-[9px] font-bold text-muted uppercase w-10 text-right shrink-0">ABRE</span>
                                                <input 
                                                    type="time" 
                                                    value={dayConfig.startTime}
                                                    onChange={(e) => updateBusinessHours(originalIndex, 'startTime', e.target.value)}
                                                    className="bg-transparent text-white font-bold text-sm outline-none flex-1 text-center min-w-[80px]"
                                                />
                                            </div>
                                            
                                            <span className="text-zinc-600 hidden sm:block">➜</span>
                                            
                                            <div className="flex items-center gap-2 bg-zinc-950 p-1.5 rounded-lg border border-zinc-800 w-full sm:w-auto flex-1">
                                                <span className="text-[9px] font-bold text-muted uppercase w-10 text-right shrink-0">FECHA</span>
                                                <input 
                                                    type="time" 
                                                    value={dayConfig.endTime}
                                                    onChange={(e) => updateBusinessHours(originalIndex, 'endTime', e.target.value)}
                                                    className="bg-transparent text-white font-bold text-sm outline-none flex-1 text-center min-w-[80px]"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full text-center py-2 bg-red-900/10 border border-red-900/20 rounded-lg">
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
                      label: 'IA Assistente', 
                      desc: 'Chatbot para tirar dúvidas e ajudar na gestão (Em breve).', 
                      icon: Cpu, 
                      color: 'text-amber-500', 
                      bg: 'bg-amber-500/10', 
                      border: 'border-amber-500/20',
                      disabled: true 
                  },
                  { id: 'products', label: 'Estoque de Produtos', desc: 'Controle de vendas e inventário.', icon: Layout, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20' }
              ].map((mod) => (
                  <div key={mod.id} className={`p-6 rounded-xl border ${mod.border} bg-zinc-900 flex items-start justify-between gap-4 transition-all hover:scale-[1.02] ${mod.disabled ? 'opacity-60 cursor-not-allowed grayscale' : ''}`}>
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

      {/* --- TAB CONTENT: AI --- */}
      {activeTab === 'ai' && (
          <div className="animate-fade-in relative">
             <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] z-10 rounded-xl flex flex-col items-center justify-center border border-zinc-800/50">
               <Lock size={48} className="text-zinc-600 mb-4" />
               <span className="text-white font-bold text-xl">Módulo em Desenvolvimento</span>
               <p className="text-sm text-zinc-500 mt-2 text-center px-4">A configuração avançada da IA estará disponível em breve.</p>
               <Button variant="outline" className="mt-6">Notificar Disponibilidade</Button>
            </div>
            <div className="opacity-40 pointer-events-none filter blur-sm">
                <AISettings config={settings.aiConfig} onChange={updateAIConfig} />
            </div>
          </div>
      )}

    </div>
  );
};

export default Settings;
