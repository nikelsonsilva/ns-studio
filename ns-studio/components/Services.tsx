
import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Clock, DollarSign, Package, CheckCircle2, Check, RefreshCw, CreditCard } from 'lucide-react';
import { Service, Product } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Switch from './ui/Switch';
import Badge from './ui/Badge';
import { useToast } from './ui/Toast';

interface ServicesProps {
  services: Service[];
  products: Product[];
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

const Services: React.FC<ServicesProps> = ({ services, products, setServices, setProducts }) => {
  const [activeTab, setActiveTab] = useState<'services' | 'products'>('services');
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
      billingType: 'one_time' as 'one_time' | 'recurring'
  });

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
          billingType: 'one_time'
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
          billingType: service.billingType || 'one_time'
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
          billingType: formData.billingType
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
      {/* Header & Tabs */}
      <Card className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-l-4 border-l-cyan-500 bg-gradient-to-r from-cyan-500/5 via-barber-900 to-barber-900">
        <div>
          <h2 className="text-2xl font-bold text-main flex items-center gap-2">
            {activeTab === 'services' ? 'Catálogo de Serviços' : 'Estoque de Produtos'}
          </h2>
          <p className="text-muted text-sm mt-1">
            {activeTab === 'services' 
              ? 'Gerencie preços, durações e profissionais habilitados.' 
              : 'Controle de vendas, estoque e margem de lucro.'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
           <div className="bg-barber-950 p-1 rounded-lg border border-barber-800 flex w-full sm:w-auto">
              <button 
                onClick={() => setActiveTab('services')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all ${
                  activeTab === 'services' 
                  ? 'bg-barber-800 text-main shadow' 
                  : 'text-muted hover:text-main hover:bg-barber-800/50'
                }`}
              >
                Serviços
              </button>
              <button 
                disabled
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all text-muted/50 cursor-not-allowed flex items-center gap-2`}
              >
                Produtos 
                <span className="text-[10px] uppercase font-bold border border-barber-800 text-muted px-1.5 py-0.5 rounded-full bg-barber-950">
                    Em breve
                </span>
              </button>
           </div>

           <div className="flex gap-2 w-full sm:w-auto">
                {activeTab === 'services' && (
                    <Button 
                        variant="outline"
                        onClick={handleSyncStripe}
                        isLoading={isSyncing}
                        title="Sincronizar catálogo com Stripe"
                        leftIcon={showSyncSuccess ? <CheckCircle2 size={18} /> : <RefreshCw size={18} />}
                    >
                        {showSyncSuccess ? 'Sync OK' : 'Sincronizar'}
                    </Button>
                )}

                <Button 
                    onClick={activeTab === 'services' ? handleAddNew : () => {}}
                    disabled={activeTab !== 'services'}
                    leftIcon={<Plus size={18} />}
                >
                    {activeTab === 'services' ? 'Novo Serviço' : 'Novo Produto'}
                </Button>
           </div>
        </div>
      </Card>

      {activeTab === 'services' ? (
        /* SERVICE LIST */
        <Card noPadding className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-barber-950 text-muted text-xs uppercase tracking-wider border-b border-barber-800">
                  <th className="p-4 pl-6">Serviço</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">Duração</th>
                  <th className="p-4">Preço</th>
                  <th className="p-4">Cobrança</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right pr-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-barber-800">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-barber-800/20 transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-main text-base">{service.name}</div>
                      {service.description && (
                        <div className="text-xs text-muted mt-0.5 max-w-[200px] truncate">{service.description}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" size="sm">{service.category || 'Geral'}</Badge>
                    </td>
                    <td className="p-4 text-muted">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-barber-gold" />
                        {service.duration} min
                      </div>
                    </td>
                    <td className="p-4 text-main font-bold">
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} className="text-green-500" />
                        R$ {service.price.toFixed(2)}
                      </div>
                    </td>
                    <td className="p-4">
                        {service.billingType === 'recurring' ? (
                            <Badge variant="info" size="sm" icon={<RefreshCw size={10} />}>Assinatura</Badge>
                        ) : (
                            <Badge variant="default" size="sm">Avulso</Badge>
                        )}
                    </td>
                    <td className="p-4">
                      <Badge variant={service.active ? 'success' : 'danger'} size="sm">
                        {service.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(service)} title="Editar"><Edit2 size={16} /></Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(service.id)} className="hover:text-red-500" title="Excluir"><Trash2 size={16} /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* PRODUCT LIST (Placeholder) */
        <div className="flex flex-col items-center justify-center py-20 bg-barber-900 border border-barber-800 rounded-xl">
            <Package size={48} className="text-muted mb-4" />
            <h3 className="text-xl font-bold text-main">Módulo em Desenvolvimento</h3>
            <p className="text-muted mt-2">A gestão de estoque estará disponível em breve.</p>
        </div>
      )}

      {/* SERVICE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Editar Serviço' : 'Novo Serviço'}
        footer={
            <>
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" onClick={handleSave} leftIcon={<Check size={18} />}>
                    {editingService ? 'Salvar Alterações' : 'Criar Serviço'}
                </Button>
            </>
        }
      >
          <div className="space-y-5">
             <Input 
                label="Nome do Serviço"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Corte, Coloração"
                icon={<Package size={16}/>}
             />

             <Input 
                label="Categoria"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                placeholder="Ex: Cabelo, Barba"
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
                    className="w-full bg-barber-950 border border-barber-800 text-main rounded-xl p-3 outline-none focus:border-barber-gold resize-none h-20 text-sm"
                    placeholder="Descrição opcional..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
             </div>

             <div>
                <label className="block text-xs font-bold text-muted uppercase mb-2 ml-1">Tipo de Cobrança</label>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, billingType: 'one_time'})}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                            formData.billingType === 'one_time' 
                            ? 'bg-barber-gold/10 border-barber-gold text-barber-gold' 
                            : 'bg-barber-950 border-barber-800 text-muted hover:border-barber-700'
                        }`}
                    >
                        <CreditCard size={20} />
                        <span className="text-sm font-bold">Avulso</span>
                        <span className="text-xs opacity-70">Pagamento único</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData({...formData, billingType: 'recurring'})}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${
                            formData.billingType === 'recurring' 
                            ? 'bg-purple-500/10 border-purple-500 text-purple-400' 
                            : 'bg-barber-950 border-barber-800 text-muted hover:border-barber-700'
                        }`}
                    >
                        <RefreshCw size={20} />
                        <span className="text-sm font-bold">Recorrente</span>
                        <span className="text-xs opacity-70">Assinatura</span>
                    </button>
                </div>
             </div>
             
             <div className="flex items-center justify-between p-4 bg-barber-950 border border-barber-800 rounded-xl">
                <div>
                    <span className="text-sm font-bold text-main block">Status do Serviço</span>
                    <span className="text-xs text-muted">Disponível para agendamento</span>
                </div>
                <Switch 
                    checked={formData.active} 
                    onCheckedChange={(c) => setFormData({...formData, active: c})} 
                />
             </div>
          </div>
      </Modal>
    </div>
  );
};

export default Services;
