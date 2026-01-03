import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './ui/Toast';
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
   Edit2,
   ImagePlus,
   Loader2
} from 'lucide-react';
import { SystemSettings } from '../types';
import { getCurrentBusiness, getCurrentBusinessId } from '../lib/database';
import { checkSlugAvailability, updateBusinessSlug } from '../lib/database';
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
   const toast = useToast();

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
   const [savingBuffer, setSavingBuffer] = useState(false);
   const bufferDebounceRef = useRef<NodeJS.Timeout | null>(null);

   // Auto-save buffer when slider changes
   const saveBufferToDatabase = useCallback(async (bufferValue: number) => {
      const businessId = await getCurrentBusinessId();
      if (!businessId) return;

      setSavingBuffer(true);
      try {
         const { data: currentBusiness } = await supabase
            .from('businesses')
            .select('booking_settings')
            .eq('id', businessId)
            .single();

         const updatedSettings = {
            ...(currentBusiness?.booking_settings || {}),
            buffer_minutes: bufferValue
         };

         const { error } = await supabase
            .from('businesses')
            .update({ booking_settings: updatedSettings })
            .eq('id', businessId);

         if (error) throw error;
         toast.success('Intervalo salvo automaticamente!');
      } catch (error) {
         console.error('Error saving buffer:', error);
         toast.error('Erro ao salvar intervalo');
      } finally {
         setSavingBuffer(false);
      }
   }, [toast]);

   const handleBufferChange = (value: number) => {
      setGlobalBuffer(value);

      // Debounce: salvar automaticamente após 500ms sem mudança
      if (bufferDebounceRef.current) {
         clearTimeout(bufferDebounceRef.current);
      }
      bufferDebounceRef.current = setTimeout(() => {
         saveBufferToDatabase(value);
      }, 500);
   };

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

   // Logo State
   const [logoUrl, setLogoUrl] = useState<string | null>(null);
   const [uploadingLogo, setUploadingLogo] = useState(false);

   // Public Slug State
   const [publicSlug, setPublicSlug] = useState('');
   const [originalSlug, setOriginalSlug] = useState('');
   const [slugChecking, setSlugChecking] = useState(false);
   const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
   const [savingSlug, setSavingSlug] = useState(false);

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

         // Load logo
         if (businessData.logo_url) {
            setLogoUrl(businessData.logo_url);
         }

         // Load public slug
         if (businessData.public_slug) {
            setPublicSlug(businessData.public_slug);
            setOriginalSlug(businessData.public_slug);
         }

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
            toast.error('Erro: Negócio não encontrado');
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
         toast.success('Informações salvas com sucesso!');
      } catch (error) {
         console.error('Error saving business info:', error);
         toast.error('Erro ao salvar informações');
      } finally {
         setSavingBusinessInfo(false);
      }
   };

   const handleSaveAll = async () => {
      setSaving(true);
      try {
         const businessId = await getCurrentBusinessId();
         if (!businessId) {
            toast.error('Erro: Negócio não encontrado');
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

         toast.success('Configurações salvas com sucesso!');
      } catch (error) {
         console.error('Erro ao salvar:', error);
         toast.error('Erro ao salvar configurações');
      } finally {
         setSaving(false);
      }
   };

   // Handle Logo Upload
   const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
         toast.warning('A imagem deve ter no máximo 2MB');
         return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
         toast.warning('Por favor, selecione uma imagem');
         return;
      }

      setUploadingLogo(true);
      try {
         const businessId = await getCurrentBusinessId();
         if (!businessId) throw new Error('Business not found');

         // Upload to Supabase Storage
         const fileName = `${businessId}/logo-${Date.now()}.${file.name.split('.').pop()}`;
         const { error: uploadError } = await supabase.storage
            .from('business-logos')
            .upload(fileName, file, { upsert: true });

         if (uploadError) throw uploadError;

         // Get public URL
         const { data: urlData } = supabase.storage
            .from('business-logos')
            .getPublicUrl(fileName);

         const logoUrl = urlData.publicUrl;

         // Update business record
         const { error: updateError } = await supabase
            .from('businesses')
            .update({ logo_url: logoUrl })
            .eq('id', businessId);

         if (updateError) throw updateError;

         setLogoUrl(logoUrl);
         toast.success('Logo atualizado com sucesso!');
      } catch (error) {
         console.error('Error uploading logo:', error);
         toast.error('Erro ao fazer upload do logo');
      } finally {
         setUploadingLogo(false);
      }
   };

   // Handle Slug Check
   const handleSlugCheck = async (slug: string) => {
      if (!slug || slug === originalSlug) {
         setSlugAvailable(null);
         return;
      }

      setSlugChecking(true);
      try {
         const businessId = await getCurrentBusinessId();
         const available = await checkSlugAvailability(slug, businessId || undefined);
         setSlugAvailable(available);
      } catch (error) {
         console.error('Error checking slug:', error);
         setSlugAvailable(null);
      } finally {
         setSlugChecking(false);
      }
   };

   // Handle Slug Save
   const handleSaveSlug = async () => {
      if (!publicSlug || publicSlug === originalSlug) return;

      setSavingSlug(true);
      try {
         const businessId = await getCurrentBusinessId();
         if (!businessId) throw new Error('Business not found');

         const success = await updateBusinessSlug(businessId, publicSlug);
         if (success) {
            setOriginalSlug(publicSlug);
            setSlugAvailable(null);
            toast.success('URL pública atualizada com sucesso!');
         } else {
            throw new Error('Failed to update slug');
         }
      } catch (error) {
         console.error('Error saving slug:', error);
         toast.error('Erro ao salvar URL pública');
      } finally {
         setSavingSlug(false);
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
      <button onClick={(e) => onClick(e)} className={`transition-colors ${active ? 'text-[var(--status-success)]' : 'text-[var(--text-subtle)]'}`}>
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

         {/* Header - Sticky with Glass Effect */}
         <div className="bg-[var(--surface-card)]/95 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-[var(--border-default)] shadow-lg sticky top-0 z-20">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
               <div className="bg-[var(--surface-subtle)] p-2 rounded-lg border border-[var(--border-default)] shrink-0">
                  <Layout size={20} className="text-[var(--brand-primary)]" />
               </div>
               Configurações
            </h2>
            <p className="text-[var(--text-muted)] text-sm mt-2 ml-0 sm:ml-12">Personalize módulos, horários e informações do seu negócio.</p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

            {/* Horário de Funcionamento */}
            <div className="bg-[var(--surface-app)] border border-[var(--border-default)] rounded-xl p-4 sm:p-5">
               <h3 className="text-[var(--text-primary)] font-bold text-base mb-3 flex items-center gap-2">
                  <Clock size={18} className="text-[var(--status-info)]" /> Horário de Funcionamento
               </h3>
               <p className="text-[var(--text-muted)] text-xs mb-3">
                  Define o horário global do negócio.
               </p>

               <div className="space-y-2">
                  {dayNames.map(({ key, label }) => (
                     <div
                        key={key}
                        className={`p-2.5 sm:p-3 bg-[var(--surface-card)] rounded-lg border border-[var(--border-default)] transition-all ${businessHours[key].closed ? 'opacity-50' : ''
                           }`}
                     >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                           <div className="flex items-center justify-between sm:w-36">
                              <span className="text-[var(--text-primary)] text-sm font-medium">{label}</span>
                              <Toggle
                                 active={!businessHours[key].closed}
                                 onClick={() => handleDayToggle(key)}
                              />
                           </div>

                           {!businessHours[key].closed && (
                              <div className="flex items-center gap-2 flex-1">
                                 <div className="flex items-center gap-1.5">
                                    <label className="text-[10px] text-[var(--text-muted)] uppercase">Abre</label>
                                    <input
                                       type="time"
                                       value={businessHours[key].open}
                                       onChange={(e) => handleDayHoursChange(key, 'open', e.target.value)}
                                       className="bg-[var(--surface-app)] border border-[var(--border-strong)] text-[var(--text-primary)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--brand-primary)]"
                                    />
                                 </div>
                                 <span className="text-[var(--text-subtle)] text-xs">→</span>
                                 <div className="flex items-center gap-1.5">
                                    <label className="text-[10px] text-[var(--text-muted)] uppercase">Fecha</label>
                                    <input
                                       type="time"
                                       value={businessHours[key].close}
                                       onChange={(e) => handleDayHoursChange(key, 'close', e.target.value)}
                                       className="bg-[var(--surface-app)] border border-[var(--border-strong)] text-[var(--text-primary)] rounded px-2 py-1 text-xs outline-none focus:border-[var(--brand-primary)]"
                                    />
                                 </div>
                              </div>
                           )}

                           {businessHours[key].closed && (
                              <span className="text-[var(--status-error)] text-xs font-medium">Fechado</span>
                           )}
                        </div>
                     </div>
                  ))}
               </div>

               {/* Botão Salvar Horários - Só aparece com alterações */}
               <div className="mt-4 flex justify-end">
                  <button
                     onClick={handleSaveAll}
                     disabled={saving}
                     className="bg-[var(--brand-primary)] hover:brightness-110 text-black px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
                  >
                     <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
                  </button>
               </div>
            </div>

            {/* Coluna Direita: Intervalo + Módulos */}
            <div className="space-y-4">
               {/* Intervalo entre Serviços */}
               <div className="bg-[var(--surface-app)] border border-[var(--border-default)] rounded-xl p-4 sm:p-5">
                  <h3 className="text-[var(--text-primary)] font-bold text-base mb-3 flex items-center gap-2">
                     <Timer size={18} className="text-[var(--status-success)]" /> Intervalo entre Serviços
                  </h3>

                  <div className="bg-[var(--surface-card)] p-4 rounded-lg border border-[var(--border-default)]">
                     <div className="flex justify-between items-center mb-3">
                        <div>
                           <label className="text-[var(--text-primary)] text-sm font-medium block">Intervalo entre Atendimentos</label>
                           <p className="text-[10px] text-[var(--text-subtle)]">Tempo de preparação entre um cliente e outro</p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                           {savingBuffer && (
                              <Loader2 size={14} className="animate-spin text-[var(--brand-primary)]" />
                           )}
                           <span className="text-2xl font-bold text-[var(--brand-primary)]">{globalBuffer}</span>
                           <span className="text-[var(--text-muted)] text-sm">min</span>
                        </div>
                     </div>

                     <input
                        type="range"
                        min="5"
                        max="60"
                        step="5"
                        value={globalBuffer}
                        onChange={(e) => handleBufferChange(Number(e.target.value))}
                        className="w-full accent-[var(--brand-primary)] h-2 bg-[var(--surface-subtle)] rounded-lg appearance-none cursor-pointer"
                     />

                     <div className="flex justify-between text-[10px] text-[var(--text-subtle)] mt-1.5">
                        <span>5</span>
                        <span>15</span>
                        <span>30</span>
                        <span>45</span>
                        <span>60 min</span>
                     </div>

                     <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
                        Este intervalo define os slots de horário do calendário
                     </p>
                  </div>
               </div>

               {/* Módulos Ativos */}
               <div className="bg-[var(--surface-app)] border border-[var(--border-default)] rounded-xl p-4 sm:p-5">
                  <h3 className="text-[var(--text-primary)] font-bold text-base mb-3 flex items-center gap-2">
                     <Store size={18} className="text-[var(--status-info)]" /> Módulos Ativos
                  </h3>
                  <div className="space-y-2">
                     {/* Chatbot IA - Em breve */}
                     <div className="flex items-center justify-between p-2.5 bg-[var(--surface-card)] rounded-lg border border-[var(--border-default)] opacity-60">
                        <div className="flex items-center gap-2.5">
                           <div className="p-1.5 bg-[var(--accent-purple)]/20 rounded text-[var(--accent-purple)]"><Bot size={16} /></div>
                           <div>
                              <div className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
                                 Chatbot IA
                                 <span className="text-[9px] bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] px-1.5 py-0.5 rounded-full">Em breve</span>
                              </div>
                              <div className="text-[10px] text-[var(--text-subtle)]">Assistente virtual</div>
                           </div>
                        </div>
                        <Toggle active={false} onClick={() => { }} />
                     </div>

                     {/* Gestão Financeira - Toggle funcional */}
                     <div className="flex items-center justify-between p-2.5 bg-[var(--surface-card)] rounded-lg border border-[var(--border-default)]">
                        <div className="flex items-center gap-2.5">
                           <div className="p-1.5 bg-[var(--status-success)]/20 rounded text-[var(--status-success)]"><DollarSign size={16} /></div>
                           <div>
                              <div className="font-bold text-[var(--text-primary)] text-sm">Gestão Financeira</div>
                              <div className="text-[10px] text-[var(--text-subtle)]">Caixa e comissões</div>
                           </div>
                        </div>
                        <Toggle active={settings.modules.finance} onClick={() => handleToggleModule('finance')} />
                     </div>

                     {/* Agendamento Público - Toggle funcional */}
                     <div className="flex items-center justify-between p-2.5 bg-[var(--surface-card)] rounded-lg border border-[var(--border-default)]">
                        <div className="flex items-center gap-2.5">
                           <div className="p-1.5 bg-[var(--status-warning)]/20 rounded text-[var(--status-warning)]"><Globe size={16} /></div>
                           <div>
                              <div className="font-bold text-[var(--text-primary)] text-sm">Agendamento Público</div>
                              <div className="text-[10px] text-[var(--text-subtle)]">Link para clientes</div>
                           </div>
                        </div>
                        <Toggle active={settings.modules.publicBooking} onClick={() => handleToggleModule('publicBooking')} />
                     </div>

                     {/* Controle da IA - Em breve */}
                     <div className="flex items-center justify-between p-2.5 bg-[var(--surface-card)] rounded-lg border border-[var(--border-default)] opacity-60">
                        <div className="flex items-center gap-2.5">
                           <div className="p-1.5 bg-[var(--brand-primary)]/20 rounded text-[var(--brand-primary)]"><Sparkles size={16} /></div>
                           <div>
                              <div className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
                                 Controle da IA
                                 <span className="text-[9px] bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] px-1.5 py-0.5 rounded-full">Em breve</span>
                              </div>
                              <div className="text-[10px] text-[var(--text-subtle)]">Insights inteligentes</div>
                           </div>
                        </div>
                        <Toggle active={false} onClick={() => { }} />
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Grid de 2 colunas para Funcionalidades e Informações */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            {/* Funcionalidades Extras */}
            <div className="bg-[var(--surface-app)] border border-[var(--border-default)] rounded-xl p-4 sm:p-5">
               <h3 className="text-[var(--text-primary)] font-bold text-base mb-3 flex items-center gap-2">
                  <Award size={18} className="text-[var(--brand-primary)]" /> Funcionalidades Extras
               </h3>
               <div className="space-y-2">

                  {/* Programa de Fidelidade */}
                  <div className="bg-[var(--surface-card)] rounded-lg border border-[var(--border-default)] overflow-hidden">
                     <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-[var(--surface-subtle)]/50 transition-colors"
                        onClick={() => setExpandedSection(expandedSection === 'loyalty' ? null : 'loyalty')}
                     >
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-[var(--status-warning)]/20 rounded text-[var(--status-warning)]"><Gift size={18} /></div>
                           <div>
                              <div className="font-bold text-[var(--text-primary)] flex items-center gap-2">
                                 Programa de Fidelidade
                                 {businessSettings?.loyalty_enabled && (
                                    <span className="text-[10px] bg-[var(--status-success)]/20 text-[var(--status-success)] px-2 py-0.5 rounded-full">ATIVO</span>
                                 )}
                              </div>
                              <div className="text-xs text-[var(--text-subtle)]">Cartão de fidelidade digital com recompensas.</div>
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
                              expandedSection === 'loyalty' ? <ChevronUp size={18} className="text-[var(--text-muted)]" /> : <ChevronDown size={18} className="text-[var(--text-muted)]" />
                           )}
                        </div>
                     </div>

                     {/* Expanded content */}
                     {expandedSection === 'loyalty' && businessSettings?.loyalty_enabled && (
                        <div className="p-4 pt-0 space-y-4 border-t border-[var(--border-default)] mt-2">
                           <div className="p-3 bg-[var(--status-info)]/10 border border-[var(--status-info)]/30 rounded-lg">
                              <p className="text-xs text-[var(--status-info)] flex items-center gap-2">
                                 <Info size={14} />
                                 <span>O cartão de fidelidade aparece no perfil do cliente. A cada serviço completado, ele ganha um carimbo.</span>
                              </p>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="text-xs text-[var(--text-muted)] block mb-2">Cortes para prêmio</label>
                                 <div className="flex items-center gap-2">
                                    <input
                                       type="number"
                                       min="1"
                                       max="20"
                                       value={businessSettings?.loyalty_visits_for_reward ?? 10}
                                       onChange={(e) => handleUpdateBusinessSetting('loyalty_visits_for_reward', Number(e.target.value))}
                                       className="w-20 bg-[var(--surface-app)] border border-[var(--border-strong)] text-[var(--text-primary)] rounded px-3 py-2 text-center outline-none focus:border-[var(--brand-primary)]"
                                    />
                                    <span className="text-[var(--text-muted)] text-sm">visitas</span>
                                 </div>
                              </div>
                              <div>
                                 <label className="text-xs text-[var(--text-muted)] block mb-2">Prêmio ao completar</label>
                                 <input
                                    type="text"
                                    value={businessSettings?.loyalty_reward_description ?? 'Corte grátis'}
                                    onChange={(e) => handleUpdateBusinessSetting('loyalty_reward_description', e.target.value)}
                                    placeholder="Ex: Corte grátis"
                                    className="w-full bg-[var(--surface-app)] border border-[var(--border-strong)] text-[var(--text-primary)] rounded px-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)]"
                                 />
                              </div>
                           </div>

                           {/* Preview */}
                           <div className="mt-4 p-4 bg-[var(--surface-app)] rounded-lg border border-[var(--border-strong)]">
                              <p className="text-xs text-[var(--text-muted)] mb-3 font-bold uppercase">Prévia do Cartão</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                 {Array.from({ length: businessSettings?.loyalty_visits_for_reward ?? 10 }).map((_, i) => (
                                    <div
                                       key={i}
                                       className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i < 7
                                          ? 'bg-[var(--brand-primary)] text-black'
                                          : 'bg-[var(--surface-subtle)] text-[var(--text-subtle)] border border-[var(--border-strong)]'
                                          }`}
                                    >
                                       {i < 7 ? '✓' : i + 1}
                                    </div>
                                 ))}
                              </div>
                              <p className="text-xs text-[var(--text-subtle)] mt-3">
                                 Após {businessSettings?.loyalty_visits_for_reward ?? 10} visitas, cliente ganha: <span className="text-[var(--brand-primary)] font-bold">{businessSettings?.loyalty_reward_description ?? 'Corte grátis'}</span>
                              </p>
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Marketing - Em breve */}
                  <div className="flex items-center justify-between p-2.5 bg-[var(--surface-card)] rounded-lg border border-[var(--border-default)] opacity-60">
                     <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-[var(--accent-rose)]/20 rounded text-[var(--accent-rose)]"><Megaphone size={16} /></div>
                        <div>
                           <div className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
                              Marketing
                              <span className="text-[9px] bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] px-1.5 py-0.5 rounded-full">Em breve</span>
                           </div>
                           <div className="text-[10px] text-[var(--text-subtle)]">Campanhas por WhatsApp</div>
                        </div>
                     </div>
                     <Toggle active={false} onClick={() => { }} />
                  </div>

                  {/* Lembretes - Em breve */}
                  <div className="flex items-center justify-between p-2.5 bg-[var(--surface-card)] rounded-lg border border-[var(--border-default)] opacity-60">
                     <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-[var(--status-info)]/20 rounded text-[var(--status-info)]"><Bell size={16} /></div>
                        <div>
                           <div className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
                              Lembretes
                              <span className="text-[9px] bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] px-1.5 py-0.5 rounded-full">Em breve</span>
                           </div>
                           <div className="text-[10px] text-[var(--text-subtle)]">Notificações automáticas</div>
                        </div>
                     </div>
                     <Toggle active={false} onClick={() => { }} />
                  </div>

                  {/* Galeria - Em breve */}
                  <div className="flex items-center justify-between p-2.5 bg-[var(--surface-card)] rounded-lg border border-[var(--border-default)] opacity-60">
                     <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-[var(--accent-purple)]/20 rounded text-[var(--accent-purple)]"><Camera size={16} /></div>
                        <div>
                           <div className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
                              Galeria
                              <span className="text-[9px] bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] px-1.5 py-0.5 rounded-full">Em breve</span>
                           </div>
                           <div className="text-[10px] text-[var(--text-subtle)]">Fotos antes/depois</div>
                        </div>
                     </div>
                     <Toggle active={false} onClick={() => { }} />
                  </div>

                  {/* Pagamentos - Core Feature, sempre ativo */}
                  <div className="flex items-center justify-between p-2.5 bg-[var(--surface-card)] rounded-lg border border-[var(--status-success)]/30">
                     <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-[var(--status-success)]/20 rounded text-[var(--status-success)]"><CreditCard size={16} /></div>
                        <div>
                           <div className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
                              Pagamentos
                              <span className="text-[9px] bg-[var(--status-success)]/20 text-[var(--status-success)] px-1.5 py-0.5 rounded-full font-bold">ATIVO</span>
                           </div>
                           <div className="text-[10px] text-[var(--text-subtle)]">Stripe • Core Feature</div>
                        </div>
                     </div>
                     <Check size={18} className="text-[var(--status-success)]" />
                  </div>

               </div>
            </div>

            {/* Informações do Estabelecimento - Full width */}
            <div className="bg-[var(--surface-app)] border border-[var(--border-default)] rounded-xl p-4 sm:p-5">
               <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h3 className="text-[var(--text-primary)] font-bold text-base flex items-center gap-2">
                     <Building2 size={18} className="text-[var(--brand-primary)]" /> Informações do Estabelecimento
                  </h3>
                  {/* Edit / Save / Cancel Buttons */}
                  {!isEditingBusinessInfo ? (
                     <button
                        onClick={() => setIsEditingBusinessInfo(true)}
                        className="bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors border border-[var(--border-default)]"
                     >
                        <Edit2 size={14} /> Editar
                     </button>
                  ) : (
                     <div className="flex items-center gap-2">
                        <button
                           onClick={handleCancelEdit}
                           className="bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors border border-[var(--border-default)]"
                        >
                           <X size={14} /> Cancelar
                        </button>
                        <button
                           onClick={handleSaveBusinessInfo}
                           disabled={savingBusinessInfo || !hasBusinessInfoChanged()}
                           className="bg-[var(--brand-primary)] hover:brightness-110 text-black px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                           <Save size={14} /> {savingBusinessInfo ? 'Salvando...' : 'Salvar'}
                        </button>
                     </div>
                  )}
               </div>

               <div className="space-y-3">
                  {/* Nome do Estabelecimento */}
                  <div>
                     <label className="text-xs text-[var(--text-muted)] uppercase font-bold flex items-center gap-2 mb-2">
                        <Store size={12} /> Nome do Estabelecimento
                     </label>
                     <input
                        type="text"
                        value={businessInfo.business_name}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, business_name: e.target.value })}
                        placeholder="Ex: NS Studio"
                        disabled={!isEditingBusinessInfo}
                        className={`w-full bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg p-3 outline-none transition-colors ${!isEditingBusinessInfo ? 'opacity-70 cursor-not-allowed' : 'focus:border-[var(--brand-primary)]'}`}
                     />
                  </div>

                  {/* Endereço */}
                  <div>
                     <label className="text-xs text-[var(--text-muted)] uppercase font-bold flex items-center gap-2 mb-2">
                        <MapPin size={12} /> Endereço
                     </label>
                     <input
                        type="text"
                        value={businessInfo.address}
                        onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                        placeholder="Ex: Av. Paulista, 1000 - São Paulo, SP"
                        disabled={!isEditingBusinessInfo}
                        className={`w-full bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg p-3 outline-none transition-colors ${!isEditingBusinessInfo ? 'opacity-70 cursor-not-allowed' : 'focus:border-[var(--brand-primary)]'}`}
                     />
                  </div>

                  {/* Telefone e Email - Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs text-[var(--text-muted)] uppercase font-bold flex items-center gap-2 mb-2">
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
                              className={`w-full bg-[var(--surface-card)] border text-[var(--text-primary)] rounded-lg p-3 pr-10 outline-none transition-colors ${!isEditingBusinessInfo
                                 ? 'opacity-70 cursor-not-allowed border-[var(--border-default)]'
                                 : businessInfo.phone && !phoneValidation.valid
                                    ? 'border-red-500 focus:border-red-500'
                                    : businessInfo.phone && phoneValidation.valid && phoneValidation.national
                                       ? 'border-green-500 focus:border-green-500'
                                       : 'border-[var(--border-default)] focus:border-[var(--brand-primary)]'
                                 }`}
                           />
                           {/* Validation Icon */}
                           {businessInfo.phone && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                 {phoneValidation.valid && phoneValidation.national ? (
                                    <CheckCircle size={18} className="text-[var(--status-success)]" />
                                 ) : phoneValidation.error ? (
                                    <AlertCircle size={18} className="text-[var(--status-error)]" />
                                 ) : null}
                              </div>
                           )}
                        </div>
                        {/* Validation Message */}
                        {businessInfo.phone && phoneValidation.error && (
                           <p className="text-xs text-[var(--status-error)] mt-1">{phoneValidation.error}</p>
                        )}
                        {businessInfo.phone && phoneValidation.valid && phoneValidation.national && (
                           <p className="text-xs text-[var(--status-success)] mt-1">Telefone válido</p>
                        )}
                     </div>
                     <div>
                        <label className="text-xs text-[var(--text-muted)] uppercase font-bold flex items-center gap-2 mb-2">
                           <Mail size={12} /> E-mail de Contato
                        </label>
                        <input
                           type="email"
                           value={businessInfo.email}
                           onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                           placeholder="contato@exemplo.com"
                           disabled={!isEditingBusinessInfo}
                           className={`w-full bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg p-3 outline-none transition-colors ${!isEditingBusinessInfo ? 'opacity-70 cursor-not-allowed' : 'focus:border-[var(--brand-primary)]'}`}
                        />
                     </div>
                  </div>

                  {/* Logo Upload Section */}
                  <div className="pt-4 border-t border-[var(--border-default)]">
                     <label className="text-xs text-[var(--text-muted)] uppercase font-bold flex items-center gap-2 mb-3">
                        <ImagePlus size={12} /> Logo do Estabelecimento
                     </label>
                     <div className="flex items-center gap-4">
                        {/* Logo Preview */}
                        <div className="w-20 h-20 rounded-lg border-2 border-dashed border-[var(--border-strong)] flex items-center justify-center overflow-hidden bg-[var(--surface-card)]">
                           {logoUrl ? (
                              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                           ) : (
                              <ImagePlus size={24} className="text-[var(--text-subtle)]" />
                           )}
                        </div>
                        {/* Upload Button */}
                        <div>
                           <label className="bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors cursor-pointer">
                              {uploadingLogo ? (
                                 <>
                                    <Loader2 size={16} className="animate-spin" /> Enviando...
                                 </>
                              ) : (
                                 <>
                                    <ImagePlus size={16} /> {logoUrl ? 'Trocar Logo' : 'Enviar Logo'}
                                 </>
                              )}
                              <input
                                 type="file"
                                 accept="image/*"
                                 onChange={handleLogoUpload}
                                 disabled={uploadingLogo}
                                 className="hidden"
                              />
                           </label>
                           <p className="text-xs text-[var(--text-subtle)] mt-2">PNG, JPG até 2MB</p>
                        </div>
                     </div>
                  </div>

                  {/* Public URL Section */}
                  <div className="pt-4 border-t border-[var(--border-default)]">
                     <label className="text-xs text-[var(--text-muted)] uppercase font-bold flex items-center gap-2 mb-3">
                        <Globe size={12} /> URL Pública de Agendamento
                     </label>
                     <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg overflow-hidden">
                           <span className="px-3 py-3 bg-[var(--surface-subtle)] text-[var(--text-muted)] text-sm">
                              {window.location.origin}/
                           </span>
                           <input
                              type="text"
                              value={publicSlug}
                              onChange={(e) => {
                                 const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                 setPublicSlug(slug);
                              }}
                              onBlur={() => handleSlugCheck(publicSlug)}
                              placeholder="seu-estabelecimento"
                              className="flex-1 bg-transparent text-[var(--text-primary)] px-3 py-3 outline-none"
                           />
                           <span className="px-3 py-3 text-[var(--text-muted)] text-sm">/agendamento</span>
                        </div>
                        <button
                           onClick={handleSaveSlug}
                           disabled={savingSlug || !publicSlug || publicSlug === originalSlug || slugAvailable === false}
                           className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]hover text-black px-4 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                           {savingSlug ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                           Salvar
                        </button>
                     </div>
                     {/* Slug Status */}
                     {publicSlug && publicSlug !== originalSlug && (
                        <div className="mt-2">
                           {slugChecking ? (
                              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                                 <Loader2 size={12} className="animate-spin" /> Verificando disponibilidade...
                              </p>
                           ) : slugAvailable === true ? (
                              <p className="text-xs text-[var(--status-success)] flex items-center gap-1">
                                 <CheckCircle size={12} /> URL disponível!
                              </p>
                           ) : slugAvailable === false ? (
                              <p className="text-xs text-[var(--status-error)] flex items-center gap-1">
                                 <AlertCircle size={12} /> URL já em uso, escolha outra
                              </p>
                           ) : null}
                        </div>
                     )}
                     {originalSlug && (
                        <p className="text-xs text-[var(--text-subtle)] mt-2">
                           Link atual: <a href={`/${originalSlug}/agendamento`} target="_blank" rel="noopener noreferrer" className="text-[var(--brand-primary)] hover:underline">{window.location.origin}/{originalSlug}/agendamento</a>
                        </p>
                     )}
                  </div>
               </div>
            </div>

         </div>

      </div>
   );
};

export default Settings;
