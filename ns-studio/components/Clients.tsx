
import React, { useState, useMemo } from 'react';
import { Search, Filter, Calendar, Tag, Eye, Plus, X, Check, Hash, Megaphone, Clock, UserCheck, Globe, Users } from 'lucide-react';
import { Client } from '../types';
import ClientDetailsModal from './ClientDetailsModal';
import Input from './ui/Input';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { useToast } from './ui/Toast';

interface ClientsProps {
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
}

const Clients: React.FC<ClientsProps> = ({ clients, setClients }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('Todos');
  const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);
  
  // New Filter Tab State
  const [clientTypeFilter, setClientTypeFilter] = useState<'all' | 'new_public' | 'registered'>('all');

  const toast = useToast();
  
  // State for inline tag editing
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Add dummy clients if empty to demonstrate functionality
  const displayClients: Client[] = clients.length > 0 ? clients : [
      { id: '1', name: 'Ana Silva', phone: '11999999999', lastVisit: '2023-10-25', totalVisits: 12, tags: ['VIP'], loyaltyTier: 'Ouro', origin: 'manual' },
      { id: '2', name: 'Carlos Oliveira', phone: '11988888888', lastVisit: '2023-10-20', totalVisits: 1, tags: ['Novo'], loyaltyTier: 'Bronze', origin: 'public_link', createdAt: '2023-10-20' },
      { id: '3', name: 'Marcos Santos', phone: '11977777777', lastVisit: '2023-10-15', totalVisits: 3, tags: [], loyaltyTier: 'Bronze', origin: 'manual' }
  ];

  // Derive unique tags for filter
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    displayClients.forEach(c => c.tags.forEach(t => tags.add(t)));
    return ['Todos', ...Array.from(tags)];
  }, [displayClients]);

  // Filtering Logic
  const filteredClients = displayClients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
    const matchesTag = selectedTagFilter === 'Todos' || c.tags.includes(selectedTagFilter);
    
    let matchesType = true;
    if (clientTypeFilter === 'new_public') {
        matchesType = c.origin === 'public_link';
    } else if (clientTypeFilter === 'registered') {
        matchesType = c.origin !== 'public_link';
    }

    return matchesSearch && matchesTag && matchesType;
  });

  // Tag Handlers
  const handleAddTag = (clientId: string) => {
    if (!newTagInput.trim()) {
        setEditingClientId(null);
        return;
    }
    setClients(prev => prev.map(c => {
        if (c.id === clientId && !c.tags.includes(newTagInput.trim())) {
            return { ...c, tags: [...c.tags, newTagInput.trim()] };
        }
        return c;
    }));
    setNewTagInput('');
    setEditingClientId(null);
  };

  const handleRemoveTag = (clientId: string, tagToRemove: string) => {
    setClients(prev => prev.map(c => {
        if (c.id === clientId) {
            return { ...c, tags: c.tags.filter(t => t !== tagToRemove) };
        }
        return c;
    }));
  };

  const handleCampaign = (campaignName: string) => {
     setSendingCampaign(campaignName);
     setTimeout(() => {
        setSendingCampaign(null);
        toast.success(`Campanha "${campaignName}" enviada para o segmento selecionado!`);
     }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Smart Campaigns Bar */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-barber-900 to-barber-950 border-barber-800" noPadding>
         <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3">
               <div className="bg-barber-gold p-2 rounded-lg text-black shrink-0">
                  <Megaphone size={20} />
               </div>
               <div>
                  <h3 className="text-main font-bold text-sm">Marketing Inteligente</h3>
                  <p className="text-muted text-xs">Envie campanhas via WhatsApp.</p>
               </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 scrollbar-hide">
               <Button 
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCampaign('Recuperar Inativos')}
                  disabled={!!sendingCampaign}
                  leftIcon={sendingCampaign === 'Recuperar Inativos' ? <Clock className="animate-spin" size={14} /> : <Clock size={14} className="text-red-500" />}
               >
                  Recuperar Inativos
               </Button>
               <Button 
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCampaign('Promo Aniversário')}
                  disabled={!!sendingCampaign}
                  leftIcon={sendingCampaign === 'Promo Aniversário' ? <Clock className="animate-spin" size={14} /> : <Tag size={14} className="text-purple-500" />}
               >
                  Aniversariantes
               </Button>
               <Button 
                  size="sm"
                  variant="secondary"
                  onClick={() => handleCampaign('Oferta VIP')}
                  disabled={!!sendingCampaign}
                  leftIcon={sendingCampaign === 'Oferta VIP' ? <Clock className="animate-spin" size={14} /> : <UserCheck size={14} className="text-barber-gold" />}
               >
                  Oferta VIP
               </Button>
            </div>
         </div>
      </Card>

      {/* Header & Search */}
      <Card className="border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-500/5 via-barber-900 to-barber-900">
        <div className="flex flex-col justify-between items-start gap-4 mb-4">
            <h2 className="text-xl font-bold text-main flex items-center gap-2">
              <span className="bg-barber-800 p-2 rounded-lg text-indigo-400"><Tag size={20}/></span>
              Base de Clientes
            </h2>
            <div className="w-full">
                <Input 
                    placeholder="Buscar por nome ou telefone..."
                    icon={<Search size={18}/>}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* Client Type Filter Tabs */}
        <div className="flex bg-barber-950 p-1 rounded-lg w-full md:w-auto mb-4 border border-barber-800">
            <button 
                onClick={() => setClientTypeFilter('all')}
                className={`flex-1 px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${clientTypeFilter === 'all' ? 'bg-barber-800 text-white shadow' : 'text-muted hover:text-white'}`}
            >
                <Users size={14} /> Todos
            </button>
            <button 
                onClick={() => setClientTypeFilter('new_public')}
                className={`flex-1 px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${clientTypeFilter === 'new_public' ? 'bg-blue-600 text-white shadow' : 'text-muted hover:text-white'}`}
            >
                <Globe size={14} /> Novos (Online)
            </button>
            <button 
                onClick={() => setClientTypeFilter('registered')}
                className={`flex-1 px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${clientTypeFilter === 'registered' ? 'bg-barber-800 text-white shadow' : 'text-muted hover:text-white'}`}
            >
                <UserCheck size={14} /> Base Cadastrada
            </button>
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-t border-barber-800 pt-4 w-full">
            <span className="text-xs text-muted font-bold uppercase mr-2 flex items-center gap-1 shrink-0">
                <Filter size={12} /> Filtros:
            </span>
            {allTags.map(tag => (
                <button
                    key={tag}
                    onClick={() => setSelectedTagFilter(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                        selectedTagFilter === tag 
                        ? 'bg-barber-gold text-inverted border-barber-gold' 
                        : 'bg-barber-950 text-muted border-barber-800 hover:border-barber-700 hover:text-main'
                    }`}
                >
                    {tag === 'Todos' ? 'Todos' : `#${tag}`}
                </button>
            ))}
        </div>
      </Card>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map(client => (
          <Card 
            key={client.id} 
            className="hover:border-barber-gold/50 flex flex-col h-full relative group transition-all duration-300"
            onClick={() => setSelectedClient(client)}
            noPadding
          >
             {/* Origin Badge */}
             {client.origin === 'public_link' && (
                 <div className="absolute top-0 left-0 bg-blue-600 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded-br-lg z-10">
                     Novo via Link
                 </div>
             )}

             <div className="p-6 pb-0">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-barber-gold font-bold flex items-center gap-1 cursor-pointer hover:underline">
                    <Eye size={14} /> Ver Ficha
                    </span>
                </div>

                <div className="flex justify-between items-start mb-4 mt-2">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-barber-800 to-barber-950 flex items-center justify-center text-xl font-bold text-barber-gold border border-barber-700 shrink-0">
                    {client.name.charAt(0)}
                    </div>
                    <div>
                    <h3 className="font-bold text-main leading-tight flex items-center gap-2">
                        {client.name}
                        {client.loyaltyTier === 'Ouro' && <span className="w-2 h-2 rounded-full bg-yellow-500" title="Cliente Ouro"></span>}
                        {client.loyaltyTier === 'Diamante' && <span className="w-2 h-2 rounded-full bg-cyan-500" title="Cliente Diamante"></span>}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted mt-1">
                        <Calendar size={12} /> Última: {new Date(client.lastVisit).toLocaleDateString('pt-BR')}
                    </div>
                    </div>
                </div>
                </div>

                <div className="space-y-4 flex-1 flex flex-col">
                {/* Interactive Tags Area */}
                <div 
                    className="flex flex-wrap gap-2 min-h-[32px] content-start" 
                    onClick={(e) => e.stopPropagation()}
                >
                    {client.tags.map(tag => (
                    <Badge 
                        key={tag} 
                        variant={tag === 'VIP' ? 'vip' : 'default'}
                        className="group/tag pr-1"
                    >
                        {tag}
                        <button 
                            onClick={() => handleRemoveTag(client.id, tag)}
                            className="opacity-0 group-hover/tag:opacity-100 hover:text-red-400 transition-opacity ml-1"
                            title="Remover tag"
                        >
                            <X size={10} />
                        </button>
                    </Badge>
                    ))}
                    
                    {/* Add Tag Input */}
                    {editingClientId === client.id ? (
                        <div className="flex items-center bg-barber-950 rounded-full border border-barber-700 px-2 py-0.5 animate-fade-in">
                            <input 
                                autoFocus
                                type="text"
                                value={newTagInput}
                                onChange={(e) => setNewTagInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTag(client.id)}
                                onBlur={() => handleAddTag(client.id)}
                                className="w-20 bg-transparent text-xs text-main outline-none"
                                placeholder="Nova tag..."
                            />
                            <button onMouseDown={() => handleAddTag(client.id)} className="text-green-500 hover:text-green-400 ml-1">
                                <Check size={12} />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setEditingClientId(client.id)}
                            className="text-xs bg-barber-800/50 hover:bg-barber-800 text-muted hover:text-main px-2 py-1 rounded-full border border-barber-800 hover:border-barber-700 border-dashed flex items-center gap-1 transition-all"
                        >
                            <Plus size={10} />
                        </button>
                    )}
                </div>

                <div className="bg-barber-950 p-3 rounded-lg text-sm text-muted border border-barber-800/50 flex-1">
                    <span className="text-barber-gold font-bold block text-xs mb-1 uppercase tracking-wide">Preferências</span>
                    {client.preferences || 'Sem preferências registradas.'}
                </div>
                </div>
            </div>

            <div className="flex items-center justify-between p-4 border-t border-barber-800 mt-4 bg-barber-950/30">
                <div className="text-center">
                    <div className="text-lg font-bold text-main">{client.totalVisits}</div>
                    <div className="text-xs text-muted uppercase">Visitas</div>
                </div>
                <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={(e) => { e.stopPropagation(); /* Logic to open Calendar */ }}
                    leftIcon={<Calendar size={14} />}
                >
                    Agendar
                </Button>
            </div>
          </Card>
        ))}
        
        {filteredClients.length === 0 && (
            <div className="col-span-full py-10 text-center text-muted border-2 border-dashed border-barber-800 rounded-xl bg-barber-950/20">
                <Hash size={40} className="mx-auto mb-2 opacity-20" />
                <p>Nenhum cliente encontrado com os filtros atuais.</p>
                <button 
                    onClick={() => {setSearchTerm(''); setSelectedTagFilter('Todos'); setClientTypeFilter('all');}}
                    className="mt-4 text-barber-gold hover:underline text-sm"
                >
                    Limpar filtros
                </button>
            </div>
        )}
      </div>

      {selectedClient && (
        <ClientDetailsModal 
          client={selectedClient} 
          onClose={() => setSelectedClient(null)} 
        />
      )}
    </div>
  );
};

export default Clients;
