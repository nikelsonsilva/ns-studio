import React, { useState, useEffect } from 'react';
import { Menu, Bell, CheckCircle2, AlertCircle, X, ShieldCheck, User } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Calendar from './components/Calendar';
import Agenda from './components/Agenda';
import Clients from './components/Clients';
import Finance from './components/Finance';
import Team from './components/Team';
import Services from './components/Services';
import PublicBooking from './components/PublicBooking';
import BookingSuccess from './components/BookingSuccess';
import PagamentoPage from './pages/PagamentoPage';
import ConfirmacaoPage from './pages/ConfirmacaoPage';
import PaymentLinkPage from './pages/PaymentLinkPage';
import AIChatbot from './components/AIChatbot';
import Settings from './components/Settings';
import ProfileModal from './components/ProfileModal';
import Auth from './components/Auth';
import { BusinessProvider } from './lib/businessContext';
import { ThemeProvider } from './lib/ThemeContext';
import { signOut } from './lib/auth';
import { Notification, Role, SystemSettings } from './types';
import { ToastProvider } from './components/ui/Toast';
import { supabase } from './lib/supabase';
import { getCurrentBusinessId } from './lib/database';

// Initial Settings
const initialSettings: SystemSettings = {
  businessName: 'NS Studio',
  businessAddress: 'Av. Paulista, 1000 - SP',
  modules: {
    products: true,
    finance: true,
    aiChatbot: false,
    publicBooking: true,
    loyaltyProgram: true,
    whatsappAi: false,
  },
  aiConfig: {
    enableInsights: true,
    insightTypes: {
      financial: true,
      churn: true,
      operational: true,
    },
    notificationFrequency: 'medium',
  }
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');

  // Detectar rotas públicas via URL
  const pathname = window.location.pathname;
  const isPublicPaymentPage = pathname.startsWith('/pagamento/');
  const isPublicConfirmationPage = pathname.startsWith('/confirmacao/');
  const isPublicAgendarPage = pathname.startsWith('/agendar/');

  // NEW: Parse slug-based public booking routes: /[slug]/agendamento
  const pathParts = pathname.split('/').filter(Boolean);
  const isSlugBasedBooking = pathParts.length === 2 && pathParts[1] === 'agendamento';
  const isSlugBasedBookingSuccess = pathParts.length === 3 && pathParts[1] === 'agendamento' && pathParts[2] === 'sucesso';
  const businessSlug = (isSlugBasedBooking || isSlugBasedBookingSuccess) ? pathParts[0] : null;

  // Legacy routes (keep for backwards compatibility, but will be removed)
  const isPublicBookingPage = pathname === '/agendamento';
  const isPublicBookingSuccessPage = pathname === '/agendamento/sucesso';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userRole, setUserRole] = useState<Role>('Admin');
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(undefined);

  // Focus Mode State (full-screen calendar)
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Calendar refresh key - incremented when leaving settings to force Calendar remount
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  // Settings State
  const [settings, setSettings] = useState<SystemSettings>(initialSettings);

  // Payment Config State (Persistent)
  const [paymentConfig, setPaymentConfig] = useState({
    isConnected: false,
    stripeKey: ''
  });

  // Load modules from database when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadModulesFromDatabase();
    }
  }, [isAuthenticated]);

  const loadModulesFromDatabase = async () => {
    try {
      const businessId = await getCurrentBusinessId();
      if (!businessId) return;

      const { data, error } = await supabase
        .from('businesses')
        .select('settings, business_name')
        .eq('id', businessId)
        .single();

      if (error) throw error;

      if (data?.settings?.modules) {
        setSettings(prev => ({
          ...prev,
          businessName: data.business_name || prev.businessName,
          modules: {
            ...prev.modules,
            ...data.settings.modules
          }
        }));
      } else if (data?.business_name) {
        setSettings(prev => ({
          ...prev,
          businessName: data.business_name
        }));
      }
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  };

  // Save modules to database when changed
  const handleUpdateSettings = async (newSettings: SystemSettings) => {
    setSettings(newSettings);

    try {
      const businessId = await getCurrentBusinessId();
      if (!businessId) return;

      // Get current settings to merge
      const { data: currentData } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', businessId)
        .single();

      const updatedSettings = {
        ...(currentData?.settings || {}),
        modules: newSettings.modules
      };

      await supabase
        .from('businesses')
        .update({ settings: updatedSettings })
        .eq('id', businessId);
    } catch (error) {
      console.error('Error saving modules:', error);
    }
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleLogout = async () => {
    await signOut();
    setIsAuthenticated(false);
    setCurrentView('dashboard');
  };

  // Track previous view to detect when leaving settings
  const handleViewChange = (newView: string) => {
    // If we're leaving settings, increment the calendar refresh key
    if (currentView === 'settings' && newView !== 'settings') {
      setCalendarRefreshKey(prev => prev + 1);
    }
    // If navigating to calendar from sidebar (not from Dashboard's "Ver na Agenda"), reset to today
    if (newView === 'calendar' && currentView !== 'dashboard') {
      setCalendarDate(undefined);
    }
    setCurrentView(newView);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard settings={settings} onGoToSettings={() => handleViewChange('settings')} onGoToCalendar={(date?: Date) => { setCalendarDate(date); handleViewChange('calendar'); }} />;
      case 'calendar': return <Calendar key={calendarRefreshKey} initialDate={calendarDate} isFocusMode={isFocusMode} setFocusMode={setIsFocusMode} />;
      case 'services': return <Services />;
      case 'clients': return <Clients />;
      case 'finance': return <Finance paymentConfig={paymentConfig} onSaveConfig={setPaymentConfig} userRole={userRole} />;
      case 'team': return <Team />;
      case 'settings': return <Settings settings={settings} onUpdateSettings={handleUpdateSettings} />;
      default: return <Dashboard settings={settings} />;
    }
  };

  // Rotas Públicas (sem autenticação)
  if (isPublicPaymentPage) {
    return <PagamentoPage />;
  }

  if (isPublicConfirmationPage) {
    return <ConfirmacaoPage />;
  }

  if (isPublicAgendarPage) {
    return <PaymentLinkPage />;
  }

  // Public Booking Pages (sem autenticação)
  // NEW: Slug-based routes (priority)
  if (isSlugBasedBookingSuccess && businessSlug) {
    return <BookingSuccess businessSlug={businessSlug} />;
  }

  if (isSlugBasedBooking && businessSlug) {
    return <PublicBooking businessSlug={businessSlug} onBack={() => window.location.href = '/'} />;
  }

  // Legacy routes (sem slug - para backwards compatibility)
  if (isPublicBookingSuccessPage) {
    return <BookingSuccess />;
  }

  if (isPublicBookingPage) {
    return <PublicBooking onBack={() => window.location.href = '/'} />;
  }

  // Auth Guard
  if (!isAuthenticated) {
    return <Auth onLogin={() => setIsAuthenticated(true)} />;
  }

  // Special view for Public Booking (Full Screen)
  if (currentView === 'public_booking') {
    return (
      <PublicBooking
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  // Special view for Booking Success (Full Screen)
  if (currentView === 'booking_success') {
    return <BookingSuccess />;
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <BusinessProvider>
          <div className="flex h-screen overflow-hidden font-sans bg-barber-950 text-white w-full">
            {/* Sidebar with Focus Mode transition */}
            {!isFocusMode && (
              <div className="shrink-0">
                <Sidebar
                  currentView={currentView}
                  onChangeView={handleViewChange}
                  isOpen={isSidebarOpen}
                  toggleSidebar={toggleSidebar}
                  userRole={userRole}
                  settings={settings}
                  onLogout={handleLogout}
                />
              </div>
            )}

            <main className={`flex-1 flex flex-col h-full relative overflow-hidden ${isFocusMode ? 'w-full max-w-none' : ''}`}>
              {/* Top Header Mobile/Desktop - Hidden in Focus Mode */}
              {!isFocusMode && (
                <header className="border-b border-barber-800 bg-barber-950/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 h-16 shrink-0 z-30">
                  <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="md:hidden text-gray-400 hover:text-white">
                      <Menu size={24} />
                    </button>
                    <h2 className="text-lg font-medium text-gray-300 md:hidden">NS <span className="text-amber-500">Studio</span></h2>

                    {/* Role Switcher (Simulator) - Hidden on Mobile */}
                    <div className="hidden md:flex items-center gap-2 bg-black/30 rounded-lg p-1 border border-barber-800">
                      {(['Admin', 'Manager', 'Barber'] as Role[]).map(role => (
                        <button
                          key={role}
                          onClick={() => setUserRole(role)}
                          className={`px-3 py-1 rounded text-xs font-bold transition-colors ${userRole === role
                            ? 'bg-barber-900 text-gray-900 shadow'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Notification Bell */}
                    <div className="relative">
                      <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`relative p-2 transition-colors ${showNotifications
                          ? 'text-white bg-barber-800 rounded-lg'
                          : 'text-gray-400 hover:text-white '}`}
                      >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-barber-950 animate-pulse"></span>
                        )}
                      </button>

                      {/* Notification Dropdown */}
                      {showNotifications && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                          <div className="absolute right-0 top-12 w-80 bg-barber-900 border border-barber-800 rounded-xl shadow-2xl z-50 animate-fade-in overflow-hidden">
                            <div className="p-3 border-b border-barber-800 flex justify-between items-center bg-barber-950">
                              <h3 className="font-bold text-white text-sm">Notificações</h3>
                              {unreadCount > 0 && (
                                <button onClick={markAllAsRead} className="text-[10px] text-barber-gold hover:underline">Marcar lidas</button>
                              )}
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                              {notifications.map(notification => (
                                <div key={notification.id} className={`p-4 border-b border-barber-800 last:border-0 hover:bg-barber-800/30 transition-colors flex gap-3 ${!notification.read ? 'bg-barber-800/10' : ''}`}>
                                  <div className={`mt-1 p-1.5 rounded-full shrink-0 h-fit ${notification.type === 'payment' ? 'bg-green-500/20 text-green-500' :
                                    notification.type === 'cancel' ? 'bg-red-500/20 text-red-500' :
                                      'bg-blue-500/20 text-blue-500'
                                    }`}>
                                    {notification.type === 'payment' ? <CheckCircle2 size={14} /> :
                                      notification.type === 'cancel' ? <X size={14} /> : <Bell size={14} />}
                                  </div>
                                  <div>
                                    <div className="flex justify-between items-start">
                                      <h4 className={`text-sm font-bold ${!notification.read ? 'text-white' : 'text-[var(--text-gray-400)]'}`}>{notification.title}</h4>
                                      <span className="text-xs text-gray-600">{notification.time}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="flex items-center gap-3 pl-4 border-l border-barber-800 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <div className="text-right hidden sm:block">
                        <div className="text-sm font-bold text-white">
                          {settings.businessName}
                        </div>
                        <div className="text-xs text-barber-gold">
                          {userRole === 'Admin' ? 'Administrador' : userRole === 'Manager' ? 'Gerente' : 'Barbeiro'}
                        </div>
                      </div>
                      <div className="w-9 h-9 rounded-lg border border-barber-700 bg-barber-800 flex items-center justify-center">
                        <User size={20} className="text-gray-400" />
                      </div>
                    </button>
                  </div>
                </header>
              )}

              {/* Scrollable Content Area - Calendar manages its own scroll */}
              <div className={`flex-1 scroll-smooth bg-transparent ${currentView === 'calendar' ? 'overflow-hidden p-0 w-full' : 'overflow-y-auto p-4 md:p-8'}`}>
                <div className={currentView === 'calendar' ? 'h-full w-full' : 'max-w-7xl mx-auto'}>
                  {renderContent()}
                </div>
              </div>

              {/* Profile Modal */}
              <ProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                onLogout={handleLogout}
                userRole={userRole}
                businessName={settings.businessName}
              />

              {/* Floating Chatbot (Conditioned by Settings) */}
              {currentView !== 'public_booking' && settings.modules.aiChatbot && (
                <AIChatbot />
              )}

            </main>
          </div>
        </BusinessProvider>
      </ToastProvider>
    </ThemeProvider >
  );
};

export default App;