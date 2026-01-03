
import React, { useState, useEffect } from 'react';
import { ScissorsLineDashed, Mail, Lock, User, ArrowRight, Loader2, CheckCircle2, ChevronLeft, Sparkles } from 'lucide-react';
import { BusinessType } from '../types';
import Checkbox from './ui/Checkbox';

interface AuthProps {
  onLogin: (type: BusinessType) => void;
}

type AuthView = 'login' | 'register' | 'forgot_password';

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [view, setView] = useState<AuthView>('login');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // Active Theme Type (Driven by selection in Register, or detection in Login)
  const [activeType, setActiveType] = useState<BusinessType>('barbershop');
  
  // Feedback
  const [resetSent, setResetSent] = useState(false);

  // EFFECT: Set styling attributes for Auth Screen
  useEffect(() => {
    document.body.setAttribute('data-business', activeType);
    
    // Force Dark Mode on Auth Screen specifically for visual consistency (Cinematic look)
    document.body.setAttribute('data-mode', 'dark');
    document.documentElement.classList.add('dark');
  }, [activeType]);

  // EFFECT: Simple detection logic on Login screen to switch theme based on email keyword
  useEffect(() => {
    if (view === 'login') {
        const lowerEmail = email.toLowerCase();
        if (lowerEmail.includes('salao') || lowerEmail.includes('beauty') || lowerEmail.includes('estetica') || lowerEmail.includes('beleza')) {
            setActiveType('beauty_salon');
        }
    }
  }, [email, view]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API Call
    setTimeout(() => {
      setIsLoading(false);
      if (view === 'forgot_password') {
        setResetSent(true);
      } else {
        onLogin(activeType); 
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-barber-950 flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-500">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-barber-gold/20 rounded-full blur-[120px] opacity-30 transition-colors duration-1000"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md bg-barber-900 border border-barber-800 rounded-2xl shadow-2xl relative z-10 overflow-hidden transition-colors duration-300">
        
        {/* Header Branding */}
        <div className="text-center pt-8 pb-4">
          <div className="w-16 h-16 bg-barber-gold rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-barber-gold/20 rotate-3 hover:rotate-6 transition-all duration-500">
             {activeType === 'beauty_salon' 
                ? <Sparkles className="text-inverted" size={32} /> 
                : <ScissorsLineDashed className="text-inverted" size={32} />
             }
          </div>
          <h1 className="text-2xl font-bold text-main tracking-tight">NS <span className="text-barber-gold">Studio</span></h1>
          <p className="text-xs text-muted uppercase tracking-widest mt-1">Management System</p>
        </div>

        <div className="p-8 pt-2">
          
          {/* LOGIN VIEW */}
          {view === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              <div className="text-center mb-6">
                 <h2 className="text-xl font-bold text-main">Bem-vindo de volta</h2>
                 <p className="text-sm text-muted">Entre para gerenciar seu negócio.</p>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-3 top-3.5 text-muted group-focus-within:text-barber-gold transition-colors duration-300" size={18} />
                  <input 
                    type="email" 
                    placeholder="Seu e-mail"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-input-bg border border-barber-800 text-main rounded-xl pl-10 pr-4 py-3 outline-none focus:border-barber-gold transition-all text-sm placeholder:text-muted"
                  />
                </div>
                
                <div className="relative group">
                  <Lock className="absolute left-3 top-3.5 text-muted group-focus-within:text-barber-gold transition-colors duration-300" size={18} />
                  <input 
                    type="password" 
                    placeholder="Sua senha"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-input-bg border border-barber-800 text-main rounded-xl pl-10 pr-4 py-3 outline-none focus:border-barber-gold transition-all text-sm placeholder:text-muted"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <Checkbox label="Lembrar de mim" />
                <button 
                  type="button" 
                  onClick={() => setView('forgot_password')}
                  className="text-barber-gold hover:underline transition-colors font-medium"
                >
                  Esqueci a senha
                </button>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-barber-gold hover:bg-barber-goldhover text-inverted font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                 {isLoading ? <Loader2 size={20} className="animate-spin" /> : <>Entrar <ArrowRight size={18} /></>}
              </button>

              <div className="text-center mt-6">
                <p className="text-sm text-muted">
                  Não tem uma conta?{' '}
                  <button type="button" onClick={() => setView('register')} className="text-main font-bold hover:underline transition-colors">
                    Criar conta
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* REGISTER VIEW */}
          {view === 'register' && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              <div className="text-center mb-6">
                 <h2 className="text-xl font-bold text-main">Criar Conta</h2>
                 <p className="text-sm text-muted">Selecione o tipo e comece agora.</p>
              </div>

              {/* Business Type Selector */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                 <button
                    type="button"
                    onClick={() => setActiveType('barbershop')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                        activeType === 'barbershop' 
                        ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/20' 
                        : 'bg-input-bg border-barber-800 text-muted hover:border-barber-800 hover:bg-barber-700'
                    }`}
                 >
                    <ScissorsLineDashed size={20} />
                    <span className="text-xs font-bold uppercase">Barbearia</span>
                 </button>
                 
                 <button
                    type="button"
                    onClick={() => setActiveType('beauty_salon')}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all duration-300 ${
                        activeType === 'beauty_salon' 
                        ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-600/20' 
                        : 'bg-input-bg border-barber-800 text-muted hover:border-barber-800 hover:bg-barber-700'
                    }`}
                 >
                    <Sparkles size={20} />
                    <span className="text-xs font-bold uppercase">Salão</span>
                 </button>
              </div>

              <div className="space-y-3">
                <div className="relative group">
                  <User className="absolute left-3 top-3.5 text-muted group-focus-within:text-barber-gold transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Nome do estabelecimento"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-input-bg border border-barber-800 text-main rounded-xl pl-10 pr-4 py-3 outline-none focus:border-barber-gold transition-all text-sm placeholder:text-muted"
                  />
                </div>

                <div className="relative group">
                  <Mail className="absolute left-3 top-3.5 text-muted group-focus-within:text-barber-gold transition-colors" size={18} />
                  <input 
                    type="email" 
                    placeholder="E-mail profissional"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-input-bg border border-barber-800 text-main rounded-xl pl-10 pr-4 py-3 outline-none focus:border-barber-gold transition-all text-sm placeholder:text-muted"
                  />
                </div>
                
                <div className="relative group">
                  <Lock className="absolute left-3 top-3.5 text-muted group-focus-within:text-barber-gold transition-colors" size={18} />
                  <input 
                    type="password" 
                    placeholder="Criar senha"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-input-bg border border-barber-800 text-main rounded-xl pl-10 pr-4 py-3 outline-none focus:border-barber-gold transition-all text-sm placeholder:text-muted"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-barber-gold hover:bg-barber-goldhover text-inverted font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                 {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Cadastrar Grátis'}
              </button>

              <div className="text-center mt-6">
                <p className="text-sm text-muted">
                  Já tem conta?{' '}
                  <button type="button" onClick={() => setView('login')} className="text-main font-bold hover:underline transition-colors">
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
                  onClick={() => { setView('login'); setResetSent(false); }}
                  className="flex items-center gap-1 text-xs text-muted hover:text-main mb-6 transition-colors"
               >
                  <ChevronLeft size={14} /> Voltar ao Login
               </button>

               {!resetSent ? (
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 bg-barber-900 rounded-full flex items-center justify-center mx-auto mb-3 border border-barber-800 shadow-sm">
                           <Lock size={20} className="text-barber-gold" />
                        </div>
                        <h2 className="text-xl font-bold text-main">Recuperar Senha</h2>
                        <p className="text-sm text-muted px-4">Digite seu e-mail e enviaremos um link.</p>
                    </div>

                    <div className="relative group">
                        <Mail className="absolute left-3 top-3.5 text-muted group-focus-within:text-barber-gold transition-colors" size={18} />
                        <input 
                            type="email" 
                            placeholder="Seu e-mail cadastrado"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-input-bg border border-barber-800 text-main rounded-xl pl-10 pr-4 py-3 outline-none focus:border-barber-gold transition-all text-sm placeholder:text-muted"
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-barber-800 hover:bg-barber-700 text-main font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Enviar Link'}
                    </button>
                 </form>
               ) : (
                 <div className="text-center animate-fade-in py-8">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                       <CheckCircle2 size={32} className="text-green-500" />
                    </div>
                    <h2 className="text-xl font-bold text-main mb-2">E-mail Enviado!</h2>
                    <p className="text-sm text-muted mb-6">Verifique sua caixa de entrada.</p>
                    
                    <button 
                       onClick={() => setView('login')}
                       className="w-full bg-barber-gold hover:bg-barber-goldhover text-inverted font-bold py-3.5 rounded-xl transition-all"
                    >
                       Voltar ao Login
                    </button>
                 </div>
               )}
            </div>
          )}

        </div>
        
        {/* Footer info */}
        <div className="bg-barber-900 p-4 border-t border-barber-800 text-center">
           <p className="text-[10px] text-muted">
             &copy; 2024 NS Studio. Todos os direitos reservados.
           </p>
        </div>

      </div>
    </div>
  );
};

export default Auth;
