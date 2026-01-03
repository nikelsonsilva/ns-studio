import React, { useState } from 'react';
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
  Check
} from 'lucide-react';
import { SystemSettings, WorkDay } from '../types';
import AISettings from './AISettings';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Switch from './ui/Switch';

interface SettingsProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
        setIsSaving(false);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
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

  const daysMap = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  // Reorder to start with Monday (Index 1) for better UX, ending with Sunday (Index 0)
  const sortedDayIndices = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header */}
      <Card className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-main flex items-center gap-2">
             <Layout className="text-barber-gold" /> Configurações
           </h2>
           <p className="text-muted text-sm mt-1">Personalize os módulos e IA.</p>
        </div>
        <div className="w-full md:w-auto">
            <Button 
                variant={showSaved ? 'success' : 'primary'}
                onClick={handleSave}
                isLoading={isSaving}
                leftIcon={showSaved ? <Check size={18} /> : <Save size={18} />}
                className="w-full md:w-auto"
            >
                {showSaved ? 'Salvo!' : 'Salvar Alterações'}
            </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         
         {/* Módulos do Sistema */}
         <Card className="h-fit">
            <h3 className="text-main font-bold text-lg mb-6 flex items-center gap-2">
               <Store className="text-blue-500" /> Módulos Ativos
            </h3>
            <div className="space-y-4">
               <div className="flex items-center justify-between p-3 bg-barber-950 rounded-lg border border-barber-800">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-green-500/20 rounded text-green-400"><DollarSign size={18} /></div>
                     <div>
                        <div className="font-bold text-main">Gestão Financeira</div>
                        <div className="text-xs text-muted">Caixa e comissões.</div>
                     </div>
                  </div>
                  <Switch checked={settings.modules.finance} onCheckedChange={() => handleToggleModule('finance')} />
               </div>

               <div className="flex items-center justify-between p-3 bg-barber-950 rounded-lg border border-barber-800">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-yellow-500/20 rounded text-yellow-400"><Globe size={18} /></div>
                     <div>
                        <div className="font-bold text-main">Agendamento Público</div>
                        <div className="text-xs text-muted">Link para clientes.</div>
                     </div>
                  </div>
                  <Switch checked={settings.modules.publicBooking} onCheckedChange={() => handleToggleModule('publicBooking')} />
               </div>
            </div>
         </Card>

         {/* Dados do Negócio */}
         <Card className="h-fit">
            <h3 className="text-main font-bold text-lg mb-6 flex items-center gap-2">
               <Building2 className="text-muted" /> Informações
            </h3>
            <div className="space-y-4">
                <Input 
                    label="Nome do Estabelecimento"
                    value={settings.businessName}
                    onChange={(e) => onUpdateSettings({...settings, businessName: e.target.value})}
                    icon={<Store size={16}/>}
                />
                <Input 
                    label="Endereço"
                    value={settings.businessAddress}
                    onChange={(e) => onUpdateSettings({...settings, businessAddress: e.target.value})}
                    icon={<MapPin size={16}/>}
                />
                <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="Telefone / WhatsApp"
                        type="tel"
                        value={settings.businessPhone}
                        onChange={(e) => onUpdateSettings({...settings, businessPhone: e.target.value})}
                        icon={<Phone size={16}/>}
                    />
                    <Input 
                        label="E-mail de Contato"
                        type="email"
                        value={settings.businessEmail}
                        onChange={(e) => onUpdateSettings({...settings, businessEmail: e.target.value})}
                        icon={<Mail size={16}/>}
                    />
                </div>
            </div>
         </Card>

         {/* Business Hours Configuration */}
         <Card className="lg:col-span-2">
             <h3 className="text-main font-bold text-lg mb-2 flex items-center gap-2">
               <Clock className="text-barber-gold" /> Horário de Atendimento
            </h3>
            <p className="text-muted text-sm mb-6">
                Define o horário global do negócio. Os profissionais só podem trabalhar dentro deste período.
            </p>

            <div className="space-y-2">
                {sortedDayIndices.map((dayIdx) => {
                    const dayConfig = settings.businessHours.find(h => h.dayOfWeek === dayIdx) || { dayOfWeek: dayIdx, startTime: '09:00', endTime: '18:00', active: true };
                    const originalIndex = settings.businessHours.findIndex(h => h.dayOfWeek === dayIdx);
                    
                    return (
                        <div key={dayIdx} className={`flex flex-col sm:flex-row items-start sm:items-center p-4 rounded-xl border ${dayConfig.active ? 'bg-barber-950 border-barber-800' : 'bg-barber-950/40 border-barber-800/40'} gap-4 transition-colors`}>
                            <div className="flex-1 min-w-[120px]">
                                <h4 className={`font-bold ${dayConfig.active ? 'text-main' : 'text-muted'}`}>{daysMap[dayIdx]}</h4>
                            </div>
                            
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                <Switch 
                                    checked={dayConfig.active} 
                                    onCheckedChange={(c) => updateBusinessHours(originalIndex, 'active', c)} 
                                />
                                {dayConfig.active ? (
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-muted font-bold uppercase hidden sm:inline">Abertura</span>
                                        <div className="relative w-24">
                                            <input 
                                                type="time" 
                                                value={dayConfig.startTime}
                                                onChange={(e) => updateBusinessHours(originalIndex, 'startTime', e.target.value)}
                                                className="w-full bg-barber-900 border border-barber-800 text-main rounded-lg px-3 py-2 text-sm outline-none focus:border-barber-gold"
                                            />
                                        </div>
                                        <span className="text-muted">&rarr;</span>
                                        <span className="text-xs text-muted font-bold uppercase hidden sm:inline">Fechamento</span>
                                        <div className="relative w-24">
                                            <input 
                                                type="time" 
                                                value={dayConfig.endTime}
                                                onChange={(e) => updateBusinessHours(originalIndex, 'endTime', e.target.value)}
                                                className="w-full bg-barber-900 border border-barber-800 text-main rounded-lg px-3 py-2 text-sm outline-none focus:border-barber-gold"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-red-500/50 font-bold uppercase text-sm px-4 py-2 border border-red-900/30 rounded-lg bg-red-900/10">Fechado</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
         </Card>

         {/* IA & Notificações - Full Width - Disabled State */}
         <div className="lg:col-span-2 relative">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] z-10 rounded-xl flex flex-col items-center justify-center border border-barber-800/50">
               <Lock size={32} className="text-gray-500 mb-2" />
               <span className="text-white font-bold">Módulo em Breve</span>
               <p className="text-xs text-gray-500">Inteligência Artificial (NS Brain)</p>
            </div>
            <div className="opacity-50 pointer-events-none">
                <AISettings config={settings.aiConfig} onChange={updateAIConfig} />
            </div>
         </div>

      </div>
    </div>
  );
};

export default Settings;