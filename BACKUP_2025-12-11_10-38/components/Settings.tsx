import React, { useState, useEffect } from 'react';
import {
   Save,
   Store,
   Bot,
   Layout,
   ShieldAlert,
   DollarSign,
   BarChart3,
   Globe,
   X,
   ToggleLeft,
   ToggleRight,
   Sparkles,
   Clock,
   Calendar,
   Users,
   Timer,
   Award,
   Gift,
   Megaphone,
   Bell,
   Camera,
   CreditCard,
   ChevronDown,
   ChevronUp,
   Info,
   Check,
   Phone,
   Mail,
   MapPin,
   Building2,
   CheckCircle,
   AlertCircle,
   Edit2
} from 'lucide-react';
import { SystemSettings } from '../types';
import { getCurrentBusiness, getCurrentBusinessId } from '../lib/database';
import { supabase } from '../lib/supabase';
import { validatePhone, formatPhone, PhoneValidationResult } from '../lib/validation';
import {
   fetchBusinessSettings,
   updateBusinessSettings as updateSettings,
   BusinessSettings,
   LoyaltyTier,
   DEFAULT_SETTINGS
} from '../lib/settingsService';

interface SettingsProps {
   settings: SystemSettings;
   onUpdateSettings: (newSettings: SystemSettings) => void;
}

