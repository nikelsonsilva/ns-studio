
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Clock, DollarSign, Package, AlertTriangle, Search, Filter, RefreshCw, CheckCircle2, Loader, X } from 'lucide-react';
import { Service, Product } from '../types';
import ServiceModal from './ServiceModal';

import { useSupabaseQuery } from '../lib/hooks';
import { fetchServices, fetchProducts, deleteService, deleteProduct } from '../lib/database';
import { syncFromStripe, getStripeSyncStatus } from '../lib/stripeSync';
import { isStripeConfigured } from '../lib/stripe';

interface ServicesProps { }

const Services: React.FC<ServicesProps> = () => {
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

  // Service Modal State
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

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
      alert('⚠️ Configure o Stripe primeiro em Financeiro → Configurar');
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
      <div className="bg-barber-900 border border-barber-800 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Title Section */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {activeTab === 'services' ? 'Catálogo de Serviços' : 'Estoque de Produtos'}
            </h2>
            <p className="text-sm text-gray-400">
              {activeTab === 'services'
                ? 'Gerencie preços, durações e profissionais habilitados.'
                : 'Controle de vendas, estoque e margem de lucro.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Tabs */}
            <div className="bg-barber-950 p-1 rounded-lg border border-barber-800 flex">
              <button
                onClick={() => setActiveTab('services')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'services' ? 'bg-barber-800 text-white shadow' : 'text-gray-400 hover:text-white'
                  }`}
              >
                Serviços
              </button>
              <button
                disabled
                className="flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium text-gray-600 cursor-not-allowed flex items-center gap-2"
              >
                Produtos
                <span className="text-[10px] bg-barber-800 text-gray-500 px-1.5 py-0.5 rounded uppercase">em breve</span>
              </button>
            </div>

            {/* Stripe Sync */}
            {activeTab === 'services' && (
              <button
                onClick={handleSyncStripe}
                disabled={isSyncing}
                className={`px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all text-sm border ${!stripeConfigured
                  ? 'bg-gray-500/10 text-gray-500 border-gray-500/30 cursor-not-allowed'
                  : syncResult?.success
                    ? 'bg-green-500/10 text-green-500 border-green-500/50'
                    : 'bg-[#635BFF]/10 text-[#635BFF] border-[#635BFF]/30 hover:bg-[#635BFF] hover:text-white hover:border-[#635BFF]'
                  }`}
                title="Sincronizar catálogo com Stripe"
              >
                {isSyncing ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    <span>Sincronizando...</span>
                  </>
                ) : syncResult?.success ? (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Sincronizado</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    <span>Sync Stripe</span>
                  </>
                )}
              </button>
            )}

            {/* New Service Button */}
            <button
              onClick={handleCreateService}
              className="bg-barber-gold hover:bg-barber-goldhover text-black px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/20 text-sm"
            >
              <Plus size={16} />
              {activeTab === 'services' ? 'Novo Serviço' : 'Novo Produto'}
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'services' ? (
        /* SERVICE LIST */
        <div className="bg-barber-900 border border-barber-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-barber-950 border-b border-barber-800">
                  <th className="p-4 text-[10px] uppercase tracking-wider text-gray-500 font-medium">Serviço</th>
                  <th className="p-4 text-[10px] uppercase tracking-wider text-gray-500 font-medium text-center">Categoria</th>
                  <th className="p-4 text-[10px] uppercase tracking-wider text-gray-500 font-medium text-center">Duração</th>
                  <th className="p-4 text-[10px] uppercase tracking-wider text-gray-500 font-medium text-right">Preço</th>
                  <th className="p-4 text-[10px] uppercase tracking-wider text-gray-500 font-medium text-center">Status</th>
                  <th className="p-4 text-[10px] uppercase tracking-wider text-gray-500 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-barber-800">
                {services.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-500">
                        <Clock size={48} className="opacity-20" />
                        <p className="text-base font-medium">Você ainda não tem nenhum serviço cadastrado</p>
                        <p className="text-sm text-gray-600">Clique em "Novo Serviço" para começar</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  services.map((service) => (
                    <tr key={service.id} className="hover:bg-barber-800/30 transition-colors group">
                      {/* Service Name & Description */}
                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{service.name}</div>
                        {service.description && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs">{service.description}</div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-4 text-center">
                        <span className="inline-block bg-barber-800 text-gray-300 px-3 py-1 rounded text-xs font-medium border border-barber-700">
                          {service.category || 'Geral'}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-sm text-gray-300">
                          <Clock size={14} className="text-barber-gold" />
                          <span>{service.duration_minutes} min</span>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-sm font-bold text-white">
                          <DollarSign size={14} className="text-green-500" />
                          <span>R$ {service.price.toFixed(2).replace('.', ',')}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${service.is_active
                          ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                          : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${service.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          {service.is_active ? 'Ativo' : 'Inativo'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditService(service)}
                            className="p-2 hover:bg-barber-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div >
      ) : (
        /* PRODUCT LIST */
        <>
          {products.some(p => p.stock <= p.minStock) && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3 mb-4">
              <AlertTriangle className="text-red-500 shrink-0" size={20} />
              <div>
                <h4 className="text-red-500 font-bold text-sm">Atenção: Estoque Baixo</h4>
                <p className="text-red-400 text-xs mt-1">Alguns produtos estão abaixo do mínimo e precisam de reposição.</p>
              </div>
            </div>
          )}

          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 text-gray-500" size={18} />
              <input
                type="text"
                placeholder="Buscar produto..."
                className="w-full bg-barber-900 border border-barber-800 text-white pl-10 pr-4 py-2 rounded-lg focus:border-barber-gold outline-none"
              />
            </div>
            <button className="bg-barber-900 hover:bg-barber-800 text-white p-2 rounded-lg border border-barber-800">
              <Filter size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.length === 0 ? (
              <div className="col-span-full p-12 text-center border-2 border-dashed border-barber-800 rounded-xl">
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <Package size={48} className="opacity-20" />
                  <p className="text-lg font-medium">Você ainda não tem nenhum produto cadastrado</p>
                  <p className="text-sm text-gray-600">Clique em "Novo Produto" para começar</p>
                </div>
              </div>
            ) : (
              products.map(product => (
                <div key={product.id} className={`bg-barber-900 border rounded-xl p-5 shadow-lg group transition-all relative ${product.stock <= product.minStock ? 'border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-barber-800 hover:border-barber-700'}`}>

                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-barber-950 rounded-lg border border-barber-800">
                      <Package size={24} className="text-barber-gold" />
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-bold ${product.stock <= product.minStock ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
                      {product.stock} un
                    </div>
                  </div>

                  <h3 className="font-bold text-white mb-1 truncate">{product.name}</h3>
                  <p className="text-xs text-gray-500 mb-4">{product.category}</p>

                  <div className="flex justify-between items-end border-t border-barber-800 pt-4">
                    <div>
                      <div className="text-xs text-gray-500">Preço Venda</div>
                      <div className="text-lg font-bold text-white">R$ {product.price.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Comissão</div>
                      <div className="text-sm font-medium text-blue-400">{product.commissionRate || 0}%</div>
                    </div>
                  </div>

                  {product.stock <= product.minStock && (
                    <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded p-2 flex items-center gap-2 text-xs text-red-400">
                      <AlertTriangle size={12} /> Estoque Baixo (Min: {product.minStock})
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button className="flex-1 bg-barber-800 hover:bg-barber-700 text-white text-xs font-bold py-2 rounded transition-colors">Editar</button>
                    <button className="flex-1 bg-barber-gold hover:bg-barber-goldhover text-black text-xs font-bold py-2 rounded transition-colors">Vender</button>
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
          <div className="bg-barber-900 border border-barber-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {isSyncing ? (
                  <>
                    <Loader className="animate-spin text-[#635BFF]" size={24} />
                    Sincronizando...
                  </>
                ) : syncResult?.success || syncResult?.created > 0 || syncResult?.updated > 0 ? (
                  <>
                    <CheckCircle2 className="text-green-500" size={24} />
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
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {isSyncing ? (
              <div className="space-y-3">
                <p className="text-gray-400">Buscando produtos do Stripe...</p>
                <div className="bg-barber-950 rounded-lg p-4">
                  <div className="h-2 bg-barber-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#635BFF] animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                </div>
              </div>
            ) : syncResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-barber-950 border border-barber-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">{syncResult.total}</div>
                    <div className="text-xs text-gray-400 mt-1">Total</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-500">{syncResult.created}</div>
                    <div className="text-xs text-green-400 mt-1">Criados</div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-500">{syncResult.updated}</div>
                    <div className="text-xs text-blue-400 mt-1">Atualizados</div>
                  </div>
                </div>

                {syncResult.errors && syncResult.errors.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <h4 className="text-red-500 font-bold text-sm mb-2">Erros:</h4>
                    <ul className="text-xs text-red-400 space-y-1">
                      {syncResult.errors.map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => setShowSyncModal(false)}
                  className="w-full bg-barber-gold hover:bg-barber-goldhover text-black font-bold py-2.5 rounded-lg transition-colors"
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
