
import React, { useState, useMemo } from 'react';
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
  MoreVertical,
  TrendingUp,
  Zap,
  Flame,
  Percent
} from 'lucide-react';
import { Service, Product } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Switch from './ui/Switch';
import Badge from './ui/Badge';
import Select from './ui/Select'; // Ensure Select is imported
import { useToast } from './ui/Toast';

interface ServicesProps {
  services: Service[];
  products: Product[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

const Services: React.FC<ServicesProps> = ({ services, products, setServices, setProducts }) => {
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const toast = useToast();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
      name: '',
      category: '',
      price: '',
      duration: '30',
      description: '',
      image: '',
      active: true,
      billingType: 'one_time' as 'one_time' | 'recurring',
      // Order Bump Fields
      bumpActive: false,
      bumpTargetServiceId: '',
      bumpDiscount: '10'
  });

  // --- Statistics ---
  const stats = useMemo(() => {
      const activeCount = services.filter(s => s.active).length;
      const avgPrice = services.length > 0 
        ? services.reduce((acc, s) => acc + s.price, 0) / services.length 
        : 0;
      return { activeCount, avgPrice };
  }, [services]);

  const filteredServices = services.filter(s => 
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.category && s.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSyncStripe = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setShowSyncSuccess(true);
      toast.success('Catálogo sincronizado com Stripe!');
      setTimeout(() => setShowSyncSuccess(false), 3000);
    }, 2000);
  };

  // CRUD OPERATIONS
  const handleAddNew = () => {
      setEditingService(null);
      setFormData({
          name: '',
          category: '',
          price: '',
          duration: '30',
          description: '',
          image: '',
          active: true,
          billingType: 'one_time',
          bumpActive: false,
          bumpTargetServiceId: '',
          bumpDiscount: '10'
      });
      setIsModalOpen(true);
  };

  const handleEdit = (service: Service) => {
      setEditingService(service);
      setFormData({
          name: service.name,
          category: service.category || '',
          price: service.price.toString(),
          duration: service.duration.toString(),
          description: service.description || '',
          image: service.image || '',
          active: service.active,
          billingType: service.billingType || 'one_time',
          bumpActive: service.orderBump?.active || false,
          bumpTargetServiceId: service.orderBump?.targetServiceId || '',
          bumpDiscount: service.orderBump?.discountPercent.toString() || '10'
      });
      setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if (confirm('Tem certeza que deseja excluir este serviço?')) {
          setServices(prev => prev.filter(s => s.id !== id));
          toast.success('Serviço excluído com sucesso.');
      }
  };

  const handleSave = () => {
      const newService: Service = {
          id: editingService ? editingService.id : Math.random().toString(36).substr(2, 9),
          name: formData.name,
          category: formData.category,
          price: parseFloat(formData.price) || 0,
          duration: parseInt(formData.duration) || 30,
          description: formData.description,
          image: formData.image,
          active: formData.active,
          billingType: formData.billingType,
          orderBump: {
              active: formData.bumpActive,
              targetServiceId: formData.bumpTargetServiceId,
              discountPercent: parseFloat(formData.bumpDiscount) || 0
          }
      };

      if (editingService) {
          setServices(prev => prev.map(s => s.id === editingService.id ? newService : s));
          toast.success('Serviço atualizado com sucesso!');
      } else {
          setServices(prev => [...prev, newService]);
          toast.success('Serviço criado com sucesso!');
      }
      setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* Header Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card noPadding className="md:col-span-2 p-5 bg-gradient-to-r from-zinc-900 to-zinc-950 border-l-4 border-l-cyan-500 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left w-full">
                  <h2 className="text-xl font-bold text-white">Catálogo de Serviços</h2>
                  <p className="text-sm text-muted mt-1">Gerencie preços, duração e visibilidade.</p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    onClick={handleSyncStripe} 
                    isLoading={isSyncing}
                    className="w-full sm:w-auto"
                    title="Sincronizar com Stripe"
                  >
                      {showSyncSuccess ? <CheckCircle2 size={18} className="text-green-500"/> : <RefreshCw size={18}/>}
                  </Button>
                  <Button onClick={handleAddNew} leftIcon={<Plus size={18} />} className="w-full sm:w-auto">
                    Novo Serviço
                  </Button>
              </div>
          </Card>
          
          <Card noPadding className="col-span-1 p-4 flex flex-col justify-center border-l-4 border-l-emerald-500">
              <span className="text-xs font-bold uppercase text-muted tracking-wider">Ativos</span>
              <div className="text-2xl font-bold text-white mt-1">{stats.activeCount} <span className="text-sm text-muted font-normal">/ {services.length}</span></div>
              <div className="text-[10px] text-emerald-500 font-bold mt-1 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Disponíveis no App
              </div>
          </Card>

          <Card noPadding className="col-span-1 p-4 flex flex-col justify-center border-l-4 border-l-sky-500">
              <span className="text-xs font-bold uppercase text-muted tracking-wider">Ticket Médio</span>
              <div className="text-2xl font-bold text-white mt-1">R$ {stats.avgPrice.toFixed(0)}</div>
              <div className="text-[10px] text-sky-500 font-bold mt-1">
                  Baseado no catálogo
              </div>
          </Card>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
          <div className="w-full flex flex-col lg:flex-row gap-4">
            <div className="w-full lg:w-80">
                <Input 
                    placeholder="Buscar serviço..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    containerClassName="mb-0"
                    className="bg-zinc-950 border-zinc-800"
                    icon={<Search size={16}/>}
                />
            </div>
            
            {/* Filter Tabs */}
            <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 overflow-x-auto scrollbar-hide w-full lg:w-auto">
                <button 
                    onClick={() => setActiveTab('services')}
                    className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'services' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                    <Scissors size={14} /> Serviços
                </button>
                <button 
                    onClick={() => setActiveTab('products')}
                    className={`flex-1 lg:flex-none px-4 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${activeTab === 'products' ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}
                >
                    <Package size={14} /> Produtos
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

      {activeTab === 'services' ? (
        <>
            {/* GRID VIEW */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredServices.map(service => (
                        <Card key={service.id} noPadding className="flex flex-col h-full bg-zinc-900 hover:border-cyan-500/50 transition-all duration-300 group">
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center border border-cyan-500/20">
                                            <Scissors size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-main text-sm">{service.name}</h3>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <Badge size="sm" variant="outline" className="text-[10px] py-0">{service.category || 'Geral'}</Badge>
                                                {service.billingType === 'recurring' && <Badge size="sm" variant="info" className="text-[10px] py-0">Assinatura</Badge>}
                                            </div>
                                        </div>
                                    </div>
                                    <Switch 
                                        checked={service.active} 
                                        onCheckedChange={(c) => {
                                            const updated = { ...service, active: c };
                                            setServices(prev => prev.map(s => s.id === service.id ? updated : s));
                                        }}
                                    />
                                </div>

                                <p className="text-xs text-muted line-clamp-2 mb-4 min-h-[32px]">
                                    {service.description || "Sem descrição definida para este serviço."}
                                </p>

                                {/* Order Bump Indicator */}
                                {service.orderBump?.active && (
                                    <div className="mb-4 bg-gradient-to-r from-barber-gold/10 to-transparent p-2 rounded-lg border-l-2 border-barber-gold flex items-center gap-2">
                                        <Flame size={14} className="text-barber-gold" />
                                        <div className="text-[10px]">
                                            <span className="text-barber-gold font-bold">Combo Ativo:</span>
                                            <span className="text-muted ml-1">
                                                {services.find(s => s.id === service.orderBump?.targetServiceId)?.name} (-{service.orderBump.discountPercent}%)
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-muted font-bold uppercase">Valor</span>
                                        <div className="text-lg font-bold text-white">R$ {service.price.toFixed(2)}</div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-muted font-bold uppercase">Tempo</span>
                                        <div className="text-sm font-medium text-white flex items-center gap-1">
                                            <Clock size={14} className="text-barber-gold" /> {service.duration} min
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-zinc-950 p-2 flex justify-end gap-2 border-t border-zinc-800">
                                <Button size="sm" variant="ghost" onClick={() => handleEdit(service)} className="text-xs h-8">
                                    <Edit2 size={14} className="mr-1" /> Editar
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDelete(service.id)} className="text-xs h-8 hover:text-red-500">
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'list' && (
                <div className="flex flex-col gap-3">
                    {/* Desktop Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-muted uppercase tracking-wider bg-zinc-900/50 rounded-lg border border-transparent">
                        <div className="col-span-4">Serviço</div>
                        <div className="col-span-2">Categoria</div>
                        <div className="col-span-2">Preço / Duração</div>
                        <div className="col-span-2">Status</div>
                        <div className="col-span-2 text-right">Ações</div>
                    </div>

                    {filteredServices.map(service => (
                        <div 
                            key={service.id} 
                            className="bg-zinc-900 border border-zinc-800 hover:border-cyan-500/30 rounded-xl p-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-center transition-all duration-200 group"
                        >
                            {/* Name */}
                            <div className="w-full md:col-span-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-muted">
                                    <Scissors size={14} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="font-bold text-main text-sm truncate">{service.name}</div>
                                        {service.orderBump?.active && <span title="Combo Ativo"><Flame size={12} className="text-barber-gold fill-barber-gold" /></span>}
                                    </div>
                                    {service.billingType === 'recurring' && <span className="text-[9px] text-sky-400 flex items-center gap-1"><RefreshCw size={8} /> Recorrente</span>}
                                </div>
                            </div>

                            {/* Category */}
                            <div className="w-full md:col-span-2">
                                <Badge variant="outline" size="sm">{service.category || 'Geral'}</Badge>
                            </div>

                            {/* Price/Duration */}
                            <div className="w-full md:col-span-2 flex items-center justify-between md:block">
                                <div className="text-sm font-bold text-white">R$ {service.price.toFixed(2)}</div>
                                <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
                                    <Clock size={10} /> {service.duration} min
                                </div>
                            </div>

                            {/* Status */}
                            <div className="w-full md:col-span-2 flex items-center justify-between md:justify-start">
                                <span className="md:hidden text-xs font-bold text-muted uppercase">Status</span>
                                <Switch 
                                    checked={service.active} 
                                    onCheckedChange={(c) => {
                                        const updated = { ...service, active: c };
                                        setServices(prev => prev.map(s => s.id === service.id ? updated : s));
                                    }}
                                />
                            </div>

                            {/* Actions */}
                            <div className="w-full md:col-span-2 flex items-center justify-end gap-2 mt-2 md:mt-0 pt-2 md:pt-0 border-t border-zinc-800 md:border-0">
                                <Button size="icon" variant="ghost" onClick={() => handleEdit(service)} title="Editar" className="h-8 w-8">
                                    <Edit2 size={14} />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => handleDelete(service.id)} className="h-8 w-8 hover:text-red-500" title="Excluir">
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
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-xl">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                <Package size={24} className="text-muted opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-main">Módulo em Desenvolvimento</h3>
            <p className="text-muted mt-2 text-sm">A gestão de estoque e produtos estará disponível na próxima atualização.</p>
            <Button className="mt-6" variant="outline" disabled>Notificar quando disponível</Button>
        </div>
      )}

      {/* SERVICE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Editar Serviço' : 'Novo Serviço'}
        size="lg"
        footer={
            <>
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" onClick={handleSave} leftIcon={<Check size={18} />}>
                    {editingService ? 'Salvar Alterações' : 'Criar Serviço'}
                </Button>
            </>
        }
      >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-5">
                 <Input 
                    label="Nome do Serviço"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Corte, Coloração"
                    icon={<Scissors size={16}/>}
                 />

                 <Input 
                    label="Categoria"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    placeholder="Ex: Cabelo, Barba"
                    icon={<Tag size={16}/>}
                 />

                 <div className="grid grid-cols-2 gap-4">
                    <Input 
                        label="Preço (R$)"
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: e.target.value})}
                        placeholder="0.00"
                        icon={<DollarSign size={16}/>}
                    />
                    <Input 
                        label="Duração (min)"
                        type="number"
                        value={formData.duration}
                        onChange={(e) => setFormData({...formData, duration: e.target.value})}
                        placeholder="30"
                        icon={<Clock size={16}/>}
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-muted uppercase mb-1 ml-1">Descrição</label>
                    <textarea 
                        className="w-full bg-zinc-950 border border-zinc-800 text-main rounded-xl p-3 outline-none focus:border-barber-gold resize-none h-20 text-sm"
                        placeholder="Descrição opcional..."
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                    />
                 </div>
             </div>

             <div className="space-y-6">
                 <div>
                    <label className="block text-xs font-bold text-muted uppercase mb-2 ml-1">Tipo de Cobrança</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setFormData({...formData, billingType: 'one_time'})}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                                formData.billingType === 'one_time' 
                                ? 'bg-barber-gold/10 border-barber-gold text-barber-gold' 
                                : 'bg-zinc-950 border-zinc-800 text-muted hover:border-zinc-700'
                            }`}
                        >
                            <CreditCard size={20} />
                            <span className="text-sm font-bold">Avulso</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({...formData, billingType: 'recurring'})}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                                formData.billingType === 'recurring' 
                                ? 'bg-purple-500/10 border-purple-500 text-purple-400' 
                                : 'bg-zinc-950 border-zinc-800 text-muted hover:border-zinc-700'
                            }`}
                        >
                            <RefreshCw size={20} />
                            <span className="text-sm font-bold">Recorrente</span>
                        </button>
                    </div>
                 </div>

                 {/* ORDER BUMP SECTION */}
                 <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl p-4 relative overflow-hidden">
                     {/* Decorative Background */}
                     <div className="absolute -top-4 -right-4 w-24 h-24 bg-barber-gold/5 rounded-full blur-xl pointer-events-none"></div>
                     
                     <div className="flex justify-between items-center mb-4 relative z-10">
                         <div>
                             <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                 <Flame size={16} className="text-barber-gold" /> Order Bump (Combo)
                             </h4>
                             <p className="text-[10px] text-muted mt-0.5">Ofereça um serviço extra ao selecionar este.</p>
                         </div>
                         <Switch 
                            checked={formData.bumpActive} 
                            onCheckedChange={(c) => setFormData({...formData, bumpActive: c})}
                         />
                     </div>

                     {formData.bumpActive && (
                         <div className="space-y-4 animate-fade-in relative z-10">
                             <Select 
                                label="Serviço a Ofertar"
                                options={services
                                    .filter(s => s.id !== editingService?.id) // Avoid self-reference
                                    .map(s => ({ value: s.id, label: s.name }))}
                                value={formData.bumpTargetServiceId}
                                onChange={(e) => setFormData({...formData, bumpTargetServiceId: e.target.value})}
                             />
                             <div className="relative">
                                 <Input 
                                    label="Desconto na Oferta (%)"
                                    type="number"
                                    value={formData.bumpDiscount}
                                    onChange={(e) => setFormData({...formData, bumpDiscount: e.target.value})}
                                    icon={<Percent size={14} />}
                                 />
                             </div>
                             {formData.bumpTargetServiceId && (
                                 <div className="text-[10px] text-green-500 bg-green-500/10 p-2 rounded border border-green-500/20 text-center">
                                     O cliente verá a oferta para adicionar <strong>{services.find(s => s.id === formData.bumpTargetServiceId)?.name}</strong> com <strong>{formData.bumpDiscount}% OFF</strong>.
                                 </div>
                             )}
                         </div>
                     )}
                 </div>
                 
                 <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                    <div>
                        <span className="text-sm font-bold text-main block">Status</span>
                        <span className="text-xs text-muted">Disponível no app</span>
                    </div>
                    <Switch 
                        checked={formData.active} 
                        onCheckedChange={(c) => setFormData({...formData, active: c})} 
                    />
                 </div>
             </div>
          </div>
      </Modal>
    </div>
  );
};

export default Services;
