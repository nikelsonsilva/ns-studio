
import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  WalletCards, 
  ScissorsLineDashed, 
  LogOut,
  X,
  Scissors,
  Settings,
  Globe,
  Activity,
  Sun,
  Moon,
  ExternalLink
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
  themeMode: 'dark' | 'light';
  toggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, toggleSidebar, userRole, settings, onLogout, themeMode, toggleTheme }) => {
  const isSuper = userRole === 'SuperAdmin';

  const menuItems = [
    // SuperAdmin Exclusive Item
    { id: 'platform_dashboard', label: 'Dashboard Plataforma', icon: Globe, visible: isSuper, activeClass: 'bg-indigo-600 text-white shadow-indigo-500/30' },
    
    // Regular Admin/Shop Items
    { id: 'dashboard', label: 'Visão do Studio', icon: LayoutDashboard, visible: true, activeClass: 'bg-barber-gold text-inverted shadow-amber-500/20' },
    { id: 'calendar', label: 'Agenda', icon: CalendarDays, visible: true, activeClass: 'bg-sky-500 text-white shadow-sky-500/20' },
    { id: 'services', label: 'Serviços', icon: Scissors, visible: true, activeClass: 'bg-cyan-500 text-black shadow-cyan-500/20' },
    { id: 'clients', label: 'Clientes', icon: Users, visible: true, activeClass: 'bg-indigo-500 text-white shadow-indigo-500/20' },
    { id: 'finance', label: 'Financeiro', icon: WalletCards, visible: settings?.modules.finance !== false && userRole !== 'Barber', activeClass: 'bg-emerald-500 text-white shadow-emerald-500/20' },
    { id: 'team', label: 'Equipe', icon: ScissorsLineDashed, visible: userRole !== 'Barber', activeClass: 'bg-orange-500 text-white shadow-orange-500/20' },
    { id: 'public_booking', label: 'Link Público', icon: ExternalLink, visible: settings?.modules.publicBooking !== false, activeClass: 'bg-fuchsia-500 text-white shadow-fuchsia-500/20' },
    { id: 'settings', label: 'Configurações', icon: Settings, visible: userRole === 'Admin' || isSuper, activeClass: 'bg-zinc-700 text-white shadow-zinc-700/20' },
  ];

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-50 w-64 bg-barber-900 border-r border-barber-800 transform transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0 md:static md:h-screen
  `;

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      <aside className={sidebarClasses}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded flex items-center justify-center ${isSuper ? 'bg-indigo-600' : 'bg-barber-gold'}`}>
                 {isSuper ? <Activity className="text-white" size={24} /> : <ScissorsLineDashed className="text-inverted" size={24} />}
              </div>
              <div>
                <h1 className="text-xl font-bold text-main tracking-tight">NS <span className={isSuper ? 'text-indigo-400' : 'text-barber-gold'}>{isSuper ? 'SaaS' : 'Studio'}</span></h1>
                <p className="text-[10px] text-muted uppercase tracking-widest">{isSuper ? 'Cloud Master' : 'Management'}</p>
              </div>
            </div>
            <button onClick={toggleSidebar} className="md:hidden text-muted">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.filter(item => item.visible).map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              const activeStyle = item.activeClass || 'bg-barber-gold text-inverted';

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onChangeView(item.id);
                    if (window.innerWidth < 768) toggleSidebar();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    isActive 
                      ? `${activeStyle} font-bold shadow-lg` 
                      : 'text-muted hover:bg-barber-800 hover:text-main'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'text-current' : 'group-hover:text-barber-gold transition-colors'} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="pt-6 border-t border-barber-800 space-y-3">
            {/* Theme Toggle Button */}
            <button 
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted hover:text-main hover:bg-barber-800 transition-colors font-medium"
            >
              {themeMode === 'dark' ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-indigo-500" />}
              {themeMode === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            </button>

            <button 
                type="button"
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors font-medium"
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
