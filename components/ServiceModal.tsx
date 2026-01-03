/**
 * ServiceModal - NS Studio Design System
 * Modal para criação e edição de serviços
 */
import React, { useState, useEffect } from 'react';
import { Tag, DollarSign, Clock, FileText, CreditCard, Repeat, Plus, Layers } from 'lucide-react';
import { createService, updateService } from '../lib/database';
import type { Service } from '../types';

// UI Components (Design System)
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import Textarea from './ui/Textarea';
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
      subtitle={service ? 'Atualizar informações' : 'Adicionar ao catálogo'}
      icon={<Tag size={20} />}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => handleSubmit()}
            isLoading={isLoading}
            leftIcon={service ? undefined : <Plus size={16} />}
          >
            {service ? 'Salvar Alterações' : 'Criar Serviço'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <Input
          label="Nome do Serviço *"
          icon={<Tag size={18} />}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Corte, Coloração, Manicure"
          required
        />

        {/* Category */}
        <div>
          <label className="block text-xs font-bold text-[var(--text-subtle)] uppercase mb-1 ml-1">
            Categoria
          </label>
          <div className="relative group">
            <div className="absolute left-3 top-0 bottom-0 flex items-center text-[var(--text-subtle)] group-focus-within:text-[var(--brand-primary)] transition-colors pointer-events-none">
              <Layers size={18} />
            </div>
            <input
              type="text"
              list="categories"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-[var(--surface-app)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-primary)] focus:bg-[var(--surface-card)] transition-all"
              placeholder="Ex: Cabelo, Estética, Unhas"
            />
            <datalist id="categories">
              {existingCategories.map((cat, idx) => (
                <option key={idx} value={cat} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Price and Duration */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Preço (R$) *"
            icon={<DollarSign size={18} />}
            value={formData.price === 0 ? '' : (formData.price).toFixed(2).replace('.', ',')}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '');
              const numValue = parseInt(value || '0') / 100;
              setFormData({ ...formData, price: numValue });
            }}
            placeholder="0,00"
            required
          />

          <div>
            <label className="block text-xs font-bold text-[var(--text-subtle)] uppercase mb-1 ml-1">
              Duração *
            </label>
            <div className="relative group">
              <div className="absolute left-3 top-0 bottom-0 flex items-center text-[var(--text-subtle)] group-focus-within:text-[var(--brand-primary)] transition-colors pointer-events-none">
                <Clock size={18} />
              </div>
              <select
                value={[15, 30, 45, 60, 90, 120, 150, 180, 240, 300].includes(formData.duration_minutes) ? formData.duration_minutes : 'custom'}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setFormData({ ...formData, duration_minutes: 1 });
                  } else {
                    setFormData({ ...formData, duration_minutes: parseInt(e.target.value) });
                  }
                }}
                className="w-full bg-[var(--surface-app)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-primary)] focus:bg-[var(--surface-card)] transition-all appearance-none cursor-pointer"
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
                <option value="custom">Personalizado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Duration Input */}
        {![15, 30, 45, 60, 90, 120, 150, 180, 240, 300].includes(formData.duration_minutes) && (
          <Input
            label="Duração Personalizada (minutos)"
            icon={<Clock size={18} />}
            type="number"
            min={5}
            step={5}
            value={formData.duration_minutes.toString()}
            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
            placeholder="Digite em minutos..."
          />
        )}

        {/* Description */}
        <Textarea
          label="Descrição"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Descrição opcional do serviço..."
          rows={2}
        />

        {/* Billing Type */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-[var(--text-subtle)] uppercase ml-1">
            Tipo de Cobrança
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, billing_type: 'one_time' })}
              className={`p-4 rounded-xl border transition-all ${formData.billing_type === 'one_time'
                ? 'border-barber-gold bg-[var(--brand-primary)]/10 text-[var(--text-primary)]'
                : 'border-[var(--border-default)] bg-[var(--surface-app)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
                }`}
            >
              <div className="flex flex-col items-center gap-2">
                <CreditCard size={20} />
                <span className="font-bold text-sm">Avulso</span>
                <span className="text-xs opacity-75">Pagamento único</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, billing_type: 'recurring' })}
              className={`p-4 rounded-xl border transition-all ${formData.billing_type === 'recurring'
                ? 'border-barber-gold bg-[var(--brand-primary)]/10 text-[var(--text-primary)]'
                : 'border-[var(--border-default)] bg-[var(--surface-app)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
                }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Repeat size={20} />
                <span className="font-bold text-sm">Recorrente</span>
                <span className="text-xs opacity-75">Assinatura</span>
              </div>
            </button>
          </div>

          {/* Recurring Options */}
          {formData.billing_type === 'recurring' && (
            <div className="bg-[var(--surface-app)] border border-[var(--border-default)] rounded-xl p-4 space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-subtle)] uppercase mb-1">
                    Intervalo
                  </label>
                  <select
                    value={formData.recurring_interval}
                    onChange={(e) => setFormData({ ...formData, recurring_interval: e.target.value as any })}
                    className="w-full bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                  >
                    <option value="day">Dia</option>
                    <option value="week">Semana</option>
                    <option value="month">Mês</option>
                    <option value="year">Ano</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-subtle)] uppercase mb-1">
                    A cada
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.recurring_interval_count}
                    onChange={(e) => setFormData({ ...formData, recurring_interval_count: parseInt(e.target.value) })}
                    className="w-full bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                  />
                </div>
              </div>
              <div className="text-xs text-[var(--text-muted)] bg-[var(--surface-card)] rounded-lg p-2">
                Cobrança: A cada {formData.recurring_interval_count} {
                  formData.recurring_interval === 'day' ? 'dia(s)' :
                    formData.recurring_interval === 'week' ? 'semana(s)' :
                      formData.recurring_interval === 'month' ? 'mês(es)' : 'ano(s)'
                }
              </div>
            </div>
          )}
        </div>

        {/* Status Toggle */}
        <div className="flex items-center justify-between gap-3 p-4 bg-[var(--surface-app)] rounded-xl border border-[var(--border-default)]">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-bold text-[var(--text-primary)] mb-0.5">
              Status do Serviço
            </label>
            <p className="text-xs text-[var(--text-muted)]">
              {formData.is_active ? 'Visível para agendamentos' : 'Oculto do catálogo'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ServiceModal;
