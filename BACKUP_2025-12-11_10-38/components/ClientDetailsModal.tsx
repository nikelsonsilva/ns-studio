/**
 * ClientDetailsModal - Barber Dark Premium (NS Studio)
 * ⚠️ LOGIC 100% PRESERVED
 */
import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Coffee,
  MessageCircle,
  Calendar,
  DollarSign,
  StickyNote,
  History,
  Award,
  Plus,
  Trash2,
  Bell,
  Check,
  Clock,
  Camera,
  Image as ImageIcon,
  Crown,
  LayoutGrid,
  Edit2,
  Phone,
  Mail,
  Save,
} from 'lucide-react';
import { Client, ClientPhoto, LoyaltyTier } from '../types';
import {
  fetchClientWithHistory,
  updateClientNotes,
  updateClientTags,
  updateClientPreferences,
  getDaysSinceLastVisit,
  type AppointmentHistory,
  type ClientStats,
} from '../lib/clientService';
import { deleteClient, updateClient, getCurrentBusinessId } from '../lib/database';
import { formatPhone } from '../lib/validation';
import { fetchBusinessSettings, BusinessSettings } from '../lib/settingsService';

// UI Components
import { Badge } from '../src/ui/badge';
import { Switch } from '../src/ui/switch';
import { Button } from '../src/ui/button';

interface ClientDetailsModalProps {
  client: Client;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSave?: (updatedClient: Partial<Client>) => void;
}

