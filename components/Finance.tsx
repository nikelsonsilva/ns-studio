
import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Wallet, ArrowUpRight, ArrowDownRight, PieChart, Sparkles, Download, Lock, Settings, Key, ShieldCheck, Eye, EyeOff, X, CheckCircle2, PiggyBank, Receipt, Printer, FileText, Sheet, Target, Save, TrendingUp, Edit2, Plus, FlaskConical, Rocket, Trophy } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Barber, RecurringExpense, Role } from '../types';

import { useSupabaseQuery } from '../lib/hooks';
import { fetchProfessionals, fetchFinancialRecords, fetchRecurringExpenses, getCurrentBusinessId, createRecurringExpense } from '../lib/database';
import { supabase } from '../lib/supabase';
import { CurrencyInput } from '../src/ui';
import { buscarCep, buscarCnpj, buscarCodigoIbge, formatarCep, formatarCnpj } from '../lib/brasilApi';

// UI Components (Design System)
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Badge from './ui/Badge';
import { useToast } from './ui/Toast';

interface FinanceProps {
  paymentConfig?: {
    isConnected: boolean;
    stripeKey: string;
  };
  onSaveConfig?: (config: { isConnected: boolean; stripeKey: string }) => void;
  userRole?: Role;
}

const Finance: React.FC<FinanceProps> = ({ paymentConfig, onSaveConfig, userRole = 'Admin' }) => {
  const toast = useToast();
  const { data: barbersData, refetch: refetchProfessionals } = useSupabaseQuery(fetchProfessionals);
  const { data: financialRecordsData } = useSupabaseQuery(fetchFinancialRecords);
  const { data: recurringExpensesData } = useSupabaseQuery(fetchRecurringExpenses);

  const barbers = barbersData || [];
  const transactions = financialRecordsData || [];
  const recurringExpenses = recurringExpensesData || [];

  // 🔧 DEBUG LOGS for data sources
  useEffect(() => {
    console.log('💰 [Finance] Data sources loaded:');
    console.log('  📋 Barbers/Professionals:', barbers.length, barbers);
    console.log('  📊 Financial Records (transactions):', transactions.length, transactions);
    console.log('  💸 Recurring Expenses:', recurringExpenses.length, recurringExpenses);
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
      console.log('  📋 Sample appointment:', data?.[0]);
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
        console.log('  📋 Sample Stripe details:', details.get(firstKey));
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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'commissions' | 'expenses' | 'goals' | 'nfse'>('dashboard');

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

  // Abacate Pay State
  const [paymentProvider, setPaymentProvider] = useState<'stripe' | 'abacatepay'>('stripe');
  const [abacatepayApiKey, setAbacatepayApiKey] = useState('');
  const [isAbacateConfigured, setIsAbacateConfigured] = useState(false);
  const [abacateKeyLastFour, setAbacateKeyLastFour] = useState('');

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

  // NFS-e State
  const [showNfseConfigModal, setShowNfseConfigModal] = useState(false);
  const [nfseConfigStep, setNfseConfigStep] = useState<'empresa' | 'certificado' | 'nfse'>('empresa');
  const [nfseConfig, setNfseConfig] = useState<any>(null);
  const [nfseHistory, setNfseHistory] = useState<any[]>([]);
  const [loadingNfse, setLoadingNfse] = useState(false);
  const [savingNfseConfig, setSavingNfseConfig] = useState(false);
  const [nfseEmpresaForm, setNfseEmpresaForm] = useState({
    cnpj: '',
    inscricao_municipal: '',
    razao_social: '',
    nome_fantasia: '',
    email: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    codigo_ibge: '',
    ambiente: 'homologacao' as 'homologacao' | 'producao'
  });
  const [nfseCertificadoFile, setNfseCertificadoFile] = useState<File | null>(null);
  const [nfseCertificadoSenha, setNfseCertificadoSenha] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);

  // Handlers para Brasil API
  const handleBuscarCep = async (cep: string) => {
    if (cep.replace(/\D/g, '').length !== 8) return;
    setLoadingCep(true);
    try {
      const data = await buscarCep(cep);
      if (data) {
        setNfseEmpresaForm(prev => ({
          ...prev,
          logradouro: data.street || prev.logradouro,
          bairro: data.neighborhood || prev.bairro,
          cidade: data.city || prev.cidade,
          uf: data.state || prev.uf,
          cep: formatarCep(cep)
        }));
        // Buscar código IBGE
        const codigoIbge = await buscarCodigoIbge(data.state, data.city);
        if (codigoIbge) {
          setNfseEmpresaForm(prev => ({ ...prev, codigo_ibge: codigoIbge }));
        }
        toast.success('Endereço preenchido automaticamente!');
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
    } finally {
      setLoadingCep(false);
    }
  };

  const handleBuscarCnpj = async (cnpj: string) => {
    if (cnpj.replace(/\D/g, '').length !== 14) return;
    setLoadingCnpj(true);
    try {
      const data = await buscarCnpj(cnpj);
      if (data) {
        setNfseEmpresaForm(prev => ({
          ...prev,
          cnpj: formatarCnpj(cnpj),
          razao_social: data.razao_social || prev.razao_social,
          email: data.email || prev.email,
          logradouro: data.logradouro || prev.logradouro,
          numero: data.numero || prev.numero,
          complemento: data.complemento || prev.complemento,
          bairro: data.bairro || prev.bairro,
          cidade: data.municipio || prev.cidade,
          uf: data.uf || prev.uf,
          cep: formatarCep(data.cep) || prev.cep
        }));
        // Buscar código IBGE
        if (data.uf && data.municipio) {
          const codigoIbge = await buscarCodigoIbge(data.uf, data.municipio);
          if (codigoIbge) {
            setNfseEmpresaForm(prev => ({ ...prev, codigo_ibge: codigoIbge }));
          }
        }
        toast.success('Dados da empresa preenchidos automaticamente!');
      } else {
        toast.error('CNPJ não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      toast.error('Erro ao buscar CNPJ');
    } finally {
      setLoadingCnpj(false);
    }
  };

  // Handler para cadastrar empresa na Nuvem Fiscal
  const handleCadastrarEmpresa = async () => {
    // Validações
    if (!nfseEmpresaForm.cnpj || !nfseEmpresaForm.razao_social) {
      toast.error('CNPJ e Razão Social são obrigatórios');
      return;
    }
    if (!nfseEmpresaForm.codigo_ibge) {
      toast.error('Código IBGE do município é obrigatório');
      return;
    }

    setSavingNfseConfig(true);
    try {
      const businessId = await getCurrentBusinessId();

      // Chamar Edge Function para cadastrar empresa na Nuvem Fiscal
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nfse-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'register_company',
          businessId,
          companyData: {
            cpf_cnpj: nfseEmpresaForm.cnpj.replace(/\D/g, ''),
            inscricao_municipal: nfseEmpresaForm.inscricao_municipal || null,
            razao_social: nfseEmpresaForm.razao_social,
            nome_fantasia: nfseEmpresaForm.nome_fantasia || nfseEmpresaForm.razao_social,
            email: nfseEmpresaForm.email,
            endereco: {
              logradouro: nfseEmpresaForm.logradouro,
              numero: nfseEmpresaForm.numero,
              complemento: nfseEmpresaForm.complemento || null,
              bairro: nfseEmpresaForm.bairro,
              codigo_municipio: nfseEmpresaForm.codigo_ibge,
              cidade: nfseEmpresaForm.cidade,
              uf: nfseEmpresaForm.uf,
              cep: nfseEmpresaForm.cep.replace(/\D/g, ''),
            },
            optante_simples_nacional: true, // Padrão para MEIs/pequenas empresas
          },
          ambiente: nfseEmpresaForm.ambiente,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao cadastrar empresa');
      }

      // Atualizar estado local com dados da empresa cadastrada
      setNfseConfig({
        ...nfseConfig,
        empresa_id: result.empresa_id,
        cnpj: nfseEmpresaForm.cnpj,
        ambiente: nfseEmpresaForm.ambiente,
        status: 'empresa_cadastrada',
      });

      // Mensagem apropriada baseada se empresa já existia
      if (result.already_existed) {
        toast.success('Empresa já estava cadastrada na Nuvem Fiscal! ✓');
      } else {
        toast.success('Empresa cadastrada com sucesso na Nuvem Fiscal!');
      }
      setNfseConfigStep('certificado');
    } catch (error: any) {
      console.error('Erro ao cadastrar empresa:', error);
      toast.error(error.message || 'Erro ao cadastrar empresa na Nuvem Fiscal');
    } finally {
      setSavingNfseConfig(false);
    }
  };

  // Handler para upload de certificado
  const handleUploadCertificado = async () => {
    if (!nfseCertificadoFile) {
      toast.error('Selecione um arquivo de certificado (.pfx ou .p12)');
      return;
    }
    if (!nfseCertificadoSenha) {
      toast.error('Digite a senha do certificado');
      return;
    }
    if (!nfseConfig?.empresa_id) {
      toast.error('Cadastre a empresa primeiro');
      return;
    }

    setSavingNfseConfig(true);
    try {
      const businessId = await getCurrentBusinessId();

      // Converter arquivo para base64
      const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const result = reader.result as string;
            // Remove o prefixo "data:application/x-pkcs12;base64," ou similar
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = error => reject(error);
        });
      };

      const certificadoBase64 = await fileToBase64(nfseCertificadoFile);

      // Chamar Edge Function para upload de certificado
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nfse-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'upload-certificado',
          businessId,
          empresaId: nfseConfig.cnpj.replace(/\D/g, ''),
          certificadoBase64,
          senha: nfseCertificadoSenha,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao fazer upload do certificado');
      }

      // Atualizar estado local
      setNfseConfig({
        ...nfseConfig,
        certificado_id: result.certificado_id,
        certificado_validade: result.validade,
        status: 'configurado',
      });

      toast.success('Certificado cadastrado com sucesso!');
      setNfseConfigStep('nfse');
      setShowNfseConfigModal(false);
    } catch (error: any) {
      console.error('Erro ao fazer upload do certificado:', error);
      toast.error(error.message || 'Erro ao fazer upload do certificado');
    } finally {
      setSavingNfseConfig(false);
    }
  };

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
    // Carregar configuração existente do Stripe e do Payment Provider
    const loadPaymentConfig = async () => {
      const { checkStripeConfigured, getKeyLastFour } = await import('../lib/stripeConfig');
      const configured = await checkStripeConfigured();

      if (configured) {
        setIsConfigured(true);
        const lastFour = await getKeyLastFour();
        setKeyLastFour(lastFour || '****');
        console.log('✅ [Finance] Stripe is configured (key not loaded for security)');
      }

      // Also load payment_provider setting from database
      try {
        const businessId = await getCurrentBusinessId();
        const { data } = await supabase
          .from('businesses')
          .select('payment_provider, abacatepay_api_key, nfse_config')
          .eq('id', businessId)
          .single();

        if (data?.payment_provider) {
          setPaymentProvider(data.payment_provider as 'stripe' | 'abacatepay');
        }
        if (data?.abacatepay_api_key) {
          setIsAbacateConfigured(true);
          setAbacateKeyLastFour(data.abacatepay_api_key.slice(-4));
        }
        // Carregar configuração NFS-e
        if (data?.nfse_config) {
          setNfseConfig(data.nfse_config);
          // Definir step inicial baseado no status
          if (data.nfse_config.status === 'configurado') {
            setNfseConfigStep('nfse');
          } else if (data.nfse_config.empresa_id) {
            setNfseConfigStep('certificado');
          }
        }
        console.log('✅ [Finance] Payment provider loaded:', data?.payment_provider);
        console.log('✅ [Finance] NFS-e config loaded:', data?.nfse_config);
      } catch (err) {
        console.error('Error loading payment provider:', err);
      }
    };

    loadPaymentConfig();
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
      toast.warning('Preencha ambas as chaves (Publishable e Secret)');
      return;
    }

    setIsSaving(true);

    try {
      const { saveStripeKeys } = await import('../lib/stripeConfig');
      const result = await saveStripeKeys(stripePublishableKey, stripeSecretKey);

      if (result) {
        setIsConfigured(true);
        toast.success('Chaves do Stripe salvas com sucesso!');
        console.log('✅ Stripe keys saved successfully');
      } else {
        toast.error('Erro: Verifique o formato das chaves');
      }
    } catch (error) {
      console.error('Error saving Stripe keys:', error);
      toast.error('Erro ao salvar configuração. Tente novamente.');
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
      toast.error('Erro ao exportar relatório. Tente novamente.');
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
      toast.error('Erro ao gerar holerite. Tente novamente.');
    }
  };

  // Handle save new expense
  const handleSaveExpense = async () => {
    if (!expenseForm.description || expenseForm.amount <= 0) {
      toast.warning('Preencha descrição e valor da despesa');
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
        toast.error('Erro ao salvar despesa. Tente novamente.');
      }
    } catch (error) {
      console.error('❌ [Finance] Error saving expense:', error);
      toast.error('Erro ao salvar despesa.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative pb-20">

      {/* Header Actions - Sticky */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-[var(--surface-card)]/95 backdrop-blur-sm p-4 rounded-xl border border-[var(--border-default)] sticky top-0 z-20">
        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
          <div className="bg-[var(--surface-subtle)] p-2 rounded-lg border border-[var(--border-default)] shrink-0">
            <Wallet size={20} className="text-[var(--brand-primary)]" />
          </div>
          Controle Financeiro
        </h2>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          {/* Navigation Tabs */}
          <div className="flex bg-[var(--surface-app)] rounded-lg p-1 border border-[var(--border-default)] overflow-x-auto">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-strong)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'}`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('commissions')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'commissions' ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-strong)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'}`}
            >
              Comissões
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'expenses' ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-strong)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'}`}
            >
              Despesas
            </button>
            <button
              onClick={() => setActiveTab('goals')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'goals' ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-strong)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'}`}
            >
              Metas
            </button>
            <button
              onClick={() => setActiveTab('nfse')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'nfse' ? 'bg-[var(--surface-card)] text-[var(--text-primary)] shadow-sm border border-[var(--border-strong)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]'}`}
            >
              <FileText size={14} />
              Fiscal
            </button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            {userRole === 'Admin' && (
              <button
                onClick={() => setShowConfig(true)}
                className={`flex-1 sm:flex-none bg-[var(--surface-subtle)] hover:bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border transition-colors ${isConfigured ? 'border-green-500/50 text-[var(--status-success)]' : 'border-[var(--border-default)]'}`}
              >
                {isConfigured ? <CheckCircle2 size={14} /> : <Settings size={14} />}
                {isConfigured ? 'Ativo' : 'Configurar'}
              </button>
            )}
            <button disabled className="flex-1 sm:flex-none bg-[var(--surface-subtle)] text-[var(--text-subtle)] px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-[var(--border-strong)] whitespace-nowrap cursor-not-allowed opacity-60">
              <Lock size={14} /> Fechar Caixa
              <span className="text-[10px] bg-[var(--brand)]/20 text-[var(--brand-primary)] px-1.5 py-0.5 rounded-full">Em breve</span>
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
              className="w-full sm:w-auto bg-green-500/10 hover:bg-green-500/20 text-[var(--status-success)] px-3 py-1.5 rounded-lg border border-green-500/30 text-xs font-bold flex items-center justify-center gap-2"
            >
              {isExporting === 'excel' ? <Sparkles className="animate-spin" size={14} /> : <Sheet size={14} />}
              Relatório Excel
            </button>
          </div>

          {/* AI Financial Insight - Premium Card (Em breve) */}
          <div className="bg-gradient-to-r from-purple-500/10 via-barber-900 to-indigo-500/10 border border-[var(--accent-purple)]/20 rounded-xl p-5 flex flex-col sm:flex-row items-start gap-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.1),transparent_50%)]" />
            <div className="bg-[var(--accent-purple)]/20 p-3 rounded-xl text-[var(--accent-purple)] shrink-0 relative z-10">
              <Sparkles size={24} />
            </div>
            <div className="flex-1 relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[var(--text-primary)] font-bold text-base">Análise Inteligente de Caixa</h3>
                <span className="text-[10px] bg-[var(--accent-purple)]/20 text-[var(--accent-purple)] px-2 py-0.5 rounded-full font-bold border border-purple-500/30">Em breve</span>
              </div>
              <p className="text-[var(--text-[var(--text-muted)])] text-sm">
                ⚡ Insights automáticos sobre seu fluxo de caixa, tendências e recomendações personalizadas.
              </p>
              <button disabled className="mt-3 text-xs text-[var(--accent-purple)] font-bold opacity-50 cursor-not-allowed">
                Ver análise completa →
              </button>
            </div>
          </div>

          {/* KPI Cards - Saldo Líquido primeiro e mais destacado */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* SALDO LÍQUIDO - Card Principal (Cor sólida premium) */}
            <div className="bg-amber-500 p-6 rounded-xl shadow-lg relative overflow-hidden">
              <div className="absolute -right-4 -top-4 opacity-10">
                <Wallet size={80} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <PieChart size={16} className="text-black/60" />
                <h3 className="text-black/60 text-sm font-bold uppercase">Saldo Líquido</h3>
              </div>
              {userRole === 'Admin' ? (
                <div className="text-3xl font-extrabold text-black">
                  {loading ? '...' : `R$ ${netBalance.toFixed(2)}`}
                </div>
              ) : (
                <div className="text-2xl font-extrabold text-black/50 flex items-center gap-2">
                  <Lock size={20} /> Restrito
                </div>
              )}
              <div className="mt-2 text-xs text-black/50 font-medium">
                Entradas − Saídas − Taxas
              </div>
            </div>

            {/* ENTRADAS */}
            <div className="bg-[var(--surface-card)] p-6 rounded-xl border border-[var(--border-default)] shadow-lg relative overflow-hidden group hover:border-green-500/30 transition-colors">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <DollarSign size={80} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight size={16} className="text-[var(--status-success)]" />
                <h3 className="text-[var(--text-[var(--text-muted)])] text-sm font-medium uppercase">Entradas</h3>
              </div>
              <div className="text-2xl font-bold text-[var(--status-success)]">
                {loading ? '...' : `R$ ${totalRevenue.toFixed(2)}`}
              </div>
              <div className="mt-2 text-xs text-[var(--text-subtle)]">{paidAppointments.length} pagamentos</div>
            </div>

            {/* SAÍDAS */}
            <div className="bg-[var(--surface-card)] p-6 rounded-xl border border-[var(--border-default)] shadow-lg relative overflow-hidden group hover:border-red-500/30 transition-colors">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet size={80} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight size={16} className="text-red-500" />
                <h3 className="text-[var(--text-[var(--text-muted)])] text-sm font-medium uppercase">Saídas</h3>
              </div>
              <div className="text-2xl font-bold text-red-500">
                {loading ? '...' : `R$ ${totalExpenses.toFixed(2)}`}
              </div>
              <div className="mt-2 text-xs text-[var(--text-subtle)]">{recurringExpenses.length} despesas</div>
            </div>

            {/* TAXAS STRIPE */}
            <div className="bg-[var(--surface-card)] p-6 rounded-xl border border-[var(--border-default)] shadow-lg relative overflow-hidden group hover:border-purple-500/30 transition-colors">
              <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <CreditCard size={80} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={16} className="text-[var(--accent-purple)]" />
                <h3 className="text-[var(--text-[var(--text-muted)])] text-sm font-medium uppercase">Taxas Stripe</h3>
              </div>
              {(() => {
                let totalFees = 0;
                stripePaymentDetails.forEach((details) => {
                  if (details?.fees?.stripeFee) {
                    totalFees += details.fees.stripeFee;
                  }
                });
                return (
                  <>
                    <div className="text-2xl font-bold text-[var(--accent-purple)]">
                      {loadingStripeDetails ? '...' : `-R$ ${totalFees.toFixed(2)}`}
                    </div>
                    <div className="mt-2 text-xs text-[var(--text-subtle)]">
                      {stripePaymentDetails.size} pagamentos online
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payment Methods Chart */}
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] p-6 rounded-xl shadow-lg">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                <CreditCard size={20} className="text-[var(--brand-primary)]" />
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
            <div className="lg:col-span-2 bg-[var(--surface-card)] border border-[var(--border-default)] p-6 rounded-xl shadow-lg flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Fluxo de Caixa Diário</h3>
                <div className="flex items-center gap-2">
                  {loadingStripeDetails && (
                    <span className="text-xs text-[var(--accent-purple)] flex items-center gap-1">
                      <div className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                      Sincronizando Stripe...
                    </span>
                  )}
                  <span className="text-xs text-[var(--text-subtle)]">{paidAppointments.length} transações</span>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto max-h-80">
                {paidAppointments.length === 0 ? (
                  <div className="text-center py-8 text-[var(--text-subtle)]">
                    <p>Nenhuma transação encontrada</p>
                    <p className="text-xs mt-1">Os pagamentos confirmados aparecerão aqui</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead className="sticky top-0 bg-[var(--surface-card)]">
                      <tr className="text-[var(--text-subtle)] text-xs uppercase border-b border-[var(--border-default)]">
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
                                style: 'border-blue-500/30 text-[var(--status-info)] bg-blue-500/10',
                                icon: 'card'
                              };
                            } else if (type === 'pix') {
                              return {
                                label: 'Pix',
                                sublabel: 'instantâneo',
                                style: 'border-green-500/30 text-[var(--status-success)] bg-green-500/10',
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
                          if (method === 'online') return { label: 'Stripe', sublabel: null, style: 'border-purple-500/30 text-[var(--accent-purple)] bg-[var(--accent-purple)]/10', icon: 'card' };
                          if (method === 'presential') return { label: 'Presencial', sublabel: null, style: 'border-green-500/30 text-[var(--status-success)] bg-green-500/10', icon: 'banknote' };
                          return { label: method, sublabel: null, style: 'border-gray-500/30 text-[var(--text-[var(--text-muted)])] bg-[var(--surface-subtle)]0/10', icon: 'circle' };
                        };

                        const paymentInfo = getPaymentInfo();
                        const stripeFee = stripeDetails?.fees?.stripeFee;

                        return (
                          <tr key={apt.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-subtle)]/20 transition-colors">
                            <td className="py-3 pl-2 text-[var(--text-[var(--text-muted)])] font-mono text-xs">
                              {dateStr} {timeStr}
                            </td>
                            <td className="py-3 text-[var(--text-primary)] font-medium">
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
                                  <span className="text-[10px] text-[var(--text-subtle)] mt-0.5">{paymentInfo.sublabel}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              {stripeFee ? (
                                <span className="text-xs text-[var(--status-error)]">-R$ {stripeFee.toFixed(2)}</span>
                              ) : (
                                <span className="text-xs text-[var(--text-subtle)]">-</span>
                              )}
                            </td>
                            <td className="py-3 text-right pr-2 font-bold text-[var(--status-success)]">
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

          {/* Barber Profitability Ranking */}
          {userRole === 'Admin' && (
            <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Trophy size={20} className="text-[var(--brand-primary)]" />
                  Ranking de Lucratividade
                </h3>
                <span className="text-xs text-[var(--text-subtle)]">{barberProfits.length} profissionais com faturamento</span>
              </div>

              {barberProfits.length === 0 ? (
                <div className="text-center py-8 text-[var(--text-subtle)]">
                  <p>Nenhum faturamento registrado este mês</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {barberProfits
                    .sort((a, b) => b.net - a.net)
                    .map((b, idx) => {
                      const isFirst = idx === 0;
                      const positionStyles = idx === 0
                        ? 'bg-[var(--brand-primary)] text-[var(--text-on-brand)]'
                        : idx === 1
                          ? 'bg-[var(--surface-hover)] text-[var(--text-secondary)]'
                          : idx === 2
                            ? 'bg-[var(--status-warning)]/20 text-[var(--status-warning)]'
                            : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]';

                      return (
                        <div
                          key={b.id}
                          className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:bg-[var(--surface-subtle)] ${isFirst
                            ? 'bg-[var(--brand-primary)]/5 border-[var(--brand-primary)]/30 ring-1 ring-[var(--brand-primary)]/20'
                            : 'bg-[var(--surface-app)] border-[var(--border-default)] hover:border-[var(--border-strong)]'
                            }`}
                        >
                          {/* Position Badge */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${positionStyles}`}>
                            {idx + 1}
                          </div>

                          {/* Name & Badge */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[var(--text-primary)] truncate">{b.name}</span>
                              {isFirst && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-primary)]/30">
                                  Mais Lucrativo
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-[var(--text-subtle)] mt-0.5">
                              {b.appointments} atendimentos • {b.commissionRate}% comissão
                            </div>
                          </div>

                          {/* Values */}
                          <div className="flex items-center gap-6 shrink-0">
                            <div className="text-right hidden sm:block">
                              <div className="text-xs text-[var(--text-subtle)]">Receita</div>
                              <div className="text-sm font-medium text-[var(--status-success)]">R$ {b.gross.toFixed(0)}</div>
                            </div>
                            <div className="text-right hidden sm:block">
                              <div className="text-xs text-[var(--text-subtle)]">Comissão</div>
                              <div className="text-sm font-medium text-[var(--status-error)]">R$ {b.costs.toFixed(0)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-[var(--text-subtle)]">Lucro</div>
                              <div className={`text-lg font-bold ${isFirst ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'}`}>
                                R$ {b.net.toFixed(0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Commission Calculator Tab (Payroll) */}
      {activeTab === 'commissions' && (
        <div className="animate-fade-in bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
            <Receipt className="text-[var(--brand-primary)]" /> Calculadora de Comissões (Holerite)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="text-xs text-[var(--text-subtle)] uppercase border-b border-[var(--border-default)] bg-[var(--surface-subtle)]">
                  <th className="p-3">Profissional</th>
                  <th className="p-3">Total Serviços</th>
                  <th className="p-3">Taxa (%)</th>
                  <th className="p-3 text-[var(--status-success)]">Valor Comissão</th>
                  <th className="p-3 text-[var(--status-info)]">+ Produtos</th>
                  <th className="p-3 text-[var(--status-warning)]">+ Caixinha</th>
                  <th className="p-3 text-[var(--status-error)]">- Taxas</th>
                  <th className="p-3 text-[var(--status-error)]">- Vales</th>
                  <th className="p-3 text-right font-bold text-[var(--text-primary)]">A Pagar</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[var(--border-default)]">
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
                    <tr key={barber.id} className="hover:bg-[var(--surface-subtle)]/30 transition-colors">
                      <td className="p-3 font-medium text-[var(--text-primary)] flex items-center gap-2">
                        {barber.avatar_url ? (
                          <img src={barber.avatar_url} className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[var(--brand)]/20 flex items-center justify-center text-[var(--brand-primary)] text-xs font-bold">
                            {barber.name?.charAt(0)}
                          </div>
                        )}
                        {barber.name}
                        <span className="text-xs text-[var(--text-subtle)]">({barberAppointments.length} atend.)</span>
                      </td>
                      <td className="p-3">R$ {totalServices.toFixed(2)}</td>
                      <td className="p-3">{commissionRate}%</td>
                      <td className="p-3 font-bold text-[var(--status-success)]">R$ {commissionValue.toFixed(2)}</td>
                      <td className="p-3 text-[var(--status-info)] text-[var(--text-subtle)]">R$ {productCommission.toFixed(2)}</td>
                      <td className="p-3 text-[var(--status-warning)] text-[var(--text-subtle)]">R$ {tips.toFixed(2)}</td>
                      <td className="p-3 text-[var(--status-error)] text-[var(--text-subtle)]">- R$ {cardFees.toFixed(2)}</td>
                      <td className="p-3 text-[var(--status-error)] text-[var(--text-subtle)]">- R$ {advances.toFixed(2)}</td>
                      <td className="p-3 text-right font-bold text-[var(--brand-primary)] text-base border-l border-[var(--border-default)] bg-[var(--surface-app)]/30">
                        R$ {netPay.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handlePrintPayslip(barber)}
                          className="p-1.5 hover:bg-[var(--surface-hover)] rounded text-[var(--text-[var(--text-muted)])] hover:text-[var(--text-primary)]" title="Imprimir Holerite"
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
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <CreditCard className="text-red-500" /> Despesas Recorrentes (Contas Fixas)
              </h3>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
              >
                + Nova Despesa
              </button>
            </div>

            {recurringExpenses.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[var(--surface-subtle)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt size={32} className="text-[var(--text-subtle)]" />
                </div>
                <h4 className="text-[var(--text-primary)] font-bold text-lg mb-2">Nenhuma despesa cadastrada</h4>
                <p className="text-[var(--text-subtle)] text-sm mb-4 max-w-md mx-auto">
                  Cadastre suas despesas fixas mensais como aluguel, energia, água, internet e outras contas para ter um controle completo do seu fluxo de caixa.
                </p>
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand)]/90 text-black px-4 py-2 rounded-lg text-sm font-bold"
                >
                  + Adicionar Primeira Despesa
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {recurringExpenses.map(expense => (
                  <div key={expense.id} className="bg-[var(--surface-subtle)] border border-[var(--border-default)] p-4 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between group hover:border-[var(--border-strong)] transition-colors gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${expense.is_active ? 'bg-red-500/10 text-red-500' : 'bg-gray-800 text-[var(--text-subtle)]'}`}>
                        <Wallet size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-[var(--text-primary)]">{expense.description}</h4>
                        <p className="text-xs text-[var(--text-subtle)]">Vence dia {expense.day_of_month} • Categoria: {expense.category || 'Outros'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto">
                      <div className="text-right">
                        <div className="font-bold text-[var(--text-primary)]">R$ {Number(expense.amount).toFixed(2)}</div>
                        <div className="text-[10px] text-[var(--text-subtle)] uppercase font-bold">Mensal</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={expense.is_active} className="sr-only peer" readOnly />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--surface-card)] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
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
              <div className="bg-gradient-to-r from-[var(--surface-card)] to-[var(--surface-app)] border border-[var(--border-default)] rounded-xl p-6 shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 p-8 opacity-5 pointer-events-none">
                  <Target size={120} />
                </div>
                <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6">
                  <div className="flex-1 w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 gap-2">
                      <div>
                        <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                          <Target className="text-[var(--brand-primary)]" size={20} /> Meta {goalPeriodLabels[goalPeriod]} do Estabelecimento
                        </h2>
                        <p className="text-xs text-[var(--text-[var(--text-muted)])]">
                          {businessGoal > 0
                            ? `Meta ${goalPeriodLabels[goalPeriod].toLowerCase()} definida pelo administrador`
                            : `Soma das metas dos profissionais (R$ ${professionalsGoalSum.toLocaleString('pt-BR')})`
                          }
                        </p>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0 bg-[var(--surface-app)]/50 p-2 rounded-lg sm:bg-transparent sm:p-0">
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
                                    ? 'bg-[var(--brand-primary)] text-black'
                                    : 'bg-[var(--surface-subtle)] text-[var(--text-[var(--text-muted)])] hover:bg-[var(--surface-hover)]'
                                    }`}
                                >
                                  {period === 1 ? '1 Mês' : `${period} Meses`}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-2xl font-bold text-[var(--text-primary)]">R$ {currentRevenue.toLocaleString('pt-BR')}</div>
                            <div className="text-xs text-[var(--text-subtle)]">Meta: R$ {totalGoal.toLocaleString('pt-BR')}</div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-4 w-full bg-[var(--surface-subtle)] rounded-full border border-[var(--border-default)] overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-1000 ease-out relative"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs font-medium">
                      <span className="text-[var(--status-success)]">{progress.toFixed(1)}% Atingido</span>
                      <span className="text-[var(--text-subtle)]">Faltam R$ {Math.max(0, totalGoal - currentRevenue).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex w-full lg:w-auto items-center justify-between lg:justify-start gap-4 lg:border-l lg:border-[var(--border-default)] lg:pl-6 pt-4 lg:pt-0 border-t border-[var(--border-default)] lg:border-t-0">
                    <div className="text-center flex-1 lg:flex-none">
                      <div className="text-xs text-[var(--text-subtle)] uppercase font-bold">Projeção</div>
                      <div className="text-xl font-bold text-[var(--status-info)]">R$ {(projection / 1000).toFixed(1)}k</div>
                    </div>
                    <div className="text-center flex-1 lg:flex-none">
                      <div className="text-xs text-[var(--text-subtle)] uppercase font-bold">Média Dia</div>
                      <div className="text-xl font-bold text-[var(--brand-primary)]">R$ {dailyAverage.toFixed(0)}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Professional Goals List */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <TrendingUp className="text-[var(--status-success)]" /> Metas por Profissional
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
                  className="bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
                >
                  <Edit2 size={16} /> Editar Metas
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setGoalsEditing(false)}
                    className="bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] px-4 py-2 rounded-lg text-sm font-bold"
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

                        toast.success('Metas salvas com sucesso!');
                      } catch (error) {
                        console.error('Error saving goals:', error);
                        toast.error('Erro ao salvar metas');
                      } finally {
                        setSavingGoals(false);
                      }
                    }}
                    disabled={savingGoals}
                    className="bg-[var(--brand-primary)] hover:bg-[var(--brand)]/90 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
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
                  <div key={barber.id} className="bg-[var(--surface-subtle)] border border-[var(--border-default)] p-4 rounded-lg hover:border-[var(--border-strong)] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[var(--brand-primary)] rounded-full flex items-center justify-center text-black font-bold">
                          {barber.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-[var(--text-primary)]">{barber.name}</div>
                          <div className="text-xs text-[var(--text-subtle)]">{barber.specialty || 'Profissional'}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-1 justify-end">
                        {/* Progress */}
                        <div className="hidden sm:block flex-1 max-w-[200px]">
                          <div className="h-2 bg-[var(--surface-subtle)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : progress >= 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-[var(--text-subtle)] mt-1 text-center">
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
                              <div className="text-lg font-bold text-[var(--text-primary)]">R$ {goal.toLocaleString('pt-BR')}</div>
                              <div className="text-[10px] text-[var(--text-subtle)] uppercase">Meta Mensal</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Progress */}
                    <div className="sm:hidden mt-3">
                      <div className="h-2 bg-[var(--surface-subtle)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : progress >= 70 ? 'bg-yellow-500' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-[var(--text-subtle)] mt-1">
                        {progress.toFixed(0)}% atingido • R$ {barberRevenue.toLocaleString('pt-BR')} / R$ {goal.toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {barbers.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[var(--surface-subtle)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target size={32} className="text-[var(--text-subtle)]" />
                </div>
                <h4 className="text-[var(--text-primary)] font-bold text-lg mb-2">Nenhum profissional cadastrado</h4>
                <p className="text-[var(--text-subtle)] text-sm">Cadastre profissionais na aba Equipe para definir metas individuais.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NFS-e / Fiscal Tab */}
      {activeTab === 'nfse' && (
        <div className="animate-fade-in space-y-6">
          {/* Status Fiscal Card */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-[var(--text-primary)]">Status Fiscal</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${nfseConfig?.status === 'ativo'
                    ? 'bg-green-500/20 text-[var(--status-success)] border border-green-500/30'
                    : 'bg-[var(--status-warning)]/20 text-[var(--status-warning)] border border-[var(--status-warning)]/30'
                    }`}>
                    {nfseConfig?.status === 'ativo' ? 'Ativo' : 'Pendente'}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-subtle)] mt-1">
                  Complete a configuração para emitir notas fiscais automaticamente
                </p>
              </div>
              <button
                onClick={() => {
                  setShowNfseConfigModal(true);
                  setNfseConfigStep('empresa');
                }}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                Configurar
              </button>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Empresa Card */}
              <div
                onClick={() => {
                  setNfseConfigStep('empresa');
                  setShowNfseConfigModal(true);
                }}
                className={`bg-[var(--surface-subtle)] border rounded-xl p-4 text-center cursor-pointer hover:bg-[var(--surface-hover)] transition-colors ${(nfseConfig?.empresa_id || nfseConfig?.cnpj) ? 'border-green-500/30' : 'border-[var(--border-default)]'
                  }`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FileText size={20} className="text-[var(--text-muted)]" />
                  {(nfseConfig?.empresa_id || nfseConfig?.cnpj) ? (
                    <CheckCircle2 size={16} className="text-[var(--status-success)]" />
                  ) : (
                    <X size={16} className="text-[var(--text-subtle)]" />
                  )}
                </div>
                <div className="font-bold text-[var(--text-primary)]">Empresa</div>
                <div className="text-xs text-[var(--text-subtle)]">
                  {nfseConfig?.cnpj || nfseConfig?.empresa_id || 'Pendente'}
                </div>
                {(nfseConfig?.empresa_id || nfseConfig?.cnpj) && !nfseConfig?.certificado_id && (
                  <div className="mt-2 text-xs text-[var(--brand-primary)] font-bold">
                    Próximo: Certificado →
                  </div>
                )}
              </div>

              {/* Certificado Card */}
              <div
                onClick={() => {
                  if (nfseConfig?.empresa_id || nfseConfig?.cnpj) {
                    setNfseConfigStep('certificado');
                    setShowNfseConfigModal(true);
                  } else {
                    toast.error('Complete o cadastro da empresa primeiro');
                  }
                }}
                className={`bg-[var(--surface-subtle)] border rounded-xl p-4 text-center cursor-pointer hover:bg-[var(--surface-hover)] transition-colors ${nfseConfig?.certificado_id ? 'border-green-500/30' : 'border-[var(--border-default)]'
                  }`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ShieldCheck size={20} className="text-[var(--text-muted)]" />
                  {nfseConfig?.certificado_id ? (
                    <CheckCircle2 size={16} className="text-[var(--status-success)]" />
                  ) : (
                    <X size={16} className="text-[var(--text-subtle)]" />
                  )}
                </div>
                <div className="font-bold text-[var(--text-primary)]">Certificado A1</div>
                <div className="text-xs text-[var(--text-subtle)]">
                  {nfseConfig?.certificado_id ? 'Configurado' : 'Pendente'}
                </div>
                {nfseConfig?.certificado_id && nfseConfig?.status !== 'configurado' && (
                  <div className="mt-2 text-xs text-[var(--brand-primary)] font-bold">
                    Próximo: Configuração →
                  </div>
                )}
              </div>

              {/* Config NFS-e Card */}
              <div
                onClick={() => {
                  if (nfseConfig?.certificado_id) {
                    setNfseConfigStep('nfse');
                    setShowNfseConfigModal(true);
                  } else {
                    toast.error('Complete o upload do certificado primeiro');
                  }
                }}
                className={`bg-[var(--surface-subtle)] border rounded-xl p-4 text-center cursor-pointer hover:bg-[var(--surface-hover)] transition-colors ${nfseConfig?.status === 'configurado' ? 'border-green-500/30' : 'border-[var(--border-default)]'
                  }`}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Settings size={20} className="text-[var(--text-muted)]" />
                  {nfseConfig?.status === 'configurado' ? (
                    <CheckCircle2 size={16} className="text-[var(--status-success)]" />
                  ) : (
                    <X size={16} className="text-[var(--text-subtle)]" />
                  )}
                </div>
                <div className="font-bold text-[var(--text-primary)]">Config NFS-e</div>
                <div className="text-xs text-[var(--text-subtle)]">
                  {nfseConfig?.status === 'configurado' ? 'Configurado' : 'Pendente'}
                </div>
              </div>
            </div>

            {/* Ambiente Badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-subtle)]">Ambiente:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${nfseConfig?.ambiente === 'producao'
                ? 'bg-[var(--brand-primary)] text-white'
                : 'bg-[var(--status-warning)]/20 text-[var(--status-warning)] border border-[var(--status-warning)]/30'
                }`}>
                {nfseConfig?.ambiente === 'producao' ? 'Produção' : 'Homologação'}
              </span>
            </div>
          </div>

          {/* Notas Fiscais Emitidas */}
          <div className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <FileText size={20} className="text-[var(--text-muted)]" />
                  Notas Fiscais Emitidas
                </h3>
                <p className="text-sm text-[var(--text-subtle)]">
                  Histórico de NFS-e emitidas automaticamente
                </p>
              </div>
              <button
                onClick={() => {/* TODO: Reload history */ }}
                className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowUpRight size={16} />
                Atualizar
              </button>
            </div>

            {nfseHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-[var(--surface-subtle)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText size={32} className="text-[var(--text-subtle)]" />
                </div>
                <h4 className="text-[var(--text-primary)] font-bold text-lg mb-2">Nenhuma nota fiscal emitida ainda</h4>
                <p className="text-[var(--text-subtle)] text-sm">
                  As notas aparecerão aqui após pagamentos confirmados
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="text-xs text-[var(--text-subtle)] uppercase border-b border-[var(--border-default)] bg-[var(--surface-subtle)]">
                      <th className="p-3">Data</th>
                      <th className="p-3">Número</th>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Valor</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-[var(--border-subtle)]">
                    {nfseHistory.map(nota => (
                      <tr key={nota.id} className="hover:bg-[var(--surface-subtle)]/30">
                        <td className="p-3 text-[var(--text-muted)]">
                          {new Date(nota.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3 font-mono text-[var(--text-primary)]">{nota.numero}</td>
                        <td className="p-3 text-[var(--text-primary)]">{nota.cliente_nome}</td>
                        <td className="p-3 text-[var(--status-success)] font-bold">
                          R$ {Number(nota.valor).toFixed(2)}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${nota.status === 'autorizada'
                            ? 'bg-green-500/20 text-[var(--status-success)]'
                            : nota.status === 'cancelada'
                              ? 'bg-red-500/20 text-[var(--status-error)]'
                              : 'bg-[var(--status-warning)]/20 text-[var(--status-warning)]'
                            }`}>
                            {nota.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => window.open(nota.pdf_url, '_blank')}
                            className="text-[var(--brand-primary)] hover:text-[var(--brand-light)] text-xs font-bold"
                          >
                            PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Configuration Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--surface-card)] w-full max-w-md rounded-xl border border-[var(--border-default)] shadow-2xl relative overflow-hidden">
            <div className="p-6 border-b border-[var(--border-default)] flex justify-between items-center bg-[var(--surface-subtle)]">
              <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <ShieldCheck className="text-[var(--brand-primary)]" /> Gateway de Pagamento
              </h3>
              <button onClick={() => { setShowConfig(false); setStripeSecretKey(''); setAbacatepayApiKey(''); }} className="text-[var(--text-[var(--text-muted)])] hover:text-[var(--text-primary)]">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Provider Selector */}
              <div>
                <label className="text-xs text-[var(--text-[var(--text-muted)])] uppercase font-bold block mb-2">
                  Provedor de Pagamento
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPaymentProvider('stripe')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${paymentProvider === 'stripe'
                      ? 'bg-[var(--accent-purple)]/20 border-2 border-purple-500 text-[var(--accent-purple)]'
                      : 'bg-[var(--surface-subtle)] border border-[var(--border-strong)] text-[var(--text-[var(--text-muted)])] hover:border-[var(--border-strong)]'
                      }`}
                  >
                    <CreditCard size={16} />
                    Stripe
                  </button>
                  <button
                    onClick={() => setPaymentProvider('abacatepay')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${paymentProvider === 'abacatepay'
                      ? 'bg-green-500/20 border-2 border-green-500 text-[var(--status-success)]'
                      : 'bg-[var(--surface-subtle)] border border-[var(--border-strong)] text-[var(--text-[var(--text-muted)])] hover:border-[var(--border-strong)]'
                      }`}
                  >
                    🥑 Abacate Pay
                  </button>
                </div>
              </div>

              {/* Stripe Config */}
              {paymentProvider === 'stripe' && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-[var(--surface-subtle)] rounded-lg border border-purple-500/30">
                    <div className="w-10 h-10 bg-[#635BFF] rounded flex items-center justify-center font-bold text-[var(--text-primary)] italic">S</div>
                    <div>
                      <div className="font-bold text-[var(--text-primary)]">Stripe Payments</div>
                      <div className="text-xs text-[var(--text-[var(--text-muted)])]">Cartão de crédito</div>
                    </div>
                    {isConfigured && <CheckCircle2 className="ml-auto text-[var(--status-success)]" size={20} />}
                  </div>

                  {isConfigured ? (
                    <div className="space-y-4">
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-[var(--status-success)] font-bold text-sm mb-2">
                          <CheckCircle2 size={16} /> Stripe Configurado
                        </div>
                        <div className="flex items-center gap-2 text-[var(--text-[var(--text-muted)])] text-xs">
                          <Lock size={12} />
                          <span>Chave terminando em: <span className="font-mono text-[var(--text-primary)]">****{keyLastFour}</span></span>
                        </div>
                      </div>

                      <div className="bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-lg p-4">
                        <div className="flex items-center gap-2 text-[var(--status-warning)] text-sm font-bold mb-3">
                          <Key size={14} /> Substituir Chave API
                        </div>
                        <input
                          type="password"
                          value={stripeSecretKey}
                          onChange={(e) => setStripeSecretKey(e.target.value)}
                          placeholder="sk_live_... (nova chave)"
                          className="w-full bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-sm focus:border-purple-500 outline-none placeholder:text-[var(--text-subtle)]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                        <Key size={14} /> API Key (Secret Key)
                      </label>
                      <input
                        type="password"
                        value={stripeSecretKey}
                        onChange={(e) => setStripeSecretKey(e.target.value)}
                        placeholder="sk_live_..."
                        className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg pl-4 pr-4 py-3 text-sm focus:border-purple-500 outline-none"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Abacate Pay Config */}
              {paymentProvider === 'abacatepay' && (
                <>
                  <div className="flex items-center gap-3 p-3 bg-[var(--surface-subtle)] rounded-lg border border-green-500/30">
                    <div className="w-10 h-10 bg-green-600 rounded flex items-center justify-center text-2xl">🥑</div>
                    <div>
                      <div className="font-bold text-[var(--text-primary)]">Abacate Pay</div>
                      <div className="text-xs text-[var(--text-[var(--text-muted)])]">PIX + Cartão de crédito</div>
                    </div>
                    {isAbacateConfigured && <CheckCircle2 className="ml-auto text-[var(--status-success)]" size={20} />}
                  </div>

                  {isAbacateConfigured ? (
                    <div className="space-y-4">
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-[var(--status-success)] font-bold text-sm mb-2">
                          <CheckCircle2 size={16} /> Abacate Pay Configurado
                        </div>
                        <div className="flex items-center gap-2 text-[var(--text-[var(--text-muted)])] text-xs">
                          <Lock size={12} />
                          <span>Chave terminando em: <span className="font-mono text-[var(--text-primary)]">****{abacateKeyLastFour}</span></span>
                        </div>
                      </div>

                      <div className="bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-lg p-4">
                        <div className="flex items-center gap-2 text-[var(--status-warning)] text-sm font-bold mb-3">
                          <Key size={14} /> Substituir Chave API
                        </div>
                        <input
                          type="password"
                          value={abacatepayApiKey}
                          onChange={(e) => setAbacatepayApiKey(e.target.value)}
                          placeholder="abkt_... (nova chave)"
                          className="w-full bg-[var(--surface-card)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-sm focus:border-green-500 outline-none placeholder:text-[var(--text-subtle)]"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-[var(--text-secondary)] flex items-center gap-2">
                        <Key size={14} /> API Key
                      </label>
                      <input
                        type="password"
                        value={abacatepayApiKey}
                        onChange={(e) => setAbacatepayApiKey(e.target.value)}
                        placeholder="abkt_..."
                        className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg pl-4 pr-4 py-3 text-sm focus:border-green-500 outline-none"
                      />
                      <p className="text-xs text-[var(--text-subtle)]">
                        Obtenha sua chave em <a href="https://abacatepay.com/app" target="_blank" rel="noopener noreferrer" className="text-[var(--status-success)] hover:underline">abacatepay.com/app</a>
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Aviso de segurança */}
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
                <Lock size={14} className="text-[var(--status-warning)] shrink-0 mt-0.5" />
                <p className="text-[10px] text-[var(--status-warning)]/80">
                  <strong>Segurança:</strong> Sua chave API nunca é exibida após ser salva. Apenas os últimos 4 caracteres são mostrados para identificação.
                </p>
              </div>

              <button
                onClick={async () => {
                  const apiKey = paymentProvider === 'stripe' ? stripeSecretKey : abacatepayApiKey;
                  if (!apiKey) {
                    toast.warning('Digite a chave API para salvar');
                    return;
                  }
                  setIsSaving(true);
                  try {
                    const businessId = await getCurrentBusinessId();

                    if (paymentProvider === 'stripe') {
                      // Save Stripe key using existing method
                      const { saveStripeKeys } = await import('../lib/stripeConfig');
                      const result = await saveStripeKeys(stripeSecretKey.replace('sk_', 'pk_'), stripeSecretKey);
                      if (result) {
                        // Also save payment_provider
                        await supabase
                          .from('businesses')
                          .update({ payment_provider: 'stripe' })
                          .eq('id', businessId);

                        setIsConfigured(true);
                        setKeyLastFour(stripeSecretKey.slice(-4));
                        setStripeSecretKey('');
                        toast.success('Stripe configurado com sucesso!');
                      } else {
                        toast.error('Erro: Verifique o formato da chave');
                      }
                    } else {
                      // Save Abacate Pay key
                      const { error } = await supabase
                        .from('businesses')
                        .update({
                          payment_provider: 'abacatepay',
                          abacatepay_api_key: abacatepayApiKey,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', businessId);

                      if (error) throw error;

                      setIsAbacateConfigured(true);
                      setAbacateKeyLastFour(abacatepayApiKey.slice(-4));
                      setAbacatepayApiKey('');
                      toast.success('Abacate Pay configurado com sucesso!');
                    }
                  } catch (error) {
                    console.error('Error saving payment config:', error);
                    toast.error('Erro ao salvar configuração');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                disabled={isSaving || (paymentProvider === 'stripe' ? !stripeSecretKey : !abacatepayApiKey)}
                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${paymentProvider === 'stripe'
                  ? 'bg-purple-600 hover:bg-purple-700 text-[var(--text-primary)]'
                  : 'bg-green-600 hover:bg-green-700 text-[var(--text-primary)]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verificando...
                  </>
                ) : (
                  <>
                    <Key size={16} />
                    Salvar Configuração
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">Nova Despesa Recorrente</h2>
                <p className="text-xs text-[var(--text-subtle)]">Cadastre uma conta fixa mensal</p>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-[var(--text-[var(--text-muted)])] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--surface-subtle)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Descrição *</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="Ex: Aluguel do salão"
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Categoria</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                >
                  {expenseCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Valor Mensal (R$) *</label>
                <input
                  type="number"
                  value={expenseForm.amount || ''}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                  min="0"
                  step="0.01"
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                />
              </div>

              {/* Day of Month */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Dia do Vencimento</label>
                <select
                  value={expenseForm.day_of_month}
                  onChange={(e) => setExpenseForm({ ...expenseForm, day_of_month: parseInt(e.target.value) })}
                  className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>Dia {day}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[var(--border-default)] flex gap-3 justify-end">
              <button
                onClick={() => setShowExpenseModal(false)}
                className="px-4 py-2 text-sm text-[var(--text-[var(--text-muted)])] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveExpense}
                disabled={isSavingExpense}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand)]/90 text-black px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
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

      {/* NFS-e Configuration Modal */}
      {showNfseConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between sticky top-0 bg-[var(--surface-card)] z-10">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Configuração Fiscal</h2>
              <button
                onClick={() => {
                  setShowNfseConfigModal(false);
                  setNfseConfigStep('empresa');
                }}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--surface-subtle)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper */}
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-[var(--border-default)] flex items-center justify-center gap-1 sm:gap-4">
              <button
                onClick={() => setNfseConfigStep('empresa')}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${nfseConfigStep === 'empresa'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : (nfseConfig?.empresa_id || nfseConfig?.cnpj)
                    ? 'bg-green-500/20 text-[var(--status-success)] border border-green-500/30'
                    : 'bg-[var(--surface-subtle)] text-[var(--text-muted)]'
                  }`}
              >
                {(nfseConfig?.empresa_id || nfseConfig?.cnpj) ? <CheckCircle2 size={14} className="sm:w-4 sm:h-4" /> : <FileText size={14} className="sm:w-4 sm:h-4" />}
                <span>Empresa</span>
              </button>
              <div className="w-4 sm:w-8 h-0.5 bg-[var(--border-default)]" />
              <button
                onClick={() => {
                  if (nfseConfig?.empresa_id || nfseConfig?.cnpj) {
                    setNfseConfigStep('certificado');
                  } else {
                    toast.error('Complete o cadastro da empresa primeiro');
                  }
                }}
                disabled={!(nfseConfig?.empresa_id || nfseConfig?.cnpj)}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${nfseConfigStep === 'certificado'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : nfseConfig?.certificado_id
                    ? 'bg-green-500/20 text-[var(--status-success)] border border-green-500/30'
                    : (nfseConfig?.empresa_id || nfseConfig?.cnpj)
                      ? 'bg-[var(--surface-subtle)] text-[var(--text-muted)] cursor-pointer'
                      : 'bg-[var(--surface-subtle)] text-[var(--text-subtle)] cursor-not-allowed opacity-50'
                  }`}
              >
                {nfseConfig?.certificado_id ? <CheckCircle2 size={14} className="sm:w-4 sm:h-4" /> : <ShieldCheck size={14} className="sm:w-4 sm:h-4" />}
                <span>Certificado</span>
              </button>
              <div className="w-4 sm:w-8 h-0.5 bg-[var(--border-default)]" />
              <button
                onClick={() => {
                  if (nfseConfig?.certificado_id) {
                    setNfseConfigStep('nfse');
                  } else {
                    toast.error('Complete o upload do certificado primeiro');
                  }
                }}
                disabled={!nfseConfig?.certificado_id}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${nfseConfigStep === 'nfse'
                  ? 'bg-[var(--brand-primary)] text-white'
                  : nfseConfig?.status === 'configurado'
                    ? 'bg-green-500/20 text-[var(--status-success)] border border-green-500/30'
                    : nfseConfig?.certificado_id
                      ? 'bg-[var(--surface-subtle)] text-[var(--text-muted)] cursor-pointer'
                      : 'bg-[var(--surface-subtle)] text-[var(--text-subtle)] cursor-not-allowed opacity-50'
                  }`}
              >
                <Settings size={14} className="sm:w-4 sm:h-4" />
                <span className="whitespace-nowrap">NFS-e</span>
              </button>
            </div>

            {/* Step Content */}
            <div className="p-6">
              {/* Step 1: Empresa */}
              {nfseConfigStep === 'empresa' && (
                <div className="space-y-6 animate-fade-in">

                  {/* Empresa já configurada */}
                  {(nfseConfig?.empresa_id || nfseConfig?.cnpj) ? (
                    <div className="space-y-4">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <CheckCircle2 size={24} className="text-[var(--status-success)]" />
                          <div>
                            <h4 className="text-sm font-bold text-[var(--text-primary)]">Empresa Cadastrada</h4>
                            <p className="text-xs text-[var(--text-muted)]">Os dados da empresa estão configurados na Nuvem Fiscal</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-3 border-t border-green-500/20">
                          <div>
                            <span className="text-xs text-[var(--text-muted)]">CNPJ</span>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-[var(--text-primary)]">{nfseConfig?.cnpj || nfseConfig?.empresa_id}</p>
                              <button
                                onClick={() => {
                                  // Reset config to allow editing - must clear both empresa_id AND cnpj
                                  const currentCnpj = nfseConfig?.cnpj || '';
                                  setNfseConfig((prev: any) => ({ ...prev, empresa_id: null, cnpj: null, status: null }));
                                  setNfseEmpresaForm(f => ({ ...f, cnpj: currentCnpj }));
                                }}
                                className="p-1 rounded hover:bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                title="Editar CNPJ"
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-[var(--text-muted)]">Status</span>
                            <p className="text-sm font-bold text-[var(--status-success)]">Configurado ✓</p>
                          </div>
                        </div>
                      </div>

                      {/* Botões de ação */}
                      <div className="flex justify-between items-center pt-2">
                        <button
                          onClick={() => setShowNfseConfigModal(false)}
                          className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          Fechar
                        </button>
                        <button
                          onClick={() => setNfseConfigStep('certificado')}
                          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white px-6 py-2 rounded-lg text-sm font-bold"
                        >
                          Continuar para Certificado →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Seção 1: Busca CNPJ */}
                      <div className="bg-[var(--surface-subtle)] rounded-xl p-4 border border-[var(--border-default)]">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                          <FileText size={16} className="text-[var(--brand-primary)]" />
                          Dados da Empresa
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">CNPJ</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={nfseEmpresaForm.cnpj}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '');
                                  if (value.length <= 14) {
                                    const formatted = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
                                    setNfseEmpresaForm({ ...nfseEmpresaForm, cnpj: value.length === 14 ? formatted : value });
                                    if (value.length === 14) handleBuscarCnpj(value);
                                  }
                                }}
                                placeholder="Digite o CNPJ"
                                className="flex-1 bg-zinc-900 border border-zinc-700 text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:border-[var(--brand-primary)] outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleBuscarCnpj(nfseEmpresaForm.cnpj)}
                                disabled={loadingCnpj || nfseEmpresaForm.cnpj.replace(/\D/g, '').length !== 14}
                                className="px-4 bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-black rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                              >
                                {loadingCnpj ? (
                                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  'Buscar'
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Dados preenchidos após busca */}
                          {nfseEmpresaForm.razao_social && (
                            <div className="grid grid-cols-1 gap-3 pt-2 border-t border-[var(--border-default)]">
                              <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Razão Social</label>
                                <input
                                  type="text"
                                  value={nfseEmpresaForm.razao_social}
                                  onChange={(e) => setNfseEmpresaForm({ ...nfseEmpresaForm, razao_social: e.target.value })}
                                  className="w-full bg-zinc-900 border border-zinc-700 text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:border-[var(--brand-primary)] outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Nome Fantasia</label>
                                <input
                                  type="text"
                                  value={nfseEmpresaForm.nome_fantasia}
                                  onChange={(e) => setNfseEmpresaForm({ ...nfseEmpresaForm, nome_fantasia: e.target.value })}
                                  placeholder="Deixe em branco para usar a Razão Social"
                                  className="w-full bg-zinc-900 border border-zinc-700 text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:border-[var(--brand-primary)] outline-none"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Email</label>
                                  <input
                                    type="email"
                                    value={nfseEmpresaForm.email}
                                    onChange={(e) => setNfseEmpresaForm({ ...nfseEmpresaForm, email: e.target.value })}
                                    placeholder="email@empresa.com"
                                    className="w-full bg-zinc-900 border border-zinc-700 text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:border-[var(--brand-primary)] outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Inscrição Municipal</label>
                                  <input
                                    type="text"
                                    value={nfseEmpresaForm.inscricao_municipal}
                                    onChange={(e) => setNfseEmpresaForm({ ...nfseEmpresaForm, inscricao_municipal: e.target.value })}
                                    placeholder="Opcional"
                                    className="w-full bg-zinc-900 border border-zinc-700 text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:border-[var(--brand-primary)] outline-none"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Seção 2: Endereço (aparece após preencher CNPJ) */}
                      {nfseEmpresaForm.razao_social && (
                        <div className="bg-[var(--surface-subtle)] rounded-xl p-4 border border-[var(--border-default)]">
                          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                            <ArrowUpRight size={16} className="text-[var(--brand-primary)]" />
                            Endereço
                          </h4>
                          <div className="space-y-3">
                            {/* CEP */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="col-span-2">
                                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">CEP</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={nfseEmpresaForm.cep}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, '');
                                      if (value.length <= 8) {
                                        const formatted = value.length === 8 ? `${value.slice(0, 5)}-${value.slice(5)}` : value;
                                        setNfseEmpresaForm({ ...nfseEmpresaForm, cep: formatted });
                                        if (value.length === 8) handleBuscarCep(value);
                                      }
                                    }}
                                    placeholder="00000-000"
                                    className="flex-1 bg-zinc-900 border border-zinc-700 text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:border-[var(--brand-primary)] outline-none"
                                  />
                                  {loadingCep && (
                                    <div className="flex items-center px-2">
                                      <div className="w-4 h-4 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">UF</label>
                                <input
                                  type="text"
                                  value={nfseEmpresaForm.uf}
                                  onChange={(e) => setNfseEmpresaForm({ ...nfseEmpresaForm, uf: e.target.value.toUpperCase() })}
                                  maxLength={2}
                                  className="w-full bg-zinc-900 border border-zinc-700 text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:border-[var(--brand-primary)] outline-none text-center"
                                />
                              </div>
                            </div>

                            {/* Endereço completo */}
                            <div className="grid grid-cols-4 gap-3">
                              <div className="col-span-3">
                                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Logradouro</label>
                                <input
                                  type="text"
                                  value={nfseEmpresaForm.logradouro}
                                  onChange={(e) => setNfseEmpresaForm({ ...nfseEmpresaForm, logradouro: e.target.value })}
                                  className="w-full bg-zinc-900 border border-zinc-700 text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:border-[var(--brand-primary)] outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Nº</label>
                                <input
                                  type="text"
                                  value={nfseEmpresaForm.numero}
                                  onChange={(e) => setNfseEmpresaForm({ ...nfseEmpresaForm, numero: e.target.value })}
                                  className="w-full bg-zinc-900 border border-zinc-700 text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:border-[var(--brand-primary)] outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Bairro</label>
                                <input
                                  type="text"
                                  value={nfseEmpresaForm.bairro}
                                  onChange={(e) => setNfseEmpresaForm({ ...nfseEmpresaForm, bairro: e.target.value })}
                                  className="w-full bg-zinc-900 border border-zinc-700 text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:border-[var(--brand-primary)] outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Cidade</label>
                                <input
                                  type="text"
                                  value={nfseEmpresaForm.cidade}
                                  onChange={(e) => setNfseEmpresaForm({ ...nfseEmpresaForm, cidade: e.target.value })}
                                  className="w-full bg-zinc-900 border border-zinc-700 text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:border-[var(--brand-primary)] outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Complemento</label>
                                <input
                                  type="text"
                                  value={nfseEmpresaForm.complemento}
                                  onChange={(e) => setNfseEmpresaForm({ ...nfseEmpresaForm, complemento: e.target.value })}
                                  placeholder="Sala, Apto..."
                                  className="w-full bg-zinc-900 border border-zinc-700 text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:border-[var(--brand-primary)] outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Código IBGE</label>
                                <input
                                  type="text"
                                  value={nfseEmpresaForm.codigo_ibge}
                                  onChange={(e) => setNfseEmpresaForm({ ...nfseEmpresaForm, codigo_ibge: e.target.value })}
                                  placeholder="Preenchido auto"
                                  className="w-full bg-zinc-900 border border-zinc-700 text-[var(--text-primary)] rounded-lg px-3 py-2 text-sm focus:border-[var(--brand-primary)] outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Seção 3: Ambiente */}
                      {nfseEmpresaForm.razao_social && (
                        <div className="bg-[var(--surface-subtle)] rounded-xl p-4 border border-[var(--border-default)]">
                          <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                            <Settings size={16} className="text-[var(--brand-primary)]" />
                            Configuração
                          </h4>
                          <div>
                            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Ambiente</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setNfseEmpresaForm({ ...nfseEmpresaForm, ambiente: 'homologacao' })}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${nfseEmpresaForm.ambiente === 'homologacao'
                                  ? 'bg-[var(--status-warning)]/20 border-yellow-500/50 text-[var(--status-warning)]'
                                  : 'bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-hover)]'
                                  }`}
                              >
                                <FlaskConical size={16} />
                                Homologação
                              </button>
                              <button
                                type="button"
                                onClick={() => setNfseEmpresaForm({ ...nfseEmpresaForm, ambiente: 'producao' })}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border ${nfseEmpresaForm.ambiente === 'producao'
                                  ? 'bg-green-500/20 border-green-500/50 text-green-500'
                                  : 'bg-[var(--surface-subtle)] border-[var(--border-default)] text-[var(--text-muted)] hover:border-[var(--border-hover)]'
                                  }`}
                              >
                                <Rocket size={16} />
                                Produção
                              </button>
                            </div>
                            <p className="text-xs text-[var(--text-subtle)] mt-1.5">
                              Comece em homologação para testar antes de ir para produção
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Botões de ação */}
                      <div className="flex justify-between pt-2">
                        <button
                          onClick={() => setShowNfseConfigModal(false)}
                          className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleCadastrarEmpresa}
                          disabled={!nfseEmpresaForm.cnpj || !nfseEmpresaForm.razao_social || !nfseEmpresaForm.codigo_ibge || savingNfseConfig}
                          className="bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-black px-6 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 transition-colors"
                        >
                          {savingNfseConfig ? 'Cadastrando...' : 'Cadastrar Empresa'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Step 2: Certificado */}
              {nfseConfigStep === 'certificado' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-yellow-500/10 border border-[var(--status-warning)]/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={20} className="text-[var(--status-warning)] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-[var(--status-warning)]">Certificado Digital A1</h4>
                        <p className="text-xs text-[var(--status-warning)]/80 mt-1">
                          O certificado será enviado diretamente para a Nuvem Fiscal e <strong>não será armazenado</strong> em nossos servidores. Apenas transita de forma segura.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Arquivo do Certificado (.pfx ou .p12) *</label>
                    <div className="border-2 border-dashed border-[var(--border-default)] rounded-lg p-8 text-center hover:border-[var(--brand)]/50 transition-colors">
                      <input
                        type="file"
                        accept=".pfx,.p12"
                        onChange={(e) => setNfseCertificadoFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="certificado-upload"
                      />
                      <label htmlFor="certificado-upload" className="cursor-pointer">
                        <div className="flex flex-col items-center gap-2">
                          <ArrowUpRight size={32} className="text-[var(--text-muted)]" />
                          <span className="text-sm text-[var(--text-muted)]">
                            {nfseCertificadoFile ? nfseCertificadoFile.name : 'Escolher ficheiro'}
                          </span>
                          <span className="text-xs text-[var(--text-subtle)]">
                            Selecione o arquivo .pfx ou .p12 do seu certificado A1
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Senha do Certificado *</label>
                    <input
                      type="password"
                      value={nfseCertificadoSenha}
                      onChange={(e) => setNfseCertificadoSenha(e.target.value)}
                      placeholder="Senha do certificado"
                      className="w-full bg-[var(--surface-subtle)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-2.5 text-sm focus:border-[var(--brand-primary)] outline-none"
                    />
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      onClick={() => setNfseConfigStep('empresa')}
                      className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleUploadCertificado}
                      disabled={savingNfseConfig || !nfseCertificadoFile || !nfseCertificadoSenha}
                      className="bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white px-6 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                    >
                      {savingNfseConfig ? 'Enviando...' : 'Enviar Certificado'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: NFS-e Config */}
              {nfseConfigStep === 'nfse' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 size={20} className="text-[var(--status-success)] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-[var(--status-success)]">Configuração Concluída!</h4>
                        <p className="text-xs text-green-500/80 mt-1">
                          Seu estabelecimento está habilitado para emitir NFS-e. As notas serão emitidas automaticamente após o pagamento dos serviços.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-[var(--surface-subtle)] rounded-lg">
                      <span className="text-sm text-[var(--text-muted)]">Empresa</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{nfseEmpresaForm.razao_social || 'Não configurado'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[var(--surface-subtle)] rounded-lg">
                      <span className="text-sm text-[var(--text-muted)]">CNPJ</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">{nfseEmpresaForm.cnpj || 'Não configurado'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[var(--surface-subtle)] rounded-lg">
                      <span className="text-sm text-[var(--text-muted)]">Certificado</span>
                      <span className="text-sm font-bold text-[var(--status-success)]">{nfseCertificadoFile ? 'Enviado ✓' : 'Pendente'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[var(--surface-subtle)] rounded-lg">
                      <span className="text-sm text-[var(--text-muted)]">Ambiente</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${nfseEmpresaForm.ambiente === 'producao'
                        ? 'bg-[var(--brand-primary)] text-white'
                        : 'bg-[var(--status-warning)]/20 text-[var(--status-warning)]'
                        }`}>
                        {nfseEmpresaForm.ambiente === 'producao' ? 'Produção' : 'Homologação'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      onClick={() => setNfseConfigStep('certificado')}
                      className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Finalize config
                        setShowNfseConfigModal(false);
                        toast.success('Configuração fiscal salva com sucesso!');
                      }}
                      className="bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white px-6 py-2 rounded-lg text-sm font-bold"
                    >
                      Concluir Configuração
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;
