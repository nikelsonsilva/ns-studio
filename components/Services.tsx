
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  DollarSign,
  Package,
  CheckCircle2,
  Check,
  RefreshCw,
  CreditCard,
  Search,
  LayoutGrid,
  List,
  Scissors,
  Tag,
  Loader,
  AlertTriangle,
  X
} from 'lucide-react';
import { Service, Product } from '../types';

// Backend hooks & functions
import { useSupabaseQuery } from '../lib/hooks';
import { fetchServices, fetchProducts, deleteService, getCurrentBusinessId } from '../lib/database';
import { syncFromStripe } from '../lib/stripeSync';
import { isStripeConfigured } from '../lib/stripe';
import { getBusinessPaymentProvider } from '../lib/abacatePayCheckout';

// UI Components
import ServiceModal from './ServiceModal';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Switch from './ui/Switch';
import Badge from './ui/Badge';
import { useToast } from './ui/Toast';

interface ServicesProps { }

const Services: React.FC<ServicesProps> = () => {
  const toast = useToast();

  // ========== BACKEND DATA ==========
  const { data: servicesData, loading: isLoading, refetch: refetchServices } = useSupabaseQuery(fetchServices);
  const { data: productsData } = useSupabaseQuery(fetchProducts);

  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (servicesData) setServices(servicesData);
  }, [servicesData]);

  useEffect(() => {
    if (productsData) setProducts(productsData);
  }, [productsData]);

  // ========== UI STATE ==========
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  // Stripe Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'abacatepay'>('stripe');

  // Service Modal State
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // --- Statistics ---
  const stats = useMemo(() => {
    const activeCount = services.filter(s => s.is_active !== false).length;
    const avgPrice = services.length > 0
      ? services.reduce((acc, s) => acc + s.price, 0) / services.length
      : 0;
    return { activeCount, avgPrice };
  }, [services]);

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // ========== BACKEND FUNCTIONS ==========
  useEffect(() => {
    checkStripeConfig();
    loadPaymentProvider();
  }, []);

  const loadPaymentProvider = async () => {
    const businessId = await getCurrentBusinessId();
    if (businessId) {
      const provider = await getBusinessPaymentProvider(businessId);
      setPaymentProvider(provider);
    }
  };

  const checkStripeConfig = async () => {
    const configured = await isStripeConfigured();
    setStripeConfigured(configured);
  };

  const handleSyncStripe = async () => {
    if (!stripeConfigured) {
      toast.warning('Configure o Stripe primeiro em Financeiro → Configurar');
      return;
    }

    setIsSyncing(true);
    setShowSyncModal(true);
    setSyncResult(null);

    try {
      const result = await syncFromStripe();
      setSyncResult(result);

      if (result.success || result.created > 0 || result.updated > 0) {
        await refetchServices();
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncResult({
        success: false,
        created: 0,
        updated: 0,
        errors: ['Erro ao sincronizar com Stripe'],
        total: 0
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddNew = () => {
    setEditingService(null);
    setShowServiceModal(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setShowServiceModal(true);
  };

  const handleDelete = async (id: string) => {
    toast.confirm(
      'Tem certeza que deseja excluir este serviço?',
      async () => {
        const result = await deleteService(id);
        if (result) {
          refetchServices();
          toast.success('Serviço excluído com sucesso.');
        }
      }
    );
  };

  const handleServiceSuccess = () => {
    refetchServices();
  };

  // ========== SKELETON LOADER ==========
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in pb-20">
        {/* Header Dashboard Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card noPadding className="md:col-span-2 p-5 bg-gradient-to-r from-[var(--dark-services-header-bg-from)] to-[var(--dark-services-header-bg-to)] border-l-4 border-l-[var(--dark-services-header-border)] animate-pulse">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-2 w-full">
                <div className="h-6 bg-[var(--dark-services-skeleton-bg-strong)] rounded w-48" />
                <div className="h-4 bg-[var(--dark-services-skeleton-bg-medium)] rounded w-64" />
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-10 bg-[var(--dark-services-skeleton-bg-medium)] rounded-lg" />
                <div className="h-10 bg-[var(--dark-services-skeleton-bg-strong)] rounded-lg w-32" />
              </div>
            </div>
          </Card>

          <Card noPadding className="col-span-1 p-4 border-l-4 border-l-[var(--dark-services-stats-ativos-border)] animate-pulse">
            <div className="h-4 bg-[var(--dark-services-skeleton-bg-medium)] rounded w-12 mb-2" />
            <div className="h-8 bg-[var(--dark-services-skeleton-bg-strong)] rounded w-16" />
          </Card>

          <Card noPadding className="col-span-1 p-4 border-l-4 border-l-[var(--dark-services-stats-ticket-border)] animate-pulse">
            <div className="h-4 bg-[var(--dark-services-skeleton-bg-medium)] rounded w-20 mb-2" />
            <div className="h-8 bg-[var(--dark-services-skeleton-bg-strong)] rounded w-20" />
          </Card>
        </div>

        {/* Controls Bar Skeleton */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--dark-services-controls-bg)] p-2 rounded-xl border border-[var(--dark-services-controls-border)] animate-pulse">
          <div className="flex gap-4 w-full">
            <div className="h-10 bg-[var(--dark-services-skeleton-bg-medium)] rounded-lg w-80" />
            <div className="h-10 bg-[var(--dark-services-skeleton-bg-medium)] rounded-lg w-40" />
          </div>
          <div className="h-10 bg-[var(--dark-services-skeleton-bg-medium)] rounded-lg w-20" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} noPadding className="animate-pulse">
              <div className="p-5">
                <div className="flex justify-between mb-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-[var(--dark-services-skeleton-bg-strong)] rounded-lg" />
                    <div>
                      <div className="h-4 bg-[var(--dark-services-skeleton-bg-strong)] rounded w-24 mb-2" />
                      <div className="h-3 bg-[var(--dark-services-skeleton-bg-medium)] rounded w-16" />
                    </div>
                  </div>
                  <div className="w-11 h-6 bg-[var(--dark-services-skeleton-bg-medium)] rounded-full" />
                </div>
                <div className="h-8 bg-[var(--dark-services-skeleton-bg-light)] rounded mb-4" />
                <div className="flex justify-between pt-4 border-t border-[var(--dark-services-divider)]">
                  <div className="h-6 bg-[var(--dark-services-skeleton-bg-strong)] rounded w-20" />
                  <div className="h-6 bg-[var(--dark-services-skeleton-bg-medium)] rounded w-16" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">

      {/* Header Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card noPadding className="md:col-span-2 p-5 bg-gradient-to-r from-[var(--dark-services-header-bg-from)] to-[var(--dark-services-header-bg-to)] border-l-4 border-l-[var(--dark-services-header-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left w-full">
            <h2 className="text-xl font-bold text-[var(--dark-services-title)]">Catálogo de Serviços</h2>
            <p className="text-sm text-[var(--dark-services-subtitle)] mt-1">Gerencie preços, duração e visibilidade.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {paymentProvider === 'stripe' && (
              <Button
                variant="outline"
                onClick={handleSyncStripe}
                isLoading={isSyncing}
                className="w-full sm:w-auto"
                title="Sincronizar com Stripe"
              >
                <RefreshCw size={18} />
              </Button>
            )}
            <Button onClick={handleAddNew} leftIcon={<Plus size={18} />} className="w-full sm:w-auto whitespace-nowrap">
              Novo Serviço
            </Button>
          </div>
        </Card>

        <Card noPadding className="col-span-1 p-4 flex flex-col justify-center border-l-4 border-l-[var(--dark-services-stats-ativos-border)]">
          <span className="text-xs font-bold uppercase text-[var(--dark-text-muted)] tracking-wider">Ativos</span>
          <div className="text-2xl font-bold text-[var(--dark-text-main)] mt-1">{stats.activeCount} <span className="text-sm text-[var(--dark-text-muted)] font-normal">/ {services.length}</span></div>
          <div className="text-[10px] text-[var(--dark-services-stats-ativos-text)] font-bold mt-1 flex items-center gap-1">
            <CheckCircle2 size={12} /> Disponíveis no App
          </div>
        </Card>

        <Card noPadding className="col-span-1 p-4 flex flex-col justify-center border-l-4 border-l-[var(--dark-services-stats-ticket-border)]">
          <span className="text-xs font-bold uppercase text-[var(--dark-text-muted)] tracking-wider">Ticket Médio</span>
          <div className="text-2xl font-bold text-[var(--dark-text-main)] mt-1">R$ {stats.avgPrice.toFixed(0)}</div>
          <div className="text-[10px] text-[var(--dark-services-stats-ticket-text)] font-bold mt-1">
            Baseado no catálogo
          </div>
        </Card>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--dark-services-controls-bg)] p-2 rounded-xl border border-[var(--dark-services-controls-border)]">
        <div className="w-full flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-80">
            <Input
              placeholder="Buscar serviço..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              containerClassName="mb-0"
              className="bg-[var(--dark-services-search-bg)] border-[var(--dark-services-search-border)]"
              icon={<Search size={16} />}
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-[var(--dark-services-tabs-bg)] p-1 rounded-lg border border-[var(--dark-services-tabs-border)] overflow-x-auto scrollbar-hide w-full lg:w-auto">
            <button
              onClick={() => setActiveTab('services')}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'services' ? 'bg-[var(--dark-services-tab-active-bg)] text-[var(--dark-services-tab-active-text)] shadow' : 'text-[var(--dark-services-tab-inactive-text)] hover:text-[var(--dark-text-main)]'}`}
            >
              <Scissors size={14} /> Serviços
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'products' ? 'bg-[var(--dark-services-tab-active-bg)] text-[var(--dark-services-tab-active-text)] shadow' : 'text-[var(--dark-services-tab-inactive-text)] hover:text-[var(--dark-text-main)]'}`}
            >
              <Package size={14} /> Produtos
            </button>
          </div>
        </div>

        <div className="flex bg-[var(--dark-services-toggle-bg)] rounded-lg p-1 border border-[var(--dark-services-toggle-border)] shrink-0 self-end md:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-[var(--dark-services-toggle-active-bg)] text-[var(--dark-services-toggle-active-text)]' : 'text-[var(--dark-services-toggle-inactive-text)] hover:text-[var(--dark-text-main)]'}`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-[var(--dark-services-toggle-active-bg)] text-[var(--dark-services-toggle-active-text)]' : 'text-[var(--dark-services-toggle-inactive-text)] hover:text-[var(--dark-text-main)]'}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {activeTab === 'services' ? (
        <>
          {/* GRID VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.length === 0 ? (
                <div className="col-span-full p-12 text-center border border-dashed border-[var(--dark-services-empty-border)] rounded-xl">
                  <div className="flex flex-col items-center gap-3 text-[var(--dark-services-empty-text)]">
                    <Scissors size={48} style={{ opacity: 'var(--dark-services-empty-icon-opacity)' }} />
                    <p className="text-lg font-medium text-[var(--dark-services-empty-title)]">Nenhum serviço encontrado</p>
                    <p className="text-sm">Clique em "Novo Serviço" para adicionar</p>
                  </div>
                </div>
              ) : (
                filteredServices.map(service => (
                  <Card key={service.id} noPadding className={`flex flex-col h-full bg-[var(--dark-services-card-bg)] hover:border-[var(--dark-services-card-border-hover)] transition-all duration-300 group ${service.is_active === false ? 'opacity-60' : ''}`}>
                    <div className="p-5 flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[var(--dark-services-icon-bg)] text-[var(--dark-services-icon-text)] flex items-center justify-center border border-[var(--dark-services-icon-border)]">
                            <Scissors size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-[var(--dark-services-name)] text-sm">{service.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge size="sm" variant="outline" className="text-[10px] py-0">{service.category || 'Geral'}</Badge>
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={service.is_active !== false}
                          onCheckedChange={() => { }}
                        />
                      </div>

                      <p className="text-xs text-[var(--dark-services-description)] line-clamp-2 mb-4 min-h-[32px]">
                        {service.description || "Sem descrição definida para este serviço."}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-[var(--dark-services-divider)]">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--dark-services-price-label)] font-bold uppercase">Valor</span>
                          <div className="text-lg font-bold text-[var(--dark-services-price-value)]">R$ {service.price.toFixed(2)}</div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-[var(--dark-services-duration-label)] font-bold uppercase">Tempo</span>
                          <div className="text-sm font-medium text-[var(--dark-services-duration-value)] flex items-center gap-1">
                            <Clock size={14} className="text-[var(--dark-services-duration-icon)]" /> {service.duration_minutes} min
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-[var(--dark-services-footer-bg)] p-2 flex justify-end gap-2 border-t border-[var(--dark-services-footer-border)]">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(service)} className="text-xs h-8">
                        <Edit2 size={14} className="mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(service.id)} className="text-xs h-8 hover:!text-red-500">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* LIST VIEW */}
          {viewMode === 'list' && (
            <div className="flex flex-col gap-3">
              {/* Desktop Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-[var(--dark-services-list-header-text)] uppercase tracking-wider bg-[var(--dark-services-list-header-bg)] rounded-lg border border-transparent">
                <div className="col-span-4">Serviço</div>
                <div className="col-span-2">Categoria</div>
                <div className="col-span-2">Preço / Duração</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2 text-right">Ações</div>
              </div>

              {filteredServices.map(service => (
                <div
                  key={service.id}
                  className={`bg-[var(--dark-services-list-item-bg)] border border-[var(--dark-services-list-item-border)] hover:border-[var(--dark-services-list-item-border-hover)] rounded-xl p-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-center transition-all duration-200 group ${service.is_active === false ? 'opacity-60' : ''}`}
                >
                  {/* Name */}
                  <div className="w-full md:col-span-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--dark-services-list-icon-bg)] flex items-center justify-center text-[var(--dark-services-list-icon-text)]">
                      <Scissors size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[var(--dark-services-name)] text-sm truncate">{service.name}</div>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="w-full md:col-span-2">
                    <Badge variant="outline" size="sm">{service.category || 'Geral'}</Badge>
                  </div>

                  {/* Price/Duration */}
                  <div className="w-full md:col-span-2 flex items-center justify-between md:block">
                    <div className="text-sm font-bold text-[var(--dark-services-price-value)]">R$ {service.price.toFixed(2)}</div>
                    <div className="text-xs text-[var(--dark-text-muted)] flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {service.duration_minutes} min
                    </div>
                  </div>

                  {/* Status */}
                  <div className="w-full md:col-span-2 flex items-center justify-between md:justify-start">
                    <span className="md:hidden text-xs font-bold text-[var(--dark-text-muted)] uppercase">Status</span>
                    <Switch
                      checked={service.is_active !== false}
                      onCheckedChange={() => { }}
                    />
                  </div>

                  {/* Actions */}
                  <div className="w-full md:col-span-2 flex items-center justify-end gap-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-[var(--dark-services-divider)] md:border-0">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(service)} title="Editar" className="h-8 w-8">
                      <Edit2 size={14} />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(service.id)} className="h-8 w-8 hover:!text-red-500" title="Excluir">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* PRODUCT LIST (Placeholder styled) */
        <div className="flex flex-col items-center justify-center py-20 bg-[var(--dark-services-products-bg)] border border-[var(--dark-services-products-border)] border-dashed rounded-xl">
          <div className="w-16 h-16 bg-[var(--dark-services-products-icon-bg)] rounded-full flex items-center justify-center mb-4 border border-[var(--dark-services-products-icon-border)]">
            <Package size={24} className="text-[var(--dark-services-products-icon-text)]" />
          </div>
          <h3 className="text-xl font-bold text-[var(--dark-services-products-title)]">Módulo em Desenvolvimento</h3>
          <p className="text-[var(--dark-services-products-text)] mt-2 text-sm">A gestão de estoque e produtos estará disponível na próxima atualização.</p>
          <Button className="mt-6" variant="outline" disabled>Notificar quando disponível</Button>
        </div>
      )}

      {/* ========== SERVICE MODAL (Using existing ServiceModal) ========== */}
      {showServiceModal && (
        <ServiceModal
          service={editingService}
          onClose={() => setShowServiceModal(false)}
          onSuccess={handleServiceSuccess}
          existingCategories={Array.from(new Set(services.map(s => s.category).filter(Boolean)))}
        />
      )}

      {/* ========== SYNC MODAL ========== */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-[var(--dark-services-sync-overlay)] backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--dark-services-sync-bg)] border border-[var(--dark-services-sync-border)] rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[var(--dark-services-sync-title)] flex items-center gap-2">
                {isSyncing ? (
                  <>
                    <Loader className="animate-spin text-[var(--dark-services-stripe-color)]" size={24} />
                    Sincronizando...
                  </>
                ) : syncResult?.success || syncResult?.created > 0 || syncResult?.updated > 0 ? (
                  <>
                    <CheckCircle2 className="text-[var(--dark-services-sync-success-icon)]" size={24} />
                    Sincronização Completa!
                  </>
                ) : (
                  <>
                    <AlertTriangle className="text-[var(--dark-services-sync-error-icon)]" size={24} />
                    Erro na Sincronização
                  </>
                )}
              </h3>
              {!isSyncing && (
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="text-[var(--dark-services-sync-close-text)] hover:text-[var(--dark-services-sync-close-hover)] transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {isSyncing ? (
              <div className="space-y-3">
                <p className="text-[var(--dark-services-sync-text)]">Buscando produtos do Stripe...</p>
                <div className="bg-[var(--dark-services-sync-loading-bg)] rounded-lg p-4">
                  <div className="h-2 bg-[var(--dark-services-sync-loading-track)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--dark-services-sync-loading-fill)] animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
            ) : syncResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[var(--dark-services-sync-total-bg)] border border-[var(--dark-services-sync-total-border)] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[var(--dark-services-sync-total-text)]">{syncResult.total}</div>
                    <div className="text-xs text-[var(--dark-services-sync-total-label)] mt-1">Total</div>
                  </div>
                  <div className="bg-[var(--dark-services-sync-created-bg)] border border-[var(--dark-services-sync-created-border)] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[var(--dark-services-sync-created-text)]">{syncResult.created}</div>
                    <div className="text-xs text-[var(--dark-services-sync-created-text)] mt-1">Criados</div>
                  </div>
                  <div className="bg-[var(--dark-services-sync-updated-bg)] border border-[var(--dark-services-sync-updated-border)] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[var(--dark-services-sync-updated-text)]">{syncResult.updated}</div>
                    <div className="text-xs text-[var(--dark-services-sync-updated-text)] mt-1">Atualizados</div>
                  </div>
                </div>

                {syncResult.errors && syncResult.errors.length > 0 && (
                  <div className="bg-[var(--dark-services-sync-error-bg)] border border-[var(--dark-services-sync-error-border)] rounded-lg p-3">
                    <h4 className="text-[var(--dark-services-sync-error-title)] font-bold text-sm mb-2">Erros:</h4>
                    <ul className="text-xs text-[var(--dark-services-sync-error-text)] space-y-1">
                      {syncResult.errors.map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => setShowSyncModal(false)}
                  className="w-full bg-[var(--dark-services-sync-close-btn-bg)] hover:bg-[var(--dark-services-sync-close-btn-hover)] text-[var(--dark-services-sync-close-btn-text)] font-bold py-2.5 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
