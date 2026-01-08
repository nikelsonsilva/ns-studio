/**
 * ServiceModal - NS Studio Design System
 * Modal para criação e edição de serviços
 */
import React, { useState, useEffect } from 'react';
import { Scissors, Tag, DollarSign, Clock, CreditCard, RefreshCw, Check, Plus, Layers } from 'lucide-react';
import { createService, updateService } from '../lib/database';
import type { Service } from '../types';

// UI Components (Design System)
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import Switch from './ui/Switch';
import { useToast } from './ui/Toast';

interface ServiceModalProps {
  service?: Service | null;
  onClose: () => void;
  onSuccess: () => void;
  existingCategories?: string[];
}

const ServiceModal: React.FC<ServiceModalProps> = ({ service, onClose, onSuccess, existingCategories = [] }) => {
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    price: 0,
    duration_minutes: 30,
    is_active: true,
    billing_type: 'one_time' as 'one_time' | 'recurring',
    recurring_interval: 'month' as 'day' | 'week' | 'month' | 'year',
    recurring_interval_count: 1,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || '',
        category: service.category || '',
        price: service.price,
        duration_minutes: service.duration_minutes,
        is_active: service.is_active ?? true,
        billing_type: service.billing_type || 'one_time',
        recurring_interval: service.recurring_interval || 'month',
        recurring_interval_count: service.recurring_interval_count || 1,
      });
    }
  }, [service]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!formData.name.trim()) {
      toast.warning('Nome do serviço é obrigatório');
      return;
    }

    if (formData.price <= 0) {
      toast.warning('Preço deve ser maior que zero');
      return;
    }

    setIsLoading(true);

    try {
      let result;
      if (service) {
        result = await updateService(service.id, formData);

        if (service.stripe_product_id) {
          const { updateStripeProduct } = await import('../lib/stripeSync');
          await updateStripeProduct({
            ...service,
            ...formData
          });
        }
        toast.success('Serviço atualizado com sucesso!');
      } else {
        result = await createService(formData);

        if (result) {
          const { createStripeProduct } = await import('../lib/stripeSync');
          const { isStripeConfigured } = await import('../lib/stripe');

          const stripeConfigured = await isStripeConfigured();

          if (stripeConfigured) {
            await createStripeProduct(result);
          }
        }
        toast.success('Serviço criado com sucesso!');
      }

      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Erro ao salvar serviço. Tente novamente.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={service ? 'Editar Serviço' : 'Novo Serviço'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => handleSubmit()}
            isLoading={isLoading}
            leftIcon={<Check size={18} />}
          >
            {service ? 'Salvar Alterações' : 'Criar Serviço'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Nome do Serviço */}
        <Input
          label="Nome do Serviço"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Corte, Coloração"
          icon={<Scissors size={16} />}
        />

        {/* Categoria */}
        <div>
          <label className="block text-xs font-bold text-muted uppercase mb-1 ml-1">Categoria</label>
          <div className="relative group">
            <div className="absolute left-3 top-0 bottom-0 flex items-center text-muted group-focus-within:text-barber-gold transition-colors pointer-events-none">
              <Tag size={16} />
            </div>
            <input
              type="text"
              list="categories"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-barber-gold transition-all"
              placeholder="Ex: Cabelo, Barba"
            />
            <datalist id="categories">
              {existingCategories.map((cat, idx) => (
                <option key={idx} value={cat} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Preço e Duração */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Preço (R$)"
            value={formData.price === 0 ? '' : (formData.price).toFixed(2).replace('.', ',')}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              const numValue = parseInt(value || '0') / 100;
              setFormData({ ...formData, price: numValue });
            }}
            placeholder="0,00"
            icon={<DollarSign size={16} />}
          />
          <div>
            <label className="block text-xs font-bold text-muted uppercase mb-1 ml-1">Duração</label>
            <div className="relative group">
              <div className="absolute left-3 top-0 bottom-0 flex items-center text-muted group-focus-within:text-barber-gold transition-colors pointer-events-none">
                <Clock size={16} />
              </div>
              <select
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-barber-gold transition-all appearance-none cursor-pointer"
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hora</option>
                <option value={90}>1h 30min</option>
                <option value={120}>2 horas</option>
                <option value={150}>2h 30min</option>
                <option value={180}>3 horas</option>
                <option value={240}>4 horas</option>
                <option value={300}>5 horas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-xs font-bold text-muted uppercase mb-1 ml-1">Descrição</label>
          <textarea
            className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl p-3 outline-none focus:border-barber-gold resize-none h-20 text-sm"
            placeholder="Descrição opcional..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {/* Tipo de Cobrança */}
        <div>
          <label className="block text-xs font-bold text-muted uppercase mb-2 ml-1">Tipo de Cobrança</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, billing_type: 'one_time' })}
              className={`flex-1 px-4 py-2.5 rounded-lg border flex items-center justify-center gap-2 transition-all text-sm font-bold ${formData.billing_type === 'one_time'
                ? 'bg-barber-gold/10 border-barber-gold text-barber-gold'
                : 'bg-zinc-950 border-zinc-800 text-muted hover:border-zinc-700'
                }`}
            >
              <CreditCard size={16} />
              Avulso
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, billing_type: 'recurring' })}
              className={`flex-1 px-4 py-2.5 rounded-lg border flex items-center justify-center gap-2 transition-all text-sm font-bold ${formData.billing_type === 'recurring'
                ? 'bg-purple-500/10 border-purple-500 text-purple-400'
                : 'bg-zinc-950 border-zinc-800 text-muted hover:border-zinc-700'
                }`}
            >
              <RefreshCw size={16} />
              Recorrente
            </button>
          </div>
        </div>

        {/* Recurring Options */}
        {formData.billing_type === 'recurring' && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">Intervalo</label>
                <select
                  value={formData.recurring_interval}
                  onChange={(e) => setFormData({ ...formData, recurring_interval: e.target.value as any })}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-barber-gold transition-colors"
                >
                  <option value="day">Dia</option>
                  <option value="week">Semana</option>
                  <option value="month">Mês</option>
                  <option value="year">Ano</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted uppercase mb-1">A cada</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.recurring_interval_count}
                  onChange={(e) => setFormData({ ...formData, recurring_interval_count: parseInt(e.target.value) })}
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-barber-gold transition-colors"
                />
              </div>
            </div>
            <div className="text-xs text-muted bg-zinc-900 rounded-lg p-2">
              Cobrança: A cada {formData.recurring_interval_count} {
                formData.recurring_interval === 'day' ? 'dia(s)' :
                  formData.recurring_interval === 'week' ? 'semana(s)' :
                    formData.recurring_interval === 'month' ? 'mês(es)' : 'ano(s)'
              }
            </div>
          </div>
        )}

        {/* Status Toggle */}
        <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
          <div>
            <span className="text-sm font-bold text-white block">Status do Serviço</span>
            <span className="text-xs text-muted">{formData.is_active ? 'Disponível para agendamento' : 'Oculto do catálogo'}</span>
          </div>
          <Switch
            checked={formData.is_active}
            onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
          />
        </div>
      </div>
    </Modal>
  );
};

export default ServiceModal;
