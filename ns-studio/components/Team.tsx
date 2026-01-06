
import React, { useState, useMemo, useRef } from 'react';
import { 
  Star, 
  Scissors, 
  Banknote, 
  Trophy, 
  Target, 
  Crown, 
  Calendar, 
  Check, 
  UserPlus, 
  Phone, 
  Mail, 
  User,
  Clock,
  TrendingUp,
  LayoutGrid,
  List,
  Trash2,
  Zap,
  ChevronRight,
  Wallet,
  AlertCircle,
  MapPin,
  CheckCircle2,
  X,
  FileText
} from 'lucide-react';
import { Barber, WorkDay, Service } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Switch from './ui/Switch';
import { useToast } from './ui/Toast';

interface TeamProps {
  barbers: Barber[];
  services: Service[];
}

type ModalTab = 'profile' | 'finance' | 'services' | 'schedule';

// --- Sub-componente para Avatar Seguro ---
const BarberAvatar = ({ barber, size = 'md', className = '' }: { barber: Partial<Barber>, size?: 'sm'|'md'|'lg'|'xl'|'2xl', className?: string }) => {
    const [imgError, setImgError] = useState(false);

    const getInitials = (name: string) => {
        const names = name.split(' ');
        if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-xl',
        xl: 'w-24 h-24 text-3xl',
        '2xl': 'w-24 h-24 md:w-32 md:h-32 text-2xl md:text-4xl' // Responsivo
    };

    if (barber.avatar && !imgError) {
        return (
            <img 
                src={barber.avatar} 
                alt={barber.name} 
                onError={() => setImgError(true)}
                className={`rounded-full object-cover border-2 border-barber-800 ${sizeClasses[size]} ${className}`} 
            />
        );
    }

    return (
        <div className={`rounded-full flex items-center justify-center font-bold text-white shadow-inner bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-600 ${sizeClasses[size]} ${className}`}>
            {getInitials(barber.name || '')}
        </div>
    );
};

