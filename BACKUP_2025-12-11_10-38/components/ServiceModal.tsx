import React, { useState, useEffect } from 'react';
import { X, DollarSign, Clock, Tag, FileText, CreditCard, Repeat } from 'lucide-react';
import { createService, updateService } from '../lib/database';
import type { Service } from '../types';

interface ServiceModalProps {
    service?: Service | null;
    onClose: () => void;
    onSuccess: () => void;
    existingCategories?: string[];
}

const ServiceModal: React.FC<ServiceModalProps> = ({ service, onClose, onSuccess, existingCategories = [] }) => {
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
    const [error, setError] = useState('');

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

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
            }

            onSuccess();
            onClose();
        } catch (err) {
            setError('Erro ao salvar serviço. Tente novamente.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-barber-900 w-full max-w-lg rounded-xl border border-barber-800 shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-barber-800 flex justify-between items-center bg-barber-950 flex-shrink-0">
                    <h3 className="text-lg font-bold text-white">
                        {service ? 'Editar Serviço' : 'Novo Serviço'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                            Nome do Serviço *
                        </label>
                        <div className="relative">
                            <Tag className="absolute left-2.5 top-2.5 text-gray-500" size={14} />
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-barber-gold transition-colors"
                                placeholder="Ex: Corte, Coloração, Manicure"
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                            Categoria
                        </label>
                        <input
                            type="text"
                            list="categories"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg px-3 py-2 text-xs outline-none focus:border-barber-gold transition-colors"
                            placeholder="Ex: Cabelo, Estética, Unhas"
                        />
                        <datalist id="categories">
                            {existingCategories.map((cat, idx) => (
                                <option key={idx} value={cat} />
                            ))}
                        </datalist>
                    </div>

                    {/* Price and Duration */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                                Preço (R$) *
                            </label>
                            <div className="relative">
                                <DollarSign className="absolute left-2.5 top-2.5 text-gray-500" size={14} />
                                <input
                                    type="text"
                                    required
                                    value={formData.price === 0 ? '' : (formData.price).toFixed(2).replace('.', ',')}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        const numValue = parseInt(value || '0') / 100;
                                        setFormData({ ...formData, price: numValue });
                                    }}
                                    className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-barber-gold transition-colors"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                                Duração *
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-2.5 top-2.5 text-gray-500" size={14} />
                                <select
                                    value={[15, 30, 45, 60, 90, 120, 150, 180, 240, 300].includes(formData.duration_minutes) ? formData.duration_minutes : 'custom'}
                                    onChange={(e) => {
                                        if (e.target.value === 'custom') {
                                            setFormData({ ...formData, duration_minutes: 1 });
                                        } else {
                                            setFormData({ ...formData, duration_minutes: parseInt(e.target.value) });
                                        }
                                    }}
                                    className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-barber-gold transition-colors appearance-none cursor-pointer"
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
                        <div className="animate-fade-in">
                            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                                Duração Personalizada (minutos)
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-2.5 top-2.5 text-gray-500" size={14} />
                                <input
                                    type="number"
                                    required
                                    min="5"
                                    step="5"
                                    value={formData.duration_minutes}
                                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 30 })}
                                    className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-barber-gold transition-colors"
                                    placeholder="Digite em minutos..."
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">Ex: 75 = 1h 15min</p>
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                            Descrição
                        </label>
                        <div className="relative">
                            <FileText className="absolute left-2.5 top-2.5 text-gray-500" size={14} />
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-barber-gold transition-colors resize-none"
                                placeholder="Descrição opcional do serviço..."
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Billing Type */}
                    <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Tipo de Cobrança
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, billing_type: 'one_time' })}
                                className={`p-2.5 rounded-lg border transition-all ${formData.billing_type === 'one_time'
                                    ? 'border-barber-gold bg-barber-gold/10 text-white'
                                    : 'border-barber-800 bg-barber-950 text-gray-400 hover:border-barber-700'
                                    }`}
                            >
                                <div className="flex items-center gap-1.5 justify-center">
                                    <CreditCard size={14} />
                                    <span className="font-medium text-xs">Avulso</span>
                                </div>
                                <div className="text-[10px] opacity-75 mt-0.5">Pagamento único</div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, billing_type: 'recurring' })}
                                className={`p-2.5 rounded-lg border transition-all ${formData.billing_type === 'recurring'
                                    ? 'border-barber-gold bg-barber-gold/10 text-white'
                                    : 'border-barber-800 bg-barber-950 text-gray-400 hover:border-barber-700'
                                    }`}
                            >
                                <div className="flex items-center gap-1.5 justify-center">
                                    <Repeat size={14} />
                                    <span className="font-medium text-xs">Recorrente</span>
                                </div>
                                <div className="text-[10px] opacity-75 mt-0.5">Assinatura</div>
                            </button>
                        </div>

                        {/* Recurring Options */}
                        {formData.billing_type === 'recurring' && (
                            <div className="bg-barber-950 border border-barber-800 rounded-lg p-2.5 space-y-2 animate-fade-in">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-400 mb-1">
                                            Intervalo
                                        </label>
                                        <select
                                            value={formData.recurring_interval}
                                            onChange={(e) => setFormData({ ...formData, recurring_interval: e.target.value as any })}
                                            className="w-full bg-barber-900 border border-barber-800 text-white rounded px-2 py-1.5 text-xs outline-none focus:border-barber-gold transition-colors"
                                        >
                                            <option value="day">Dia</option>
                                            <option value="week">Semana</option>
                                            <option value="month">Mês</option>
                                            <option value="year">Ano</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-gray-400 mb-1">
                                            A cada
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="12"
                                            value={formData.recurring_interval_count}
                                            onChange={(e) => setFormData({ ...formData, recurring_interval_count: parseInt(e.target.value) })}
                                            className="w-full bg-barber-900 border border-barber-800 text-white rounded px-2 py-1.5 text-xs outline-none focus:border-barber-gold transition-colors"
                                        />
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-400 bg-barber-900 rounded p-1.5">
                                    Cobrança: A cada {formData.recurring_interval_count} {
                                        formData.recurring_interval === 'day' ? 'dia(s)' :
                                            formData.recurring_interval === 'week' ? 'semana(s)' :
                                                formData.recurring_interval === 'month' ? 'mês(es)' : 'ano(s)'
                                    }
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Status Toggle - FIXED */}
                    <div className="flex items-center justify-between gap-3 p-2.5 bg-barber-950 rounded-lg border border-barber-800 min-w-0">
                        <div className="flex-1 min-w-0 overflow-hidden">
                            <label className="block text-xs font-medium text-white mb-0.5 truncate">
                                Status do Serviço
                            </label>
                            <p className="text-[10px] text-gray-400 truncate">
                                {formData.is_active ? 'Disponível' : 'Oculto'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-600'
                                }`}
                        >
                            <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-5' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-barber-800 hover:bg-barber-700 text-white font-medium py-2 rounded-lg transition-colors text-xs"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 bg-barber-gold hover:bg-barber-goldhover text-black font-bold py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                        >
                            {isLoading ? 'Salvando...' : service ? 'Atualizar' : 'Criar Serviço'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ServiceModal;
