import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './ui/Toast';
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
   Grid,
   Instagram,
   Facebook,
   Loader2,
   FileText,
   Gift,
   Megaphone,
   Bell,
   Camera,
   CreditCard,
   ChevronDown,
   ChevronUp,
   Info,
   Edit2,
   ImagePlus,
   CheckCircle,
   AlertCircle,
   X,
   MessageSquare,
   QrCode,
   Zap,
   RefreshCw
} from 'lucide-react';
import { Unplug } from 'lucide-react';
import { SystemSettings } from '../types';
import { getCurrentBusiness, getCurrentBusinessId } from '../lib/database';
import { checkSlugAvailability, updateBusinessSlug } from '../lib/database';
import { supabase } from '../lib/supabase';
import { validatePhone, PhoneValidationResult } from '../lib/validation';
import {
   fetchBusinessSettings,
   updateBusinessSettings as updateSettings,
   BusinessSettings
} from '../lib/settingsService';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Switch from './ui/Switch';

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

type SettingsTab = 'general' | 'schedule' | 'modules' | 'whatsapp' | 'ai';

const Settings: React.FC<SettingsProps> = ({ settings, onUpdateSettings }) => {
   const toast = useToast();
   const [activeTab, setActiveTab] = useState<SettingsTab>('general');
   const [isSaving, setIsSaving] = useState(false);
   const [isLoading, setIsLoading] = useState(true);

   // Business Hours State
   const [businessHours, setBusinessHours] = useState<BusinessHours>({
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '14:00', closed: false },
      sunday: { open: '09:00', close: '14:00', closed: true },
   });
   const [originalBusinessHours, setOriginalBusinessHours] = useState<BusinessHours | null>(null);

   // Buffer State
   const [globalBuffer, setGlobalBuffer] = useState(15);
   const [originalBuffer, setOriginalBuffer] = useState(15);
   const [savingBuffer, setSavingBuffer] = useState(false);
   const bufferDebounceRef = useRef<NodeJS.Timeout | null>(null);

   // Business Info State
   const [businessInfo, setBusinessInfo] = useState({
      business_name: '',
      address: '',
      phone: '',
      email: '',
      cnpj: '',
      cep: ''
   });
   const [originalBusinessInfo, setOriginalBusinessInfo] = useState({
      business_name: '',
      address: '',
      phone: '',
      email: '',
      cnpj: '',
      cep: ''
   });
   const [savingBusinessInfo, setSavingBusinessInfo] = useState(false);
   const [isEditingBusinessInfo, setIsEditingBusinessInfo] = useState(false);
   const [phoneValidation, setPhoneValidation] = useState<PhoneValidationResult>({ valid: true });
   const [isLoadingCep, setIsLoadingCep] = useState(false);
   const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);

   // Logo State
   const [logoUrl, setLogoUrl] = useState<string | null>(null);
   const [uploadingLogo, setUploadingLogo] = useState(false);

   // Public Slug State
   const [publicSlug, setPublicSlug] = useState('');
   const [originalSlug, setOriginalSlug] = useState('');
   const [slugChecking, setSlugChecking] = useState(false);
   const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
   const [savingSlug, setSavingSlug] = useState(false);

   // Feature toggles & Loyalty settings
   const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
   const [expandedSection, setExpandedSection] = useState<string | null>(null);

   // WhatsApp & AI State
   const [whatsappConnected, setWhatsappConnected] = useState(false);
   const [instanceExists, setInstanceExists] = useState(false); // Track if instance was created
   const [whatsappLoading, setWhatsappLoading] = useState(false);
   const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
   const [checkingStatus, setCheckingStatus] = useState(false);
   const statusPollingRef = useRef<NodeJS.Timeout | null>(null);
   const [whatsappEventLoading, setWhatsappEventLoading] = useState<string | null>(null);
   const [aiEnabled, setAiEnabled] = useState(false);
   const [aiAssistantName, setAiAssistantName] = useState('');
   const [aiTone, setAiTone] = useState<'formal' | 'descontraido' | 'vendedor'>('descontraido');
   const [aiAllowCancellations, setAiAllowCancellations] = useState(false);
   const [aiResponseDelay, setAiResponseDelay] = useState(5);
   const [aiUnderstandsAudio, setAiUnderstandsAudio] = useState(true);
   const [aiAlwaysOnline, setAiAlwaysOnline] = useState(true);
   const [aiIncludeName, setAiIncludeName] = useState(true);
   const [aiAutoReadMessages, setAiAutoReadMessages] = useState(true);

   // Stats for Header
   const activeModulesCount = Object.values(settings.modules).filter(Boolean).length;
   const totalModules = Object.keys(settings.modules).length;
   const openDaysCount = Object.values(businessHours).filter((d: { open: string; close: string; closed: boolean }) => !d.closed).length;

   // Check for changes
   const hasChanges = originalBusinessHours
      ? JSON.stringify(businessHours) !== JSON.stringify(originalBusinessHours) || globalBuffer !== originalBuffer
      : false;

   // Load data from database
   useEffect(() => {
      loadBusinessData();
   }, []);

   const loadBusinessData = async () => {
      setIsLoading(true);
      const business = await getCurrentBusiness();
      if (business) {
         if (business.business_hours) {
            const hours = business.business_hours as BusinessHours;
            setBusinessHours(hours);
            setOriginalBusinessHours(hours);
         }
         if (business.booking_settings?.buffer_minutes) {
            setGlobalBuffer(business.booking_settings.buffer_minutes);
            setOriginalBuffer(business.booking_settings.buffer_minutes);
         }
         const businessData = business as any;
         const info = {
            business_name: businessData.business_name || businessData.name || '',
            address: business.address || '',
            phone: business.phone || '',
            email: business.email || '',
            cnpj: businessData.cnpj || '',
            cep: businessData.cep || ''
         };
         setBusinessInfo(info);
         setOriginalBusinessInfo(info);

         if (businessData.logo_url) {
            setLogoUrl(businessData.logo_url);
         }
         if (businessData.public_slug) {
            setPublicSlug(businessData.public_slug);
            setOriginalSlug(businessData.public_slug);
         }
         const fetchedSettings = await fetchBusinessSettings(business.id);
         if (fetchedSettings) {
            setBusinessSettings(fetchedSettings);
         }

         // Check WhatsApp initial status
         const instanceName = (businessData.business_name || businessData.name || '').replace(/\s+/g, '_').toLowerCase();
         if (instanceName) {
            try {
               const statusResponse = await fetch('https://n8ntech.linkarbox.app/webhook/statusinstancia', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ instanceName })
               });
               if (statusResponse.ok) {
                  const statusData = await statusResponse.json();
                  const isConnected = statusData.connected === true || statusData.status === 'connected' || statusData.state === 'open' || statusData.connectionStatus === 'open';
                  setWhatsappConnected(isConnected);
                  setInstanceExists(true); // Instance exists if we got a response
               }
            } catch (error) {
               console.log('WhatsApp status check failed:', error);
            }
         }
      }
      setIsLoading(false);
   };

   // Auto-save buffer
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
         setOriginalBuffer(bufferValue);
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
      if (bufferDebounceRef.current) {
         clearTimeout(bufferDebounceRef.current);
      }
      bufferDebounceRef.current = setTimeout(() => {
         saveBufferToDatabase(value);
      }, 500);
   };

   // Handle phone blur
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

   // Update business setting
   const handleUpdateBusinessSetting = async (key: keyof BusinessSettings, value: any) => {
      const businessId = await getCurrentBusinessId();
      if (!businessId || !businessSettings) return;
      const updates = { [key]: value };
      const success = await updateSettings(businessId, updates);
      if (success) {
         setBusinessSettings(prev => prev ? { ...prev, ...updates } : null);
      }
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

   // Save all (hours)
   const handleSave = async () => {
      setIsSaving(true);
      try {
         const businessId = await getCurrentBusinessId();
         if (!businessId) {
            toast.error('Erro: Negócio não encontrado');
            return;
         }
         const { error: hoursError } = await supabase
            .from('businesses')
            .update({ business_hours: businessHours })
            .eq('id', businessId);

         if (hoursError) throw hoursError;
         setOriginalBusinessHours({ ...businessHours });
         toast.success('Configurações salvas com sucesso!');
      } catch (error) {
         console.error('Erro ao salvar:', error);
         toast.error('Erro ao salvar configurações');
      } finally {
         setIsSaving(false);
      }
   };

   // Handle Logo Upload
   const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
         toast.warning('A imagem deve ter no máximo 2MB');
         return;
      }
      if (!file.type.startsWith('image/')) {
         toast.warning('Por favor, selecione uma imagem');
         return;
      }
      setUploadingLogo(true);
      try {
         const businessId = await getCurrentBusinessId();
         if (!businessId) throw new Error('Business not found');
         const fileName = `${businessId}/logo-${Date.now()}.${file.name.split('.').pop()}`;
         const { error: uploadError } = await supabase.storage
            .from('business-logos')
            .upload(fileName, file, { upsert: true });
         if (uploadError) throw uploadError;
         const { data: urlData } = supabase.storage
            .from('business-logos')
            .getPublicUrl(fileName);
         const newLogoUrl = urlData.publicUrl;
         const { error: updateError } = await supabase
            .from('businesses')
            .update({ logo_url: newLogoUrl })
            .eq('id', businessId);
         if (updateError) throw updateError;
         setLogoUrl(newLogoUrl);
         toast.success('Logo atualizado com sucesso!');
      } catch (error) {
         console.error('Error uploading logo:', error);
         toast.error('Erro ao fazer upload do logo');
      } finally {
         setUploadingLogo(false);
      }
   };

   // Handle Slug
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

   // BrasilAPI integration
   const handleFetchCnpj = async () => {
      const cnpj = businessInfo.cnpj?.replace(/\D/g, '');
      if (!cnpj || cnpj.length !== 14) return;
      setIsLoadingCnpj(true);
      try {
         const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
         if (!response.ok) throw new Error('CNPJ não encontrado');
         const data = await response.json();
         const newAddress = `${data.logradouro}, ${data.numero} ${data.complemento} - ${data.bairro} - ${data.municipio}/${data.uf}`;
         setBusinessInfo({
            ...businessInfo,
            business_name: data.nome_fantasia || data.razao_social || businessInfo.business_name,
            address: newAddress,
            cep: data.cep,
            phone: data.ddd_telefone_1 || businessInfo.phone,
            email: data.email || businessInfo.email
         });
         toast.success('Dados da empresa carregados com sucesso!');
      } catch (error) {
         toast.error('Erro ao buscar CNPJ. Verifique o número.');
      } finally {
         setIsLoadingCnpj(false);
      }
   };

   const handleFetchCep = async () => {
      const cep = businessInfo.cep?.replace(/\D/g, '');
      if (!cep || cep.length !== 8) return;
      setIsLoadingCep(true);
      try {
         const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
         if (!response.ok) throw new Error('CEP não encontrado');
         const data = await response.json();
         const addressPart = `${data.street} - ${data.neighborhood} - ${data.city}/${data.state}`;
         setBusinessInfo({ ...businessInfo, address: addressPart });
         toast.success('Endereço encontrado!');
      } catch (error) {
         toast.error('CEP não encontrado.');
      } finally {
         setIsLoadingCep(false);
      }
   };

   const handleToggleModule = (module: keyof SystemSettings['modules']) => {
      onUpdateSettings({
         ...settings,
         modules: { ...settings.modules, [module]: !settings.modules[module] }
      });
   };

   // Connect WhatsApp Instance
   const handleConnectWhatsApp = async (reconectar: boolean = false) => {
      if (!businessInfo.business_name) {
         toast.error('Nome do estabelecimento não encontrado');
         return;
      }

      setWhatsappLoading(true);
      setQrCodeBase64(null);

      try {
         const response = await fetch('https://n8ntech.linkarbox.app/webhook/conectarinstancia', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({
               instanceName: businessInfo.business_name.replace(/\s+/g, '_').toLowerCase(),
               reconectar: reconectar
            })
         });

         if (!response.ok) {
            throw new Error('Erro na requisição');
         }

         const data = await response.json();

         if (data.base64 || data.qrcode || data.code) {
            const qrCode = data.base64 || data.qrcode || data.code;
            setQrCodeBase64(qrCode);
            toast.success('QR Code gerado! Escaneie com seu WhatsApp.');
            // Start polling to check if user scanned the QR code
            startStatusPolling();
         } else {
            throw new Error('QR Code não retornado');
         }
      } catch (error) {
         console.error('Erro ao conectar WhatsApp:', error);
         toast.error('Erro ao conectar instância. Tente novamente.');
      } finally {
         setWhatsappLoading(false);
      }
   };

   // Check WhatsApp connection status
   const checkWhatsAppStatus = async () => {
      if (!businessInfo.business_name) return false;

      try {
         const response = await fetch('https://n8ntech.linkarbox.app/webhook/statusinstancia', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({
               instanceName: businessInfo.business_name.replace(/\s+/g, '_').toLowerCase()
            })
         });

         if (!response.ok) return false;

         const data = await response.json();
         return data.connected === true || data.status === 'connected' || data.state === 'open' || data.connectionStatus === 'open';
      } catch (error) {
         console.error('Erro ao verificar status:', error);
         return false;
      }
   };

   // Start polling for connection status
   const startStatusPolling = () => {
      setCheckingStatus(true);

      // Clear any existing interval
      if (statusPollingRef.current) {
         clearInterval(statusPollingRef.current);
      }

      // Poll every 3 seconds
      statusPollingRef.current = setInterval(async () => {
         const isConnected = await checkWhatsAppStatus();

         if (isConnected) {
            setWhatsappConnected(true);
            setQrCodeBase64(null);
            stopStatusPolling();
            toast.success('WhatsApp conectado com sucesso!');
         }
      }, 3000);

      // Stop polling after 2 minutes (timeout)
      setTimeout(() => {
         if (statusPollingRef.current) {
            stopStatusPolling();
         }
      }, 120000);
   };

   // Stop polling
   const stopStatusPolling = () => {
      if (statusPollingRef.current) {
         clearInterval(statusPollingRef.current);
         statusPollingRef.current = null;
      }
      setCheckingStatus(false);
   };

   // Cleanup on unmount
   useEffect(() => {
      return () => {
         if (statusPollingRef.current) {
            clearInterval(statusPollingRef.current);
         }
      };
   }, []);

   // Handle WhatsApp events (connect, delete, reconnect, disconnect, restart)
   const handleWhatsAppEvent = async (event: 'connect' | 'delete' | 'reconnect' | 'disconnect' | 'restart') => {
      if (!businessInfo.business_name) {
         toast.error('Nome do estabelecimento não encontrado');
         return;
      }

      setWhatsappEventLoading(event);

      try {
         const response = await fetch('https://n8ntech.linkarbox.app/webhook/conectarinstancia', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({
               instanceName: businessInfo.business_name.replace(/\s+/g, '_').toLowerCase(),
               event: event
            })
         });

         if (!response.ok) {
            throw new Error('Erro na requisição');
         }

         // Handle different events
         const data = await response.json();

         switch (event) {
            case 'disconnect':
               // Only disconnect the session, instance still exists
               setWhatsappConnected(false);
               // instanceExists stays true - user can reconnect
               toast.success('WhatsApp desconectado! Use Reconectar para gerar novo QR Code.');
               break;
            case 'delete':
               // Full reset - delete the instance completely
               setWhatsappConnected(false);
               setInstanceExists(false); // Instance no longer exists
               setQrCodeBase64(null);
               toast.success('Instância deletada com sucesso!');
               break;
            case 'restart':
               toast.success('WhatsApp reiniciado com sucesso!');
               break;
            case 'reconnect':
               // Check if response contains QR code
               if (data.base64 || data.qrcode || data.code) {
                  const qrCode = data.base64 || data.qrcode || data.code;
                  setQrCodeBase64(qrCode);
                  toast.success('QR Code gerado! Escaneie com seu WhatsApp.');
                  startStatusPolling();
               } else {
                  toast.success('Reconexão iniciada!');
               }
               break;
            case 'connect':
               // New instance created
               setInstanceExists(true);
               if (data.base64 || data.qrcode || data.code) {
                  const qrCode = data.base64 || data.qrcode || data.code;
                  setQrCodeBase64(qrCode);
                  toast.success('QR Code gerado! Escaneie com seu WhatsApp.');
                  startStatusPolling();
               } else {
                  toast.success('Instância criada!');
               }
               break;
         }
      } catch (error) {
         console.error(`Erro ao ${event} WhatsApp:`, error);
         const errorMessages: Record<string, string> = {
            connect: 'conectar',
            delete: 'deletar',
            reconnect: 'reconectar',
            disconnect: 'desconectar',
            restart: 'reiniciar'
         };
         toast.error(`Erro ao ${errorMessages[event]}. Tente novamente.`);
      } finally {
         setWhatsappEventLoading(null);
      }
   };

   const handleCancelEdit = () => {
      setBusinessInfo({ ...originalBusinessInfo });
      setPhoneValidation({ valid: true });
      setIsEditingBusinessInfo(false);
   };

   const hasBusinessInfoChanged = () => {
      return (
         businessInfo.business_name !== originalBusinessInfo.business_name ||
         businessInfo.address !== originalBusinessInfo.address ||
         businessInfo.phone !== originalBusinessInfo.phone ||
         businessInfo.email !== originalBusinessInfo.email
      );
   };

   const dayNames: { key: keyof BusinessHours; label: string; shortLabel: string }[] = [
      { key: 'monday', label: 'Segunda', shortLabel: 'Seg' },
      { key: 'tuesday', label: 'Terça', shortLabel: 'Ter' },
      { key: 'wednesday', label: 'Quarta', shortLabel: 'Qua' },
      { key: 'thursday', label: 'Quinta', shortLabel: 'Qui' },
      { key: 'friday', label: 'Sexta', shortLabel: 'Sex' },
      { key: 'saturday', label: 'Sábado', shortLabel: 'Sáb' },
      { key: 'sunday', label: 'Domingo', shortLabel: 'Dom' },
   ];

   // Skeleton Loader
   if (isLoading) {
      return (
         <div className="space-y-6 animate-fade-in pb-20">
            <div className="rounded-xl p-6 animate-pulse" style={{ background: 'var(--dark-bg-card)', border: '1px solid var(--dark-border-default)' }}>
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg" style={{ background: 'var(--dark-bg-subtle)' }} />
                  <div className="h-6 rounded w-48" style={{ background: 'var(--dark-bg-subtle)' }} />
               </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
               {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 rounded-xl" style={{ background: 'var(--dark-bg-card)', border: '1px solid var(--dark-border-default)' }} />
               ))}
            </div>
         </div>
      );
   }

   return (
      <div className="space-y-6 animate-fade-in pb-20">
         {/* Sticky Header */}
         <div className="sticky top-0 z-20 backdrop-blur-xl -mx-4 px-4 pt-4 pb-4 md:-mx-8 md:px-8 shadow-sm transition-all duration-300" style={{ background: 'var(--dark-bg-app-90)', borderBottom: '1px solid var(--dark-border-subtle)' }}>
            {/* Header Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
               <Card noPadding noBorder className="md:col-span-2 p-5 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ background: 'var(--dark-settings-header-gradient)', borderLeft: '4px solid var(--dark-card-accent-neutral)' }}>
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
                           className="w-full sm:w-auto sm:shrink-0 animate-fade-in"
                           style={{ boxShadow: 'var(--dark-shadow-success)' }}
                           variant="success"
                        >
                           Salvar Tudo
                        </Button>
                     )}
                  </div>
               </Card>

               <Card noPadding noBorder className="col-span-1 p-4 flex flex-col justify-center" style={{ background: 'var(--dark-bg-elevated-50)', borderLeft: '4px solid var(--dark-card-accent-blue)' }}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--dark-text-muted)' }}>Módulos Ativos</span>
                  <div className="text-2xl font-bold mt-1" style={{ color: 'var(--dark-text-main)' }}>{activeModulesCount} <span className="text-sm font-normal" style={{ color: 'var(--dark-text-muted)' }}>/ {totalModules}</span></div>
                  <div className="text-[10px] font-bold mt-1 flex items-center gap-1" style={{ color: 'var(--dark-status-pending)' }}>
                     <Grid size={12} /> Funcionalidades
                  </div>
               </Card>

               <Card noPadding noBorder className="col-span-1 p-4 flex flex-col justify-center" style={{ background: 'var(--dark-bg-elevated-50)', borderLeft: '4px solid var(--dark-card-accent-amber)' }}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--dark-text-muted)' }}>Dias de Funcionamento</span>
                  <div className="text-2xl font-bold mt-1" style={{ color: 'var(--dark-text-main)' }}>{openDaysCount} <span className="text-sm font-normal" style={{ color: 'var(--dark-text-muted)' }}>dias/sem</span></div>
                  <div className="text-[10px] font-bold mt-1 flex items-center gap-1" style={{ color: 'var(--dark-brand-primary)' }}>
                     <Clock size={12} /> Escala Global
                  </div>
               </Card>
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-1 rounded-xl" style={{ background: 'var(--dark-bg-elevated-50)', border: '1px solid var(--dark-border-default)' }}>
               <div className="flex p-1 rounded-lg overflow-x-auto scrollbar-hide w-full md:w-auto" style={{ background: 'var(--dark-bg-app)', border: '1px solid var(--dark-border-default)' }}>
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
                  {settings.modules.whatsappAi && (
                     <button
                        onClick={() => setActiveTab('whatsapp')}
                        className={`flex-1 md:flex-none px-6 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 animate-fade-in ${activeTab === 'whatsapp' ? 'bg-[#25D366] text-black shadow' : 'text-muted hover:text-main'}`}
                     >
                        <MessageSquare size={14} /> WhatsApp & IA
                     </button>
                  )}
                  <button
                     onClick={() => setActiveTab('ai')}
                     className={`flex-1 md:flex-none px-6 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'ai' ? 'bg-barber-800 text-main shadow' : 'text-muted hover:text-main'}`}
                  >
                     <Cpu size={14} /> Inteligência Artificial
                  </button>
               </div>
            </div>
         </div>

         {/* Content Area */}
         <div className="pt-2">
            {/* TAB: GENERAL */}
            {activeTab === 'general' && (
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
                  <Card>
                     <div className="flex justify-between items-center mb-6 border-b border-barber-800 pb-2">
                        <h3 className="text-main font-bold text-lg flex items-center gap-2">
                           <Store size={18} className="text-barber-gold" /> Identidade do Negócio
                        </h3>
                        {!isEditingBusinessInfo ? (
                           <Button size="sm" variant="outline" onClick={() => setIsEditingBusinessInfo(true)} leftIcon={<Edit2 size={14} />}>
                              Editar
                           </Button>
                        ) : (
                           <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={handleCancelEdit} leftIcon={<X size={14} />}>Cancelar</Button>
                              <Button size="sm" variant="success" onClick={handleSaveBusinessInfo} isLoading={savingBusinessInfo} disabled={!hasBusinessInfoChanged()} leftIcon={<Save size={14} />}>Salvar</Button>
                           </div>
                        )}
                     </div>
                     <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div className="relative">
                              <Input
                                 label="CNPJ (Opcional)"
                                 placeholder="00.000.000/0000-00"
                                 value={businessInfo.cnpj || ''}
                                 onChange={(e) => setBusinessInfo({ ...businessInfo, cnpj: e.target.value })}
                                 onBlur={handleFetchCnpj}
                                 disabled={!isEditingBusinessInfo}
                                 icon={isLoadingCnpj ? <Loader2 size={16} className="animate-spin text-barber-gold" /> : <FileText size={16} />}
                              />
                           </div>
                           <div className="md:col-span-2">
                              <Input
                                 label="Nome do Estabelecimento"
                                 value={businessInfo.business_name}
                                 onChange={(e) => setBusinessInfo({ ...businessInfo, business_name: e.target.value })}
                                 disabled={!isEditingBusinessInfo}
                                 icon={<Store size={16} />}
                              />
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <Input
                              label="CEP"
                              placeholder="00000-000"
                              value={businessInfo.cep || ''}
                              onChange={(e) => setBusinessInfo({ ...businessInfo, cep: e.target.value })}
                              onBlur={handleFetchCep}
                              disabled={!isEditingBusinessInfo}
                              icon={isLoadingCep ? <Loader2 size={16} className="animate-spin text-barber-gold" /> : <MapPin size={16} />}
                           />
                           <div className="md:col-span-2">
                              <Input
                                 label="Endereço Completo"
                                 value={businessInfo.address}
                                 onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                                 disabled={!isEditingBusinessInfo}
                                 icon={<MapPin size={16} />}
                              />
                           </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="relative">
                              <Input
                                 label="Telefone"
                                 type="tel"
                                 value={businessInfo.phone}
                                 onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                                 onBlur={handlePhoneBlur}
                                 disabled={!isEditingBusinessInfo}
                                 icon={<Phone size={16} />}
                              />
                              {businessInfo.phone && (
                                 <div className="absolute right-3 top-9">
                                    {phoneValidation.valid && phoneValidation.national ? (
                                       <CheckCircle size={16} className="text-emerald-500" />
                                    ) : phoneValidation.error ? (
                                       <AlertCircle size={16} className="text-red-500" />
                                    ) : null}
                                 </div>
                              )}
                           </div>
                           <Input
                              label="E-mail"
                              type="email"
                              value={businessInfo.email}
                              onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                              disabled={!isEditingBusinessInfo}
                              icon={<Mail size={16} />}
                           />
                        </div>
                     </div>
                  </Card>

                  <Card>
                     <h3 className="text-main font-bold text-lg mb-6 flex items-center gap-2 border-b border-barber-800 pb-2">
                        <Globe size={18} className="text-blue-500" /> Presença Digital
                     </h3>
                     <div className="space-y-4">
                        {/* Logo Section */}
                        <div className="bg-barber-950 p-4 rounded-xl border border-barber-800">
                           <h4 className="text-xs font-bold text-muted uppercase mb-2">Logo do Estabelecimento</h4>
                           <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-barber-900 rounded-lg border border-barber-800 flex items-center justify-center text-muted overflow-hidden">
                                 {logoUrl ? (
                                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                 ) : (
                                    <Store size={24} />
                                 )}
                              </div>
                              <div>
                                 <label className="cursor-pointer">
                                    <Button size="sm" variant="outline" isLoading={uploadingLogo}>
                                       {uploadingLogo ? 'Enviando...' : logoUrl ? 'Trocar Logo' : 'Carregar Logo'}
                                    </Button>
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="hidden" />
                                 </label>
                                 <p className="text-[10px] text-muted mt-1">Recomendado: 500x500px (PNG)</p>
                              </div>
                           </div>
                        </div>

                        {/* Public URL Section */}
                        <div className="bg-barber-950 p-4 rounded-xl border border-barber-800">
                           <h4 className="text-xs font-bold text-muted uppercase mb-2">URL Pública de Agendamento</h4>
                           <div className="flex items-center gap-2">
                              <div className="flex-1 flex items-center bg-barber-900 border border-barber-800 rounded-lg overflow-hidden">
                                 <span className="px-3 py-2 bg-barber-800 text-muted text-xs">
                                    {window.location.origin}/
                                 </span>
                                 <input
                                    type="text"
                                    value={publicSlug}
                                    onChange={(e) => setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    onBlur={() => handleSlugCheck(publicSlug)}
                                    placeholder="seu-estabelecimento"
                                    className="flex-1 bg-transparent text-main px-3 py-2 text-sm outline-none"
                                 />
                                 <span className="px-2 py-2 text-muted text-xs">/agendamento</span>
                              </div>
                              <Button
                                 size="sm"
                                 onClick={handleSaveSlug}
                                 disabled={savingSlug || !publicSlug || publicSlug === originalSlug || slugAvailable === false}
                                 isLoading={savingSlug}
                              >
                                 Salvar
                              </Button>
                           </div>
                           {publicSlug && publicSlug !== originalSlug && (
                              <div className="mt-2">
                                 {slugChecking ? (
                                    <p className="text-xs text-muted flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Verificando...</p>
                                 ) : slugAvailable === true ? (
                                    <p className="text-xs text-emerald-500 flex items-center gap-1"><CheckCircle size={12} /> URL disponível!</p>
                                 ) : slugAvailable === false ? (
                                    <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> URL já em uso</p>
                                 ) : null}
                              </div>
                           )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <Input label="Instagram" placeholder="@seu.negocio" icon={<Instagram size={16} />} />
                           <Input label="Facebook" placeholder="/pagina.facebook" icon={<Facebook size={16} />} />
                        </div>
                     </div>
                  </Card>
               </div>
            )}

            {/* TAB: SCHEDULE */}
            {activeTab === 'schedule' && (
               <div className="space-y-6 animate-fade-in">
                  {/* Interval Card */}
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
                              <div className="flex items-center gap-2">
                                 {savingBuffer && <Loader2 size={14} className="animate-spin text-barber-gold" />}
                                 <span className="text-2xl font-bold text-barber-gold">{globalBuffer} min</span>
                              </div>
                           </div>
                           <div className="relative mb-6">
                              <input
                                 type="range"
                                 min="5"
                                 max="60"
                                 step="5"
                                 value={globalBuffer}
                                 onChange={(e) => handleBufferChange(Number(e.target.value))}
                                 className="w-full h-2 bg-barber-800 rounded-lg appearance-none cursor-pointer accent-barber-gold"
                                 style={{ margin: 0 }}
                              />
                              {/* Labels com posição absoluta calculada: (valor-5)/(60-5)*100% */}
                              <div className="relative w-full h-5 mt-2 text-[10px] text-muted font-bold uppercase tracking-wider">
                                 <span className="absolute" style={{ left: '0%' }}>5</span>
                                 <span className="absolute hidden sm:block" style={{ left: '18.18%', transform: 'translateX(-50%)' }}>15</span>
                                 <span className="absolute" style={{ left: '45.45%', transform: 'translateX(-50%)' }}>30</span>
                                 <span className="absolute hidden sm:block" style={{ left: '72.72%', transform: 'translateX(-50%)' }}>45</span>
                                 <span className="absolute" style={{ right: '0%' }}>60 min</span>
                              </div>
                           </div>
                           <p className="text-center text-xs text-muted">Este intervalo define os slots de horário do calendário</p>
                        </div>
                     </div>
                  </Card>

                  {/* Business Hours */}
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
                        {dayNames.map(({ key, label }) => {
                           const dayConfig = businessHours[key];
                           return (
                              <div key={key} className={`flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl border transition-all ${!dayConfig.closed ? 'bg-barber-900 border-barber-800' : 'bg-barber-950/50 border-barber-800/50 opacity-60 grayscale'}`}>
                                 <div className="flex items-center justify-between w-full md:w-40 shrink-0">
                                    <span className={`font-bold text-sm ${!dayConfig.closed ? 'text-main' : 'text-muted'}`}>{label}</span>
                                    <Switch
                                       checked={!dayConfig.closed}
                                       onCheckedChange={() => setBusinessHours({ ...businessHours, [key]: { ...dayConfig, closed: !dayConfig.closed } })}
                                    />
                                 </div>
                                 <div className="flex-1 w-full flex flex-col sm:flex-row gap-4 items-center">
                                    {!dayConfig.closed ? (
                                       <>
                                          <div className="flex items-center gap-2 bg-barber-950 p-1.5 rounded-lg border border-barber-800 w-full sm:w-auto flex-1">
                                             <span className="text-[9px] font-bold text-muted uppercase w-10 text-right shrink-0">ABRE</span>
                                             <input
                                                type="time"
                                                value={dayConfig.open}
                                                onChange={(e) => setBusinessHours({ ...businessHours, [key]: { ...dayConfig, open: e.target.value } })}
                                                className="bg-transparent text-main font-bold text-sm outline-none flex-1 text-center min-w-[80px]"
                                             />
                                          </div>
                                          <span className="text-muted hidden sm:block">➜</span>
                                          <div className="flex items-center gap-2 bg-barber-950 p-1.5 rounded-lg border border-barber-800 w-full sm:w-auto flex-1">
                                             <span className="text-[9px] font-bold text-muted uppercase w-10 text-right shrink-0">FECHA</span>
                                             <input
                                                type="time"
                                                value={dayConfig.close}
                                                onChange={(e) => setBusinessHours({ ...businessHours, [key]: { ...dayConfig, close: e.target.value } })}
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

            {/* TAB: MODULES */}
            {activeTab === 'modules' && (
               <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {[
                        { id: 'finance', label: 'Gestão Financeira', desc: 'Controle de caixa, comissões e despesas.', icon: DollarSign, colorVar: '--dark-icon-emerald-text', bgVar: '--dark-icon-emerald-bg', borderVar: '--dark-module-border-emerald' },
                        { id: 'publicBooking', label: 'Agendamento Online', desc: 'Link público para clientes marcarem horários.', icon: Globe, colorVar: '--dark-status-pending', bgVar: '--dark-icon-blue-bg', borderVar: '--dark-module-border-blue' },
                        { id: 'whatsappAi', label: 'IA Humanizada no WhatsApp', desc: 'Agendamento automático com atendimento natural.', icon: MessageSquare, colorVar: '--dark-icon-emerald-text', bgVar: '--dark-icon-emerald-bg', borderVar: '--dark-module-border-emerald' },
                        { id: 'products', label: 'Estoque de Produtos', desc: 'Controle de vendas e inventário.', icon: Layout, colorVar: '--dark-icon-orange-text', bgVar: '--dark-icon-orange-bg', borderVar: '--dark-icon-orange-border' },
                     ].map((mod) => (
                        <div key={mod.id} className="p-6 rounded-xl flex items-start justify-between gap-4 transition-all hover:scale-[1.02]" style={{ background: 'var(--dark-bg-card)', border: `1px solid var(${mod.borderVar})` }}>
                           <div className="flex gap-4 min-w-0 flex-1">
                              <div className="p-3 rounded-xl h-fit shrink-0" style={{ background: `var(${mod.bgVar})`, color: `var(${mod.colorVar})` }}>
                                 <mod.icon size={24} />
                              </div>
                              <div>
                                 <h4 className="font-bold text-lg truncate" style={{ color: 'var(--dark-text-main)' }}>{mod.label}</h4>
                                 <p className="text-sm mt-1 leading-tight" style={{ color: 'var(--dark-text-muted)' }}>{mod.desc}</p>
                              </div>
                           </div>
                           <Switch
                              checked={settings.modules[mod.id as keyof SystemSettings['modules']]}
                              onCheckedChange={() => handleToggleModule(mod.id as keyof SystemSettings['modules'])}
                           />
                        </div>
                     ))}
                  </div>

                  {/* Loyalty Section - Expandível */}
                  <div className="p-6 rounded-xl transition-all hover:scale-[1.02]" style={{ background: 'var(--dark-bg-card)', border: '1px solid var(--dark-module-border-amber)' }}>
                     <div
                        className="flex items-start justify-between gap-4 cursor-pointer"
                        onClick={() => setExpandedSection(expandedSection === 'loyalty' ? null : 'loyalty')}
                     >
                        <div className="flex gap-4 min-w-0 flex-1">
                           <div className="p-3 rounded-xl h-fit shrink-0" style={{ background: 'var(--dark-icon-amber-bg)', color: 'var(--dark-brand-primary)' }}>
                              <Gift size={24} />
                           </div>
                           <div>
                              <h4 className="font-bold text-lg truncate flex items-center gap-2" style={{ color: 'var(--dark-text-main)' }}>
                                 Programa de Fidelidade
                                 {businessSettings?.loyalty_enabled && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--dark-settings-active-badge-bg)', color: 'var(--dark-settings-active-badge-text)' }}>ATIVO</span>
                                 )}
                              </h4>
                              <p className="text-sm mt-1 leading-tight" style={{ color: 'var(--dark-text-muted)' }}>Cartão de fidelidade digital com recompensas.</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <div onClick={(e) => e.stopPropagation()}>
                              <Switch
                                 checked={businessSettings?.loyalty_enabled ?? false}
                                 onCheckedChange={() => handleUpdateBusinessSetting('loyalty_enabled', !businessSettings?.loyalty_enabled)}
                              />
                           </div>
                           {expandedSection === 'loyalty' ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
                        </div>
                     </div>
                     {expandedSection === 'loyalty' && (
                        <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid var(--dark-border-default)' }}>
                           <div className="p-3 rounded-lg" style={{ background: 'var(--dark-info-box-bg)', border: '1px solid var(--dark-info-box-border)' }}>
                              <p className="text-xs flex items-center gap-2" style={{ color: 'var(--dark-info-box-text)' }}>
                                 <Info size={14} />
                                 <span>O cartão de fidelidade aparece no perfil do cliente. A cada serviço completado, ele ganha um carimbo.</span>
                              </p>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <label className="text-xs text-muted block mb-2">Cortes para prêmio</label>
                                 <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={businessSettings?.loyalty_visits_for_reward ?? 10}
                                    onChange={(e) => handleUpdateBusinessSetting('loyalty_visits_for_reward', Number(e.target.value))}
                                    className="w-20 bg-barber-950 border border-barber-800 text-main rounded px-3 py-2 text-center outline-none focus:border-barber-gold"
                                 />
                              </div>
                              <div>
                                 <label className="text-xs text-muted block mb-2">Prêmio ao completar</label>
                                 <input
                                    type="text"
                                    value={businessSettings?.loyalty_reward_description ?? 'Corte grátis'}
                                    onChange={(e) => handleUpdateBusinessSetting('loyalty_reward_description', e.target.value)}
                                    placeholder="Ex: Corte grátis"
                                    className="w-full bg-barber-950 border border-barber-800 text-main rounded px-3 py-2 text-sm outline-none focus:border-barber-gold"
                                 />
                              </div>
                           </div>
                           {/* Preview */}
                           <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--dark-bg-app)', border: '1px solid var(--dark-border-default)' }}>
                              <p className="text-xs mb-3 font-bold uppercase" style={{ color: 'var(--dark-text-muted)' }}>Prévia do Cartão</p>
                              <div className="flex items-center gap-2 flex-wrap">
                                 {Array.from({ length: businessSettings?.loyalty_visits_for_reward ?? 10 }).map((_, i) => (
                                    <div
                                       key={i}
                                       className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                                       style={i < 7
                                          ? { background: 'var(--dark-loyalty-stamp-filled-bg)', color: 'var(--dark-loyalty-stamp-filled-text)' }
                                          : { background: 'var(--dark-loyalty-stamp-empty-bg)', color: 'var(--dark-loyalty-stamp-empty-text)', border: '1px solid var(--dark-loyalty-stamp-empty-border)' }
                                       }
                                    >
                                       {i < 7 ? '✓' : i + 1}
                                    </div>
                                 ))}
                              </div>
                              <p className="text-xs mt-3" style={{ color: 'var(--dark-text-muted)' }}>
                                 Após {businessSettings?.loyalty_visits_for_reward ?? 10} visitas, cliente ganha: <span style={{ color: 'var(--dark-brand-primary)' }} className="font-bold">{businessSettings?.loyalty_reward_description ?? 'Corte grátis'}</span>
                              </p>
                           </div>
                        </div>
                     )}
                  </div>

               </div>
            )}

            {/* TAB: WHATSAPP & IA */}
            {activeTab === 'whatsapp' && (
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-fade-in">
                  {/* Conexão WhatsApp */}
                  <Card noPadding className="overflow-hidden bg-gradient-to-br from-emerald-950/50 to-barber-900" style={{ border: '1px solid var(--dark-module-border-emerald)' }}>
                     <div className="p-6 border-b border-barber-800 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className="p-2 rounded-lg" style={{ background: 'var(--dark-icon-emerald-bg)' }}>
                              <Phone size={18} style={{ color: 'var(--dark-icon-emerald-text)' }} />
                           </div>
                           <div>
                              <h3 className="text-main font-bold text-lg">Conexão WhatsApp</h3>
                              <p className="text-xs text-muted">Integração via WhatsApp para agendamento automático.</p>
                           </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${whatsappConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                           {whatsappConnected ? 'Conectado' : 'Desconectado'}
                        </span>
                     </div>
                     <div className="p-6 flex flex-col items-center justify-center min-h-[280px]">
                        {/* State 1: Connected - Show action buttons */}
                        {whatsappConnected ? (
                           <div className="text-center">
                              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                 <CheckCircle size={32} className="text-emerald-400" />
                              </div>
                              <p className="text-main font-bold mb-2">Conectado & Atendendo</p>
                              <p className="text-sm text-muted mb-6">Clientes sendo atendidos com a nossa inteligência artificial humanizada.</p>

                              {/* Action Buttons */}
                              <div className="flex items-center justify-center gap-3">
                                 {/* REINICIAR Button */}
                                 <button
                                    onClick={() => handleWhatsAppEvent('restart')}
                                    disabled={whatsappEventLoading === 'restart'}
                                    className="px-5 py-2.5 rounded-lg bg-barber-800 border border-barber-700 hover:bg-barber-700 text-white text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50 flex items-center gap-2"
                                 >
                                    {whatsappEventLoading === 'restart' && <Loader2 size={14} className="animate-spin" />}
                                    REINICIAR
                                 </button>

                                 {/* DESCONECTAR Button */}
                                 <button
                                    onClick={() => handleWhatsAppEvent('disconnect')}
                                    disabled={whatsappEventLoading === 'disconnect'}
                                    className="px-5 py-2.5 rounded-lg bg-red-950/80 border border-red-900/50 hover:bg-red-900/60 text-red-400 text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50 flex items-center gap-2"
                                 >
                                    {whatsappEventLoading === 'disconnect' && <Loader2 size={14} className="animate-spin" />}
                                    DESCONECTAR
                                 </button>

                                 {/* DELETAR Button */}
                                 <button
                                    onClick={() => handleWhatsAppEvent('delete')}
                                    disabled={whatsappEventLoading === 'delete'}
                                    className="px-5 py-2.5 rounded-lg bg-red-950/80 border border-red-900/50 hover:bg-red-900/60 text-red-400 text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-50 flex items-center gap-2"
                                 >
                                    {whatsappEventLoading === 'delete' && <Loader2 size={14} className="animate-spin" />}
                                    DELETAR
                                 </button>
                              </div>
                           </div>
                        ) : instanceExists ? (
                           /* State 2: Disconnected but instance exists - Show reconnect button */
                           <>
                              <div className="w-48 h-48 rounded-xl flex items-center justify-center mb-6 overflow-hidden" style={{ background: 'var(--dark-bg-elevated-50)', border: '1px solid var(--dark-border-default)' }}>
                                 {qrCodeBase64 ? (
                                    <img
                                       src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                                       alt="QR Code WhatsApp"
                                       className="w-full h-full object-contain p-2"
                                    />
                                 ) : (
                                    <div className="text-center">
                                       <Unplug size={48} className="text-amber-400 mx-auto mb-2" />
                                       <p className="text-xs text-amber-400 font-bold">Desconectado</p>
                                    </div>
                                 )}
                              </div>
                              <p className="text-sm text-muted text-center mb-2">
                                 {qrCodeBase64
                                    ? 'Escaneie o QR Code acima com seu WhatsApp.'
                                    : 'Instância desconectada. Reconecte para gerar um novo QR Code.'}
                              </p>
                              {checkingStatus && qrCodeBase64 && (
                                 <div className="flex items-center justify-center gap-2 mb-4 text-xs text-amber-400">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Aguardando conexão...</span>
                                 </div>
                              )}
                              <div className="flex gap-3">
                                 <Button
                                    onClick={() => handleWhatsAppEvent('reconnect')}
                                    isLoading={whatsappEventLoading === 'reconnect'}
                                    leftIcon={<RefreshCw size={16} />}
                                    variant="success"
                                 >
                                    Reconectar
                                 </Button>
                                 <Button
                                    onClick={() => handleWhatsAppEvent('delete')}
                                    isLoading={whatsappEventLoading === 'delete'}
                                    variant="danger"
                                 >
                                    Deletar Instância
                                 </Button>
                              </div>
                           </>
                        ) : (
                           /* State 3: No instance - Show connect button */
                           <>
                              <div className="w-48 h-48 rounded-xl flex items-center justify-center mb-6 overflow-hidden" style={{ background: 'var(--dark-bg-elevated-50)', border: '1px solid var(--dark-border-default)' }}>
                                 {qrCodeBase64 ? (
                                    <img
                                       src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                                       alt="QR Code WhatsApp"
                                       className="w-full h-full object-contain p-2"
                                    />
                                 ) : (
                                    <QrCode size={64} style={{ color: 'var(--dark-text-muted)' }} />
                                 )}
                              </div>
                              <p className="text-sm text-muted text-center mb-2">
                                 {qrCodeBase64
                                    ? 'Escaneie o QR Code acima com seu WhatsApp.'
                                    : 'Conecte o WhatsApp do seu estabelecimento para ativar a IA de agendamento.'}
                              </p>
                              {checkingStatus && qrCodeBase64 && (
                                 <div className="flex items-center justify-center gap-2 mb-4 text-xs text-amber-400">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Aguardando conexão...</span>
                                 </div>
                              )}
                              <Button
                                 onClick={() => handleWhatsAppEvent('connect')}
                                 isLoading={whatsappEventLoading === 'connect'}
                                 leftIcon={<Unplug size={16} />}
                                 variant="success"
                              >
                                 Conectar WhatsApp
                              </Button>
                           </>
                        )}
                     </div>
                  </Card>

                  {/* Cérebro da IA */}
                  <Card noPadding className="overflow-hidden" style={{ border: '1px solid var(--dark-border-default)' }}>
                     <div className="p-6 border-b border-barber-800 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                           <div className="p-2 rounded-lg" style={{ background: 'var(--dark-icon-purple-bg)' }}>
                              <Cpu size={18} style={{ color: 'var(--dark-ai-icon)' }} />
                           </div>
                           <h3 className="text-main font-bold text-lg">Cérebro da IA</h3>
                        </div>
                        <Switch
                           checked={aiEnabled}
                           onCheckedChange={setAiEnabled}
                        />
                     </div>
                     <div className={`p-6 space-y-5 transition-opacity ${!aiEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* Nome do Assistente */}
                        <div>
                           <label className="text-xs font-bold text-muted uppercase block mb-2">Nome do Assistente</label>
                           <input
                              type="text"
                              value={aiAssistantName}
                              onChange={(e) => setAiAssistantName(e.target.value)}
                              placeholder="Ex: Assistente NS Studio"
                              className="w-full bg-barber-950 border border-barber-800 text-main rounded-lg px-4 py-3 text-sm outline-none focus:border-barber-gold transition-colors"
                           />
                        </div>

                        {/* Tom de Voz */}
                        <div>
                           <label className="text-xs font-bold text-muted uppercase block mb-2">Tom de Voz</label>
                           <div className="grid grid-cols-3 gap-2">
                              {[
                                 { id: 'formal', label: 'Formal' },
                                 { id: 'descontraido', label: 'Descontraído' },
                                 { id: 'vendedor', label: 'Vendedor' }
                              ].map((tone) => (
                                 <button
                                    key={tone.id}
                                    onClick={() => setAiTone(tone.id as typeof aiTone)}
                                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${aiTone === tone.id
                                       ? 'bg-barber-gold text-barber-950 shadow-lg'
                                       : 'bg-barber-900 text-muted border border-barber-800 hover:border-barber-700'
                                       }`}
                                 >
                                    {tone.label}
                                 </button>
                              ))}
                           </div>
                        </div>

                        {/* Permitir Cancelamentos + Delay de Resposta */}
                        <div className="rounded-lg overflow-hidden" style={{ background: 'var(--dark-bg-app)', border: '1px solid var(--dark-border-default)' }}>
                           <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--dark-border-default)' }}>
                              <div>
                                 <h4 className="text-sm font-bold text-main">Permitir Cancelamentos</h4>
                                 <p className="text-xs text-muted mt-0.5">IA pode cancelar horários se o cliente pedir?</p>
                              </div>
                              <Switch
                                 checked={aiAllowCancellations}
                                 onCheckedChange={setAiAllowCancellations}
                              />
                           </div>
                           <div className="flex items-center justify-between p-4">
                              <div>
                                 <h4 className="text-sm font-bold text-main">Delay de Resposta</h4>
                                 <p className="text-xs text-muted mt-0.5">Tempo simulado de digitação (segundos)</p>
                              </div>
                              <input
                                 type="number"
                                 min="1"
                                 max="30"
                                 value={aiResponseDelay}
                                 onChange={(e) => setAiResponseDelay(Number(e.target.value))}
                                 className="w-16 bg-barber-900 border border-barber-800 text-main rounded-lg px-3 py-2 text-center text-sm outline-none focus:border-barber-gold"
                              />
                           </div>
                        </div>

                        {/* Recursos Inteligentes */}
                        <div className="border-t border-barber-800 pt-5">
                           <div className="flex items-center gap-2 mb-4">
                              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
                                 <Zap size={14} className="text-purple-400" />
                              </div>
                              <h4 className="text-xs font-bold text-muted uppercase">Recursos Inteligentes</h4>
                           </div>

                           <div className="flex items-center justify-between p-4 rounded-lg mb-2" style={{ background: 'var(--dark-bg-app)', border: '1px solid var(--dark-border-default)' }}>
                              <div>
                                 <h4 className="text-sm font-bold text-main">Entende Áudio</h4>
                                 <p className="text-xs text-muted mt-0.5">Transcreve e responde áudios</p>
                              </div>
                              <Switch checked={aiUnderstandsAudio} onCheckedChange={setAiUnderstandsAudio} />
                           </div>

                           <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--dark-bg-app)', border: '1px solid var(--dark-border-default)' }}>
                              <div>
                                 <h4 className="text-sm font-bold text-main">Status Sempre Online</h4>
                                 <p className="text-xs text-muted mt-0.5">Mantém o "Online" visível</p>
                              </div>
                              <Switch checked={aiAlwaysOnline} onCheckedChange={setAiAlwaysOnline} />
                           </div>
                        </div>

                        {/* Comportamento */}
                        <div className="border-t border-barber-800 pt-5">
                           <div className="flex items-center gap-2 mb-4">
                              <div className="p-1.5 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                                 <MessageSquare size={14} className="text-blue-400" />
                              </div>
                              <h4 className="text-xs font-bold text-muted uppercase">Comportamento</h4>
                           </div>

                           <div className="flex items-center justify-between p-4 rounded-lg mb-2" style={{ background: 'var(--dark-bg-app)', border: '1px solid var(--dark-border-default)' }}>
                              <div>
                                 <h4 className="text-sm font-bold text-main">Incluir Nome na Resposta</h4>
                                 <p className="text-xs text-muted mt-0.5">"Olá, [Nome]..."</p>
                              </div>
                              <Switch checked={aiIncludeName} onCheckedChange={setAiIncludeName} />
                           </div>

                           <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'var(--dark-bg-app)', border: '1px solid var(--dark-border-default)' }}>
                              <div>
                                 <h4 className="text-sm font-bold text-main">Ler Automaticamente</h4>
                                 <p className="text-xs text-muted mt-0.5">Marca mensagens como lidas (azul)</p>
                              </div>
                              <Switch checked={aiAutoReadMessages} onCheckedChange={setAiAutoReadMessages} />
                           </div>
                        </div>

                        {/* Info Box */}
                        <div className="p-3 rounded-lg flex items-center gap-2" style={{ background: 'var(--dark-info-box-bg)', border: '1px solid var(--dark-info-box-border)' }}>
                           <RefreshCw size={14} style={{ color: 'var(--dark-info-box-text)' }} />
                           <p className="text-xs" style={{ color: 'var(--dark-info-box-text)' }}>
                              As alterações são enviadas instantaneamente para o n8n.
                           </p>
                        </div>
                     </div>
                  </Card>
               </div>
            )}

            {/* TAB: AI */}
            {activeTab === 'ai' && (
               <div className="animate-fade-in relative">
                  <div className="absolute inset-0 z-10 rounded-xl flex flex-col items-center justify-center min-h-[400px]" style={{ background: 'var(--dark-locked-overlay)', backdropFilter: 'var(--dark-locked-filter-blur)', border: '1px solid var(--dark-border-subtle)' }}>
                     <Lock size={48} style={{ color: 'var(--dark-text-faint)' }} className="mb-4" />
                     <span className="font-bold text-xl" style={{ color: 'var(--dark-text-main)' }}>Módulo em Desenvolvimento</span>
                     <p className="text-sm mt-2 text-center px-4" style={{ color: 'var(--dark-text-subtle)' }}>A configuração avançada da IA estará disponível em breve.</p>
                     <Button variant="outline" className="mt-6">Notificar Disponibilidade</Button>
                  </div>
                  <div className="opacity-40 pointer-events-none filter blur-sm min-h-[400px] rounded-xl p-6" style={{ background: 'var(--dark-bg-card)' }}>
                     <h3 className="font-bold text-lg mb-4" style={{ color: 'var(--dark-text-main)' }}>Configurações da IA</h3>
                     <p style={{ color: 'var(--dark-text-muted)' }}>Aqui você poderá configurar o assistente virtual para ajudar na gestão do seu negócio.</p>
                  </div>
               </div>
            )}
         </div>
      </div >
   );
};

export default Settings;
