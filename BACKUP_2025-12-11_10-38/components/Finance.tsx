
import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, PieChart, Sparkles, Download, Lock, Settings, Key, ShieldCheck, Eye, EyeOff, X, CheckCircle2, PiggyBank, Receipt, Printer, FileText, Sheet, Target, Save, TrendingUp, Edit2 } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Barber, RecurringExpense, Role } from '../types';

import { useSupabaseQuery } from '../lib/hooks';
import { fetchProfessionals, fetchFinancialRecords, fetchRecurringExpenses, getCurrentBusinessId, createRecurringExpense } from '../lib/database';
import { supabase } from '../lib/supabase';
import { CurrencyInput } from '../src/ui';

interface FinanceProps {
    paymentConfig?: {
        isConnected: boolean;
        stripeKey: string;
    };
    onSaveConfig?: (config: { isConnected: boolean; stripeKey: string }) => void;
    userRole?: Role;
}

const Finance: React.FC<FinanceProps> = ({ paymentConfig, onSaveConfig, userRole = 'Admin' }) => {
    const { data: barbersData, refetch: refetchProfessionals } = useSupabaseQuery(fetchProfessionals);
    const { data: financialRecordsData } = useSupabaseQuery(fetchFinancialRecords);
    const { data: recurringExpensesData } = useSupabaseQuery(fetchRecurringExpenses);

    const barbers = barbersData || [];
    const transactions = financialRecordsData || [];
    const recurringExpenses = recurringExpensesData || [];

    // 🔧 DEBUG LOGS for data sources
    useEffect(() => {
        console.log('💰 [Finance] Data sources loaded:');
        console.log('   📋 Barbers/Professionals:', barbers.length, barbers);
        console.log('   📊 Financial Records (transactions):', transactions.length, transactions);
        console.log('   💸 Recurring Expenses:', recurringExpenses.length, recurringExpenses);
    }, [barbers, transactions, recurringExpenses]);

    // ✅ DADOS REAIS: Buscar agendamentos pagos
    const [paidAppointments, setPaidAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stripePaymentDetails, setStripePaymentDetails] = useState<Map<string, any>>(new Map());
    const [loadingStripeDetails, setLoadingStripeDetails] = useState(false);

    useEffect(() => {
        loadPaidAppointments();
    }, []);

    // Load Stripe payment details when appointments are loaded
    useEffect(() => {
        if (paidAppointments.length > 0) {
            loadStripePaymentDetails();
        }
    }, [paidAppointments]);

    const loadPaidAppointments = async () => {
        try {
            const businessId = await getCurrentBusinessId();
            console.log('💰 [Finance] Loading appointments for business:', businessId);

            const { data, error } = await supabase
                .from('appointments')
                .select(`
                    *,
                    service:services(id, name, price),
                    professional:professionals(id, name, commission_rate)
                `)
                .eq('business_id', businessId)
                .eq('payment_status', 'paid');

            if (error) throw error;
            setPaidAppointments(data || []);
            console.log('✅ [Finance] Loaded paid appointments:', data?.length);
            console.log('   📋 Sample appointment:', data?.[0]);
        } catch (err) {
            console.error('❌ [Finance] Error loading appointments:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch Stripe payment details for appointments with payment_intent_id
    const loadStripePaymentDetails = async () => {
        try {
            const appointmentsWithStripe = paidAppointments.filter(apt => apt.payment_intent_id);

            if (appointmentsWithStripe.length === 0) {
                console.log('ℹ️ [Finance] No appointments with Stripe payment_intent_id');
                return;
            }

            setLoadingStripeDetails(true);
            console.log('🔄 [Finance] Loading Stripe details for', appointmentsWithStripe.length, 'payments...');

            const { getMultiplePaymentDetails } = await import('../lib/stripe');
            const paymentIntentIds = appointmentsWithStripe.map(apt => apt.payment_intent_id);
            const details = await getMultiplePaymentDetails(paymentIntentIds);

            setStripePaymentDetails(details);
            console.log('✅ [Finance] Loaded Stripe details:', details.size, 'payments');

            // Log sample details
            if (details.size > 0) {
                const firstKey = details.keys().next().value;
                console.log('   📋 Sample Stripe details:', details.get(firstKey));
            }
        } catch (err) {
            console.error('❌ [Finance] Error loading Stripe details:', err);
        } finally {
            setLoadingStripeDetails(false);
        }
    };

    // ✅ CALCULAR RECEITA REAL
    const totalRevenue = paidAppointments.reduce((sum, apt) => {
        const price = apt.service?.price || 0;
        return sum + price;
    }, 0);
    console.log('💰 [Finance] Total Revenue calculated:', totalRevenue, 'from', paidAppointments.length, 'appointments');

    // ✅ CALCULAR DESPESAS REAIS
    const totalExpenses = recurringExpenses.reduce((sum, exp) => {
        return sum + Number(exp.amount || 0);
    }, 0);
    console.log('💸 [Finance] Total Expenses calculated:', totalExpenses, 'from', recurringExpenses.length, 'expenses');

    // ✅ SALDO LÍQUIDO REAL
    const netBalance = totalRevenue - totalExpenses;

    const [activeTab, setActiveTab] = useState<'dashboard' | 'commissions' | 'expenses' | 'goals'>('dashboard');

    // Goals state
    const [goalsEditing, setGoalsEditing] = useState(false);
    const [editedGoals, setEditedGoals] = useState<Record<string, number>>({});
    const [savingGoals, setSavingGoals] = useState(false);
    const [businessGoal, setBusinessGoal] = useState<number>(0);
    const [goalPeriod, setGoalPeriod] = useState<1 | 3 | 6 | 12>(1); // 1, 3, 6, 12 months
    const [editedBusinessGoal, setEditedBusinessGoal] = useState<number>(0);
    const [editedGoalPeriod, setEditedGoalPeriod] = useState<1 | 3 | 6 | 12>(1);
    const [loadingBusinessGoal, setLoadingBusinessGoal] = useState(true);

    // Goal period labels
    const goalPeriodLabels: Record<number, string> = {
        1: 'Mensal',
        3: 'Trimestral',
        6: 'Semestral',
        12: 'Anual'
    };

    // Load business goal and period
    useEffect(() => {
        const loadBusinessGoal = async () => {
            try {
                const businessId = await getCurrentBusinessId();
                const { data } = await supabase
                    .from('businesses')
                    .select('booking_settings')
                    .eq('id', businessId)
                    .single();
                if (data?.booking_settings?.goal_amount) {
                    setBusinessGoal(data.booking_settings.goal_amount);
                } else if (data?.booking_settings?.monthly_goal) {
                    // Backward compatibility
                    setBusinessGoal(data.booking_settings.monthly_goal);
                }
                if (data?.booking_settings?.goal_period) {
                    setGoalPeriod(data.booking_settings.goal_period);
                }
            } catch (err) {
                console.error('Error loading business goal:', err);
            } finally {
                setLoadingBusinessGoal(false);
            }
        };
        loadBusinessGoal();
    }, []);

    // State for Payment Configuration
    const [showConfig, setShowConfig] = useState(false);
    const [stripePublishableKey, setStripePublishableKey] = useState('');
    const [stripeSecretKey, setStripeSecretKey] = useState('');
    const [showKeys, setShowKeys] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);
    const [keyLastFour, setKeyLastFour] = useState(''); // Only store last 4 chars for display

    const [isExporting, setIsExporting] = useState<string | null>(null);

    // Expense Modal State
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [expenseForm, setExpenseForm] = useState({
        description: '',
        amount: 0,
        day_of_month: 1,
        category: 'Outros',
        is_active: true
    });
    const [isSavingExpense, setIsSavingExpense] = useState(false);

    // Expense categories for barbershop/beauty salon
    const expenseCategories = [
        'Aluguel',
        'Energia Elétrica',
        'Água',
        'Internet',
        'Telefone',
        'Contador',
        'Produtos de Limpeza',
        'Produtos para Revenda',
        'Manutenção',
        'Marketing',
        'Materiais de Trabalho',
        'Software/Assinaturas',
        'Seguro',
        'Outros'
    ];

    useEffect(() => {
        // Carregar configuração existente do Stripe (apenas status, NÃO a chave)
        const loadStripeConfig = async () => {
            const { checkStripeConfigured, getKeyLastFour } = await import('../lib/stripeConfig');
            const configured = await checkStripeConfigured();

            if (configured) {
                setIsConfigured(true);
                const lastFour = await getKeyLastFour();
                setKeyLastFour(lastFour || '****');
                console.log('✅ [Finance] Stripe is configured (key not loaded for security)');
            }
        };

        loadStripeConfig();
    }, []);

    // Calculate Payment Methods from REAL paid appointments
    const paymentMethodsCount = paidAppointments.reduce((acc, apt) => {
        const method = apt.payment_method || 'Outros';
        const price = apt.service?.price || 0;
        acc[method] = (acc[method] || 0) + price;
        return acc;
    }, {} as Record<string, number>);

    console.log('💳 [Finance] Payment Methods breakdown:', paymentMethodsCount);

    const paymentData = Object.entries(paymentMethodsCount).map(([name, value], index) => ({
        name,
        value,
        color: ['#22c55e', '#f59e0b', '#3f3f46', '#3b82f6'][index % 4]
    }));

    // ✅ REAL Barber Profit Analysis - Calculate from appointments
    const barberProfits = barbers.map(barber => {
        const barberAppointments = paidAppointments.filter(apt => apt.professional_id === barber.id);
        const gross = barberAppointments.reduce((sum, apt) => sum + (apt.service?.price || 0), 0);
        const commissionRate = barber.commission_rate || 50;
        const commission = gross * (commissionRate / 100);
        const net = gross - commission; // Lucro líquido para o estabelecimento

        console.log(`📊 [Finance] Barber ${barber.name}: ${barberAppointments.length} appointments, gross=${gross}, commission=${commission}`);

        return {
            id: barber.id,
            name: barber.name,
            appointments: barberAppointments.length,
            gross,
            commissionRate,
            commission,
            costs: commission, // A comissão é o custo para o estabelecimento
            net
        };
    }).filter(b => b.gross > 0); // Só mostrar quem teve faturamento

    console.log('👤 [Finance] Barber Profits calculated:', barberProfits);

    const handleSaveKey = async () => {
        if (!stripePublishableKey || !stripeSecretKey) {
            alert('❌ Preencha ambas as chaves (Publishable e Secret)');
            return;
        }

        setIsSaving(true);

        try {
            const { saveStripeKeys } = await import('../lib/stripeConfig');
            const result = await saveStripeKeys(stripePublishableKey, stripeSecretKey);

            if (result) {
                setIsConfigured(true);
                alert('✅ Chaves do Stripe salvas com sucesso!');
                console.log('✅ Stripe keys saved successfully');
            } else {
                alert('❌ Erro: Verifique o formato das chaves');
            }
        } catch (error) {
            console.error('Error saving Stripe keys:', error);
            alert('❌ Erro ao salvar configuração. Tente novamente.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = async (type: 'pdf' | 'excel') => {
        setIsExporting(type);

        try {
            const businessName = 'NS Studio'; // TODO: Get from settings
            const currentDate = new Date().toLocaleDateString('pt-BR');
            const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

            if (type === 'pdf') {
                const { default: jsPDF } = await import('jspdf');
                const { default: autoTable } = await import('jspdf-autotable');

                const doc = new jsPDF();

                // Header
                doc.setFontSize(20);
                doc.setTextColor(40, 40, 40);
                doc.text(businessName, 14, 22);

                doc.setFontSize(12);
                doc.setTextColor(100, 100, 100);
                doc.text(`Relatório Financeiro - ${currentMonth}`, 14, 30);
                doc.text(`Gerado em: ${currentDate}`, 14, 36);

                // Line separator
                doc.setDrawColor(200, 200, 200);
                doc.line(14, 40, 196, 40);

                // Summary section
                doc.setFontSize(14);
                doc.setTextColor(40, 40, 40);
                doc.text('Resumo Financeiro', 14, 50);

                doc.setFontSize(11);
                doc.text(`Total Entradas: R$ ${totalRevenue.toFixed(2)}`, 14, 58);
                doc.text(`Total Saídas: R$ ${totalExpenses.toFixed(2)}`, 14, 64);
                doc.text(`Saldo Líquido: R$ ${netBalance.toFixed(2)}`, 14, 70);
                doc.text(`Total de Atendimentos: ${paidAppointments.length}`, 14, 76);

                // Transactions table
                doc.setFontSize(14);
                doc.text('Transações', 14, 90);

                const tableData = paidAppointments.map(apt => {
                    const date = new Date(apt.start_datetime);
                    return [
                        date.toLocaleDateString('pt-BR'),
                        apt.service?.name || 'Serviço',
                        apt.payment_method || 'Outros',
                        `R$ ${(apt.service?.price || 0).toFixed(2)}`
                    ];
                });

                autoTable(doc, {
                    startY: 95,
                    head: [['Data', 'Serviço', 'Pagamento', 'Valor']],
                    body: tableData,
                    theme: 'striped',
                    headStyles: { fillColor: [212, 175, 55] },
                    styles: { fontSize: 9 },
                    margin: { left: 14, right: 14 }
                });

                // Footer
                const pageCount = doc.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setTextColor(150, 150, 150);
                    doc.text(`${businessName} - Relatório Financeiro`, 14, 287);
                    doc.text(`Página ${i} de ${pageCount}`, 180, 287);
                }

                doc.save(`relatorio-financeiro-${currentMonth.replace(' ', '-')}.pdf`);
                console.log('✅ [Finance] PDF exported successfully');

            } else {
                // Excel export
                const XLSX = await import('xlsx');

                const summaryData = [
                    ['RELATÓRIO FINANCEIRO'],
                    [businessName],
                    [`Período: ${currentMonth}`],
                    [`Gerado em: ${currentDate}`],
                    [],
                    ['RESUMO'],
                    ['Total Entradas', `R$ ${totalRevenue.toFixed(2)}`],
                    ['Total Saídas', `R$ ${totalExpenses.toFixed(2)}`],
                    ['Saldo Líquido', `R$ ${netBalance.toFixed(2)}`],
                    ['Total Atendimentos', paidAppointments.length],
                    [],
                    ['TRANSAÇÕES'],
                    ['Data', 'Serviço', 'Pagamento', 'Valor']
                ];

                paidAppointments.forEach(apt => {
                    const date = new Date(apt.start_datetime);
                    summaryData.push([
                        date.toLocaleDateString('pt-BR'),
                        apt.service?.name || 'Serviço',
                        apt.payment_method || 'Outros',
                        `R$ ${(apt.service?.price || 0).toFixed(2)}`
                    ]);
                });

                const ws = XLSX.utils.aoa_to_sheet(summaryData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Relatório');

                // Set column widths
                ws['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];

                XLSX.writeFile(wb, `relatorio-financeiro-${currentMonth.replace(' ', '-')}.xlsx`);
                console.log('✅ [Finance] Excel exported successfully');
            }
        } catch (error) {
            console.error('❌ [Finance] Export error:', error);
            alert('Erro ao exportar relatório. Tente novamente.');
        } finally {
            setIsExporting(null);
        }
    };

    const handlePrintPayslip = async (barber: any) => {
        try {
            const { default: jsPDF } = await import('jspdf');
            const { default: autoTable } = await import('jspdf-autotable');

            const doc = new jsPDF();
            const businessName = 'NS Studio';
            const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const currentDate = new Date().toLocaleDateString('pt-BR');

            // Calculate barber data
            const barberAppointments = paidAppointments.filter(apt => apt.professional_id === barber.id);
            const totalServices = barberAppointments.reduce((sum, apt) => sum + (apt.service?.price || 0), 0);
            const commissionRate = barber.commission_rate || 50;
            const commissionValue = totalServices * (commissionRate / 100);

            // Header
            doc.setFontSize(18);
            doc.setTextColor(40, 40, 40);
            doc.text(businessName, 14, 20);

            doc.setFontSize(14);
            doc.setTextColor(212, 175, 55);
            doc.text('HOLERITE / RECIBO DE COMISSÃO', 14, 30);

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Período: ${currentMonth}`, 14, 38);
            doc.text(`Emitido em: ${currentDate}`, 14, 44);

            // Line
            doc.setDrawColor(212, 175, 55);
            doc.setLineWidth(0.5);
            doc.line(14, 50, 196, 50);

            // Professional info
            doc.setFontSize(12);
            doc.setTextColor(40, 40, 40);
            doc.text('PROFISSIONAL:', 14, 60);
            doc.setFontSize(14);
            doc.text(barber.name, 14, 68);

            // Summary table
            autoTable(doc, {
                startY: 80,
                head: [['Descrição', 'Valor']],
                body: [
                    ['Total em Serviços', `R$ ${totalServices.toFixed(2)}`],
                    [`Comissão (${commissionRate}%)`, `R$ ${commissionValue.toFixed(2)}`],
                    ['Atendimentos no Período', `${barberAppointments.length}`],
                ],
                theme: 'grid',
                headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0] },
                styles: { fontSize: 11 },
                margin: { left: 14, right: 14 }
            });

            // Net pay highlight
            const finalY = (doc as any).lastAutoTable.finalY || 120;
            doc.setFillColor(212, 175, 55);
            doc.rect(14, finalY + 10, 182, 20, 'F');
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('VALOR A RECEBER:', 20, finalY + 23);
            doc.setFontSize(16);
            doc.text(`R$ ${commissionValue.toFixed(2)}`, 150, finalY + 23);

            // Signature area
            doc.setDrawColor(100, 100, 100);
            doc.setLineWidth(0.3);
            doc.line(14, finalY + 60, 90, finalY + 60);
            doc.line(110, finalY + 60, 196, finalY + 60);

            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text('Assinatura do Profissional', 30, finalY + 66);
            doc.text('Assinatura do Responsável', 135, finalY + 66);

            // Footer
            doc.setFontSize(8);
            doc.text(`${businessName} - Holerite gerado automaticamente`, 14, 287);

            doc.save(`holerite-${barber.name.replace(' ', '-')}-${currentMonth.replace(' ', '-')}.pdf`);
            console.log('✅ [Finance] Payslip PDF generated for', barber.name);

        } catch (error) {
            console.error('❌ [Finance] Payslip error:', error);
            alert('Erro ao gerar holerite. Tente novamente.');
        }
    };

    // Handle save new expense
    const handleSaveExpense = async () => {
        if (!expenseForm.description || expenseForm.amount <= 0) {
            alert('Preencha descrição e valor da despesa');
            return;
        }

        setIsSavingExpense(true);

        try {
            const result = await createRecurringExpense({
                description: expenseForm.description,
                amount: expenseForm.amount,
                day_of_month: expenseForm.day_of_month,
                category: expenseForm.category,
                is_active: expenseForm.is_active
            });

            if (result) {
                console.log('✅ [Finance] Expense created:', result);
                setShowExpenseModal(false);
                setExpenseForm({
                    description: '',
                    amount: 0,
                    day_of_month: 1,
                    category: 'Outros',
                    is_active: true
                });
                // Reload page to refresh expenses list
                window.location.reload();
            } else {
                alert('Erro ao salvar despesa. Tente novamente.');
            }
        } catch (error) {
            console.error('❌ [Finance] Error saving expense:', error);
            alert('Erro ao salvar despesa.');
        } finally {
            setIsSavingExpense(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in relative pb-20">

            {/* Header Actions */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-barber-900 p-4 rounded-xl border border-barber-800">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <div className="bg-barber-950 p-2 rounded-lg border border-barber-800 shrink-0">
                        <Wallet size={20} className="text-barber-gold" />
                    </div>
                    Controle Financeiro
                </h2>

                <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
                    {/* Navigation Tabs */}
                    <div className="flex bg-barber-950 rounded-lg p-1 border border-barber-800 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-barber-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Visão Geral
                        </button>
                        <button
                            onClick={() => setActiveTab('commissions')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'commissions' ? 'bg-barber-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Comissões
                        </button>
                        <button
                            onClick={() => setActiveTab('expenses')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'expenses' ? 'bg-barber-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Despesas
                        </button>
                        <button
                            onClick={() => setActiveTab('goals')}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'goals' ? 'bg-barber-800 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Metas
                        </button>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        {userRole === 'Admin' && (
                            <button
                                onClick={() => setShowConfig(true)}
                                className={`flex-1 sm:flex-none bg-barber-950 hover:bg-barber-800 text-gray-300 hover:text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-colors ${isConfigured ? 'border-green-500/50 text-green-500' : 'border-barber-800'}`}
                            >
                                {isConfigured ? <CheckCircle2 size={14} /> : <Settings size={14} />}
                                {isConfigured ? 'Ativo' : 'Configurar'}
                            </button>
                        )}
                        <button disabled className="flex-1 sm:flex-none bg-barber-800 text-gray-500 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-barber-700 whitespace-nowrap cursor-not-allowed opacity-60">
                            <Lock size={14} /> Fechar Caixa
                            <span className="text-[10px] bg-barber-gold/20 text-barber-gold px-1.5 py-0.5 rounded-full">Em breve</span>
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === 'dashboard' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Export Buttons */}
                    <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <button
                            onClick={() => handleExport('pdf')}
                            disabled={!!isExporting}
                            className="w-full sm:w-auto bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-lg border border-red-500/30 text-xs font-bold flex items-center justify-center gap-2"
                        >
                            {isExporting === 'pdf' ? <Sparkles className="animate-spin" size={14} /> : <FileText size={14} />}
                            Relatório PDF
                        </button>
                        <button
                            onClick={() => handleExport('excel')}
                            disabled={!!isExporting}
                            className="w-full sm:w-auto bg-green-500/10 hover:bg-green-500/20 text-green-500 px-3 py-1.5 rounded-lg border border-green-500/30 text-xs font-bold flex items-center justify-center gap-2"
                        >
                            {isExporting === 'excel' ? <Sparkles className="animate-spin" size={14} /> : <Sheet size={14} />}
                            Relatório Excel
                        </button>
                    </div>

                    {/* AI Financial Insight - DISABLED (Em breve) */}
                    <div className="bg-barber-900 border border-barber-800 rounded-xl p-4 flex flex-col sm:flex-row items-start gap-4 opacity-60">
                        <div className="bg-gray-600/20 p-2 rounded-full text-gray-500 shrink-0">
                            <Sparkles size={20} />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <h3 className="text-gray-500 font-bold text-sm">Análise Inteligente de Caixa</h3>
                                <span className="text-[10px] bg-barber-gold/20 text-barber-gold px-2 py-0.5 rounded-full font-bold">Em breve</span>
                            </div>
                            <p className="text-gray-600 text-sm mt-1">
                                Insights automáticos sobre seu fluxo de caixa, tendências e recomendações.
                            </p>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                        <div className="bg-barber-900 p-6 rounded-xl border border-barber-800 shadow-lg relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <DollarSign size={100} />
                            </div>
                            <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Entradas (Mês)</h3>
                            <div className="text-3xl font-bold text-green-500 flex items-center gap-2">
                                {loading ? '...' : `R$ ${totalRevenue.toFixed(2)}`}
                                <ArrowUpRight size={20} />
                            </div>
                            <div className="mt-2 text-xs text-gray-500">{paidAppointments.length} pagamentos confirmados</div>
                        </div>

                        <div className="bg-barber-900 p-6 rounded-xl border border-barber-800 shadow-lg relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Wallet size={100} />
                            </div>
                            <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Saídas (Mês)</h3>
                            <div className="text-3xl font-bold text-red-500 flex items-center gap-2">
                                {loading ? '...' : `R$ ${totalExpenses.toFixed(2)}`}
                                <ArrowDownRight size={20} />
                            </div>
                            <div className="mt-2 text-xs text-gray-500">{recurringExpenses.length} despesas registradas</div>
                        </div>

                        {/* Stripe Fees Card */}
                        <div className="bg-barber-900 p-6 rounded-xl border border-barber-800 shadow-lg relative overflow-hidden group">
                            <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <CreditCard size={100} />
                            </div>
                            <h3 className="text-gray-400 text-sm font-medium uppercase mb-2">Taxas Stripe</h3>
                            {(() => {
                                // Calculate total Stripe fees
                                let totalFees = 0;
                                stripePaymentDetails.forEach((details) => {
                                    if (details?.fees?.stripeFee) {
                                        totalFees += details.fees.stripeFee;
                                    }
                                });
                                return (
                                    <>
                                        <div className="text-3xl font-bold text-purple-400 flex items-center gap-2">
                                            {loadingStripeDetails ? '...' : `-R$ ${totalFees.toFixed(2)}`}
                                        </div>
                                        <div className="mt-2 text-xs text-gray-500">
                                            {stripePaymentDetails.size} pagamentos online
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="bg-gradient-to-br from-barber-gold to-yellow-600 p-6 rounded-xl shadow-lg relative overflow-hidden">
                            <h3 className="text-black/70 text-sm font-bold uppercase mb-2">Saldo Líquido</h3>
                            {userRole === 'Admin' ? (
                                <div className="text-4xl font-extrabold text-black">
                                    {loading ? '...' : `R$ ${netBalance.toFixed(2)}`}
                                </div>
                            ) : (
                                <div className="text-2xl font-extrabold text-black/50 flex items-center gap-2">
                                    <Lock size={20} /> Acesso Restrito
                                </div>
                            )}
                            <div className="mt-4 inline-flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full text-black text-xs font-bold">
                                <PieChart size={14} /> Margem: 72%
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Payment Methods Chart */}
                        <div className="bg-barber-900 border border-barber-800 p-6 rounded-xl shadow-lg">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <CreditCard size={20} className="text-barber-gold" />
                                Métodos de Pagamento
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={paymentData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {paymentData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend iconType="circle" />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Transactions List - From REAL appointments */}
                        <div className="lg:col-span-2 bg-barber-900 border border-barber-800 p-6 rounded-xl shadow-lg flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-white">Fluxo de Caixa Diário</h3>
                                <div className="flex items-center gap-2">
                                    {loadingStripeDetails && (
                                        <span className="text-xs text-purple-400 flex items-center gap-1">
                                            <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                                            Sincronizando Stripe...
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-500">{paidAppointments.length} transações</span>
                                </div>
                            </div>

                            <div className="flex-1 overflow-x-auto max-h-80">
                                {paidAppointments.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <p>Nenhuma transação encontrada</p>
                                        <p className="text-xs mt-1">Os pagamentos confirmados aparecerão aqui</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse min-w-[600px]">
                                        <thead className="sticky top-0 bg-barber-900">
                                            <tr className="text-gray-500 text-xs uppercase border-b border-barber-800">
                                                <th className="pb-3 pl-2">Data/Hora</th>
                                                <th className="pb-3">Serviço</th>
                                                <th className="pb-3">Pagamento</th>
                                                <th className="pb-3 text-right">Taxa</th>
                                                <th className="pb-3 text-right pr-2">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {paidAppointments.slice(0, 20).map((apt) => {
                                                const date = new Date(apt.start_datetime);
                                                const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                                const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                                                const stripeDetails = apt.payment_intent_id ? stripePaymentDetails.get(apt.payment_intent_id) : null;

                                                // Get payment label from Stripe details or fallback
                                                const getPaymentInfo = () => {
                                                    if (stripeDetails) {
                                                        const type = stripeDetails.paymentMethodType;
                                                        const details = stripeDetails.paymentMethodDetails;

                                                        if (type === 'card') {
                                                            const brand = details.brand?.toUpperCase() || 'CARTÃO';
                                                            const last4 = details.last4 ? ` •${details.last4}` : '';
                                                            const funding = details.funding === 'debit' ? 'débito' : 'crédito';
                                                            return {
                                                                label: `${brand}${last4}`,
                                                                sublabel: funding,
                                                                style: 'border-blue-500/30 text-blue-400 bg-blue-500/10',
                                                                icon: 'card'
                                                            };
                                                        } else if (type === 'pix') {
                                                            return {
                                                                label: 'Pix',
                                                                sublabel: 'instantâneo',
                                                                style: 'border-green-500/30 text-green-400 bg-green-500/10',
                                                                icon: 'zap'
                                                            };
                                                        } else if (type === 'boleto') {
                                                            return {
                                                                label: 'Boleto',
                                                                sublabel: null,
                                                                style: 'border-orange-500/30 text-orange-400 bg-orange-500/10',
                                                                icon: 'file-text'
                                                            };
                                                        }
                                                    }

                                                    // Fallback for appointments without Stripe details
                                                    const method = apt.payment_method || 'outros';
                                                    if (method === 'online') return { label: 'Stripe', sublabel: null, style: 'border-purple-500/30 text-purple-400 bg-purple-500/10', icon: 'card' };
                                                    if (method === 'presential') return { label: 'Presencial', sublabel: null, style: 'border-green-500/30 text-green-400 bg-green-500/10', icon: 'banknote' };
                                                    return { label: method, sublabel: null, style: 'border-gray-500/30 text-gray-400 bg-gray-500/10', icon: 'circle' };
                                                };

                                                const paymentInfo = getPaymentInfo();
                                                const stripeFee = stripeDetails?.fees?.stripeFee;

                                                return (
                                                    <tr key={apt.id} className="border-b border-barber-800/50 hover:bg-barber-800/20 transition-colors">
                                                        <td className="py-3 pl-2 text-gray-400 font-mono text-xs">
                                                            {dateStr} {timeStr}
                                                        </td>
                                                        <td className="py-3 text-white font-medium">
                                                            {apt.service?.name || 'Serviço'}
                                                        </td>
                                                        <td className="py-3">
                                                            <div className="flex flex-col">
                                                                <span className={`text-xs px-2 py-1 rounded border inline-flex items-center gap-1.5 w-fit ${paymentInfo.style}`}>
                                                                    {paymentInfo.icon === 'card' && <CreditCard size={12} />}
                                                                    {paymentInfo.icon === 'zap' && <ArrowUpRight size={12} />}
                                                                    {paymentInfo.icon === 'banknote' && <Wallet size={12} />}
                                                                    {paymentInfo.icon === 'file-text' && <Receipt size={12} />}
                                                                    {paymentInfo.label}
                                                                </span>
                                                                {paymentInfo.sublabel && (
                                                                    <span className="text-[10px] text-gray-500 mt-0.5">{paymentInfo.sublabel}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            {stripeFee ? (
                                                                <span className="text-xs text-red-400">-R$ {stripeFee.toFixed(2)}</span>
                                                            ) : (
                                                                <span className="text-xs text-gray-600">-</span>
                                                            )}
                                                        </td>
                                                        <td className="py-3 text-right pr-2 font-bold text-green-500">
                                                            + R$ {(apt.service?.price || 0).toFixed(2)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Barber Profitability Analysis */}
                    {userRole === 'Admin' && (
                        <div className="bg-barber-900 border border-barber-800 rounded-xl p-6 shadow-lg">
                            <h3 className="text-lg font-bold text-white mb-6">Lucratividade por Barbeiro (Líquido)</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[600px]">
                                    <thead>
                                        <tr className="text-xs text-gray-500 uppercase border-b border-barber-800">
                                            <th className="pb-3">Profissional</th>
                                            <th className="pb-3">Receita Bruta</th>
                                            <th className="pb-3">Despesas/Custos</th>
                                            <th className="pb-3 text-right">Lucro Líquido</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {barberProfits.map((b, idx) => (
                                            <tr key={idx} className="border-b border-barber-800/50 hover:bg-barber-800/20">
                                                <td className="py-4 font-bold text-white">{b.name}</td>
                                                <td className="py-4 text-green-500">R$ {b.gross.toFixed(2)}</td>
                                                <td className="py-4 text-red-400">R$ {b.costs.toFixed(2)}</td>
                                                <td className="py-4 text-right font-bold text-barber-gold">R$ {b.net.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Commission Calculator Tab (Payroll) */}
            {activeTab === 'commissions' && (
                <div className="animate-fade-in bg-barber-900 border border-barber-800 rounded-xl p-6 shadow-lg">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Receipt className="text-barber-gold" /> Calculadora de Comissões (Holerite)
                    </h3>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="text-xs text-gray-500 uppercase border-b border-barber-800 bg-barber-950">
                                    <th className="p-3">Profissional</th>
                                    <th className="p-3">Total Serviços</th>
                                    <th className="p-3">Taxa (%)</th>
                                    <th className="p-3 text-green-500">Valor Comissão</th>
                                    <th className="p-3 text-blue-400">+ Produtos</th>
                                    <th className="p-3 text-yellow-500">+ Caixinha</th>
                                    <th className="p-3 text-red-400">- Taxas</th>
                                    <th className="p-3 text-red-400">- Vales</th>
                                    <th className="p-3 text-right font-bold text-white">A Pagar</th>
                                    <th className="p-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-barber-800">
                                {barbers.map(barber => {
                                    // ✅ REAL DATA: Calculate from actual appointments
                                    const barberAppointments = paidAppointments.filter(apt => apt.professional_id === barber.id);
                                    const totalServices = barberAppointments.reduce((sum, apt) => sum + (apt.service?.price || 0), 0);
                                    const commissionRate = barber.commission_rate || 50;
                                    const commissionValue = totalServices * (commissionRate / 100);

                                    // TODO: These should come from a separate table when implemented
                                    const productCommission = 0; // No products tracked yet
                                    const tips = 0; // Tips not tracked yet
                                    const cardFees = 0; // Card fees not tracked yet
                                    const advances = 0; // Advances not tracked yet

                                    const netPay = commissionValue + productCommission + tips - cardFees - advances;

                                    console.log(`💵 [Finance] Commission ${barber.name}: services=${totalServices}, rate=${commissionRate}%, commission=${commissionValue}`);

                                    return (
                                        <tr key={barber.id} className="hover:bg-barber-800/30 transition-colors">
                                            <td className="p-3 font-medium text-white flex items-center gap-2">
                                                {barber.avatar_url ? (
                                                    <img src={barber.avatar_url} className="w-6 h-6 rounded-full" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-barber-gold/20 flex items-center justify-center text-barber-gold text-xs font-bold">
                                                        {barber.name?.charAt(0)}
                                                    </div>
                                                )}
                                                {barber.name}
                                                <span className="text-xs text-gray-500">({barberAppointments.length} atend.)</span>
                                            </td>
                                            <td className="p-3">R$ {totalServices.toFixed(2)}</td>
                                            <td className="p-3">{commissionRate}%</td>
                                            <td className="p-3 font-bold text-green-500">R$ {commissionValue.toFixed(2)}</td>
                                            <td className="p-3 text-blue-400 text-gray-600">R$ {productCommission.toFixed(2)}</td>
                                            <td className="p-3 text-yellow-500 text-gray-600">R$ {tips.toFixed(2)}</td>
                                            <td className="p-3 text-red-400 text-gray-600">- R$ {cardFees.toFixed(2)}</td>
                                            <td className="p-3 text-red-400 text-gray-600">- R$ {advances.toFixed(2)}</td>
                                            <td className="p-3 text-right font-bold text-barber-gold text-base border-l border-barber-800 bg-barber-950/30">
                                                R$ {netPay.toFixed(2)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button
                                                    onClick={() => handlePrintPayslip(barber)}
                                                    className="p-1.5 hover:bg-barber-700 rounded text-gray-400 hover:text-white" title="Imprimir Holerite"
                                                >
                                                    <Printer size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Recurring Expenses Tab */}
            {activeTab === 'expenses' && (
                <div className="animate-fade-in space-y-6">
                    <div className="bg-barber-900 border border-barber-800 rounded-xl p-6 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <CreditCard className="text-red-500" /> Despesas Recorrentes (Contas Fixas)
                            </h3>
                            <button
                                onClick={() => setShowExpenseModal(true)}
                                className="bg-barber-800 hover:bg-barber-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                            >
                                + Nova Despesa
                            </button>
                        </div>

                        {recurringExpenses.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-barber-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Receipt size={32} className="text-gray-500" />
                                </div>
                                <h4 className="text-white font-bold text-lg mb-2">Nenhuma despesa cadastrada</h4>
                                <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
                                    Cadastre suas despesas fixas mensais como aluguel, energia, água, internet e outras contas para ter um controle completo do seu fluxo de caixa.
                                </p>
                                <button
                                    onClick={() => setShowExpenseModal(true)}
                                    className="bg-barber-gold hover:bg-barber-gold/90 text-black px-4 py-2 rounded-lg text-sm font-bold"
                                >
                                    + Adicionar Primeira Despesa
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {recurringExpenses.map(expense => (
                                    <div key={expense.id} className="bg-barber-950 border border-barber-800 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between group hover:border-barber-700 transition-colors gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-lg ${expense.is_active ? 'bg-red-500/10 text-red-500' : 'bg-gray-800 text-gray-500'}`}>
                                                <Wallet size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white">{expense.description}</h4>
                                                <p className="text-xs text-gray-500">Vence dia {expense.day_of_month} • Categoria: {expense.category || 'Outros'}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                                            <div className="text-right">
                                                <div className="font-bold text-white">R$ {Number(expense.amount).toFixed(2)}</div>
                                                <div className="text-[10px] text-gray-500 uppercase font-bold">Mensal</div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={expense.is_active} className="sr-only peer" readOnly />
                                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Goals Tab */}
            {activeTab === 'goals' && (
                <div className="animate-fade-in space-y-6">
                    {/* Business Global Goal Card - EDITABLE */}
                    {(() => {
                        const professionalsGoalSum = barbers.reduce((sum, b) => sum + (b.monthly_goal || 0), 0);
                        // Use BUSINESS goal if set, otherwise sum
                        const totalGoal = goalsEditing ? (editedBusinessGoal || professionalsGoalSum) : (businessGoal || professionalsGoalSum);
                        const currentRevenue = paidAppointments.reduce((sum, apt) => sum + (apt.service?.price || 0), 0);
                        const progress = totalGoal > 0 ? (currentRevenue / totalGoal) * 100 : 0;
                        const now = new Date();
                        const dayOfMonth = now.getDate();
                        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                        const dailyAverage = dayOfMonth > 0 ? currentRevenue / dayOfMonth : 0;
                        const projection = dailyAverage * daysInMonth;

                        return (
                            <div className="bg-gradient-to-r from-barber-900 to-barber-950 border border-barber-800 rounded-xl p-6 shadow-lg relative overflow-hidden">
                                <div className="absolute right-0 top-0 p-8 opacity-5 pointer-events-none">
                                    <Target size={120} />
                                </div>
                                <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
                                    <div className="flex-1 w-full">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-2">
                                            <div>
                                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                                    <Target className="text-barber-gold" size={20} /> Meta {goalPeriodLabels[goalPeriod]} do Estabelecimento
                                                </h2>
                                                <p className="text-xs text-gray-400">
                                                    {businessGoal > 0
                                                        ? `Meta ${goalPeriodLabels[goalPeriod].toLowerCase()} definida pelo administrador`
                                                        : `Soma das metas dos profissionais (R$ ${professionalsGoalSum.toLocaleString('pt-BR')})`
                                                    }
                                                </p>
                                            </div>
                                            <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0 bg-barber-950/50 p-2 rounded-lg sm:bg-transparent sm:p-0">
                                                {goalsEditing ? (
                                                    <div className="flex flex-col gap-2">
                                                        <CurrencyInput
                                                            value={editedBusinessGoal}
                                                            onChange={setEditedBusinessGoal}
                                                            size="lg"
                                                            className="w-48"
                                                            autoFocus
                                                        />
                                                        {/* Period Selector */}
                                                        <div className="flex gap-1 flex-wrap">
                                                            {([1, 3, 6, 12] as const).map(period => (
                                                                <button
                                                                    key={period}
                                                                    onClick={() => setEditedGoalPeriod(period)}
                                                                    className={`px-3 py-1 rounded text-xs font-bold transition-all ${editedGoalPeriod === period
                                                                            ? 'bg-barber-gold text-black'
                                                                            : 'bg-barber-800 text-gray-400 hover:bg-barber-700'
                                                                        }`}
                                                                >
                                                                    {period === 1 ? '1 Mês' : `${period} Meses`}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="text-2xl font-bold text-white">R$ {currentRevenue.toLocaleString('pt-BR')}</div>
                                                        <div className="text-xs text-gray-500">Meta: R$ {totalGoal.toLocaleString('pt-BR')}</div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="h-4 w-full bg-barber-950 rounded-full border border-barber-800 overflow-hidden relative">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-1000 ease-out relative"
                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex justify-between text-xs font-medium">
                                            <span className="text-green-500">{progress.toFixed(1)}% Atingido</span>
                                            <span className="text-gray-500">Faltam R$ {Math.max(0, totalGoal - currentRevenue).toLocaleString('pt-BR')}</span>
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex w-full lg:w-auto items-center justify-between lg:justify-start gap-4 lg:border-l lg:border-barber-800 lg:pl-6 pt-4 lg:pt-0 border-t border-barber-800 lg:border-t-0">
                                        <div className="text-center flex-1 lg:flex-none">
                                            <div className="text-xs text-gray-500 uppercase font-bold">Projeção</div>
                                            <div className="text-xl font-bold text-blue-400">R$ {(projection / 1000).toFixed(1)}k</div>
                                        </div>
                                        <div className="text-center flex-1 lg:flex-none">
                                            <div className="text-xs text-gray-500 uppercase font-bold">Média Dia</div>
                                            <div className="text-xl font-bold text-barber-gold">R$ {dailyAverage.toFixed(0)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Professional Goals List */}
                    <div className="bg-barber-900 border border-barber-800 rounded-xl p-6 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <TrendingUp className="text-green-500" /> Metas por Profissional
                            </h3>
                            {!goalsEditing ? (
                                <button
                                    onClick={() => {
                                        setGoalsEditing(true);
                                        const goals: Record<string, number> = {};
                                        const profSum = barbers.reduce((sum, b) => sum + (b.monthly_goal || 0), 0);
                                        barbers.forEach(b => { goals[b.id] = b.monthly_goal || 0; });
                                        setEditedGoals(goals);
                                        // Initialize with business goal, or sum of professionals if not set
                                        setEditedBusinessGoal(businessGoal > 0 ? businessGoal : profSum);
                                        setEditedGoalPeriod(goalPeriod);
                                    }}
                                    className="bg-barber-800 hover:bg-barber-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                                >
                                    <Edit2 size={16} /> Editar Metas
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setGoalsEditing(false)}
                                        className="bg-barber-800 hover:bg-barber-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-bold"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setSavingGoals(true);
                                            try {
                                                const businessId = await getCurrentBusinessId();

                                                // Save business goal and period to booking_settings
                                                const { data: currentBiz } = await supabase
                                                    .from('businesses')
                                                    .select('booking_settings')
                                                    .eq('id', businessId)
                                                    .single();

                                                const updatedSettings = {
                                                    ...(currentBiz?.booking_settings || {}),
                                                    goal_amount: editedBusinessGoal,
                                                    goal_period: editedGoalPeriod,
                                                    monthly_goal: editedBusinessGoal // Keep for backward compat
                                                };

                                                await supabase
                                                    .from('businesses')
                                                    .update({ booking_settings: updatedSettings })
                                                    .eq('id', businessId);

                                                // Save professional goals
                                                for (const [profId, goal] of Object.entries(editedGoals)) {
                                                    await supabase
                                                        .from('professionals')
                                                        .update({ monthly_goal: goal })
                                                        .eq('id', profId);
                                                }

                                                // Update state and exit editing
                                                setBusinessGoal(editedBusinessGoal);
                                                setGoalPeriod(editedGoalPeriod);
                                                setGoalsEditing(false);

                                                // Refresh professionals data without page reload
                                                refetchProfessionals();

                                                alert('✅ Metas salvas com sucesso!');
                                            } catch (error) {
                                                console.error('Error saving goals:', error);
                                                alert('Erro ao salvar metas');
                                            } finally {
                                                setSavingGoals(false);
                                            }
                                        }}
                                        disabled={savingGoals}
                                        className="bg-barber-gold hover:bg-barber-gold/90 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Save size={16} /> {savingGoals ? 'Salvando...' : 'Salvar Todas as Metas'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            {barbers.map(barber => {
                                const barberAppointments = paidAppointments.filter(apt => apt.professional_id === barber.id);
                                const barberRevenue = barberAppointments.reduce((sum, apt) => sum + (apt.service?.price || 0), 0);
                                const goal = goalsEditing ? (editedGoals[barber.id] ?? barber.monthly_goal ?? 0) : (barber.monthly_goal || 0);
                                const progress = goal > 0 ? (barberRevenue / goal) * 100 : 0;

                                return (
                                    <div key={barber.id} className="bg-barber-950 border border-barber-800 p-4 rounded-lg hover:border-barber-700 transition-colors">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-barber-gold rounded-full flex items-center justify-center text-black font-bold">
                                                    {barber.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{barber.name}</div>
                                                    <div className="text-xs text-gray-500">{barber.specialty || 'Profissional'}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 flex-1 justify-end">
                                                {/* Progress */}
                                                <div className="hidden sm:block flex-1 max-w-[200px]">
                                                    <div className="h-2 bg-barber-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : progress >= 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                                                            style={{ width: `${Math.min(progress, 100)}%` }}
                                                        />
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-1 text-center">
                                                        {progress.toFixed(0)}% • R$ {barberRevenue.toLocaleString('pt-BR')}
                                                    </div>
                                                </div>

                                                {/* Goal Input/Display */}
                                                <div className="text-right">
                                                    {goalsEditing ? (
                                                        <CurrencyInput
                                                            value={editedGoals[barber.id] ?? goal}
                                                            onChange={(val) => setEditedGoals({
                                                                ...editedGoals,
                                                                [barber.id]: val
                                                            })}
                                                            size="sm"
                                                            className="w-36"
                                                        />
                                                    ) : (
                                                        <div>
                                                            <div className="text-lg font-bold text-white">R$ {goal.toLocaleString('pt-BR')}</div>
                                                            <div className="text-[10px] text-gray-500 uppercase">Meta Mensal</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mobile Progress */}
                                        <div className="sm:hidden mt-3">
                                            <div className="h-2 bg-barber-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : progress >= 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                                />
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {progress.toFixed(0)}% atingido • R$ {barberRevenue.toLocaleString('pt-BR')} / R$ {goal.toLocaleString('pt-BR')}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {barbers.length === 0 && (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-barber-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Target size={32} className="text-gray-500" />
                                </div>
                                <h4 className="text-white font-bold text-lg mb-2">Nenhum profissional cadastrado</h4>
                                <p className="text-gray-500 text-sm">Cadastre profissionais na aba Equipe para definir metas individuais.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Payment Configuration Modal */}
            {showConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-barber-900 w-full max-w-md rounded-xl border border-barber-800 shadow-2xl relative overflow-hidden">
                        <div className="p-6 border-b border-barber-800 flex justify-between items-center bg-barber-950">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <ShieldCheck className="text-barber-gold" /> Gateway de Pagamento
                            </h3>
                            <button onClick={() => { setShowConfig(false); setStripeSecretKey(''); }} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-3 p-3 bg-barber-950 rounded-lg border border-barber-800">
                                <div className="w-10 h-10 bg-[#635BFF] rounded flex items-center justify-center font-bold text-white italic">S</div>
                                <div>
                                    <div className="font-bold text-white">Stripe Payments</div>
                                    <div className="text-xs text-gray-400">Provedor selecionado</div>
                                </div>
                                {isConfigured && <CheckCircle2 className="ml-auto text-green-500" size={20} />}
                            </div>

                            {/* Status atual da configuração */}
                            {isConfigured ? (
                                <div className="space-y-4">
                                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                                        <div className="flex items-center gap-2 text-green-500 font-bold text-sm mb-2">
                                            <CheckCircle2 size={16} /> Stripe Configurado
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400 text-xs">
                                            <Lock size={12} />
                                            <span>Chave terminando em: <span className="font-mono text-white">****{keyLastFour}</span></span>
                                        </div>
                                    </div>

                                    <div className="bg-barber-950 border border-barber-800 rounded-lg p-4">
                                        <div className="flex items-center gap-2 text-yellow-500 text-sm font-bold mb-3">
                                            <Key size={14} /> Substituir Chave API
                                        </div>
                                        <p className="text-[10px] text-gray-500 mb-3">
                                            Por segurança, a chave atual não é exibida. Digite uma nova chave para substituir.
                                        </p>
                                        <input
                                            type="password"
                                            value={stripeSecretKey}
                                            onChange={(e) => setStripeSecretKey(e.target.value)}
                                            placeholder="sk_live_... (nova chave)"
                                            className="w-full bg-barber-900 border border-barber-800 text-white rounded-lg px-4 py-3 text-sm focus:border-barber-gold outline-none placeholder:text-gray-600"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                        <Key size={14} /> API Key (Secret Key)
                                    </label>
                                    <input
                                        type="password"
                                        value={stripeSecretKey}
                                        onChange={(e) => setStripeSecretKey(e.target.value)}
                                        placeholder="sk_live_..."
                                        className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg pl-4 pr-4 py-3 text-sm focus:border-barber-gold outline-none"
                                    />
                                    <p className="text-[10px] text-gray-500">
                                        Insira sua chave secreta do Stripe para habilitar pagamentos automáticos.
                                    </p>
                                </div>
                            )}

                            {/* Aviso de segurança */}
                            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
                                <Lock size={14} className="text-yellow-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-yellow-500/80">
                                    <strong>Segurança:</strong> Sua chave API nunca é exibida após ser salva. Apenas os últimos 4 caracteres são mostrados para identificação.
                                </p>
                            </div>

                            <button
                                onClick={async () => {
                                    if (!stripeSecretKey) {
                                        alert('❌ Digite a chave API para salvar');
                                        return;
                                    }
                                    setIsSaving(true);
                                    try {
                                        const { saveStripeKeys } = await import('../lib/stripeConfig');
                                        // Use a mesma chave para publishable (simplificado) ou recarregue
                                        const result = await saveStripeKeys(stripeSecretKey.replace('sk_', 'pk_'), stripeSecretKey);
                                        if (result) {
                                            setIsConfigured(true);
                                            setKeyLastFour(stripeSecretKey.slice(-4));
                                            setStripeSecretKey(''); // Limpar o campo após salvar
                                            alert('✅ Chave API salva com sucesso!');
                                        } else {
                                            alert('❌ Erro: Verifique o formato da chave (sk_live_... ou sk_test_...)');
                                        }
                                    } catch (error) {
                                        alert('❌ Erro ao salvar configuração');
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                                disabled={isSaving || !stripeSecretKey}
                                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${isConfigured
                                    ? 'bg-yellow-600 hover:bg-yellow-700 text-black'
                                    : 'bg-barber-gold hover:bg-barber-goldhover text-black'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                        Verificando...
                                    </>
                                ) : isConfigured ? (
                                    <>
                                        <Key size={16} /> Substituir Chave
                                    </>
                                ) : (
                                    'Salvar Configuração'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expense Modal */}
            {showExpenseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-xl border border-barber-800 bg-barber-900 shadow-2xl">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-barber-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-white">Nova Despesa Recorrente</h2>
                                <p className="text-xs text-gray-500">Cadastre uma conta fixa mensal</p>
                            </div>
                            <button
                                onClick={() => setShowExpenseModal(false)}
                                className="text-gray-400 hover:text-white p-1 rounded hover:bg-barber-800 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-4 space-y-4">
                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Descrição *</label>
                                <input
                                    type="text"
                                    value={expenseForm.description}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    placeholder="Ex: Aluguel do salão"
                                    className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-barber-gold transition-colors"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Categoria</label>
                                <select
                                    value={expenseForm.category}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                                    className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-barber-gold transition-colors"
                                >
                                    {expenseCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Valor Mensal (R$) *</label>
                                <input
                                    type="number"
                                    value={expenseForm.amount || ''}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                                    placeholder="0,00"
                                    min="0"
                                    step="0.01"
                                    className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-barber-gold transition-colors"
                                />
                            </div>

                            {/* Day of Month */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Dia do Vencimento</label>
                                <select
                                    value={expenseForm.day_of_month}
                                    onChange={(e) => setExpenseForm({ ...expenseForm, day_of_month: parseInt(e.target.value) })}
                                    className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-barber-gold transition-colors"
                                >
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                        <option key={day} value={day}>Dia {day}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-barber-800 flex gap-3 justify-end">
                            <button
                                onClick={() => setShowExpenseModal(false)}
                                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveExpense}
                                disabled={isSavingExpense}
                                className="bg-barber-gold hover:bg-barber-gold/90 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSavingExpense ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar Despesa'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Finance;
