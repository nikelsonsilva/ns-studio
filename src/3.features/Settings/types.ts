/**
 * Settings Feature Types
 */

export interface BusinessHours {
    monday: DayHours;
    tuesday: DayHours;
    wednesday: DayHours;
    thursday: DayHours;
    friday: DayHours;
    saturday: DayHours;
    sunday: DayHours;
}

export interface DayHours {
    open: string;
    close: string;
    closed: boolean;
}

export type SettingsTab =
    | 'geral'
    | 'horarios'
    | 'modulos'
    | 'agendamento'
    | 'whatsapp'
    | 'integracao';

export interface WhatsAppStatus {
    connected: boolean;
    instanceName?: string;
    phone?: string;
    qrCode?: string;
}
