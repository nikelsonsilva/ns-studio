/**
 * Clients Feature Types
 */

import type { Client, ClientPhoto } from '@core/infra/types';
export type { Client, ClientPhoto };

export interface ClientWithHistory {
    client: Client;
    history: AppointmentHistory[];
    stats: ClientStats;
}

export interface AppointmentHistory {
    id: string;
    date: string;
    service_name: string;
    professional_name: string;
    amount: number;
    payment_status: 'paid' | 'pending' | 'refunded' | 'failed' | 'awaiting_payment';
    status: 'confirmed' | 'completed' | 'canceled' | 'no_show' | 'pending' | 'blocked';
    payment_method?: string;
}

export interface ClientStats {
    totalVisits: number;
    lifetimeValue: number;
    averageTicket: number;
    lastVisitDate: string | null;
}
