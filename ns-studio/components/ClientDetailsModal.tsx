
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Sparkles, AlertTriangle, Coffee, MessageCircle, Calendar, DollarSign, StickyNote, History, Award, Plus, Trash2, Bell, Check, Clock, Camera, Image as ImageIcon, Crown, LayoutGrid, UserX, Ban, ShieldAlert, Gift, Star, Upload, Maximize2, Download, Phone, Edit, CalendarDays, Globe, Store, User, Cake, FileText, Scissors, ChevronDown, ChevronUp, Save, Mail, Instagram } from 'lucide-react';
import { Client, ClientPhoto, LoyaltyTier } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Textarea from './ui/Textarea';
import Badge from './ui/Badge';
import Switch from './ui/Switch';
import Select from './ui/Select';
import { useToast } from './ui/Toast';

interface ClientDetailsModalProps {
  client: Client;
  onClose: () => void;
  onUpdate?: (client: Client) => void;
  onEdit?: () => void;
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ client, onClose, onUpdate, onEdit }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'gallery' | 'noshow'>('overview');
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const toast = useToast();
  
  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState({ 
      name: client.name, 
      phone: client.phone,
      birthDate: client.birthDate || '',
      cpf: client.cpf || '',
      email: client.email || '',
      instagram: client.instagram || ''
  });

  // CRM Enhancements State
  const [tags, setTags] = useState<string[]>(client.tags);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  
  const [notes, setNotes] = useState(client.internalNotes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  // Preferences State
  const [drinkPref, setDrinkPref] = useState(client.drinkPreference || '');
  const [convStyle, setConvStyle] = useState(client.conversationStyle || '');
  
  const [reminderDays, setReminderDays] = useState(30);
  const [reminderActive, setReminderActive] = useState(false);

  // Gallery State
  const [photos, setPhotos] = useState<ClientPhoto[]>(client.photos || []);
  const [selectedPhoto, setSelectedPhoto] = useState<ClientPhoto | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newPhotoDescription, setNewPhotoDescription] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock points logic if not provided
  const points = client.loyaltyPoints || (client.totalVisits % 10);
  const maxPoints = 10;
  
  useEffect(() => {
      setEditData({ 
          name: client.name, 
          phone: client.phone,
          birthDate: client.birthDate || '',
          cpf: client.cpf || '',
          email: client.email || '',
          instagram: client.instagram || ''
      });
  }, [client]);
  
  // Calculate Tier based on total visits (Mock logic)
  const calculateTier = (visits: number): LoyaltyTier => {
      if (visits > 30) return 'Diamante';
      if (visits > 15) return 'Ouro';
      if (visits > 5) return 'Prata';
      return 'Bronze';
  };
  
  const tier = client.loyaltyTier || calculateTier(client.totalVisits);

  const getTierStyles = (t: LoyaltyTier) => {
      switch(t) {
          case 'Diamante': return { bg: 'bg-cyan-500/10', border: 'border-cyan-500', text: 'text-cyan-500', icon: Crown, shadow: 'shadow-cyan-500/20' };
          case 'Ouro': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500', text: 'text-yellow-500', icon: Award, shadow: 'shadow-yellow-500/20' };
          case 'Prata': return { bg: 'bg-gray-400/10', border: 'border-gray-400', text: 'text-gray-400', icon: Award, shadow: 'shadow-gray-500/20' };
          default: return { bg: 'bg-orange-700/10', border: 'border-orange-800', text: 'text-orange-700', icon: Award, shadow: 'shadow-orange-500/20' };
      }
  };

  const tierStyle = getTierStyles(tier);
  const TierIcon = tierStyle.icon;

  // Helper for Origin Info
  const getOriginInfo = (origin?: string) => {
      switch(origin) {
          case 'public_link': return { label: 'Via Link', icon: Globe, color: 'text-blue-400' };
          case 'whatsapp': return { label: 'Via WhatsApp', icon: MessageCircle, color: 'text-green-500' };
          default: return { label: 'Balcão/Manual', icon: Store, color: 'text-zinc-400' };
      }
  };
  
  const originInfo = getOriginInfo(client.origin);
  const OriginIcon = originInfo.icon;

  const handleSaveProfile = () => {
      if (onUpdate) {
          onUpdate({ 
              ...client, 
              name: editData.name, 
              phone: editData.phone,
              birthDate: editData.birthDate,
              cpf: editData.cpf,
              email: editData.email,
              instagram: editData.instagram
          });
      }
      setIsEditingProfile(false);
  };

  const handleCancelEdit = () => {
      setEditData({ 
          name: client.name, 
          phone: client.phone,
          birthDate: client.birthDate || '',
          cpf: client.cpf || '',
          email: client.email || '',
          instagram: client.instagram || ''
      });
      setIsEditingProfile(false);
  };

  const handleSaveNotes = () => {
    setIsSavingNotes(true);
    setTimeout(() => {
        setIsSavingNotes(false);
        // Here you would typically update the client object via API
        toast.success("Ficha do cliente atualizada com sucesso");
    }, 1000);
  };

  const handleAddTag = () => {
      if(newTag && !tags.includes(newTag)) {
          setTags([...tags, newTag]);
          setNewTag('');
          setIsAddingTag(false);
      }
  };

  const handleRemoveTag = (tag: string) => {
      setTags(tags.filter(t => t !== tag));
  };

  const handleWhatsApp = () => {
      window.open(`https://wa.me/55${client.phone.replace(/\D/g, '')}`, '_blank');
  };

  // --- Gallery Logic: Grouping and Upload ---
  
  const groupedPhotos = useMemo(() => {
      const groups: Record<string, ClientPhoto[]> = {};
      
      // Sort photos by date descending
      const sortedPhotos = [...photos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      sortedPhotos.forEach(photo => {
          const dateKey = photo.date;
          if (!groups[dateKey]) {
              groups[dateKey] = [];
          }
          groups[dateKey].push(photo);
      });

      return Object.entries(groups).sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime());
  }, [photos]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
          setPendingFiles(Array.from(files));
          setIsUploading(true);
      }
  };

  const handleConfirmUpload = () => {
      if (pendingFiles.length === 0) return;

      const newPhotos: ClientPhoto[] = pendingFiles.map((file) => ({
          id: Math.random().toString(36).substr(2, 9),
          url: URL.createObjectURL(file), 
          date: new Date().toISOString().split('T')[0],
          type: 'after', 
          notes: newPhotoDescription || 'Sem descrição'
      }));
      
      setPhotos(prev => [...newPhotos, ...prev]);
      
      // Reset State
      setPendingFiles([]);
      setNewPhotoDescription('');
      setIsUploading(false);
      toast.success(`${newPhotos.length} fotos adicionadas ao histórico!`);
  };

  const handleDeletePhoto = (id: string) => {
      if(confirm('Deseja excluir esta foto?')) {
          setPhotos(prev => prev.filter(p => p.id !== id));
          if(selectedPhoto?.id === id) setSelectedPhoto(null);
      }
  };

  // -- Render Footer Buttons Logic --
  const renderFooter = () => {
      if (isEditingProfile) {
          return (
            <div className="flex justify-end w-full gap-2">
                <Button variant="ghost" onClick={handleCancelEdit}>Cancelar</Button>
                <Button variant="primary" onClick={handleSaveProfile} leftIcon={<Check size={18} />}>Salvar Alterações</Button>
            </div>
          );
      }

      return (
        <div className="flex justify-between w-full items-center">
            <Button variant="danger" size="icon" onClick={() => {}} title="Bloquear Cliente"><UserX size={18} /></Button>
            <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>Fechar</Button>
                <Button variant="primary" onClick={handleSaveNotes} leftIcon={<Check size={18} />}>Salvar Ficha</Button>
            </div>
        </div>
      );
  };

  return (
    <Modal
        isOpen={true}
        onClose={onClose}
        title={
            <div className="flex items-center justify-between w-full pr-8">
               <div className="flex items-center gap-4">
                   <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold bg-barber-900 border-2 ${tierStyle.border} ${tierStyle.text} ${tierStyle.shadow} shadow-lg relative`}>
                       {client.name.charAt(0)}
                       <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${tierStyle.bg} border border-barber-900 flex items-center justify-center`}>
                           <TierIcon size={10} className={tierStyle.text} />
                       </div>
                   </div>
                   
                   <div>
                       <h3 className="text-xl font-bold text-main leading-none flex items-center gap-2">
                           {client.name}
                           {tags.includes('VIP') && <Crown size={16} className="text-barber-gold fill-barber-gold" />}
                       </h3>
                       <div className="flex items-center gap-3 mt-1.5">
                           <Badge size="sm" className={`${tierStyle.bg} ${tierStyle.text} border-none font-bold`}>
                              {tier}
                           </Badge>
                           <div className="h-3 w-px bg-zinc-700"></div>
                           <span className={`text-xs flex items-center gap-1 font-medium ${originInfo.color}`}>
                               <OriginIcon size={12} /> {originInfo.label}
                           </span>
                       </div>
                   </div>
               </div>
               
               {/* Header Actions - Hidden if Editing */}
               {!isEditingProfile && (
                   <div className="flex items-center gap-3 pl-6 border-l border-zinc-800 ml-6">
                       <button onClick={handleWhatsApp} className="w-8 h-8 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-500 flex items-center justify-center transition-colors" title="WhatsApp">
                           <MessageCircle size={16} />
                       </button>
                       <button className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-muted hover:text-white flex items-center justify-center transition-colors" title="Ligar">
                           <Phone size={16} />
                       </button>
                       <button onClick={() => setIsEditingProfile(true)} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-muted hover:text-white flex items-center justify-center transition-colors" title="Editar Cadastro">
                           <Edit size={16} />
                       </button>
                   </div>
               )}
            </div>
        }
        size="lg"
        footer={renderFooter()}
    >
        {isEditingProfile ? (
            // --- EDIT MODE LAYOUT ---
            <div className="space-y-6 animate-fade-in p-2">
                <div className="flex items-center gap-2 mb-4 text-barber-gold font-bold text-sm uppercase tracking-wider border-b border-zinc-800 pb-2">
                    <Edit size={16} /> Editando Dados Pessoais
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                        label="Nome Completo"
                        value={editData.name}
                        onChange={e => setEditData({...editData, name: e.target.value})}
                        icon={<User size={18} />}
                        placeholder="Nome do Cliente"
                        autoFocus
                    />
                    <Input 
                        label="Telefone / WhatsApp"
                        value={editData.phone}
                        onChange={e => setEditData({...editData, phone: e.target.value})}
                        icon={<Phone size={18} />}
                        placeholder="(00) 00000-0000"
                    />
                    
                    <Input 
                        label="E-mail"
                        type="email"
                        value={editData.email}
                        onChange={e => setEditData({...editData, email: e.target.value})}
                        icon={<Mail size={18} />}
                        placeholder="email@cliente.com"
                    />
                    <Input 
                        label="Instagram"
                        value={editData.instagram}
                        onChange={e => setEditData({...editData, instagram: e.target.value})}
                        icon={<Instagram size={18} />}
                        placeholder="@usuario"
                    />

                    <Input 
                        label="CPF"
                        value={editData.cpf}
                        onChange={e => setEditData({...editData, cpf: e.target.value})}
                        icon={<FileText size={18} />}
                        placeholder="000.000.000-00"
                    />
                    <Input 
                        label="Data de Nascimento"
                        type="date"
                        value={editData.birthDate}
                        onChange={e => setEditData({...editData, birthDate: e.target.value})}
                        icon={<Cake size={18} />}
                    />
                </div>
                
                <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 text-xs text-muted">
                    <p className="flex items-center gap-2 mb-2 font-bold"><ShieldAlert size={14} className="text-amber-500"/> Atenção</p>
                    <p>Ao alterar o número de telefone, o histórico de agendamentos vinculados será mantido, mas o link de confirmação via WhatsApp será enviado para o novo número.</p>
                </div>
            </div>
        ) : (
            // --- VIEW MODE LAYOUT (Tabs) ---
            <>
                <div className="flex bg-barber-950 p-1 rounded-xl mb-6 border border-barber-800">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-barber-800 text-white shadow' : 'text-muted hover:text-white'}`}
                    >
                        Visão Geral
                    </button>
                    <button 
                        onClick={() => setActiveTab('gallery')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'gallery' ? 'bg-barber-800 text-white shadow' : 'text-muted hover:text-white'}`}
                    >
                        Galeria
                    </button>
                    <button 
                        onClick={() => setActiveTab('noshow')}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'noshow' ? 'bg-red-500/10 text-red-500 shadow' : 'text-muted hover:text-red-400'}`}
                    >
                        Histórico & No-Show
                    </button>
                </div>

                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <Card noPadding className="p-4 bg-barber-900/50 border-barber-800">
                                <div className="text-muted text-xs font-bold uppercase mb-1">Total Visitas</div>
                                <div className="text-2xl font-bold text-main flex items-center gap-2">
                                    {client.totalVisits} <History size={16} className="text-barber-gold" />
                                </div>
                            </Card>
                            <Card noPadding className="p-4 bg-barber-900/50 border-barber-800">
                                <div className="text-muted text-xs font-bold uppercase mb-1">LTV (Gasto)</div>
                                <div className="text-2xl font-bold text-emerald-500 flex items-center gap-2">
                                    R$ {client.ltv || '0'} <DollarSign size={16} />
                                </div>
                            </Card>
                            <Card noPadding className="p-4 bg-barber-900/50 border-barber-800">
                                <div className="text-muted text-xs font-bold uppercase mb-1">Fidelidade</div>
                                <div className="text-2xl font-bold text-sky-500 flex items-center gap-2">
                                    {points}/{maxPoints} <span className="text-xs text-muted">pts</span>
                                </div>
                            </Card>
                        </div>

                        {/* Card Último Serviço */}
                        {(() => {
                            const lastAppt = client.lastAppointmentDetails;
                            
                            // Formatação Inteligente
                            const serviceDisplay = lastAppt 
                                ? lastAppt.services.join(' + ') 
                                : client.lastService || 'Sem registro recente';
                            
                            const professionalDisplay = lastAppt
                                ? lastAppt.professionals.join(' & ')
                                : 'Profissional não identificado';

                            const dateDisplay = lastAppt
                                ? new Date(lastAppt.date).toLocaleDateString('pt-BR')
                                : (client.lastVisit ? new Date(client.lastVisit).toLocaleDateString('pt-BR') : '--/--/----');

                            return (
                                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                                    <div>
                                        <h4 className="text-xs font-bold text-muted uppercase flex items-center gap-2 mb-1">
                                            <Scissors size={14} className="text-blue-500" /> Último Serviço Realizado
                                        </h4>
                                        <div className="text-lg font-bold text-white leading-tight">
                                            {serviceDisplay}
                                        </div>
                                        <div className="text-xs text-muted mt-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                            <span className="flex items-center gap-1"><Calendar size={12} /> {dateDisplay}</span>
                                            <span className="hidden sm:inline w-1 h-1 rounded-full bg-zinc-700"></span>
                                            <span className="flex items-center gap-1"><User size={12} /> Com: {professionalDisplay}</span>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="secondary" className="hover:bg-blue-600 hover:text-white transition-colors shrink-0 ml-2">Repetir</Button>
                                </div>
                            );
                        })()}

                        {/* Card Fidelidade Visual */}
                        <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-barber-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
                            {/* Background Pattern */}
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Crown size={120} />
                            </div>
                            
                            <div className="flex justify-between items-center mb-4 relative z-10">
                                <h4 className="text-sm font-bold text-barber-gold uppercase tracking-widest flex items-center gap-2">
                                    <Award size={16} /> Cartão Fidelidade
                                </h4>
                                <span className="text-xs text-muted font-medium bg-zinc-800 px-2 py-1 rounded">
                                    Resgate: Corte Grátis
                                </span>
                            </div>

                            <div className="flex justify-between items-center gap-2 relative z-10">
                                {Array.from({ length: maxPoints }).map((_, i) => {
                                    const isFilled = i < points;
                                    return (
                                        <div key={i} className="flex flex-col items-center gap-1 flex-1">
                                            <div className={`w-full aspect-square rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isFilled ? 'bg-barber-gold border-barber-gold text-black shadow-[0_0_10px_rgba(245,158,11,0.4)] scale-105' : 'bg-transparent border-zinc-700 text-zinc-700'}`}>
                                                {isFilled ? (
                                                    <Check size={14} strokeWidth={4} />
                                                ) : i === maxPoints - 1 ? (
                                                    <Gift size={14} />
                                                ) : (
                                                    <span className="text-[10px] font-bold opacity-50">{i + 1}</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            <div className="mt-4 text-center relative z-10">
                                <p className="text-xs text-gray-400">
                                    Faltam <strong className="text-white">{maxPoints - points}</strong> visitas para ganhar o prêmio!
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Tags & Preferences */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-main flex items-center gap-2"><Sparkles size={16} className="text-barber-gold" /> Tags & Preferências</h4>
                                </div>
                                <Card noPadding className="p-4 min-h-[150px] flex flex-col gap-4">
                                    {/* Tags Section */}
                                    <div className="flex flex-wrap gap-2">
                                        {tags.map(tag => (
                                            <Badge key={tag} className="pr-1">
                                                {tag}
                                                <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-red-400"><X size={12}/></button>
                                            </Badge>
                                        ))}
                                        {isAddingTag ? (
                                            <div className="flex items-center gap-1">
                                                <input 
                                                    autoFocus
                                                    className="bg-barber-950 border border-barber-800 rounded px-2 py-0.5 text-xs text-white outline-none w-20 focus:border-barber-gold"
                                                    value={newTag}
                                                    onChange={(e) => setNewTag(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                                    onBlur={() => setIsAddingTag(false)}
                                                />
                                            </div>
                                        ) : (
                                            <button onClick={() => setIsAddingTag(true)} className="text-xs text-muted hover:text-white border border-dashed border-barber-700 rounded-full px-2 py-0.5 flex items-center gap-1 hover:border-barber-gold transition-colors">
                                                <Plus size={12} /> Add
                                            </button>
                                        )}
                                    </div>

                                    {/* Preferences Selection */}
                                    <div className="bg-barber-950 rounded-lg p-3 border border-barber-800 space-y-2 mt-auto">
                                        <span className="block font-bold text-barber-gold text-xs mb-1 flex items-center gap-2">
                                            <Coffee size={12}/> Preferências de Atendimento:
                                        </span>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[9px] text-muted uppercase font-bold block mb-1">Bebida</label>
                                                <select 
                                                    className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs rounded-md px-2 py-1.5 outline-none focus:border-barber-gold hover:border-zinc-600 transition-colors cursor-pointer appearance-none"
                                                    value={drinkPref}
                                                    onChange={(e) => setDrinkPref(e.target.value)}
                                                >
                                                    <option value="">Não informado</option>
                                                    <option value="Água">Água</option>
                                                    <option value="Café">Café</option>
                                                    <option value="Cerveja">Cerveja</option>
                                                    <option value="Refrigerante">Refrigerante</option>
                                                    <option value="Whisky">Whisky</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[9px] text-muted uppercase font-bold block mb-1">Conversa</label>
                                                <select 
                                                    className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs rounded-md px-2 py-1.5 outline-none focus:border-barber-gold hover:border-zinc-600 transition-colors cursor-pointer appearance-none"
                                                    value={convStyle}
                                                    onChange={(e) => setConvStyle(e.target.value)}
                                                >
                                                    <option value="">Não informado</option>
                                                    <option value="Conversador">Conversador</option>
                                                    <option value="Quieto">Quieto</option>
                                                    <option value="Profissional">Profissional</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Internal Notes */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-main flex items-center gap-2"><StickyNote size={16} className="text-indigo-400" /> Notas Internas</h4>
                                </div>
                                <Textarea 
                                    value={notes} 
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Anotações sobre o cliente (cortes, produtos, etc)..."
                                    className="h-[150px]"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'gallery' && (
                    <div className="space-y-6 animate-fade-in relative min-h-[300px]">
                        {/* Header Galeria & Upload Area */}
                        <div className="bg-barber-900/50 p-4 rounded-xl border border-barber-800 space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-main flex items-center gap-2">
                                        <ImageIcon size={20} className="text-barber-gold" /> Galeria de Cortes
                                    </h3>
                                    <p className="text-muted text-xs mt-1">Registre o progresso e estilos do cliente.</p>
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="file" 
                                        multiple 
                                        accept="image/*" 
                                        className="hidden" 
                                        ref={fileInputRef} 
                                        onChange={handleFileSelect} 
                                    />
                                    <Button size="sm" onClick={() => fileInputRef.current?.click()} leftIcon={<Plus size={16} />}>
                                        Novo Registro
                                    </Button>
                                </div>
                            </div>

                            {/* Upload Confirmation Panel */}
                            {isUploading && pendingFiles.length > 0 && (
                                <div className="bg-zinc-950 p-4 rounded-lg border border-barber-800 animate-slide-up">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Upload size={14} className="text-barber-gold"/> Adicionar {pendingFiles.length} foto(s)
                                        </h4>
                                        <button onClick={() => { setIsUploading(false); setPendingFiles([]); }} className="text-muted hover:text-white"><X size={14}/></button>
                                    </div>
                                    
                                    <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                                        {pendingFiles.map((file, idx) => (
                                            <div key={idx} className="w-12 h-12 rounded overflow-hidden border border-zinc-700 shrink-0">
                                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                                            </div>
                                        ))}
                                    </div>

                                    <Input 
                                        placeholder="Descrição do corte (ex: Mid Fade, Barba desenhada...)" 
                                        value={newPhotoDescription}
                                        onChange={(e) => setNewPhotoDescription(e.target.value)}
                                        className="mb-3 text-xs"
                                        autoFocus
                                    />
                                    
                                    <div className="flex justify-end">
                                        <Button size="sm" variant="success" onClick={handleConfirmUpload} leftIcon={<Save size={14}/>}>
                                            Salvar no Histórico
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Gallery List - Timeline Style */}
                        {groupedPhotos.length > 0 ? (
                            <div className="space-y-6">
                                {groupedPhotos.map(([date, groupPhotos], groupIndex) => {
                                    const isFirst = groupIndex === 0;
                                    const displayDate = new Date(date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
                                    const description = groupPhotos[0].notes || 'Sem descrição';

                                    return (
                                        <div key={date} className={`relative ${isFirst ? 'animate-fade-in' : ''}`}>
                                            {/* Date Header */}
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className={`h-px flex-1 ${isFirst ? 'bg-barber-gold/50' : 'bg-zinc-800'}`}></div>
                                                <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${isFirst ? 'bg-barber-gold text-black border-barber-gold shadow-lg shadow-amber-500/20' : 'bg-zinc-900 text-muted border-zinc-800'}`}>
                                                    {isFirst ? <span className="flex items-center gap-1"><Star size={10} fill="black" /> Último Corte ({displayDate})</span> : displayDate}
                                                </span>
                                                <div className={`h-px flex-1 ${isFirst ? 'bg-barber-gold/50' : 'bg-zinc-800'}`}></div>
                                            </div>

                                            {/* Description Card */}
                                            {description && (
                                                <div className={`mb-3 text-xs flex items-center gap-2 ${isFirst ? 'text-barber-gold font-medium justify-center' : 'text-zinc-500 justify-center'}`}>
                                                    <span className="italic">"{description}"</span>
                                                </div>
                                            )}

                                            {/* Photo Grid */}
                                            <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${isFirst ? 'p-3 rounded-xl bg-gradient-to-b from-barber-gold/5 to-transparent border border-barber-gold/20' : ''}`}>
                                                {groupPhotos.map((photo) => (
                                                    <div 
                                                        key={photo.id} 
                                                        className="group relative aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-barber-gold/50 transition-all cursor-pointer"
                                                        onClick={() => setSelectedPhoto(photo)}
                                                    >
                                                        <img 
                                                            src={photo.url} 
                                                            alt="Corte" 
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                                        />
                                                        {/* Actions Overlay */}
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                            <button className="p-1.5 bg-white/20 text-white rounded hover:bg-white/40 backdrop-blur-sm transition-colors">
                                                                <Maximize2 size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); handleDeletePhoto(photo.id); }} 
                                                                className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/40 backdrop-blur-sm transition-colors"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                                <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                                    <Camera size={24} className="text-muted opacity-50" />
                                </div>
                                <p className="text-sm font-bold text-muted mb-1">Nenhuma foto no histórico</p>
                                <p className="text-xs text-zinc-600 mb-4">Registre o primeiro corte deste cliente.</p>
                                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    Selecionar Arquivos
                                </Button>
                            </div>
                        )}

                        {/* Lightbox / Zoom Modal */}
                        {selectedPhoto && (
                            <div className="absolute inset-0 z-50 bg-black/95 flex items-center justify-center rounded-2xl animate-fade-in">
                                <button 
                                    onClick={() => setSelectedPhoto(null)}
                                    className="absolute top-4 right-4 p-2 bg-zinc-800 rounded-full text-white hover:bg-zinc-700 z-50"
                                >
                                    <X size={20} />
                                </button>
                                <div className="w-full h-full p-4 flex flex-col items-center justify-center">
                                    <img 
                                        src={selectedPhoto.url} 
                                        className="max-w-full max-h-[80%] rounded-lg shadow-2xl border border-zinc-800 object-contain" 
                                        alt="Zoom" 
                                    />
                                    <div className="mt-4 flex flex-col items-center gap-2">
                                        <p className="text-white font-medium text-sm">{selectedPhoto.notes}</p>
                                        <p className="text-zinc-500 text-xs">{new Date(selectedPhoto.date).toLocaleDateString('pt-BR')}</p>
                                        <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs mt-2 bg-zinc-800 px-3 py-1.5 rounded-full">
                                            <Download size={14} /> Baixar Imagem
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'noshow' && (
                    <div className="space-y-6 animate-fade-in">
                        <Card className="border-red-500/30 bg-red-500/5">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-red-500/20 rounded-lg text-red-500">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-main">Controle de No-Show</h4>
                                    <p className="text-sm text-muted mt-1">Este cliente faltou a <strong>0</strong> agendamentos nos últimos 6 meses.</p>
                                </div>
                            </div>
                        </Card>
                        
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-main">Histórico Recente</h4>
                            {/* Lista com scroll e altura fixa */}
                            <div className="border border-barber-800 rounded-lg divide-y divide-barber-800 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {[1,2,3,4,5,6,7,8].map(i => (
                                    <div key={i} className="p-3 flex justify-between items-center bg-barber-900/50 hover:bg-barber-800/50 transition-colors">
                                        <div>
                                            <div className="text-sm font-bold text-white">Corte Degradê + Barba</div>
                                            <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
                                                <Calendar size={12} className="text-barber-gold" /> 
                                                <span>20 Out • </span>
                                                {/* Horário com intervalo simulado */}
                                                <span className="text-zinc-300 font-medium">14:30h até 15:30h</span>
                                            </div>
                                            <div className="text-[10px] text-muted mt-1 opacity-70">Prof: João Barber</div>
                                        </div>
                                        <Badge variant="success" size="sm">Concluído</Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </>
        )}
    </Modal>
  );
};

export default ClientDetailsModal;
