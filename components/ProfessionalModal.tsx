import React, { useState, useEffect, useRef } from 'react';
import { X, UserPlus, Clock, Target, Percent, ChevronRight, ChevronLeft, Check, Calendar, AlertCircle, CheckCircle, Copy, RotateCcw, Scissors, HelpCircle, Pencil, Trash2, Search, ChevronDown } from 'lucide-react';
import { createProfessional, updateProfessional, getCurrentBusinessId, fetchServices } from '../lib/database';
import { supabase } from '../lib/supabase';
import { validatePhone, validateEmailComplete, normalizeEmail } from '../lib/validation';
import type { Professional, Service } from '../types';

interface ProfessionalModalProps {
  professional?: Professional | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface DaySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  is_active: boolean;
}

const BREAK_PRESETS = ['30m', '45m', '1h', '1h30'];

const ProfessionalModal: React.FC<ProfessionalModalProps> = ({ professional, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission_rate: 50,
    monthly_goal: 5000,
    buffer_minutes: 15,
    custom_buffer: false,
  });

  const [schedule, setSchedule] = useState<DaySchedule[]>([
    { day_of_week: 0, start_time: '09:00', end_time: '19:00', break_start: null, break_end: null, is_active: false },
    { day_of_week: 1, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00', is_active: true },
    { day_of_week: 2, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00', is_active: true },
    { day_of_week: 3, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00', is_active: true },
    { day_of_week: 4, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00', is_active: true },
    { day_of_week: 5, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00', is_active: true },
    { day_of_week: 6, start_time: '09:00', end_time: '19:00', break_start: null, break_end: null, is_active: false },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [phoneValidation, setPhoneValidation] = useState<{ valid: boolean; message?: string }>({ valid: true });
  const [emailValidation, setEmailValidation] = useState<{ valid: boolean; message?: string }>({ valid: true });
  const [hasChanges, setHasChanges] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; specialty?: string }>({});
  const [editingPauseDay, setEditingPauseDay] = useState<number | null>(null);
  const [tempPause, setTempPause] = useState({ start: '12:00', end: '13:00' });

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Services state
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [showSelectedFirst, setShowSelectedFirst] = useState(false);

  // Global buffer from business settings
  const [globalBufferMinutes, setGlobalBufferMinutes] = useState<number>(15);

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dayNamesFull = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  // Load all services and global buffer on mount
  useEffect(() => {
    const loadAllServices = async () => {
      const services = await fetchServices();
      setAllServices(services.filter(s => s.is_active !== false));
    };

    const loadGlobalBuffer = async () => {
      const { data } = await supabase
        .from('businesses')
        .select('booking_settings')
        .single();
      if (data?.booking_settings?.buffer_minutes) {
        setGlobalBufferMinutes(data.booking_settings.buffer_minutes);
      }
    };

    loadAllServices();
    loadGlobalBuffer();
  }, []);

  // Load professional data when editing
  useEffect(() => {
    if (professional) {
      setFormData({
        name: professional.name,
        email: professional.email || '',
        phone: professional.phone || '',
        commission_rate: professional.commission_rate || 50,
        monthly_goal: professional.monthly_goal || 5000,
        buffer_minutes: professional.buffer_minutes || 15,
        custom_buffer: professional.custom_buffer || false,
      });
      loadProfessionalSchedule(professional.id);
      loadProfessionalServices(professional.id);
    }
  }, [professional]);

  // Load professional's enabled services
  const loadProfessionalServices = async (professionalId: string) => {
    const { data, error } = await supabase
      .from('professional_services')
      .select('service_id')
      .eq('professional_id', professionalId);

    if (!error && data) {
      setSelectedServiceIds(data.map(d => d.service_id));
    }
  };

  // Toggle service selection
  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
    setHasChanges(true);
    if (fieldErrors.specialty) setFieldErrors({ ...fieldErrors, specialty: undefined });
  };

  const loadProfessionalSchedule = async (professionalId: string) => {
    const { data } = await supabase
      .from('professional_availability')
      .select('*')
      .eq('professional_id', professionalId)
      .order('day_of_week');

    if (data && data.length > 0) {
      const loadedSchedule = schedule.map(day => {
        const found = data.find(d => d.day_of_week === day.day_of_week);
        return found ? {
          day_of_week: found.day_of_week,
          start_time: found.start_time,
          end_time: found.end_time,
          break_start: found.break_start,
          break_end: found.break_end,
          is_active: found.is_active
        } : day;
      });
      setSchedule(loadedSchedule);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      const businessId = await getCurrentBusinessId();
      if (!businessId) throw new Error('Business ID not found');

      let professionalId: string;

      // Generate specialty string from selected services
      const selectedServiceNames = allServices
        .filter(s => selectedServiceIds.includes(s.id))
        .map(s => s.name);
      const specialtyString = selectedServiceNames.join(', ');

      const dataToSend = {
        name: formData.name,
        specialty: specialtyString,
        commission_rate: formData.commission_rate,
        monthly_goal: formData.monthly_goal,
        buffer_minutes: formData.buffer_minutes,
        custom_buffer: formData.custom_buffer,
        is_active: true,
        business_id: businessId,
        ...(formData.email && { email: formData.email }),
        ...(formData.phone && { phone: formData.phone }),
      };

      if (professional) {
        await updateProfessional(professional.id, dataToSend);
        professionalId = professional.id;
      } else {
        const result = await createProfessional(dataToSend);
        if (!result || !result.id) throw new Error('Failed to create professional');
        professionalId = result.id;
      }

      // Save schedule
      await supabase.from('professional_availability').delete().eq('professional_id', professionalId);

      const scheduleData = schedule.map(day => ({
        business_id: businessId,
        professional_id: professionalId,
        day_of_week: day.day_of_week,
        start_time: day.start_time,
        end_time: day.end_time,
        break_start: day.break_start,
        break_end: day.break_end,
        is_active: day.is_active
      }));

      await supabase.from('professional_availability').insert(scheduleData);

      // Save service associations
      await supabase.from('professional_services').delete().eq('professional_id', professionalId);

      if (selectedServiceIds.length > 0) {
        const serviceAssociations = selectedServiceIds.map(serviceId => ({
          professional_id: professionalId,
          service_id: serviceId,
          business_id: businessId
        }));

        await supabase.from('professional_services').insert(serviceAssociations);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar profissional');
    } finally {
      setIsLoading(false);
    }
  };

  // Phone formatting
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = async (value: string) => {
    const formatted = formatPhone(value);
    setFormData({ ...formData, phone: formatted });
    setHasChanges(true);
    if (formatted.replace(/\D/g, '').length > 0) {
      const validation = await validatePhone(formatted);
      setPhoneValidation(validation);
    } else {
      setPhoneValidation({ valid: true });
    }
  };

  const handleEmailChange = async (value: string) => {
    setFormData({ ...formData, email: value });
    setHasChanges(true);
    if (value.trim()) {
      const validation = await validateEmailComplete(value);
      setEmailValidation(validation);
    } else {
      setEmailValidation({ valid: true });
    }
  };

  const handleNext = () => {
    const errors: { name?: string; specialty?: string } = {};

    if (!formData.name.trim()) {
      errors.name = 'Campo obrigatório';
    }
    if (selectedServiceIds.length === 0) {
      errors.specialty = 'Selecione ao menos um serviço';
    }
    if (formData.phone && !phoneValidation.valid) {
      setError('Corrija o telefone antes de continuar');
      return;
    }
    if (formData.email && !emailValidation.valid) {
      setError('Corrija o email antes de continuar');
      return;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.name) nameInputRef.current?.focus();
      return;
    }

    setFieldErrors({});
    setError('');
    setCurrentStep(2);
  };

  const updateSchedule = (index: number, field: keyof DaySchedule, value: any) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { ...newSchedule[index], [field]: value };
    setSchedule(newSchedule);
    setHasChanges(true);
  };

  // Schedule Actions
  const copyFromMonday = () => {
    const monday = schedule[1];
    const newSchedule = schedule.map((day, idx) =>
      idx === 0 || idx === 6 ? day : {
        ...monday,
        day_of_week: day.day_of_week
      }
    );
    setSchedule(newSchedule);
  };

  const applyMondayToAll = () => {
    const monday = schedule[1];
    const newSchedule = schedule.map(day => ({
      ...monday,
      day_of_week: day.day_of_week
    }));
    setSchedule(newSchedule);
  };

  const clearSchedule = () => {
    const newSchedule = schedule.map(day => ({
      ...day,
      is_active: false,
      break_start: null,
      break_end: null
    }));
    setSchedule(newSchedule);
    setHasChanges(true);
  };

  // Schedule Presets
  const applyPresetWeekdays = () => {
    const newSchedule = schedule.map(day => ({
      ...day,
      start_time: '09:00',
      end_time: '18:00',
      break_start: '12:00',
      break_end: '13:00',
      is_active: day.day_of_week >= 1 && day.day_of_week <= 5
    }));
    setSchedule(newSchedule);
    setHasChanges(true);
  };

  const applyPreset6x1 = () => {
    const newSchedule = schedule.map(day => ({
      ...day,
      start_time: '09:00',
      end_time: '19:00',
      break_start: '12:00',
      break_end: '13:00',
      is_active: day.day_of_week >= 1 && day.day_of_week <= 6
    }));
    setSchedule(newSchedule);
    setHasChanges(true);
  };

  const applyPresetSatOnly = () => {
    const newSchedule = schedule.map(day => ({
      ...day,
      start_time: '09:00',
      end_time: '18:00',
      break_start: null,
      break_end: null,
      is_active: day.day_of_week === 6
    }));
    setSchedule(newSchedule);
    setHasChanges(true);
  };

  // Pause editing
  const openPauseEditor = (dayIndex: number) => {
    const day = schedule[dayIndex];
    setTempPause({
      start: day.break_start || '12:00',
      end: day.break_end || '13:00'
    });
    setEditingPauseDay(dayIndex);
  };

  const savePause = () => {
    if (editingPauseDay === null) return;
    // Validate pause times
    const startMinutes = parseInt(tempPause.start.split(':')[0]) * 60 + parseInt(tempPause.start.split(':')[1]);
    const endMinutes = parseInt(tempPause.end.split(':')[0]) * 60 + parseInt(tempPause.end.split(':')[1]);
    if (endMinutes <= startMinutes) {
      return; // Invalid
    }
    updateSchedule(editingPauseDay, 'break_start', tempPause.start);
    updateSchedule(editingPauseDay, 'break_end', tempPause.end);
    setEditingPauseDay(null);
  };

  const removePause = () => {
    if (editingPauseDay === null) return;
    updateSchedule(editingPauseDay, 'break_start', null);
    updateSchedule(editingPauseDay, 'break_end', null);
    setEditingPauseDay(null);
  };

  const applyPreset = (preset: string) => {
    const durationMap: Record<string, number> = { '30m': 30, '45m': 45, '1h': 60, '1h30': 90 };
    const duration = durationMap[preset] || 60;
    const startMinutes = parseInt(tempPause.start.split(':')[0]) * 60 + parseInt(tempPause.start.split(':')[1]);
    const endMinutes = startMinutes + duration;
    const endHour = Math.floor(endMinutes / 60).toString().padStart(2, '0');
    const endMin = (endMinutes % 60).toString().padStart(2, '0');
    setTempPause({ ...tempPause, end: `${endHour}:${endMin}` });
  };

  const handleClose = () => {
    if (hasChanges) {
      if (confirm('Descartar mudanças?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Stats calculation
  const activeDays = schedule.filter(d => d.is_active);
  const weeklyHours = activeDays.reduce((acc, day) => {
    const [startH, startM] = day.start_time.split(':').map(Number);
    const [endH, endM] = day.end_time.split(':').map(Number);
    const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
    const breakHours = day.break_start && day.break_end ?
      (() => {
        const [bs, bsm] = day.break_start.split(':').map(Number);
        const [be, bem] = day.break_end.split(':').map(Number);
        return (be * 60 + bem - bs * 60 - bsm) / 60;
      })() : 0;
    return acc + hours - breakHours;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[var(--surface-card)] w-full max-w-[720px] rounded-2xl border border-[var(--border-default)] shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: 'min(78vh, 680px)' }}>
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 p-6 border-b border-[var(--border-default)] shrink-0 bg-[var(--surface-card)]/95 backdrop-blur-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/20 flex items-center justify-center">
                  <UserPlus className="text-[var(--brand-primary)]" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {professional ? 'Editar Profissional' : 'Novo Profissional'}
                  </h3>
                  <p className="text-xs text-[var(--text-subtle)]">Cadastre dados e jornada</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-[var(--text-subtle)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Enhanced Stepper */}
          <div className="mt-6">
            <div className="text-center mb-3">
              <span className="text-[10px] text-[var(--text-subtle)] uppercase tracking-widest">
                Passo {currentStep} de 2
              </span>
            </div>
            <div className="flex justify-center items-center gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${currentStep > 1 ? 'bg-[var(--brand-primary)] text-black' :
                  currentStep === 1 ? 'bg-[var(--brand-primary)] text-black ring-4 ring-barber-gold/20' :
                    'bg-[var(--surface-subtle)] text-[var(--text-subtle)]'
                  }`}>
                  {currentStep > 1 ? <Check size={16} /> : '1'}
                </div>
                <span className={`text-[10px] mt-1.5 font-bold uppercase tracking-widest ${currentStep >= 1 ? 'text-[var(--brand-primary)]' : 'text-[var(--text-subtle)]'
                  }`}>Dados</span>
                <span className="text-[9px] text-[var(--text-subtle)] mt-0.5">Informações e serviços</span>
              </div>

              <div className={`w-12 h-0.5 ${currentStep > 1 ? 'bg-[var(--brand-primary)]' : 'bg-[var(--surface-subtle)]'}`} />

              <div className="flex flex-col items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${currentStep === 2 ? 'bg-[var(--brand-primary)] text-black ring-4 ring-barber-gold/20' :
                  'border-2 border-[var(--border-strong)] bg-transparent text-[var(--text-subtle)]'
                  }`}>
                  2
                </div>
                <span className={`text-[10px] mt-1.5 font-bold uppercase tracking-widest ${currentStep === 2 ? 'text-[var(--brand-primary)]' : 'text-[var(--text-subtle)]'
                  }`}>Jornada</span>
                <span className="text-[9px] text-[var(--text-subtle)] mt-0.5">Horários de trabalho</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-[var(--status-error)] text-sm p-3 rounded-xl mb-4 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Step 1: DADOS */}
          {currentStep === 1 && (
            <div className="space-y-5">
              {/* Row 1: Nome + Especialidade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-300 mb-2 font-bold">
                    Nome Completo <span className="text-[var(--status-error)]">*</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      setHasChanges(true);
                      if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                    }}
                    className={`w-full bg-[var(--surface-app)] border text-[var(--text-primary)] rounded-xl px-4 h-11 text-sm outline-none transition-all ${fieldErrors.name
                      ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-[var(--border-default)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-barber-gold/20'
                      }`}
                    placeholder="Ex: Carlos Silva"
                  />
                  {fieldErrors.name && (
                    <p className="text-[var(--status-error)] text-[11px] mt-1 flex items-center gap-1">
                      <AlertCircle size={10} /> {fieldErrors.name}
                    </p>
                  )}
                </div>
                {/* Services Selection - Enhanced */}
                <div className="col-span-2">
                  {/* Header with counter */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                      Serviços que Realiza <span className="text-[var(--status-error)]">*</span>
                    </label>
                    <span className="text-[11px] text-[var(--brand-primary)] font-medium">
                      Selecionados: {selectedServiceIds.length}
                    </span>
                  </div>

                  <div className={`bg-[var(--surface-app)] border rounded-xl overflow-hidden ${fieldErrors.specialty ? 'border-red-500' : 'border-[var(--border-default)]'}`}>
                    {/* Search bar */}
                    <div className="p-3 border-b border-[var(--border-default)]">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
                        <input
                          type="text"
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          placeholder="Buscar serviço..."
                          className="w-full bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-primary)] rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--brand-primary)] transition-colors"
                        />
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="px-3 py-2 border-b border-[var(--border-default)] flex items-center justify-between bg-[var(--surface-card)]/50">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedServiceIds(allServices.map(s => s.id));
                            setHasChanges(true);
                            if (fieldErrors.specialty) setFieldErrors({ ...fieldErrors, specialty: undefined });
                          }}
                          className="px-2 py-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
                        >
                          Selecionar todos
                        </button>
                        <span className="text-[var(--text-subtle)]">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedServiceIds([]);
                            setHasChanges(true);
                          }}
                          className="px-2 py-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--status-error)] transition-colors"
                        >
                          Limpar
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSelectedFirst(!showSelectedFirst)}
                        className={`px-2 py-1 text-[10px] rounded transition-colors ${showSelectedFirst ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/10' : 'text-[var(--text-subtle)] hover:text-gray-300'}`}
                      >
                        Selecionados primeiro
                      </button>
                    </div>

                    {/* Services grid */}
                    <div className="p-3 max-h-[160px] overflow-y-auto">
                      {allServices.length === 0 ? (
                        <p className="text-[var(--text-subtle)] text-sm text-center py-2">Nenhum serviço cadastrado</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {allServices
                            .filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()))
                            .sort((a, b) => {
                              if (!showSelectedFirst) return 0;
                              const aSelected = selectedServiceIds.includes(a.id);
                              const bSelected = selectedServiceIds.includes(b.id);
                              if (aSelected && !bSelected) return -1;
                              if (!aSelected && bSelected) return 1;
                              return 0;
                            })
                            .map(service => {
                              const isSelected = selectedServiceIds.includes(service.id);
                              return (
                                <div
                                  key={service.id}
                                  onClick={() => toggleService(service.id)}
                                  className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${isSelected
                                    ? 'bg-[var(--brand-primary)]/15 border border-barber-gold/60 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                                    : 'bg-[var(--surface-card)] border border-[var(--border-default)] hover:border-[var(--border-strong)]'
                                    }`}
                                >
                                  {isSelected && (
                                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[var(--brand-primary)] flex items-center justify-center">
                                      <Check size={10} className="text-black" />
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span className={`text-xs font-medium truncate block ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                                      {service.name}
                                    </span>
                                    <span className="text-[10px] text-[var(--text-subtle)]">{service.duration_minutes || 60}min</span>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                  {fieldErrors.specialty && (
                    <p className="text-[var(--status-error)] text-[11px] mt-1 flex items-center gap-1">
                      <AlertCircle size={10} /> {fieldErrors.specialty}
                    </p>
                  )}
                </div>
              </div>

              {/* Row 2: Email + Telefone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-300 mb-2 font-bold">
                    E-mail
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      className={`w-full bg-[var(--surface-app)] border text-[var(--text-primary)] rounded-xl px-4 h-11 text-sm outline-none transition-all pr-10 ${formData.email && !emailValidation.valid
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : formData.email && emailValidation.valid
                          ? 'border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'
                          : 'border-[var(--border-default)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-barber-gold/20'
                        }`}
                      placeholder="profissional@email.com"
                    />
                    {formData.email && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {emailValidation.valid ? (
                          <CheckCircle className="text-[var(--status-success)]" size={16} />
                        ) : (
                          <AlertCircle className="text-red-500" size={16} />
                        )}
                      </div>
                    )}
                  </div>
                  {formData.email && !emailValidation.valid && emailValidation.message && (
                    <p className="text-[var(--status-error)] text-[10px] mt-1">{emailValidation.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-300 mb-2 font-bold">
                    WhatsApp
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-3 text-[var(--text-subtle)] text-sm font-medium select-none">+55</div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className={`w-full bg-[var(--surface-app)] border text-[var(--text-primary)] rounded-xl pl-12 pr-10 h-11 text-sm outline-none transition-all ${formData.phone && !phoneValidation.valid
                        ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : formData.phone && phoneValidation.valid
                          ? 'border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-500/20'
                          : 'border-[var(--border-default)] focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-barber-gold/20'
                        }`}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                    />
                    {formData.phone && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {phoneValidation.valid ? (
                          <CheckCircle className="text-[var(--status-success)]" size={16} />
                        ) : (
                          <AlertCircle className="text-red-500" size={16} />
                        )}
                      </div>
                    )}
                  </div>
                  {formData.phone && !phoneValidation.valid && phoneValidation.message && (
                    <p className="text-[var(--status-error)] text-[10px] mt-1">{phoneValidation.message}</p>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-[var(--surface-subtle)]" />
                <span className="text-[10px] text-[var(--text-subtle)] uppercase tracking-widest font-bold">Configurações Financeiras</span>
                <div className="flex-1 h-px bg-[var(--surface-subtle)]" />
              </div>

              {/* Row 3: Meta + Comissão */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-300 mb-2 font-bold flex items-center gap-1.5">
                    Meta Mensal
                    <span className="group relative">
                      <HelpCircle size={12} className="text-[var(--text-subtle)] cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[var(--surface-subtle)] text-[10px] text-gray-300 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Usado para acompanhar performance
                      </span>
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <div className="absolute left-4 text-[var(--text-subtle)] text-sm font-medium select-none">R$</div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.monthly_goal.toLocaleString('pt-BR')}
                      onChange={(e) => {
                        const value = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                        setFormData({ ...formData, monthly_goal: value });
                        setHasChanges(true);
                      }}
                      className="w-full bg-[var(--surface-app)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-xl pl-12 pr-4 h-11 text-sm font-bold outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-barber-gold/20 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-300 mb-2 font-bold flex items-center gap-1.5">
                    Comissão
                    <span className="group relative">
                      <HelpCircle size={12} className="text-[var(--text-subtle)] cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[var(--surface-subtle)] text-[10px] text-gray-300 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Aplicado nos serviços concluídos
                      </span>
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formData.commission_rate}
                      onChange={(e) => {
                        const value = Math.min(100, Math.max(0, parseInt(e.target.value.replace(/\D/g, '')) || 0));
                        setFormData({ ...formData, commission_rate: value });
                        setHasChanges(true);
                      }}
                      className="w-full bg-[var(--surface-app)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-xl px-4 pr-10 h-11 text-sm font-bold outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-barber-gold/20 transition-all"
                    />
                    <div className="absolute right-4 text-[var(--text-subtle)] text-sm font-medium select-none">%</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: JORNADA */}
          {currentStep === 2 && (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[var(--surface-app)] rounded-xl p-3 border border-[var(--border-default)] text-center">
                  <div className="text-2xl font-bold text-[var(--text-primary)]">{activeDays.length}</div>
                  <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider">Dias Ativos</div>
                </div>
                <div className="bg-[var(--surface-app)] rounded-xl p-3 border border-[var(--border-default)] text-center">
                  <div className="text-2xl font-bold text-[var(--brand-primary)]">{weeklyHours.toFixed(0)}h</div>
                  <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider">Carga Semanal</div>
                </div>
                <div className="bg-[var(--surface-app)] rounded-xl p-3 border border-[var(--border-default)] text-center">
                  <div className="text-2xl font-bold text-[var(--text-primary)]">
                    {activeDays.filter(d => d.break_start).length > 0 ? '1h' : '0h'}
                  </div>
                  <div className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider">Pausa Média</div>
                </div>
              </div>

              {/* Action Toolbar with Presets */}
              <div className="bg-[var(--surface-app)] rounded-xl border border-[var(--border-default)] overflow-hidden">
                {/* Presets row */}
                <div className="px-3 py-2 border-b border-[var(--border-default)] flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-subtle)] uppercase tracking-wider mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={applyPresetWeekdays}
                    className="px-2.5 py-1 bg-[var(--surface-subtle)] hover:bg-[var(--brand-primary)]/20 hover:text-[var(--brand-primary)] text-[var(--text-muted)] text-[10px] font-medium rounded-lg transition-colors"
                  >
                    Dias úteis 09–18
                  </button>
                  <button
                    type="button"
                    onClick={applyPreset6x1}
                    className="px-2.5 py-1 bg-[var(--surface-subtle)] hover:bg-[var(--brand-primary)]/20 hover:text-[var(--brand-primary)] text-[var(--text-muted)] text-[10px] font-medium rounded-lg transition-colors"
                  >
                    6x1
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetSatOnly}
                    className="px-2.5 py-1 bg-[var(--surface-subtle)] hover:bg-[var(--brand-primary)]/20 hover:text-[var(--brand-primary)] text-[var(--text-muted)] text-[10px] font-medium rounded-lg transition-colors"
                  >
                    Somente Sáb
                  </button>
                </div>
                {/* Actions row */}
                <div className="px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={copyFromMonday}
                      className="px-2.5 py-1.5 bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-gray-300 hover:text-[var(--text-primary)] text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Copy size={11} />
                      Copiar de Seg
                    </button>
                    <button
                      type="button"
                      onClick={applyMondayToAll}
                      className="px-2.5 py-1.5 bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-gray-300 hover:text-[var(--text-primary)] text-[11px] font-medium rounded-lg transition-colors"
                    >
                      Aplicar a Todos
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={clearSchedule}
                    className="px-2.5 py-1.5 hover:bg-red-500/10 text-[var(--text-subtle)] hover:text-[var(--status-error)] text-[11px] font-medium rounded-lg transition-colors flex items-center gap-1"
                  >
                    <RotateCcw size={11} />
                    Limpar
                  </button>
                </div>
              </div>

              {/* Days List - 3 Column Layout */}
              <div className="bg-[var(--surface-app)] rounded-xl border border-[var(--border-default)] overflow-hidden">
                {schedule.map((day, index) => (
                  <div
                    key={day.day_of_week}
                    className={`grid grid-cols-[120px_1fr_200px] items-center px-4 h-12 border-b border-[var(--border-default)] last:border-b-0 transition-all ${!day.is_active ? 'opacity-40 bg-[var(--surface-app)]/50' : ''
                      }`}
                  >
                    {/* Col 1: Day + Toggle */}
                    <div className="flex items-center gap-3">
                      <span className="w-14 text-[var(--text-primary)] font-medium text-sm">{dayNamesFull[day.day_of_week]}</span>
                      <button
                        type="button"
                        onClick={() => updateSchedule(index, 'is_active', !day.is_active)}
                        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${day.is_active ? 'bg-[var(--brand-primary)]' : 'bg-[var(--surface-hover)]'
                          }`}
                      >
                        <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all shadow ${day.is_active ? 'right-0.5' : 'left-0.5'
                          }`} />
                      </button>
                    </div>

                    {/* Col 2: Time Inputs or"Folga" */}
                    {day.is_active ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--text-subtle)] uppercase">Jornada:</span>
                        <input
                          type="time"
                          value={day.start_time}
                          onChange={(e) => updateSchedule(index, 'start_time', e.target.value)}
                          className="bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-primary)] rounded-lg px-2 py-1 text-sm w-20 text-center outline-none focus:border-[var(--brand-primary)] transition-colors"
                        />
                        <span className="text-[var(--text-subtle)]">—</span>
                        <input
                          type="time"
                          value={day.end_time}
                          onChange={(e) => updateSchedule(index, 'end_time', e.target.value)}
                          className="bg-[var(--surface-card)] border border-[var(--border-strong)] text-[var(--text-primary)] rounded-lg px-2 py-1 text-sm w-20 text-center outline-none focus:border-[var(--brand-primary)] transition-colors"
                        />
                      </div>
                    ) : (
                      <div className="text-[var(--text-subtle)] text-sm font-medium">Folga</div>
                    )}

                    {/* Col 3: Pause Chip */}
                    {day.is_active && (
                      <div className="flex justify-end relative">
                        {day.break_start && day.break_end ? (
                          <button
                            type="button"
                            onClick={() => openPauseEditor(index)}
                            className="px-2.5 py-1 bg-orange-500/15 border border-orange-500/30 rounded-lg text-[11px] text-orange-400 font-medium flex items-center gap-1.5 hover:bg-orange-500/25 transition-colors"
                          >
                            <Clock size={10} />
                            Pausa {day.break_start}–{day.break_end}
                            <Pencil size={10} className="opacity-50" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPauseEditor(index)}
                            className="px-2.5 py-1 bg-transparent border border-[var(--border-strong)] rounded-lg text-[11px] text-[var(--text-subtle)] font-medium flex items-center gap-1 hover:border-barber-gold hover:text-[var(--brand-primary)] transition-colors"
                          >
                            + Adicionar pausa
                          </button>
                        )}

                        {/* Pause Editor Popover */}
                        {editingPauseDay === index && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setEditingPauseDay(null)} />
                            <div className="absolute right-0 top-full mt-2 z-50 bg-[var(--surface-card)] border border-[var(--border-strong)] rounded-xl p-4 shadow-2xl w-64 animate-fade-in">
                              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3 font-bold">Pausa</div>

                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex-1">
                                  <label className="text-[10px] text-[var(--text-subtle)] block mb-1">Início</label>
                                  <input
                                    type="time"
                                    value={tempPause.start}
                                    onChange={(e) => setTempPause({ ...tempPause, start: e.target.value })}
                                    className="w-full bg-[var(--surface-app)] border border-[var(--border-strong)] text-[var(--text-primary)] rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:border-[var(--brand-primary)]"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[10px] text-[var(--text-subtle)] block mb-1">Fim</label>
                                  <input
                                    type="time"
                                    value={tempPause.end}
                                    onChange={(e) => setTempPause({ ...tempPause, end: e.target.value })}
                                    className="w-full bg-[var(--surface-app)] border border-[var(--border-strong)] text-[var(--text-primary)] rounded-lg px-2 py-1.5 text-sm text-center outline-none focus:border-[var(--brand-primary)]"
                                  />
                                </div>
                              </div>

                              {/* Presets */}
                              <div className="flex gap-1.5 mb-4">
                                {BREAK_PRESETS.map(preset => (
                                  <button
                                    key={preset}
                                    type="button"
                                    onClick={() => applyPreset(preset)}
                                    className="px-2 py-1 bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[10px] rounded transition-colors"
                                  >
                                    {preset}
                                  </button>
                                ))}
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={removePause}
                                  className="flex-1 px-3 py-1.5 text-[var(--status-error)] hover:bg-red-500/10 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                                >
                                  <Trash2 size={12} />
                                  Remover
                                </button>
                                <button
                                  type="button"
                                  onClick={savePause}
                                  className="flex-1 px-3 py-1.5 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]hover text-black text-xs font-bold rounded-lg transition-colors"
                                >
                                  Salvar
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Intervalo entre Atendimentos */}
              <div className="bg-[var(--surface-app)] border border-[var(--border-default)] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-[var(--text-primary)] font-semibold text-sm">Intervalo Personalizado</div>
                    <div className="text-[var(--text-subtle)] text-xs">Tempo de preparação entre um cliente e outro</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, custom_buffer: !formData.custom_buffer })}
                    className={`w-10 h-5 rounded-full transition-colors relative ${formData.custom_buffer ? 'bg-[var(--brand-primary)]' : 'bg-[var(--surface-hover)]'
                      }`}
                  >
                    <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-all shadow ${formData.custom_buffer ? 'right-0.5' : 'left-0.5'
                      }`} />
                  </button>
                </div>

                {!formData.custom_buffer && (
                  <div className="pt-2 border-t border-[var(--border-default)] flex items-center gap-2 text-[var(--text-muted)]">
                    <Clock size={14} />
                    <span className="text-sm">Usando intervalo padrão do estabelecimento: <span className="font-bold text-[var(--brand-primary)]">{globalBufferMinutes} min</span></span>
                  </div>
                )}

                {formData.custom_buffer && (
                  <div className="pt-2 border-t border-[var(--border-default)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[var(--text-muted)] text-sm">Intervalo</span>
                      <span className="text-[var(--brand-primary)] font-bold">{formData.buffer_minutes} min</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={formData.buffer_minutes}
                      onChange={(e) => setFormData({ ...formData, buffer_minutes: Number(e.target.value) })}
                      className="w-full accent-[var(--brand-primary)] h-1.5 bg-[var(--surface-subtle)] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-[var(--text-subtle)] mt-1">
                      <span>5</span><span>15</span><span>30</span><span>45</span><span>60 min</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer with Glass Effect */}
        <div className="sticky bottom-0 p-5 border-t border-[var(--border-strong)]/50 flex items-center justify-between shrink-0 bg-[var(--surface-app)]/90 backdrop-blur-md">
          {currentStep === 1 ? (
            <>
              <button
                onClick={handleClose}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm px-4 py-2 hover:bg-[var(--surface-subtle)] rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleNext}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]hover text-black font-bold px-8 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-barber-gold/20"
              >
                Próximo
                <ChevronRight size={18} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setCurrentStep(1)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 text-sm px-4 py-2 hover:bg-[var(--surface-subtle)] rounded-lg"
              >
                <ChevronLeft size={16} />
                Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]hover text-black font-bold px-8 py-3 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-barber-gold/20"
              >
                <Check size={18} />
                {isLoading ? 'Salvando...' : (professional ? 'Salvar Alterações' : 'Concluir Cadastro')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalModal;
