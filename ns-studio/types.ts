
export enum Status {
  CONFIRMED = 'Confirmado',
  PENDING = 'Pendente',
  COMPLETED = 'Concluído',
  NOSHOW = 'Faltou',
  CANCELED = 'Cancelado',
  BLOCKED = 'Bloqueado'
}

export enum PaymentMethod {
  PIX = 'Pix',
  CREDIT_CARD = 'Cartão de Crédito',
  CASH = 'Dinheiro',
  DEBIT_CARD = 'Débito'
}

export type Role = 'SuperAdmin' | 'Admin' | 'Manager' | 'Barber';

export type BusinessType = 'barbershop' | 'beauty_salon';

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  role: Role;
  phone?: string;
  tenantId?: string; // ID da barbearia à qual pertence
}

// Estrutura para o SuperAdmin gerenciar os clientes do SaaS
export interface Tenant {
  id: string;
  name: string;
  type: BusinessType;
  ownerEmail: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
  lastBilling: string;
  revenue: number; // Quanto essa barbearia gerou (para stats)
}

export interface WorkDay {
  dayOfWeek: number; 
  startTime: string; 
  endTime: string; 
  breakStart?: string; 
  breakEnd?: string; 
  active: boolean;
}

export interface SystemSettings {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessHours: WorkDay[];
  modules: {
    products: boolean;
    finance: boolean;
    aiChatbot: boolean;
    publicBooking: boolean;
    loyaltyProgram: boolean;
  };
  aiConfig: {
    enableInsights: boolean;
    insightTypes: {
      financial: boolean;
      churn: boolean;
      operational: boolean;
    };
    notificationFrequency: 'low' | 'medium' | 'high';
    tone: 'professional' | 'friendly' | 'analytical';
  };
}

export interface Barber {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  email?: string;
  phone?: string;
  commissionRate: number;
  rating: number;
  goal?: number;
  currentSales?: number;
  workSchedule?: WorkDay[];
  useCustomBuffer?: boolean;
  bufferTime?: number;
  services?: string[];
}

export interface Resource {
  id: string;
  name: string;
  type: 'Cadeira' | 'Lavatório' | 'Sala Estética';
  status: 'active' | 'maintenance';
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  duration: number;
  category?: string;
  active: boolean;
  commissionRate?: number;
  image?: string;
  billingType?: 'one_time' | 'recurring';
}

export interface Product {
  id: string;
  name: string;
  category: 'Pomada' | 'Shampoo' | 'Óleo' | 'Equipamento' | 'Bebida' | 'Outro';
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  image?: string;
  commissionRate?: number;
}

export interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  benefits: string[];
  billingCycle: 'Mensal' | 'Anual';
}

export type LoyaltyTier = 'Bronze' | 'Prata' | 'Ouro' | 'Diamante';

export interface ClientPhoto {
  id: string;
  url: string;
  date: string;
  type: 'before' | 'after';
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  lastVisit: string;
  totalVisits: number;
  loyaltyPoints?: number;
  tags: string[];
  ltv?: number;
  preferences?: string;
  allergies?: string[];
  internalNotes?: string;
  drinkPreference?: string;
  conversationStyle?: 'Conversador' | 'Quieto' | 'Profissional';
  birthDate?: string;
  photos?: ClientPhoto[];
  loyaltyTier?: LoyaltyTier;
  activeMembership?: string;
  origin?: 'public_link' | 'manual' | 'import'; // Origem do cadastro
  createdAt?: string; // Data de cadastro
}

export interface Appointment {
  id: string;
  clientName: string;
  barberId: string;
  resourceId?: string;
  serviceId: string;
  date: string;
  time: string;
  status: Status;
  hasDeposit: boolean;
  consumption?: ConsumptionItem[];
}

export interface ConsumptionItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface FinancialRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  method?: PaymentMethod;
  barberId?: string;
}

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  dayOfMonth: number;
  active: boolean;
  category: string;
}

export interface Notification {
  id: string;
  type: 'payment' | 'appointment' | 'cancel' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
}