interface BusinessHours {
   monday: { open: string; close: string; closed: boolean };
   tuesday: { open: string; close: string; closed: boolean };
   wednesday: { open: string; close: string; closed: boolean };
   thursday: { open: string; close: string; closed: boolean };
   friday: { open: string; close: string; closed: boolean };
   saturday: { open: string; close: string; closed: boolean };
   sunday: { open: string; close: string; closed: boolean };
}

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings }) => {

   const [businessHours, setBusinessHours] = useState<BusinessHours>({
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '14:00', closed: false },
      sunday: { open: '09:00', close: '14:00', closed: true },
   });

   const [globalBuffer, setGlobalBuffer] = useState(15);
   const [saving, setSaving] = useState(false);

   // Business Info State
   const [businessInfo, setBusinessInfo] = useState({
      business_name: '',
      address: '',
      phone: '',
      email: ''
   });
   const [originalBusinessInfo, setOriginalBusinessInfo] = useState({
      business_name: '',
      address: '',
      phone: '',
      email: ''
   });
   const [savingBusinessInfo, setSavingBusinessInfo] = useState(false);
   const [isEditingBusinessInfo, setIsEditingBusinessInfo] = useState(false);
   const [phoneValidation, setPhoneValidation] = useState<PhoneValidationResult>({ valid: true });

   // Handle phone blur - validate and format
   const handlePhoneBlur = async () => {
      if (!businessInfo.phone.trim()) {
         setPhoneValidation({ valid: true });
         return;
      }
      const result = await validatePhone(businessInfo.phone);
      setPhoneValidation(result);
      if (result.valid && result.national) {
         setBusinessInfo({ ...businessInfo, phone: result.national });
      }
   };

   // Feature toggles & Loyalty settings
   const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
   const [expandedSection, setExpandedSection] = useState<string | null>(null);

   // Carregar dados do banco
   useEffect(() => {
      loadBusinessData();
   }, []);

   const loadBusinessData = async () => {
      const business = await getCurrentBusiness();
      if (business) {
         if (business.business_hours) {
            setBusinessHours(business.business_hours as BusinessHours);
         }
         if (business.booking_settings?.buffer_minutes) {
            setGlobalBuffer(business.booking_settings.buffer_minutes);
         }
         // Load business info
         // Note: DB uses 'business_name' but TS type uses 'name'
         const businessData = business as any;
         const info = {
            business_name: businessData.business_name || businessData.name || '',
            address: business.address || '',
            phone: business.phone || '',
            email: business.email || ''
         };
         setBusinessInfo(info);
         setOriginalBusinessInfo(info);

         // Load feature toggles & loyalty settings
         const settings = await fetchBusinessSettings(business.id);
         if (settings) {
            setBusinessSettings(settings);
         }
      }
   };

   // Update a single business setting
   const handleUpdateBusinessSetting = async (key: keyof BusinessSettings, value: any) => {
      const businessId = await getCurrentBusinessId();
      if (!businessId || !businessSettings) return;

      const updates = { [key]: value };
      const success = await updateSettings(businessId, updates);
      if (success) {
         setBusinessSettings(prev => prev ? { ...prev, ...updates } : null);
      }
   };

   // Check if business info has changed
   const hasBusinessInfoChanged = () => {
      return (
         businessInfo.business_name !== originalBusinessInfo.business_name ||
         businessInfo.address !== originalBusinessInfo.address ||
         businessInfo.phone !== originalBusinessInfo.phone ||
         businessInfo.email !== originalBusinessInfo.email
      );
   };

   // Cancel editing - revert to original values
   const handleCancelEdit = () => {
      setBusinessInfo({ ...originalBusinessInfo });
      setPhoneValidation({ valid: true });
      setIsEditingBusinessInfo(false);
   };

   // Save business info
   const handleSaveBusinessInfo = async () => {

      setSavingBusinessInfo(true);
      try {
         const businessId = await getCurrentBusinessId();
         if (!businessId) {
            alert('Erro: Negócio não encontrado');
            return;
         }

         const { error } = await supabase
            .from('businesses')
            .update({
               business_name: businessInfo.business_name,
               address: businessInfo.address,
               phone: businessInfo.phone,
               email: businessInfo.email,
               updated_at: new Date().toISOString()
            })
            .eq('id', businessId);

         if (error) throw error;

         setOriginalBusinessInfo({ ...businessInfo });
         setIsEditingBusinessInfo(false);
         alert('Informações salvas com sucesso!');
      } catch (error) {
         console.error('Error saving business info:', error);
         alert('Erro ao salvar informações');
      } finally {
         setSavingBusinessInfo(false);
      }
   };

   const handleSaveAll = async () => {
      setSaving(true);
      try {
         const businessId = await getCurrentBusinessId();
         if (!businessId) {
            alert('Erro: Negócio não encontrado');
            return;
         }

         // Atualizar horários de funcionamento
         const { error: hoursError } = await supabase
            .from('businesses')
            .update({ business_hours: businessHours })
            .eq('id', businessId);

         if (hoursError) throw hoursError;

         // Atualizar buffer global
         const { data: currentBusiness } = await supabase
            .from('businesses')
            .select('booking_settings')
            .eq('id', businessId)
            .single();

         const updatedSettings = {
            ...(currentBusiness?.booking_settings || {}),
            buffer_minutes: globalBuffer
         };

         const { error: bufferError } = await supabase
            .from('businesses')
            .update({ booking_settings: updatedSettings })
            .eq('id', businessId);

         if (bufferError) throw bufferError;

         alert('✅ Configurações salvas com sucesso!');
      } catch (error) {
         console.error('Erro ao salvar:', error);
         alert('❌ Erro ao salvar configurações');
      } finally {
         setSaving(false);
      }
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

   const handleToggleAI = (type: keyof SystemSettings['aiConfig']['insightTypes']) => {
      onUpdateSettings({
         ...settings,
         aiConfig: {
            ...settings.aiConfig,
            insightTypes: {
               ...settings.aiConfig.insightTypes,
               [type]: !settings.aiConfig.insightTypes[type]
            }
         }
      });
   };

   const handleGlobalAIToggle = () => {
      onUpdateSettings({
         ...settings,
         aiConfig: {
            ...settings.aiConfig,
            enableInsights: !settings.aiConfig.enableInsights
         }
      });
   };

   const handleDayHoursChange = (day: keyof BusinessHours, field: 'open' | 'close', value: string) => {
      setBusinessHours({
         ...businessHours,
         [day]: {
            ...businessHours[day],
            [field]: value
         }
      });
   };

   const handleDayToggle = (day: keyof BusinessHours) => {
      setBusinessHours({
         ...businessHours,
         [day]: {
            ...businessHours[day],
            closed: !businessHours[day].closed
         }
      });
   };

   const Toggle = ({ active, onClick }: { active: boolean, onClick: (e?: React.MouseEvent) => void }) => (
      <button onClick={(e) => onClick(e)} className={`transition-colors ${active ? 'text-green-500' : 'text-gray-600'}`}>
         {active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
      </button>
   );

   const dayNames: { key: keyof BusinessHours; label: string }[] = [
      { key: 'monday', label: 'Segunda-feira' },
      { key: 'tuesday', label: 'Terça-feira' },
      { key: 'wednesday', label: 'Quarta-feira' },
      { key: 'thursday', label: 'Quinta-feira' },
      { key: 'friday', label: 'Sexta-feira' },
      { key: 'saturday', label: 'Sábado' },
      { key: 'sunday', label: 'Domingo' },
   ];

   return (
      <div className="space-y-6 animate-fade-in pb-20">

         {/* Header */}
         <div className="bg-barber-900 p-6 rounded-xl border border-barber-800 shadow-lg">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
               <Layout className="text-barber-gold" /> Configurações
            </h2>
            <p className="text-gray-400 text-sm mt-1">Personalize módulos, horários e informações do seu negócio.</p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Horário de Funcionamento */}
            <div className="bg-barber-950 border border-barber-800 rounded-xl p-6">
               <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                  <Clock className="text-blue-500" /> Horário de Funcionamento do Estabelecimento
               </h3>
               <p className="text-gray-400 text-sm mb-4">
                  Define o horário global do negócio. Os profissionais só podem trabalhar dentro deste período.
               </p>

               <div className="space-y-3">
                  {dayNames.map(({ key, label }) => (
                     <div
                        key={key}
                        className={`p-4 bg-barber-900 rounded-lg border border-barber-800 transition-all ${businessHours[key].closed ? 'opacity-50' : ''
                           }`}
                     >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                           <div className="flex items-center justify-between sm:w-48">
                              <span className="text-white font-medium">{label}</span>
                              <Toggle
                                 active={!businessHours[key].closed}
                                 onClick={() => handleDayToggle(key)}
                              />
                           </div>

                           {!businessHours[key].closed && (
                              <div className="flex items-center gap-3 flex-1">
                                 <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400">Abertura</label>
                                    <input
                                       type="time"
                                       value={businessHours[key].open}
                                       onChange={(e) => handleDayHoursChange(key, 'open', e.target.value)}
                                       className="bg-barber-950 border border-barber-700 text-white rounded px-3 py-1.5 text-sm outline-none focus:border-barber-gold"
                                    />
                                 </div>
                                 <span className="text-gray-500">→</span>
                                 <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400">Fechamento</label>
                                    <input
                                       type="time"
                                       value={businessHours[key].close}
                                       onChange={(e) => handleDayHoursChange(key, 'close', e.target.value)}
                                       className="bg-barber-950 border border-barber-700 text-white rounded px-3 py-1.5 text-sm outline-none focus:border-barber-gold"
                                    />
                                 </div>
                              </div>
                           )}

                           {businessHours[key].closed && (
                              <span className="text-red-400 text-sm font-medium">Fechado</span>
                           )}
                        </div>
                     </div>
                  ))}
               </div>

               {/* Botão Salvar Horários */}
               <div className="mt-6 flex justify-end">
                  <button
                     onClick={handleSaveAll}
                     disabled={saving}
                     className="bg-barber-gold hover:bg-barber-goldhover text-black px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                     <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Horários'}
                  </button>
               </div>
            </div>

            {/* Intervalo entre Serviços */}
            <div className="bg-barber-950 border border-barber-800 rounded-xl p-6">
               <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                  <Timer className="text-green-500" /> Intervalo entre Serviços
               </h3>
               <p className="text-gray-400 text-sm mb-6">
                  Tempo de buffer entre atendimentos. Pode ser personalizado por profissional na aba Equipe.
               </p>

               <div className="bg-barber-900 p-6 rounded-lg border border-barber-800">
                  <div className="flex justify-between items-center mb-4">
                     <div>
                        <label className="text-white font-medium block mb-1">Buffer Global Padrão</label>
                        <p className="text-xs text-gray-500">Aplicado a todos os profissionais por padrão</p>
                     </div>
                     <div className="text-right">
                        <span className="text-3xl font-bold text-barber-gold">{globalBuffer}</span>
                        <span className="text-gray-400 ml-1">min</span>
                     </div>
                  </div>

                  <input
                     type="range"
                     min="0"
                     max="60"
                     step="5"
                     value={globalBuffer}
                     onChange={(e) => setGlobalBuffer(Number(e.target.value))}
                     className="w-full accent-barber-gold h-2 bg-barber-800 rounded-lg appearance-none cursor-pointer"
                  />

                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                     <span>0 min</span>
                     <span>15 min</span>
                     <span>30 min</span>
                     <span>45 min</span>
                     <span>60 min</span>
                  </div>

                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                     <p className="text-xs text-blue-300 flex items-center gap-2">
                        <Users size={14} />
                        <span>Para configurar buffer individual por profissional, vá em <strong>Equipe</strong> e edite cada profissional.</span>
                     </p>
                  </div>
               </div>
            </div>

         </div>

         {/* Grid de 2 colunas para Módulos e Funcionalidades */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Módulos Ativos */}
            <div className="bg-barber-950 border border-barber-800 rounded-xl p-6">
               <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                  <Store className="text-blue-500" /> Módulos Ativos
               </h3>
               <div className="space-y-4">
                  {/* Chatbot IA - Em breve */}
                  <div className="flex items-center justify-between p-3 bg-barber-900 rounded-lg border border-barber-800 opacity-60">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded text-purple-400"><Bot size={18} /></div>
                        <div>
                           <div className="font-bold text-white flex items-center gap-2">
                              Chatbot IA (Site)
                              <span className="text-[10px] bg-barber-gold/20 text-barber-gold px-2 py-0.5 rounded-full">Em breve</span>
                           </div>
                           <div className="text-xs text-gray-500">Assistente virtual.</div>
                        </div>
                     </div>
                     <Toggle active={false} onClick={() => { }} />
                  </div>

                  {/* Gestão Financeira - Toggle funcional */}
                  <div className="flex items-center justify-between p-3 bg-barber-900 rounded-lg border border-barber-800">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded text-green-400"><DollarSign size={18} /></div>
                        <div>
                           <div className="font-bold text-white">Gestão Financeira</div>
                           <div className="text-xs text-gray-500">Caixa e comissões.</div>
                        </div>
                     </div>
                     <Toggle active={settings.modules.finance} onClick={() => handleToggleModule('finance')} />
                  </div>

                  {/* Agendamento Público - Toggle funcional */}
                  <div className="flex items-center justify-between p-3 bg-barber-900 rounded-lg border border-barber-800">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded text-yellow-400"><Globe size={18} /></div>
                        <div>
                           <div className="font-bold text-white">Agendamento Público</div>
                           <div className="text-xs text-gray-500">Link para clientes.</div>
                        </div>
                     </div>
                     <Toggle active={settings.modules.publicBooking} onClick={() => handleToggleModule('publicBooking')} />
                  </div>

                  {/* Controle da IA - Em breve */}
                  <div className="flex items-center justify-between p-3 bg-barber-900 rounded-lg border border-barber-800 opacity-60">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-barber-gold/20 rounded text-barber-gold"><Sparkles size={18} /></div>
                        <div>
                           <div className="font-bold text-white flex items-center gap-2">
                              Controle da IA
                              <span className="text-[10px] bg-barber-gold/20 text-barber-gold px-2 py-0.5 rounded-full">Em breve</span>
                           </div>
                           <div className="text-xs text-gray-500">Insights e notificações inteligentes.</div>
                        </div>
                     </div>
                     <Toggle active={false} onClick={() => { }} />
                  </div>
               </div>
            </div>

            {/* Funcionalidades Extras */}
            <div className="bg-barber-950 border border-barber-800 rounded-xl p-6 h-fit">
               <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                  <Award className="text-barber-gold" /> Funcionalidades Extras
               </h3>
               <div className="space-y-4">

                  {/* Programa de Fidelidade */}
                  <div className="bg-barber-900 rounded-lg border border-barber-800 overflow-hidden">
                     <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-barber-800/50 transition-colors"
                        onClick={() => setExpandedSection(expandedSection === 'loyalty' ? null : 'loyalty')}
                     >
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-yellow-500/20 rounded text-yellow-400"><Gift size={18} /></div>
                           <div>
                              <div className="font-bold text-white flex items-center gap-2">
                                 Programa de Fidelidade
                                 {businessSettings?.loyalty_enabled && (
                                    <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">ATIVO</span>
                                 )}
                              </div>
                              <div className="text-xs text-gray-500">Cartão de fidelidade digital com recompensas.</div>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <Toggle
                              active={businessSettings?.loyalty_enabled ?? false}
                              onClick={(e: React.MouseEvent) => {
                                 e.stopPropagation();
                                 handleUpdateBusinessSetting('loyalty_enabled', !businessSettings?.loyalty_enabled);
                              }}
                           />
                           {businessSettings?.loyalty_enabled && (
                              expandedSection === 'loyalty' ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />
                           )}
                        </div>
                     </div>

                     {/* Expanded content */}
                     {expandedSection === 'loyalty' && businessSettings?.loyalty_enabled && (
                        <div className="p-4 pt-0 space-y-4 border-t border-barber-800 mt-2">
                           <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                              <p className="text-xs text-blue-300 flex items-center gap-2">
                                 <Info size={14} />
                                 <span>O cartão de fidelidade aparece no perfil do cliente. A cada serviço completado, ele ganha um carimbo.</span>
                              </p>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="text-xs text-gray-400 block mb-2">Cortes para prêmio</label>
                                 <div className="flex items-center gap-2">
                                    <input
                                       type="number"
                                       min="1"
                                       max="20"
                                       value={businessSettings?.loyalty_visits_for_reward ?? 10}
                                       onChange={(e) => handleUpdateBusinessSetting('loyalty_visits_for_reward', Number(e.target.value))}
                                       className="w-20 bg-barber-950 border border-barber-700 text-white rounded px-3 py-2 text-center outline-none focus:border-barber-gold"
                                    />
                                    <span className="text-gray-400 text-sm">visitas</span>
                                 </div>
                              </div>
                              <div>
                                 <label className="text-xs text-gray-400 block mb-2">Prêmio ao completar</label>
                                 <input
                                    type="text"
                                    value={businessSettings?.loyalty_reward_description ?? 'Corte grátis'}
                                    onChange={(e) => handleUpdateBusinessSetting('loyalty_reward_description', e.target.value)}
                                    placeholder="Ex: Corte grátis"
                                    className="w-full bg-barber-950 border border-barber-700 text-white rounded px-3 py-2 text-sm outline-none focus:border-barber-gold"
                                 />
                              </div>
                           </div>

                           {/* Preview */}
                           <div className="mt-4 p-4 bg-barber-950 rounded-lg border border-barber-700">
                              <p className="text-xs text-gray-400 mb-3 font-bold uppercase">Prévia do Cartão</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                 {Array.from({ length: businessSettings?.loyalty_visits_for_reward ?? 10 }).map((_, i) => (
                                    <div
                                       key={i}
                                       className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i < 7
                                          ? 'bg-barber-gold text-black'
                                          : 'bg-barber-800 text-gray-500 border border-barber-700'
                                          }`}
                                    >
                                       {i < 7 ? '✓' : i + 1}
                                    </div>
                                 ))}
                              </div>
                              <p className="text-xs text-gray-500 mt-3">
                                 Após {businessSettings?.loyalty_visits_for_reward ?? 10} visitas, cliente ganha: <span className="text-barber-gold font-bold">{businessSettings?.loyalty_reward_description ?? 'Corte grátis'}</span>
                              </p>
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Marketing - Em breve */}
                  <div className="flex items-center justify-between p-4 bg-barber-900 rounded-lg border border-barber-800 opacity-60">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-500/20 rounded text-pink-400"><Megaphone size={18} /></div>
                        <div>
                           <div className="font-bold text-white flex items-center gap-2">
                              Marketing Inteligente
                              <span className="text-[10px] bg-barber-gold/20 text-barber-gold px-2 py-0.5 rounded-full">Em breve</span>
                           </div>
                           <div className="text-xs text-gray-500">Campanhas automáticas por WhatsApp.</div>
                        </div>
                     </div>
                     <Toggle active={false} onClick={() => { }} />
                  </div>

                  {/* Lembretes - Em breve */}
                  <div className="flex items-center justify-between p-4 bg-barber-900 rounded-lg border border-barber-800 opacity-60">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded text-blue-400"><Bell size={18} /></div>
                        <div>
                           <div className="font-bold text-white flex items-center gap-2">
                              Lembretes Automáticos
                              <span className="text-[10px] bg-barber-gold/20 text-barber-gold px-2 py-0.5 rounded-full">Em breve</span>
                           </div>
                           <div className="text-xs text-gray-500">Notificações para clientes inativos.</div>
                        </div>
                     </div>
                     <Toggle active={false} onClick={() => { }} />
                  </div>

                  {/* Galeria - Em breve */}
                  <div className="flex items-center justify-between p-4 bg-barber-900 rounded-lg border border-barber-800 opacity-60">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded text-purple-400"><Camera size={18} /></div>
                        <div>
                           <div className="font-bold text-white flex items-center gap-2">
                              Galeria de Clientes
                              <span className="text-[10px] bg-barber-gold/20 text-barber-gold px-2 py-0.5 rounded-full">Em breve</span>
                           </div>
                           <div className="text-xs text-gray-500">Fotos de antes/depois dos cortes.</div>
                        </div>
                     </div>
                     <Toggle active={false} onClick={() => { }} />
                  </div>

                  {/* Pagamentos - Core Feature, sempre ativo */}
                  <div className="flex items-center justify-between p-4 bg-barber-900 rounded-lg border border-green-500/30">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded text-green-400"><CreditCard size={18} /></div>
                        <div>
                           <div className="font-bold text-white flex items-center gap-2">
                              Pagamentos Online
                              <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">ATIVO</span>
                           </div>
                           <div className="text-xs text-gray-500">Integração com Stripe • Core Feature</div>
                        </div>
                     </div>
                     <Check size={20} className="text-green-500" />
                  </div>

               </div>
            </div>
         </div>

         {/* Informações do Negócio */}
         <div className="bg-barber-950 border border-barber-800 rounded-xl p-6">
            <div className="flex justify-between items-start mb-6">
               <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Building2 className="text-barber-gold" /> Informações do Estabelecimento
               </h3>
               {/* Edit / Save / Cancel Buttons */}
               {!isEditingBusinessInfo ? (
                  <button
                     onClick={() => setIsEditingBusinessInfo(true)}
                     className="bg-barber-800 hover:bg-barber-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                  >
                     <Edit2 size={16} /> Editar
                  </button>
               ) : (
                  <div className="flex items-center gap-2">
                     <button
                        onClick={handleCancelEdit}
                        className="bg-barber-800 hover:bg-barber-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                     >
                        <X size={16} /> Cancelar
                     </button>
                     <button
                        onClick={handleSaveBusinessInfo}
                        disabled={savingBusinessInfo || !hasBusinessInfoChanged()}
                        className="bg-barber-gold hover:bg-barber-goldhover text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                     >
                        <Save size={16} /> {savingBusinessInfo ? 'Salvando...' : 'Salvar'}
                     </button>
                  </div>
               )}
            </div>

            <div className="space-y-4">
               {/* Nome do Estabelecimento */}
               <div>
                  <label className="text-xs text-gray-400 uppercase font-bold flex items-center gap-2 mb-2">
                     <Store size={12} /> Nome do Estabelecimento
                  </label>
                  <input
                     type="text"
                     value={businessInfo.business_name}
                     onChange={(e) => setBusinessInfo({ ...businessInfo, business_name: e.target.value })}
                     placeholder="Ex: NS Studio"
                     disabled={!isEditingBusinessInfo}
                     className={`w-full bg-barber-900 border border-barber-800 text-white rounded-lg p-3 outline-none transition-colors ${!isEditingBusinessInfo ? 'opacity-70 cursor-not-allowed' : 'focus:border-barber-gold'}`}
                  />
               </div>

               {/* Endereço */}
               <div>
                  <label className="text-xs text-gray-400 uppercase font-bold flex items-center gap-2 mb-2">
                     <MapPin size={12} /> Endereço
                  </label>
                  <input
                     type="text"
                     value={businessInfo.address}
                     onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                     placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
                     disabled={!isEditingBusinessInfo}
                     className={`w-full bg-barber-900 border border-barber-800 text-white rounded-lg p-3 outline-none transition-colors ${!isEditingBusinessInfo ? 'opacity-70 cursor-not-allowed' : 'focus:border-barber-gold'}`}
                  />
               </div>

               {/* Telefone e Email - Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs text-gray-400 uppercase font-bold flex items-center gap-2 mb-2">
                        <Phone size={12} /> Telefone / WhatsApp
                     </label>
                     <div className="relative">
                        <input
                           type="tel"
                           value={businessInfo.phone}
                           onChange={(e) => {
                              setBusinessInfo({ ...businessInfo, phone: e.target.value });
                              // Reset validation on change
                              if (phoneValidation.error) {
                                 setPhoneValidation({ valid: true });
                              }
                           }}
                           onBlur={handlePhoneBlur}
                           placeholder="(11) 99999-9999"
                           disabled={!isEditingBusinessInfo}
                           className={`w-full bg-barber-900 border text-white rounded-lg p-3 pr-10 outline-none transition-colors ${!isEditingBusinessInfo
                              ? 'opacity-70 cursor-not-allowed border-barber-800'
                              : businessInfo.phone && !phoneValidation.valid
                                 ? 'border-red-500 focus:border-red-500'
                                 : businessInfo.phone && phoneValidation.valid && phoneValidation.national
                                    ? 'border-green-500 focus:border-green-500'
                                    : 'border-barber-800 focus:border-barber-gold'
                              }`}
                        />
                        {/* Validation Icon */}
                        {businessInfo.phone && (
                           <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              {phoneValidation.valid && phoneValidation.national ? (
                                 <CheckCircle size={18} className="text-green-500" />
                              ) : phoneValidation.error ? (
                                 <AlertCircle size={18} className="text-red-500" />
                              ) : null}
                           </div>
                        )}
                     </div>
                     {/* Validation Message */}
                     {businessInfo.phone && phoneValidation.error && (
                        <p className="text-xs text-red-400 mt-1">{phoneValidation.error}</p>
                     )}
                     {businessInfo.phone && phoneValidation.valid && phoneValidation.national && (
                        <p className="text-xs text-green-400 mt-1">Telefone válido</p>
                     )}
                  </div>
                  <div>
                     <label className="text-xs text-gray-400 uppercase font-bold flex items-center gap-2 mb-2">
                        <Mail size={12} /> E-mail de Contato
                     </label>
                     <input
                        type="email"
                        value={businessInfo.email}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                        placeholder="contato@exemplo.com"
                        disabled={!isEditingBusinessInfo}
                        className={`w-full bg-barber-900 border border-barber-800 text-white rounded-lg p-3 outline-none transition-colors ${!isEditingBusinessInfo ? 'opacity-70 cursor-not-allowed' : 'focus:border-barber-gold'}`}
                     />
                  </div>
               </div>
            </div>
         </div>

      </div>
   );
};

export default Settings;
