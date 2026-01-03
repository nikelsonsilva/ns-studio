import React, { useState } from 'react';
import { ScissorsLineDashed, Mail, Lock, User, ArrowRight, Loader2, CheckCircle2, Sparkles, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { signIn, signUp, resetPassword } from '../lib/auth';
import type { BusinessType } from '../types';

interface AuthProps {
    onLogin: () => void;
}

type AuthView = 'login' | 'register' | 'forgot_password';

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const [view, setView] = useState<AuthView>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [businessType, setBusinessType] = useState<BusinessType>('barbershop');

    // Form States
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [businessName, setBusinessName] = useState('');

    // Feedback
    const [resetSent, setResetSent] = useState(false);
    const [error, setError] = useState('');

    // Password visibility
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const { user, error: authError } = await signIn({ email, password });

        if (authError) {
            setError(authError.message || 'Erro ao fazer login');
            setIsLoading(false);
        } else if (user) {
            onLogin();
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // Validar confirmação de senha
        if (password !== confirmPassword) {
            setError('As senhas não coincidem');
            setIsLoading(false);
            return;
        }

        const { user, error: authError } = await signUp({
            email,
            password,
            fullName,
            businessType,
            businessName
        });

        if (authError) {
            setError(authError.message || 'Erro ao criar conta');
            setIsLoading(false);
        } else if (user) {
            // Sucesso! O business será criado automaticamente pelo trigger
            onLogin();
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const { error: resetError } = await resetPassword(email);

        setIsLoading(false);

        if (resetError) {
            setError(resetError.message || 'Erro ao enviar e-mail');
        } else {
            setResetSent(true);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden font-sans">

            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-amber-500/5 rounded-full blur-[120px]"></div>
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl relative z-10 overflow-hidden">

                {/* Header Branding */}
                <div className="text-center pt-8 pb-4">
                    <div className="w-16 h-16 bg-amber-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
                        <ScissorsLineDashed className="text-black" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">NS <span className="text-amber-500">Studio</span></h1>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Management System</p>
                </div>

                <div className="p-8 pt-2">

                    {/* LOGIN VIEW */}
                    {view === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-white">Bem-vindo de volta</h2>
                                <p className="text-sm text-gray-400">Entre para gerenciar seu negócio.</p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-amber-500 transition-colors" size={18} />
                                    <input
                                        type="email"
                                        placeholder="Seu e-mail"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl pl-10 pr-4 py-3 outline-none focus:border-amber-500 focus:bg-zinc-900 transition-all text-sm"
                                    />
                                </div>

                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-amber-500 transition-colors" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Sua senha"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl pl-10 pr-12 py-3 outline-none focus:border-amber-500 focus:bg-zinc-900 transition-all text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3.5 text-gray-500 hover:text-amber-500 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-xs">
                                <label className="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-white">
                                    <input type="checkbox" className="rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-0" />
                                    Lembrar de mim
                                </label>
                                <button
                                    type="button"
                                    onClick={() => { setView('forgot_password'); setError(''); }}
                                    className="text-amber-500 hover:underline"
                                >
                                    Esqueci a senha
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <>Entrar <ArrowRight size={18} /></>}
                            </button>

                            <div className="text-center mt-6">
                                <p className="text-sm text-gray-400">
                                    Não tem uma conta?{' '}
                                    <button type="button" onClick={() => { setView('register'); setError(''); }} className="text-white font-bold hover:underline">
                                        Criar conta
                                    </button>
                                </p>
                            </div>
                        </form>
                    )}

                    {/* REGISTER VIEW */}
                    {view === 'register' && (
                        <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-white">Criar Conta</h2>
                                <p className="text-sm text-gray-400">Comece a transformar seu negócio.</p>
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl">
                                    {error}
                                </div>
                            )}

                            {/* Business Type Selector */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <button
                                    type="button"
                                    onClick={() => setBusinessType('barbershop')}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${businessType === 'barbershop'
                                        ? 'bg-amber-500 text-black border-amber-500'
                                        : 'bg-zinc-900/50 border-zinc-800 text-gray-400 hover:border-zinc-600'
                                        }`}
                                >
                                    <ScissorsLineDashed size={20} />
                                    <span className="text-xs font-bold">Barbearia</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBusinessType('salon')}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${businessType === 'salon'
                                        ? 'bg-purple-500 text-white border-purple-500'
                                        : 'bg-zinc-900/50 border-zinc-800 text-gray-400 hover:border-zinc-600'
                                        }`}
                                >
                                    <Sparkles size={20} />
                                    <span className="text-xs font-bold">Salão de Beleza</span>
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="relative group">
                                    <User className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-white transition-colors" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Nome do estabelecimento"
                                        required
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl pl-10 pr-4 py-3 outline-none focus:border-white focus:bg-zinc-900 transition-all text-sm"
                                    />
                                </div>

                                <div className="relative group">
                                    <User className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-white transition-colors" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Seu nome completo"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl pl-10 pr-4 py-3 outline-none focus:border-white focus:bg-zinc-900 transition-all text-sm"
                                    />
                                </div>

                                <div className="relative group">
                                    <Mail className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-white transition-colors" size={18} />
                                    <input
                                        type="email"
                                        placeholder="E-mail profissional"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl pl-10 pr-4 py-3 outline-none focus:border-white focus:bg-zinc-900 transition-all text-sm"
                                    />
                                </div>

                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-white transition-colors" size={18} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Criar senha"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl pl-10 pr-12 py-3 outline-none focus:border-white focus:bg-zinc-900 transition-all text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3.5 text-gray-500 hover:text-white transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-white transition-colors" size={18} />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirmar senha"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl pl-10 pr-12 py-3 outline-none focus:border-white focus:bg-zinc-900 transition-all text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-3.5 text-gray-500 hover:text-white transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4 ${businessType === 'barbershop'
                                    ? 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/10'
                                    : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20'
                                    }`}
                            >
                                {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Cadastrar Grátis'}
                            </button>

                            <div className="text-center mt-6">
                                <p className="text-sm text-gray-400">
                                    Já tem conta?{' '}
                                    <button type="button" onClick={() => { setView('login'); setError(''); }} className="text-white font-bold hover:underline">
                                        Fazer Login
                                    </button>
                                </p>
                            </div>
                        </form>
                    )}

                    {/* FORGOT PASSWORD VIEW */}
                    {view === 'forgot_password' && (
                        <div className="animate-fade-in">
                            <button
                                onClick={() => { setView('login'); setResetSent(false); setError(''); }}
                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white mb-6 transition-colors"
                            >
                                <ChevronLeft size={14} /> Voltar ao Login
                            </button>

                            {!resetSent ? (
                                <form onSubmit={handleForgotPassword} className="space-y-4">
                                    <div className="text-center mb-6">
                                        <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-3 border border-zinc-800">
                                            <Lock size={20} className="text-amber-500" />
                                        </div>
                                        <h2 className="text-xl font-bold text-white">Recuperar Senha</h2>
                                        <p className="text-sm text-gray-400 px-4">Digite seu e-mail e enviaremos um link para redefinir sua senha.</p>
                                    </div>

                                    {error && (
                                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl">
                                            {error}
                                        </div>
                                    )}

                                    <div className="relative group">
                                        <Mail className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-amber-500 transition-colors" size={18} />
                                        <input
                                            type="email"
                                            placeholder="Seu e-mail cadastrado"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-zinc-900/50 border border-zinc-800 text-white rounded-xl pl-10 pr-4 py-3 outline-none focus:border-amber-500 focus:bg-zinc-900 transition-all text-sm"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Enviar Link'}
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center animate-fade-in py-8">
                                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                                        <CheckCircle2 size={32} className="text-green-500" />
                                    </div>
                                    <h2 className="text-xl font-bold text-white mb-2">E-mail Enviado!</h2>
                                    <p className="text-sm text-gray-400 mb-6">Verifique sua caixa de entrada (e spam) para redefinir sua senha.</p>

                                    <button
                                        onClick={() => setView('login')}
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-3.5 rounded-xl transition-all"
                                    >
                                        Voltar ao Login
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                </div>

                {/* Footer info */}
                <div className="bg-zinc-950 p-4 border-t border-zinc-800 text-center">
                    <p className="text-[10px] text-gray-600">
                        &copy; 2024 NS Studio. Todos os direitos reservados.
                    </p>
                </div>

            </div>
        </div>
    );
};

export default Auth;
