
import React, { useState, useEffect } from 'react';
import { Menu, User, Globe } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import Clients from './components/Clients';
import Finance from './components/Finance';
import Team from './components/Team';
import Services from './components/Services';
import PublicBooking from './components/PublicBooking';
import Settings from './components/Settings';
import Auth from './components/Auth';
import UserProfileModal from './components/UserProfile';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import { ToastProvider } from './components/ui/Toast';
import { Barber, Service, Notification, Product, SystemSettings, BusinessType, Client, UserProfile } from './types';

// Mock Data Global
const initialBarbers: Barber[] = [
  { id: '1', name: 'João Barber', specialty: 'Fade Master', avatar: 'https://images.unsplash.com/photo-1580273916550-e323be2eb5fa?auto=format&fit=crop&q=80&w=200', commissionRate: 50, rating: 4.9, goal: 5000, currentSales: 4200, services: ['1', '2', '3', '4'], workSchedule: [] },
  { id: '2', name: 'Pedro Cortes', specialty: 'Barba & Navalha', avatar: 'https://images.unsplash.com/photo-1618077360395-f3068be8e001?auto=format&fit=crop&q=80&w=200', commissionRate: 45, rating: 4.7, goal: 4000, currentSales: 3800, services: ['1', '2', '3'], workSchedule: [] },
];

const initialServices: Service[] = [
  { id: '1', name: 'Corte Degradê', price: 50, duration: 45, category: 'Corte', active: true },
];

const initialProducts: Product[] = [];
const initialClients: Client[] = [];
const membershipPlans: any[] = []; // Placeholder
const initialNotifications: Notification[] = [];
const initialSettings: SystemSettings = {
  businessName: 'NS Studio',
  businessAddress: 'Av. Paulista, 1000 - SP',
  businessPhone: '(11) 99999-0000',
  businessEmail: 'contato@nsstudio.com',
  businessHours: [],
  modules: { products: true, finance: true, aiChatbot: true, publicBooking: true, loyaltyProgram: true },
  aiConfig: { enableInsights: true, insightTypes: { financial: true, churn: true, operational: true }, notificationFrequency: 'medium', tone: 'professional' }
};

