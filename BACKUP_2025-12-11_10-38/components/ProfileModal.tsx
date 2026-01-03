/**
 * ProfileModal - NS Studio Profile Configuration
 * Modal for user profile settings with tabs for personal data, security, and subscription
 */
import React, { useState, useEffect } from 'react';
import {
    X,
    User,
    Lock,
    LogOut,
    Camera,
    Mail,
    Phone,
    Save,
    Eye,
    EyeOff,
    CheckCircle,
    AlertCircle,
    Loader2,
    CreditCard,
    Crown,
    Zap,
    Check,
    Calendar,
    AlertTriangle,
    RefreshCw,
    Trash2,
    ExternalLink,
    Receipt,
    Sparkles,
} from 'lucide-react';
import { Role, SubscriptionStatus } from '../types';
import { getCurrentUser, updatePassword, signOut } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLogout: () => void;
    userRole: Role;
    businessName: string;
}

type TabType = 'personal' | 'security' | 'subscription';

interface UserProfile {
    id: string;
    email: string;
    fullName: string;
    phone: string;
    avatarUrl?: string;
}

interface SubscriptionPlan {
    id: string;
    name: string;
    price: number;
    interval: 'monthly' | 'yearly';
    features: string[];
    popular?: boolean;
    current?: boolean;
}

interface PaymentMethod {
    id: string;
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    isDefault: boolean;
}

interface BillingRecord {
    id: string;
    date: string;
    description: string;
    amount: number;
    status: 'paid' | 'pending' | 'failed';
    invoiceUrl?: string;
}

// Mock data for subscription plans
const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
    {
        id: 'starter',
        name: 'Starter',
        price: 49.90,
        interval: 'monthly',
        features: [
            'Até 2 profissionais',
            'Agendamentos ilimitados',
            'Relatórios básicos',
            'Suporte por email',
        ],
    },
    {
        id: 'professional',
        name: 'Professional',
        price: 99.90,
        interval: 'monthly',
        features: [
            'Até 5 profissionais',
            'Agendamentos ilimitados',
            'Relatórios avançados',
            'Pagamentos online',
            'Suporte prioritário',
            'Página de agendamento pública',
        ],
        popular: true,
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        price: 199.90,
        interval: 'monthly',
        features: [
            'Profissionais ilimitados',
            'Agendamentos ilimitados',
            'Relatórios completos + BI',
            'Pagamentos online',
            'Suporte 24/7',
            'API personalizada',
            'Multi-unidades',
            'Treinamento dedicado',
        ],
    },
];

// Mock billing history
const MOCK_BILLING_HISTORY: BillingRecord[] = [
    { id: '1', date: '2024-12-01', description: 'Plano Professional - Dezembro', amount: 99.90, status: 'paid' },
    { id: '2', date: '2024-11-01', description: 'Plano Professional - Novembro', amount: 99.90, status: 'paid' },
    { id: '3', date: '2024-10-01', description: 'Plano Professional - Outubro', amount: 99.90, status: 'paid' },
];

