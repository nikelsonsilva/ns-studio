
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Tag, 
  Eye, 
  Plus, 
  X, 
  Check, 
  Hash, 
  Megaphone, 
  Clock, 
  UserCheck, 
  Globe, 
  Users, 
  LayoutGrid, 
  List, 
  Phone, 
  TrendingUp, 
  DollarSign, 
  ChevronRight, 
  Star, 
  MoreVertical,
  MessageCircle,
  Store
} from 'lucide-react';
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

// --- Sub-componente para Avatar Seguro ---
const ClientAvatar = ({ client, size = 'md', className = '' }: { client: Partial<Client>, size?: 'sm'|'md'|'lg'|'xl', className?: string }) => {
    const getInitials = (name: string) => {
        const names = name.split(' ');
        if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
        return name.slice(0, 2).toUpperCase();
    };

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-sm',
        xl: 'w-16 h-16 text-lg'
    };

    // Gera uma cor consistente baseada no nome
    const getColor = (name: string) => {
        const colors = [
            'from-blue-600 to-blue-800',
            'from-emerald-600 to-emerald-800',
            'from-purple-600 to-purple-800',
            'from-amber-600 to-amber-800',
            'from-rose-600 to-rose-800',
            'from-indigo-600 to-indigo-800'
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className={`rounded-full flex items-center justify-center font-bold text-white shadow-inner bg-gradient-to-br ${getColor(client.name || '')} border border-white/10 ${sizeClasses[size]} ${className}`}>
            {getInitials(client.name || '')}
        </div>
    );
};

