
import React, { useState } from 'react';
import { Star, Scissors, Banknote, TrendingUp, Trophy, Target, Crown, Settings, Calendar, Briefcase, Check, UserPlus, Phone, Mail, User } from 'lucide-react';
import { Barber, WorkDay, Service } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { useToast } from './ui/Toast';

interface TeamProps {
  barbers: Barber[];
  services: Service[];
}

const Team: React.FC<TeamProps> = ({ barbers: initialBarbers, services }) => {
  const [barbers, setBarbers] = useState(initialBarbers);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBarber, setNewBarber] = useState<Partial<Barber>>({
      name: '',
      specialty: '',
      email: '',
      phone: '',
      commissionRate: 50,
      goal: 5000,
      rating: 5.0,
      avatar: '', 
      workSchedule: [],
      useCustomBuffer: false,
      bufferTime: 15,
      services: []
  });

  const rankedBarbers = [...barbers].sort((a, b) => (b.currentSales || 0) - (a.currentSales || 0));
  const filteredBarbers = barbers.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    b.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // --- Helpers ---
  const getInitials = (name: string) => {
      const names = name.split(' ');
      if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
  };

  const getRandomColor = (name: string) => {
      const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
      const index = name.length % colors.length;
      return colors[index];
  };

  const renderAvatar = (barber: Partial<Barber>, size: 'sm'|'md'|'lg'|'xl' = 'md', className = '') => {
      const sizeClasses = {
          sm: 'w-10 h-10 text-xs',
          md: 'w-16 h-16 text-xl',
          lg: 'w-20 h-20 text-2xl',
          xl: 'w-24 h-24 text-3xl'
      };

      return (
          <div className={`rounded-xl flex items-center justify-center font-bold text-white shadow-inner ${getRandomColor(barber.name || '')} ${sizeClasses[size]} ${className}`}>
              {getInitials(barber.name || '')}
          </div>
      );
  };

  const renderRoundAvatar = (barber: Partial<Barber>, size: 'sm'|'md'|'lg'|'xl' = 'md', className = '') => {
      const sizeClasses = {
          sm: 'w-10 h-10 text-xs',
          md: 'w-16 h-16 text-xl',
          lg: 'w-20 h-20 text-2xl',
          xl: 'w-24 h-24 text-3xl'
      };

      return (
          <div className={`rounded-full flex items-center justify-center font-bold text-white shadow-inner ${getRandomColor(barber.name || '')} ${sizeClasses[size]} ${className}`}>
              {getInitials(barber.name || '')}
          </div>
      );
  };

  // --- Handlers ---

  const handleOpenAddModal = () => {
      const defaultSchedule: WorkDay[] = [0, 1, 2, 3, 4, 5, 6].map(day => ({
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '19:00',
          breakStart: '12:00',
          breakEnd: '13:00',
          active: day !== 0
      }));

      setNewBarber({
          name: '',
          specialty: '',
          email: '',
          phone: '',
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
      setIsAddModalOpen(true);
  };

  const toggleService = (serviceId: string, isEditing: boolean) => {
      if (isEditing && editingBarber) {
         const currentServices = editingBarber.services || [];
         const newServices = currentServices.includes(serviceId)
            ? currentServices.filter(id => id !== serviceId)
            : [...currentServices, serviceId];
         setEditingBarber({ ...editingBarber, services: newServices });
      } else {
         const currentServices = newBarber.services || [];
         const newServices = currentServices.includes(serviceId)
            ? currentServices.filter(id => id !== serviceId)
            : [...currentServices, serviceId];
         setNewBarber({ ...newBarber, services: newServices });
      }
  };

  const handleSaveNewBarber = () => {
      if (!newBarber.name || !newBarber.specialty) {
          toast.error('Preencha os campos obrigatórios.');
          return;
      }
      const createdBarber: Barber = {
          id: Math.random().toString(36).substr(2, 9),
          name: newBarber.name!,
          specialty: newBarber.specialty!,
          avatar: '',
          email: newBarber.email,
          phone: newBarber.phone,
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

  const handleEditClick = (barber: Barber) => {
    const schedule = barber.workSchedule || [0,1,2,3,4,5,6].map(d => ({ 
        dayOfWeek: d, startTime: '09:00', endTime: '19:00', active: d !== 0 
    }));
    setEditingBarber({ ...barber, workSchedule: schedule, services: barber.services || [] });
  };

  const handleSaveBarber = () => {
    if (!editingBarber) return;
    setBarbers(prev => prev.map(b => b.id === editingBarber.id ? editingBarber : b));
    setEditingBarber(null);
    toast.success('Alterações salvas com sucesso!');
  };

  const updateSchedule = (dayIndex: number, field: keyof WorkDay, value: any, isEditing: boolean) => {
    if (isEditing && editingBarber && editingBarber.workSchedule) {
        const newSchedule = [...editingBarber.workSchedule];
        newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
        setEditingBarber({ ...editingBarber, workSchedule: newSchedule });
    } else if (!isEditing && newBarber.workSchedule) {
        const newSchedule = [...newBarber.workSchedule];
        newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
        setNewBarber({ ...newBarber, workSchedule: newSchedule });
    }
  };

  // --- Render Schedule Row ---
  const renderScheduleRow = (day: WorkDay, idx: number, isEditing: boolean) => (
    <div key={idx} className={`grid grid-cols-[50px_1fr_auto] sm:grid-cols-[60px_1fr_1fr_auto] gap-2 items-center p-2 rounded-lg border mb-2 transition-colors ${day.active ? 'bg-barber-950 border-barber-800' : 'bg-barber-950/30 border-barber-800/30 opacity-60'}`}>
        <div className="text-sm font-bold text-main text-center">{daysMap[day.dayOfWeek].slice(0,3)}</div>
        
        <div className="flex items-center gap-1 justify-center">
            <input 
                type="time" 
                value={day.startTime}
                onChange={(e) => updateSchedule(idx, 'startTime', e.target.value, isEditing)}
                disabled={!day.active}
                className="bg-barber-900 border border-barber-700 rounded px-1 text-xs text-main outline-none w-16 text-center h-8"
            />
            <span className="text-muted">-</span>
            <input 
                type="time" 
                value={day.endTime}
                onChange={(e) => updateSchedule(idx, 'endTime', e.target.value, isEditing)}
                disabled={!day.active}
                className="bg-barber-900 border border-barber-700 rounded px-1 text-xs text-main outline-none w-16 text-center h-8"
            />
        </div>

        <div className="hidden sm:flex items-center gap-1 justify-center">
            <input 
                type="time" 
                value={day.breakStart || ''}
                onChange={(e) => updateSchedule(idx, 'breakStart', e.target.value, isEditing)}
                disabled={!day.active}
                className="bg-barber-900 border border-barber-700 rounded px-1 text-xs text-main outline-none w-16 text-center h-8"
            />
            <span className="text-muted">-</span>
            <input 
                type="time" 
                value={day.breakEnd || ''}
                onChange={(e) => updateSchedule(idx, 'breakEnd', e.target.value, isEditing)}
                disabled={!day.active}
                className="bg-barber-900 border border-barber-700 rounded px-1 text-xs text-main outline-none w-16 text-center h-8"
            />
        </div>

        <div className="flex justify-end">
             <button 
                onClick={() => updateSchedule(idx, 'active', !day.active, isEditing)}
                className={`w-10 h-6 rounded-full p-1 transition-colors ${day.active ? 'bg-green-500' : 'bg-gray-700'}`}
            >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${day.active ? 'translate-x-4' : 'translate-x-0'}`}></div>
            </button>
        </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header */}
      <Card className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-500/5 via-barber-900 to-barber-900">
        <div>
           <h2 className="text-2xl font-bold text-main flex items-center gap-2">
             <Trophy className="text-amber-500" /> Gestão de Equipe
           </h2>
           <p className="text-muted text-sm mt-1">Gerencie barbeiros, comissões e escalas.</p>
        </div>
        <Button onClick={handleOpenAddModal} leftIcon={<UserPlus size={18} />}>
            Adicionar Profissional
        </Button>
      </Card>

      {/* Top Performance */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-barber-900 to-barber-950">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
           <Trophy size={120} />
        </div>
        <div className="relative z-10">
           <h2 className="text-xl font-bold text-main mb-2 flex items-center gap-2">
             <Crown className="text-yellow-500" size={20} /> Top Performance
           </h2>
           
           <div className="flex items-end gap-6 overflow-x-auto pb-4 pt-4 scrollbar-hide">
              {rankedBarbers.slice(0, 3).map((barber, index) => {
                 const isFirst = index === 0;
                 return (
                   <div key={barber.id} className={`flex flex-col items-center flex-shrink-0 ${isFirst ? 'scale-110 -mt-2' : 'opacity-90'}`}>
                      <div className="relative">
                        {renderRoundAvatar(barber, isFirst ? 'xl' : 'lg', `border-4 ${isFirst ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]' : 'border-gray-600'}`)}
                        {isFirst && <div className="absolute -top-6 left-1/2 -translate-x-1/2"><Crown size={28} className="text-yellow-500 fill-yellow-500" /></div>}
                        <Badge variant={isFirst ? 'vip' : 'default'} className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                           #{index + 1}
                        </Badge>
                      </div>
                      <div className="text-center mt-4">
                         <h3 className={`font-bold text-main ${isFirst ? 'text-lg' : 'text-sm'}`}>{barber.name}</h3>
                         <div className="text-green-500 font-bold text-sm">R$ {barber.currentSales}</div>
                      </div>
                   </div>
                 )
              })}
           </div>
        </div>
      </Card>

      {/* List */}
      <div className="space-y-4">
          <Input 
            placeholder="Buscar por nome ou especialidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBarbers.map(barber => (
                <Card key={barber.id} noPadding className="group hover:border-barber-gold/50 transition-colors">
                    <div className="p-6 flex items-start gap-4 relative">
                        <div className="absolute top-4 right-4">
                            <Button size="icon" variant="ghost" onClick={() => handleEditClick(barber)}><Settings size={18} /></Button>
                        </div>
                        {renderAvatar(barber, 'md')}
                        <div>
                            <h3 className="text-lg font-bold text-main">{barber.name}</h3>
                            <div className="flex items-center gap-2 mb-2 text-xs">
                                <span className="text-yellow-500 flex items-center gap-1 font-bold"><Star size={12} fill="#eab308" /> {barber.rating}</span>
                                <span className="text-muted">• {barber.specialty}</span>
                            </div>
                            <div className="mt-2 text-xs text-muted">
                                <span>Meta: {((barber.currentSales || 0) / (barber.goal || 1) * 100).toFixed(0)}%</span>
                                <div className="w-full h-1.5 bg-barber-950 rounded-full mt-1 overflow-hidden">
                                    <div className="h-full bg-barber-gold" style={{ width: `${Math.min(((barber.currentSales || 0) / (barber.goal || 1) * 100), 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 border-t border-barber-800 divide-x divide-barber-800 bg-barber-950/30">
                        <div className="p-3 text-center">
                            <div className="text-xs text-muted uppercase font-bold">Faturamento</div>
                            <div className="font-bold text-main">R$ {barber.currentSales}</div>
                        </div>
                        <div className="p-3 text-center">
                            <div className="text-xs text-muted uppercase font-bold">Comissão</div>
                            <div className="font-bold text-barber-gold">{barber.commissionRate}%</div>
                        </div>
                        <div className="p-3 text-center">
                            <div className="text-xs text-muted uppercase font-bold">Serviços</div>
                            <div className="font-bold text-main">{barber.services?.length || 0}</div>
                        </div>
                    </div>
                </Card>
            ))}
          </div>
      </div>

      {/* ADD MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Novo Profissional"
        size="lg"
        footer={
            <>
                <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" onClick={handleSaveNewBarber} leftIcon={<Check size={18} />}>Salvar Cadastro</Button>
            </>
        }
      >
          <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <Input label="Nome Completo" value={newBarber.name} onChange={e => setNewBarber({...newBarber, name: e.target.value})} icon={<User size={16}/>} />
                 <Input label="Especialidade" value={newBarber.specialty} onChange={e => setNewBarber({...newBarber, specialty: e.target.value})} icon={<Scissors size={16}/>} />
                 <Input label="E-mail" type="email" value={newBarber.email} onChange={e => setNewBarber({...newBarber, email: e.target.value})} icon={<Mail size={16}/>} />
                 <Input label="Telefone" type="tel" value={newBarber.phone} onChange={e => setNewBarber({...newBarber, phone: e.target.value})} icon={<Phone size={16}/>} />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <Input label="Meta Mensal (R$)" type="number" value={newBarber.goal} onChange={e => setNewBarber({...newBarber, goal: Number(e.target.value)})} icon={<Target size={16}/>} />
                <Input label="Comissão (%)" type="number" value={newBarber.commissionRate} onChange={e => setNewBarber({...newBarber, commissionRate: Number(e.target.value)})} icon={<Banknote size={16}/>} />
             </div>

             <Card noPadding>
                <div className="p-3 border-b border-barber-800 bg-barber-950 font-bold text-sm text-main flex items-center gap-2">
                    <Scissors size={14} className="text-blue-400" /> Serviços Habilitados
                </div>
                <div className="p-4 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {services.map(s => (
                        <div key={s.id} onClick={() => toggleService(s.id, false)} className={`p-2 rounded border cursor-pointer flex items-center gap-2 text-xs transition-colors ${newBarber.services?.includes(s.id) ? 'bg-barber-gold/10 border-barber-gold text-main' : 'bg-barber-900 border-barber-800 text-muted'}`}>
                            <div className={`w-3 h-3 border flex items-center justify-center ${newBarber.services?.includes(s.id) ? 'bg-barber-gold border-barber-gold' : 'border-gray-600'}`}>
                                {newBarber.services?.includes(s.id) && <Check size={10} className="text-black" />}
                            </div>
                            {s.name}
                        </div>
                    ))}
                </div>
             </Card>

             <Card noPadding>
                <div className="p-3 border-b border-barber-800 bg-barber-950 font-bold text-sm text-main flex items-center gap-2">
                    <Calendar size={14} className="text-green-400" /> Escala de Trabalho
                </div>
                <div className="p-4 max-h-60 overflow-y-auto">
                    {newBarber.workSchedule?.map((day, idx) => renderScheduleRow(day, idx, false))}
                </div>
             </Card>
          </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        isOpen={!!editingBarber}
        onClose={() => setEditingBarber(null)}
        title="Gerenciar Profissional"
        size="lg"
        footer={
            <>
                <Button variant="ghost" onClick={() => setEditingBarber(null)}>Cancelar</Button>
                <Button variant="primary" onClick={handleSaveBarber} leftIcon={<Check size={18} />}>Salvar Alterações</Button>
            </>
        }
      >
          {editingBarber && (
             <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-barber-950 rounded-xl border border-barber-800">
                    {renderAvatar(editingBarber)}
                    <div>
                        <h3 className="text-xl font-bold text-main">{editingBarber.name}</h3>
                        <p className="text-sm text-muted">{editingBarber.email || 'Sem e-mail cadastrado'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input label="Meta Mensal (R$)" type="number" value={editingBarber.goal} onChange={e => setEditingBarber({...editingBarber, goal: Number(e.target.value)})} icon={<Target size={16}/>} />
                    <Input label="Comissão (%)" type="number" value={editingBarber.commissionRate} onChange={e => setEditingBarber({...editingBarber, commissionRate: Number(e.target.value)})} icon={<Banknote size={16}/>} />
                </div>

                <Card noPadding>
                    <div className="p-3 border-b border-barber-800 bg-barber-950 font-bold text-sm text-main flex items-center gap-2">
                        <Scissors size={14} className="text-blue-400" /> Serviços Habilitados
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        {services.map(s => (
                            <div key={s.id} onClick={() => toggleService(s.id, true)} className={`p-2 rounded border cursor-pointer flex items-center gap-2 text-xs transition-colors ${editingBarber.services?.includes(s.id) ? 'bg-barber-gold/10 border-barber-gold text-main' : 'bg-barber-900 border-barber-800 text-muted'}`}>
                                <div className={`w-3 h-3 border flex items-center justify-center ${editingBarber.services?.includes(s.id) ? 'bg-barber-gold border-barber-gold' : 'border-gray-600'}`}>
                                    {editingBarber.services?.includes(s.id) && <Check size={10} className="text-black" />}
                                </div>
                                {s.name}
                            </div>
                        ))}
                    </div>
                </Card>

                <Card noPadding>
                    <div className="p-3 border-b border-barber-800 bg-barber-950 font-bold text-sm text-main flex items-center gap-2">
                        <Calendar size={14} className="text-green-400" /> Escala de Trabalho
                    </div>
                    <div className="p-4 max-h-60 overflow-y-auto">
                        <div className="hidden sm:grid grid-cols-[60px_1fr_1fr_auto] gap-2 mb-2 text-[10px] uppercase font-bold text-muted px-2">
                            <div className="text-center">Dia</div>
                            <div className="text-center">Horário</div>
                            <div className="text-center">Pausa</div>
                            <div className="text-right">Status</div>
                        </div>
                        {editingBarber.workSchedule?.map((day, idx) => renderScheduleRow(day, idx, true))}
                    </div>
                </Card>
             </div>
          )}
      </Modal>
    </div>
  );
};

export default Team;
