/**
 * Dashboard Feature Types
 */

export interface DashboardStats {
    revenue: number;
    appointmentsCount: number;
    newClients: number;
    occupancyRate: number;
    averageTicket: number;
}

export interface QuickAction {
    id: string;
    label: string;
    icon: string;
    action: () => void;
}