const Clients: React.FC<ClientsProps> = ({ clients, setClients }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('Todos');
  
  // View Mode State (Default List)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  // Filter Tab State
  const [clientTypeFilter, setClientTypeFilter] = useState<'all' | 'new' | 'recurring'>('all');

  const toast = useToast();
  
  // State for inline tag editing
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Add dummy clients if empty
  const displayClients: Client[] = clients.length > 0 ? clients : [
      { id: '1', name: 'Ana Silva', phone: '11999999999', lastVisit: '2023-10-25', totalVisits: 12, tags: ['VIP'], loyaltyTier: 'Ouro', origin: 'manual', ltv: 1200 },
      { id: '2', name: 'Carlos Oliveira', phone: '11988888888', lastVisit: '2023-10-20', totalVisits: 1, tags: ['Novo'], loyaltyTier: 'Bronze', origin: 'public_link', createdAt: '2023-10-20', ltv: 50 },
      { id: '3', name: 'Marcos Santos', phone: '11977777777', lastVisit: '2023-10-15', totalVisits: 3, tags: [], loyaltyTier: 'Bronze', origin: 'whatsapp', ltv: 150 },
      { id: '4', name: 'Felipe Neto', phone: '11966666666', lastVisit: '2023-09-30', totalVisits: 25, tags: ['VIP', 'Amigo'], loyaltyTier: 'Diamante', origin: 'manual', ltv: 3500 },
      { id: '5', name: 'Juliana Paes', phone: '11955555555', lastVisit: '2023-10-28', totalVisits: 5, tags: [], loyaltyTier: 'Prata', origin: 'public_link', ltv: 400 },
      { id: '6', name: 'Roberto Firmino', phone: '11944444444', lastVisit: '2023-10-29', totalVisits: 1, tags: ['Novo'], loyaltyTier: 'Bronze', origin: 'whatsapp', ltv: 80 }
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
    if (clientTypeFilter === 'new') {
        // Mostra TODOS os novos (Online, Whats, Manual) se tiver a tag Novo ou poucas visitas
        matchesType = c.tags.includes('Novo') || c.totalVisits <= 1;
    } else if (clientTypeFilter === 'recurring') {
        matchesType = !c.tags.includes('Novo') && c.totalVisits > 1;
    }

    return matchesSearch && matchesTag && matchesType;
  });

  // Stats
  const clientStats = useMemo(() => {
      const total = displayClients.length;
      const newThisMonth = displayClients.filter(c => c.tags.includes('Novo') || c.totalVisits <= 1).length;
      const avgLtv = total > 0 ? displayClients.reduce((acc, c) => acc + (c.ltv || 0), 0) / total : 0;
      return { total, newThisMonth, avgLtv };
  }, [displayClients]);

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

  const handleUpdateClient = (updatedClient: Client) => {
      setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
      setSelectedClient(updatedClient);
      toast.success('Perfil do cliente atualizado!');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header Dashboard Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card noPadding className="col-span-2 p-5 bg-gradient-to-r from-zinc-900 to-zinc-950 border-l-4 border-l-indigo-500 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left w-full">
                  <h2 className="text-xl font-bold text-white">Base de Clientes</h2>
                  <p className="text-sm text-muted mt-1">Gerencie perfis, fidelidade e LTV.</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                  <Button onClick={() => {}} leftIcon={<Plus size={18} />} className="w-full sm:w-auto justify-center">
                    Novo Cliente
                  </Button>
              </div>
          </Card>
          
          <Card noPadding className="col-span-1 p-4 flex flex-col justify-center border-l-4 border-l-barber-gold">
              <span className="text-[10px] sm:text-xs font-bold uppercase text-muted tracking-wider truncate">Total Ativos</span>
              <div className="text-xl sm:text-2xl font-bold text-white mt-1">{clientStats.total}</div>
              <div className="text-[9px] sm:text-[10px] text-barber-gold font-bold mt-1 flex items-center gap-1 truncate">
                  <TrendingUp size={12} /> +{clientStats.newThisMonth} novos
              </div>
          </Card>

          <Card noPadding className="col-span-1 p-4 flex flex-col justify-center border-l-4 border-l-emerald-500">
              <span className="text-[10px] sm:text-xs font-bold uppercase text-muted tracking-wider truncate">LTV Médio</span>
              <div className="text-xl sm:text-2xl font-bold text-white mt-1">R$ {clientStats.avgLtv.toFixed(0)}</div>
              <div className="text-[9px] sm:text-[10px] text-emerald-500 font-bold mt-1 truncate">
                  Ticket Médio OK
              </div>
          </Card>
      </div>

      {/* Main List Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
          <div className="w-full flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-80">
                <Input 
                    placeholder="Buscar por nome ou telefone..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    containerClassName="mb-0"
                    className="bg-zinc-950 border-zinc-800"
                    icon={<Search size={16}/>}
                />
            </div>
            
            {/* Filter Tabs - Horizontal Scroll on Mobile */}
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 overflow-x-auto scrollbar-hide w-full lg:w-auto">
                <button 
                    onClick={() => setClientTypeFilter('all')}
                    className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all ${clientTypeFilter === 'all' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                    Todos
                </button>
                <button 
                    onClick={() => setClientTypeFilter('new')}
                    className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all ${clientTypeFilter === 'new' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-muted hover:text-white'}`}
                >
                    Novos
                </button>
                <button 
                    onClick={() => setClientTypeFilter('recurring')}
                    className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all ${clientTypeFilter === 'recurring' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                    Recorrentes
                </button>
            </div>
          </div>

          <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800 shrink-0 self-end md:self-auto">
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

      {/* Tag Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
            <span className="text-[10px] text-muted font-bold uppercase mr-2 flex items-center gap-1 shrink-0">
                <Filter size={10} /> Filtros:
            </span>
            {allTags.map(tag => (
                <button
                    key={tag}
                    onClick={() => setSelectedTagFilter(tag)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border shrink-0 ${
                        selectedTagFilter === tag 
                        ? 'bg-barber-gold text-black border-barber-gold' 
                        : 'bg-zinc-950 text-muted border-zinc-800 hover:border-zinc-700 hover:text-white'
                    }`}
                >
                    {tag === 'Todos' ? 'Todos' : `#${tag}`}
                </button>
            ))}
        </div>

      {/* === LIST VIEW (DEFAULT) === */}
      {viewMode === 'list' && (
          <div className="flex flex-col gap-3">
              {/* Desktop Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-muted uppercase tracking-wider bg-zinc-900/50 rounded-lg border border-transparent">
                  <div className="col-span-4">Cliente</div>
                  <div className="col-span-2">Contato</div>
                  <div className="col-span-2">Tags & Status</div>
                  <div className="col-span-2">Última Visita</div>
                  <div className="col-span-2 text-right">Ações</div>
              </div>

              {filteredClients.map(client => {
                  return (
                    <div 
                        key={client.id} 
                        className="group bg-zinc-900 border border-zinc-800 hover:border-barber-gold/30 rounded-xl p-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-center transition-all duration-200 hover:shadow-lg cursor-pointer"
                        onClick={() => setSelectedClient(client)}
                    >
                        {/* Name & Avatar */}
                        <div className="w-full md:col-span-4 flex items-center gap-3">
                            <ClientAvatar client={client} size="md" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-main text-sm truncate">{client.name}</h4>
                                </div>
                                <div className="text-[10px] flex items-center gap-2 mt-0.5 text-muted truncate">
                                    {client.loyaltyTier === 'Diamante' && <span className="text-cyan-400 flex items-center gap-1 font-bold"><Users size={10}/> Diamante</span>}
                                    {client.loyaltyTier === 'Ouro' && <span className="text-yellow-500 flex items-center gap-1 font-bold"><Users size={10}/> Ouro</span>}
                                    {client.loyaltyTier === 'Prata' && <span className="text-gray-400 flex items-center gap-1 font-bold"><Users size={10}/> Prata</span>}
                                    {client.loyaltyTier === 'Bronze' && <span className="text-orange-700 flex items-center gap-1 font-bold"><Users size={10}/> Bronze</span>}
                                    <span className="hidden sm:inline">•</span>
                                    <span>{client.totalVisits} visitas</span>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Row: Contact & Tags */}
                        <div className="w-full md:col-span-4 flex md:contents flex-col sm:flex-row gap-2 sm:gap-6 justify-between md:justify-start">
                            {/* Contact */}
                            <div className="text-sm text-muted flex items-center gap-2 md:col-span-2 shrink-0">
                                <Phone size={14} className="text-zinc-600" /> {client.phone}
                            </div>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1 md:col-span-2 items-center">
                                {client.tags.slice(0, 3).map(tag => (
                                    <Badge key={tag} size="sm" variant={tag === 'VIP' ? 'vip' : 'default'} className="text-[9px]">
                                        {tag}
                                    </Badge>
                                ))}
                                {client.tags.length > 3 && <span className="text-[9px] text-muted">+{client.tags.length - 3}</span>}
                            </div>
                        </div>

                        {/* Mobile Row: Date & Actions */}
                        <div className="w-full md:col-span-4 flex md:contents items-center justify-between mt-2 md:mt-0 pt-3 md:pt-0 border-t border-zinc-800 md:border-0">
                            {/* Last Visit */}
                            <div className="text-xs text-muted flex flex-col md:col-span-2">
                                <span className="flex items-center gap-1 font-medium"><Calendar size={12}/> {new Date(client.lastVisit).toLocaleDateString('pt-BR')}</span>
                                <span className="text-[9px] text-zinc-600 mt-0.5">Há {Math.floor((new Date().getTime() - new Date(client.lastVisit).getTime()) / (1000 * 3600 * 24))} dias</span>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2 md:col-span-2">
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-zinc-800 text-muted hover:text-white" onClick={(e) => { e.stopPropagation(); setSelectedClient(client); }}>
                                    <Eye size={16} />
                                </Button>
                            </div>
                        </div>
                    </div>
                  );
              })}
          </div>
      )}

      {/* === GRID VIEW === */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map(client => {
                return (
                    <Card 
                        key={client.id} 
                        className="hover:border-barber-gold/50 flex flex-col h-full relative group transition-all duration-300"
                        onClick={() => setSelectedClient(client)}
                        noPadding
                    >
                        <div className="p-6 pb-0">
                            <div className="flex justify-between items-start mb-4 mt-3">
                                <div className="flex items-center gap-3 w-full">
                                    <ClientAvatar client={client} size="lg" />
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-main leading-tight flex items-center gap-2 truncate">
                                            {client.name}
                                        </h3>
                                        <div className="flex items-center gap-1 text-xs text-muted mt-1">
                                            <span className={`w-2 h-2 rounded-full ${client.loyaltyTier === 'Diamante' ? 'bg-cyan-500' : client.loyaltyTier === 'Ouro' ? 'bg-yellow-500' : 'bg-zinc-600'}`}></span>
                                            {client.loyaltyTier}
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
                                    {client.tags.slice(0, 3).map(tag => (
                                        <Badge key={tag} variant={tag === 'VIP' ? 'vip' : 'default'} className="pr-1 text-[10px]">
                                            {tag}
                                        </Badge>
                                    ))}
                                    <button 
                                        onClick={() => setEditingClientId(client.id)}
                                        className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-muted hover:text-main px-2 py-0.5 rounded-full border border-zinc-800 hover:border-zinc-700 border-dashed flex items-center gap-1 transition-all"
                                    >
                                        <Plus size={10} /> Tag
                                    </button>
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 pt-3">
                                    <div className="text-center p-2 bg-zinc-950 rounded-lg">
                                        <div className="text-[10px] text-muted uppercase font-bold">LTV</div>
                                        <div className="text-sm font-bold text-emerald-500">R$ {client.ltv || 0}</div>
                                    </div>
                                    <div className="text-center p-2 bg-zinc-950 rounded-lg">
                                        <div className="text-[10px] text-muted uppercase font-bold">Visitas</div>
                                        <div className="text-sm font-bold text-white">{client.totalVisits}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 border-t border-barber-800 mt-4 bg-zinc-950/30">
                            <div className="text-xs text-muted flex items-center gap-1">
                                <Clock size={12} /> {new Date(client.lastVisit).toLocaleDateString('pt-BR')}
                            </div>
                            <Button 
                                size="sm" 
                                variant="secondary" 
                                className="h-8 text-xs"
                                onClick={(e) => { e.stopPropagation(); /* Logic to open Calendar */ }}
                            >
                                Agendar
                            </Button>
                        </div>
                    </Card>
                );
            })}
        </div>
      )}
        
      {filteredClients.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/50">
                <Hash size={48} className="mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-bold text-white mb-2">Nenhum cliente encontrado</h3>
                <p className="text-sm mb-6">Tente ajustar os filtros ou busque por outro nome.</p>
                <button 
                    onClick={() => {setSearchTerm(''); setSelectedTagFilter('Todos'); setClientTypeFilter('all');}}
                    className="text-barber-gold hover:underline text-sm font-bold"
                >
                    Limpar todos os filtros
                </button>
            </div>
      )}

      {selectedClient && (
        <ClientDetailsModal 
          client={selectedClient} 
          onClose={() => setSelectedClient(null)} 
          onUpdate={handleUpdateClient}
        />
      )}
    </div>
  );
};

export default Clients;
