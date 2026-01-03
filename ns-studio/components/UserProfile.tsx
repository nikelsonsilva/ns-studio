
import React, { useState } from 'react';
import { User, Mail, Phone, Lock, Camera, Check, ShieldCheck, LogOut } from 'lucide-react';
import { UserProfile as UserProfileType } from '../types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';
import Badge from './ui/Badge';

interface UserProfileProps {
  user: UserProfileType;
  onSave: (updatedUser: UserProfileType) => void;
  onClose: () => void;
  onLogout: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onSave, onClose, onLogout }) => {
  const [formData, setFormData] = useState<UserProfileType>(user);
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });

  const handleSave = () => {
    setIsLoading(true);
    // Simulate API save
    setTimeout(() => {
        onSave(formData);
        setIsLoading(false);
        onClose();
    }, 1000);
  };

  const footerContent = (
    <>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button 
            variant="primary" 
            onClick={handleSave} 
            isLoading={isLoading} 
            leftIcon={<Check size={18} />}
        >
            Salvar Alterações
        </Button>
    </>
  );

  return (
    <Modal
        isOpen={true}
        onClose={onClose}
        title={<><User className="text-barber-gold" size={24} /> Meu Perfil</>}
        size="lg"
        footer={footerContent}
    >
        <div className="flex flex-col md:flex-row gap-6 min-h-[400px]">
            {/* Sidebar / Tabs */}
            <div className="w-full md:w-48 flex flex-col gap-2 shrink-0">
                <Button 
                    variant={activeTab === 'profile' ? 'secondary' : 'ghost'} 
                    onClick={() => setActiveTab('profile')}
                    className="justify-start"
                    leftIcon={<User size={16} />}
                >
                    Dados Pessoais
                </Button>
                <Button 
                    variant={activeTab === 'security' ? 'secondary' : 'ghost'} 
                    onClick={() => setActiveTab('security')}
                    className="justify-start"
                    leftIcon={<Lock size={16} />}
                >
                    Segurança
                </Button>

                <div className="mt-auto pt-4 border-t border-barber-800">
                    <Button 
                        variant="danger" 
                        onClick={onLogout}
                        className="w-full justify-start"
                        leftIcon={<LogOut size={16} />}
                    >
                        Sair da Conta
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-6">
                {activeTab === 'profile' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Avatar Section */}
                        <div className="flex items-center gap-6">
                            <div className="relative group">
                                <div className="w-24 h-24 rounded-full bg-barber-800 border-2 border-barber-700 flex items-center justify-center overflow-hidden">
                                    {formData.avatar ? (
                                        <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={40} className="text-muted" />
                                    )}
                                </div>
                                <button className="absolute bottom-0 right-0 p-2 bg-barber-gold text-black rounded-full shadow-lg hover:scale-110 transition-transform">
                                    <Camera size={16} />
                                </button>
                            </div>
                            <div>
                                <h4 className="font-bold text-main text-lg">{formData.name || 'Usuário'}</h4>
                                <Badge variant="outline" className="mt-1">{formData.role}</Badge>
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4">
                            <Input 
                                label="Nome Completo"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                icon={<User size={18} />}
                            />
                            <Input 
                                label="E-mail"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                icon={<Mail size={18} />}
                            />
                            <Input 
                                label="Telefone"
                                type="tel"
                                value={formData.phone || ''}
                                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                placeholder="(00) 00000-0000"
                                icon={<Phone size={18} />}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="space-y-6 animate-fade-in">
                        <Card className="flex items-start gap-4" noPadding>
                            <div className="p-4 flex gap-4">
                                <div className="p-3 bg-green-500/10 rounded-lg text-green-500 h-fit">
                                    <ShieldCheck size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-main text-sm">Conta Protegida</h4>
                                    <p className="text-xs text-muted mt-1">Sua senha foi alterada há 32 dias. Recomendamos o uso de senhas fortes.</p>
                                </div>
                            </div>
                        </Card>

                        <div className="space-y-4">
                            <Input 
                                label="Senha Atual"
                                type="password"
                                value={passwordData.current}
                                onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                                icon={<Lock size={18} />}
                            />
                            <Input 
                                label="Nova Senha"
                                type="password"
                                value={passwordData.new}
                                onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                                icon={<Lock size={18} />}
                            />
                            <Input 
                                label="Confirmar Nova Senha"
                                type="password"
                                value={passwordData.confirm}
                                onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                                icon={<Lock size={18} />}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    </Modal>
  );
};

export default UserProfile;
