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

/**
 * Sidebar Component - Premium Design System
 * Uses semantic tokens for proper light/dark theme styling
 */
const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, toggleSidebar, userRole, settings, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard, visible: true },
    { id: 'calendar', label: 'Agenda', icon: CalendarDays, visible: true },
    { id: 'services', label: 'Serviços', icon: Scissors, visible: true },
    { id: 'clients', label: 'Clientes', icon: Users, visible: true },
    { id: 'team', label: 'Equipe', icon: ScissorsLineDashed, visible: userRole !== 'Barber' },
    { id: 'finance', label: 'Financeiro', icon: WalletCards, visible: settings?.modules.finance !== false && userRole !== 'Barber' },
    { id: 'settings', label: 'Configurações', icon: Settings, visible: userRole === 'Admin' },
  ];

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 
    bg-[var(--surface-card)] 
    border-r border-[var(--border-default)] 
    transform transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0 md:static md:h-screen
  `.replace(/\s+/g, ' ').trim();

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
          {/* Logo Header */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--brand-primary)] rounded-lg flex items-center justify-center">
                <ScissorsLineDashed className="text-[var(--text-inverse)]" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                  NS <span className="text-[var(--brand-primary)]">Studio</span>
                </h1>
                <p className="text-[10px] text-[var(--text-subtle)] uppercase tracking-widest">Management</p>
              </div>
            </div>
            <button onClick={toggleSidebar} className="md:hidden text-[var(--text-muted)]">
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1">
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
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg 
                    transition-all duration-150 ease-[cubic-bezier(0.2,0.8,0.2,1)]
                    ${isActive
                      ? 'bg-[var(--bg-selected)] text-[var(--brand-primary)] font-semibold'
                      : 'text-[var(--text-muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)]'
                    }
                  `.replace(/\s+/g, ' ').trim()}
                >
                  <Icon
                    size={20}
                    className={`
                      transition-colors duration-150
                      ${isActive
                        ? 'text-[var(--brand-primary)]'
                        : 'text-[var(--text-subtle)] group-hover:text-[var(--brand-primary)]'
                      }
                    `.replace(/\s+/g, ' ').trim()}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="pt-6 border-t border-[var(--border-default)] space-y-2">
            {settings?.modules.publicBooking && (
              <button
                onClick={() => onChangeView('public_booking')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-[var(--text-muted)] bg-[var(--surface-app)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border-default)]"
              >
                <span className="text-sm">Página Pública</span>
                <ExternalLink size={16} />
              </button>
            )}
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--text-muted)] hover:text-[var(--status-error)] hover:bg-[var(--status-error-bg)] transition-colors"
            >
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