const AppContent: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Theme & Business State
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark');
  const [businessType, setBusinessType] = useState<BusinessType>('barbershop');
  
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  
  // User Profile State
  const [currentUser, setCurrentUser] = useState<UserProfile>({
    name: 'NS Studio Admin',
    email: 'admin@nsstudio.com',
    role: 'Admin',
    avatar: ''
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);
  
  // Data States
  const [barbers, setBarbers] = useState<Barber[]>(initialBarbers);
  const [services, setServices] = useState<Service[]>(initialServices);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [clients, setClients] = useState<Client[]>(initialClients);

  // Payment Config State
  const [paymentConfig, setPaymentConfig] = useState({ isConnected: false, stripeKey: '' });

  // Update view when role changes to SuperAdmin
  useEffect(() => {
    if (currentUser.role === 'SuperAdmin') {
        setCurrentView('platform_dashboard');
    } else if (currentView === 'platform_dashboard') {
        setCurrentView('dashboard');
    }
  }, [currentUser.role]);

  // Apply Theme & Business Attributes to DOM
  useEffect(() => {
    // Set data attributes for CSS variables (styles.css)
    document.body.setAttribute('data-mode', themeMode);
    document.body.setAttribute('data-business', businessType);

    // Toggle 'dark' class on HTML element for Tailwind dark mode modifier support
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [themeMode, businessType]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  
  const toggleTheme = () => {
    setThemeMode(prev => prev === 'dark' ? 'light' : 'dark');
  };
  
  const handleLogin = (type: BusinessType) => {
    setBusinessType(type);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setIsProfileOpen(false);
      setCurrentView('dashboard');
  };

  const renderContent = () => {
    if (currentUser.role === 'SuperAdmin' && currentView === 'platform_dashboard') {
        return <SuperAdminDashboard />;
    }

    switch (currentView) {
      case 'dashboard': return <Dashboard settings={settings} onGoToSettings={() => setCurrentView('settings')} onGoToCalendar={() => setCurrentView('calendar')} />;
      case 'calendar': return <Calendar barbers={barbers} services={services} products={products} clients={clients} settings={settings} />;
      case 'services': return <Services services={services} products={products} setServices={setServices} setProducts={setProducts} />;
      case 'clients': return <Clients clients={clients} setClients={setClients} />;
      case 'finance': return <Finance paymentConfig={paymentConfig} onSaveConfig={setPaymentConfig} barbers={barbers} userRole={currentUser.role} />;
      case 'team': return <Team barbers={barbers} services={services} />;
      case 'settings': return <Settings settings={settings} onUpdateSettings={setSettings} />;
      case 'platform_dashboard': return <SuperAdminDashboard />;
      default: return <Dashboard settings={settings} onGoToSettings={() => setCurrentView('settings')} onGoToCalendar={() => setCurrentView('calendar')} />;
    }
  };

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  if (currentView === 'public_booking') {
    return <PublicBooking services={services} barbers={barbers} membershipPlans={membershipPlans} onBack={() => setCurrentView('dashboard')} />;
  }

  return (
    <div className="flex h-screen bg-barber-950 text-main overflow-hidden font-sans transition-colors duration-300">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        userRole={currentUser.role}
        settings={settings}
        onLogout={handleLogout}
        themeMode={themeMode}
        toggleTheme={toggleTheme}
      />

      {isProfileOpen && (
          <UserProfileModal user={currentUser} onSave={setCurrentUser} onClose={() => setIsProfileOpen(false)} onLogout={handleLogout} />
      )}

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="h-16 border-b border-barber-800 bg-barber-900/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="md:hidden text-muted hover:text-main">
              <Menu size={24} />
            </button>
            <h2 className="text-lg font-medium text-main md:hidden">NS <span className="text-barber-gold">Studio</span></h2>
            
            <div className="hidden md:flex items-center gap-2 bg-barber-950 rounded-lg p-1 border border-barber-800">
               <button
                  onClick={() => setCurrentUser({...currentUser, role: 'SuperAdmin'})}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${currentUser.role === 'SuperAdmin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-muted hover:text-main'}`}
               >
                  <Globe size={12} className="inline mr-1" /> SuperAdmin
               </button>
               <button
                  onClick={() => setCurrentUser({...currentUser, role: 'Admin'})}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${currentUser.role === 'Admin' ? 'bg-barber-800 text-main shadow' : 'text-muted hover:text-main'}`}
               >
                  Admin
               </button>
               <button
                  onClick={() => setCurrentUser({...currentUser, role: 'Barber'})}
                  className={`px-3 py-1 rounded text-xs font-bold transition-colors ${currentUser.role === 'Barber' ? 'bg-barber-800 text-main shadow' : 'text-muted hover:text-main'}`}
               >
                  Barber
               </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div 
                className="flex items-center gap-3 pl-4 border-l border-barber-800 cursor-pointer group"
                onClick={() => setIsProfileOpen(true)}
            >
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-main group-hover:text-barber-gold">
                    {currentUser.name}
                </div>
                <div className="text-xs text-barber-gold/70">
                    {currentUser.role}
                </div>
              </div>
              <div className="w-9 h-9 rounded-lg border border-barber-700 bg-barber-800 flex items-center justify-center overflow-hidden">
                 {currentUser.avatar ? <img src={currentUser.avatar} className="w-full h-full object-cover" /> : <User size={20} className="text-muted" />}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area - Conditional Padding based on View */}
        <div className={`flex-1 overflow-y-auto scroll-smooth bg-barber-950/50 ${currentView === 'calendar' ? 'p-0 overflow-hidden' : 'p-4 md:p-8'}`}>
          <div className={`${currentView === 'calendar' ? 'h-full' : 'max-w-7xl mx-auto'}`}>
             {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
