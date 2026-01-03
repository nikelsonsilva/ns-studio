import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  WalletCards,
  ScissorsLineDashed,
  LogOut,
  Menu,
  X,
  Scissors,
  ExternalLink,
  Settings,
  Package
} from 'lucide-react';
import { SystemSettings, Role } from '../types';

interface SidebarProps {
  currentView: string;
  onChangeView: (view: string) => void;
  isOpen: boolean;
  toggleSidebar: () => void;
  userRole?: Role;
  settings?: SystemSettings;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, toggleSidebar, userRole, settings, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard, visible: true },
    { id: 'calendar', label: 'Agenda', icon: CalendarDays, visible: true },
    { id: 'services', label: 'Serviços', icon: Scissors, visible: true },
    { id: 'clients', label: 'Clientes', icon: Users, visible: true },
    { id: 'finance', label: 'Financeiro', icon: WalletCards, visible: settings?.modules.finance !== false && userRole !== 'Barber' },
    { id: 'team', label: 'Equipe', icon: ScissorsLineDashed, visible: userRole !== 'Barber' },
    { id: 'settings', label: 'Configurações', icon: Settings, visible: userRole === 'Admin' },
  ];

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-barber-950 border-r border-barber-800 transform transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0 md:static md:h-screen
  `;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Content */}
      <aside className={sidebarClasses}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-barber-gold rounded flex items-center justify-center">
                <ScissorsLineDashed className="text-black" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">NS <span className="text-barber-gold">Studio</span></h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Management</p>
              </div>
            </div>
            <button onClick={toggleSidebar} className="md:hidden text-gray-400">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.filter(item => item.visible).map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onChangeView(item.id);
                    if (window.innerWidth < 768) toggleSidebar();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                    ? 'bg-barber-gold text-black font-bold shadow-lg shadow-amber-500/20'
                    : 'text-gray-400 hover:bg-barber-900 hover:text-white'
                    }`}
                >
                  <Icon size={20} className={isActive ? 'text-black' : 'group-hover:text-barber-gold transition-colors'} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-barber-800 space-y-3">
            {settings?.modules.publicBooking && (
              <button
                onClick={() => onChangeView('public_booking')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-gray-400 bg-barber-900/50 hover:bg-barber-900 hover:text-white transition-colors border border-barber-800"
              >
                <span className="text-sm">Página Pública</span>
                <ExternalLink size={16} />
              </button>
            )}
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut size={20} />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;