const ProfileModal: React.FC<ProfileModalProps> = ({
    isOpen,
    onClose,
    onLogout,
    userRole,
    businessName,
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('personal');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Personal data state
    const [profile, setProfile] = useState<UserProfile>({
        id: '',
        email: '',
        fullName: '',
        phone: '',
        avatarUrl: undefined,
    });
    const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);

    // Security state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Subscription state
    const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('active');
    const [currentPlan, setCurrentPlan] = useState<string>('professional');
    const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
    const [nextBillingDate, setNextBillingDate] = useState<string>('2025-01-01');
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
        { id: '1', brand: 'visa', last4: '4242', expMonth: 12, expYear: 2026, isDefault: true },
    ]);
    const [billingHistory, setBillingHistory] = useState<BillingRecord[]>(MOCK_BILLING_HISTORY);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [subscriptionMessage, setSubscriptionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Load user data
    useEffect(() => {
        const loadUserData = async () => {
            setIsLoading(true);
            try {
                const user = await getCurrentUser();
                if (user) {
                    const userProfile: UserProfile = {
                        id: user.id,
                        email: user.email || '',
                        fullName: user.user_metadata?.full_name || businessName,
                        phone: user.user_metadata?.phone || '',
                        avatarUrl: user.user_metadata?.avatar_url,
                    };
                    setProfile(userProfile);
                    setOriginalProfile(userProfile);

                    // Load business subscription data
                    const { data: business } = await supabase
                        .from('businesses')
                        .select('subscription_status, trial_ends_at, settings')
                        .eq('owner_id', user.id)
                        .single();

                    if (business) {
                        setSubscriptionStatus(business.subscription_status || 'trial');
                        setTrialEndsAt(business.trial_ends_at || null);
                        if (business.settings?.current_plan) {
                            setCurrentPlan(business.settings.current_plan);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading user data:', error);
            }
            setIsLoading(false);
        };

        if (isOpen) {
            loadUserData();
            // Reset states when modal opens
            setActiveTab('personal');
            setSaveSuccess(false);
            setSaveError(null);
            setPasswordSuccess(false);
            setPasswordError(null);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowCancelConfirm(false);
            setSubscriptionMessage(null);
        }
    }, [isOpen, businessName]);

    const hasChanges = originalProfile && (
        profile.fullName !== originalProfile.fullName ||
        profile.phone !== originalProfile.phone
    );

    const handleSavePersonalData = async () => {
        setIsSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: profile.fullName,
                    phone: profile.phone,
                }
            });

            if (error) throw error;

            setOriginalProfile({ ...profile });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error: any) {
            console.error('Error saving profile:', error);
            setSaveError(error.message || 'Erro ao salvar alterações');
        }
        setIsSaving(false);
    };

    const handleCancelChanges = () => {
        if (originalProfile) {
            setProfile({ ...originalProfile });
        }
        setSaveError(null);
    };

    const handleChangePassword = async () => {
        setPasswordError(null);
        setPasswordSuccess(false);

        if (!newPassword || !confirmPassword) {
            setPasswordError('Preencha todos os campos');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('A senha deve ter no mínimo 6 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('As senhas não coincidem');
            return;
        }

        setIsChangingPassword(true);

        try {
            const result = await updatePassword(newPassword);
            if (result.error) {
                throw result.error;
            }

            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPasswordSuccess(false), 3000);
        } catch (error: any) {
            console.error('Error changing password:', error);
            setPasswordError(error.message || 'Erro ao alterar senha');
        }
        setIsChangingPassword(false);
    };

    const handleLogout = async () => {
        await signOut();
        onLogout();
        onClose();
    };

    const handleChangePlan = async (planId: string) => {
        if (planId === currentPlan) return;

        setIsProcessing(true);
        setSubscriptionMessage(null);

        try {
            // Simulate API call - in production, this would call Stripe
            await new Promise(resolve => setTimeout(resolve, 1500));

            setCurrentPlan(planId);
            setSubscriptionMessage({ type: 'success', text: 'Plano alterado com sucesso! As mudanças entram em vigor imediatamente.' });
            setTimeout(() => setSubscriptionMessage(null), 5000);
        } catch (error) {
            setSubscriptionMessage({ type: 'error', text: 'Erro ao alterar plano. Tente novamente.' });
        }
        setIsProcessing(false);
    };

    const handleUpdatePaymentMethod = async () => {
        setIsProcessing(true);
        setSubscriptionMessage(null);

        try {
            // Simulate Stripe checkout session redirect
            await new Promise(resolve => setTimeout(resolve, 1000));
            setSubscriptionMessage({ type: 'success', text: 'Método de pagamento atualizado com sucesso!' });
            setTimeout(() => setSubscriptionMessage(null), 5000);
        } catch (error) {
            setSubscriptionMessage({ type: 'error', text: 'Erro ao atualizar método de pagamento.' });
        }
        setIsProcessing(false);
    };

    const handleRetryPayment = async () => {
        setIsProcessing(true);
        setSubscriptionMessage(null);

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setSubscriptionStatus('active');
            setSubscriptionMessage({ type: 'success', text: 'Pagamento processado com sucesso!' });
            setTimeout(() => setSubscriptionMessage(null), 5000);
        } catch (error) {
            setSubscriptionMessage({ type: 'error', text: 'Falha no pagamento. Verifique os dados do cartão.' });
        }
        setIsProcessing(false);
    };

    const handleCancelSubscription = async () => {
        setIsProcessing(true);
        setSubscriptionMessage(null);

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setSubscriptionStatus('canceled');
            setShowCancelConfirm(false);
            setSubscriptionMessage({ type: 'success', text: 'Assinatura cancelada. Você ainda terá acesso até o fim do período pago.' });
        } catch (error) {
            setSubscriptionMessage({ type: 'error', text: 'Erro ao cancelar assinatura.' });
        }
        setIsProcessing(false);
    };

    const handleReactivateSubscription = async () => {
        setIsProcessing(true);
        setSubscriptionMessage(null);

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setSubscriptionStatus('active');
            setSubscriptionMessage({ type: 'success', text: 'Assinatura reativada com sucesso!' });
            setTimeout(() => setSubscriptionMessage(null), 5000);
        } catch (error) {
            setSubscriptionMessage({ type: 'error', text: 'Erro ao reativar assinatura.' });
        }
        setIsProcessing(false);
    };

    const formatPhone = (value: string): string => {
        const numbers = value.replace(/\D/g, '');
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR');
    };

    const getStatusBadge = (status: SubscriptionStatus) => {
        switch (status) {
            case 'active':
                return <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-bold text-green-400"><CheckCircle size={12} /> Ativo</span>;
            case 'trial':
                return <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-bold text-blue-400"><Sparkles size={12} /> Trial</span>;
            case 'past_due':
                return <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-bold text-red-400"><AlertTriangle size={12} /> Pagamento Pendente</span>;
            case 'canceled':
                return <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/20 px-2 py-0.5 text-xs font-bold text-gray-400"><X size={12} /> Cancelado</span>;
            default:
                return null;
        }
    };

    const getCardBrandIcon = (brand: string) => {
        // Simple brand display - could be replaced with actual card icons
        return brand.charAt(0).toUpperCase() + brand.slice(1);
    };

    const currentPlanData = SUBSCRIPTION_PLANS.find(p => p.id === currentPlan);
    const daysUntilTrialEnds = trialEndsAt ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="flex h-full w-full max-w-4xl flex-col overflow-hidden border border-barber-800 bg-barber-900 shadow-2xl md:h-auto md:max-h-[90vh] md:rounded-2xl">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-barber-800 bg-barber-950 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-barber-800">
                            <User size={20} className="text-barber-gold" />
                        </div>
                        <h2 className="text-lg font-bold text-white">Meu Perfil</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-barber-800 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <div className="flex w-56 flex-col border-r border-barber-800 bg-barber-950">
                        <nav className="flex-1 p-4 space-y-1">
                            <button
                                onClick={() => setActiveTab('personal')}
                                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'personal'
                                    ? 'bg-barber-800 text-white'
                                    : 'text-gray-400 hover:bg-barber-900 hover:text-white'
                                    }`}
                            >
                                <User size={18} className={activeTab === 'personal' ? 'text-barber-gold' : ''} />
                                Dados Pessoais
                            </button>
                            <button
                                onClick={() => setActiveTab('security')}
                                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'security'
                                    ? 'bg-barber-800 text-white'
                                    : 'text-gray-400 hover:bg-barber-900 hover:text-white'
                                    }`}
                            >
                                <Lock size={18} className={activeTab === 'security' ? 'text-barber-gold' : ''} />
                                Segurança
                            </button>
                            <button
                                onClick={() => setActiveTab('subscription')}
                                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'subscription'
                                    ? 'bg-barber-800 text-white'
                                    : 'text-gray-400 hover:bg-barber-900 hover:text-white'
                                    }`}
                            >
                                <CreditCard size={18} className={activeTab === 'subscription' ? 'text-barber-gold' : ''} />
                                Plano & Pagamentos
                                {subscriptionStatus === 'past_due' && (
                                    <span className="ml-auto h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                )}
                            </button>
                        </nav>

                        {/* Logout Button */}
                        <div className="border-t border-barber-800 p-4">
                            <button
                                onClick={handleLogout}
                                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                            >
                                <LogOut size={18} />
                                Sair da Conta
                            </button>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 overflow-y-auto bg-barber-950 p-6">
                        {isLoading ? (
                            <div className="flex h-full items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-barber-gold" />
                            </div>
                        ) : activeTab === 'personal' ? (
                            /* Personal Data Tab */
                            <div className="space-y-6">
                                {/* Profile Header */}
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-barber-700 bg-barber-800">
                                            {profile.avatarUrl ? (
                                                <img
                                                    src={profile.avatarUrl}
                                                    alt="Avatar"
                                                    className="h-full w-full rounded-full object-cover"
                                                />
                                            ) : (
                                                <User size={32} className="text-gray-500" />
                                            )}
                                        </div>
                                        <button className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-barber-950 bg-barber-gold text-black transition-colors hover:bg-barber-goldhover">
                                            <Camera size={14} />
                                        </button>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">{profile.fullName || businessName}</h3>
                                        <span className="inline-block rounded bg-barber-800 px-2 py-0.5 text-xs font-bold uppercase text-barber-gold">
                                            {userRole}
                                        </span>
                                    </div>
                                </div>

                                {/* Form Fields */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                                            <User size={14} />
                                            Nome Completo
                                        </label>
                                        <input
                                            type="text"
                                            value={profile.fullName}
                                            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                            className="w-full rounded-lg border border-barber-800 bg-barber-900 px-4 py-3 text-white outline-none transition-colors focus:border-barber-gold"
                                            placeholder="Seu nome completo"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                                            <Mail size={14} />
                                            E-mail
                                        </label>
                                        <input
                                            type="email"
                                            value={profile.email}
                                            disabled
                                            className="w-full rounded-lg border border-barber-800 bg-barber-900/50 px-4 py-3 text-gray-500 outline-none cursor-not-allowed"
                                            placeholder="email@exemplo.com"
                                        />
                                        <p className="mt-1 text-xs text-gray-500">O e-mail não pode ser alterado</p>
                                    </div>

                                    <div>
                                        <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                                            <Phone size={14} />
                                            Telefone
                                        </label>
                                        <input
                                            type="tel"
                                            value={profile.phone}
                                            onChange={(e) => setProfile({ ...profile, phone: formatPhone(e.target.value) })}
                                            className="w-full rounded-lg border border-barber-800 bg-barber-900 px-4 py-3 text-white outline-none transition-colors focus:border-barber-gold"
                                            placeholder="(00) 00000-0000"
                                        />
                                    </div>
                                </div>

                                {saveError && (
                                    <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                                        <AlertCircle size={16} />
                                        {saveError}
                                    </div>
                                )}

                                {saveSuccess && (
                                    <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-400">
                                        <CheckCircle size={16} />
                                        Alterações salvas com sucesso!
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-3 border-t border-barber-800 pt-4">
                                    <button
                                        onClick={handleCancelChanges}
                                        disabled={!hasChanges || isSaving}
                                        className="rounded-lg px-6 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSavePersonalData}
                                        disabled={!hasChanges || isSaving}
                                        className="flex items-center gap-2 rounded-lg bg-barber-gold px-6 py-2.5 text-sm font-bold text-black transition-colors hover:bg-barber-goldhover disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Salvar Alterações
                                    </button>
                                </div>
                            </div>
                        ) : activeTab === 'security' ? (
                            /* Security Tab */
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Alterar Senha</h3>
                                    <p className="text-sm text-gray-400">
                                        Escolha uma senha forte com pelo menos 6 caracteres
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                                            <Lock size={14} />
                                            Nova Senha
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showNewPassword ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full rounded-lg border border-barber-800 bg-barber-900 px-4 py-3 pr-12 text-white outline-none transition-colors focus:border-barber-gold"
                                                placeholder="Digite a nova senha"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                            >
                                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                                            <Lock size={14} />
                                            Confirmar Nova Senha
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full rounded-lg border border-barber-800 bg-barber-900 px-4 py-3 pr-12 text-white outline-none transition-colors focus:border-barber-gold"
                                                placeholder="Confirme a nova senha"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                            >
                                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {passwordError && (
                                    <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
                                        <AlertCircle size={16} />
                                        {passwordError}
                                    </div>
                                )}

                                {passwordSuccess && (
                                    <div className="flex items-center gap-2 rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-3 text-sm text-green-400">
                                        <CheckCircle size={16} />
                                        Senha alterada com sucesso!
                                    </div>
                                )}

                                <div className="border-t border-barber-800 pt-4">
                                    <button
                                        onClick={handleChangePassword}
                                        disabled={isChangingPassword || !newPassword || !confirmPassword}
                                        className="flex items-center gap-2 rounded-lg bg-barber-gold px-6 py-2.5 text-sm font-bold text-black transition-colors hover:bg-barber-goldhover disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isChangingPassword ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                                        Alterar Senha
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Subscription Tab */
                            <div className="space-y-6">
                                {/* Subscription Message */}
                                {subscriptionMessage && (
                                    <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${subscriptionMessage.type === 'success'
                                            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                                            : 'bg-red-500/10 border border-red-500/30 text-red-400'
                                        }`}>
                                        {subscriptionMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                        {subscriptionMessage.text}
                                    </div>
                                )}

                                {/* Current Plan Overview */}
                                <div className="rounded-xl border border-barber-800 bg-barber-900 p-5">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <Crown size={20} className="text-barber-gold" />
                                                <h3 className="text-lg font-bold text-white">
                                                    Plano {currentPlanData?.name || 'Professional'}
                                                </h3>
                                                {getStatusBadge(subscriptionStatus)}
                                            </div>
                                            <p className="text-2xl font-bold text-barber-gold">
                                                R$ {currentPlanData?.price.toFixed(2).replace('.', ',') || '99,90'}
                                                <span className="text-sm font-normal text-gray-400">/mês</span>
                                            </p>
                                        </div>
                                        {subscriptionStatus === 'active' && (
                                            <div className="text-right text-sm">
                                                <p className="text-gray-400">Próxima cobrança</p>
                                                <p className="text-white font-medium">{formatDate(nextBillingDate)}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Trial Warning */}
                                    {subscriptionStatus === 'trial' && daysUntilTrialEnds > 0 && (
                                        <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-500/30 px-4 py-3">
                                            <Sparkles size={16} className="text-blue-400" />
                                            <p className="text-sm text-blue-400">
                                                Seu período de teste termina em <strong>{daysUntilTrialEnds} dias</strong>.
                                                Adicione um método de pagamento para continuar usando.
                                            </p>
                                        </div>
                                    )}

                                    {/* Payment Failed Warning */}
                                    {subscriptionStatus === 'past_due' && (
                                        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle size={16} className="text-red-400" />
                                                <p className="text-sm text-red-400">
                                                    Falha no pagamento. Atualize seu método de pagamento.
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleRetryPayment}
                                                disabled={isProcessing}
                                                className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
                                            >
                                                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                                                Tentar Novamente
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Available Plans */}
                                <div>
                                    <h4 className="text-sm font-bold uppercase tracking-wide text-gray-400 mb-3">Planos Disponíveis</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {SUBSCRIPTION_PLANS.map((plan) => (
                                            <div
                                                key={plan.id}
                                                className={`relative rounded-xl border p-4 transition-all ${plan.id === currentPlan
                                                        ? 'border-barber-gold bg-barber-gold/5'
                                                        : 'border-barber-800 bg-barber-900 hover:border-barber-700'
                                                    }`}
                                            >
                                                {plan.popular && (
                                                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-barber-gold px-3 py-0.5 text-[10px] font-bold uppercase text-black">
                                                        Popular
                                                    </span>
                                                )}
                                                {plan.id === currentPlan && (
                                                    <span className="absolute -top-2.5 right-3 rounded-full bg-green-500 px-3 py-0.5 text-[10px] font-bold uppercase text-white">
                                                        Atual
                                                    </span>
                                                )}
                                                <div className="mb-3">
                                                    <h5 className="text-lg font-bold text-white">{plan.name}</h5>
                                                    <p className="text-xl font-bold text-barber-gold">
                                                        R$ {plan.price.toFixed(2).replace('.', ',')}
                                                        <span className="text-xs font-normal text-gray-400">/mês</span>
                                                    </p>
                                                </div>
                                                <ul className="space-y-1.5 mb-4">
                                                    {plan.features.slice(0, 4).map((feature, idx) => (
                                                        <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                                                            <Check size={12} className="mt-0.5 text-green-500 flex-shrink-0" />
                                                            {feature}
                                                        </li>
                                                    ))}
                                                    {plan.features.length > 4 && (
                                                        <li className="text-xs text-gray-500">+{plan.features.length - 4} mais...</li>
                                                    )}
                                                </ul>
                                                <button
                                                    onClick={() => handleChangePlan(plan.id)}
                                                    disabled={plan.id === currentPlan || isProcessing}
                                                    className={`w-full rounded-lg py-2 text-sm font-bold transition-colors ${plan.id === currentPlan
                                                            ? 'bg-barber-800 text-gray-500 cursor-not-allowed'
                                                            : 'bg-barber-gold text-black hover:bg-barber-goldhover'
                                                        } disabled:opacity-50`}
                                                >
                                                    {plan.id === currentPlan ? 'Plano Atual' : 'Selecionar'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div className="rounded-xl border border-barber-800 bg-barber-900 p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="flex items-center gap-2 text-sm font-bold text-white">
                                            <CreditCard size={16} className="text-barber-gold" />
                                            Método de Pagamento
                                        </h4>
                                        <button
                                            onClick={handleUpdatePaymentMethod}
                                            disabled={isProcessing}
                                            className="text-sm text-barber-gold hover:underline disabled:opacity-50"
                                        >
                                            {isProcessing ? 'Processando...' : 'Alterar'}
                                        </button>
                                    </div>
                                    {paymentMethods.length > 0 ? (
                                        <div className="flex items-center gap-3 rounded-lg border border-barber-800 bg-barber-950 p-3">
                                            <div className="flex h-10 w-14 items-center justify-center rounded bg-barber-800 text-xs font-bold uppercase text-white">
                                                {getCardBrandIcon(paymentMethods[0].brand)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">•••• •••• •••• {paymentMethods[0].last4}</p>
                                                <p className="text-xs text-gray-400">
                                                    Expira {paymentMethods[0].expMonth.toString().padStart(2, '0')}/{paymentMethods[0].expYear}
                                                </p>
                                            </div>
                                            {paymentMethods[0].isDefault && (
                                                <span className="ml-auto rounded-full bg-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">
                                                    Padrão
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-barber-800 bg-barber-950 p-6 text-center">
                                            <CreditCard size={24} className="mx-auto mb-2 text-gray-500" />
                                            <p className="text-sm text-gray-400">Nenhum método de pagamento cadastrado</p>
                                            <button
                                                onClick={handleUpdatePaymentMethod}
                                                className="mt-3 rounded-lg bg-barber-gold px-4 py-2 text-sm font-bold text-black hover:bg-barber-goldhover"
                                            >
                                                Adicionar Cartão
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Billing History */}
                                <div className="rounded-xl border border-barber-800 bg-barber-900 p-5">
                                    <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-4">
                                        <Receipt size={16} className="text-barber-gold" />
                                        Histórico de Cobranças
                                    </h4>
                                    <div className="divide-y divide-barber-800">
                                        {billingHistory.map((record) => (
                                            <div key={record.id} className="flex items-center justify-between py-3">
                                                <div>
                                                    <p className="text-sm font-medium text-white">{record.description}</p>
                                                    <p className="text-xs text-gray-400">{formatDate(record.date)}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-sm font-bold ${record.status === 'paid' ? 'text-green-400' :
                                                            record.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                                                        }`}>
                                                        R$ {record.amount.toFixed(2).replace('.', ',')}
                                                    </span>
                                                    <button className="text-gray-400 hover:text-white">
                                                        <ExternalLink size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Cancel Subscription */}
                                {subscriptionStatus === 'active' && (
                                    <div className="border-t border-barber-800 pt-4">
                                        {showCancelConfirm ? (
                                            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                                                <p className="text-sm text-red-400 mb-3">
                                                    Tem certeza que deseja cancelar sua assinatura? Você ainda terá acesso até o final do período pago.
                                                </p>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => setShowCancelConfirm(false)}
                                                        className="rounded-lg border border-barber-800 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white"
                                                    >
                                                        Voltar
                                                    </button>
                                                    <button
                                                        onClick={handleCancelSubscription}
                                                        disabled={isProcessing}
                                                        className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50"
                                                    >
                                                        {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                        Confirmar Cancelamento
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowCancelConfirm(true)}
                                                className="text-sm text-gray-500 hover:text-red-400 transition-colors"
                                            >
                                                Cancelar assinatura
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Reactivate Subscription */}
                                {subscriptionStatus === 'canceled' && (
                                    <div className="border-t border-barber-800 pt-4">
                                        <button
                                            onClick={handleReactivateSubscription}
                                            disabled={isProcessing}
                                            className="flex items-center gap-2 rounded-lg bg-barber-gold px-6 py-2.5 text-sm font-bold text-black hover:bg-barber-goldhover disabled:opacity-50"
                                        >
                                            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                            Reativar Assinatura
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
