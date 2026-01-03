import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Tag, FileText } from 'lucide-react';
import { createClient, updateClient } from '../lib/database';
import type { Client } from '../types';

interface ClientModalProps {
    client?: Client | null;
    onClose: () => void;
    onSuccess: () => void;
}

const ClientModal: React.FC<ClientModalProps> = ({ client, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        preferences: '',
        tags: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (client) {
            setFormData({
                name: client.name,
                email: client.email || '',
                phone: client.phone || '',
                preferences: client.preferences || '',
                tags: client.tags?.join(', ') || '',
            });
        }
    }, [client]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const tagsArray = formData.tags
                .split(',')
                .map(t => t.trim())
                .filter(Boolean);

            const clientData = {
                name: formData.name,
                email: formData.email || null,
                phone: formData.phone || null,
                preferences: formData.preferences || null,
                tags: tagsArray.length > 0 ? tagsArray : null,
            };

            if (client) {
                // Update existing client
                await updateClient(client.id, clientData);
            } else {
                // Create new client
                await createClient(clientData);
            }
            onSuccess();
            onClose();
        } catch (err) {
            setError('Erro ao salvar cliente. Tente novamente.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-barber-900 w-full max-w-lg rounded-xl border border-barber-800 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-barber-800 flex justify-between items-center bg-barber-950">
                    <h3 className="text-xl font-bold text-white">
                        {client ? 'Editar Cliente' : 'Novo Cliente'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Nome Completo *
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-gray-500" size={18} />
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-barber-gold transition-colors"
                                placeholder="Ex: Maria Silva"
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Telefone
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-gray-500" size={18} />
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-barber-gold transition-colors"
                                placeholder="(11) 99999-9999"
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            E-mail
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-500" size={18} />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-barber-gold transition-colors"
                                placeholder="maria@exemplo.com"
                            />
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Tags (separadas por vírgula)
                        </label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-3 text-gray-500" size={18} />
                            <input
                                type="text"
                                value={formData.tags}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-barber-gold transition-colors"
                                placeholder="Ex: VIP, Aniversariante, Fidelidade"
                            />
                        </div>
                    </div>

                    {/* Preferences */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Preferências / Notas
                        </label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 text-gray-500" size={18} />
                            <textarea
                                value={formData.preferences}
                                onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
                                className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-barber-gold transition-colors resize-none"
                                placeholder="Anotações sobre preferências do cliente..."
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-barber-800 hover:bg-barber-700 text-white font-medium py-2.5 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 bg-barber-gold hover:bg-barber-goldhover text-black font-bold py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Salvando...' : client ? 'Atualizar' : 'Criar Cliente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientModal;
