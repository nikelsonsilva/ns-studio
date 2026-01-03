import React, { useState, useEffect } from 'react';
import { Search, Plus, User, Phone, Mail, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { validatePhone, validateEmailComplete } from '../lib/validation';
import type { Client } from '../types';

interface ClientSelectorProps {
    businessId: string;
    selectedClient: Client | null;
    onSelectClient: (client: Client) => void;
}

const ClientSelector: React.FC<ClientSelectorProps> = ({ businessId, selectedClient, onSelectClient }) => {
    const [clients, setClients] = useState<Client[]>([]);
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewClientForm, setShowNewClientForm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Novo cliente
    const [newClient, setNewClient] = useState({
        name: '',
        phone: '',
        email: ''
    });

    useEffect(() => {
        loadClients();
    }, [businessId]);

    useEffect(() => {
        filterClients();
    }, [searchTerm, clients]);

    const loadClients = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('business_id', businessId)
            .order('name');

        if (data) {
            setClients(data);
        }
        setIsLoading(false);
    };

    const filterClients = () => {
        if (!searchTerm) {
            setFilteredClients(clients);
            return;
        }

        const term = searchTerm.toLowerCase();
        const filtered = clients.filter(client =>
            client.name.toLowerCase().includes(term) ||
            client.phone?.toLowerCase().includes(term) ||
            client.email?.toLowerCase().includes(term)
        );
        setFilteredClients(filtered);
    };

    const handleCreateClient = async () => {
        if (!newClient.name || !newClient.phone) {
            alert('Nome e telefone são obrigatórios');
            return;
        }

        // Validar telefone
        const phoneValidation = await validatePhone(newClient.phone);
        if (!phoneValidation.valid) {
            alert(phoneValidation.error || 'Telefone inválido');
            return;
        }

        // Validar email se preenchido
        if (newClient.email) {
            const emailValidation = await validateEmailComplete(newClient.email);
            if (!emailValidation.valid) {
                alert(emailValidation.error || 'Email inválido');
                return;
            }
        }

        setIsLoading(true);

        const { data, error } = await supabase
            .from('clients')
            .insert({
                business_id: businessId,
                name: newClient.name,
                phone: phoneValidation.national || newClient.phone,
                email: newClient.email || null
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating client:', error);
            alert('Erro ao criar cliente');
            setIsLoading(false);
            return;
        }

        if (data) {
            setClients([...clients, data]);
            onSelectClient(data);
            setShowNewClientForm(false);
            setNewClient({ name: '', phone: '', email: '' });
        }

        setIsLoading(false);
    };

    return (
        <div className="space-y-4">
            {/* Busca */}
            <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-500" size={18} />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar cliente por nome, telefone ou email..."
                    className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg pl-10 pr-4 py-2.5 outline-none focus:border-barber-gold transition-colors"
                />
            </div>

            {/* Lista de clientes */}
            {!showNewClientForm && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {isLoading ? (
                        <p className="text-gray-500 text-center py-4">Carregando...</p>
                    ) : filteredClients.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Nenhum cliente encontrado</p>
                    ) : (
                        filteredClients.map(client => (
                            <button
                                key={client.id}
                                type="button"
                                onClick={() => onSelectClient(client)}
                                className={`w-full text-left p-3 rounded-lg border transition-all ${selectedClient?.id === client.id
                                        ? 'bg-barber-gold/10 border-barber-gold'
                                        : 'bg-barber-950 border-barber-800 hover:border-barber-gold/50'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <User size={16} className="text-gray-500" />
                                            <span className="text-white font-medium">{client.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                                            {client.phone && (
                                                <div className="flex items-center gap-1">
                                                    <Phone size={14} />
                                                    <span>{client.phone}</span>
                                                </div>
                                            )}
                                            {client.email && (
                                                <div className="flex items-center gap-1">
                                                    <Mail size={14} />
                                                    <span>{client.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {selectedClient?.id === client.id && (
                                        <CheckCircle size={20} className="text-barber-gold" />
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}

            {/* Formulário de novo cliente */}
            {showNewClientForm && (
                <div className="bg-barber-950 border border-barber-800 rounded-lg p-4 space-y-3">
                    <h4 className="text-white font-medium flex items-center gap-2">
                        <Plus size={18} />
                        Novo Cliente
                    </h4>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Nome *</label>
                        <input
                            type="text"
                            value={newClient.name}
                            onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                            className="w-full bg-barber-900 border border-barber-700 text-white rounded px-3 py-2 outline-none focus:border-barber-gold"
                            placeholder="Nome completo"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Telefone *</label>
                        <input
                            type="tel"
                            value={newClient.phone}
                            onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                            className="w-full bg-barber-900 border border-barber-700 text-white rounded px-3 py-2 outline-none focus:border-barber-gold"
                            placeholder="(11) 99999-9999"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Email</label>
                        <input
                            type="email"
                            value={newClient.email}
                            onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                            className="w-full bg-barber-900 border border-barber-700 text-white rounded px-3 py-2 outline-none focus:border-barber-gold"
                            placeholder="cliente@email.com"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setShowNewClientForm(false);
                                setNewClient({ name: '', phone: '', email: '' });
                            }}
                            className="flex-1 bg-barber-800 hover:bg-barber-700 text-white py-2 rounded transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleCreateClient}
                            disabled={isLoading}
                            className="flex-1 bg-barber-gold hover:bg-barber-goldhover text-black font-medium py-2 rounded transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Criando...' : 'Criar Cliente'}
                        </button>
                    </div>
                </div>
            )}

            {/* Botão adicionar novo cliente */}
            {!showNewClientForm && (
                <button
                    type="button"
                    onClick={() => setShowNewClientForm(true)}
                    className="w-full bg-barber-800 hover:bg-barber-700 text-white py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={18} />
                    Cadastrar Novo Cliente
                </button>
            )}
        </div>
    );
};

export default ClientSelector;
