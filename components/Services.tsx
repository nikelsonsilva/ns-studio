
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Clock, DollarSign, Package, AlertTriangle, Search, Filter, RefreshCw, CheckCircle2, Loader, X } from 'lucide-react';
import { Service, Product } from '../types';
import ServiceModal from './ServiceModal';

import { useSupabaseQuery } from '../lib/hooks';
import { fetchServices, fetchProducts, deleteService, deleteProduct } from '../lib/database';
import { syncFromStripe, getStripeSyncStatus } from '../lib/stripeSync';
import { isStripeConfigured } from '../lib/stripe';

// UI Components (Design System)
import Card from './ui/Card';
import Button from './ui/Button';
import { useToast } from './ui/Toast';

interface ServicesProps { }

const Services: React.FC<ServicesProps> = () => {
  const toast = useToast();
  const { data: servicesData, refetch: refetchServices } = useSupabaseQuery(fetchServices);
  const { data: productsData } = useSupabaseQuery(fetchProducts);

  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (servicesData) setServices(servicesData);
  }, [servicesData]);

  useEffect(() => {
    if (productsData) setProducts(productsData);
  }, [productsData]);

  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [stripeConfigured, setStripeConfigured] = useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredServiceId, setHoveredServiceId] = useState<string | null>(null);

  // Service Modal State
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Get unique categories for filter
  const categories = Array.from(new Set(services.map(s => s.category).filter(Boolean))) as string[];

  // Filter services based on search and category
  const filteredServices = services.filter(service => {
    const matchesSearch = searchQuery === '' ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === null || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Check if Stripe is configured
  useEffect(() => {
    checkStripeConfig();
  }, []);

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
        // Recarregar serviços
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

  const handleCreateService = () => {
    setEditingService(null);
    setShowServiceModal(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setShowServiceModal(true);
  };

  const handleDeleteService = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      const result = await deleteService(id);
      if (result) {
        refetchServices();
      }
    }
  };

  const handleServiceSuccess = () => {
    refetchServices();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Title Section */}
          <div>
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
              {activeTab === 'services' ? 'Catálogo de Serviços' : 'Estoque de Produtos'}
            </h2>
            <p className="text-sm text-[var(--text-[var(--text-muted)])]">
              {activeTab === 'services'
                ? 'Gerencie preços, durações e profissionais habilitados.'
                : 'Controle de vendas, estoque e margem de lucro.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Tabs */}
            <div className="bg-[var(--surface-subtle)] p-1 rounded-lg border border-[var(--border-default)] flex">
              <button
                onClick={() => setActiveTab('services')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'services' ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow' : 'text-[var(--text-[var(--text-muted)])] hover:text-[var(--text-primary)] '
                  }`}
              >
                Serviços
              </button>
              <button
                disabled
                className="flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium text-[var(--text-subtle)] cursor-not-allowed flex items-center gap-2"
              >
                Produtos
                <span className="text-[10px] bg-[var(--surface-subtle)] text-[var(--text-subtle)] dark:text-[var(--text-subtle)] px-1.5 py-0.5 rounded uppercase">em breve</span>
              </button>
            </div>

            {/* New Service Button */}
            <button
              onClick={handleCreateService}
              className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]hover text-[var(--text-primary)] dark:text-black px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/20 dark:shadow-amber-500/20 text-sm"
            >
              <Plus size={16} />
              {activeTab === 'services' ? 'Novo Serviço' : 'Novo Produto'}
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'services' ? (
        /* SERVICE LIST */
        <div className="space-y-4">
          {/* Search and Filters Bar */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4 shadow-lg">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-[var(--text-muted)])]" size={18} />
                <input
                  type="text"
                  placeholder="Buscar serviço por nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] pl-10 pr-4 py-2.5 rounded-lg focus:border-[var(--brand-primary)] outline-none text-sm"
                />
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[var(--text-subtle)] font-medium">Filtrar:</span>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedCategory === null
                    ? 'bg-[var(--brand-primary)] text-[var(--text-primary)] dark:text-black'
                    : 'bg-[var(--surface-subtle)] text-[var(--text-subtle)] hover:text-[var(--text-primary)] '
                    }`}
                >
                  Todas
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedCategory === cat
                      ? 'bg-[var(--brand-primary)] text-[var(--text-primary)] dark:text-black'
                      : 'bg-[var(--surface-subtle)] text-[var(--text-subtle)] hover:text-[var(--text-primary)] '
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Results count */}
            {(searchQuery || selectedCategory) && (
              <div className="mt-3 text-xs text-[var(--text-subtle)]">
                {filteredServices.length} serviço{filteredServices.length !== 1 ? 's' : ''} encontrado{filteredServices.length !== 1 ? 's' : ''}
                {selectedCategory && <span className="text-[var(--brand-primary)] ml-1">em {selectedCategory}</span>}
              </div>
            )}
          </div>

          {/* Services List */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl overflow-hidden shadow-lg">
            {filteredServices.length === 0 ? (
              <div className="p-12 text-center">
                <div className="flex flex-col items-center gap-3 text-[var(--text-subtle)]">
                  {services.length === 0 ? (
                    <>
                      <Clock size={48} className="opacity-20" />
                      <p className="text-base font-medium">Você ainda não tem nenhum serviço cadastrado</p>
                      <p className="text-sm text-[var(--text-subtle)]">Clique em"Novo Serviço" para começar</p>
                    </>
                  ) : (
                    <>
                      <Search size={48} className="opacity-20" />
                      <p className="text-base font-medium">Nenhum serviço encontrado</p>
                      <p className="text-sm text-[var(--text-subtle)]">Tente ajustar os filtros ou busca</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-barber-800">
                {filteredServices.map((service) => {
                  const isHovered = hoveredServiceId === service.id;

                  return (
                    <div
                      key={service.id}
                      onClick={() => handleEditService(service)}
                      onMouseEnter={() => setHoveredServiceId(service.id)}
                      onMouseLeave={() => setHoveredServiceId(null)}
                      className={`p-4 flex items-center gap-4 cursor-pointer transition-all ${isHovered ? 'bg-[var(--surface-subtle)]/50' : 'hover:bg-[var(--surface-subtle)]/30'
                        } ${!service.is_active ? 'opacity-60' : ''}`}
                    >
                      {/* Service Info - Main Column */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          {/* Name - Strong */}
                          <h3 className="text-[var(--text-primary)] font-bold truncate">{service.name}</h3>

                          {/* Category Tag - Clickable */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCategory(service.category || null);
                            }}
                            className="shrink-0 bg-[var(--surface-subtle)] text-[var(--text-subtle)] px-2 py-0.5 rounded text-[10px] font-medium border border-[var(--border-default)] hover:border-indigo-400 dark:hover:border-amber-500/50 hover:text-indigo-600 dark:hover:text-amber-500 transition-colors"
                          >
                            {service.category || 'Geral'}
                          </button>

                          {/* Status Badge - Subtle for active, visible for inactive */}
                          {!service.is_active && (
                            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-[var(--status-error)] border border-red-500/30">
                              Inativo
                            </span>
                          )}
                        </div>

                        {/* Description - Subtle */}
                        {service.description && (
                          <p className="text-xs text-[var(--text-subtle)] mt-1 truncate max-w-md">{service.description}</p>
                        )}
                      </div>

                      {/* Duration */}
                      <div className="hidden sm:flex items-center gap-1.5 text-sm text-[var(--text-[var(--text-muted)])] shrink-0 w-20">
                        <Clock size={14} className="text-[var(--text-subtle)]" />
                        <span>{service.duration_minutes}min</span>
                      </div>

                      {/* Price - Strong */}
                      <div className="flex items-center gap-1 shrink-0 w-28 justify-end">
                        <DollarSign size={14} className="text-[var(--status-success)]" />
                        <span className="text-lg font-bold text-[var(--text-primary)]">
                          R$ {service.price.toFixed(0)}
                        </span>
                      </div>

                      {/* Hover Actions */}
                      <div className={`flex items-center gap-1 shrink-0 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditService(service);
                          }}
                          className="p-2 hover:bg-[var(--surface-hover)] rounded-lg text-[var(--text-[var(--text-muted)])] hover:text-[var(--text-primary)] transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Duplicate - create new with same data
                            setEditingService({ ...service, id: '', name: `${service.name} (Cópia)` } as Service);
                            setShowServiceModal(true);
                          }}
                          className="p-2 hover:bg-blue-500/20 rounded-lg text-[var(--text-[var(--text-muted)])] hover:text-blue-400 transition-colors"
                          title="Duplicar"
                        >
                          <Package size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteService(service.id);
                          }}
                          className="p-2 hover:bg-red-500/20 rounded-lg text-[var(--text-[var(--text-muted)])] hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* PRODUCT LIST */
        <>
          {products.some(p => p.stock <= p.minStock) && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3 mb-4">
              <AlertTriangle className="text-red-500 shrink-0" size={20} />
              <div>
                <h4 className="text-red-500 font-bold text-sm">Atenção: Estoque Baixo</h4>
                <p className="text-[var(--status-error)] text-xs mt-1">Alguns produtos estão abaixo do mínimo e precisam de reposição.</p>
              </div>
            </div>
          )}

          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 text-[var(--text-subtle)]" size={18} />
              <input
                type="text"
                placeholder="Buscar produto..."
                className="w-full bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] pl-10 pr-4 py-2 rounded-lg focus:border-[var(--brand-primary)] outline-none"
              />
            </div>
            <button className="bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] p-2 rounded-lg border border-[var(--border-default)]">
              <Filter size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.length === 0 ? (
              <div className="col-span-full p-12 text-center border-2 border-dashed border-[var(--border-default)] rounded-xl">
                <div className="flex flex-col items-center gap-3 text-[var(--text-subtle)]">
                  <Package size={48} className="opacity-20" />
                  <p className="text-lg font-medium">Você ainda não tem nenhum produto cadastrado</p>
                  <p className="text-sm text-[var(--text-subtle)]">Clique em"Novo Produto" para começar</p>
                </div>
              </div>
            ) : (
              products.map(product => (
                <div key={product.id} className={`bg-[var(--surface-card)] border rounded-xl p-5 shadow-lg group transition-all relative ${product.stock <= product.minStock ? 'border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-[var(--border-default)] hover:border-[var(--border-strong)]'}`}>

                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-[var(--surface-subtle)] rounded-lg border border-[var(--border-default)]">
                      <Package size={24} className="text-[var(--brand-primary)]" />
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${product.stock <= product.minStock ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-[var(--status-success)]'}`}>
                      {product.stock} un
                    </div>
                  </div>

                  <h3 className="font-bold text-[var(--text-primary)] mb-1 truncate">{product.name}</h3>
                  <p className="text-xs text-[var(--text-subtle)] mb-4">{product.category}</p>

                  <div className="flex justify-between items-end border-t border-[var(--border-default)] pt-4">
                    <div>
                      <div className="text-xs text-[var(--text-subtle)]">Preço Venda</div>
                      <div className="text-lg font-bold text-[var(--text-primary)]">R$ {product.price.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[var(--text-subtle)]">Comissão</div>
                      <div className="text-sm font-medium text-blue-400">{product.commissionRate || 0}%</div>
                    </div>
                  </div>

                  {product.stock <= product.minStock && (
                    <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded p-2 flex items-center gap-2 text-xs text-[var(--status-error)]">
                      <AlertTriangle size={12} /> Estoque Baixo (Min: {product.minStock})
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] text-xs font-bold py-2 rounded transition-colors">Editar</button>
                    <button className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-black text-xs font-bold py-2 rounded transition-colors">Vender</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Service Modal */}
      {
        showServiceModal && (
          <ServiceModal
            service={editingService}
            onClose={() => setShowServiceModal(false)}
            onSuccess={handleServiceSuccess}
            existingCategories={Array.from(new Set(services.map(s => s.category).filter(Boolean)))}
          />
        )
      }

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                {isSyncing ? (
                  <>
                    <Loader className="animate-spin text-[#635BFF]" size={24} />
                    Sincronizando...
                  </>
                ) : syncResult?.success || syncResult?.created > 0 || syncResult?.updated > 0 ? (
                  <>
                    <CheckCircle2 className="text-[var(--status-success)]" size={24} />
                    Sincronização Completa!
                  </>
                ) : (
                  <>
                    <AlertTriangle className="text-red-500" size={24} />
                    Erro na Sincronização
                  </>
                )}
              </h3>
              {!isSyncing && (
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="text-[var(--text-[var(--text-muted)])] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {isSyncing ? (
              <div className="space-y-3">
                <p className="text-[var(--text-[var(--text-muted)])]">Buscando produtos do Stripe...</p>
                <div className="bg-[var(--surface-subtle)] rounded-lg p-4">
                  <div className="h-2 bg-[var(--surface-subtle)] rounded-full overflow-hidden">
                    <div className="h-full bg-[#635BFF] animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
            ) : syncResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[var(--text-primary)]">{syncResult.total}</div>
                    <div className="text-xs text-[var(--text-[var(--text-muted)])] mt-1">Total</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[var(--status-success)]">{syncResult.created}</div>
                    <div className="text-xs text-[var(--status-success)] mt-1">Criados</div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-[var(--status-info)]">{syncResult.updated}</div>
                    <div className="text-xs text-blue-400 mt-1">Atualizados</div>
                  </div>
                </div>

                {syncResult.errors && syncResult.errors.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <h4 className="text-red-500 font-bold text-sm mb-2">Erros:</h4>
                    <ul className="text-xs text-[var(--status-error)] space-y-1">
                      {syncResult.errors.map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => setShowSyncModal(false)}
                  className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-black font-bold py-2.5 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div >
  );
};

export default Services;
