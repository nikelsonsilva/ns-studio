import React, { useState, useEffect } from 'react';
import { X, UserPlus, Clock, Target, Percent, ChevronRight, ChevronLeft, Check, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { createProfessional, updateProfessional, getCurrentBusinessId } from '../lib/database';
import { supabase } from '../lib/supabase';
import { validatePhone, validateEmailComplete, normalizeEmail } from '../lib/validation';
import type { Professional } from '../types';

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

const ProfessionalModal: React.FC<ProfessionalModalProps> = ({ professional, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        specialty: '',
        commission_rate: 50,
        monthly_goal: 5000,
        buffer_minutes: 15,
        custom_buffer: false,
    });

    const [schedule, setSchedule] = useState<DaySchedule[]>([
        { day_of_week: 0, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00', is_active: false },
        { day_of_week: 1, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00', is_active: true },
        { day_of_week: 2, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00', is_active: true },
        { day_of_week: 3, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00', is_active: true },
        { day_of_week: 4, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00', is_active: true },
        { day_of_week: 5, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00', is_active: true },
        { day_of_week: 6, start_time: '09:00', end_time: '19:00', break_start: '12:00', break_end: '13:00', is_active: false },
    ]);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentStep, setCurrentStep] = useState<1 | 2>(1);
    const [phoneValidation, setPhoneValidation] = useState<{ valid: boolean; message?: string }>({ valid: true });
    const [emailValidation, setEmailValidation] = useState<{ valid: boolean; message?: string }>({ valid: true });

    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    useEffect(() => {
        if (professional) {
            setFormData({
                name: professional.name,
                email: professional.email || '',
                phone: professional.phone || '',
                specialty: professional.specialty || '',
                commission_rate: professional.commission_rate || 50,
                monthly_goal: professional.monthly_goal || 5000,
                buffer_minutes: professional.buffer_minutes || 15,
                custom_buffer: professional.custom_buffer || false,
            });
            loadProfessionalSchedule(professional.id);
        }
    }, [professional]);

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

            const dataToSend = {
                name: formData.name,
                specialty: formData.specialty,
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

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar profissional');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePhoneChange = async (value: string) => {
        setFormData({ ...formData, phone: value });
        if (value.trim()) {
            const validation = await validatePhone(value);
            setPhoneValidation(validation);
        } else {
            setPhoneValidation({ valid: true });
        }
    };

    const handleEmailChange = async (value: string) => {
        setFormData({ ...formData, email: value });
        if (value.trim()) {
            const validation = await validateEmailComplete(value);
            setEmailValidation(validation);
        } else {
            setEmailValidation({ valid: true });
        }
    };

    const handleNext = () => {
        if (!formData.name.trim()) {
            setError('Nome é obrigatório');
            return;
        }
        if (!formData.specialty.trim()) {
            setError('Especialidade é obrigatória');
            return;
        }
        if (formData.phone && !phoneValidation.valid) {
            setError('Corrija o telefone antes de continuar');
            return;
        }
        if (formData.email && !emailValidation.valid) {
            setError('Corrija o email antes de continuar');
            return;
        }
        setError('');
        setCurrentStep(2);
    };

    const updateSchedule = (index: number, field: keyof DaySchedule, value: any) => {
        const newSchedule = [...schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setSchedule(newSchedule);
    };

    const activeDays = schedule.filter(d => d.is_active);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-barber-900 w-full max-w-xl rounded-2xl border border-barber-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-5 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <UserPlus className="text-barber-gold" size={22} />
                        <h3 className="text-lg font-bold text-white">
                            {professional ? 'Editar Profissional' : 'Novo Profissional'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={22} />
                    </button>
                </div>

                {/* Step Indicator */}
                <div className="px-5 pb-5 flex justify-center gap-12">
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= 1 ? 'bg-barber-gold text-black' : 'bg-barber-800 text-gray-500'
                            }`}>
                            {currentStep > 1 ? <Check size={16} /> : '1'}
                        </div>
                        <span className={`text-xs mt-1.5 font-medium tracking-wider ${currentStep >= 1 ? 'text-barber-gold' : 'text-gray-500'
                            }`}>DADOS</span>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${currentStep === 2 ? 'bg-barber-gold border-barber-gold text-black' : 'bg-transparent border-gray-600 text-gray-500'
                            }`}>
                            2
                        </div>
                        <span className={`text-xs mt-1.5 font-medium tracking-wider ${currentStep === 2 ? 'text-barber-gold' : 'text-gray-500'
                            }`}>JORNADA</span>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 pb-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    {/* Step 1: DADOS */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            {/* Row 1: Nome + Especialidade */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1.5">
                                        Nome Completo
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-barber-gold transition-colors"
                                        placeholder="Ex: Carlos Silva"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1.5">
                                        Especialidade
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.specialty}
                                        onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                                        className="w-full bg-barber-950 border border-barber-800 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-barber-gold transition-colors"
                                        placeholder="Ex: Cortes Clássicos"
                                    />
                                </div>
                            </div>

                            {/* Row 2: Email + Telefone */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1.5">
                                        E-mail
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleEmailChange(e.target.value)}
                                            className={`w-full bg-barber-950 border text-white rounded-lg px-3 py-2.5 text-sm outline-none transition-colors pr-10 ${formData.email && !emailValidation.valid
                                                ? 'border-red-500 focus:border-red-500'
                                                : formData.email && emailValidation.valid
                                                    ? 'border-green-500 focus:border-green-500'
                                                    : 'border-barber-800 focus:border-barber-gold'
                                                }`}
                                            placeholder="profissional@email.com"
                                        />
                                        {formData.email && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {emailValidation.valid ? (
                                                    <CheckCircle className="text-green-500" size={16} />
                                                ) : (
                                                    <AlertCircle className="text-red-500" size={16} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {formData.email && !emailValidation.valid && emailValidation.message && (
                                        <p className="text-red-500 text-[10px] mt-1">{emailValidation.message}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1.5">
                                        Telefone / WhatsApp
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => handlePhoneChange(e.target.value)}
                                            className={`w-full bg-barber-950 border text-white rounded-lg px-3 py-2.5 text-sm outline-none transition-colors pr-10 ${formData.phone && !phoneValidation.valid
                                                ? 'border-red-500 focus:border-red-500'
                                                : formData.phone && phoneValidation.valid
                                                    ? 'border-green-500 focus:border-green-500'
                                                    : 'border-barber-800 focus:border-barber-gold'
                                                }`}
                                            placeholder="(11) 99999-9999"
                                        />
                                        {formData.phone && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                {phoneValidation.valid ? (
                                                    <CheckCircle className="text-green-500" size={16} />
                                                ) : (
                                                    <AlertCircle className="text-red-500" size={16} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    {formData.phone && !phoneValidation.valid && phoneValidation.message && (
                                        <p className="text-red-500 text-[10px] mt-1">{phoneValidation.message}</p>
                                    )}
                                </div>
                            </div>

                            {/* Row 3: Meta + Comissão */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-barber-950 border border-barber-800 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                                        <Target size={14} />
                                        <span className="text-[11px] uppercase tracking-wider">Meta Mensal (R$)</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={formData.monthly_goal}
                                        onChange={(e) => setFormData({ ...formData, monthly_goal: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-transparent text-white text-lg font-bold outline-none"
                                    />
                                </div>
                                <div className="bg-barber-950 border border-barber-800 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                                        <Percent size={14} />
                                        <span className="text-[11px] uppercase tracking-wider">Comissão (%)</span>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={formData.commission_rate}
                                        onChange={(e) => setFormData({ ...formData, commission_rate: parseInt(e.target.value) || 0 })}
                                        className="w-full bg-transparent text-white text-lg font-bold outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: JORNADA */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            {/* Horários de Trabalho */}
                            <div className="bg-barber-950 border border-barber-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar className="text-barber-gold" size={18} />
                                    <span className="text-white font-semibold">Horários de Trabalho</span>
                                </div>

                                <div className="space-y-2">
                                    {schedule.map((day, index) => (
                                        <div key={day.day_of_week} className={`flex items-center gap-3 py-2 ${!day.is_active ? 'opacity-50' : ''}`}>
                                            <span className="w-10 text-white font-medium text-sm">{dayNames[day.day_of_week]}</span>

                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    type="time"
                                                    value={day.start_time}
                                                    onChange={(e) => updateSchedule(index, 'start_time', e.target.value)}
                                                    disabled={!day.is_active}
                                                    className="bg-barber-900 border border-barber-700 text-white rounded px-2 py-1 text-sm w-20 text-center outline-none focus:border-barber-gold disabled:opacity-50"
                                                />
                                                <span className="text-gray-500">-</span>
                                                <input
                                                    type="time"
                                                    value={day.end_time}
                                                    onChange={(e) => updateSchedule(index, 'end_time', e.target.value)}
                                                    disabled={!day.is_active}
                                                    className="bg-barber-900 border border-barber-700 text-white rounded px-2 py-1 text-sm w-20 text-center outline-none focus:border-barber-gold disabled:opacity-50"
                                                />
                                            </div>

                                            {/* Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => updateSchedule(index, 'is_active', !day.is_active)}
                                                className={`w-12 h-6 rounded-full transition-colors relative ${day.is_active ? 'bg-green-500' : 'bg-gray-600'
                                                    }`}
                                            >
                                                <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${day.is_active ? 'right-0.5' : 'left-0.5'
                                                    }`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Intervalos de Pausa */}
                            {activeDays.length > 0 && (
                                <div className="bg-barber-950 border border-barber-800 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Calendar className="text-barber-gold" size={18} />
                                        <span className="text-white font-semibold">Intervalos de Pausa</span>
                                    </div>

                                    <div className="space-y-2">
                                        {schedule.filter(d => d.is_active).map((day) => {
                                            const index = schedule.findIndex(s => s.day_of_week === day.day_of_week);
                                            return (
                                                <div key={day.day_of_week} className="flex items-center gap-3 py-2">
                                                    <span className="w-10 text-white font-medium text-sm">{dayNames[day.day_of_week]}</span>

                                                    <span className="text-gray-500 text-sm">PAUSA:</span>

                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="time"
                                                            value={day.break_start || '12:00'}
                                                            onChange={(e) => updateSchedule(index, 'break_start', e.target.value)}
                                                            className="bg-barber-900 border border-barber-700 text-white rounded px-2 py-1 text-sm w-20 text-center outline-none focus:border-barber-gold"
                                                        />
                                                        <span className="text-gray-500">-</span>
                                                        <input
                                                            type="time"
                                                            value={day.break_end || '13:00'}
                                                            onChange={(e) => updateSchedule(index, 'break_end', e.target.value)}
                                                            className="bg-barber-900 border border-barber-700 text-white rounded px-2 py-1 text-sm w-20 text-center outline-none focus:border-barber-gold"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Usar Buffer Customizado */}
                            <div className="bg-barber-950 border border-barber-800 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="text-white font-semibold">Usar Buffer Customizado</div>
                                        <div className="text-gray-500 text-xs">Se desativado, usa o buffer global do estabelecimento</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, custom_buffer: !formData.custom_buffer })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${formData.custom_buffer ? 'bg-green-500' : 'bg-gray-600'
                                            }`}
                                    >
                                        <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all ${formData.custom_buffer ? 'right-0.5' : 'left-0.5'
                                            }`} />
                                    </button>
                                </div>

                                {formData.custom_buffer ? (
                                    <div className="pt-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-gray-400 text-sm">Intervalo</span>
                                            <span className="text-barber-gold font-bold">{formData.buffer_minutes} min</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="60"
                                            step="5"
                                            value={formData.buffer_minutes}
                                            onChange={(e) => setFormData({ ...formData, buffer_minutes: Number(e.target.value) })}
                                            className="w-full accent-barber-gold h-1.5 bg-barber-800 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                            <span>0 min</span>
                                            <span>15 min</span>
                                            <span>30 min</span>
                                            <span>45 min</span>
                                            <span>60 min</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center py-4 text-gray-500">
                                        <Clock size={32} className="mb-2 opacity-50" />
                                        <span className="text-sm">Usando buffer global do estabelecimento</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 flex items-center justify-between shrink-0">
                    {currentStep === 1 ? (
                        <>
                            <div />
                            <button
                                onClick={handleNext}
                                className="bg-barber-gold hover:bg-barber-goldhover text-black font-bold px-8 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                            >
                                Próximo
                                <ChevronRight size={18} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setCurrentStep(1)}
                                className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-sm"
                            >
                                <ChevronLeft size={16} />
                                Voltar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                <Check size={18} />
                                {isLoading ? 'Salvando...' : 'Concluir Cadastro'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfessionalModal;
