// =====================================================
// MULTI-TENANT SAAS TYPES
// =====================================================

export type BusinessType = 'barbershop' | 'salon';

export type SubscriptionStatus = 'trial' | 'active' | 'canceled' | 'past_due';

export interface Business {
  id: string;
  owner_id: string;
  business_type: BusinessType;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  logo_url?: string;

  // Stripe Configuration
  stripe_api_key?: string;
  stripe_api_key_valid: boolean;
  stripe_webhook_secret?: string;

  // Subscription
  subscription_status: SubscriptionStatus;
  trial_ends_at?: string;

  // Business Hours
  business_hours?: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };

  // Booking Settings
  booking_settings?: {
    buffer_minutes?: number;
    min_advance_hours?: number;
    max_advance_days?: number;
    allow_same_day?: boolean;
    require_payment?: boolean;
    api_token?: string;
    slot_duration_minutes?: number;
  };

  // Settings
  settings?: Record<string, any>;

  created_at: string;
  updated_at: string;
}

// =====================================================
// ENUMS
// =====================================================

export enum Status {
  CONFIRMED = 'confirmed',
  PENDING = 'pending',
  COMPLETED = 'completed',
  NOSHOW = 'no_show',
  CANCELED = 'canceled',
  BLOCKED = 'blocked'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
  FAILED = 'failed'
}

export enum PaymentMethod {
  PIX = 'pix',
  CREDIT_CARD = 'credit_card',
  CASH = 'cash',
  DEBIT_CARD = 'debit_card'
}

export type LoyaltyTier = 'Bronze' | 'Prata' | 'Ouro' | 'Diamante';

export type Role = 'Admin' | 'Manager' | 'Barber';

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  role: Role;
  phone?: string;
  tenantId?: string;
}

// =====================================================
// CORE ENTITIES (Multi-Tenant)
// =====================================================

export interface WorkDay {
  dayOfWeek: number; // 0=Sun, 1=Mon, ...
  startTime: string; // "09:00"
  endTime: string; // "19:00"
  breakStart?: string; // "12:00"
  breakEnd?: string; // "13:00"
  active: boolean;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  status: string;
}

export interface Professional {
  id: string;
  business_id: string;
  name: string;
  email?: string;
  phone?: string;
  specialty: string;
  avatar_url?: string;
  commission_rate: number; // percentage
  is_active: boolean;
  work_schedule?: WorkDay[];
  workSchedule?: WorkDay[]; // UI Compatibility
  currentSales?: number; // UI Compatibility

  // Buffer settings
  buffer_minutes?: number; // Minutes between appointments
  custom_buffer?: boolean; // Use custom buffer or global
  monthly_goal?: number; // Monthly sales goal

  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  duration_minutes: number;
  duration?: number; // UI Compatibility
  is_active: boolean;
  image_url?: string;
  commission_rate?: number;

  // Stripe Integration
  stripe_product_id?: string;
  stripe_price_id?: string;
  last_synced_at?: string;

  // Billing Type (Recurring or One-time)
  billing_type?: 'one_time' | 'recurring';
  recurring_interval?: 'day' | 'week' | 'month' | 'year';
  recurring_interval_count?: number;

  created_at: string;
  updated_at: string;
}

export interface ClientPhoto {
  id: string;
  url: string;
  date: string;
  type: 'before' | 'after';
  notes?: string;
}

export interface Client {
  id: string;
  business_id: string;
  name: string;
  email?: string;
  phone: string;
  birth_date?: string;

  // CRM Avançado
  preferences?: Record<string, any>;
  allergies?: string[];
  internal_notes?: string;
  drink_preference?: string;
  conversation_style?: string;

  // Loyalty & Stats
  loyalty_points: number;
  loyalty_tier?: LoyaltyTier;
  total_visits: number;
  lifetime_value: number;
  last_visit_date?: string;

  // Photos
  photos?: ClientPhoto[];

  // Tags
  tags: string[];

  // Origin tracking - 'manual' (balcão), 'public_link', 'whatsapp', 'api'
  source?: 'manual' | 'public_link' | 'whatsapp' | 'api';

  created_at: string;
  updated_at: string;
}

export interface ConsumptionItem {
  id: string;
  product_id: string;
  productId?: string; // UI Compatibility
  name: string;
  quantity: number;
  price: number;
}

export interface Appointment {
  id: string;
  business_id?: string;
  client_id?: string;
  professional_id?: string;
  service_id?: string;

  // UI Compatibility
  barberId?: string;
  resourceId?: string;
  serviceId?: string;
  clientId?: string;
  clientName?: string;
  date?: string;
  time?: string;
  hasDeposit?: boolean;

  // Client Info (backup)
  client_name: string;
  client_phone?: string;
  client_email?: string;

  // Appointment Details
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;

  // Status
  status: Status;

  // Payment
  payment_status: PaymentStatus;
  payment_intent_id?: string;
  amount: number;
  payment_method?: string;

  // Additional
  notes?: string;
  consumption?: ConsumptionItem[];

  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  category?: string;
  price: number;
  cost_price?: number;
  stock: number;
  min_stock: number;
  is_active: boolean;
  image_url?: string;
  commission_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialRecord {
  id: string;
  business_id: string;
  record_date: string;
  description: string;
  amount: number;
  record_type: 'income' | 'expense';
  payment_method?: string;
  category?: string;
  professional_id?: string;
  appointment_id?: string;
  created_at: string;
}

export interface MembershipPlan {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  price: number;
  billing_cycle: 'monthly' | 'annual';
  benefits?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringExpense {
  id: string;
  business_id: string;
  description: string;
  amount: number;
  day_of_month: number;
  category?: string;
  is_active: boolean;
  created_at: string;
}

// =====================================================
// UI/UX TYPES
// =====================================================

export interface Notification {
  id: string;
  type: 'payment' | 'appointment' | 'cancel' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface WaitlistItem {
  id: string;
  clientName: string;
  serviceName: string;
  phone: string;
  notes?: string;
  priority: 'High' | 'Normal' | 'Low';
  requestTime: string;
  createdAt: string;
}

// =====================================================
// STRIPE TYPES
// =====================================================

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}

export interface StripeConfig {
  api_key: string;
  webhook_secret?: string;
}

// =====================================================
// LEGACY COMPATIBILITY (Deprecated)
// =====================================================

/** @deprecated Use Professional instead */
export type Barber = Professional;

/** @deprecated Use Business.settings instead */
export interface SystemSettings {
  businessName: string;
  businessAddress: string;
  modules: {
    products: boolean;
    finance: boolean;
    aiChatbot: boolean;
    publicBooking: boolean;
    loyaltyProgram: boolean;
    whatsappAi: boolean;
  };
  aiConfig: {
    enableInsights: boolean;
    insightTypes: {
      financial: boolean;
      churn: boolean;
      operational: boolean;
    };
    notificationFrequency: 'low' | 'medium' | 'high';
  };
}
