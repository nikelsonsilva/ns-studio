/**
 * CashClosingTab.tsx - Aba de Fechamento de Caixa
 * Exibe resumo do dia, profissionais com comissões, e permite fechar caixa
 */

import React, { useState, useEffect } from 'react';
import {
    Calendar, DollarSign, Users, Receipt, TrendingUp,
    Clock, Check, AlertCircle, CreditCard, Wallet,
    QrCode, Banknote, Loader2, Lock, ChevronDown,
    X, CheckCircle, ChevronRight, Scissors, CalendarDays,
    CalendarRange, CalendarCheck, Printer, FileText, Building2,
    Phone, MapPin, Mail, Hash, Filter, Download, FileSpreadsheet
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCashClosing, ProfessionalSummary } from '../../lib/useCashClosing';
import { supabase } from '../../lib/supabase';

interface Props {
    businessId: string;
}

// Format currency
const formatCurrency = (value: number) =>
    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function CashClosingTab({ businessId }: Props) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showPayModal, setShowPayModal] = useState(false);
    const [showProfessionalModal, setShowProfessionalModal] = useState(false);
    const [showClosingModal, setShowClosingModal] = useState(false);
    const [selectedProfessional, setSelectedProfessional] = useState<ProfessionalSummary | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('pix');
    const [isPayingCommission, setIsPayingCommission] = useState(false);
    const [isClosingCash, setIsClosingCash] = useState(false);
    const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'custom'>('today');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [businessInfo, setBusinessInfo] = useState<any>(null);
    const [commissionFilter, setCommissionFilter] = useState<'all' | 'paid' | 'pending'>('all');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showReportMenu, setShowReportMenu] = useState(false);
    const [selectedProfessionalIds, setSelectedProfessionalIds] = useState<string[]>([]);
    const [showBatchPayModal, setShowBatchPayModal] = useState(false);

    const {
        loading,
        error,
        daySummary,
        loadDaySummary,
        closeCashRegister,
        payCommission
    } = useCashClosing(businessId);

    // Load data on date change
    useEffect(() => {
        if (businessId) {
            loadDaySummary(selectedDate);
            // Load business info for receipts
            supabase.from('businesses').select('*').eq('id', businessId).single()
                .then(({ data }) => setBusinessInfo(data));
        }
    }, [selectedDate, businessId, loadDaySummary]);

    // Handle period filter change
    const handlePeriodChange = (period: 'today' | 'week' | 'month' | 'custom') => {
        setPeriodFilter(period);
        if (period === 'today') setSelectedDate(new Date());
    };

    // Handle pay commission
    const handlePayCommission = async () => {
        if (!selectedProfessional) return;

        setIsPayingCommission(true);
        const amount = parseFloat(paymentAmount) || selectedProfessional.commission_amount;

        const success = await payCommission(
            selectedProfessional.id,
            selectedProfessional.commission_amount,
            amount,
            paymentMethod,
            selectedDate
        );

        if (success) {
            setShowPayModal(false);
            setSelectedProfessional(null);
            setPaymentAmount('');
        }
        setIsPayingCommission(false);
    };

    // Handle close cash register - show confirmation modal first
    const handleCloseCashRegister = () => {
        setShowClosingModal(true);
    };

    // Confirm and execute cash closing
    const confirmCloseCashRegister = async () => {
        setIsClosingCash(true);
        const success = await closeCashRegister(selectedDate);
        if (success) {
            setShowClosingModal(false);
        }
        setIsClosingCash(false);
    };

    const openPayModal = (professional: ProfessionalSummary, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedProfessional(professional);
        setPaymentAmount(professional.commission_amount.toFixed(2));
        setShowPayModal(true);
    };

    const openProfessionalModal = (professional: ProfessionalSummary) => {
        setSelectedProfessional(professional);
        setShowProfessionalModal(true);
    };

    // Get appointments for selected professional
    const getProfessionalAppointments = () => {
        if (!selectedProfessional || !daySummary) return [];
        return daySummary.appointments.filter((apt: any) => apt.professional_id === selectedProfessional.id);
    };

    // Filter professionals by commission status
    const getFilteredProfessionals = () => {
        if (!daySummary) return [];
        switch (commissionFilter) {
            case 'paid':
                return daySummary.professionals.filter(p => p.commission_paid);
            case 'pending':
                return daySummary.professionals.filter(p => !p.commission_paid);
            default:
                return daySummary.professionals;
        }
    };

    // Get unpaid professionals for selection
    const getUnpaidProfessionals = () => {
        if (!daySummary) return [];
        return daySummary.professionals.filter(p => !p.commission_paid);
    };

    // Toggle professional selection
    const toggleProfessionalSelection = (id: string) => {
        setSelectedProfessionalIds(prev =>
            prev.includes(id)
                ? prev.filter(i => i !== id)
                : [...prev, id]
        );
    };

    // Select all unpaid professionals
    const selectAllUnpaid = () => {
        const unpaidIds = getUnpaidProfessionals().map(p => p.id);
        if (selectedProfessionalIds.length === unpaidIds.length) {
            setSelectedProfessionalIds([]);
        } else {
            setSelectedProfessionalIds(unpaidIds);
        }
    };

    // Get total for selected professionals
    const getSelectedTotal = () => {
        if (!daySummary) return 0;
        return daySummary.professionals
            .filter(p => selectedProfessionalIds.includes(p.id))
            .reduce((sum, p) => sum + p.commission_amount, 0);
    };

    // Handle batch payment
    const handleBatchPayment = async () => {
        if (selectedProfessionalIds.length === 0 || !daySummary) return;

        setIsPayingCommission(true);
        let successCount = 0;

        for (const profId of selectedProfessionalIds) {
            const prof = daySummary.professionals.find(p => p.id === profId);
            if (prof && !prof.commission_paid) {
                const success = await payCommission(
                    prof.id,
                    prof.commission_amount,
                    prof.commission_amount,
                    paymentMethod,
                    selectedDate
                );
                if (success) successCount++;
            }
        }

        if (successCount > 0) {
            setSelectedProfessionalIds([]);
            setShowBatchPayModal(false);
        }
        setIsPayingCommission(false);
    };

    // Export to CSV
    const exportToCSV = () => {
        if (!daySummary || !businessInfo) return;

        const headers = ['Profissional', 'Atendimentos', 'Faturamento', 'Taxa (%)', 'Comissão', 'Status', 'Método Pagamento'];
        const rows = daySummary.professionals.map(p => [
            p.name,
            p.appointments_count,
            p.gross_revenue.toFixed(2),
            p.commission_rate,
            p.commission_amount.toFixed(2),
            p.commission_paid ? 'Pago' : 'Pendente',
            p.commission_paid ? p.payment_method || 'N/A' : '-'
        ]);

        const csvContent = [
            `Relatório de Comissões - ${businessInfo.name}`,
            `Data: ${format(selectedDate, 'dd/MM/yyyy')}`,
            '',
            headers.join(';'),
            ...rows.map(r => r.join(';')),
            '',
            `Total Faturado: ${formatCurrency(daySummary.totals.revenue)}`,
            `Total Comissões: ${formatCurrency(daySummary.totals.commissions)}`,
            `Comissões Pagas: ${formatCurrency(daySummary.totals.commissions_paid)}`,
            `Comissões Pendentes: ${formatCurrency(daySummary.totals.commissions - daySummary.totals.commissions_paid)}`
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comissoes_${format(selectedDate, 'yyyy-MM-dd')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        setShowReportMenu(false);
    };

    // Export to PDF (print-friendly version)
    const exportToPDF = () => {
        if (!daySummary || !businessInfo) return;

        const profRows = daySummary.professionals.map(p => `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #333;">${p.name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #333; text-align: center;">${p.appointments_count}</td>
                <td style="padding: 8px; border-bottom: 1px solid #333; text-align: right;">${formatCurrency(p.gross_revenue)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #333; text-align: center;">${p.commission_rate}%</td>
                <td style="padding: 8px; border-bottom: 1px solid #333; text-align: right;">${formatCurrency(p.commission_amount)}</td>
                <td style="padding: 8px; border-bottom: 1px solid #333; text-align: center; color: ${p.commission_paid ? '#10b981' : '#ef4444'};">${p.commission_paid ? '✓ Pago' : '○ Pendente'}</td>
            </tr>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Relatório de Comissões - ${format(selectedDate, 'dd/MM/yyyy')}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 40px; background: white; color: #333; }
                    h1 { color: #111; margin-bottom: 5px; }
                    h2 { color: #666; font-weight: normal; font-size: 14px; margin-top: 0; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th { background: #f5f5f5; padding: 10px; text-align: left; border-bottom: 2px solid #333; }
                    .summary { display: flex; gap: 20px; margin-top: 30px; }
                    .summary-card { background: #f9f9f9; padding: 15px; border-radius: 8px; flex: 1; text-align: center; }
                    .summary-value { font-size: 24px; font-weight: bold; }
                    .summary-label { font-size: 12px; color: #666; margin-top: 5px; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <h1>${businessInfo.name}</h1>
                <h2>${businessInfo.cnpj ? `CNPJ: ${businessInfo.cnpj} • ` : ''}${businessInfo.address || ''}</h2>
                
                <h3 style="margin-top: 30px;">Relatório de Comissões - ${format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</h3>
                
                <table>
                    <thead>
                        <tr>
                            <th>Profissional</th>
                            <th style="text-align: center;">Atend.</th>
                            <th style="text-align: right;">Faturado</th>
                            <th style="text-align: center;">Taxa</th>
                            <th style="text-align: right;">Comissão</th>
                            <th style="text-align: center;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${profRows}
                    </tbody>
                </table>
                
                <div class="summary">
                    <div class="summary-card">
                        <div class="summary-value" style="color: #10b981;">${formatCurrency(daySummary.totals.revenue)}</div>
                        <div class="summary-label">Total Faturado</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value" style="color: #f59e0b;">${formatCurrency(daySummary.totals.commissions)}</div>
                        <div class="summary-label">Total Comissões</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value" style="color: #10b981;">${formatCurrency(daySummary.totals.commissions_paid)}</div>
                        <div class="summary-label">Pagas</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value" style="color: #ef4444;">${formatCurrency(daySummary.totals.commissions - daySummary.totals.commissions_paid)}</div>
                        <div class="summary-label">Pendentes</div>
                    </div>
                </div>
                
                <p style="margin-top: 40px; font-size: 11px; color: #999;">Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.print();
        }
        setShowReportMenu(false);
    };

    // Generate receipt with full business info
    const handlePrintReceipt = (professional: ProfessionalSummary) => {
        const businessName = businessInfo?.name || 'Estabelecimento';
        const businessCnpj = businessInfo?.cnpj || '';
        const businessPhone = businessInfo?.phone || '';
        const businessAddress = businessInfo?.address || '';
        const businessCity = businessInfo?.city || '';
        const businessState = businessInfo?.state || '';

        const receipt = `
================================================================================
                           RECIBO DE PAGAMENTO
================================================================================

${businessName.toUpperCase()}
${businessCnpj ? `CNPJ: ${businessCnpj}` : ''}
${businessAddress}${businessCity ? ` - ${businessCity}` : ''}${businessState ? `/${businessState}` : ''}
${businessPhone ? `Tel: ${businessPhone}` : ''}

--------------------------------------------------------------------------------
                         PAGAMENTO DE COMISSÃO
--------------------------------------------------------------------------------

Profissional: ${professional.name}
Data do Período: ${format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
Data Emissão: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}

--------------------------------------------------------------------------------
                             RESUMO
--------------------------------------------------------------------------------

Total de Atendimentos: ${professional.appointments_count}
Faturamento Bruto: ${formatCurrency(professional.gross_revenue)}
Taxa de Comissão: ${professional.commission_rate}%

--------------------------------------------------------------------------------
                           VALOR PAGO
--------------------------------------------------------------------------------

          ${formatCurrency(professional.commission_paid_amount || professional.commission_amount)}

--------------------------------------------------------------------------------

Status: ${professional.commission_paid ? '✓ PAGO' : '○ PENDENTE'}

================================================================================
                         ASSINATURA DO PROFISSIONAL


________________________________________
${professional.name}

================================================================================
        `.trim();

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Recibo - ${professional.name}</title>
                    <style>
                        body { font-family: 'Courier New', monospace; padding: 20px; background: white; }
                        pre { white-space: pre-wrap; font-size: 12px; line-height: 1.4; }
                        @media print { body { padding: 0; } }
                    </style>
                </head>
                <body>
                    <pre>${receipt}</pre>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    // Generate closing report
    const handlePrintClosingReport = () => {
        if (!daySummary) return;

        const businessName = businessInfo?.name || 'Estabelecimento';
        const businessCnpj = businessInfo?.cnpj || '';

        const professionalsReport = daySummary.professionals.map(p =>
            `${p.name.padEnd(20)} ${String(p.appointments_count).padStart(3)} atend.   ${formatCurrency(p.gross_revenue).padStart(12)}   ${formatCurrency(p.commission_amount).padStart(12)}   ${p.commission_paid ? 'PAGO' : 'PEND'}`
        ).join('\n');

        const report = `
================================================================================
                    RELATÓRIO DE FECHAMENTO DE CAIXA
================================================================================

${businessName.toUpperCase()}
${businessCnpj ? `CNPJ: ${businessCnpj}` : ''}

Data: ${format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
Emitido em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}

================================================================================
                           RESUMO FINANCEIRO
================================================================================

FATURAMENTO BRUTO:           ${formatCurrency(daySummary.totals.revenue).padStart(15)}
(-) Descontos:               ${formatCurrency(daySummary.totals.discounts).padStart(15)}
(+) Gorjetas:                ${formatCurrency(daySummary.totals.tips).padStart(15)}
                             ─────────────────
TOTAL RECEBIDO:              ${formatCurrency(daySummary.totals.revenue + daySummary.totals.tips - daySummary.totals.discounts).padStart(15)}

================================================================================
                        FORMAS DE PAGAMENTO
================================================================================

PIX:                         ${formatCurrency(daySummary.totals.by_payment_method.pix).padStart(15)}
Cartão de Crédito:           ${formatCurrency(daySummary.totals.by_payment_method.credit).padStart(15)}
Cartão de Débito:            ${formatCurrency(daySummary.totals.by_payment_method.debit).padStart(15)}
Dinheiro:                    ${formatCurrency(daySummary.totals.by_payment_method.cash).padStart(15)}
                             ─────────────────
TOTAL:                       ${formatCurrency(daySummary.totals.revenue).padStart(15)}

================================================================================
                      COMISSÕES POR PROFISSIONAL
================================================================================

Profissional           Atend.    Faturado      Comissão   Status
--------------------------------------------------------------------------------
${professionalsReport}
--------------------------------------------------------------------------------
TOTAL COMISSÕES:             ${formatCurrency(daySummary.totals.commissions).padStart(15)}
COMISSÕES PAGAS:             ${formatCurrency(daySummary.totals.commissions_paid).padStart(15)}
COMISSÕES PENDENTES:         ${formatCurrency(daySummary.totals.commissions - daySummary.totals.commissions_paid).padStart(15)}

================================================================================
                           RESULTADO FINAL
================================================================================

Total Faturado:              ${formatCurrency(daySummary.totals.revenue).padStart(15)}
(-) Total Comissões:         ${formatCurrency(daySummary.totals.commissions).padStart(15)}
                             ─────────────────
LUCRO LÍQUIDO:               ${formatCurrency(daySummary.totals.net_profit).padStart(15)}

================================================================================
                    CAIXA ${daySummary.is_closed ? 'FECHADO' : 'ABERTO'}
================================================================================

                         ASSINATURA DO RESPONSÁVEL


________________________________________

================================================================================
        `.trim();

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Fechamento de Caixa - ${format(selectedDate, 'dd-MM-yyyy')}</title>
                    <style>
                        body { font-family: 'Courier New', monospace; padding: 20px; background: white; }
                        pre { white-space: pre-wrap; font-size: 11px; line-height: 1.3; }
                        @media print { body { padding: 0; } }
                    </style>
                </head>
                <body>
                    <pre>${report}</pre>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-5">
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20">
                                <Receipt className="text-emerald-500" size={20} />
                            </div>
                            Fechamento de Caixa
                        </h2>
                        <p className="text-sm text-[var(--text-muted)] mt-1 ml-12">
                            Resumo financeiro e pagamento de comissões
                        </p>
                    </div>

                    {/* Date Picker with Custom Calendar */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] hover:border-emerald-500/50 focus:border-emerald-500 focus:outline-none cursor-pointer flex items-center gap-2"
                            >
                                <Calendar size={16} className="text-[var(--text-muted)]" />
                                {format(selectedDate, "dd/MM/yyyy")}
                            </button>

                            {/* Custom Calendar Dropdown */}
                            {showDatePicker && (
                                <div className="absolute right-0 top-full mt-2 z-50 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-2xl p-4 min-w-[280px]">
                                    {/* Calendar Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <button
                                            onClick={() => {
                                                const prev = new Date(selectedDate);
                                                prev.setMonth(prev.getMonth() - 1);
                                                setSelectedDate(prev);
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]"
                                        >
                                            <ChevronDown size={16} className="rotate-90" />
                                        </button>
                                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                                            {format(selectedDate, "MMMM yyyy", { locale: ptBR })}
                                        </span>
                                        <button
                                            onClick={() => {
                                                const next = new Date(selectedDate);
                                                next.setMonth(next.getMonth() + 1);
                                                if (next <= new Date()) setSelectedDate(next);
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]"
                                        >
                                            <ChevronDown size={16} className="-rotate-90" />
                                        </button>
                                    </div>

                                    {/* Days of Week */}
                                    <div className="grid grid-cols-7 gap-1 mb-2">
                                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                                            <div key={i} className="text-center text-xs font-medium text-[var(--text-muted)] py-1">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Calendar Days */}
                                    <div className="grid grid-cols-7 gap-1">
                                        {(() => {
                                            const year = selectedDate.getFullYear();
                                            const month = selectedDate.getMonth();
                                            const firstDay = new Date(year, month, 1).getDay();
                                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                                            const today = new Date();
                                            const days = [];

                                            // Empty cells for days before first day of month
                                            for (let i = 0; i < firstDay; i++) {
                                                days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
                                            }

                                            // Days of the month
                                            for (let day = 1; day <= daysInMonth; day++) {
                                                const date = new Date(year, month, day);
                                                const isSelected = date.toDateString() === selectedDate.toDateString();
                                                const isToday = date.toDateString() === today.toDateString();
                                                const isFuture = date > today;

                                                days.push(
                                                    <button
                                                        key={day}
                                                        disabled={isFuture}
                                                        onClick={() => {
                                                            setSelectedDate(new Date(year, month, day, 12, 0, 0));
                                                            setShowDatePicker(false);
                                                        }}
                                                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${isSelected
                                                            ? 'bg-amber-500 text-black'
                                                            : isToday
                                                                ? 'bg-[var(--surface-subtle)] text-[var(--text-primary)] ring-1 ring-amber-500'
                                                                : isFuture
                                                                    ? 'text-[#333333] cursor-not-allowed opacity-40'
                                                                    : 'text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'
                                                            }`}
                                                    >
                                                        {day}
                                                    </button>
                                                );
                                            }

                                            return days;
                                        })()}
                                    </div>

                                    {/* Today Button */}
                                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex justify-between">
                                        <button
                                            onClick={() => {
                                                setSelectedDate(new Date());
                                                setShowDatePicker(false);
                                            }}
                                            className="text-xs text-amber-500 hover:text-amber-400 font-medium"
                                        >
                                            Hoje
                                        </button>
                                        <button
                                            onClick={() => setShowDatePicker(false)}
                                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                        >
                                            Fechar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status Badge */}
                        {daySummary?.is_closed && (
                            <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-xs font-bold border border-emerald-500/20">
                                <Lock size={12} /> Caixa Fechado
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-emerald-500" />
                </div>
            )}

            {/* Summary Cards */}
            {!loading && daySummary && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Revenue */}
                        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4 hover:border-emerald-500/30 transition-colors">
                            <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-semibold uppercase mb-2">
                                <DollarSign size={14} className="text-emerald-500" />
                                Faturamento
                            </div>
                            <div className="text-2xl font-bold text-emerald-500">
                                {formatCurrency(daySummary.totals.revenue)}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">
                                {daySummary.appointments.length} atendimentos
                            </div>
                        </div>

                        {/* Commissions */}
                        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4 hover:border-amber-500/30 transition-colors">
                            <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-semibold uppercase mb-2">
                                <Users size={14} className="text-amber-500" />
                                Comissões
                            </div>
                            <div className="text-2xl font-bold text-amber-500">
                                {formatCurrency(daySummary.totals.commissions)}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">
                                Pago: {formatCurrency(daySummary.totals.commissions_paid)}
                            </div>
                        </div>

                        {/* Net Profit */}
                        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4 hover:border-blue-500/30 transition-colors">
                            <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-semibold uppercase mb-2">
                                <TrendingUp size={14} className="text-blue-500" />
                                Lucro Líquido
                            </div>
                            <div className="text-2xl font-bold text-blue-500">
                                {formatCurrency(daySummary.totals.net_profit)}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">
                                Após comissões
                            </div>
                        </div>

                        {/* Pending Commissions */}
                        <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-4 hover:border-red-500/30 transition-colors">
                            <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-semibold uppercase mb-2">
                                <Clock size={14} className="text-red-500" />
                                Pendente
                            </div>
                            <div className="text-2xl font-bold text-red-500">
                                {formatCurrency(daySummary.totals.commissions - daySummary.totals.commissions_paid)}
                            </div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">
                                Comissões a pagar
                            </div>
                        </div>
                    </div>

                    {/* Payment Methods */}
                    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <CreditCard size={18} className="text-emerald-500" />
                            Formas de Pagamento
                        </h3>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { key: 'pix', label: 'Pix', icon: QrCode, color: 'text-emerald-500 bg-emerald-500/10', value: daySummary.totals.by_payment_method.pix },
                                { key: 'credit', label: 'Crédito', icon: CreditCard, color: 'text-blue-500 bg-blue-500/10', value: daySummary.totals.by_payment_method.credit },
                                { key: 'debit', label: 'Débito', icon: CreditCard, color: 'text-amber-500 bg-amber-500/10', value: daySummary.totals.by_payment_method.debit },
                                { key: 'cash', label: 'Dinheiro', icon: Banknote, color: 'text-green-500 bg-green-500/10', value: daySummary.totals.by_payment_method.cash }
                            ].map(method => {
                                const Icon = method.icon;
                                const percentage = daySummary.totals.revenue > 0
                                    ? (method.value / daySummary.totals.revenue * 100).toFixed(0)
                                    : 0;
                                return (
                                    <div key={method.key} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                                        <div className={`p-2.5 rounded-lg ${method.color}`}>
                                            <Icon size={16} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-[var(--text-primary)]">
                                                {method.label}
                                            </div>
                                            <div className="text-xs text-[var(--text-muted)]">
                                                {formatCurrency(method.value)} ({percentage}%)
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Professionals */}
                    <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6">
                        {/* START: Professionals Header */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Users size={18} className="text-emerald-500" />
                                Profissionais
                                {commissionFilter !== 'all' && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${commissionFilter === 'paid'
                                        ? 'bg-emerald-500/10 text-emerald-500'
                                        : 'bg-red-500/10 text-red-500'
                                        }`}>
                                        {commissionFilter === 'paid' ? 'Pagos' : 'Pendentes'}
                                    </span>
                                )}
                            </h3>

                            <div className="flex items-center gap-2">
                                {/* Filter Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${commissionFilter !== 'all'
                                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                                            : 'bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                            }`}
                                    >
                                        <Filter size={14} />
                                        Filtrar
                                        <ChevronDown size={12} className={`transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showFilterDropdown && (
                                        <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg shadow-xl overflow-hidden min-w-[140px]">
                                            {[
                                                { id: 'all', label: 'Todos', count: daySummary?.professionals.length || 0 },
                                                { id: 'paid', label: 'Pagos', count: daySummary?.professionals.filter(p => p.commission_paid).length || 0 },
                                                { id: 'pending', label: 'Pendentes', count: daySummary?.professionals.filter(p => !p.commission_paid).length || 0 }
                                            ].map(filter => (
                                                <button
                                                    key={filter.id}
                                                    onClick={() => { setCommissionFilter(filter.id as any); setShowFilterDropdown(false); }}
                                                    className={`w-full px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-[var(--surface-subtle)] ${commissionFilter === filter.id ? 'bg-[var(--surface-subtle)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                                                        }`}
                                                >
                                                    <span>{filter.label}</span>
                                                    <span className="text-xs opacity-60">{filter.count}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Report Export Menu */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowReportMenu(!showReportMenu)}
                                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20 transition-all"
                                    >
                                        <Download size={14} />
                                        Exportar
                                    </button>

                                    {showReportMenu && (
                                        <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg shadow-xl overflow-hidden min-w-[160px]">
                                            <button
                                                onClick={exportToPDF}
                                                className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]"
                                            >
                                                <Printer size={14} />
                                                Imprimir / PDF
                                            </button>
                                            <button
                                                onClick={exportToCSV}
                                                className="w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]"
                                            >
                                                <FileSpreadsheet size={14} />
                                                Exportar CSV
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* END: Professionals Header */}

                        {getFilteredProfessionals().length === 0 ? (
                            <div className="text-center py-8 text-[var(--text-muted)]">
                                {commissionFilter === 'all'
                                    ? 'Nenhum atendimento finalizado neste dia'
                                    : commissionFilter === 'paid'
                                        ? 'Nenhuma comissão paga'
                                        : 'Nenhuma comissão pendente'}
                            </div>
                        ) : (
                            <>
                                {/* Batch Actions Bar */}
                                {getUnpaidProfessionals().length > 0 && (
                                    <div className="flex items-center justify-between py-2 px-3 mb-2 rounded-lg bg-[var(--surface-subtle)]/50 border border-[var(--border-subtle)]">
                                        <label
                                            onClick={selectAllUnpaid}
                                            className="flex items-center gap-2 cursor-pointer select-none"
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedProfessionalIds.length === getUnpaidProfessionals().length && getUnpaidProfessionals().length > 0
                                                ? 'bg-emerald-500 border-emerald-500'
                                                : 'border-gray-500 bg-transparent'
                                                }`}>
                                                {selectedProfessionalIds.length === getUnpaidProfessionals().length && getUnpaidProfessionals().length > 0 && (
                                                    <Check size={10} className="text-black" />
                                                )}
                                            </div>
                                            <span className="text-xs text-[var(--text-muted)]">
                                                Selecionar todos ({getUnpaidProfessionals().length})
                                            </span>
                                        </label>

                                        {selectedProfessionalIds.length > 0 && (
                                            <button
                                                onClick={() => setShowBatchPayModal(true)}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all"
                                            >
                                                <Wallet size={12} />
                                                Pagar {selectedProfessionalIds.length}
                                                <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px]">
                                                    {formatCurrency(getSelectedTotal())}
                                                </span>
                                            </button>
                                        )}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {getFilteredProfessionals().map(prof => (
                                        <div
                                            key={prof.id}
                                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-default)] transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                {/* Checkbox for unpaid */}
                                                {!prof.commission_paid && (
                                                    <div
                                                        onClick={(e) => { e.stopPropagation(); toggleProfessionalSelection(prof.id); }}
                                                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all cursor-pointer ${selectedProfessionalIds.includes(prof.id)
                                                            ? 'bg-emerald-500 border-emerald-500'
                                                            : 'border-gray-500 bg-transparent hover:border-emerald-500'
                                                            }`}
                                                    >
                                                        {selectedProfessionalIds.includes(prof.id) && (
                                                            <Check size={10} className="text-black" />
                                                        )}
                                                    </div>
                                                )}

                                                <div
                                                    className="flex items-center gap-3 cursor-pointer flex-1"
                                                    onClick={() => openProfessionalModal(prof)}
                                                >
                                                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold">
                                                        {prof.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                                            {prof.name}
                                                            <ChevronRight size={14} className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        </div>
                                                        <div className="text-xs text-[var(--text-muted)]">
                                                            {prof.appointments_count} atendimentos • {formatCurrency(prof.gross_revenue)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                                <div className="text-right flex-1 sm:flex-none">
                                                    <div className="text-xs text-[var(--text-muted)]">
                                                        Comissão ({prof.commission_rate}%)
                                                    </div>
                                                    <div className="font-bold text-amber-500">
                                                        {formatCurrency(prof.commission_amount)}
                                                    </div>
                                                </div>

                                                {prof.commission_paid ? (
                                                    <span className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 text-sm font-semibold border border-emerald-500/20">
                                                        <CheckCircle size={14} /> Pago
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={(e) => openPayModal(prof, e)}
                                                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all flex items-center gap-1.5"
                                                    >
                                                        <Wallet size={14} /> Pagar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Close Cash Register Card */}
                    {
                        !daySummary.is_closed && daySummary.appointments.length > 0 && (
                            <div className="bg-gradient-to-r from-emerald-500/5 via-[var(--surface-card)] to-emerald-500/5 border border-emerald-500/20 rounded-xl p-6">
                                <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
                                    <div className="text-center lg:text-left">
                                        <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2 justify-center lg:justify-start">
                                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                                <Lock size={16} className="text-emerald-500" />
                                            </div>
                                            Pronto para fechar o caixa?
                                        </h3>
                                        <p className="text-sm text-[var(--text-muted)] mt-1">
                                            {daySummary.appointments.length} atendimentos • {formatCurrency(daySummary.totals.revenue)} faturado • {formatCurrency(daySummary.totals.commissions - daySummary.totals.commissions_paid)} pendente
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleCloseCashRegister}
                                        disabled={loading}
                                        className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                                    >
                                        {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                        Confirmar Fechamento
                                    </button>
                                </div>
                            </div>
                        )
                    }
                </>
            )
            }

            {/* No data */}
            {
                !loading && !daySummary && (
                    <div className="text-center py-12 text-[var(--text-muted)]">
                        <Receipt size={48} className="mx-auto mb-4 opacity-30" />
                        <p>Selecione uma data para ver o resumo</p>
                    </div>
                )
            }

            {/* Pay Commission Modal */}
            {
                showPayModal && selectedProfessional && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div
                            className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl w-full max-w-md"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-[var(--border-subtle)]">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                        Pagar Comissão
                                    </h3>
                                    <button
                                        onClick={() => setShowPayModal(false)}
                                        className="p-2 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <p className="text-sm text-[var(--text-muted)] mt-1">
                                    {selectedProfessional.name} • {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                                </p>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <div className="text-sm text-amber-500">Valor da Comissão</div>
                                    <div className="text-2xl font-bold text-amber-500">
                                        {formatCurrency(selectedProfessional.commission_amount)}
                                    </div>
                                </div>

                                {/* Amount Input */}
                                <div>
                                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2 block">
                                        Valor a Pagar
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">R$</span>
                                        <input
                                            type="number"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            step="0.01"
                                            min="0"
                                            max={selectedProfessional.commission_amount}
                                            className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] pl-10 pr-4 py-3 rounded-lg text-lg font-semibold focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <button
                                            onClick={() => setPaymentAmount((selectedProfessional.commission_amount / 2).toFixed(2))}
                                            className="flex-1 py-2 rounded-lg bg-[var(--surface-subtle)] text-[var(--text-muted)] text-sm hover:bg-[var(--surface-hover)] border border-[var(--border-default)]"
                                        >
                                            50%
                                        </button>
                                        <button
                                            onClick={() => setPaymentAmount(selectedProfessional.commission_amount.toFixed(2))}
                                            className="flex-1 py-2 rounded-lg bg-[var(--surface-subtle)] text-[var(--text-muted)] text-sm hover:bg-[var(--surface-hover)] border border-[var(--border-default)]"
                                        >
                                            100%
                                        </button>
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div>
                                    <label className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-2 block">
                                        Forma de Pagamento
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'pix', label: 'Pix', icon: QrCode },
                                            { id: 'cash', label: 'Dinheiro', icon: Banknote },
                                            { id: 'transfer', label: 'Transf.', icon: CreditCard }
                                        ].map(method => {
                                            const Icon = method.icon;
                                            const isSelected = paymentMethod === method.id;
                                            return (
                                                <button
                                                    key={method.id}
                                                    onClick={() => setPaymentMethod(method.id)}
                                                    className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-all ${isSelected
                                                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500'
                                                        : 'bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'
                                                        } border`}
                                                >
                                                    <Icon size={18} />
                                                    <span className="text-xs font-medium">{method.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-[var(--border-subtle)] flex gap-3">
                                <button
                                    onClick={() => setShowPayModal(false)}
                                    className="flex-1 py-3 rounded-lg bg-[var(--surface-subtle)] text-[var(--text-muted)] font-medium hover:bg-[var(--surface-hover)]"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handlePayCommission}
                                    disabled={isPayingCommission || !paymentAmount || parseFloat(paymentAmount) <= 0}
                                    className="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isPayingCommission ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Professional Details Modal */}
            {
                showProfessionalModal && selectedProfessional && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowProfessionalModal(false)}
                    >
                        <div
                            className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-[var(--border-subtle)] shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-lg">
                                            {selectedProfessional.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                                {selectedProfessional.name}
                                            </h3>
                                            <p className="text-sm text-[var(--text-muted)]">
                                                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handlePrintReceipt(selectedProfessional)}
                                            className="p-2 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]"
                                            title="Imprimir Recibo"
                                        >
                                            <Printer size={18} />
                                        </button>
                                        <button
                                            onClick={() => setShowProfessionalModal(false)}
                                            className="p-2 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Cards */}
                            <div className="p-4 grid grid-cols-3 gap-3 border-b border-[var(--border-subtle)] shrink-0">
                                <div className="text-center p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                                    <div className="text-lg font-bold text-[var(--text-primary)]">
                                        {selectedProfessional.appointments_count}
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)]">Atendimentos</div>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="text-lg font-bold text-emerald-500">
                                        {formatCurrency(selectedProfessional.gross_revenue)}
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)]">Faturado</div>
                                </div>
                                <div className="text-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                    <div className="text-lg font-bold text-amber-500">
                                        {formatCurrency(selectedProfessional.commission_amount)}
                                    </div>
                                    <div className="text-xs text-[var(--text-muted)]">Comissão</div>
                                </div>
                            </div>

                            {/* Appointments List */}
                            <div className="flex-1 overflow-y-auto p-4">
                                <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-3 flex items-center gap-2">
                                    <Scissors size={14} />
                                    Atendimentos do Dia
                                </h4>

                                {getProfessionalAppointments().length === 0 ? (
                                    <div className="text-center py-8 text-[var(--text-muted)]">
                                        Nenhum atendimento encontrado
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {getProfessionalAppointments().map((apt: any) => {
                                            const time = apt.start_datetime
                                                ? format(new Date(apt.start_datetime), 'HH:mm')
                                                : '--:--';
                                            const isPaid = apt.payment_status === 'paid';

                                            return (
                                                <div
                                                    key={apt.id}
                                                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-sm font-mono text-[var(--text-muted)] bg-[var(--surface-app)] px-2 py-1 rounded">
                                                            {time}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-[var(--text-primary)]">
                                                                {apt.customer_name || 'Cliente'}
                                                            </div>
                                                            <div className="text-xs text-[var(--text-muted)]">
                                                                {apt.service?.name || 'Serviço'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs px-2 py-1 rounded-lg font-medium ${isPaid
                                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                                            : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                            }`}>
                                                            {isPaid ? 'Pago' : 'Pendente'}
                                                        </span>
                                                        <span className="text-sm font-bold text-[var(--text-primary)]">
                                                            {formatCurrency(apt.service?.price || parseFloat(apt.amount_paid) || 0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-[var(--border-subtle)] shrink-0 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-[var(--text-muted)]">Total a Pagar</span>
                                    <span className="text-xl font-bold text-amber-500">
                                        {formatCurrency(selectedProfessional.commission_amount - selectedProfessional.commission_paid_amount)}
                                    </span>
                                </div>

                                {selectedProfessional.commission_paid ? (
                                    <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/10 text-emerald-500 font-semibold border border-emerald-500/20">
                                        <CheckCircle size={18} />
                                        Comissão Paga
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setShowProfessionalModal(false);
                                            openPayModal(selectedProfessional);
                                        }}
                                        disabled={daySummary?.is_closed}
                                        className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        <Wallet size={18} />
                                        Pagar Comissão
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Cash Closing Confirmation Modal */}
            {
                showClosingModal && daySummary && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowClosingModal(false)}
                    >
                        {/* START: Closing Modal Container */}
                        <div
                            className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* START: Modal Header */}
                            <div className="p-6 border-b border-[var(--border-subtle)] shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20">
                                            <Lock size={20} className="text-emerald-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-[var(--text-primary)]">
                                                Confirmar Fechamento de Caixa
                                            </h3>
                                            <p className="text-sm text-[var(--text-muted)]">
                                                {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handlePrintClosingReport}
                                            className="p-2.5 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] border border-[var(--border-default)]"
                                            title="Imprimir Relatório"
                                        >
                                            <Printer size={18} />
                                        </button>
                                        <button
                                            onClick={() => setShowClosingModal(false)}
                                            className="p-2.5 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {/* END: Modal Header */}

                            {/* START: Modal Content - Scrollable */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Financial Summary */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                        <div className="text-2xl font-bold text-emerald-500">
                                            {formatCurrency(daySummary.totals.revenue)}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] mt-1">Faturamento</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                                        <div className="text-2xl font-bold text-amber-500">
                                            {formatCurrency(daySummary.totals.commissions)}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] mt-1">Comissões</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                                        <div className="text-2xl font-bold text-blue-500">
                                            {formatCurrency(daySummary.totals.net_profit)}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] mt-1">Lucro Líquido</div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-default)] text-center">
                                        <div className="text-2xl font-bold text-[var(--text-primary)]">
                                            {daySummary.appointments.length}
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] mt-1">Atendimentos</div>
                                    </div>
                                </div>

                                {/* Payment Methods Breakdown */}
                                <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                                    <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-3 flex items-center gap-2">
                                        <CreditCard size={14} />
                                        Formas de Pagamento
                                    </h4>
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                        {[
                                            { label: 'PIX', value: daySummary.totals.by_payment_method.pix, icon: QrCode, color: 'text-emerald-500' },
                                            { label: 'Crédito', value: daySummary.totals.by_payment_method.credit, icon: CreditCard, color: 'text-blue-500' },
                                            { label: 'Débito', value: daySummary.totals.by_payment_method.debit, icon: CreditCard, color: 'text-amber-500' },
                                            { label: 'Dinheiro', value: daySummary.totals.by_payment_method.cash, icon: Banknote, color: 'text-green-500' }
                                        ].map(m => {
                                            const Icon = m.icon;
                                            return (
                                                <div key={m.label} className="flex items-center gap-2">
                                                    <Icon size={14} className={m.color} />
                                                    <span className="text-xs text-[var(--text-muted)]">{m.label}:</span>
                                                    <span className="text-sm font-semibold text-[var(--text-primary)]">{formatCurrency(m.value)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Professionals Summary */}
                                <div className="p-4 rounded-xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                                    <h4 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-3 flex items-center gap-2">
                                        <Users size={14} />
                                        Resumo por Profissional
                                    </h4>
                                    <div className="space-y-2">
                                        {daySummary.professionals.map(prof => (
                                            <div key={prof.id} className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)] last:border-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-sm">
                                                        {prof.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-[var(--text-primary)]">{prof.name}</div>
                                                        <div className="text-xs text-[var(--text-muted)]">{prof.appointments_count} atendimentos</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-bold text-amber-500">{formatCurrency(prof.commission_amount)}</div>
                                                    <div className={`text-xs ${prof.commission_paid ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {prof.commission_paid ? '✓ Pago' : '○ Pendente'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex justify-between">
                                        <span className="text-sm text-[var(--text-muted)]">Total Comissões:</span>
                                        <span className="font-bold text-amber-500">{formatCurrency(daySummary.totals.commissions)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm text-[var(--text-muted)]">Pendente:</span>
                                        <span className="font-bold text-red-500">{formatCurrency(daySummary.totals.commissions - daySummary.totals.commissions_paid)}</span>
                                    </div>
                                </div>

                                {/* Warning if pending commissions */}
                                {daySummary.totals.commissions > daySummary.totals.commissions_paid && (
                                    <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                        <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <div className="text-sm font-semibold text-amber-500">Atenção: Comissões Pendentes</div>
                                            <div className="text-xs text-[var(--text-muted)] mt-1">
                                                Existem {formatCurrency(daySummary.totals.commissions - daySummary.totals.commissions_paid)} em comissões ainda não pagas.
                                                O fechamento pode continuar, mas as comissões ficarão registradas como pendentes.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* END: Modal Content */}

                            {/* START: Modal Footer */}
                            <div className="p-6 border-t border-[var(--border-subtle)] shrink-0">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <div className="text-sm text-[var(--text-muted)]">Lucro Líquido Final</div>
                                        <div className="text-2xl font-bold text-blue-500">{formatCurrency(daySummary.totals.net_profit)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-[var(--text-muted)]">Total Faturado</div>
                                        <div className="text-2xl font-bold text-emerald-500">{formatCurrency(daySummary.totals.revenue)}</div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowClosingModal(false)}
                                        className="flex-1 py-3 rounded-xl bg-[var(--surface-subtle)] text-[var(--text-muted)] font-medium hover:bg-[var(--surface-hover)] border border-[var(--border-default)]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={confirmCloseCashRegister}
                                        disabled={isClosingCash}
                                        className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                                    >
                                        {isClosingCash ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                                        Confirmar Fechamento
                                    </button>
                                </div>
                            </div>
                            {/* END: Modal Footer */}
                        </div>
                        {/* END: Closing Modal Container */}
                    </div>
                )
            }

            {/* Batch Payment Modal */}
            {
                showBatchPayModal && daySummary && (
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowBatchPayModal(false)}
                    >
                        <div
                            className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-2xl shadow-2xl w-full max-w-md"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-[var(--border-subtle)]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20">
                                            <Users size={20} className="text-emerald-500" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                                Pagamento em Lote
                                            </h3>
                                            <p className="text-sm text-[var(--text-muted)]">
                                                {selectedProfessionalIds.length} profissional{selectedProfessionalIds.length > 1 ? 'is' : ''} selecionado{selectedProfessionalIds.length > 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowBatchPayModal(false)}
                                        className="p-2 rounded-lg hover:bg-[var(--surface-subtle)] text-[var(--text-muted)]"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Selected Professionals List */}
                            <div className="p-4 max-h-[200px] overflow-y-auto">
                                <div className="space-y-2">
                                    {daySummary.professionals
                                        .filter(p => selectedProfessionalIds.includes(p.id))
                                        .map(prof => (
                                            <div key={prof.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-subtle)]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-sm">
                                                        {prof.name.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-medium text-[var(--text-primary)]">{prof.name}</span>
                                                </div>
                                                <span className="text-sm font-bold text-amber-500">{formatCurrency(prof.commission_amount)}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="px-6 pb-4">
                                <label className="text-sm font-medium text-[var(--text-muted)] mb-2 block">
                                    Forma de Pagamento
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'pix', label: 'PIX', icon: QrCode },
                                        { id: 'transfer', label: 'Transferência', icon: CreditCard },
                                        { id: 'cash', label: 'Dinheiro', icon: Banknote },
                                        { id: 'other', label: 'Outro', icon: Wallet }
                                    ].map(method => {
                                        const Icon = method.icon;
                                        return (
                                            <button
                                                key={method.id}
                                                onClick={() => setPaymentMethod(method.id)}
                                                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${paymentMethod === method.id
                                                    ? 'bg-transparent border border-emerald-500 text-emerald-500'
                                                    : 'bg-transparent border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
                                                    }`}
                                            >
                                                <Icon size={12} />
                                                {method.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-[var(--border-subtle)]">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm text-[var(--text-muted)]">Total a Pagar</span>
                                    <span className="text-2xl font-bold text-emerald-500">{formatCurrency(getSelectedTotal())}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowBatchPayModal(false)}
                                        className="flex-1 py-2.5 rounded-lg bg-transparent text-[var(--text-muted)] text-sm font-medium hover:bg-[var(--surface-subtle)] border border-[var(--border-default)]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleBatchPayment}
                                        disabled={isPayingCommission}
                                        className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                    >
                                        {isPayingCommission ? <Loader2 size={14} className="animate-spin" /> : <Wallet size={14} />}
                                        Confirmar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