const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({
  client,
  onClose,
  onEdit,
  onDelete,
  onSave,
}) => {
  // ========== LOGIC - DO NOT MODIFY ==========
  const [activeTab, setActiveTab] = useState<'overview' | 'gallery'>('overview');
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [historyData, setHistoryData] = useState<AppointmentHistory[]>([]);
  const [clientStats, setClientStats] = useState<ClientStats>({
    totalVisits: client.total_visits || 0,
    lifetimeValue: client.lifetime_value || 0,
    averageTicket: 0,
    lastVisitDate: client.last_visit_date || null,
  });

  const [tags, setTags] = useState<string[]>(client.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [notes, setNotes] = useState(client.internal_notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [reminderDays, setReminderDays] = useState(30);
  const [reminderActive, setReminderActive] = useState(false);

  // Pagination for history
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Editable preferences
  const [isEditingPrefs, setIsEditingPrefs] = useState(false);
  const [drinkPref, setDrinkPref] = useState(client.drink_preference || '');
  const [convStyle, setConvStyle] = useState(client.conversation_style || '');
  const [favoriteCut, setFavoriteCut] = useState(typeof client.preferences === 'string' ? client.preferences : '');
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inline editing for personal info
  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false);
  const [editName, setEditName] = useState(client.name);
  const [editPhone, setEditPhone] = useState(client.phone || '');
  const [editEmail, setEditEmail] = useState(client.email || '');
  const [isSavingPersonalInfo, setIsSavingPersonalInfo] = useState(false);

  // Business settings for feature toggles
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);

  useEffect(() => {
    const loadClientData = async () => {
      setIsLoading(true);
      const data = await fetchClientWithHistory(client.id);
      if (data) {
        setHistoryData(data.history);
        setClientStats(data.stats);
      }
      // Load business settings for feature toggles
      const businessId = await getCurrentBusinessId();
      if (businessId) {
        const settings = await fetchBusinessSettings(businessId);
        setBusinessSettings(settings);
      }
      setIsLoading(false);
    };
    loadClientData();
  }, [client.id]);

  const points = client.loyalty_points || (clientStats.totalVisits % 10);
  const maxPoints = 10;

  const calculateTier = (visits: number): LoyaltyTier => {
    if (visits > 30) return 'Diamante';
    if (visits > 15) return 'Ouro';
    if (visits > 5) return 'Prata';
    return 'Bronze';
  };

  const tier = client.loyalty_tier || calculateTier(clientStats.totalVisits);

  const getTierColor = (t: LoyaltyTier) => {
    switch (t) {
      case 'Diamante': return 'text-blue-400';
      case 'Ouro': return 'text-barber-gold';
      case 'Prata': return 'text-gray-300';
      default: return 'text-amber-600';
    }
  };

  const daysSinceLastVisit = getDaysSinceLastVisit(clientStats.lastVisitDate);

  const initialPhotos: ClientPhoto[] = client.photos || [];
  const [photos, setPhotos] = useState<ClientPhoto[]>(initialPhotos);

  const handleGenerateMessage = () => {
    const msg = `Fala ${client.name.split(' ')[0]}!\n\nJá faz ${daysSinceLastVisit} dias desde seu último corte. Que tal agendar pra essa semana?\n\nTenho horário livre na quinta às 17h. Bora?`;
    setGeneratedMessage(msg);
  };

  const handleAddTag = async () => {
    if (newTag.trim()) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag('');
      setIsAddingTag(false);
      await updateClientTags(client.id, updatedTags);
      // Notify parent to update client data
      if (onSave) {
        onSave({ tags: updatedTags });
      }
    }
  };

  const removeTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    await updateClientTags(client.id, updatedTags);
    // Notify parent to update client data
    if (onSave) {
      onSave({ tags: updatedTags });
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    const success = await updateClientNotes(client.id, notes);
    if (success) {
      // Notify parent to update client data
      if (onSave) {
        onSave({ internal_notes: notes });
      }
      setTimeout(() => setIsSavingNotes(false), 1000);
    } else {
      setIsSavingNotes(false);
      alert('Erro ao salvar notas');
    }
  };

  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    const prefsData = {
      drink_preference: drinkPref || undefined,
      conversation_style: convStyle || undefined,
      preferences: favoriteCut || undefined,
    };
    const success = await updateClientPreferences(client.id, prefsData);
    if (success) {
      // Notify parent to update client data
      if (onSave) {
        onSave(prefsData);
      }
      setIsEditingPrefs(false);
      setTimeout(() => setIsSavingPrefs(false), 1000);
    } else {
      setIsSavingPrefs(false);
      alert('Erro ao salvar preferências');
    }
  };

  const handleDeleteClient = async () => {
    setIsDeleting(true);
    const result = await deleteClient(client.id);
    setIsDeleting(false);
    if (result) {
      onClose();
      if (onDelete) onDelete();
    } else {
      alert('Erro ao excluir cliente');
    }
  };

  const handleSavePersonalInfo = async () => {
    if (!editName.trim()) {
      alert('Nome é obrigatório');
      return;
    }
    setIsSavingPersonalInfo(true);
    try {
      const updatedData = {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
      };
      await updateClient(client.id, updatedData);
      // Notify parent
      if (onSave) {
        onSave(updatedData);
      }
      setIsEditingPersonalInfo(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar informações');
    }
    setIsSavingPersonalInfo(false);
  };

  const handleCancelEditPersonalInfo = () => {
    setEditName(client.name);
    setEditPhone(client.phone || '');
    setEditEmail(client.email || '');
    setIsEditingPersonalInfo(false);
  };

  // Pagination calculations
  const totalPages = Math.ceil(historyData.length / itemsPerPage);
  const paginatedHistory = historyData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getPaymentBadgeVariant = (status: string) => {
    if (status === 'paid') return 'success';
    if (status === 'awaiting_payment' || status === 'pending') return 'warning';
    if (status === 'failed') return 'danger';
    return 'neutral';
  };
  // ========== END LOGIC ==========

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden border border-barber-800 bg-barber-900 shadow-modal md:h-[90vh] md:rounded-2xl">

        {/* Header */}
        <div className="border-b border-barber-800 bg-barber-950 px-5 pt-4 pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-barber-gold bg-gradient-to-br from-barber-800 to-barber-950 text-xl font-bold text-barber-gold">
                {(isEditingPersonalInfo ? editName : client.name).charAt(0)}
                <span className={`absolute -bottom-2 rounded-full bg-barber-950 border border-barber-800 px-2 py-0.5 text-[10px] font-bold ${getTierColor(tier)}`}>
                  {tier}
                </span>
              </div>

              {isEditingPersonalInfo ? (
                // Edit Mode - Personal Info Form
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="rounded-lg border border-barber-800 bg-barber-950 px-3 py-1.5 text-lg font-bold text-white outline-none focus:border-barber-gold"
                    placeholder="Nome do cliente"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <div className="flex flex-1 items-center gap-2 rounded-lg border border-barber-800 bg-barber-950 px-3 py-1.5">
                      <Phone size={14} className="flex-shrink-0 text-text-muted" />
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={e => setEditPhone(e.target.value)}
                        onBlur={() => setEditPhone(formatPhone(editPhone))}
                        className="w-full bg-transparent text-sm text-white outline-none"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    <div className="flex flex-1 items-center gap-2 rounded-lg border border-barber-800 bg-barber-950 px-3 py-1.5">
                      <Mail size={14} className="flex-shrink-0 text-text-muted" />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={e => setEditEmail(e.target.value)}
                        className="w-full bg-transparent text-sm text-white outline-none"
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEditPersonalInfo}
                      className="rounded-lg border border-barber-800 bg-barber-800 px-3 py-1 text-xs font-bold text-text-muted hover:bg-barber-700"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSavePersonalInfo}
                      disabled={isSavingPersonalInfo}
                      className="flex items-center gap-1 rounded-lg bg-barber-gold px-3 py-1 text-xs font-bold text-black hover:bg-barber-goldhover disabled:opacity-50"
                    >
                      <Save size={12} />
                      {isSavingPersonalInfo ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode - Display Info
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{client.name}</h2>
                    {tags.includes('VIP') && (
                      <span className="tag-vip rounded-full px-2 py-0.5 text-[10px] font-bold">VIP</span>
                    )}
                  </div>
                  <p className="text-sm text-text-muted">{client.phone}</p>
                  {client.email && (
                    <p className="text-xs text-text-faint">{client.email}</p>
                  )}

                  {/* Tags */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className={`group inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${tag === 'VIP' ? 'tag-vip' : 'bg-barber-950 text-text-soft border border-barber-800'
                          }`}
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger-500"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}

                    {isAddingTag ? (
                      <div className="flex items-center gap-1 rounded-full border border-barber-800 bg-barber-950 px-2 py-0.5">
                        <input
                          type="text"
                          value={newTag}
                          onChange={e => setNewTag(e.target.value)}
                          className="w-20 bg-transparent text-xs text-white outline-none"
                          placeholder="Tag..."
                          autoFocus
                          onKeyPress={e => e.key === 'Enter' && handleAddTag()}
                        />
                        <button onClick={handleAddTag} className="text-success-500">
                          <Check size={12} />
                        </button>
                        <button onClick={() => setIsAddingTag(false)} className="text-danger-500">
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsAddingTag(true)}
                        className="rounded-full border border-barber-800 bg-barber-800 px-2 py-0.5 text-[10px] text-text-muted hover:bg-barber-700"
                      >
                        <Plus size={10} className="inline" /> Add
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2">
              {/* Tabs */}
              <div className="flex rounded-lg border border-barber-800 bg-barber-950 p-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${activeTab === 'overview'
                    ? 'bg-barber-800 text-white'
                    : 'text-text-muted hover:text-white'
                    }`}
                >
                  <LayoutGrid size={14} />
                  Visão Geral
                </button>
                <button
                  disabled
                  className="flex cursor-not-allowed items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold text-text-muted opacity-50"
                >
                  <ImageIcon size={14} />
                  Galeria
                  <span className="ml-1 rounded-full bg-barber-gold/20 px-1.5 py-0.5 text-[9px] text-barber-gold">Em breve</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                {!isEditingPersonalInfo && (
                  <button
                    onClick={() => setIsEditingPersonalInfo(true)}
                    className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-barber-gold hover:bg-barber-800"
                    title="Editar cliente"
                  >
                    <Edit2 size={14} />
                    Editar
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-danger-500 hover:bg-barber-800"
                  title="Excluir cliente"
                >
                  <Trash2 size={14} />
                  Excluir
                </button>
              </div>

              <button
                onClick={onClose}
                className="rounded-lg p-2 text-text-muted hover:bg-barber-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-barber-950 px-5 py-5">
          {activeTab === 'overview' ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Coluna esquerda */}
              <div className="space-y-4">
                {/* Fidelidade - Só mostra se ativado nas configurações */}
                {businessSettings?.loyalty_enabled && (
                  <div className="rounded-xl border border-barber-800 bg-barber-900 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-barber-gold/20">
                          <Award size={14} className="text-barber-gold" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-barber-gold">Fidelidade {tier}</h3>
                          <p className="text-xs text-text-muted">{clientStats.totalVisits} visitas totais</p>
                        </div>
                      </div>
                      <span className="rounded-full border border-barber-800 bg-barber-950 px-2 py-0.5 text-xs text-text-muted">
                        {points}/{maxPoints}
                      </span>
                    </div>

                    <div className="mb-2 grid grid-cols-5 gap-1.5">
                      {Array.from({ length: maxPoints }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex aspect-square items-center justify-center rounded-full border text-xs font-bold ${i < points
                            ? 'border-barber-gold bg-barber-gold text-black'
                            : 'border-barber-800 bg-barber-950 text-text-muted'
                            }`}
                        >
                          {i < points ? <Check size={12} /> : i + 1}
                        </div>
                      ))}
                    </div>

                    <p className="text-center text-xs text-text-soft">
                      Faltam <span className="font-bold text-barber-gold">{maxPoints - points}</span> cortes para resgatar prêmio!
                    </p>
                  </div>
                )}

                {/* LTV */}
                <div className="rounded-xl border border-barber-800 bg-barber-900 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-text-faint">
                    <DollarSign size={14} className="text-success-500" />
                    Lifetime Value (LTV)
                  </div>
                  <div className="text-2xl font-bold text-white">
                    R$ {clientStats.lifetimeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-text-muted">
                    Ticket Médio: R$ {clientStats.averageTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Preferências - EDITABLE */}
                <div className="rounded-xl border border-barber-800 bg-barber-900 p-4">
                  <div className="mb-3 flex items-center justify-between border-b border-barber-800 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-barber-800">
                        <Coffee size={14} className="text-barber-gold" />
                      </div>
                      <h3 className="text-sm font-bold text-white">Preferências</h3>
                    </div>
                    {isEditingPrefs ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsEditingPrefs(false)}
                          className="text-xs text-text-muted hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSavePreferences}
                          disabled={isSavingPrefs}
                          className="text-xs font-bold text-barber-gold hover:text-barber-goldlight"
                        >
                          {isSavingPrefs ? 'Salvando...' : 'Salvar'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditingPrefs(true)}
                        className="text-xs text-barber-gold hover:text-barber-goldlight"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-barber-800 pb-2 text-xs">
                      <span className="text-text-muted">Bebida</span>
                      {isEditingPrefs ? (
                        <input
                          type="text"
                          value={drinkPref}
                          onChange={e => setDrinkPref(e.target.value)}
                          placeholder="Ex: Café, Água..."
                          className="w-24 rounded border border-barber-800 bg-barber-950 px-2 py-1 text-xs text-white outline-none focus:border-barber-gold"
                        />
                      ) : (
                        <span className="text-white">{drinkPref || client.drink_preference || 'Café'}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-b border-barber-800 pb-2 text-xs">
                      <span className="text-text-muted">Estilo</span>
                      {isEditingPrefs ? (
                        <select
                          value={convStyle}
                          onChange={e => setConvStyle(e.target.value)}
                          className="rounded border border-barber-800 bg-barber-950 px-2 py-1 text-xs text-white outline-none focus:border-barber-gold"
                        >
                          <option value="">Selecionar...</option>
                          <option value="Quieto">Quieto</option>
                          <option value="Normal">Normal</option>
                          <option value="Falante">Falante</option>
                        </select>
                      ) : (
                        <span className="text-white">{convStyle || client.conversation_style || 'Normal'}</span>
                      )}
                    </div>
                    <div className="pt-1">
                      <span className="block text-xs text-text-muted">Corte favorito</span>
                      {isEditingPrefs ? (
                        <input
                          type="text"
                          value={favoriteCut}
                          onChange={e => setFavoriteCut(e.target.value)}
                          placeholder="Ex: Degradê, Social..."
                          className="mt-1 w-full rounded border border-barber-800 bg-barber-950 px-2 py-1 text-xs text-white outline-none focus:border-barber-gold"
                        />
                      ) : (
                        <span className="mt-1 inline-block rounded-full border border-barber-800 bg-barber-950 px-2 py-0.5 text-xs text-text-soft">
                          {favoriteCut || (typeof client.preferences === 'string' ? client.preferences : 'Não especificado')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna direita (2/3) */}
              <div className="space-y-4 lg:col-span-2">
                {/* Lembrete + Notas */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Lembrete - DISABLED */}
                  <div className="rounded-xl border border-barber-800 bg-barber-900 p-4 opacity-60">
                    <div className="mb-3 flex items-center justify-between border-b border-barber-800 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-barber-800">
                          <Bell size={14} className="text-text-muted" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Lembrete Automático</h3>
                        <span className="rounded-full bg-barber-gold/20 px-2 py-0.5 text-[10px] font-bold text-barber-gold">
                          Em breve
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-text-muted">
                      Notificações automáticas para clientes inativos.
                    </p>
                  </div>

                  {/* Notas */}
                  <div className="rounded-xl border border-barber-800 bg-barber-900 p-4">
                    <div className="mb-3 flex items-center justify-between border-b border-barber-800 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-barber-800">
                          <StickyNote size={14} className="text-warning-500" />
                        </div>
                        <h3 className="text-sm font-bold text-white">Notas</h3>
                      </div>
                      {isSavingNotes ? (
                        <span className="text-xs text-success-500"><Check size={12} className="inline" /> Salvo</span>
                      ) : (
                        <button onClick={handleSaveNotes} className="text-xs font-bold text-barber-gold hover:text-barber-goldlight">
                          Salvar
                        </button>
                      )}
                    </div>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="min-h-[80px] w-full rounded-lg border border-barber-800 bg-barber-950 px-3 py-2 text-xs text-white outline-none focus:border-barber-gold"
                      placeholder="Observações do cliente..."
                    />
                  </div>
                </div>

                {/* Assistant */}
                {/* Assistant Card - DISABLED */}
                <div className="rounded-xl border border-barber-800 bg-gradient-to-r from-barber-900 to-barber-950 p-4 opacity-60">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-barber-800">
                        <Sparkles size={15} className="text-text-muted" />
                      </div>
                      <h3 className="text-sm font-bold text-white">Assistant</h3>
                      <span className="rounded-full bg-barber-gold/20 px-2 py-0.5 text-[10px] font-bold text-barber-gold">
                        Em breve
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
                    <p className="text-xs text-text-muted">
                      IA para gerar mensagens personalizadas e automação de marketing.
                    </p>
                    <button
                      disabled
                      className="flex cursor-not-allowed items-center gap-1 rounded-lg bg-barber-800 px-4 py-2 text-xs font-bold text-text-muted opacity-50"
                    >
                      <Sparkles size={14} />
                      Gerar Mensagem
                    </button>
                  </div>
                </div>

                {/* Histórico */}
                <div className="rounded-xl border border-barber-800 bg-barber-900 p-4">
                  <div className="mb-3 flex items-center justify-between border-b border-barber-800 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-barber-800">
                        <History size={14} className="text-info-500" />
                      </div>
                      <h3 className="text-sm font-bold text-white">Histórico</h3>
                    </div>
                    <span className="rounded-full border border-barber-800 bg-barber-950 px-2 py-0.5 text-xs text-text-muted">
                      {clientStats.totalVisits} visitas
                    </span>
                  </div>

                  {/* Resumo pagamentos */}
                  {!isLoading && historyData.length > 0 && (
                    <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg border border-barber-800 bg-barber-950 p-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-success-500">
                          {historyData.filter(h => h.payment_status === 'paid').length}
                        </div>
                        <div className="text-[10px] uppercase text-text-faint">Pagos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-warning-500">
                          {historyData.filter(h => h.payment_status === 'awaiting_payment' || h.payment_status === 'pending').length}
                        </div>
                        <div className="text-[10px] uppercase text-text-faint">Pendentes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-danger-500">
                          {historyData.filter(h => h.payment_status === 'failed').length}
                        </div>
                        <div className="text-[10px] uppercase text-text-faint">Falharam</div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {isLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="h-14 animate-pulse rounded-lg bg-barber-800" />
                        ))}
                      </div>
                    ) : historyData.length === 0 ? (
                      <div className="py-6 text-center">
                        <History size={28} className="mx-auto mb-2 text-text-faint opacity-30" />
                        <p className="text-xs text-text-muted">Nenhum agendamento encontrado</p>
                      </div>
                    ) : (
                      <>
                        {paginatedHistory.map((item, i) => (
                          <div
                            key={item.id || i}
                            className="flex items-center justify-between rounded-lg border border-barber-800 bg-barber-950 px-3 py-2 hover:bg-barber-800/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-barber-800 text-text-muted">
                                <Calendar size={14} />
                              </div>
                              <div>
                                <div className="text-sm font-bold text-white">{item.service_name}</div>
                                <div className="flex items-center gap-1 text-[10px] text-text-muted">
                                  <Clock size={10} />
                                  {item.date} • {item.professional_name.split(' ')[0]}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-sm font-bold ${item.payment_status === 'paid' ? 'text-success-500' :
                                item.payment_status === 'awaiting_payment' || item.payment_status === 'pending' ? 'text-warning-500' :
                                  item.payment_status === 'failed' ? 'text-danger-500' : 'text-white'
                                }`}>
                                R$ {item.amount.toFixed(2).replace('.', ',')}
                              </div>
                              <Badge variant={getPaymentBadgeVariant(item.payment_status)} className="mt-0.5 text-[10px]">
                                {item.payment_status === 'paid' ? 'Pago' :
                                  item.payment_status === 'awaiting_payment' || item.payment_status === 'pending' ? 'Pendente' :
                                    item.payment_status === 'failed' ? 'Falhou' : item.payment_status}
                              </Badge>
                            </div>
                          </div>
                        ))}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between border-t border-barber-800 pt-3 mt-3">
                            <button
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className={`rounded-lg px-3 py-1 text-xs font-bold ${currentPage === 1
                                ? 'bg-barber-800 text-text-faint cursor-not-allowed'
                                : 'bg-barber-800 text-white hover:bg-barber-700'}`}
                            >
                              ← Anterior
                            </button>
                            <span className="text-xs text-text-muted">
                              Página {currentPage} de {totalPages}
                            </span>
                            <button
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                              className={`rounded-lg px-3 py-1 text-xs font-bold ${currentPage === totalPages
                                ? 'bg-barber-800 text-text-faint cursor-not-allowed'
                                : 'bg-barber-800 text-white hover:bg-barber-700'}`}
                            >
                              Próximo →
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // GALERIA
            <div className="flex h-full flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Galeria</h3>
                  <p className="text-xs text-text-muted">Histórico visual dos cortes.</p>
                </div>
                <button className="flex items-center gap-1 rounded-lg bg-barber-gold px-4 py-2 text-xs font-bold text-black hover:bg-barber-goldhover">
                  <Camera size={14} />
                  Adicionar foto
                </button>
              </div>

              {photos.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed border-barber-800 bg-barber-900/60 text-text-muted">
                  <ImageIcon size={40} className="mb-3 opacity-40" />
                  <p className="text-sm">Sem fotos cadastradas</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {photos.map(photo => (
                    <div
                      key={photo.id}
                      className="group relative aspect-square overflow-hidden rounded-xl border border-barber-800 bg-barber-900"
                    >
                      <img
                        src={photo.url}
                        alt="Foto de corte"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100 p-2.5">
                        <div className="flex items-end justify-between">
                          <div>
                            <Badge variant={photo.type === 'after' ? 'success' : 'neutral'} className="mb-1 text-[10px]">
                              {photo.type === 'before' ? 'Antes' : 'Depois'}
                            </Badge>
                            <div className="text-[10px] text-white">{photo.date}</div>
                          </div>
                          <button className="rounded-full p-1.5 text-white hover:bg-black/40 hover:text-danger-500">
                            <Trash2 size={14} />
                          </button>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-barber-800 bg-barber-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-danger-500/20">
                <Trash2 size={20} className="text-danger-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Excluir Cliente</h3>
                <p className="text-xs text-text-muted">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <p className="mb-6 text-sm text-text-soft">
              Tem certeza que deseja excluir <span className="font-bold text-white">{client.name}</span>?
              Todos os dados e histórico serão permanentemente removidos.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-barber-800 bg-barber-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-barber-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteClient}
                disabled={isDeleting}
                className="flex-1 rounded-lg bg-danger-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-danger-600 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetailsModal;
