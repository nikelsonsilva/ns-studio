/**
 * Clients Screen - Barber Dark Premium (NS Studio)
 * ⚠️ LOGIC 100% PRESERVED - Only visual/UI
 */
import React, { useState, useMemo } from 'react';
import {
  Phone,
  Calendar,
  Eye,
  Plus,
  X,
  Check,
  Tag,
} from 'lucide-react';
import { Client } from '../types';
import ClientDetailsModal from './ClientDetailsModal';
import ClientModal from './ClientModal';

// ========== LOGIC IMPORTS - DO NOT MODIFY ==========
import { useSupabaseQuery } from '../lib/hooks';
import { fetchClients, deleteClient } from '../lib/database';
import { updateClientTags } from '../lib/clientService';

// ========== UI COMPONENTS ==========
import { PageLayout } from '../src/ui/page-layout';
import { Button } from '../src/ui/button';
import { Badge } from '../src/ui/badge';
import { SearchInput } from '../src/ui/search-input';
import { Chip } from '../src/ui/chip';
import { Avatar } from '../src/ui/avatar';
import { EmptyState } from '../src/ui/empty-state';
import { Banner } from '../src/ui/banner';
import { Card, CardBody } from '../src/ui/card';
import { Icon } from '../src/ui/icon';

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

  React.useEffect(() => {
    if (clientsData) {
      setClients(clientsData);
    }
  }, [clientsData]);

  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    clients.forEach(c => {
      if (c.tags && Array.isArray(c.tags)) {
        c.tags.forEach(t => tags.add(t));
      }
    });
    return ['Todos', ...Array.from(tags)];
  }, [clients]);

  const filteredClients = clients.filter(c => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm);

    // Smart filter logic
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
        matchesFilter = true; // Never visited = inactive
      }
    } else if (selectedTagFilter === 'Novos') {
      const createdAt = new Date(c.created_at);
      const daysSinceCreated = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
      matchesFilter = daysSinceCreated <= 30;
    } else {
      // Fallback: check if tag exists
      matchesFilter = c.tags && Array.isArray(c.tags) && c.tags.includes(selectedTagFilter);
    }

    return matchesSearch && matchesFilter;
  });

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

    // Update local state
    setClients(prev =>
      prev.map(c =>
        c.id === clientId ? { ...c, tags: updatedTags } : c
      ),
    );

    // Save to database
    await updateClientTags(clientId, updatedTags);

    setNewTagInput('');
    setEditingClientId(null);
  };

  const handleRemoveTag = async (clientId: string, tagToRemove: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const updatedTags = (client.tags || []).filter(t => t !== tagToRemove);

    // Update local state
    setClients(prev =>
      prev.map(c =>
        c.id === clientId ? { ...c, tags: updatedTags } : c
      ),
    );

    // Save to database
    await updateClientTags(clientId, updatedTags);
  };

  const handleCampaign = (campaignName: string) => {
    setSendingCampaign(campaignName);
    setTimeout(() => {
      setSendingCampaign(null);
      alert(`Campanha "${campaignName}" enviada!`);
    }, 2000);
  };

  const handleCreateClient = () => {
    setEditingClient(null);
    setShowClientModal(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setShowClientModal(true);
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      await deleteClient(id);
      setClients(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleClientSuccess = () => {
    window.location.reload();
  };
  // ========== END LOGIC ==========

  return (
    <PageLayout
      title="Clientes"
      description="Gerencie relacionamento e histórico de clientes."
      actions={
        <Button onClick={handleCreateClient} className="btn-gold">
          <Plus size={14} /> Novo Cliente
        </Button>
      }
    >
      {/* Banner Marketing Inteligente - EM BREVE */}
      <div className="mb-6 rounded-xl border border-barber-800 bg-gradient-to-r from-barber-900 to-barber-950 p-4 shadow-lg opacity-60">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-barber-gold/20 text-barber-gold">
              <Icon name="megaphone" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Marketing Inteligente</h2>
                <span className="rounded-full bg-barber-gold/20 px-2 py-0.5 text-[10px] font-bold text-barber-gold">Em breve</span>
              </div>
              <p className="text-xs text-text-muted">Envie campanhas via WhatsApp.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              disabled
              className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-barber-800 bg-barber-900 px-3 py-2 text-xs font-bold text-text-muted opacity-50"
            >
              <Icon name="clock" size={14} />
              Recuperar Inativos
            </button>
            <button
              disabled
              className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-barber-800 bg-barber-900 px-3 py-2 text-xs font-bold text-text-muted opacity-50"
            >
              <Icon name="gift" size={14} />
              Aniversariantes
            </button>
            <button
              disabled
              className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-barber-800 bg-barber-900 px-3 py-2 text-xs font-bold text-text-muted opacity-50"
            >
              <Icon name="user-check" size={14} />
              Oferta VIP
            </button>
          </div>
        </div>
      </div>

      {/* Base de Clientes */}
      <div className="mb-6 rounded-xl border border-barber-800 bg-barber-900 p-5 shadow-lg">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-barber-800">
            <Tag size={16} className="text-barber-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Base de Clientes</h2>
          </div>
        </div>

        {/* Search Input */}
        <div className="mb-4">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar por nome ou telefone..."
            size="md"
          />
        </div>

        {/* Smart Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-text-muted">
            <Icon name="filter" size={14} />
            <span className="text-xs font-bold uppercase tracking-wide">Filtros:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip
              label="Todos"
              variant={selectedTagFilter === 'Todos' ? 'primary' : 'outline'}
              selected={selectedTagFilter === 'Todos'}
              onClick={() => setSelectedTagFilter('Todos')}
            />
            <Chip
              label="#VIP"
              variant={selectedTagFilter === 'VIP' ? 'primary' : 'outline'}
              selected={selectedTagFilter === 'VIP'}
              onClick={() => setSelectedTagFilter('VIP')}
            />
            <Chip
              label="#Frequentes"
              variant={selectedTagFilter === 'Frequentes' ? 'primary' : 'outline'}
              selected={selectedTagFilter === 'Frequentes'}
              onClick={() => setSelectedTagFilter('Frequentes')}
            />
            <Chip
              label="#Inativos"
              variant={selectedTagFilter === 'Inativos' ? 'primary' : 'outline'}
              selected={selectedTagFilter === 'Inativos'}
              onClick={() => setSelectedTagFilter('Inativos')}
            />
            <Chip
              label="#Novos"
              variant={selectedTagFilter === 'Novos' ? 'primary' : 'outline'}
              selected={selectedTagFilter === 'Novos'}
              onClick={() => setSelectedTagFilter('Novos')}
            />
          </div>
        </div>
      </div>

      {/* Cards de Clientes */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredClients.map(client => (
          <div
            key={client.id}
            onClick={() => setSelectedClient(client)}
            className="group cursor-pointer rounded-xl border border-barber-800 bg-barber-900 p-5 shadow-lg transition-all hover:border-barber-gold/50"
          >
            {/* Header */}
            <div className="mb-3 flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <Avatar name={client.name} size="md" />
                <div>
                  <h3 className="font-bold text-white">{client.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-text-muted">
                    <Calendar size={12} />
                    <span>
                      Última:{' '}
                      {client.last_visit_date
                        ? new Date(client.last_visit_date).toLocaleDateString('pt-BR')
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={e => {
                  e.stopPropagation();
                  setSelectedClient(client);
                }}
                className="flex items-center gap-1 text-xs text-barber-gold opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Eye size={14} />
                Ver ficha
              </button>
            </div>

            {/* Tags */}
            <div
              className="mb-3 flex min-h-[28px] flex-wrap gap-1.5"
              onClick={e => e.stopPropagation()}
            >
              {(client.tags || []).map(tag => (
                <span
                  key={tag}
                  className={`group/tag inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${tag === 'VIP'
                    ? 'tag-vip'
                    : 'bg-barber-950 text-text-soft border border-barber-800'
                    }`}
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(client.id, tag)}
                    className="ml-1 opacity-0 transition-opacity group-hover/tag:opacity-100 hover:text-danger-500"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}

              {editingClientId === client.id ? (
                <div className="flex items-center gap-1 rounded-full border border-barber-800 bg-barber-950 px-2 py-0.5">
                  <input
                    autoFocus
                    type="text"
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTag(client.id)}
                    onBlur={() => handleAddTag(client.id)}
                    className="w-16 bg-transparent text-xs text-white outline-none"
                    placeholder="tag..."
                  />
                  <button
                    onMouseDown={() => handleAddTag(client.id)}
                    className="text-success-500"
                  >
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingClientId(client.id)}
                  className="flex items-center gap-1 rounded-full border border-barber-800 bg-barber-800 px-2 py-0.5 text-xs text-text-muted hover:bg-barber-700"
                >
                  <Plus size={12} />
                </button>
              )}
            </div>

            {/* Preferências */}
            <div className="mb-3 rounded-lg border border-barber-800 bg-barber-950 p-3">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-barber-gold">
                Preferências
              </span>
              <p className="text-sm text-text-muted">
                {client.preferences || 'Sem preferências cadastradas'}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-barber-800 pt-3">
              <div>
                <div className="text-lg font-bold text-white">{client.total_visits ?? 0}</div>
                <div className="text-xs font-bold uppercase text-text-faint">Visitas</div>
              </div>
              <button
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 rounded-lg bg-barber-800 px-4 py-2 text-sm font-bold text-white hover:bg-barber-700"
              >
                <Calendar size={16} />
                Agendar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <EmptyState
          iconName="users"
          title="Nenhum cliente encontrado"
          description="Ajuste seus filtros ou adicione um novo cliente."
          actionLabel="Limpar filtros"
          onAction={() => {
            setSearchTerm('');
            setSelectedTagFilter('Todos');
          }}
        />
      )}

      {/* Modals - LOGIC PRESERVED */}
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
            // Refresh client list
            if (clientsData) {
              setClients(clientsData.filter(c => c.id !== selectedClient.id));
            }
          }}
          onSave={(updatedData) => {
            // Update client in local state
            setClients(prev =>
              prev.map(c =>
                c.id === selectedClient.id ? { ...c, ...updatedData } : c
              )
            );
            // Also update selectedClient so modal shows fresh data
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
    </PageLayout>
  );
};

export default Clients;
