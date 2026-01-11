/**
 * Team Feature Types
 */

import type { Professional, WorkDay } from '@core/infra/types';
export type { Professional, WorkDay };

export interface ProfessionalStats {
    revenue: number;
    appointments: number;
    avgTicket: number;
}

export interface ProfessionalWithStats extends Professional {
    stats?: ProfessionalStats;
}

export type ModalTab = 'dados' | 'horarios' | 'servicos' | 'financeiro';
