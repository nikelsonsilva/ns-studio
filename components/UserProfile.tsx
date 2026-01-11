
import React, { useState, useRef, useEffect } from 'react';
import { User, Mail, Phone, Lock, Camera, Check, ShieldCheck, LogOut, Key, Sparkles, CreditCard, History, FileText, AlertTriangle, Crown, Download, ChevronLeft, Smartphone, Globe, Activity, CheckCircle2, Loader2 } from 'lucide-react';
import { UserProfile as UserProfileType } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { useToast } from './ui/Toast';
import { supabase } from '../lib/supabase';
import { getCurrentBusinessId } from '../lib/database';

interface UserProfileProps {
    user: UserProfileType;
    businessName: string;
    onSave: (updatedUser: UserProfileType) => void;
    onClose: () => void;
    onLogout: () => void;
}

interface ActivityLog {
    id: string;
    action: string;
    log_type: string;
    device: string | null;
    ip_address: string | null;
    created_at: string;
}

interface Invoice {
    id: string;
    invoice_date: string;
    amount: number;
    status: string;
    description: string | null;
    invoice_url: string | null;
}

interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    features: string[];
    is_recommended: boolean;
}

interface BusinessSubscription {
    subscription_plan_id: string | null;
    subscription_status: string;
    trial_ends_at: string | null;
    next_billing_date: string | null;
    payment_method_brand: string | null;
    payment_method_last4: string | null;
    payment_method_exp_month: number | null;
    payment_method_exp_year: number | null;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, businessName, onSave, onClose, onLogout }) => {
    const [formData, setFormData] = useState<UserProfileType>(user);
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'billing'>('profile');

    // Estado para controlar sub-telas (Logs e Planos)
    const [subView, setSubView] = useState<'main' | 'logs' | 'plans'>('main');

    const [isLoading, setIsLoading] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    // Database state
    const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [subscription, setSubscription] = useState<BusinessSubscription | null>(null);

    // Format phone in real-time as user types
    const formatPhoneRealtime = (value: string): string => {
        const digits = value.replace(/\D/g, '');
        if (digits.length <= 2) return digits;
        if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    };

    // Load data from database
    useEffect(() => {
        loadProfileData();
    }, []);

    const loadProfileData = async () => {
        setIsDataLoading(true);
        try {
            const businessId = await getCurrentBusinessId();
            if (!businessId) {
                console.error('No business ID found');
                setIsDataLoading(false);
                return;
            }

            // Run all database calls in parallel for faster loading
            const [
                plansResult,
                businessResult,
                logsResult,
                invoicesResult,
                authResult
            ] = await Promise.all([
                // Load subscription plans
                supabase
                    .from('subscription_plans')
                    .select('*')
                    .order('sort_order'),
                // Load business subscription info
                supabase
                    .from('businesses')
                    .select('subscription_plan_id, subscription_status, trial_ends_at, next_billing_date, payment_method_brand, payment_method_last4, payment_method_exp_month, payment_method_exp_year')
                    .eq('id', businessId)
                    .single(),
                // Load activity logs (last 30 days)
                supabase
                    .from('admin_activity_logs')
                    .select('*')
                    .eq('business_id', businessId)
                    .order('created_at', { ascending: false })
                    .limit(50),
                // Load invoices
                supabase
                    .from('subscription_invoices')
                    .select('*')
                    .eq('business_id', businessId)
                    .order('invoice_date', { ascending: false })
                    .limit(20),
                // Load user profile from auth
                supabase.auth.getUser()
            ]);

            // Process results
            if (plansResult.data) {
                setPlans(plansResult.data.map(p => ({
                    ...p,
                    features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || '[]')
                })));
            }

            if (businessResult.data) {
                setSubscription(businessResult.data);
            }

            if (logsResult.data) {
                setActivityLogs(logsResult.data);
            }

            if (invoicesResult.data) {
                setInvoices(invoicesResult.data);
            }

            if (authResult.data?.user) {
                const authUser = authResult.data.user;
                setFormData({
                    ...formData,
                    name: authUser.user_metadata?.full_name || formData.name,
                    email: authUser.email || formData.email,
                    phone: authUser.user_metadata?.phone || formData.phone,
                    avatar: authUser.user_metadata?.avatar_url || formData.avatar,
                });
            }

        } catch (error) {
            console.error('Error loading profile data:', error);
        }
        setIsDataLoading(false);
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            // Update user metadata in Supabase Auth
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: formData.name,
                    phone: formData.phone,
                    avatar_url: formData.avatar,
                }
            });

            if (error) throw error;

            // Log the activity
            const businessId = await getCurrentBusinessId();
            if (businessId) {
                await supabase.from('admin_activity_logs').insert({
                    business_id: businessId,
                    action: 'Perfil Atualizado',
                    log_type: 'profile',
                    device: navigator.userAgent,
                });
            }

            onSave(formData);
            toast.success('Perfil atualizado com sucesso!');
            onClose();
        } catch (error: any) {
            console.error('Error saving profile:', error);
            toast.error(error.message || 'Erro ao salvar perfil');
        }
        setIsLoading(false);
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const businessId = await getCurrentBusinessId();
                if (!businessId) return;

                // Upload to Supabase Storage
                const fileExt = file.name.split('.').pop();
                const fileName = `${businessId}/avatar.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, file, { upsert: true });

                if (uploadError) {
                    // If storage doesn't exist, use local URL
                    const url = URL.createObjectURL(file);
                    setFormData({ ...formData, avatar: url });
                    return;
                }

                const { data: urlData } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(fileName);

                setFormData({ ...formData, avatar: urlData.publicUrl });
            } catch (error) {
                // Fallback to local URL
                const url = URL.createObjectURL(file);
                setFormData({ ...formData, avatar: url });
            }
        }
    };

    const handleChangePlan = async (planId: string) => {
        try {
            const businessId = await getCurrentBusinessId();
            if (!businessId) return;

            // Update business subscription
            const { error } = await supabase
                .from('businesses')
                .update({
                    subscription_plan_id: planId,
                    subscription_status: 'active',
                })
                .eq('id', businessId);

            if (error) throw error;

            // Log the activity
            await supabase.from('admin_activity_logs').insert({
                business_id: businessId,
                action: `Plano alterado para ${plans.find(p => p.id === planId)?.name}`,
                log_type: 'billing',
            });

            setSubscription(prev => prev ? { ...prev, subscription_plan_id: planId, subscription_status: 'active' } : null);
            toast.success(`Plano alterado com sucesso!`);
            setSubView('main');
        } catch (error: any) {
            toast.error(error.message || 'Erro ao alterar plano');
        }
    };

    const handleChangePassword = async () => {
        if (passwordData.new !== passwordData.confirm) {
            toast.error('As senhas não coincidem');
            return;
        }

        if (passwordData.new.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.new
            });

            if (error) throw error;

            // Log the activity
            const businessId = await getCurrentBusinessId();
            if (businessId) {
                await supabase.from('admin_activity_logs').insert({
                    business_id: businessId,
                    action: 'Senha Alterada',
                    log_type: 'security',
                    device: navigator.userAgent,
                });
            }

            toast.success('Senha alterada com sucesso!');
            setPasswordData({ current: '', new: '', confirm: '' });
        } catch (error: any) {
            toast.error(error.message || 'Erro ao alterar senha');
        }
        setIsLoading(false);
    };

    // Helper functions
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        if (diffDays === 1) return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const formatInvoiceDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
    };

    const currentPlan = plans.find(p => p.id === subscription?.subscription_plan_id) || plans.find(p => p.id === 'pro');

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
                <div className="divide-y divide-zinc-800 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {activityLogs.length === 0 ? (
                        <div className="p-8 text-center text-muted">
                            <Activity size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhuma atividade registrada ainda</p>
                        </div>
                    ) : (
                        activityLogs.map(log => (
                            <div key={log.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${log.log_type === 'login' ? 'bg-blue-500/10 text-blue-500' :
                                        log.log_type === 'security' ? 'bg-green-500/10 text-green-500' :
                                            log.log_type === 'alert' ? 'bg-red-500/10 text-red-500' :
                                                'bg-amber-500/10 text-amber-500'
                                        }`}>
                                        {log.log_type === 'login' ? <Globe size={16} /> :
                                            log.log_type === 'security' ? <Key size={16} /> :
                                                log.log_type === 'alert' ? <AlertTriangle size={16} /> :
                                                    <Activity size={16} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{log.action}</p>
                                        <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
                                            {log.device && (
                                                <>
                                                    <Smartphone size={10} /> {log.device.substring(0, 30)}...
                                                </>
                                            )}
                                            {log.ip_address && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                                    <span>IP: {log.ip_address}</span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-zinc-500 font-mono">{formatDate(log.created_at)}</span>
                            </div>
                        ))
                    )}
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
                {plans.map(plan => {
                    const isCurrent = plan.id === subscription?.subscription_plan_id;
                    return (
                        <div key={plan.id} className={`relative p-4 rounded-xl border flex flex-col ${isCurrent ? 'bg-zinc-900 border-barber-gold shadow-lg shadow-amber-500/10' : 'bg-zinc-950 border-zinc-800'}`}>
                            {plan.is_recommended && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-barber-gold text-black text-[10px] font-bold px-3 py-0.5 rounded-full">
                                    MAIS POPULAR
                                </div>
                            )}

                            <h4 className="text-lg font-bold text-white mb-2">{plan.name}</h4>
                            <div className="text-2xl font-bold text-white mb-4">
                                {plan.price === 0 ? 'Grátis' : formatCurrency(plan.price)}
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
                                variant={isCurrent ? 'outline' : 'primary'}
                                size="sm"
                                disabled={isCurrent}
                                onClick={() => handleChangePlan(plan.id)}
                            >
                                {isCurrent ? 'Plano Atual' : 'Selecionar'}
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    if (isDataLoading) {
        return (
            <Modal isOpen={true} onClose={onClose} title="Meu Perfil" size="lg">
                <div className="animate-fade-in pb-4">
                    {/* Header Profile Skeleton */}
                    <div className="relative mb-8">
                        {/* Banner Background Skeleton */}
                        <div className="h-32 rounded-xl bg-zinc-800 animate-pulse relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 to-zinc-900"></div>
                        </div>

                        {/* Avatar & Info Overlay Skeleton */}
                        <div className="absolute -bottom-10 left-6 flex items-end gap-4">
                            <div className="w-24 h-24 rounded-full bg-zinc-800 border-4 border-zinc-900 animate-pulse"></div>
                            <div className="mb-2 space-y-2">
                                <div className="h-6 bg-zinc-700 rounded w-40 animate-pulse"></div>
                                <div className="flex items-center gap-2">
                                    <div className="h-5 bg-amber-500/20 rounded w-16 animate-pulse"></div>
                                    <div className="h-4 bg-zinc-700 rounded w-36 animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Spacing for Avatar Overlap */}
                    <div className="mt-12"></div>

                    {/* Navigation Tabs Skeleton */}
                    <div className="flex bg-zinc-950 p-1 rounded-xl mb-6 border border-zinc-800">
                        <div className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-800 animate-pulse">
                            <div className="h-4 bg-zinc-600 rounded w-24"></div>
                        </div>
                        <div className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg animate-pulse">
                            <div className="h-4 bg-zinc-700 rounded w-32"></div>
                        </div>
                        <div className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg animate-pulse">
                            <div className="h-4 bg-zinc-700 rounded w-20"></div>
                        </div>
                    </div>

                    {/* Form Fields Skeleton */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Name Field Skeleton */}
                            <div className="space-y-1">
                                <div className="h-3 bg-zinc-700 rounded w-24 ml-1 animate-pulse"></div>
                                <div className="h-12 bg-zinc-800 border border-zinc-700 rounded-xl animate-pulse"></div>
                            </div>
                            {/* Email Field Skeleton */}
                            <div className="space-y-1">
                                <div className="h-3 bg-zinc-700 rounded w-16 ml-1 animate-pulse"></div>
                                <div className="h-12 bg-zinc-800 border border-zinc-700 rounded-xl animate-pulse"></div>
                            </div>
                            {/* Phone Field Skeleton */}
                            <div className="space-y-1">
                                <div className="h-3 bg-zinc-700 rounded w-20 ml-1 animate-pulse"></div>
                                <div className="h-12 bg-zinc-800 border border-zinc-700 rounded-xl animate-pulse"></div>
                            </div>
                            {/* Tip Card Skeleton */}
                            <div className="h-20 bg-blue-500/10 border border-blue-500/20 rounded-xl animate-pulse"></div>
                        </div>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title="Meu Perfil"
            size={subView === 'plans' ? 'xl' : 'lg'}
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
                ) : null
            }
        >
            <div className="animate-fade-in pb-4">

                {/* Header Profile Section */}
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

                {/* Navigation Tabs */}
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
                            {/* Custom Input for Name */}
                            <div className="space-y-1">
                                <label className="block text-xs font-bold text-muted uppercase mb-1 ml-1 tracking-wide">
                                    Nome Completo
                                </label>
                                <div className="relative group flex items-center bg-input-bg border border-barber-800 rounded-xl overflow-hidden focus-within:border-barber-gold transition-colors">
                                    <div className="pl-3 text-muted pointer-events-none">
                                        <User size={16} />
                                    </div>
                                    <span className="pl-3 text-muted text-sm whitespace-nowrap border-r border-barber-800 pr-3">
                                        {businessName}
                                    </span>
                                    <input
                                        className="w-full bg-transparent text-main py-3 px-3 text-sm outline-none placeholder:text-muted/50"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Seu Nome"
                                    />
                                </div>
                            </div>

                            <Input
                                label="E-mail"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                icon={<Mail size={16} />}
                                disabled
                            />
                            <Input
                                label="Telefone"
                                type="tel"
                                value={formData.phone || ''}
                                onChange={(e) => setFormData({ ...formData, phone: formatPhoneRealtime(e.target.value) })}
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
                                        <Badge variant="vip" size="sm">{currentPlan?.name || 'Professional'}</Badge>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${subscription?.subscription_status === 'active' ? 'text-green-500 bg-green-500/10 border-green-500/20' :
                                            subscription?.subscription_status === 'trial' ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' :
                                                subscription?.subscription_status === 'past_due' ? 'text-red-500 bg-red-500/10 border-red-500/20' :
                                                    'text-zinc-500 bg-zinc-500/10 border-zinc-500/20'
                                            }`}>
                                            {subscription?.subscription_status === 'active' ? 'Ativo' :
                                                subscription?.subscription_status === 'trial' ? 'Trial' :
                                                    subscription?.subscription_status === 'past_due' ? 'Pagamento Pendente' :
                                                        subscription?.subscription_status === 'canceled' ? 'Cancelado' : 'Ativo'}
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-1">
                                        {formatCurrency(currentPlan?.price || 97)} <span className="text-sm font-normal text-muted">/ mês</span>
                                    </h3>
                                    {subscription?.next_billing_date && (
                                        <p className="text-xs text-muted">
                                            Próxima renovação em: <span className="text-white font-bold">{formatInvoiceDate(subscription.next_billing_date)}</span>
                                        </p>
                                    )}
                                    {subscription?.trial_ends_at && subscription.subscription_status === 'trial' && (
                                        <p className="text-xs text-blue-400 mt-1">
                                            Trial expira em: <span className="font-bold">{formatInvoiceDate(subscription.trial_ends_at)}</span>
                                        </p>
                                    )}
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
                        {subscription?.payment_method_last4 ? (
                            <Card noPadding className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-8 bg-zinc-800 rounded flex items-center justify-center border border-zinc-700">
                                        <div className="flex -space-x-1">
                                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white capitalize">
                                            {subscription.payment_method_brand} terminando em {subscription.payment_method_last4}
                                        </p>
                                        <p className="text-xs text-muted">
                                            Expira em {subscription.payment_method_exp_month}/{subscription.payment_method_exp_year}
                                        </p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" className="text-xs">Alterar</Button>
                            </Card>
                        ) : (
                            <Card noPadding className="p-4 flex items-center justify-between border-dashed">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-8 bg-zinc-800 rounded flex items-center justify-center border border-zinc-700">
                                        <CreditCard size={16} className="text-muted" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-muted">Nenhum método de pagamento</p>
                                        <p className="text-xs text-muted">Adicione um cartão para continuar após o trial</p>
                                    </div>
                                </div>
                                <Button variant="primary" size="sm" className="text-xs">Adicionar</Button>
                            </Card>
                        )}

                        {/* Billing History */}
                        <div>
                            <h4 className="text-xs font-bold text-muted uppercase mb-3 flex items-center gap-2">
                                <History size={14} /> Histórico de Cobranças
                            </h4>
                            <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                                    {invoices.length === 0 ? (
                                        <div className="p-8 text-center text-muted">
                                            <FileText size={32} className="mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">Nenhuma fatura ainda</p>
                                        </div>
                                    ) : (
                                        invoices.map((invoice) => (
                                            <div key={invoice.id} className="flex justify-between items-center p-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-900/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-zinc-800 rounded text-muted">
                                                        <FileText size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-white">{formatInvoiceDate(invoice.invoice_date)}</p>
                                                        <p className="text-[10px] text-muted">{invoice.description || `#INV-${invoice.id.slice(0, 6)}`}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-bold text-white">{formatCurrency(invoice.amount)}</span>
                                                    <Badge
                                                        variant={invoice.status === 'paid' ? 'success' : invoice.status === 'pending' ? 'warning' : 'danger'}
                                                        size="sm"
                                                        className="text-[9px]"
                                                    >
                                                        {invoice.status === 'paid' ? 'Pago' : invoice.status === 'pending' ? 'Pendente' : 'Falhou'}
                                                    </Badge>
                                                    {invoice.invoice_url && (
                                                        <a href={invoice.invoice_url} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-white">
                                                            <Download size={14} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
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
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    {activityLogs.find(l => l.log_type === 'security')
                                        ? `Última alteração de segurança: ${formatDate(activityLogs.find(l => l.log_type === 'security')!.created_at)}`
                                        : 'Nenhuma alteração de segurança recente'}
                                </p>
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
                                onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                                icon={<Lock size={16} />}
                                placeholder="••••••••"
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Nova Senha"
                                    type="password"
                                    value={passwordData.new}
                                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                                    icon={<Key size={16} />}
                                    placeholder="••••••••"
                                />
                                <Input
                                    label="Confirmar Nova Senha"
                                    type="password"
                                    value={passwordData.confirm}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                                    icon={<Key size={16} />}
                                    placeholder="••••••••"
                                />
                            </div>
                            <Button
                                variant="primary"
                                onClick={handleChangePassword}
                                isLoading={isLoading}
                                disabled={!passwordData.new || !passwordData.confirm}
                                leftIcon={<Key size={16} />}
                            >
                                Alterar Senha
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default UserProfile;