const Team: React.FC<TeamProps> = ({ barbers: initialBarbers, services }) => {
  const [barbers, setBarbers] = useState(initialBarbers);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [viewingAgenda, setViewingAgenda] = useState<Barber | null>(null); // New State for Agenda View
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const toast = useToast();
  
  // File Input Ref for Avatar Upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('profile');
  
  const [newBarber, setNewBarber] = useState<Partial<Barber>>({
      name: '',
      specialty: '',
      email: '',
      phone: '',
      cpf: '',
      birthDate: '',
      commissionRate: 50,
      goal: 5000,
      rating: 5.0,
      avatar: '', 
      workSchedule: [],
      useCustomBuffer: false,
      bufferTime: 15,
      services: []
  });

  // --- Computed Stats ---
  const rankedBarbers = useMemo(() => {
      return [...barbers].sort((a, b) => (b.currentSales || 0) - (a.currentSales || 0));
  }, [barbers]);

  const teamStats = useMemo(() => {
      const totalSales = barbers.reduce((acc, b) => acc + (b.currentSales || 0), 0);
      const totalGoal = barbers.reduce((acc, b) => acc + (b.goal || 0), 0);
      const goalProgress = totalGoal > 0 ? Math.round((totalSales / totalGoal) * 100) : 0;
      const activeBarbers = barbers.length; 
      const avgCommission = Math.round(barbers.reduce((acc, b) => acc + b.commissionRate, 0) / (barbers.length || 1));

      return { totalSales, goalProgress, activeBarbers, avgCommission };
  }, [barbers]);

  const filteredBarbers = barbers.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const daysMap = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  // --- Helpers ---
  const getGradient = (index: number) => {
      if (index === 0) return 'from-yellow-400 to-amber-600'; // Gold
      if (index === 1) return 'from-gray-300 to-gray-500'; // Silver
      if (index === 2) return 'from-orange-400 to-red-700'; // Bronze
      return 'from-barber-800 to-barber-900';
  };

  // --- Handlers ---

  const handleOpenAddModal = () => {
      const defaultSchedule: WorkDay[] = [0, 1, 2, 3, 4, 5, 6].map(day => ({
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '19:00',
          breakStart: '12:00',
          breakEnd: '13:00',
          active: day !== 0 // Sunday off by default
      }));

      setNewBarber({
          name: '',
          specialty: '',
          email: '',
          phone: '',
          cpf: '',
          birthDate: '',
          commissionRate: 50,
          goal: 5000,
          rating: 5.0,
          currentSales: 0,
          avatar: '',
          workSchedule: defaultSchedule,
          useCustomBuffer: false,
          bufferTime: 15,
          services: []
      });
      setActiveTab('profile');
      setIsAddModalOpen(true);
  };

  const toggleService = (serviceId: string, isEditing: boolean) => {
      const target = isEditing && editingBarber ? editingBarber : newBarber;
      const setTarget = isEditing ? setEditingBarber : setNewBarber;

      const currentServices = target.services || [];
      const newServices = currentServices.includes(serviceId)
        ? currentServices.filter(id => id !== serviceId)
        : [...currentServices, serviceId];
      
      // @ts-ignore
      setTarget({ ...target, services: newServices });
  };

  const handleSaveNewBarber = () => {
      if (!newBarber.name || !newBarber.specialty) {
          toast.error('Preencha os campos obrigatórios (Nome e Especialidade).');
          return;
      }
      const createdBarber: Barber = {
          id: Math.random().toString(36).substr(2, 9),
          name: newBarber.name!,
          specialty: newBarber.specialty!,
          avatar: newBarber.avatar || '',
          email: newBarber.email,
          phone: newBarber.phone,
          cpf: newBarber.cpf,
          birthDate: newBarber.birthDate,
          commissionRate: newBarber.commissionRate || 50,
          rating: 5.0,
          goal: newBarber.goal || 5000,
          currentSales: 0,
          workSchedule: newBarber.workSchedule,
          useCustomBuffer: newBarber.useCustomBuffer,
          bufferTime: newBarber.bufferTime,
          services: newBarber.services
      };
      setBarbers([...barbers, createdBarber]);
      setIsAddModalOpen(false);
      toast.success('Profissional cadastrado com sucesso!');
  };

  const handleEditClick = (barber: Barber, initialTab: ModalTab = 'profile') => {
    const schedule = barber.workSchedule && barber.workSchedule.length > 0 
        ? barber.workSchedule 
        : [0,1,2,3,4,5,6].map(d => ({ dayOfWeek: d, startTime: '09:00', endTime: '19:00', active: d !== 0 }));
    
    setEditingBarber({ ...barber, workSchedule: schedule, services: barber.services || [] });
    setActiveTab(initialTab);
  };

  const handleSaveBarber = () => {
    if (!editingBarber) return;
    setBarbers(prev => prev.map(b => b.id === editingBarber.id ? editingBarber : b));
    setEditingBarber(null);
    toast.success('Alterações salvas com sucesso!');
  };

  const handleDeleteBarber = (id: string) => {
      if(confirm('Tem certeza que deseja remover este profissional?')) {
          setBarbers(prev => prev.filter(b => b.id !== id));
          setEditingBarber(null);
          toast.success('Profissional removido.');
      }
  };

  const updateSchedule = (dayIndex: number, field: keyof WorkDay, value: any, isEditing: boolean) => {
    const target = isEditing && editingBarber ? editingBarber : newBarber;
    const setTarget = isEditing ? setEditingBarber : setNewBarber;

    if (target.workSchedule) {
        const newSchedule = [...target.workSchedule];
        newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
        // @ts-ignore
        setTarget({ ...target, workSchedule: newSchedule });
    }
  };

  // --- Render Schedule Row ---
  const renderScheduleRow = (day: WorkDay, idx: number, isEditing: boolean) => (
    <div key={idx} className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border mb-2 transition-all duration-200 ${day.active ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-950/50 border-zinc-800/30 opacity-60 grayscale'}`}>
        <div className="w-full sm:w-24 shrink-0 flex justify-between sm:block">
            <div className="text-xs font-bold uppercase text-muted tracking-wider">{daysMap[day.dayOfWeek]}</div>
            <div className="sm:hidden">
                 <Switch 
                    checked={day.active} 
                    onCheckedChange={(c) => updateSchedule(idx, 'active', c, isEditing)} 
                 />
            </div>
        </div>
        
        <div className="flex-1 grid grid-cols-2 gap-4 w-full">
            <div className="flex flex-col gap-1">
                <span className="text-[9px] text-muted uppercase font-bold">Turno</span>
                <div className="flex items-center gap-2">
                    <input 
                        type="time" 
                        value={day.startTime}
                        onChange={(e) => updateSchedule(idx, 'startTime', e.target.value, isEditing)}
                        disabled={!day.active}
                        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none w-full focus:border-barber-gold"
                    />
                    <span className="text-muted text-xs">às</span>
                    <input 
                        type="time" 
                        value={day.endTime}
                        onChange={(e) => updateSchedule(idx, 'endTime', e.target.value, isEditing)}
                        disabled={!day.active}
                        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none w-full focus:border-barber-gold"
                    />
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <span className="text-[9px] text-muted uppercase font-bold">Almoço</span>
                <div className="flex items-center gap-2">
                    <input 
                        type="time" 
                        value={day.breakStart || ''}
                        onChange={(e) => updateSchedule(idx, 'breakStart', e.target.value, isEditing)}
                        disabled={!day.active}
                        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none w-full focus:border-barber-gold"
                    />
                    <span className="text-muted text-xs">às</span>
                    <input 
                        type="time" 
                        value={day.breakEnd || ''}
                        onChange={(e) => updateSchedule(idx, 'breakEnd', e.target.value, isEditing)}
                        disabled={!day.active}
                        className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none w-full focus:border-barber-gold"
                    />
                </div>
            </div>
        </div>

        <div className="hidden sm:flex justify-end pl-2 border-l border-zinc-800">
             <Switch 
                checked={day.active} 
                onCheckedChange={(c) => updateSchedule(idx, 'active', c, isEditing)} 
             />
        </div>
    </div>
  );

  const renderModalContent = (isEditing: boolean) => {
      const target = isEditing && editingBarber ? editingBarber : newBarber;
      const setTarget = isEditing ? setEditingBarber : setNewBarber;

      switch(activeTab) {
          case 'profile':
              return (
                  <div className="space-y-6 animate-fade-in">
                      <div className="flex flex-col items-center justify-center mb-6">
                          <BarberAvatar barber={target} size="2xl" />
                          <input 
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              accept="image/*" 
                              onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                      const url = URL.createObjectURL(file);
                                      // @ts-ignore
                                      setTarget({ ...target, avatar: url });
                                      toast.success('Foto atualizada!');
                                  }
                              }}
                          />
                          <button 
                              className="mt-3 text-xs text-barber-gold hover:underline"
                              onClick={() => fileInputRef.current?.click()}
                          >
                              Alterar Foto
                          </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Nome Completo" value={target.name} onChange={e => setTarget({...target, name: e.target.value})} icon={<User size={16}/>} />
                        <Input label="Especialidade" value={target.specialty} onChange={e => setTarget({...target, specialty: e.target.value})} icon={<Scissors size={16}/>} />
                        <Input label="E-mail" type="email" value={target.email} onChange={e => setTarget({...target, email: e.target.value})} icon={<Mail size={16}/>} />
                        <Input label="Telefone" type="tel" value={target.phone} onChange={e => setTarget({...target, phone: e.target.value})} icon={<Phone size={16}/>} />
                        <Input label="CPF" value={target.cpf || ''} onChange={e => setTarget({...target, cpf: e.target.value})} icon={<FileText size={16}/>} placeholder="000.000.000-00" />
                        <Input label="Data de Nascimento" type="date" value={target.birthDate || ''} onChange={e => setTarget({...target, birthDate: e.target.value})} icon={<Calendar size={16}/>} />
                      </div>
                  </div>
              );
          case 'finance':
              // Calculate Commission Stats
              const totalSales = target.currentSales || 0;
              const commRate = target.commissionRate || 50;
              const totalCommission = totalSales * (commRate / 100);
              
              // MOCKING Payment Split (Simulating 70% paid, 30% pending)
              const paidCommission = totalCommission * 0.7; 
              const pendingCommission = totalCommission * 0.3;

              return (
                  <div className="space-y-6 animate-fade-in">
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="Meta Mensal (R$)" type="number" value={target.goal} onChange={e => setTarget({...target, goal: Number(e.target.value)})} icon={<Target size={16}/>} />
                        <Input label="Comissão (%)" type="number" value={target.commissionRate} onChange={e => setTarget({...target, commissionRate: Number(e.target.value)})} icon={<Banknote size={16}/>} />
                      </div>
                      
                      {/* New Financial Summary Section */}
                      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mt-4">
                          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                              <Wallet size={16} className="text-emerald-500" /> Resumo de Comissões (Mês Atual)
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-center">
                                  <div className="text-[10px] text-muted uppercase font-bold">Gerado</div>
                                  <div className="text-lg font-bold text-white mt-1">R$ {totalCommission.toFixed(2)}</div>
                              </div>
                              <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 text-center">
                                  <div className="text-[10px] text-emerald-500 uppercase font-bold">Pago</div>
                                  <div className="text-lg font-bold text-emerald-400 mt-1">R$ {paidCommission.toFixed(2)}</div>
                              </div>
                              <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 text-center">
                                  <div className="text-[10px] text-amber-500 uppercase font-bold">Pendente</div>
                                  <div className="text-lg font-bold text-amber-400 mt-1">R$ {pendingCommission.toFixed(2)}</div>
                              </div>
                          </div>
                          <div className="mt-4 flex items-center gap-2 text-xs text-muted bg-blue-500/10 p-2 rounded border border-blue-500/20">
                              <AlertCircle size={14} className="text-blue-400" />
                              <span>Cálculo baseado na taxa de {commRate}% sobre vendas totais.</span>
                          </div>
                      </div>
                  </div>
              );
          case 'services':
              return (
                  <div className="animate-fade-in">
                      <div className="p-3 mb-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 flex items-center gap-2">
                          <Zap size={14} /> Ative os interruptores para habilitar os serviços deste profissional.
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {services.map(s => {
                            const isEnabled = target.services?.includes(s.id);
                            return (
                                <div 
                                    key={s.id} 
                                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${isEnabled ? 'bg-zinc-900 border-barber-gold/30' : 'bg-zinc-950 border-zinc-800 opacity-60'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${isEnabled ? 'bg-barber-gold text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                                            {s.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className={`font-bold text-sm ${isEnabled ? 'text-white' : 'text-muted'}`}>{s.name}</div>
                                            <div className="text-[10px] text-muted">R$ {s.price.toFixed(2)} • {s.duration} min</div>
                                        </div>
                                    </div>
                                    <Switch 
                                        checked={!!isEnabled} 
                                        onCheckedChange={() => toggleService(s.id, isEditing)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                  </div>
              );
          case 'schedule':
              return (
                  <div className="animate-fade-in space-y-4">
                      <div className="flex justify-end mb-2">
                          <button className="text-xs text-barber-gold hover:underline">Copiar seg-sex</button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {target.workSchedule?.map((day, idx) => renderScheduleRow(day, idx, isEditing))}
                      </div>
                  </div>
              );
      }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* Header Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card noPadding className="md:col-span-2 p-5 bg-gradient-to-r from-zinc-900 to-zinc-950 border-l-4 border-l-barber-gold flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                  <h2 className="text-xl font-bold text-white text-center sm:text-left">Equipe NS Studio</h2>
                  <p className="text-sm text-muted mt-1 text-center sm:text-left">Gerencie performance e escalas.</p>
              </div>
              <Button onClick={handleOpenAddModal} leftIcon={<UserPlus size={18} />} className="w-full sm:w-auto">
                Novo Profissional
              </Button>
          </Card>
          
          <Card noPadding className="p-4 flex flex-col justify-center border-l-4 border-l-emerald-500">
              <span className="text-xs font-bold uppercase text-muted tracking-wider">Vendas Totais (Mês)</span>
              <div className="text-2xl font-bold text-white mt-1">R$ {teamStats.totalSales.toLocaleString('pt-BR')}</div>
              <div className="text-[10px] text-emerald-500 font-bold mt-1 flex items-center gap-1">
                  <TrendingUp size={12} /> {teamStats.goalProgress}% da meta global
              </div>
          </Card>

          <Card noPadding className="p-4 flex flex-col justify-center border-l-4 border-l-sky-500">
              <span className="text-xs font-bold uppercase text-muted tracking-wider">Profissionais</span>
              <div className="text-2xl font-bold text-white mt-1">{teamStats.activeBarbers} <span className="text-sm text-muted font-normal">Ativos</span></div>
              <div className="text-[10px] text-sky-500 font-bold mt-1">
                  Média Com.: {teamStats.avgCommission}%
              </div>
          </Card>
      </div>

      {/* Podium Section */}
      <div className="relative overflow-hidden md:overflow-visible pt-8">
         <div className="absolute inset-0 bg-gradient-to-b from-barber-gold/5 to-transparent h-40 pointer-events-none rounded-3xl"></div>
         <div className="relative z-10 text-center mb-8">
             <h3 className="text-lg font-bold text-barber-gold uppercase tracking-widest flex items-center justify-center gap-2">
                 <Trophy size={20} /> Top Performance
             </h3>
         </div>
         
         {/* Responsive Podium Container */}
         <div className="flex items-end justify-center gap-2 md:gap-8 min-h-[220px] pb-4 px-2">
             {rankedBarbers.slice(0, 3).map((barber, index) => {
                 // Order: 2nd, 1st, 3rd visually
                 const visualOrder = index === 0 ? 1 : index === 1 ? 0 : 2; 
                 const isFirst = index === 0;
                 const heightClass = isFirst ? 'h-40 md:h-48' : index === 1 ? 'h-32 md:h-40' : 'h-24 md:h-32';
                 
                 return (
                     <div key={barber.id} className={`flex flex-col items-center transition-all hover:-translate-y-2 duration-300 order-${visualOrder} w-28 md:w-40 shrink-0`}>
                         <div className="relative mb-3">
                             <BarberAvatar 
                                barber={barber} 
                                size={isFirst ? 'xl' : 'lg'} 
                                className={`border-4 ${isFirst ? 'border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.4)]' : 'border-zinc-700'}`}
                             />
                             {isFirst && <Crown size={32} className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 fill-yellow-400 drop-shadow-lg animate-bounce" style={{ animationDuration: '2s' }} />}
                             <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap`}>
                                 R$ {barber.currentSales}
                             </div>
                         </div>
                         <div className={`w-full ${heightClass} bg-gradient-to-b ${getGradient(index)} rounded-t-2xl flex flex-col justify-end p-2 md:p-4 shadow-2xl relative overflow-hidden group`}>
                             <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                             <div className="relative z-10 text-center">
                                 <span className="text-2xl md:text-4xl font-black text-white/20 absolute top-2 left-1/2 -translate-x-1/2 select-none">{index + 1}</span>
                                 <h4 className="text-white font-bold text-xs md:text-sm truncate leading-tight">{barber.name.split(' ')[0]}</h4>
                                 <span className="text-[9px] md:text-[10px] text-white/70 truncate block">{barber.specialty}</span>
                             </div>
                         </div>
                     </div>
                 )
             })}
         </div>
      </div>

      {/* Main List Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
          <div className="w-full md:w-96">
            <Input 
                placeholder="Buscar profissional..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                containerClassName="mb-0"
                className="bg-zinc-950 border-zinc-800"
            />
          </div>
          <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800 shrink-0">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-muted hover:text-white'}`}
              >
                  <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-muted hover:text-white'}`}
              >
                  <List size={18} />
              </button>
          </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBarbers.map(barber => {
                const percent = Math.min(((barber.currentSales || 0) / (barber.goal || 1) * 100), 100);
                return (
                    <Card key={barber.id} noPadding className="group hover:border-barber-gold/50 transition-all duration-300 overflow-hidden bg-zinc-900">
                        {/* Card Header Background */}
                        <div className="h-20 bg-gradient-to-r from-zinc-800 to-zinc-900 relative">
                            {/* Engrenagem removida daqui */}
                        </div>
                        
                        <div className="px-6 pb-6 -mt-10 relative">
                            <div className="flex justify-between items-end mb-3">
                                <BarberAvatar barber={barber} size="lg" className="shadow-xl" />
                                <div className="text-right">
                                    <div className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 inline-block mb-1">
                                        ● Online
                                    </div>
                                    <div className="flex items-center justify-end gap-1 text-xs text-yellow-500 font-bold">
                                        {barber.rating} <Star size={12} fill="#eab308" />
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-main">{barber.name}</h3>
                            <p className="text-xs text-muted mb-4">{barber.specialty}</p>

                            <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800 mb-4">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-muted">Progresso da Meta</span>
                                    <span className="text-white font-bold">{percent.toFixed(0)}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-barber-gold to-yellow-300" style={{ width: `${percent}%` }}></div>
                                </div>
                                <div className="flex justify-between text-[10px] mt-1 text-muted">
                                    <span>R$ {barber.currentSales}</span>
                                    <span>Alvo: R$ {barber.goal}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    className="w-full text-xs h-9" 
                                    onClick={() => setViewingAgenda(barber)}
                                >
                                    <Calendar size={14} className="mr-1" /> Agenda
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="w-full text-xs h-9" 
                                    onClick={() => handleEditClick(barber, 'profile')}
                                >
                                    <User size={14} className="mr-1" /> Perfil
                                </Button>
                            </div>
                        </div>
                    </Card>
                )
            })}
          </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
          <div className="flex flex-col gap-3">
              {/* Desktop Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-muted uppercase tracking-wider">
                  <div className="col-span-4">Profissional</div>
                  <div className="col-span-3">Status</div>
                  <div className="col-span-3">Meta Mensal</div>
                  <div className="col-span-2 text-right">Ações</div>
              </div>

              {filteredBarbers.map(barber => {
                  const percent = Math.min(((barber.currentSales || 0) / (barber.goal || 1) * 100), 100);
                  return (
                      <Card key={barber.id} noPadding className="p-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-center bg-zinc-900 border-zinc-800 hover:border-barber-gold/30 transition-all group">
                          {/* Profile */}
                          <div className="w-full md:col-span-4 flex items-center gap-3">
                              <BarberAvatar barber={barber} size="md" />
                              <div>
                                  <h4 className="font-bold text-main">{barber.name}</h4>
                                  <span className="text-xs text-muted">{barber.specialty}</span>
                              </div>
                          </div>

                          {/* Status */}
                          <div className="w-full md:col-span-3 flex items-center justify-between md:justify-start gap-4">
                              <span className="md:hidden text-xs font-bold text-muted uppercase">Status</span>
                              <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span className="text-xs font-bold text-emerald-500">Online</span>
                              </div>
                              <div className="text-xs text-yellow-500 flex items-center gap-1 font-bold">
                                  {barber.rating} <Star size={10} fill="#eab308" />
                              </div>
                          </div>

                          {/* Goal */}
                          <div className="w-full md:col-span-3 space-y-1">
                              <div className="flex justify-between md:hidden">
                                  <span className="text-xs font-bold text-muted uppercase">Meta</span>
                                  <span className="text-xs text-white font-bold">{percent.toFixed(0)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                                  <div className="h-full bg-gradient-to-r from-barber-gold to-yellow-300" style={{ width: `${percent}%` }}></div>
                              </div>
                              <div className="text-[10px] text-muted flex justify-between">
                                  <span>R$ {barber.currentSales}</span>
                                  <span className="hidden md:inline">/ R$ {barber.goal}</span>
                              </div>
                          </div>

                          {/* Actions */}
                          <div className="w-full md:col-span-2 flex items-center justify-end gap-2 mt-2 md:mt-0">
                              <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-zinc-800" onClick={() => handleEditClick(barber, 'profile')}>
                                  <ChevronRight size={14} />
                              </Button>
                          </div>
                      </Card>
                  )
              })}
          </div>
      )}

      {/* MODAL: AGENDA DE HOJE */}
      {viewingAgenda && (
          <Modal
            isOpen={!!viewingAgenda}
            onClose={() => setViewingAgenda(null)}
            title={
                <div className="flex items-center gap-3">
                    <BarberAvatar barber={viewingAgenda} size="sm" />
                    <div>
                        <span className="block text-sm font-bold">Agenda de Hoje</span>
                        <span className="text-xs text-muted font-normal">{viewingAgenda.name}</span>
                    </div>
                </div>
            }
            size="md"
            footer={<Button variant="ghost" onClick={() => setViewingAgenda(null)} className="w-full">Fechar</Button>}
          >
              <div className="space-y-4">
                  {/* Mock Appointments for Demo */}
                  {[
                      { time: '09:00', client: 'Carlos Silva', service: 'Corte Degradê', status: 'concluido' },
                      { time: '10:30', client: 'Marcos Oliveira', service: 'Barba', status: 'confirmado' },
                      { time: '13:00', client: 'Almoço', service: '', status: 'bloqueado' },
                      { time: '14:00', client: 'Felipe Souza', service: 'Corte + Barba', status: 'pendente' },
                      { time: '15:30', client: '', service: '', status: 'livre' },
                      { time: '16:30', client: 'João Paulo', service: 'Platinado', status: 'confirmado' },
                  ].map((slot, idx) => (
                      <div key={idx} className="flex gap-4 items-center group">
                          <div className="w-12 text-xs font-bold text-muted text-right shrink-0">{slot.time}</div>
                          
                          <div className="relative flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full border-2 z-10 ${
                                  slot.status === 'livre' ? 'bg-zinc-900 border-zinc-700' :
                                  slot.status === 'concluido' ? 'bg-zinc-500 border-zinc-500' :
                                  slot.status === 'confirmado' ? 'bg-emerald-500 border-emerald-500' :
                                  slot.status === 'pendente' ? 'bg-amber-500 border-amber-500' :
                                  'bg-red-500 border-red-500' // bloqueado
                              }`}></div>
                              {idx !== 5 && <div className="w-0.5 h-full bg-zinc-800 absolute top-3"></div>}
                          </div>

                          <div className={`flex-1 p-3 rounded-xl border transition-all ${
                              slot.status === 'livre' ? 'bg-zinc-950/30 border-zinc-800/50 border-dashed text-muted hover:bg-zinc-900 hover:border-zinc-700 cursor-pointer' :
                              'bg-zinc-900 border-zinc-800 shadow-sm'
                          }`}>
                              {slot.status === 'livre' ? (
                                  <span className="text-xs italic">Horário Livre - Clique para agendar</span>
                              ) : slot.status === 'bloqueado' ? (
                                  <span className="text-xs font-bold text-red-400 flex items-center gap-2"><X size={12}/> Bloqueado / Pausa</span>
                              ) : (
                                  <div className="flex justify-between items-center">
                                      <div>
                                          <div className="font-bold text-sm text-white">{slot.client}</div>
                                          <div className="text-xs text-muted">{slot.service}</div>
                                      </div>
                                      <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                          slot.status === 'concluido' ? 'bg-zinc-800 text-zinc-400' :
                                          slot.status === 'confirmado' ? 'bg-emerald-500/10 text-emerald-500' :
                                          'bg-amber-500/10 text-amber-500'
                                      }`}>
                                          {slot.status}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </Modal>
      )}

      {/* ADD / EDIT MODAL */}
      <Modal
        isOpen={isAddModalOpen || !!editingBarber}
        onClose={() => { setIsAddModalOpen(false); setEditingBarber(null); }}
        title={editingBarber ? "Editar Profissional" : "Novo Profissional"}
        size="lg"
        footer={
            <div className="flex justify-between w-full">
                {editingBarber ? (
                    <Button variant="danger" size="icon" onClick={() => handleDeleteBarber(editingBarber.id)}><Trash2 size={18}/></Button>
                ) : <div></div>}
                
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => { setIsAddModalOpen(false); setEditingBarber(null); }}>Cancelar</Button>
                    <Button 
                        variant="primary" 
                        onClick={editingBarber ? handleSaveBarber : handleSaveNewBarber} 
                        leftIcon={<Check size={18} />}
                    >
                        {editingBarber ? 'Salvar Alterações' : 'Cadastrar'}
                    </Button>
                </div>
            </div>
        }
      >
          {/* Modal Tabs */}
          <div className="flex bg-zinc-950 p-1 rounded-xl mb-6 border border-zinc-800 overflow-x-auto">
              {(['profile', 'finance', 'services', 'schedule'] as ModalTab[]).map(tab => {
                  const labels = { profile: 'Perfil', finance: 'Financeiro', services: 'Serviços', schedule: 'Escala' };
                  const icons = { profile: User, finance: Banknote, services: Scissors, schedule: Clock };
                  const Icon = icons[tab];
                  return (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                    >
                        <Icon size={14} /> {labels[tab]}
                    </button>
                  )
              })}
          </div>

          <div className="min-h-[300px]">
              {renderModalContent(!!editingBarber)}
          </div>
      </Modal>
    </div>
  );
};

export default Team;
