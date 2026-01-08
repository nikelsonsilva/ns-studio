/**
 * ClientModal - NS Studio Design System
 * Modal para criação e edição de clientes
 */
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Tag, FileText } from 'lucide-react';
import { createClient, updateClient } from '../lib/database';
import type { Client } from '../types';

// UI Components (Design System)
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import Textarea from './ui/Textarea';
import { useToast } from './ui/Toast';

interface ClientModalProps {
    client?: Client | null;
    onClose: () => void;
    onSuccess: () => void;
}

const ClientModal: React.FC<ClientModalProps> = ({ client, onClose, onSuccess }) => {
    const toast = useToast();
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

        if (!formData.name.trim()) {
            toast.warning('Nome é obrigatório');
            return;
        }

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
                source: 'manual' as const, // Balcão/Manual
            };

            if (client) {
                await updateClient(client.id, clientData);
                toast.success('Cliente atualizado com sucesso!');
            } else {
                await createClient(clientData);
                toast.success('Cliente criado com sucesso!');
            }
            onSuccess();
            onClose();
        } catch (err) {
            toast.error('Erro ao salvar cliente. Tente novamente.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            title={client ? 'Editar Cliente' : 'Novo Cliente'}
            subtitle={client ? 'Atualizar informações' : 'Cadastro de cliente'}
            icon={<User size={20} />}
            size="md"
            footer={
                <>
                    <Button
                        variant="secondary"
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        isLoading={isLoading}
                        leftIcon={client ? undefined : <User size={16} />}
                    >
                        {client ? 'Salvar Alterações' : 'Criar Cliente'}
                    </Button>
                </>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Name */}
                <Input
                    label="Nome Completo *"
                    icon={<User size={18} />}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Maria Silva"
                    required
                />

                {/* Phone */}
                <Input
                    label="Telefone"
                    icon={<Phone size={18} />}
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                />

                {/* Email */}
                <Input
                    label="E-mail"
                    icon={<Mail size={18} />}
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="maria@exemplo.com"
                />

                {/* Tags */}
                <Input
                    label="Tags (separadas por vírgula)"
                    icon={<Tag size={18} />}
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Ex: VIP, Aniversariante, Fidelidade"
                />

                {/* Preferences */}
                <Textarea
                    label="Preferências / Notas"
                    value={formData.preferences}
                    onChange={(e) => setFormData({ ...formData, preferences: e.target.value })}
                    placeholder="Anotações sobre preferências do cliente..."
                    rows={3}
                />
            </form>
        </Modal>
    );
};

export default ClientModal;
