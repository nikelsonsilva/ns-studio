/**
 * Finance Feature Types
 * Tipos específicos do domínio financeiro
 */

import type { Barber, RecurringExpense, Role } from '@core/infra/types';
export type { Barber, RecurringExpense, Role };

/**
 * Resumo de um profissional para fechamento de caixa
 */
export interface ProfessionalSummary {
    id: string;
    name: string;
    appointments_count: number;
    gross_revenue: number;
    commission_rate: number;
    commission_amount: number;
    commission_paid: boolean;
    commission_paid_amount: number;
}

/**
 * Resumo do dia para fechamento de caixa
 */
export interface DaySummary {
    date: Date;
    appointments: any[];
    comandas: any[];
    professionals: ProfessionalSummary[];
    totals: {
        revenue: number;
        commissions: number;
        commissions_paid: number;
        tips: number;
        discounts: number;
        products: number;
        expenses: number;
        products_sold: number;
        stripe_fees: number;
    };
    net_profit: number;
    by_payment_method: {
        pix: number;
        credit: number;
        debit: number;
        cash: number;
    };
    is_closed: boolean;
    closing_id: string | null;
}

/**
 * Registro de fechamento de caixa
 */
export interface CashClosing {
    id: string;
    closing_date: string;
    total_revenue: number;
    total_commissions: number;
    net_profit: number;
    appointments_count: number;
    status: 'open' | 'closed';
    closed_at: string | null;
}

/**
 * Lucro por profissional
 */
export interface BarberProfit {
    id: string;
    name: string;
    appointments: number;
    gross: number;
    commissionRate: number;
    commission: number;
    costs: number;
    net: number;
    monthlyGoal?: number;
}

/**
 * Dados de pagamento por método
 */
export interface PaymentMethodData {
    name: string;
    value: number;
    color: string;
}

/**
 * Configuração NFS-e
 */
export interface NfseConfig {
    empresa_id?: string;
    cnpj?: string;
    ambiente?: 'homologacao' | 'producao';
    status?: 'pendente' | 'empresa_cadastrada' | 'configurado';
    certificado_id?: string;
    certificado_validade?: string;
}

/**
 * Formulário de empresa para NFS-e
 */
export interface NfseEmpresaForm {
    cnpj: string;
    inscricao_municipal: string;
    razao_social: string;
    nome_fantasia: string;
    email: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    codigo_ibge: string;
    ambiente: 'homologacao' | 'producao';
}

/**
 * Tabs disponíveis no Finance
 */
export type FinanceTab = 'dashboard' | 'caixa' | 'commissions' | 'expenses' | 'goals' | 'nfse';
