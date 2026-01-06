/**
 * Clients Screen - NS Studio Design System
 * Layout from ns-studio reference with database integration
 */
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
  Edit2,
  Megaphone,
  Clock,
  UserCheck,
  Gift,
  LayoutGrid,
  List,
  Phone,
  TrendingUp,
  DollarSign,
  Users,
} from 'lucide-react';
import { Client } from '../types';
import ClientDetailsModal from './ClientDetailsModal';
import ClientModal from './ClientModal';

// ========== LOGIC IMPORTS - DO NOT MODIFY ==========
import { useSupabaseQuery } from '../lib/hooks';
import { fetchClients, deleteClient } from '../lib/database';
import { updateClientTags } from '../lib/clientService';

// ========== UI COMPONENTS (Design System) ==========
import Input from './ui/Input';
import Button from './ui/Button';
import Card from './ui/Card';
import Badge from './ui/Badge';
import { useToast } from './ui/Toast';

// --- Sub-component: ClientAvatar with gradient colors ---
const ClientAvatar = ({ client, size = 'md', className = '' }: { client: Partial<Client>, size?: 'sm' | 'md' | 'lg' | 'xl', className?: string }) => {
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

  // Generate consistent color based on client name
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

const Clients: React.FC = () => {
  // ========== LOGIC - DO NOT MODIFY ==========
  const { data: clientsData, loading: isLoading } = useSupabaseQuery(fetchClients);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('Todos');
  const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const toast = useToast();

  // View Mode State (Default List)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Filter Tab State
  const [clientTypeFilter, setClientTypeFilter] = useState<'all' | 'new' | 'recurring'>('all');

  React.useEffect(() => {
    if (clientsData) {
      setClients(clientsData);
    }
  }, [clientsData]);

  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Stats - MUST be before any conditional return
  const clientStats = useMemo(() => {
    const total = clients.length;
    const newThisMonth = clients.filter(c =>
      (c.tags && Array.isArray(c.tags) && c.tags.includes('Novo')) || (c.total_visits || 0) <= 1
    ).length;
    const avgLtv = total > 0 ? clients.reduce((acc, c) => acc + (c.lifetime_value || 0), 0) / total : 0;
    return { total, newThisMonth, avgLtv };
  }, [clients]);

  // Derive unique tags for filter - MUST be before any conditional return
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    clients.forEach(c => {
      if (c.tags && Array.isArray(c.tags)) {
        c.tags.forEach(t => tags.add(t));
      }
    });
    return ['Todos', ...Array.from(tags)];
  }, [clients]);

  // Filtering Logic - MUST be before any conditional return
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm);

      const matchesTag = selectedTagFilter === 'Todos' ||
        (c.tags && Array.isArray(c.tags) && c.tags.includes(selectedTagFilter));

      let matchesType = true;
      if (clientTypeFilter === 'new') {
        matchesType = (c.tags && Array.isArray(c.tags) && c.tags.includes('Novo')) || (c.total_visits || 0) <= 1;
      } else if (clientTypeFilter === 'recurring') {
        matchesType = !(c.tags && Array.isArray(c.tags) && c.tags.includes('Novo')) && (c.total_visits || 0) > 1;
      }

      return matchesSearch && matchesTag && matchesType;
    });
  }, [clients, searchTerm, selectedTagFilter, clientTypeFilter]);

  // ========== SKELETON LOADER ==========
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in pb-20">
        {/* Dashboard Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2 p-5 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse">
            <div className="h-6 bg-zinc-800 rounded w-48 mb-2" />
            <div className="h-4 bg-zinc-800/50 rounded w-64" />
          </div>
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse">
            <div className="h-3 bg-zinc-800 rounded w-20 mb-2" />
            <div className="h-8 bg-zinc-800 rounded w-12" />
          </div>
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse">
            <div className="h-3 bg-zinc-800 rounded w-20 mb-2" />
            <div className="h-8 bg-zinc-800 rounded w-16" />
          </div>
        </div>

        {/* Controls Skeleton */}
        <div className="bg-zinc-900/50 p-2 rounded-xl border border-zinc-800 animate-pulse">
          <div className="h-10 bg-zinc-800 rounded-lg" />
        </div>

        {/* List Skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-zinc-800 rounded w-32 mb-2" />
                  <div className="h-3 bg-zinc-800/50 rounded w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }


  // Tag Handlers
  const handleAddTag = async (clientId: string) => {
    if (!newTagInput.trim()) {
      setEditingClientId(null);
      return;
    }
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const currentTags = client.tags || [];
    if (currentTags.includes(newTagInput.trim())) {
      setNewTagInput('');
      setEditingClientId(null);
      return;
    }

    const updatedTags = [...currentTags, newTagInput.trim()];
    setClients(prev =>
      prev.map(c =>
        c.id === clientId ? { ...c, tags: updatedTags } : c
      ),
    );
    await updateClientTags(clientId, updatedTags);
    setNewTagInput('');
    setEditingClientId(null);
    toast.success(`Tag "${newTagInput.trim()}" adicionada!`);
  };

  const handleRemoveTag = async (clientId: string, tagToRemove: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const updatedTags = (client.tags || []).filter(t => t !== tagToRemove);
    setClients(prev =>
      prev.map(c =>
        c.id === clientId ? { ...c, tags: updatedTags } : c
      ),
    );
    await updateClientTags(clientId, updatedTags);
  };

  const handleCreateClient = () => {
    setEditingClient(null);
    setShowClientModal(true);
  };

  const handleClientSuccess = () => {
    window.location.reload();
  };

  const handleUpdateClient = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
    setSelectedClient(updatedClient);
    toast.success('Perfil do cliente atualizado!');
  };
  // ========== END LOGIC ==========

  return (
    <div className="space-y-6 animate-fade-in pb-20">

      {/* Header Dashboard Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card noPadding className="col-span-2 p-5 bg-gradient-to-r from-zinc-900 to-zinc-950 border-l-4 border-l-indigo-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left w-full">
            <h2 className="text-xl font-bold text-[var(--dark-text-main)]">Base de Clientes</h2>
            <p className="text-sm text-[var(--dark-text-muted)] mt-1">Gerencie perfis, fidelidade e LTV.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button onClick={handleCreateClient} leftIcon={<Plus size={18} />} className="w-full sm:w-auto justify-center">
              Novo Cliente
            </Button>
          </div>
        </Card>

        <Card noPadding className="col-span-1 p-4 flex flex-col justify-center border-l-4 border-l-[var(--dark-brand-primary)]">
          <span className="text-[10px] sm:text-xs font-bold uppercase text-[var(--dark-text-muted)] tracking-wider truncate">Total Ativos</span>
          <div className="text-xl sm:text-2xl font-bold text-[var(--dark-text-main)] mt-1">{clientStats.total}</div>
          <div className="text-[9px] sm:text-[10px] text-[var(--dark-brand-primary)] font-bold mt-1 flex items-center gap-1 truncate">
            <TrendingUp size={12} /> +{clientStats.newThisMonth} novos
          </div>
        </Card>

        <Card noPadding className="col-span-1 p-4 flex flex-col justify-center border-l-4 border-l-emerald-500">
          <span className="text-[10px] sm:text-xs font-bold uppercase text-[var(--dark-text-muted)] tracking-wider truncate">LTV Médio</span>
          <div className="text-xl sm:text-2xl font-bold text-[var(--dark-text-main)] mt-1">R$ {clientStats.avgLtv.toFixed(0)}</div>
          <div className="text-[9px] sm:text-[10px] text-emerald-500 font-bold mt-1 truncate">
            Ticket Médio OK
          </div>
        </Card>
      </div>

      {/* Smart Campaigns Bar - DISABLED */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-zinc-900 to-zinc-950 border-[var(--dark-border-default)] opacity-60 cursor-not-allowed" noPadding>
        <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="bg-[var(--dark-brand-50)] p-2 rounded-lg text-black/50 shrink-0">
              <Megaphone size={20} />
            </div>
            <div>
              <h3 className="text-[var(--dark-text-main)]/70 font-bold text-sm flex items-center gap-2">
                Marketing Inteligente
                <span className="bg-[var(--dark-brand-20)] text-[var(--dark-brand-primary)] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                  Em Breve
                </span>
              </h3>
              <p className="text-[var(--dark-text-subtle)] text-xs">Envie campanhas via WhatsApp.</p>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 scrollbar-hide pointer-events-none">
            <Button
              size="sm"
              variant="secondary"
              disabled={true}
              leftIcon={<Clock size={14} className="text-red-500/50" />}
            >
              Recuperar Inativos
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={true}
              leftIcon={<Gift size={14} className="text-purple-500/50" />}
            >
              Aniversariantes
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={true}
              leftIcon={<UserCheck size={14} className="text-[var(--dark-brand-primary)]/50" />}
            >
              Oferta VIP
            </Button>
          </div>
        </div>
      </Card>

      {/* Main List Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
        <div className="w-full flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-80">
            <Input
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-zinc-950 border-zinc-800"
              icon={<Search size={16} />}
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 overflow-x-auto scrollbar-hide w-full lg:w-auto">
            <button
              onClick={() => setClientTypeFilter('all')}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all ${clientTypeFilter === 'all' ? 'bg-zinc-800 text-white shadow' : 'text-[var(--dark-text-muted)] hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setClientTypeFilter('new')}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all ${clientTypeFilter === 'new' ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' : 'text-[var(--dark-text-muted)] hover:text-white'}`}
            >
              Novos
            </button>
            <button
              onClick={() => setClientTypeFilter('recurring')}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all ${clientTypeFilter === 'recurring' ? 'bg-zinc-800 text-white shadow' : 'text-[var(--dark-text-muted)] hover:text-white'}`}
            >
              Recorrentes
            </button>
          </div>
        </div>

        <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800 shrink-0 self-end md:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-[var(--dark-text-muted)] hover:text-white'}`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-[var(--dark-text-muted)] hover:text-white'}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Tag Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2">
        <span className="text-[10px] text-[var(--dark-text-muted)] font-bold uppercase mr-2 flex items-center gap-1 shrink-0">
          <Filter size={10} /> Filtros:
        </span>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTagFilter(tag)}
            className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition-all border shrink-0 ${selectedTagFilter === tag
              ? 'bg-[var(--dark-brand-primary)] text-black border-[var(--dark-brand-primary)]'
              : 'bg-zinc-950 text-[var(--dark-text-muted)] border-zinc-800 hover:border-zinc-700 hover:text-white'
              }`}
          >
            {tag === 'Todos' ? 'Todos' : `#${tag}`}
          </button>
        ))}
      </div>

      {/* === LIST VIEW === */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-3">
          {/* Desktop Header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-[var(--dark-text-muted)] uppercase tracking-wider bg-zinc-900/50 rounded-lg border border-transparent">
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
                className="group bg-zinc-900 border border-zinc-800 hover:border-[var(--dark-brand-30)] rounded-xl p-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-center transition-all duration-200 hover:shadow-lg cursor-pointer"
                onClick={() => setSelectedClient(client)}
              >
                {/* Name & Avatar */}
                <div className="w-full md:col-span-4 flex items-center gap-3">
                  <ClientAvatar client={client} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-[var(--dark-text-main)] text-sm truncate">{client.name}</h4>
                    </div>
                    <div className="text-[10px] flex items-center gap-2 mt-0.5 text-[var(--dark-text-muted)] truncate">
                      {client.loyalty_tier === 'Diamante' && <span className="text-cyan-400 flex items-center gap-1 font-bold"><Users size={10} /> Diamante</span>}
                      {client.loyalty_tier === 'Ouro' && <span className="text-yellow-500 flex items-center gap-1 font-bold"><Users size={10} /> Ouro</span>}
                      {client.loyalty_tier === 'Prata' && <span className="text-gray-400 flex items-center gap-1 font-bold"><Users size={10} /> Prata</span>}
                      {client.loyalty_tier === 'Bronze' && <span className="text-orange-700 flex items-center gap-1 font-bold"><Users size={10} /> Bronze</span>}
                      <span className="hidden sm:inline">•</span>
                      <span>{client.total_visits || 0} visitas</span>
                    </div>
                  </div>
                </div>

                {/* Mobile Row: Contact & Tags */}
                <div className="w-full md:col-span-4 flex md:contents flex-col sm:flex-row gap-2 sm:gap-6 justify-between md:justify-start">
                  {/* Contact */}
                  <div className="text-sm text-[var(--dark-text-muted)] flex items-center gap-2 md:col-span-2 shrink-0">
                    <Phone size={14} className="text-zinc-600" /> {client.phone}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 md:col-span-2 items-center">
                    {client.tags && Array.isArray(client.tags) && client.tags.slice(0, 3).map(tag => (
                      <Badge key={tag} size="sm" variant={tag === 'VIP' ? 'vip' : 'default'} className="text-[9px]">
                        {tag}
                      </Badge>
                    ))}
                    {client.tags && client.tags.length > 3 && <span className="text-[9px] text-[var(--dark-text-muted)]">+{client.tags.length - 3}</span>}
                  </div>
                </div>

                {/* Mobile Row: Date & Actions */}
                <div className="w-full md:col-span-4 flex md:contents items-center justify-between mt-2 md:mt-0 pt-3 md:pt-0 border-t border-zinc-800 md:border-0">
                  {/* Last Visit */}
                  <div className="text-xs text-[var(--dark-text-muted)] flex flex-col md:col-span-2">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar size={12} />
                      {client.last_visit_date
                        ? new Date(client.last_visit_date).toLocaleDateString('pt-BR')
                        : '—'
                      }
                    </span>
                    {client.last_visit_date && (
                      <span className="text-[9px] text-zinc-600 mt-0.5">
                        Há {Math.floor((Date.now() - new Date(client.last_visit_date).getTime()) / (1000 * 3600 * 24))} dias
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 md:col-span-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-zinc-800 text-[var(--dark-text-muted)] hover:text-white" onClick={(e) => { e.stopPropagation(); setSelectedClient(client); }}>
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
                className="hover:border-[var(--dark-brand-50)] flex flex-col h-full relative group transition-all duration-300"
                onClick={() => setSelectedClient(client)}
                noPadding
              >
                <div className="p-6 pb-0">
                  <div className="flex justify-between items-start mb-4 mt-3">
                    <div className="flex items-center gap-3 w-full">
                      <ClientAvatar client={client} size="lg" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-[var(--dark-text-main)] leading-tight flex items-center gap-2 truncate">
                          {client.name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-[var(--dark-text-muted)] mt-1">
                          <span className={`w-2 h-2 rounded-full ${client.loyalty_tier === 'Diamante' ? 'bg-cyan-500' :
                            client.loyalty_tier === 'Ouro' ? 'bg-yellow-500' : 'bg-zinc-600'
                            }`}></span>
                          {client.loyalty_tier || 'Bronze'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1 flex flex-col">
                    {/* Tags Area */}
                    <div
                      className="flex flex-wrap gap-2 min-h-[32px] content-start"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {client.tags && Array.isArray(client.tags) && client.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant={tag === 'VIP' ? 'vip' : 'default'} className="pr-1 text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                      <button
                        onClick={() => setEditingClientId(client.id)}
                        className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-[var(--dark-text-muted)] hover:text-[var(--dark-text-main)] px-2 py-0.5 rounded-full border border-zinc-800 hover:border-zinc-700 border-dashed flex items-center gap-1 transition-all"
                      >
                        <Plus size={10} /> Tag
                      </button>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 pt-3">
                      <div className="text-center p-2 bg-zinc-950 rounded-lg">
                        <div className="text-[10px] text-[var(--dark-text-muted)] uppercase font-bold">LTV</div>
                        <div className="text-sm font-bold text-emerald-500">R$ {client.lifetime_value || 0}</div>
                      </div>
                      <div className="text-center p-2 bg-zinc-950 rounded-lg">
                        <div className="text-[10px] text-[var(--dark-text-muted)] uppercase font-bold">Visitas</div>
                        <div className="text-sm font-bold text-white">{client.total_visits || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border-t border-zinc-800 mt-4 bg-zinc-950/30">
                  <div className="text-xs text-[var(--dark-text-muted)] flex items-center gap-1">
                    <Clock size={12} />
                    {client.last_visit_date
                      ? new Date(client.last_visit_date).toLocaleDateString('pt-BR')
                      : '—'
                    }
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs"
                    onClick={(e) => { e.stopPropagation(); toast.info(`Para agendar ${client.name}, vá para a aba Agenda`); }}
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
        <div className="col-span-full py-16 text-center text-[var(--dark-text-muted)] border-2 border-dashed border-zinc-800 rounded-2xl bg-zinc-900/50">
          <Hash size={48} className="mx-auto mb-4 opacity-20" />
          <h3 className="text-lg font-bold text-white mb-2">Nenhum cliente encontrado</h3>
          <p className="text-sm mb-6">Tente ajustar os filtros ou busque por outro nome.</p>
          <button
            onClick={() => { setSearchTerm(''); setSelectedTagFilter('Todos'); setClientTypeFilter('all'); }}
            className="text-[var(--dark-brand-primary)] hover:underline text-sm font-bold"
          >
            Limpar todos os filtros
          </button>
        </div>
      )}

      {/* Modals */}
      {selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onEdit={() => {
            setEditingClient(selectedClient);
            setShowClientModal(true);
            setSelectedClient(null);
          }}
          onDelete={() => {
            setSelectedClient(null);
            if (clientsData) {
              setClients(clientsData.filter(c => c.id !== selectedClient.id));
            }
          }}
          onSave={(updatedData) => {
            setClients(prev =>
              prev.map(c =>
                c.id === selectedClient.id ? { ...c, ...updatedData } : c
              )
            );
            setSelectedClient(prev => prev ? { ...prev, ...updatedData } : null);
          }}
        />
      )}

      {showClientModal && (
        <ClientModal
          client={editingClient}
          onClose={() => setShowClientModal(false)}
          onSuccess={handleClientSuccess}
        />
      )}
    </div>
  );
};

export default Clients;
