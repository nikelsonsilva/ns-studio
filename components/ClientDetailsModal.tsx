/**
 * ClientDetailsModal - NS Studio Design
 * Layout from ns-studio reference with database integration
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Sparkles,
  AlertTriangle,
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
  UserX,
  Gift,
  Star,
  Upload,
  Maximize2,
  Download,
  Phone,
  Edit,
  Globe,
  Store,
  User,
  Cake,
  FileText,
  Scissors,
  Save,
  Mail,
} from 'lucide-react';
import { Client, ClientPhoto, LoyaltyTier } from '../types';

// ========== LOGIC IMPORTS - DO NOT MODIFY ==========
import {
  fetchClientWithHistory,
  updateClientNotes,
  updateClientTags,
  updateClientPreferences,
  getDaysSinceLastVisit,
  fetchClientPhotos,
  saveClientPhotos,
  deleteClientPhoto,
  type AppointmentHistory,
  type ClientStats,
  type ClientPhotoRecord,
} from '../lib/clientService';
import { deleteClient, updateClient, getCurrentBusinessId } from '../lib/database';
import { formatPhone } from '../lib/validation';
import { fetchBusinessSettings, BusinessSettings } from '../lib/settingsService';

// UI Components
import Badge from './ui/Badge';
import Button from './ui/Button';
import Card from './ui/Card';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import { useToast } from './ui/Toast';

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
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'gallery' | 'noshow'>('overview');
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

  // Pagination for history
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Editable preferences
  const [drinkPref, setDrinkPref] = useState(client.drink_preference || '');
  const [convStyle, setConvStyle] = useState(client.conversation_style || '');

  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState({
    name: client.name,
    phone: client.phone,
    email: client.email || '',
    birth_date: client.birth_date || '',
  });

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Gallery State - Use database records
  const [photos, setPhotos] = useState<ClientPhotoRecord[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<ClientPhotoRecord | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newPhotoDescription, setNewPhotoDescription] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
        // Load photos from database
        const photosData = await fetchClientPhotos(client.id);
        setPhotos(photosData);
      }
      setIsLoading(false);
    };
    loadClientData();
  }, [client.id]);

  useEffect(() => {
    setEditData({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      birth_date: client.birth_date || '',
    });
  }, [client]);

  const points = client.loyalty_points || (clientStats.totalVisits % 10);
  const maxPoints = 10;

  const calculateTier = (visits: number): LoyaltyTier => {
    if (visits > 30) return 'Diamante';
    if (visits > 15) return 'Ouro';
    if (visits > 5) return 'Prata';
    return 'Bronze';
  };

  const tier = client.loyalty_tier || calculateTier(clientStats.totalVisits);

  const getTierStyles = (t: LoyaltyTier) => {
    switch (t) {
      case 'Diamante': return { bg: 'bg-[var(--dark-client-tier-diamante-bg)]', border: 'border-[var(--dark-client-tier-diamante-border)]', text: 'text-[var(--dark-client-tier-diamante)]', icon: Crown, shadow: 'shadow-[var(--dark-client-tier-diamante-shadow)]' };
      case 'Ouro': return { bg: 'bg-[var(--dark-client-tier-ouro-bg)]', border: 'border-[var(--dark-client-tier-ouro-border)]', text: 'text-[var(--dark-client-tier-ouro)]', icon: Award, shadow: 'shadow-[var(--dark-client-tier-ouro-shadow)]' };
      case 'Prata': return { bg: 'bg-[var(--dark-client-tier-prata-bg)]', border: 'border-[var(--dark-client-tier-prata-border)]', text: 'text-[var(--dark-client-tier-prata)]', icon: Award, shadow: 'shadow-[var(--dark-client-tier-prata-shadow)]' };
      default: return { bg: 'bg-[var(--dark-client-tier-bronze-bg)]', border: 'border-[var(--dark-client-tier-bronze-border)]', text: 'text-[var(--dark-client-tier-bronze)]', icon: Award, shadow: 'shadow-[var(--dark-client-tier-bronze-shadow)]' };
    }
  };

  const tierStyle = getTierStyles(tier);
  const TierIcon = tierStyle.icon;

  // Helper for Origin Info
  const getOriginInfo = (origin?: string) => {
    switch (origin) {
      case 'public_link': return { label: 'Via Link', icon: Globe, color: 'text-[var(--dark-client-origin-link)]' };
      case 'whatsapp': return { label: 'Via WhatsApp', icon: MessageCircle, color: 'text-[var(--dark-client-origin-whatsapp)]' };
      default: return { label: 'Balcão/Manual', icon: Store, color: 'text-[var(--dark-client-origin-manual)]' };
    }
  };

  const daysSinceLastVisit = getDaysSinceLastVisit(clientStats.lastVisitDate);

  // Handlers
  const handleSaveProfile = async () => {
    if (!editData.name.trim()) {
      toast.warning('Nome é obrigatório');
      return;
    }
    try {
      const updatedData = {
        name: editData.name.trim(),
        phone: editData.phone.trim() || null,
        email: editData.email.trim() || null,
        birth_date: editData.birth_date || null,
      };
      await updateClient(client.id, updatedData);
      if (onSave) {
        onSave(updatedData);
      }
      setIsEditingProfile(false);
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar informações');
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      birth_date: client.birth_date || '',
    });
    setIsEditingProfile(false);
  };

  const handleAddTag = async () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag('');
      setIsAddingTag(false);
      await updateClientTags(client.id, updatedTags);
      if (onSave) {
        onSave({ tags: updatedTags });
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const updatedTags = tags.filter(tag => tag !== tagToRemove);
    setTags(updatedTags);
    await updateClientTags(client.id, updatedTags);
    if (onSave) {
      onSave({ tags: updatedTags });
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);

    // 1. Save notes
    const notesSuccess = await updateClientNotes(client.id, notes);

    // 2. Save preferences (drink/conversation)
    const prefsSuccess = await updateClientPreferences(client.id, {
      drink_preference: drinkPref || null,
      conversation_style: convStyle || null,
    });

    if (notesSuccess && prefsSuccess) {
      if (onSave) {
        onSave({
          internal_notes: notes,
          drink_preference: drinkPref,
          conversation_style: convStyle,
        });
      }
      toast.success('Ficha do cliente atualizada com sucesso');
      setIsSavingNotes(false);
      // Close modal after successful save
      onClose();
    } else {
      setIsSavingNotes(false);
      toast.error('Erro ao salvar ficha do cliente');
    }
  };

  const handleDeleteClient = async () => {
    setIsDeleting(true);
    const result = await deleteClient(client.id);
    setIsDeleting(false);
    if (result) {
      toast.success('Cliente excluído com sucesso!');
      onClose();
      if (onDelete) onDelete();
    } else {
      toast.error('Erro ao excluir cliente');
    }
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/55${client.phone.replace(/\D/g, '')}`, '_blank');
  };

  // Gallery Logic
  const groupedPhotos = useMemo(() => {
    const groups: Record<string, ClientPhoto[]> = {};
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

  const [isSavingPhotos, setIsSavingPhotos] = useState(false);

  const handleConfirmUpload = async () => {
    console.log('📸 [handleConfirmUpload] Starting...', { filesCount: pendingFiles.length, description: newPhotoDescription });

    if (pendingFiles.length === 0) {
      console.log('📸 [handleConfirmUpload] No files to upload');
      return;
    }

    setIsSavingPhotos(true);

    const businessId = await getCurrentBusinessId();
    console.log('📸 [handleConfirmUpload] Business ID:', businessId);

    if (!businessId) {
      toast.error('Erro: Business ID não encontrado');
      setIsSavingPhotos(false);
      return;
    }

    // Upload to database
    const savedPhotos = await saveClientPhotos(
      businessId,
      client.id,
      pendingFiles,
      newPhotoDescription || undefined
    );

    if (savedPhotos.length > 0) {
      setPhotos(prev => [...savedPhotos, ...prev]);
      toast.success(`${savedPhotos.length} fotos adicionadas ao histórico!`);
    } else {
      toast.error('Erro ao salvar fotos. Verifique se o bucket "client-photos" existe no Supabase Storage.');
    }

    setPendingFiles([]);
    setNewPhotoDescription('');
    setIsUploading(false);
    setIsSavingPhotos(false);
  };

  const handleDeletePhoto = async (id: string) => {
    setPhotoToDelete(id);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;

    setIsDeletingPhoto(true);
    const success = await deleteClientPhoto(photoToDelete);

    if (success) {
      setPhotos(prev => prev.filter(p => p.id !== photoToDelete));
      if (selectedPhoto?.id === photoToDelete) setSelectedPhoto(null);
      toast.success('Foto removida com sucesso!');
    } else {
      toast.error('Erro ao remover foto');
    }

    setIsDeletingPhoto(false);
    setPhotoToDelete(null);
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

  // Footer Buttons
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
        <Button variant="danger" size="icon" onClick={() => setShowDeleteConfirm(true)} title="Bloquear Cliente"><UserX size={18} /></Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button variant="primary" onClick={handleSaveNotes} leftIcon={<Check size={18} />}>Salvar Ficha</Button>
        </div>
      </div>
    );
  };
  // ========== END LOGIC ==========

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl md:h-[90vh] md:rounded-2xl">

        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-950 px-5 pt-4 pb-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold bg-zinc-900 border-2 ${tierStyle.border} ${tierStyle.text} ${tierStyle.shadow} shadow-lg relative`}>
                {client.name.charAt(0)}
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${tierStyle.bg} border border-zinc-900 flex items-center justify-center`}>
                  <TierIcon size={10} className={tierStyle.text} />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white leading-none flex items-center gap-2">
                  {client.name}
                  {tags.includes('VIP') && <Crown size={16} className="text-[var(--dark-client-vip-crown)] fill-[var(--dark-client-vip-crown)]" />}
                </h3>
                <div className="flex items-center gap-3 mt-1.5">
                  <Badge size="sm" className={`${tierStyle.bg} ${tierStyle.text} border-none font-bold`}>
                    {tier}
                  </Badge>
                  <div className="h-3 w-px bg-zinc-700"></div>
                  <span className={`text-xs flex items-center gap-1 font-medium ${getOriginInfo(client.source).color}`}>
                    {React.createElement(getOriginInfo(client.source).icon, { size: 12 })} {getOriginInfo(client.source).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            {!isEditingProfile && (
              <div className="flex items-center gap-3 pl-6 border-l border-zinc-800 ml-6">
                <button onClick={handleWhatsApp} className="w-8 h-8 rounded-lg bg-[var(--dark-client-whatsapp-bg)] hover:bg-[var(--dark-client-whatsapp-hover)] text-[var(--dark-client-whatsapp-text)] flex items-center justify-center transition-colors" title="WhatsApp">
                  <MessageCircle size={16} />
                </button>
                <button className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors" title="Ligar">
                  <Phone size={16} />
                </button>
                <button onClick={() => setIsEditingProfile(true)} className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors" title="Editar Cadastro">
                  <Edit size={16} />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white ml-4"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-zinc-950 px-5 py-5">
          {isEditingProfile ? (
            // --- EDIT MODE LAYOUT ---
            <div className="space-y-6 animate-fade-in p-2">
              <div className="flex items-center gap-2 mb-4 text-amber-500 font-bold text-sm uppercase tracking-wider border-b border-zinc-800 pb-2">
                <Edit size={16} /> Editando Dados Pessoais
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Nome Completo"
                  value={editData.name}
                  onChange={e => setEditData({ ...editData, name: e.target.value })}
                  icon={<User size={18} />}
                  placeholder="Nome do Cliente"
                  autoFocus
                />
                <Input
                  label="Telefone / WhatsApp"
                  value={editData.phone}
                  onChange={e => setEditData({ ...editData, phone: e.target.value })}
                  icon={<Phone size={18} />}
                  placeholder="(00) 00000-0000"
                />
                <Input
                  label="E-mail"
                  type="email"
                  value={editData.email}
                  onChange={e => setEditData({ ...editData, email: e.target.value })}
                  icon={<Mail size={18} />}
                  placeholder="email@cliente.com"
                />
                <Input
                  label="Data de Nascimento"
                  type="date"
                  value={editData.birth_date}
                  onChange={e => setEditData({ ...editData, birth_date: e.target.value })}
                  icon={<Cake size={18} />}
                />
              </div>

              <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-400">
                <p className="flex items-center gap-2 mb-2 font-bold"><AlertTriangle size={14} className="text-amber-500" /> Atenção</p>
                <p>Ao alterar o número de telefone, o histórico de agendamentos vinculados será mantido, mas o link de confirmação via WhatsApp será enviado para o novo número.</p>
              </div>
            </div>
          ) : (
            // --- VIEW MODE LAYOUT (Tabs) ---
            <>
              <div className="flex bg-zinc-950 p-1 rounded-xl mb-6 border border-zinc-800">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                >
                  Visão Geral
                </button>
                <button
                  onClick={() => setActiveTab('gallery')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'gallery' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                >
                  Galeria
                </button>
                <button
                  onClick={() => setActiveTab('noshow')}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'noshow' ? 'bg-[var(--dark-client-noshow-active-bg)] text-[var(--dark-client-noshow-active-text)] shadow' : 'text-zinc-400 hover:text-[var(--dark-client-noshow-hover-text)]'}`}
                >
                  Histórico & No-Show
                </button>
              </div>

              {activeTab === 'overview' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card noPadding className="p-4 bg-zinc-900/50 border-zinc-800">
                      <div className="text-zinc-400 text-xs font-bold uppercase mb-1">Total Visitas</div>
                      <div className="text-2xl font-bold text-white flex items-center gap-2">
                        {clientStats.totalVisits} <History size={16} className="text-amber-500" />
                      </div>
                    </Card>
                    <Card noPadding className="p-4 bg-zinc-900/50 border-zinc-800">
                      <div className="text-zinc-400 text-xs font-bold uppercase mb-1">LTV (Gasto)</div>
                      <div className="text-2xl font-bold text-[var(--dark-client-ltv-text)] flex items-center gap-2">
                        R$ {clientStats.lifetimeValue.toLocaleString('pt-BR')} <DollarSign size={16} />
                      </div>
                    </Card>
                    <Card noPadding className="p-4 bg-zinc-900/50 border-zinc-800">
                      <div className="text-zinc-400 text-xs font-bold uppercase mb-1">Fidelidade</div>
                      <div className="text-2xl font-bold text-[var(--dark-client-fidelity-text)] flex items-center gap-2">
                        {points}/{maxPoints} <span className="text-xs text-zinc-400">pts</span>
                      </div>
                    </Card>
                  </div>

                  {/* Last Service Card */}
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between relative overflow-hidden group hover:border-[var(--dark-client-service-hover)] transition-colors">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--dark-client-service-accent)]"></div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-2 mb-1">
                        <Scissors size={14} className="text-[var(--dark-client-service-accent)]" /> Último Serviço Realizado
                      </h4>
                      <div className="text-lg font-bold text-white leading-tight">
                        {historyData.length > 0 ? historyData[0].service_name : 'Sem registro recente'}
                      </div>
                      <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {historyData.length > 0 ? historyData[0].date : '--/--/----'}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                        <span className="flex items-center gap-1"><User size={12} /> Com: {historyData.length > 0 ? historyData[0].professional_name : 'Profissional'}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" className="hover:bg-[var(--dark-client-service-accent)] hover:text-white transition-colors shrink-0 ml-2">Repetir</Button>
                  </div>

                  {/* Loyalty Card Visual */}
                  {businessSettings?.loyalty_enabled && (
                    <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                        <Crown size={120} />
                      </div>

                      <div className="flex justify-between items-center mb-4 relative z-10">
                        <h4 className="text-sm font-bold text-[var(--dark-client-loyalty-filled)] uppercase tracking-widest flex items-center gap-2">
                          <Award size={16} /> Cartão Fidelidade
                        </h4>
                        <span className="text-xs text-zinc-400 font-medium bg-zinc-800 px-2 py-1 rounded">
                          Resgate: {businessSettings.loyalty_reward_description || 'Corte Grátis'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center gap-2 relative z-10">
                        {Array.from({ length: businessSettings.loyalty_visits_for_reward || 10 }).map((_, i) => {
                          const currentPoints = client.loyalty_points || (clientStats.totalVisits % (businessSettings.loyalty_visits_for_reward || 10));
                          const isFilled = i < currentPoints;
                          const isLast = i === (businessSettings.loyalty_visits_for_reward || 10) - 1;
                          return (
                            <div key={i} className="flex flex-col items-center gap-1 flex-1">
                              <div className={`w-full aspect-square rounded-full flex items-center justify-center border-2 transition-all duration-500 ${isFilled ? 'bg-[var(--dark-client-loyalty-filled)] border-[var(--dark-client-loyalty-filled)] text-black shadow-[var(--dark-client-loyalty-glow)] scale-105' : 'bg-transparent border-[var(--dark-client-loyalty-empty)] text-[var(--dark-client-loyalty-empty)]'}`}>
                                {isFilled ? (
                                  <Check size={14} strokeWidth={4} />
                                ) : isLast ? (
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
                          Faltam <strong className="text-white">{(businessSettings.loyalty_visits_for_reward || 10) - (client.loyalty_points || (clientStats.totalVisits % (businessSettings.loyalty_visits_for_reward || 10)))}</strong> visitas para ganhar: <span className="text-amber-500 font-bold">{businessSettings.loyalty_reward_description || 'Corte Grátis'}</span>!
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tags & Preferences */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2"><Sparkles size={16} className="text-amber-500" /> Tags & Preferências</h4>
                      </div>
                      <Card noPadding className="p-4 min-h-[150px] flex flex-col gap-4">
                        {/* Tags Section */}
                        <div className="flex flex-wrap gap-2">
                          {tags.map(tag => (
                            <Badge key={tag} className="pr-1">
                              {tag}
                              <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-red-400"><X size={12} /></button>
                            </Badge>
                          ))}
                          {isAddingTag ? (
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                className="bg-zinc-950 border border-zinc-800 rounded px-2 py-0.5 text-xs text-white outline-none w-20 focus:border-amber-500"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                onBlur={() => setIsAddingTag(false)}
                              />
                            </div>
                          ) : (
                            <button onClick={() => setIsAddingTag(true)} className="text-xs text-zinc-400 hover:text-white border border-dashed border-zinc-700 rounded-full px-2 py-0.5 flex items-center gap-1 hover:border-amber-500 transition-colors">
                              <Plus size={12} /> Add
                            </button>
                          )}
                        </div>

                        {/* Preferences Selection */}
                        <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800 space-y-2 mt-auto">
                          <span className="block font-bold text-amber-500 text-xs mb-1 flex items-center gap-2">
                            <Coffee size={12} /> Preferências de Atendimento:
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] text-zinc-400 uppercase font-bold block mb-1">Bebida</label>
                              <select
                                className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs rounded-md px-2 py-1.5 outline-none focus:border-amber-500 hover:border-zinc-600 transition-colors cursor-pointer appearance-none"
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
                              <label className="text-[9px] text-zinc-400 uppercase font-bold block mb-1">Conversa</label>
                              <select
                                className="w-full bg-zinc-900 border border-zinc-700 text-white text-xs rounded-md px-2 py-1.5 outline-none focus:border-amber-500 hover:border-zinc-600 transition-colors cursor-pointer appearance-none"
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
                        <h4 className="text-sm font-bold text-white flex items-center gap-2"><StickyNote size={16} className="text-indigo-400" /> Notas Internas</h4>
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
                  <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <ImageIcon size={20} className="text-amber-500" /> Galeria de Cortes
                        </h3>
                        <p className="text-zinc-400 text-xs mt-1">Registre o progresso e estilos do cliente.</p>
                      </div>
                      <div className="flex gap-2 relative">
                        {/* Hidden file inputs */}
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                        />
                        {/* Camera input with capture attribute for mobile */}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          ref={cameraInputRef}
                          onChange={handleFileSelect}
                        />

                        <Button
                          size="sm"
                          onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                          leftIcon={<Plus size={16} />}
                        >
                          Novo Registro
                        </Button>

                        {/* Photo Menu Popup */}
                        {showPhotoMenu && (
                          <>
                            {/* Backdrop to close menu */}
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowPhotoMenu(false)}
                            />
                            <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden min-w-[180px] animate-fade-in">
                              {/* Camera option - mobile */}
                              <button
                                onClick={() => {
                                  cameraInputRef.current?.click();
                                  setShowPhotoMenu(false);
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-zinc-800 flex items-center gap-3 transition-colors border-b border-zinc-800"
                              >
                                <Camera size={18} className="text-[var(--dark-brand-primary)]" />
                                <span>Tirar Foto</span>
                              </button>
                              {/* Gallery option */}
                              <button
                                onClick={() => {
                                  fileInputRef.current?.click();
                                  setShowPhotoMenu(false);
                                }}
                                className="w-full px-4 py-3 text-left text-sm text-white hover:bg-zinc-800 flex items-center gap-3 transition-colors"
                              >
                                <ImageIcon size={18} className="text-[var(--dark-brand-primary)]" />
                                <span>Escolher da Galeria</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Upload Confirmation Panel */}
                    {isUploading && pendingFiles.length > 0 && (
                      <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 animate-slide-up">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Upload size={14} className={isSavingPhotos ? 'text-amber-500 animate-bounce' : 'text-amber-500'} />
                            {isSavingPhotos ? 'Enviando fotos...' : `Adicionar ${pendingFiles.length} foto(s)`}
                          </h4>
                          {!isSavingPhotos && (
                            <button onClick={() => { setIsUploading(false); setPendingFiles([]); }} className="text-zinc-400 hover:text-white"><X size={14} /></button>
                          )}
                        </div>

                        <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                          {pendingFiles.map((file, idx) => (
                            <div key={idx} className="relative w-12 h-12 rounded overflow-hidden border border-zinc-700 shrink-0">
                              <img src={URL.createObjectURL(file)} className={`w-full h-full object-cover ${isSavingPhotos ? 'opacity-50' : ''}`} />
                              {/* Loading overlay */}
                              {isSavingPhotos && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Progress bar */}
                        {isSavingPhotos && (
                          <div className="mb-3">
                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 animate-pulse w-full"></div>
                            </div>
                            <p className="text-xs text-zinc-400 mt-1.5 text-center">Fazendo upload de {pendingFiles.length} foto(s)...</p>
                          </div>
                        )}

                        {!isSavingPhotos && (
                          <Input
                            placeholder="Descrição do corte (ex: Mid Fade, Barba desenhada...)"
                            value={newPhotoDescription}
                            onChange={(e) => setNewPhotoDescription(e.target.value)}
                            className="mb-3 text-xs"
                            autoFocus
                          />
                        )}

                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={handleConfirmUpload}
                            leftIcon={isSavingPhotos ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={14} />}
                            disabled={isSavingPhotos}
                            className={isSavingPhotos ? 'opacity-80 cursor-not-allowed' : ''}
                          >
                            {isSavingPhotos ? 'Enviando...' : 'Salvar no Histórico'}
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
                        // Parse date as local (YYYY-MM-DD) - avoid UTC interpretation
                        const [year, month, day] = date.split('-').map(Number);
                        const localDate = new Date(year, month - 1, day); // month is 0-indexed
                        const displayDate = localDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
                        const description = groupPhotos[0].notes || 'Sem descrição';

                        return (
                          <div key={date} className={`relative ${isFirst ? 'animate-fade-in' : ''}`}>
                            {/* Date Header */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`h-px flex-1 ${isFirst ? 'bg-amber-500/50' : 'bg-zinc-800'}`}></div>
                              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${isFirst ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-zinc-900 text-zinc-400 border-zinc-800'}`}>
                                {isFirst ? <span className="flex items-center gap-1"><Star size={10} fill="black" /> Último Corte ({displayDate})</span> : displayDate}
                              </span>
                              <div className={`h-px flex-1 ${isFirst ? 'bg-amber-500/50' : 'bg-zinc-800'}`}></div>
                            </div>

                            {/* Description Card */}
                            {description && (
                              <div className={`mb-3 text-xs flex items-center gap-2 ${isFirst ? 'text-amber-500 font-medium justify-center' : 'text-zinc-500 justify-center'}`}>
                                <span className="italic">"{description}"</span>
                              </div>
                            )}

                            {/* Photo Grid */}
                            <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${isFirst ? 'p-3 rounded-xl bg-gradient-to-b from-amber-500/5 to-transparent border border-amber-500/20' : ''}`}>
                              {groupPhotos.map((photo) => (
                                <div
                                  key={photo.id}
                                  className="group relative aspect-square bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:border-amber-500/50 transition-all cursor-pointer"
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
                        <Camera size={24} className="text-zinc-400 opacity-50" />
                      </div>
                      <p className="text-sm font-bold text-zinc-400 mb-1">Nenhuma foto no histórico</p>
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
                        <h4 className="font-bold text-white">Controle de No-Show</h4>
                        <p className="text-sm text-zinc-400 mt-1">Este cliente faltou a <strong>0</strong> agendamentos nos últimos 6 meses.</p>
                      </div>
                    </div>
                  </Card>

                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-white">Histórico Recente</h4>
                    {/* Lista com scroll e altura fixa */}
                    <div className="border border-zinc-800 rounded-lg divide-y divide-zinc-800 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {isLoading ? (
                        <div className="space-y-2 p-4">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-14 animate-pulse rounded-lg bg-zinc-800" />
                          ))}
                        </div>
                      ) : paginatedHistory.length === 0 ? (
                        <div className="py-6 text-center">
                          <History size={28} className="mx-auto mb-2 text-zinc-600 opacity-30" />
                          <p className="text-xs text-zinc-400">Nenhum agendamento encontrado</p>
                        </div>
                      ) : (
                        paginatedHistory.map((item, i) => (
                          <div key={item.id || i} className="p-3 flex justify-between items-center bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors">
                            <div>
                              <div className="text-sm font-bold text-white">{item.service_name}</div>
                              <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                                <Calendar size={12} className="text-amber-500" />
                                <span>{item.date}</span>
                              </div>
                              <div className="text-[10px] text-zinc-500 mt-1 opacity-70">Prof: {item.professional_name}</div>
                            </div>
                            <Badge variant={getPaymentBadgeVariant(item.payment_status)} size="sm">
                              {item.payment_status === 'paid' ? 'Pago' :
                                item.payment_status === 'awaiting_payment' || item.payment_status === 'pending' ? 'Pendente' :
                                  item.payment_status === 'failed' ? 'Falhou' : item.payment_status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-zinc-800 pt-3 mt-3">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${currentPage === 1
                            ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                            : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
                        >
                          ← Anterior
                        </button>
                        <span className="text-xs text-zinc-400">
                          Página {currentPage} de {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className={`rounded-lg px-3 py-1 text-xs font-bold ${currentPage === totalPages
                            ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                            : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
                        >
                          Próximo →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 bg-zinc-950 px-5 py-4">
          {renderFooter()}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Excluir Cliente</h3>
                <p className="text-xs text-zinc-400">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <p className="mb-6 text-sm text-zinc-300">
              Tem certeza que deseja excluir <span className="font-bold text-white">{client.name}</span>?
              Todos os dados e histórico serão permanentemente removidos.
            </p>

            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteClient}
                disabled={isDeleting}
                isLoading={isDeleting}
                className="flex-1"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 p-3 bg-zinc-900/80 text-white rounded-full hover:bg-zinc-800 transition-colors border border-zinc-700 z-10"
            onClick={() => setSelectedPhoto(null)}
          >
            <X size={24} />
          </button>

          {/* Photo info */}
          <div className="absolute top-4 left-4 bg-zinc-900/80 px-4 py-2 rounded-lg border border-zinc-700 backdrop-blur-sm">
            <p className="text-white text-sm font-bold">{client.name}</p>
            <p className="text-zinc-400 text-xs">
              {new Date(selectedPhoto.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {selectedPhoto.notes && (
              <p className="text-amber-500 text-xs mt-1 italic">"{selectedPhoto.notes}"</p>
            )}
          </div>

          {/* Image */}
          <img
            src={selectedPhoto.url}
            alt="Foto do cliente"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Delete button */}
          <button
            className="absolute bottom-4 right-4 p-3 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40 transition-colors border border-red-500/30 z-10"
            onClick={(e) => {
              e.stopPropagation();
              handleDeletePhoto(selectedPhoto.id);
            }}
          >
            <Trash2 size={20} />
          </button>

          {/* Instructions */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-zinc-500 text-xs">
            Clique fora da imagem para fechar
          </p>
        </div>
      )}

      {/* Photo Delete Confirmation Modal */}
      {photoToDelete && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xs rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl animate-slide-up">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Foto</h3>
                <p className="text-xs text-zinc-400">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <p className="mb-5 text-sm text-zinc-300">
              Tem certeza que deseja excluir esta foto do histórico?
            </p>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPhotoToDelete(null)}
                className="flex-1"
                disabled={isDeletingPhoto}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDeletePhoto}
                disabled={isDeletingPhoto}
                className="flex-1"
              >
                {isDeletingPhoto ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Excluindo...
                  </span>
                ) : 'Excluir'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetailsModal;
