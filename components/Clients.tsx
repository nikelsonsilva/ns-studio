/**
 * Clients Screen - NS Studio Design System
 * Design exato do ns-studio UI com lógica do sistema atual
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

const Clients: React.FC = () => {
 // ========== LOGIC - DO NOT MODIFY ==========
 const { data: clientsData } = useSupabaseQuery(fetchClients);
 const [searchTerm, setSearchTerm] = useState('');
 const [selectedClient, setSelectedClient] = useState<Client | null>(null);
 const [selectedTagFilter, setSelectedTagFilter] = useState<string>('Todos');
 const [sendingCampaign, setSendingCampaign] = useState<string | null>(null);
 const [editingClientId, setEditingClientId] = useState<string | null>(null);
 const [newTagInput, setNewTagInput] = useState('');
 const [clients, setClients] = useState<Client[]>([]);
 const toast = useToast();

 React.useEffect(() => {
  if (clientsData) {
   setClients(clientsData);
  }
 }, [clientsData]);

 const [showClientModal, setShowClientModal] = useState(false);
 const [editingClient, setEditingClient] = useState<Client | null>(null);

 // Derive unique tags for filter
 const allTags = useMemo(() => {
  const tags = new Set<string>();
  clients.forEach(c => {
   if (c.tags && Array.isArray(c.tags)) {
    c.tags.forEach(t => tags.add(t));
   }
  });
  return ['Todos', ...Array.from(tags)];
 }, [clients]);

 // Filtering Logic
 const filteredClients = clients.filter(c => {
  const matchesSearch =
   c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
   c.phone.includes(searchTerm);

  let matchesFilter = true;
  if (selectedTagFilter === 'Todos') {
   matchesFilter = true;
  } else if (selectedTagFilter === 'VIP') {
   matchesFilter = c.tags && Array.isArray(c.tags) && c.tags.includes('VIP');
  } else if (selectedTagFilter === 'Frequentes') {
   matchesFilter = (c.total_visits || 0) >= 5;
  } else if (selectedTagFilter === 'Inativos') {
   if (c.last_visit_date) {
    const lastVisit = new Date(c.last_visit_date);
    const daysSinceVisit = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    matchesFilter = daysSinceVisit > 30;
   } else {
    matchesFilter = true;
   }
  } else if (selectedTagFilter === 'Novos') {
   const createdAt = new Date(c.created_at);
   const daysSinceCreated = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
   matchesFilter = daysSinceCreated <= 30;
  } else {
   matchesFilter = c.tags && Array.isArray(c.tags) && c.tags.includes(selectedTagFilter);
  }

  return matchesSearch && matchesFilter;
 });

 // Calculate filter counts
 const filterCounts = useMemo(() => {
  const vipCount = clients.filter(c => c.tags && Array.isArray(c.tags) && c.tags.includes('VIP')).length;
  const frequentCount = clients.filter(c => (c.total_visits || 0) >= 5).length;
  const inactiveCount = clients.filter(c => {
   if (c.last_visit_date) {
    const lastVisit = new Date(c.last_visit_date);
    const daysSinceVisit = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceVisit > 30;
   }
   return true;
  }).length;
  const newCount = clients.filter(c => {
   const createdAt = new Date(c.created_at);
   const daysSinceCreated = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
   return daysSinceCreated <= 30;
  }).length;
  const churnRiskCount = clients.filter(c => c.tags && Array.isArray(c.tags) && c.tags.includes('Risco Churn')).length;
  const monthlyCount = clients.filter(c => c.tags && Array.isArray(c.tags) && c.tags.includes('Mensalista')).length;

  return {
   Todos: clients.length,
   VIP: vipCount,
   Frequentes: frequentCount,
   Inativos: inactiveCount,
   Novos: newCount,
   'Risco Churn': churnRiskCount,
   Mensalista: monthlyCount
  };
 }, [clients]);

 // Helper to detect client status
 const getClientStatus = (client: Client) => {
  const isVIP = client.tags && Array.isArray(client.tags) && client.tags.includes('VIP');
  const isChurnRisk = client.tags && Array.isArray(client.tags) && client.tags.includes('Risco Churn');
  const isMensalista = client.tags && Array.isArray(client.tags) && client.tags.includes('Mensalista');
  const hasDelay = client.tags && Array.isArray(client.tags) && client.tags.includes('Atrasa');

  // Check if inactive (>30 days since last visit)
  let isInactive = false;
  if (client.last_visit_date) {
   const lastVisit = new Date(client.last_visit_date);
   const daysSinceVisit = Math.floor((Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));
   isInactive = daysSinceVisit > 30;
  }

  return { isVIP, isChurnRisk, isMensalista, hasDelay, isInactive };
 };

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
  toast.success(`Tag"${newTagInput.trim()}" adicionada!`);
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

 const handleCampaign = (campaignName: string) => {
  setSendingCampaign(campaignName);
  setTimeout(() => {
   setSendingCampaign(null);
   toast.success(`Campanha"${campaignName}" enviada para o segmento selecionado!`);
  }, 2000);
 };

 const handleCreateClient = () => {
  setEditingClient(null);
  setShowClientModal(true);
 };

 const handleClientSuccess = () => {
  window.location.reload();
 };
 // ========== END LOGIC ==========

 return (
  <div className="space-y-6 animate-fade-in pb-20">

   {/* Smart Campaigns Bar - DESATIVADO (Em Breve) */}
   <Card className="relative overflow-hidden bg-gradient-to-r from-barber-900 to-barber-950 border-[var(--border-default)] opacity-60 cursor-not-allowed" noPadding>
    <div className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
     <div className="flex items-center gap-3">
      <div className="bg-[var(--brand)]/50 p-2 rounded-lg text-black/50 shrink-0">
       <Megaphone size={20} />
      </div>
      <div>
       <h3 className="text-[var(--text-primary)]/70 font-bold text-sm flex items-center gap-2">
        Marketing Inteligente
        <span className="bg-[var(--brand)]/20 text-[var(--brand-primary)] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
         Em Breve
        </span>
       </h3>
       <p className="text-[var(--text-subtle)] text-xs">Envie campanhas via WhatsApp.</p>
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
       leftIcon={<UserCheck size={14} className="text-[var(--brand-primary)]/50" />}
      >
       Oferta VIP
      </Button>
     </div>
    </div>
   </Card>

   {/* Header & Search */}
   <Card>
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
     <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
      <span className="bg-[var(--surface-subtle)] p-2 rounded-lg text-[var(--brand-primary)]"><Tag size={20} /></span>
      Base de Clientes
     </h2>
     <div className="w-full md:w-auto">
      <Button onClick={handleCreateClient} leftIcon={<Plus size={16} />}>
       Novo Cliente
      </Button>
     </div>
    </div>

    <div className="w-full mb-4">
     <Input
      placeholder="Buscar por nome ou telefone..."
      icon={<Search size={18} />}
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
     />
    </div>

    {/* Tag Filters with Counters */}
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-t border-[var(--border-default)] pt-4 w-full">
     <span className="text-xs text-[var(--text-subtle)] font-bold uppercase mr-2 flex items-center gap-1 shrink-0">
      <Filter size={12} /> Filtros:
     </span>
     {[
      { tag: 'Todos', color: 'default' },
      { tag: 'VIP', color: 'purple' },
      { tag: 'Frequentes', color: 'green' },
      { tag: 'Novos', color: 'cyan' },
      { tag: 'Inativos', color: 'gray' },
      { tag: 'Risco Churn', color: 'red' },
      { tag: 'Mensalista', color: 'blue' }
     ].map(({ tag, color }) => {
      const count = filterCounts[tag as keyof typeof filterCounts] || 0;
      const isActive = selectedTagFilter === tag;

      // Color classes based on filter type
      const colorClasses = isActive ? 'bg-[var(--brand-primary)] text-black border-barber-gold' : {
       default: 'bg-[var(--surface-subtle)] text-[var(--text-[var(--text-muted)])] border-[var(--border-default)] hover:border-gray-600 hover:text-[var(--text-primary)]',
       purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:border-purple-500/50',
       green: 'bg-green-500/10 text-[var(--status-success)] border-green-500/30 hover:border-green-500/50',
       cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:border-cyan-500/50',
       gray: 'bg-[var(--surface-subtle)]0/10 text-[var(--text-[var(--text-muted)])] border-gray-500/30 hover:border-gray-500/50',
       red: 'bg-red-500/10 text-[var(--status-error)] border-red-500/30 hover:border-red-500/50',
       blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:border-blue-500/50'
      }[color];

      return (
       <button
        key={tag}
        onClick={() => setSelectedTagFilter(tag)}
        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5 ${isActive ? 'bg-[var(--brand-primary)] text-black border-barber-gold' : colorClasses
         }`}
       >
        {tag}
        <span className={`text-[10px] ${isActive ? 'text-black/60' : 'opacity-60'}`}>
         ({count})
        </span>
       </button>
      );
     })}
    </div>
   </Card>

   {/* Clients List - Compact Layout */}
   <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
    {/* List Header */}
    <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-[var(--surface-subtle)] border-b border-[var(--border-default)] text-xs text-[var(--text-subtle)] uppercase font-bold">
     <div className="col-span-5">Cliente</div>
     <div className="col-span-2">Status</div>
     <div className="col-span-2">Última Visita</div>
     <div className="col-span-1 text-center">Visitas</div>
     <div className="col-span-2 text-right">Ações</div>
    </div>

    {/* List Body */}
    <div className="divide-y divide-barber-800">
     {filteredClients.map(client => {
      const status = getClientStatus(client);

      return (
       <div
        key={client.id}
        className="grid grid-cols-12 gap-4 px-4 py-3 items-center group cursor-pointer hover:bg-[var(--surface-subtle)]/30 transition-colors"
        onClick={() => setSelectedClient(client)}
       >
        {/* Avatar + Nome */}
        <div className="col-span-5 flex items-center gap-3 min-w-0">
         <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${status.isVIP
          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
          : 'bg-[var(--surface-subtle)] text-[var(--brand-primary)] border border-[var(--border-strong)]'
          }`}>
          {client.name.charAt(0)}
         </div>
         <div className="min-w-0">
          <h3 className="font-medium text-[var(--text-primary)] truncate flex items-center gap-1.5">
           {client.name}
           {client.loyalty_tier === 'Ouro' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
           {client.loyalty_tier === 'Diamante' && <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />}
          </h3>
          {client.phone && (
           <p className="text-xs text-[var(--text-subtle)] truncate">{client.phone}</p>
          )}
         </div>
        </div>

        {/* Status Badges - Inline */}
        <div className="col-span-2 flex flex-wrap gap-1">
         {status.isVIP && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/20 text-purple-400">VIP</span>
         )}
         {status.isChurnRisk && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-[var(--status-error)]">Risco</span>
         )}
         {status.isMensalista && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400">Mensal</span>
         )}
         {status.hasDelay && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-400">Atrasa</span>
         )}
         {!status.isVIP && !status.isChurnRisk && !status.isMensalista && !status.hasDelay && !status.isInactive && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-500/10 text-[var(--status-success)]">Ativo</span>
         )}
         {status.isInactive && !status.isChurnRisk && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--surface-subtle)]0/20 text-[var(--text-[var(--text-muted)])]">Inativo</span>
         )}
        </div>

        {/* Última Visita */}
        <div className="col-span-2 text-sm text-[var(--text-[var(--text-muted)])]">
         {client.last_visit_date
          ? new Date(client.last_visit_date).toLocaleDateString('pt-BR')
          : <span className="text-[var(--text-subtle)]">—</span>
         }
        </div>

        {/* Visitas */}
        <div className="col-span-1 text-center">
         <span className="text-sm font-bold text-[var(--text-primary)]">{client.total_visits ?? 0}</span>
        </div>

        {/* Hover Actions */}
        <div className="col-span-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
         <button
          onClick={(e) => {
           e.stopPropagation();
           toast.info(`Para agendar ${client.name}, vá para a aba Agenda`);
          }}
          className="text-xs text-[var(--text-[var(--text-muted)])] hover:text-[var(--brand-primary)] p-1.5 rounded hover:bg-[var(--surface-subtle)] transition-colors"
          title="Agendar"
         >
          <Calendar size={14} />
         </button>
         <button
          onClick={(e) => {
           e.stopPropagation();
           setEditingClient(client);
           setShowClientModal(true);
          }}
          className="text-xs text-[var(--text-[var(--text-muted)])] hover:text-[var(--text-primary)] p-1.5 rounded hover:bg-[var(--surface-subtle)] transition-colors"
          title="Editar"
         >
          <Edit2 size={14} />
         </button>
         <button
          onClick={(e) => {
           e.stopPropagation();
           setSelectedClient(client);
          }}
          className="text-xs text-[var(--text-[var(--text-muted)])] hover:text-[var(--text-primary)] p-1.5 rounded hover:bg-[var(--surface-subtle)] transition-colors"
          title="Ver detalhes"
         >
          <Eye size={14} />
         </button>
        </div>
       </div>
      );
     })}
    </div>

    {/* Empty State */}
    {filteredClients.length === 0 && (
     <div className="py-12 text-center text-[var(--text-subtle)]">
      <Hash size={32} className="mx-auto mb-2 opacity-20" />
      <p>Nenhum cliente encontrado.</p>
      <button
       onClick={() => { setSearchTerm(''); setSelectedTagFilter('Todos'); }}
       className="mt-3 text-[var(--brand-primary)] hover:underline text-sm"
      >
       Limpar filtros
      </button>
     </div>
    )}
   </div>

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
