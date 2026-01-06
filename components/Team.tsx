
import React, { useState, useEffect, useRef } from 'react';
import {
  Star,
  Scissors,
  Banknote,
  Trophy,
  Target,
  Crown,
  Calendar,
  Check,
  UserPlus,
  Phone,
  Mail,
  User,
  Clock,
  TrendingUp,
  LayoutGrid,
  List,
  Trash2,
  UserMinus,
  Zap,
  Wallet,
  AlertCircle,
  X,
  FileText,
  ChevronRight
} from 'lucide-react';
import { Barber, WorkDay, Service, Professional } from '../types';
import ManualBookingModal from './ManualBookingModal';

import { useSupabaseQuery } from '../lib/hooks';
import { fetchProfessionals, fetchServices } from '../lib/database';
import { supabase } from '../lib/supabase';
import { formatCPF, validateCPFLocal } from '../lib/cpfValidation';

// UI Components (Design System)
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Switch from './ui/Switch';
import Modal from './ui/Modal';
import { useToast } from './ui/Toast';

// --- Sub-componente para Avatar Seguro ---
const BarberAvatar = ({ barber, size = 'md', className = '' }: { barber: Partial<Barber> & { avatar?: string }, size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl', className?: string }) => {
  const [imgError, setImgError] = useState(false);

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-3xl',
    '2xl': 'w-24 h-24 md:w-32 md:h-32 text-2xl md:text-4xl'
  };

  if (barber.avatar && !imgError) {
    return (
      <img
        src={barber.avatar}
        alt={barber.name}
        onError={() => setImgError(true)}
        className={`rounded-full object-cover border-2 border-zinc-800 ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div className={`rounded-full flex items-center justify-center font-bold text-white shadow-inner bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-600 ${sizeClasses[size]} ${className}`}>
      {getInitials(barber.name || '')}
    </div>
  );
};

interface ProfessionalStats {
  revenue: number;
  appointments: number;
  avgTicket: number;
}

type ModalTab = 'profile' | 'finance' | 'services' | 'schedule';

interface TeamProps { }

const Team: React.FC<TeamProps> = () => {
  const toast = useToast();
  const { data: barbersData, loading: loadingBarbers, refetch: refetchProfessionals } = useSupabaseQuery(fetchProfessionals);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [professionalStats, setProfessionalStats] = useState<Record<string, ProfessionalStats>>({});
  const [isDataReady, setIsDataReady] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<ModalTab>('profile');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [viewingAgenda, setViewingAgenda] = useState<Barber | null>(null);

  useEffect(() => {
    if (barbersData) {
      setIsDataReady(false);
      setStatsLoading(true);
      loadProfessionalAvailability(barbersData).then(async barbersWithSchedule => {
        setBarbers(barbersWithSchedule);
        await loadProfessionalStats(barbersWithSchedule);
        setStatsLoading(false);
        setIsDataReady(true);
      });
    }
  }, [barbersData]);

  const loadProfessionalAvailability = async (professionals: Barber[]): Promise<Barber[]> => {
    const profIds = professionals.map(p => p.id);
    const { data: availabilityData, error } = await supabase
      .from('professional_availability')
      .select('*')
      .in('professional_id', profIds);

    if (error) return professionals;

    const availabilityMap: Record<string, any[]> = {};
    (availabilityData || []).forEach(avail => {
      if (!availabilityMap[avail.professional_id]) {
        availabilityMap[avail.professional_id] = [];
      }
      availabilityMap[avail.professional_id].push({
        dayOfWeek: avail.day_of_week,
        startTime: avail.start_time,
        endTime: avail.end_time,
        breakStart: avail.break_start,
        breakEnd: avail.break_end,
        active: avail.is_active
      });
    });

    return professionals.map(prof => ({
      ...prof,
      workSchedule: availabilityMap[prof.id] || []
    }));
  };

  // OPTIMIZED: Single query for all professionals instead of N queries
  const loadProfessionalStats = async (professionals: Barber[]) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const profIds = professionals.map(p => p.id);

    // Single query to get ALL appointments for ALL professionals in this month
    const { data, error } = await supabase
      .from('appointments')
      .select(`id, professional_id, start_datetime, payment_status, status, services (price)`)
      .in('professional_id', profIds)
      .gte('start_datetime', startOfMonth)
      .lte('start_datetime', endOfMonth);

    const statsMap: Record<string, ProfessionalStats> = {};

    // Initialize all professionals with zero stats
    professionals.forEach(prof => {
      statsMap[prof.id] = { revenue: 0, appointments: 0, avgTicket: 0 };
    });

    if (error || !data) {
      setProfessionalStats(statsMap);
      return;
    }

    // Process all appointments and group by professional
    const paidAppointments = data.filter((apt: any) =>
      apt.payment_status === 'paid' || apt.status === 'completed'
    );

    paidAppointments.forEach((apt: any) => {
      const profId = apt.professional_id;
      if (!statsMap[profId]) return;

      const price = (apt.services as any)?.price || 0;
      statsMap[profId].revenue += price;
      statsMap[profId].appointments += 1;
    });

    // Calculate average ticket for each professional
    Object.keys(statsMap).forEach(profId => {
      const stats = statsMap[profId];
      stats.avgTicket = stats.appointments > 0 ? Math.round(stats.revenue / stats.appointments) : 0;
    });

    setProfessionalStats(statsMap);
  };

  // Filter only active professionals before ranking for Top Performance
  // Sort by revenue DESC, then by name ASC as tiebreaker for consistent ordering
  const rankedBarbers = [...barbers]
    .filter(b => b.is_active !== false)
    .sort((a, b) => {
      const revenueA = professionalStats[a.id]?.revenue || 0;
      const revenueB = professionalStats[b.id]?.revenue || 0;
      // Primary sort: by revenue (descending)
      if (revenueB !== revenueA) {
        return revenueB - revenueA;
      }
      // Secondary sort: by name (ascending) as tiebreaker
      return (a.name || '').localeCompare(b.name || '');
    });

  const teamStats = {
    totalSales: (Object.values(professionalStats) as ProfessionalStats[]).reduce((sum, s) => sum + s.revenue, 0),
    goalProgress: (() => {
      const totalGoal = barbers.reduce((acc, b) => acc + (b.monthly_goal || 5000), 0);
      const totalSales = (Object.values(professionalStats) as ProfessionalStats[]).reduce((sum, s) => sum + s.revenue, 0);
      return totalGoal > 0 ? Math.round((totalSales / totalGoal) * 100) : 0;
    })(),
    activeBarbers: barbers.filter(b => b.is_active !== false).length,
    avgCommission: Math.round(barbers.reduce((acc, b) => acc + (b.commission_rate || 50), 0) / (barbers.length || 1))
  };

  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);

  // Agenda Modal State
  const [agendaSlots, setAgendaSlots] = useState<{
    time: string;
    client: string;
    service: string;
    status: 'livre' | 'confirmado' | 'pendente' | 'concluido' | 'bloqueado' | 'cancelado' | 'passado';
    isPast?: boolean;
  }[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);

  // Manual Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingTime, setBookingTime] = useState<string>('');

  // Photo Upload State
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Save Loading State
  const [savingBarber, setSavingBarber] = useState(false);

  const [allServices, setAllServices] = useState<Service[]>([]);
  const [professionalServices, setProfessionalServices] = useState<string[]>([]);

  useEffect(() => {
    const loadServices = async () => {
      const services = await fetchServices();
      setAllServices(services);
    };
    loadServices();
  }, []);

  useEffect(() => {
    if (editingBarber?.id) {
      loadProfessionalServices(editingBarber.id);
    } else {
      setProfessionalServices([]);
    }
  }, [editingBarber?.id]);

  // Load agenda when viewing a professional's schedule
  useEffect(() => {
    if (viewingAgenda?.id) {
      loadProfessionalAgenda(viewingAgenda);
    }
  }, [viewingAgenda?.id]);

  const loadProfessionalAgenda = async (professional: Barber) => {
    setLoadingAgenda(true);

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString();
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
    const dayOfWeek = today.getDay();

    try {
      // Get professional's work schedule for today - supports both camelCase and snake_case
      const rawSchedule = professional.workSchedule?.find(s => s.dayOfWeek === dayOfWeek);
      if (!rawSchedule || !rawSchedule.active) {
        setAgendaSlots([]);
        setLoadingAgenda(false);
        return;
      }

      // Handle both camelCase and snake_case field names from database
      const startTime = (rawSchedule as any).startTime || (rawSchedule as any).start_time || '09:00';
      const endTime = (rawSchedule as any).endTime || (rawSchedule as any).end_time || '19:00';
      const breakStart = (rawSchedule as any).breakStart || (rawSchedule as any).break_start || null;
      const breakEnd = (rawSchedule as any).breakEnd || (rawSchedule as any).break_end || null;

      // Fetch appointments for this professional today
      const { data: appointments, error: aptError } = await supabase
        .from('appointments')
        .select(`
          id, 
          start_datetime, 
          end_datetime, 
          status, 
          clients (name),
          services (name)
        `)
        .eq('professional_id', professional.id)
        .gte('start_datetime', startOfDay)
        .lte('start_datetime', endOfDay)
        .order('start_datetime', { ascending: true });

      // Fetch time blocks for today
      const { data: blocks, error: blockError } = await supabase
        .from('time_blocks')
        .select('*')
        .or(`professional_id.eq.${professional.id},professional_id.is.null`)
        .gte('start_datetime', startOfDay)
        .lte('start_datetime', endOfDay);

      // Generate time slots from work schedule
      const slots: typeof agendaSlots = [];
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);

      // Get current time for past slot detection
      const now = new Date();
      const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      for (let h = startHour; h < endHour || (h === endHour && 0 < endMin); h++) {
        for (let m = 0; m < 60; m += 30) {
          if (h === startHour && m < startMin) continue;
          if (h === endHour && m >= endMin) break;

          const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          const isPastSlot = timeStr < currentTimeStr;

          // Check if this slot is during break
          if (breakStart && breakEnd && timeStr >= breakStart && timeStr < breakEnd) {
            slots.push({ time: timeStr, client: 'Almoço/Pausa', service: '', status: 'bloqueado', isPast: isPastSlot });
            continue;
          }

          // Check if there's an appointment at this time
          const apt = (appointments || []).find((a: any) => {
            const aptTime = new Date(a.start_datetime);
            const aptTimeStr = `${aptTime.getHours().toString().padStart(2, '0')}:${aptTime.getMinutes().toString().padStart(2, '0')}`;
            return aptTimeStr === timeStr;
          });

          // Check if there's a block at this time
          const block = (blocks || []).find((b: any) => {
            const blockTime = new Date(b.start_datetime);
            const blockTimeStr = `${blockTime.getHours().toString().padStart(2, '0')}:${blockTime.getMinutes().toString().padStart(2, '0')}`;
            return blockTimeStr === timeStr;
          });

          if (block) {
            slots.push({ time: timeStr, client: block.reason || 'Bloqueado', service: '', status: 'bloqueado', isPast: isPastSlot });
          } else if (apt) {
            const statusMap: Record<string, 'confirmado' | 'pendente' | 'concluido' | 'cancelado'> = {
              'confirmed': 'confirmado',
              'pending': 'pendente',
              'completed': 'concluido',
              'cancelled': 'cancelado'
            };
            slots.push({
              time: timeStr,
              client: (apt as any).clients?.name || 'Cliente',
              service: (apt as any).services?.name || 'Serviço',
              status: statusMap[(apt as any).status] || 'pendente',
              isPast: isPastSlot
            });
          } else {
            // Free slot - check if past
            if (isPastSlot) {
              slots.push({ time: timeStr, client: '', service: '', status: 'passado', isPast: true });
            } else {
              slots.push({ time: timeStr, client: '', service: '', status: 'livre', isPast: false });
            }
          }
        }
      }

      setAgendaSlots(slots);
    } catch (error) {
      console.error('Error loading agenda:', error);
      setAgendaSlots([]);
    } finally {
      setLoadingAgenda(false);
    }
  };

  const loadProfessionalServices = async (professionalId: string) => {
    const { data, error } = await supabase
      .from('professional_services')
      .select('service_id')
      .eq('professional_id', professionalId);

    if (error) {
      setProfessionalServices([]);
      return;
    }
    setProfessionalServices(data?.map(d => d.service_id) || []);
  };

  const toggleServiceForProfessional = (serviceId: string) => {
    setProfessionalServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const formatCurrencyValue = (value: number): string => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyInput = (inputValue: string): number => {
    const digits = inputValue.replace(/\D/g, '');
    return parseInt(digits || '0', 10) / 100;
  };

  const formatPhoneRealtime = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const getProfessionalStatus = (barber: Barber): { status: 'online' | 'offline' | 'paused', label: string } => {
    if (barber.is_active === false) {
      return { status: 'offline', label: 'Inativo' };
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const normalizeTime = (time: string | null | undefined): string => {
      if (!time) return '';
      return time.substring(0, 5);
    };

    const schedule = barber.workSchedule?.find(s => s.dayOfWeek === dayOfWeek);

    if (!schedule || !schedule.active) {
      return { status: 'offline', label: 'Folga' };
    }

    const startTime = normalizeTime((schedule as any).startTime || (schedule as any).start_time);
    const endTime = normalizeTime((schedule as any).endTime || (schedule as any).end_time);
    const breakStart = normalizeTime((schedule as any).breakStart || (schedule as any).break_start);
    const breakEnd = normalizeTime((schedule as any).breakEnd || (schedule as any).break_end);

    if (currentTime < startTime || currentTime >= endTime) {
      return { status: 'offline', label: 'Fora do expediente' };
    }

    if (breakStart && breakEnd && currentTime >= breakStart && currentTime < breakEnd) {
      return { status: 'paused', label: 'Em pausa' };
    }

    return { status: 'online', label: 'Online' };
  };

  const handleEditClick = (barber: Barber) => {
    const schedule = barber.workSchedule || barber.work_schedule || [0, 1, 2, 3, 4, 5, 6].map(d => ({
      dayOfWeek: d, startTime: '09:00', endTime: '19:00', active: d !== 0
    }));

    setEditingBarber({ ...barber, workSchedule: schedule });
    setActiveTab('profile');
    setSelectedPhotoFile(null); // Reset photo file when opening modal
  };

  // Upload photo to Supabase Storage
  const uploadProfessionalPhoto = async (file: File, professionalId: string, oldAvatarUrl?: string): Promise<string | null> => {
    try {
      setUploadingPhoto(true);

      // Delete old photo if exists
      if (oldAvatarUrl && oldAvatarUrl.includes('supabase')) {
        const oldPath = oldAvatarUrl.split('/storage/v1/object/public/')[1];
        if (oldPath) {
          const bucketAndPath = oldPath.split('/');
          const bucket = bucketAndPath[0];
          const filePath = bucketAndPath.slice(1).join('/');
          await supabase.storage.from(bucket).remove([filePath]);
        }
      }

      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${professionalId}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload new photo
      const { data, error } = await supabase.storage
        .from('professional-photos')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('professional-photos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao fazer upload da foto');
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveBarber = async () => {
    if (!editingBarber) return;

    setSavingBarber(true);

    // Validate CPF if provided
    if (editingBarber.cpf) {
      const cleanCPF = editingBarber.cpf.replace(/\D/g, '');
      if (cleanCPF.length > 0 && !validateCPFLocal(cleanCPF)) {
        toast.error('CPF inválido');
        setSavingBarber(false);
        return;
      }
    }

    const dataToSave: Record<string, any> = {
      name: editingBarber.name,
      phone: editingBarber.phone,
      email: editingBarber.email,
      specialty: editingBarber.specialty,
      // Note: cpf and birth_date columns need to be added via migration
      // cpf: editingBarber.cpf,
      // birth_date: editingBarber.birth_date,
      commission_rate: editingBarber.commission_rate || 50,
      monthly_goal: editingBarber.monthly_goal || 0,
      is_active: editingBarber.is_active !== false,
      buffer_minutes: editingBarber.buffer_minutes || 15,
      custom_buffer: editingBarber.custom_buffer || false
    };

    // Upload photo if a new file was selected
    if (selectedPhotoFile) {
      const newAvatarUrl = await uploadProfessionalPhoto(
        selectedPhotoFile,
        editingBarber.id,
        editingBarber.avatar
      );
      if (newAvatarUrl) {
        dataToSave.avatar = newAvatarUrl;
      }
    }

    try {
      const isNewProfessional = !editingBarber.id;
      let professionalId = editingBarber.id;

      if (isNewProfessional) {
        // Create new professional
        dataToSave.business_id = editingBarber.business_id;

        const { data: newProf, error: createError } = await supabase
          .from('professionals')
          .insert(dataToSave)
          .select()
          .single();

        if (createError) throw createError;
        professionalId = newProf.id;

        // Upload photo after we have the ID
        if (selectedPhotoFile) {
          const newAvatarUrl = await uploadProfessionalPhoto(
            selectedPhotoFile,
            professionalId,
            undefined
          );
          if (newAvatarUrl) {
            await supabase.from('professionals').update({ avatar: newAvatarUrl }).eq('id', professionalId);
          }
        }
      } else {
        // Update existing professional
        const { error: profError } = await supabase
          .from('professionals')
          .update(dataToSave)
          .eq('id', editingBarber.id);

        if (profError) throw profError;
      }

      // Save work schedule
      if (editingBarber.workSchedule && editingBarber.workSchedule.length > 0) {
        await supabase.from('professional_availability').delete().eq('professional_id', professionalId);

        const availabilityData = editingBarber.workSchedule.map(day => ({
          professional_id: professionalId,
          business_id: editingBarber.business_id,
          day_of_week: day.dayOfWeek,
          start_time: day.startTime,
          end_time: day.endTime,
          break_start: day.breakStart || null,
          break_end: day.breakEnd || null,
          is_active: day.active
        }));

        await supabase.from('professional_availability').insert(availabilityData);
      }

      // Save services
      await supabase.from('professional_services').delete().eq('professional_id', professionalId);

      if (professionalServices.length > 0) {
        const serviceAssociations = professionalServices.map(serviceId => ({
          professional_id: professionalId,
          service_id: serviceId,
          business_id: editingBarber.business_id
        }));

        await supabase.from('professional_services').insert(serviceAssociations);
      }

      setEditingBarber(null);
      setSelectedPhotoFile(null);
      refetchProfessionals();
      toast.success(isNewProfessional ? 'Profissional cadastrado com sucesso!' : 'Profissional salvo com sucesso!');
    } catch (error) {
      console.error('Error saving professional:', error);
      toast.error('Erro ao salvar profissional');
    } finally {
      setSavingBarber(false);
    }
  };

  const handleDeactivateBarber = (barberId: string) => {
    toast.confirm(
      'Tem certeza que deseja desativar este profissional?',
      async () => {
        try {
          const { error } = await supabase
            .from('professionals')
            .update({ is_active: false })
            .eq('id', barberId);

          if (error) throw error;

          setBarbers(prev => prev.map(b => b.id === barberId ? { ...b, is_active: false } : b));
          setEditingBarber(null);
          toast.success('Profissional desativado com sucesso');
        } catch (error) {
          toast.error('Erro ao desativar profissional');
        }
      }
    );
  };

  const updateSchedule = (dayIndex: number, field: keyof WorkDay, value: any) => {
    if (!editingBarber || !editingBarber.workSchedule) return;
    const newSchedule = [...editingBarber.workSchedule];
    newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
    setEditingBarber({ ...editingBarber, workSchedule: newSchedule });
  };

  const handleCreateProfessional = () => {
    // Create a new empty professional with default values
    const existingBusinessId = barbers[0]?.business_id || '';
    const newProfessional = {
      id: '', // Empty ID indicates new professional
      name: '',
      specialty: '',
      email: '',
      phone: '',
      avatar: '',
      commission_rate: 50,
      monthly_goal: 5000,
      is_active: true,
      buffer_minutes: 15,
      custom_buffer: false,
      rating: 5.0,
      business_id: existingBusinessId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workSchedule: [0, 1, 2, 3, 4, 5, 6].map(d => ({
        dayOfWeek: d,
        startTime: '09:00',
        endTime: '19:00',
        breakStart: '12:00',
        breakEnd: '13:00',
        active: d !== 0 // Sunday off by default
      }))
    } as Barber;
    setEditingBarber(newProfessional);
    setActiveTab('profile');
    setSelectedPhotoFile(null);
  };

  const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const getGradient = (index: number) => {
    if (index === 0) return 'from-yellow-400 to-amber-600';
    if (index === 1) return 'from-gray-300 to-gray-500';
    if (index === 2) return 'from-orange-400 to-red-700';
    return 'from-zinc-800 to-zinc-900';
  };

  const filteredBarbers = barbers.filter(barber => {
    // Filter by active status (unless showInactive is true)
    if (!showInactive && barber.is_active === false) return false;
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      return barber.name?.toLowerCase().includes(query) || barber.specialty?.toLowerCase().includes(query);
    }
    return true;
  });

  const renderScheduleRow = (day: WorkDay, idx: number) => (
    <div key={idx} className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border mb-2 transition-all ${day.active ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-950/50 border-zinc-800/30 opacity-60'}`}>
      <div className="w-full sm:w-24 shrink-0 flex justify-between sm:block">
        <div className="text-xs font-bold uppercase text-muted tracking-wider">{daysMap[day.dayOfWeek]}</div>
        <div className="sm:hidden">
          <Switch checked={day.active} onCheckedChange={(c) => updateSchedule(idx, 'active', c)} />
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-4 w-full">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted uppercase font-bold">Turno</span>
          <div className="flex items-center gap-2">
            <input type="time" value={day.startTime} onChange={(e) => updateSchedule(idx, 'startTime', e.target.value)} disabled={!day.active} className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none w-full focus:border-barber-gold" />
            <span className="text-muted text-xs">às</span>
            <input type="time" value={day.endTime} onChange={(e) => updateSchedule(idx, 'endTime', e.target.value)} disabled={!day.active} className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none w-full focus:border-barber-gold" />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[9px] text-muted uppercase font-bold">Almoço</span>
          <div className="flex items-center gap-2">
            <input type="time" value={day.breakStart || ''} onChange={(e) => updateSchedule(idx, 'breakStart', e.target.value)} disabled={!day.active} className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none w-full focus:border-barber-gold" />
            <span className="text-muted text-xs">às</span>
            <input type="time" value={day.breakEnd || ''} onChange={(e) => updateSchedule(idx, 'breakEnd', e.target.value)} disabled={!day.active} className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none w-full focus:border-barber-gold" />
          </div>
        </div>
      </div>

      <div className="hidden sm:flex justify-end pl-2 border-l border-zinc-800">
        <Switch checked={day.active} onCheckedChange={(c) => updateSchedule(idx, 'active', c)} />
      </div>
    </div>
  );

  const renderModalContent = () => {
    if (!editingBarber) return null;

    const target = editingBarber;
    const setTarget = setEditingBarber;

    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col items-center justify-center mb-6">
              <BarberAvatar barber={target} size="2xl" />
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Store file for upload on save
                    setSelectedPhotoFile(file);
                    // Create preview URL
                    const url = URL.createObjectURL(file);
                    setTarget({ ...target, avatar: url });
                    toast.success('Foto selecionada! Clique em Salvar para confirmar.');
                  }
                }}
              />
              <button
                className="mt-3 text-xs text-barber-gold hover:underline flex items-center gap-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? 'Enviando...' : 'Alterar Foto'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Nome Completo" value={target.name} onChange={e => setTarget({ ...target, name: e.target.value })} icon={<User size={16} />} />
              <Input label="Especialidade" value={target.specialty} onChange={e => setTarget({ ...target, specialty: e.target.value })} icon={<Scissors size={16} />} />
              <Input label="E-mail" type="email" value={target.email || ''} onChange={e => setTarget({ ...target, email: e.target.value })} icon={<Mail size={16} />} />
              <Input label="Telefone" type="tel" value={target.phone || ''} onChange={e => setTarget({ ...target, phone: formatPhoneRealtime(e.target.value) })} icon={<Phone size={16} />} />
              <Input label="CPF" value={target.cpf || ''} onChange={e => setTarget({ ...target, cpf: formatCPF(e.target.value) })} icon={<FileText size={16} />} placeholder="000.000.000-00" />
              <Input label="Data de Nascimento" type="date" value={target.birth_date || ''} onChange={e => setTarget({ ...target, birth_date: e.target.value })} icon={<Calendar size={16} />} />
            </div>
          </div>
        );
      case 'finance':
        const stats = professionalStats[target.id] || { revenue: 0 };
        const totalSales = stats.revenue;
        const commRate = target.commission_rate || 50;
        const totalCommission = totalSales * (commRate / 100);

        return (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Meta Mensal (R$)" type="text" value={formatCurrencyValue(target.monthly_goal || 0)} onChange={e => setTarget({ ...target, monthly_goal: parseCurrencyInput(e.target.value) })} icon={<Target size={16} />} />
              <Input label="Comissão (%)" type="number" value={target.commission_rate || 50} onChange={e => setTarget({ ...target, commission_rate: Number(e.target.value) })} icon={<Banknote size={16} />} />
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mt-4">
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Wallet size={16} className="text-emerald-500" /> Resumo de Comissões (Mês Atual)
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-center">
                  <div className="text-[10px] text-muted uppercase font-bold">Gerado</div>
                  <div className="text-lg font-bold text-white mt-1">R$ {totalCommission.toFixed(2)}</div>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 text-center">
                  <div className="text-[10px] text-emerald-500 uppercase font-bold">Pago</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">R$ {(totalCommission * 0.7).toFixed(2)}</div>
                </div>
                <div className="bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 text-center">
                  <div className="text-[10px] text-amber-500 uppercase font-bold">Pendente</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">R$ {(totalCommission * 0.3).toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        );
      case 'services':
        return (
          <div className="animate-fade-in">
            <div className="p-3 mb-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300 flex items-center gap-2">
              <Zap size={14} /> Ative os interruptores para habilitar os serviços deste profissional.
            </div>
            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {allServices.map(s => {
                const isEnabled = professionalServices.includes(s.id);
                return (
                  <div key={s.id} className={`p-3 rounded-xl border flex items-center justify-between transition-all ${isEnabled ? 'bg-zinc-900 border-barber-gold/30' : 'bg-zinc-950 border-zinc-800 opacity-60'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${isEnabled ? 'bg-barber-gold text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <div className={`font-bold text-sm ${isEnabled ? 'text-white' : 'text-muted'}`}>{s.name}</div>
                        <div className="text-[10px] text-muted">R$ {s.price.toFixed(2)} • {s.duration} min</div>
                      </div>
                    </div>
                    <Switch checked={isEnabled} onCheckedChange={() => toggleServiceForProfessional(s.id)} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      case 'schedule':
        return (
          <div className="animate-fade-in space-y-4">
            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {target.workSchedule?.map((day, idx) => renderScheduleRow(day, idx))}
            </div>
          </div>
        );
    }
  };

  // Show loading skeleton while data is being fetched
  if (loadingBarbers || !isDataReady) {
    return (
      <div className="space-y-8 animate-fade-in pb-20">
        {/* Header Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card noPadding className="md:col-span-2 p-5 bg-gradient-to-r from-zinc-900 to-zinc-950">
            <div className="h-6 w-48 bg-zinc-800 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-64 bg-zinc-800/50 rounded animate-pulse"></div>
          </Card>
          <Card noPadding className="p-4">
            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-2"></div>
            <div className="h-8 w-32 bg-zinc-800/50 rounded animate-pulse"></div>
          </Card>
          <Card noPadding className="p-4">
            <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse mb-2"></div>
            <div className="h-8 w-32 bg-zinc-800/50 rounded animate-pulse"></div>
          </Card>
        </div>

        {/* Podium Skeleton */}
        <div className="flex items-end justify-center gap-8 min-h-[220px] pb-4">
          <div className="flex flex-col items-center w-40">
            <div className="w-16 h-16 bg-zinc-800 rounded-full animate-pulse mb-3"></div>
            <div className="w-full h-40 bg-zinc-800/50 rounded-t-2xl animate-pulse"></div>
          </div>
          <div className="flex flex-col items-center w-40">
            <div className="w-20 h-20 bg-zinc-800 rounded-full animate-pulse mb-3"></div>
            <div className="w-full h-48 bg-zinc-800/50 rounded-t-2xl animate-pulse"></div>
          </div>
          <div className="flex flex-col items-center w-40">
            <div className="w-16 h-16 bg-zinc-800 rounded-full animate-pulse mb-3"></div>
            <div className="w-full h-32 bg-zinc-800/50 rounded-t-2xl animate-pulse"></div>
          </div>
        </div>

        {/* List Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} noPadding className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-24 bg-zinc-800/50 rounded animate-pulse"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">

      {/* Header Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card noPadding className="md:col-span-2 p-5 bg-gradient-to-r from-zinc-900 to-zinc-950 border-l-4 border-l-barber-gold flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white text-center sm:text-left">Equipe NS Studio</h2>
            <p className="text-sm text-muted mt-1 text-center sm:text-left">Gerencie performance e escalas.</p>
          </div>
          <Button onClick={handleCreateProfessional} leftIcon={<UserPlus size={18} />} className="w-full sm:w-auto">
            Novo Profissional
          </Button>
        </Card>

        <Card noPadding className="p-4 flex flex-col justify-center border-l-4 border-l-emerald-500">
          <span className="text-xs font-bold uppercase text-muted tracking-wider">Vendas Totais (Mês)</span>
          <div className="text-2xl font-bold text-white mt-1">R$ {teamStats.totalSales.toLocaleString('pt-BR')}</div>
          <div className="text-[10px] text-emerald-500 font-bold mt-1 flex items-center gap-1">
            <TrendingUp size={12} /> {teamStats.goalProgress}% da meta global
          </div>
        </Card>

        <Card noPadding className="p-4 flex flex-col justify-center border-l-4 border-l-sky-500">
          <span className="text-xs font-bold uppercase text-muted tracking-wider">Profissionais</span>
          <div className="text-2xl font-bold text-white mt-1">{teamStats.activeBarbers} <span className="text-sm text-muted font-normal">Ativos</span></div>
          <div className="text-[10px] text-sky-500 font-bold mt-1">
            Média Com.: {teamStats.avgCommission}%
          </div>
        </Card>
      </div>

      {/* Podium Section */}
      <div className="relative overflow-hidden md:overflow-visible pt-8">
        <div className="absolute inset-0 bg-gradient-to-b from-barber-gold/5 to-transparent h-40 pointer-events-none rounded-3xl"></div>
        <div className="relative z-10 text-center mb-8">
          <h3 className="text-lg font-bold text-barber-gold uppercase tracking-widest flex items-center justify-center gap-2">
            <Trophy size={20} /> Top Performance
          </h3>
        </div>

        {/* Responsive Podium Container - Show skeleton while loading stats */}
        {statsLoading ? (
          <div className="flex items-end justify-center gap-2 md:gap-8 min-h-[220px] pb-4 px-2">
            {[1, 0, 2].map((order, i) => (
              <div key={i} className="flex flex-col items-center w-28 md:w-40 shrink-0" style={{ order }}>
                <div className={`${i === 0 ? 'w-20 h-20' : 'w-16 h-16'} bg-zinc-800 rounded-full animate-pulse mb-3`}></div>
                <div className={`w-full ${i === 0 ? 'h-40 md:h-48' : i === 1 ? 'h-32 md:h-40' : 'h-24 md:h-32'} bg-zinc-800/50 rounded-t-2xl animate-pulse`}></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-end justify-center gap-2 md:gap-8 min-h-[220px] pb-4 px-2">
            {rankedBarbers.slice(0, 3).map((barber, index) => {
              const stats = professionalStats[barber.id] || { revenue: 0 };
              // Order: 2nd (left), 1st (center), 3rd (right) visually
              const visualOrder = index === 0 ? 1 : index === 1 ? 0 : 2;
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;
              const heightClass = isFirst ? 'h-40 md:h-48' : isSecond ? 'h-32 md:h-40' : 'h-24 md:h-32';
              // Gradients: Gold, Silver, Bronze
              const podiumGradient = isFirst
                ? 'from-yellow-400 to-amber-600'
                : isSecond
                  ? 'from-gray-300 to-gray-500'
                  : 'from-amber-600 to-orange-700';
              // Avatar borders: Gold, Silver, Bronze
              const avatarBorder = isFirst
                ? 'border-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.4)]'
                : isSecond
                  ? 'border-gray-300 shadow-[0_0_15px_rgba(200,200,200,0.3)]'
                  : 'border-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.4)]';

              return (
                <div key={barber.id} className="flex flex-col items-center transition-all hover:-translate-y-2 duration-300 w-28 md:w-40 shrink-0" style={{ order: visualOrder }}>
                  <div className="relative mb-3">
                    <BarberAvatar
                      barber={barber}
                      size={isFirst ? 'xl' : 'lg'}
                      className={`border-4 ${avatarBorder}`}
                    />
                    {isFirst && <Crown size={32} className="absolute -top-8 left-1/2 -translate-x-1/2 text-yellow-400 fill-yellow-400 drop-shadow-lg animate-bounce" style={{ animationDuration: '2s' }} />}
                    <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 bg-zinc-900 border text-white text-[10px] md:text-xs font-bold px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap ${isFirst ? 'border-yellow-500/50' : isSecond ? 'border-gray-400/50' : 'border-amber-600/50'
                      }`}>
                      R$ {stats.revenue.toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <div
                    className={`w-full ${heightClass} rounded-t-2xl flex flex-col justify-end p-2 md:p-4 shadow-2xl relative overflow-hidden group`}
                    style={{
                      background: isFirst
                        ? 'linear-gradient(to bottom, #facc15, #d97706)'
                        : isSecond
                          ? 'linear-gradient(to bottom, #d1d5db, #6b7280)'
                          : 'linear-gradient(to bottom, #d97706, #c2410c)'
                    }}
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    <div className="relative z-10 text-center">
                      <span className="text-2xl md:text-4xl font-black text-white/20 absolute top-2 left-1/2 -translate-x-1/2 select-none">{index + 1}</span>
                      <h4 className="text-white font-bold text-xs md:text-sm truncate leading-tight">{barber.name.split(' ')[0]}</h4>
                      <span className="text-[9px] md:text-[10px] text-white/70 truncate block">{barber.specialty}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Main List Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-zinc-900/50 p-2 rounded-xl border border-zinc-800">
        <div className="w-full md:w-96">
          <Input placeholder="Buscar profissional..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} containerClassName="mb-0" className="bg-zinc-950 border-zinc-800" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border ${showInactive ? 'bg-zinc-800 text-white border-zinc-700' : 'bg-transparent text-zinc-500 border-zinc-800 hover:text-white hover:border-zinc-700'}`}
          >
            <UserMinus size={14} />
            Inativos {showInactive && `(${barbers.filter(b => b.is_active === false).length})`}
          </button>
          <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800 shrink-0">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-muted hover:text-white'}`}>
              <LayoutGrid size={18} />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-muted hover:text-white'}`}>
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid View - Clean design matching ns-studio */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBarbers.map(barber => {
            const stats = professionalStats[barber.id] || { revenue: 0 };
            const goal = barber.monthly_goal || 5000;
            const percent = Math.min((stats.revenue / goal * 100), 100);
            const profStatus = getProfessionalStatus(barber);
            const rating = barber.rating || 5.0;

            return (
              <Card key={barber.id} noPadding className="group hover:border-barber-gold/50 transition-all duration-300 overflow-hidden bg-zinc-900">
                {/* Card Header Background - Smaller */}
                <div className="h-14 bg-gradient-to-r from-zinc-800 to-zinc-900 relative"></div>

                <div className="px-4 pb-4 -mt-8 relative">
                  <div className="flex justify-between items-end mb-2">
                    <BarberAvatar barber={barber} size="md" className="shadow-xl border-2 border-zinc-900" />
                    <div className="text-right">
                      <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border inline-block mb-0.5 ${profStatus.status === 'online'
                        ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                        : profStatus.status === 'paused'
                          ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
                          : 'text-zinc-400 bg-zinc-800 border-zinc-700'
                        }`}>
                        ● {profStatus.label}
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[10px] text-yellow-500 font-bold">
                        {rating.toFixed(1)} <Star size={10} fill="#eab308" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-white">{barber.name}</h3>
                  <p className="text-[10px] text-muted mb-3">{barber.specialty}</p>

                  <div className="bg-zinc-950 rounded-lg p-2 border border-zinc-800 mb-3">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-muted">Progresso da Meta</span>
                      <span className="text-white font-bold">{percent.toFixed(0)}%</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-barber-gold to-yellow-300" style={{ width: `${percent}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[9px] mt-1 text-muted">
                      <span>R$ {stats.revenue.toLocaleString('pt-BR')}</span>
                      <span>Alvo: R$ {goal.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button size="sm" variant="secondary" className="w-full text-[10px] h-7 px-2" onClick={() => setViewingAgenda(barber)}>
                      <Calendar size={12} className="mr-1" /> Agenda
                    </Button>
                    <Button size="sm" variant="outline" className="w-full text-[10px] h-7 px-2" onClick={() => handleEditClick(barber)}>
                      <User size={12} className="mr-1" /> Perfil
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-3">
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-muted uppercase tracking-wider">
            <div className="col-span-4">Profissional</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-3">Meta Mensal</div>
            <div className="col-span-2 text-right">Ações</div>
          </div>

          {filteredBarbers.map(barber => {
            const stats = professionalStats[barber.id] || { revenue: 0 };
            const goal = barber.monthly_goal || 5000;
            const percent = Math.min((stats.revenue / goal * 100), 100);
            const profStatus = getProfessionalStatus(barber);
            const rating = barber.rating || 5.0;

            return (
              <Card key={barber.id} noPadding className="p-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-center bg-zinc-900 border-zinc-800 hover:border-barber-gold/30 transition-all group">
                <div className="w-full md:col-span-4 flex items-center gap-3">
                  <BarberAvatar barber={barber} size="md" />
                  <div>
                    <h4 className="font-bold text-white">{barber.name}</h4>
                    <span className="text-xs text-muted">{barber.specialty}</span>
                  </div>
                </div>

                <div className="w-full md:col-span-3 flex items-center justify-between md:justify-start gap-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${profStatus.status === 'online' ? 'bg-emerald-500' : profStatus.status === 'paused' ? 'bg-yellow-500' : 'bg-zinc-600'}`}></span>
                    <span className={`text-xs font-bold ${profStatus.status === 'online' ? 'text-emerald-500' : profStatus.status === 'paused' ? 'text-yellow-500' : 'text-zinc-400'}`}>{profStatus.label}</span>
                  </div>
                  <div className="text-xs text-yellow-500 flex items-center gap-1 font-bold">
                    {rating.toFixed(1)} <Star size={10} fill="#eab308" />
                  </div>
                </div>

                <div className="w-full md:col-span-3 space-y-1">
                  <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div className="h-full bg-gradient-to-r from-barber-gold to-yellow-300" style={{ width: `${percent}%` }}></div>
                  </div>
                  <div className="text-[10px] text-muted flex justify-between">
                    <span>R$ {stats.revenue.toLocaleString('pt-BR')}</span>
                    <span>/ R$ {goal.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                <div className="w-full md:col-span-2 flex items-center justify-end gap-2">
                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-zinc-800" onClick={() => setViewingAgenda(barber)} title="Agenda">
                    <Calendar size={14} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-zinc-800" onClick={() => handleEditClick(barber)} title="Perfil">
                    <User size={14} />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {filteredBarbers.length === 0 && (
        <div className="p-12 text-center border-2 border-dashed border-zinc-800 rounded-xl">
          <div className="flex flex-col items-center gap-3 text-muted">
            <UserPlus size={48} className="opacity-20" />
            <p className="text-lg font-medium">Nenhum profissional encontrado</p>
            <button onClick={() => setSearchTerm('')} className="text-barber-gold hover:underline text-sm">Limpar busca</button>
          </div>
        </div>
      )}

      {/* MODAL: AGENDA DE HOJE */}
      {viewingAgenda && (
        <Modal
          isOpen={!!viewingAgenda}
          onClose={() => setViewingAgenda(null)}
          title={
            <div className="flex items-center gap-3">
              <BarberAvatar barber={viewingAgenda} size="sm" />
              <div>
                <span className="block text-sm font-bold">Agenda de Hoje</span>
                <span className="text-xs text-muted font-normal">{viewingAgenda.name}</span>
              </div>
            </div>
          }
          size="md"
          footer={<Button variant="ghost" onClick={() => setViewingAgenda(null)} className="w-full">Fechar</Button>}
        >
          <div className="space-y-4">
            {loadingAgenda ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-barber-gold"></div>
              </div>
            ) : agendaSlots.length === 0 ? (
              <div className="text-center py-8 text-muted">
                <Calendar size={32} className="mx-auto opacity-30 mb-2" />
                <p className="text-sm">Profissional não trabalha hoje ou não há horários configurados.</p>
              </div>
            ) : (
              agendaSlots.map((slot, idx) => {
                const handleSlotClick = () => {
                  if (slot.status === 'livre' && !slot.isPast && viewingAgenda) {
                    setBookingTime(slot.time);
                    setShowBookingModal(true);
                  }
                };

                return (
                  <div key={idx} className="flex gap-4 items-center group">
                    <div className={`w-12 text-xs font-bold text-right shrink-0 ${slot.isPast ? 'text-zinc-600' : 'text-muted'}`}>{slot.time}</div>

                    <div className="relative flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 z-10 ${slot.status === 'passado' ? 'bg-zinc-800 border-zinc-700' :
                        slot.status === 'livre' ? 'bg-zinc-900 border-zinc-700' :
                          slot.status === 'concluido' ? 'bg-zinc-500 border-zinc-500' :
                            slot.status === 'confirmado' ? 'bg-emerald-500 border-emerald-500' :
                              slot.status === 'pendente' ? 'bg-amber-500 border-amber-500' :
                                slot.status === 'cancelado' ? 'bg-rose-500 border-rose-500' :
                                  'bg-red-500 border-red-500'
                        }`}></div>
                      {idx !== agendaSlots.length - 1 && <div className="w-0.5 h-full bg-zinc-800 absolute top-3"></div>}
                    </div>

                    <div
                      onClick={handleSlotClick}
                      className={`flex-1 p-3 rounded-xl border transition-all ${slot.status === 'passado' ? 'bg-zinc-950/20 border-zinc-800/30 opacity-50' :
                        slot.status === 'livre' ? 'bg-zinc-950/30 border-zinc-800/50 border-dashed text-muted hover:bg-zinc-900 hover:border-barber-gold/50 cursor-pointer' :
                          slot.status === 'cancelado' ? 'bg-rose-500/5 border-rose-500/20' :
                            'bg-zinc-900 border-zinc-800 shadow-sm'
                        }`}
                    >
                      {slot.status === 'passado' ? (
                        <span className="text-xs italic text-zinc-600">Horário já passou</span>
                      ) : slot.status === 'livre' ? (
                        <span className="text-xs italic text-barber-gold/80">Horário Livre - Clique para agendar</span>
                      ) : slot.status === 'bloqueado' ? (
                        <span className="text-xs font-bold text-red-400 flex items-center gap-2"><X size={12} /> {slot.client || 'Bloqueado / Pausa'}</span>
                      ) : slot.status === 'cancelado' ? (
                        <span className="text-xs font-bold text-rose-400 line-through">{slot.client} - Cancelado</span>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-bold text-sm text-white">{slot.client}</div>
                            <div className="text-xs text-muted">{slot.service}</div>
                          </div>
                          <div className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${slot.status === 'concluido' ? 'bg-zinc-800 text-zinc-400' :
                            slot.status === 'confirmado' ? 'bg-emerald-500/10 text-emerald-500' :
                              'bg-amber-500/10 text-amber-500'
                            }`}>
                            {slot.status}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Modal>
      )}

      {/* Edit Modal with Tabs */}
      <Modal
        isOpen={!!editingBarber}
        onClose={() => setEditingBarber(null)}
        title={editingBarber?.id ? 'Editar Profissional' : 'Novo Profissional'}
        size="lg"
        footer={
          <div className="flex justify-between w-full">
            {editingBarber?.id ? (
              <Button
                variant="ghost"
                onClick={() => handleDeactivateBarber(editingBarber.id)}
                disabled={savingBarber}
                className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 gap-2"
              >
                <UserMinus size={16} />
                Desativar
              </Button>
            ) : <div />}

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditingBarber(null)} disabled={savingBarber}>Cancelar</Button>
              {/* For existing professionals: always show Save */}
              {editingBarber?.id ? (
                <Button variant="primary" onClick={handleSaveBarber} leftIcon={<Check size={18} />} isLoading={savingBarber} disabled={savingBarber}>
                  Salvar Alterações
                </Button>
              ) : (
                /* For new professionals: show Próximo until last tab, then Cadastrar */
                activeTab === 'schedule' ? (
                  <Button
                    variant="primary"
                    onClick={handleSaveBarber}
                    leftIcon={<Check size={18} />}
                    className="animate-pulse-subtle"
                    isLoading={savingBarber}
                    disabled={savingBarber}
                  >
                    Cadastrar
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => {
                      const tabs: ModalTab[] = ['profile', 'finance', 'services', 'schedule'];
                      const currentIndex = tabs.indexOf(activeTab);
                      if (currentIndex < tabs.length - 1) {
                        setActiveTab(tabs[currentIndex + 1]);
                      }
                    }}
                    rightIcon={<ChevronRight size={18} />}
                    className="transition-all hover:translate-x-0.5"
                  >
                    Próximo
                  </Button>
                )
              )}
            </div>
          </div>
        }
      >
        {/* Modal Tabs */}
        <div className="flex bg-zinc-950 p-1 rounded-xl mb-6 border border-zinc-800 overflow-x-auto">
          {(['profile', 'finance', 'services', 'schedule'] as ModalTab[]).map(tab => {
            const labels = { profile: 'Perfil', finance: 'Financeiro', services: 'Serviços', schedule: 'Escala' };
            const icons = { profile: User, finance: Banknote, services: Scissors, schedule: Clock };
            const Icon = icons[tab];
            return (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab ? 'bg-zinc-800 text-white shadow' : 'text-muted hover:text-white'}`}>
                <Icon size={14} /> {labels[tab]}
              </button>
            )
          })}
        </div>

        <div className="min-h-[300px] animate-tab-content" key={activeTab}>
          {renderModalContent()}
        </div>
      </Modal>

      {/* Manual Booking Modal - Opens when clicking free slot */}
      {showBookingModal && viewingAgenda && (
        <ManualBookingModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setBookingTime('');
          }}
          onSuccess={() => {
            setShowBookingModal(false);
            setBookingTime('');
            // Refresh agenda
            if (viewingAgenda) {
              loadProfessionalAgenda(viewingAgenda);
            }
          }}
          selectedDate={new Date()}
          selectedTime={bookingTime}
          professional={viewingAgenda as unknown as Professional}
        />
      )}
    </div>
  );
};

export default Team;
