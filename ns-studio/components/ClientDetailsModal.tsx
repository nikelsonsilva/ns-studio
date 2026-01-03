import React, { useState } from 'react';
import { X, Sparkles, AlertTriangle, Coffee, MessageCircle, Calendar, DollarSign, StickyNote, History, Award, Plus, Trash2, Bell, Check, Clock, Camera, Image as ImageIcon, Crown, LayoutGrid } from 'lucide-react';
import { Client, ClientPhoto, LoyaltyTier } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Textarea from './ui/Textarea';
import Badge from './ui/Badge';
import Switch from './ui/Switch';
import Select from './ui/Select';

interface ClientDetailsModalProps {
  client: Client;
  onClose: () => void;
  onEdit?: () => void;
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ client, onClose, onEdit }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'gallery'>('overview');
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  
  // CRM Enhancements State
  const [tags, setTags] = useState<string[]>(client.tags);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  
  const [notes, setNotes] = useState(client.internalNotes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  
  const [reminderDays, setReminderDays] = useState(30);
  const [reminderActive, setReminderActive] = useState(false);

  // Mock points logic if not provided
  const points = client.loyaltyPoints || (client.totalVisits % 10);
  const maxPoints = 10;
  
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
          case 'Diamante': return { bg: 'bg-cyan-500/10', border: 'border-cyan-500', text: 'text-cyan-500', icon: Crown };
          case 'Ouro': return { bg: 'bg-yellow-500/10', border: 'border-yellow-500', text: 'text-yellow-500', icon: Award };
          case 'Prata': return { bg: 'bg-gray-400/10', border: 'border-gray-400', text: 'text-gray-400', icon: Award };
          default: return { bg: 'bg-orange-700/10', border: 'border-orange-800', text: 'text-orange-700', icon: Award };
      }
  };

  const tierStyle = getTierStyles(tier);
  const TierIcon = tierStyle.icon;

  // Mock History Data for CRM
  const historyData = [
    { date: '20 Out, 2023', service: 'Corte Degradê + Barba', professional: 'João Barber', price: 80.00, status: 'Confirmado' },
    { date: '25 Set, 2023', service: 'Corte Degradê', professional: 'Pedro Cortes', price: 50.00, status: 'Confirmado' },
    { date: '01 Set, 2023', service: 'Barba Terapia', professional: 'João Barber', price: 40.00, status: 'Confirmado' },
    { date: '15 Ago, 2023', service: 'Corte Simples', professional: 'Pedro Cortes', price: 45.00, status: 'Confirmado' },
  ];

  // Mock Photos
  const initialPhotos: ClientPhoto[] = client.photos || [
     { id: '1', url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=400', date: '20 Out, 2023', type: 'after', notes: 'Degradê Navalhado' },
     { id: '2', url: 'https://images.unsplash.com/photo-1593702295094-aea8c5c13d73?auto=format&fit=crop&q=80&w=400', date: '20 Out, 2023', type: 'before' },
     { id: '3', url: 'https://images.unsplash.com/photo-1503951914875-befbb713d052?auto=format&fit=crop&q=80&w=400', date: '25 Set, 2023', type: 'after', notes: 'Low Fade' },
  ];
  const [photos, setPhotos] = useState<ClientPhoto[]>(initialPhotos);

  const handleGenerateMessage = () => {
    // Simulação de IA
    const msg = `Fala ${client.name.split(' ')[0]}! 👊\n\nJá faz 30 dias desde seu último corte navalhado. Como você curte manter o visual em dia, que tal agendar para essa semana?\n\nTenho horário livre na quinta às 17h. Bora?`;
    setGeneratedMessage(msg);
  };

  const handleAddTag = () => {
    if (newTag.trim()) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setIsAddingTag(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSaveNotes = () => {
    setIsSavingNotes(true);
    setTimeout(() => setIsSavingNotes(false), 1000);
  };

  return (
    <Modal
        isOpen={true}
        onClose={onClose}
        size="xl"
        title={
            <div className="flex flex-col">
                <span className="flex items-center gap-2">
                    {client.name}
                    {tags.includes('VIP') && <Badge variant="vip" size="sm">VIP</Badge>}
                    {client.activeMembership && (
                        <Badge variant="info" size="sm" icon={<Crown size={10} />}>{client.activeMembership}</Badge>
                    )}
                </span>
                <span className="text-xs text-muted font-normal mt-0.5">{client.phone}</span>
            </div>
        }
    >
        <div className="flex flex-col gap-4">
             {/* Tags Row */}
            <div className="flex flex-wrap items-center gap-2">
                {tags.map(tag => (
                <span key={tag} className="text-[10px] bg-barber-800 text-main px-2 py-0.5 rounded-full border border-barber-700 flex items-center gap-1 group">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="hover:text-red-400">
                        <X size={10} />
                    </button>
                </span>
                ))}
                
                {isAddingTag ? (
                <div className="flex items-center gap-1 bg-barber-950 border border-barber-700 rounded-full px-2 py-0.5">
                    <input 
                        type="text" 
                        value={newTag} 
                        onChange={(e) => setNewTag(e.target.value)}
                        className="bg-transparent text-xs text-main w-16 outline-none"
                        placeholder="Tag..."
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                    />
                    <button onClick={handleAddTag} className="text-green-500 hover:text-green-400"><Check size={12} /></button>
                    <button onClick={() => setIsAddingTag(false)} className="text-red-500 hover:text-red-400"><X size={12} /></button>
                </div>
                ) : (
                    <button 
                    onClick={() => setIsAddingTag(true)}
                    className="text-[10px] bg-barber-800 hover:bg-barber-700 text-muted hover:text-main px-2 py-0.5 rounded-full border border-barber-700 border-dashed flex items-center gap-1 transition-colors"
                    >
                    <Plus size={8} /> Add
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex w-full bg-barber-950 rounded-lg p-1 border border-barber-800">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'overview' ? 'bg-barber-800 text-main shadow' : 'text-muted hover:text-main'}`}
                >
                   <LayoutGrid size={14} /> Visão Geral
                </button>
                <button 
                  onClick={() => setActiveTab('gallery')}
                  className={`flex-1 px-3 py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'gallery' ? 'bg-barber-800 text-main shadow' : 'text-muted hover:text-main'}`}
                >
                   <ImageIcon size={14} /> Galeria
                </button>
            </div>

            {/* Tab Content */}
            <div className="mt-2">
                {activeTab === 'overview' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                {/* Coluna Esquerda: Dados Críticos */}
                <div className="space-y-6">
                    
                    {/* Loyalty Card */}
                    <div className={`p-5 rounded-xl border relative overflow-hidden shadow-lg ${tierStyle.bg} ${tierStyle.border}`}>
                    <div className="absolute top-0 right-0 p-10 bg-white/5 blur-2xl rounded-full"></div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <h3 className={`${tierStyle.text} font-bold text-sm flex items-center gap-2`}>
                            <TierIcon size={16} /> Fidelidade {tier}
                        </h3>
                        <span className="text-xs bg-black/20 px-2 py-1 rounded text-white font-mono">
                            {client.totalVisits} visitas totais
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-2 mb-3 relative z-10">
                        {Array.from({ length: maxPoints }).map((_, i) => (
                            <div 
                            key={i} 
                            className={`aspect-square rounded-full flex items-center justify-center border text-xs font-bold transition-all ${
                                i < points 
                                ? `bg-white text-black border-white shadow` 
                                : 'bg-black/10 border-black/10 text-black/30 dark:bg-white/10 dark:border-white/10 dark:text-white/30'
                            }`}
                            >
                            {i < points ? '✓' : i + 1}
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted text-center relative z-10">
                        Faltam <span className="text-main font-bold">{maxPoints - points}</span> cortes para resgatar prêmio!
                    </p>
                    </div>

                    {/* LTV Card */}
                    <Card noPadding className="p-4 bg-barber-950">
                        <div className="flex items-center gap-2 text-muted text-xs uppercase font-bold mb-2">
                            <DollarSign size={14} className="text-green-500" /> Lifetime Value (LTV)
                        </div>
                        <div className="text-2xl font-bold text-main">R$ {client.ltv?.toFixed(2) || '1.250,00'}</div>
                        <div className="text-xs text-muted mt-1">Ticket Médio: R$ 65,00</div>
                    </Card>

                    {/* Preferências */}
                    <Card noPadding className="p-4 bg-barber-950">
                        <h3 className="text-barber-gold font-bold text-sm mb-3 flex items-center gap-2">
                            <Coffee size={16} /> Preferências
                        </h3>
                        <ul className="space-y-3 text-sm">
                            <li className="flex justify-between border-b border-barber-800 pb-2">
                            <span className="text-muted">Bebida</span>
                            <span className="text-main text-right">{client.drinkPreference || 'Café'}</span>
                            </li>
                            <li className="flex justify-between border-b border-barber-800 pb-2">
                            <span className="text-muted">Estilo</span>
                            <span className="text-main text-right">{client.conversationStyle || 'Normal'}</span>
                            </li>
                            <li className="block pt-1">
                            <span className="text-muted block mb-1">Corte Favorito</span>
                            <span className="text-main bg-barber-800 px-2 py-1 rounded text-xs">{client.preferences}</span>
                            </li>
                        </ul>
                    </Card>
                </div>

                {/* Coluna Central: Histórico e Notas */}
                <div className="lg:col-span-2 space-y-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Follow-up / Reminder Automation - NEW */}
                        <Card noPadding className="p-5 bg-barber-950 flex flex-col justify-between">
                            <div>
                                <h3 className="text-main font-bold text-sm mb-3 flex items-center gap-2">
                                    <Bell size={16} className="text-barber-gold" /> Lembrete Automático
                                </h3>
                                <p className="text-xs text-muted mb-4">
                                    Notificar quando for hora de retornar.
                                </p>
                            </div>
                            
                            <div className="flex items-center justify-between bg-barber-900 p-3 rounded-lg border border-barber-800">
                                <div className="flex items-center gap-2">
                                    <Switch checked={reminderActive} onCheckedChange={setReminderActive} />
                                    <span className={`text-sm font-bold ${reminderActive ? 'text-main' : 'text-muted'}`}>
                                        {reminderActive ? 'On' : 'Off'}
                                    </span>
                                </div>
                                
                                {reminderActive && (
                                    <div className="w-20">
                                        <Select 
                                            options={[
                                                { value: 15, label: '15d' },
                                                { value: 30, label: '30d' },
                                                { value: 45, label: '45d' }
                                            ]}
                                            value={reminderDays}
                                            onChange={(e) => setReminderDays(Number(e.target.value))}
                                            className="text-xs py-1 h-8"
                                        />
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Notas Internas - Enhanced */}
                        <Card noPadding className="p-5 bg-barber-950 flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-main font-bold text-sm flex items-center gap-2">
                                    <StickyNote size={16} className="text-yellow-500" /> Notas
                                </h3>
                                {isSavingNotes ? (
                                    <span className="text-green-500 text-xs flex items-center gap-1 animate-fade-in">
                                        <Check size={12} /> Salvo
                                    </span>
                                ) : (
                                    <button 
                                    onClick={handleSaveNotes} 
                                    className="text-xs text-barber-gold hover:text-main transition-colors"
                                    >
                                    Salvar
                                    </button>
                                )}
                            </div>
                            <Textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="flex-1 min-h-[100px]"
                                placeholder="Observações do cliente..."
                            />
                        </Card>
                    </div>

                    {/* IA Actions / Follow-up Template */}
                    <div className="bg-gradient-to-r from-barber-900 to-barber-800 p-1 rounded-xl border border-barber-700/50 relative overflow-hidden">
                    <div className="bg-barber-950/80 p-5 rounded-lg backdrop-blur-sm">
                        <h3 className="text-main font-bold flex items-center gap-2 mb-2">
                        <Sparkles size={18} className="text-purple-400" /> Assistant
                        </h3>
                        
                        {!generatedMessage ? (
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <p className="text-sm text-muted">Cliente inativo há 30 dias.</p>
                            <Button 
                                onClick={handleGenerateMessage}
                                className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 shadow-purple-900/20 text-white"
                                size="sm"
                                leftIcon={<Sparkles size={14} />}
                            >
                                Gerar Mensagem
                            </Button>
                        </div>
                        ) : (
                        <div className="animate-fade-in">
                            <Textarea 
                                className="h-24 mb-2 focus:border-purple-500"
                                value={generatedMessage}
                                readOnly
                            />
                            <div className="flex flex-col md:flex-row gap-2">
                                <Button 
                                    variant="success" 
                                    className="flex-1"
                                    size="sm"
                                    leftIcon={<MessageCircle size={16} />}
                                >
                                    Enviar
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    onClick={() => setGeneratedMessage(null)}
                                    size="sm"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                        )}
                    </div>
                    </div>

                    {/* Histórico - Enhanced */}
                    <Card noPadding className="p-5 bg-barber-950">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-main font-bold text-sm flex items-center gap-2">
                                <History size={16} className="text-blue-400" /> Histórico
                            </h3>
                            <span className="text-xs text-muted bg-barber-900 px-2 py-1 rounded-full border border-barber-800">
                                {client.totalVisits} visitas
                            </span>
                        </div>
                        
                        <div className="space-y-4">
                            {historyData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between pb-4 border-b border-barber-800 last:border-0 last:pb-0 hover:bg-barber-900/50 p-2 rounded-lg transition-colors -mx-2 px-2">
                                <div className="flex items-center gap-3">
                                <div className="bg-barber-900 p-2 rounded-lg text-muted border border-barber-800">
                                    <Calendar size={18} />
                                </div>
                                <div>
                                    <div className="text-main text-sm font-bold">{item.service}</div>
                                    <div className="text-muted text-xs flex items-center gap-1">
                                        <Clock size={10} /> {item.date} • {item.professional.split(' ')[0]}
                                    </div>
                                </div>
                                </div>
                                <div className="text-right">
                                <div className="text-green-500 font-bold text-sm">R$ {item.price.toFixed(0)}</div>
                                </div>
                            </div>
                            ))}
                        </div>
                    </Card>

                </div>
                </div>
                ) : (
                    /* GALLERY VIEW */
                    <div className="animate-fade-in h-full flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-main">Galeria</h3>
                                <p className="text-muted text-sm">Histórico visual.</p>
                            </div>
                            <Button size="sm" leftIcon={<Camera size={18} />}>Add</Button>
                        </div>
                        
                        {photos.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted border-2 border-dashed border-barber-800 rounded-xl bg-barber-950/30 min-h-[200px]">
                                <ImageIcon size={48} className="mb-4 opacity-50" />
                                <p>Sem fotos.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-4">
                                {photos.map(photo => (
                                    <div key={photo.id} className="group relative rounded-xl overflow-hidden bg-barber-950 border border-barber-800 shadow-lg aspect-square">
                                    <img src={photo.url} alt="Corte" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded mb-1 inline-block ${photo.type === 'after' ? 'bg-green-500 text-black' : 'bg-gray-600 text-white'}`}>
                                                {photo.type === 'before' ? 'Antes' : 'Depois'}
                                                </span>
                                                <div className="text-xs text-gray-300">{photo.date}</div>
                                            </div>
                                            <button className="text-white hover:text-red-500 p-2"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </Modal>
  );
};

export default ClientDetailsModal;