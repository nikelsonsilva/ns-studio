
import React, { useState, useEffect } from 'react';
import { Star, Scissors, Banknote, TrendingUp, Trophy, Target, Crown, Settings, X, Calendar, Clock, Check, ToggleLeft, ToggleRight, Users, Award, Phone, Mail, Edit2, Trash2 } from 'lucide-react';
import { Barber, WorkDay, Service } from '../types';
import ProfessionalModal from './ProfessionalModal';

import { useSupabaseQuery } from '../lib/hooks';
import { fetchProfessionals, deleteProfessional, fetchServices } from '../lib/database';
import { supabase } from '../lib/supabase';
import { formatPhone } from '../lib/validation';

// Helper to get initials from name
const getInitials = (name: string): string => {
   return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
};

interface ProfessionalStats {
   revenue: number;
   appointments: number;
   avgTicket: number;
}

interface TeamProps { }

const Team: React.FC<TeamProps> = () => {
   const { data: barbersData, refetch: refetchProfessionals } = useSupabaseQuery(fetchProfessionals);
   const [barbers, setBarbers] = useState<Barber[]>([]);
   const [professionalStats, setProfessionalStats] = useState<Record<string, ProfessionalStats>>({});

   useEffect(() => {
      if (barbersData) {
         // Load availability for each professional and merge
         loadProfessionalAvailability(barbersData).then(barbersWithSchedule => {
            setBarbers(barbersWithSchedule);
            // Load stats for each professional
            loadProfessionalStats(barbersWithSchedule);
         });
      }
   }, [barbersData]);

   // Load work schedules from professional_availability table
   const loadProfessionalAvailability = async (professionals: Barber[]): Promise<Barber[]> => {
      console.log('📅 Loading availability for', professionals.length, 'professionals');

      // Get all professional IDs
      const profIds = professionals.map(p => p.id);

      // Fetch all availability records for these professionals
      const { data: availabilityData, error } = await supabase
         .from('professional_availability')
         .select('*')
         .in('professional_id', profIds);

      if (error) {
         console.error('❌ Error loading availability:', error);
         return professionals;
      }

      console.log('📅 Loaded', availabilityData?.length || 0, 'availability records');

      // Group availability by professional_id
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

      // Merge availability into professionals
      return professionals.map(prof => ({
         ...prof,
         workSchedule: availabilityMap[prof.id] || []
      }));
   };

   // Load monthly stats for all professionals
   const loadProfessionalStats = async (professionals: Barber[]) => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const statsMap: Record<string, ProfessionalStats> = {};

      for (const prof of professionals) {
         // Use same query pattern as clientService which works correctly
         const { data, error } = await supabase
            .from('appointments')
            .select(`
               id,
               start_datetime,
               payment_status,
               status,
               services (
                  price
               )
            `)
            .eq('professional_id', prof.id)
            .gte('start_datetime', startOfMonth)
            .lte('start_datetime', endOfMonth);

         if (error) {
            console.error(`Error fetching stats for ${prof.name}:`, error);
            statsMap[prof.id] = { revenue: 0, appointments: 0, avgTicket: 0 };
            continue;
         }

         // Filter only paid appointments for revenue (same logic as clientService)
         const paidAppointments = (data || []).filter((apt: any) =>
            apt.payment_status === 'paid' || apt.status === 'completed'
         );

         const revenue = paidAppointments.reduce((sum: number, apt: any) => {
            return sum + ((apt.services as any)?.price || 0);
         }, 0);

         const appointments = paidAppointments.length;
         const avgTicket = appointments > 0 ? Math.round(revenue / appointments) : 0;

         statsMap[prof.id] = { revenue, appointments, avgTicket };
      }

      setProfessionalStats(statsMap);
   };

   // Ranking based on real revenue
   const rankedBarbers = [...barbers].sort((a, b) => {
      const revenueA = professionalStats[a.id]?.revenue || 0;
      const revenueB = professionalStats[b.id]?.revenue || 0;
      return revenueB - revenueA;
   });

   const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
   const [showProfessionalModal, setShowProfessionalModal] = useState(false);
   const [searchQuery, setSearchQuery] = useState('');
   const [editingProfessional, setEditingProfessional] = useState<Barber | null>(null);
   const [isEditingInfo, setIsEditingInfo] = useState(false);

   // Services state for professional-service association
   const [allServices, setAllServices] = useState<Service[]>([]);
   const [professionalServices, setProfessionalServices] = useState<string[]>([]); // IDs of services enabled for current professional

   // Load all services on mount
   useEffect(() => {
      const loadServices = async () => {
         const services = await fetchServices();
         setAllServices(services);
      };
      loadServices();
   }, []);

   // Load professional's enabled services when editingBarber changes
   useEffect(() => {
      if (editingBarber?.id) {
         loadProfessionalServices(editingBarber.id);
      } else {
         setProfessionalServices([]);
      }
   }, [editingBarber?.id]);

   const loadProfessionalServices = async (professionalId: string) => {
      const { data, error } = await supabase
         .from('professional_services')
         .select('service_id')
         .eq('professional_id', professionalId);

      if (error) {
         console.error('Error loading professional services:', error);
         // If table doesn't exist, just set empty array
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

   // Get ranking level based on position
   const getRankingLevel = (barberId: string) => {
      const position = rankedBarbers.findIndex(b => b.id === barberId) + 1;
      if (position === 0) return { level: 'Novo', icon: 'TrendingUp', color: 'blue-400', msg: 'Aguardando dados do mês' };
      if (position === 1) return { level: 'Master', icon: 'Trophy', color: 'yellow-500', msg: 'Topo do ranking! Considere aumentar a meta.' };
      if (position <= 3) return { level: 'Expert', icon: 'Star', color: 'gray-400', msg: 'Entre os 3 melhores do mês!' };
      if (position <= 5) return { level: 'Pro', icon: 'Award', color: 'orange-500', msg: 'Ótimo desempenho este mês!' };
      return { level: 'Em Crescimento', icon: 'TrendingUp', color: 'blue-400', msg: 'Continue evoluindo!' };
   };

   // Format currency input (reverse typing: 5000 -> 50,00 -> 500,00 -> 5.000,00)
   const formatCurrencyValue = (value: number): string => {
      return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
   };

   const parseCurrencyInput = (inputValue: string): number => {
      // Remove all non-digits
      const digits = inputValue.replace(/\D/g, '');
      // Convert to number with 2 decimal places
      return parseInt(digits || '0', 10) / 100;
   };

   // Format phone while typing (real-time)
   const formatPhoneRealtime = (value: string): string => {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 2) return digits;
      if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
   };

   // Get professional status based on work schedule and current time
   const getProfessionalStatus = (barber: Barber): { status: 'online' | 'offline' | 'paused', label: string, color: string, bgColor: string } => {
      // If professional is not active, always show offline
      if (barber.is_active === false) {
         return { status: 'offline', label: 'Inativo', color: 'text-gray-500', bgColor: 'bg-gray-500' };
      }

      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, etc
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Helper to normalize time to HH:mm format (strip seconds if present)
      const normalizeTime = (time: string | null | undefined): string => {
         if (!time) return '';
         return time.substring(0, 5); // Take only HH:mm
      };

      // Get schedule for today
      const schedule = barber.workSchedule?.find(s => s.dayOfWeek === dayOfWeek);

      // Debug log
      console.log(`🕐 Status check for ${barber.name}: day=${dayOfWeek}, time=${currentTime}, schedule=`, schedule);

      // No schedule or day is not active = day off
      if (!schedule || !schedule.active) {
         return { status: 'offline', label: 'Folga', color: 'text-gray-500', bgColor: 'bg-gray-500' };
      }

      const startTime = normalizeTime((schedule as any).startTime || (schedule as any).start_time);
      const endTime = normalizeTime((schedule as any).endTime || (schedule as any).end_time);
      const breakStart = normalizeTime((schedule as any).breakStart || (schedule as any).break_start);
      const breakEnd = normalizeTime((schedule as any).breakEnd || (schedule as any).break_end);

      console.log(`🕐 ${barber.name}: start=${startTime}, end=${endTime}, break=${breakStart}-${breakEnd}, current=${currentTime}`);

      // Check if outside working hours
      if (currentTime < startTime || currentTime >= endTime) {
         return { status: 'offline', label: 'Fora do expediente', color: 'text-gray-500', bgColor: 'bg-gray-500' };
      }

      // Check if on break
      if (breakStart && breakEnd && currentTime >= breakStart && currentTime < breakEnd) {
         return { status: 'paused', label: 'Em pausa', color: 'text-yellow-500', bgColor: 'bg-yellow-500' };
      }

      // Working!
      return { status: 'online', label: 'Online', color: 'text-green-500', bgColor: 'bg-green-500 animate-pulse' };
   };

   const handleEditClick = (barber: Barber) => {
      console.log('📝 EDIT CLICK - Raw barber data from list:', JSON.stringify(barber, null, 2));
      console.log('📊 monthly_goal from DB:', barber.monthly_goal);
      console.log('📊 commission_rate from DB:', barber.commission_rate);
      console.log('📊 buffer_minutes from DB:', barber.buffer_minutes);
      console.log('📊 custom_buffer from DB:', barber.custom_buffer);

      // Ensure schedule exists if not present
      const schedule = barber.workSchedule || barber.work_schedule || [0, 1, 2, 3, 4, 5, 6].map(d => ({
         dayOfWeek: d, startTime: '09:00', endTime: '19:00', active: d !== 0
      }));

      const editData = { ...barber, workSchedule: schedule };
      console.log('💾 Setting editingBarber to:', JSON.stringify(editData, null, 2));
      setEditingBarber(editData);
   };

   const handleSaveBarber = async () => {
      if (!editingBarber) return;

      console.log('💾 SAVE BARBER - Current editingBarber state:', JSON.stringify(editingBarber, null, 2));

      const dataToSave = {
         name: editingBarber.name,
         phone: editingBarber.phone,
         email: editingBarber.email,
         specialty: editingBarber.specialty,
         commission_rate: editingBarber.commission_rate || 50,
         monthly_goal: editingBarber.monthly_goal || 0,
         is_active: editingBarber.is_active !== false,
         buffer_minutes: editingBarber.buffer_minutes || 15,
         custom_buffer: editingBarber.custom_buffer || false
      };

      console.log('📤 Data being sent to Supabase:', JSON.stringify(dataToSave, null, 2));

      try {
         // Save professional data to database
         const { data, error: profError } = await supabase
            .from('professionals')
            .update(dataToSave)
            .eq('id', editingBarber.id)
            .select();

         console.log('📥 Supabase response data:', data);
         console.log('❌ Supabase error:', profError);

         if (profError) throw profError;

         // Save work schedule to professional_availability table
         if (editingBarber.workSchedule && editingBarber.workSchedule.length > 0) {
            console.log('📅 Saving work schedule...');
            console.log('📅 Business ID:', editingBarber.business_id);
            console.log('📅 Professional ID:', editingBarber.id);

            // Delete existing availability for this professional
            const { error: deleteError } = await supabase
               .from('professional_availability')
               .delete()
               .eq('professional_id', editingBarber.id);

            if (deleteError) {
               console.log('⚠️ Delete error (may be ok if no existing records):', deleteError);
            } else {
               console.log('✅ Deleted existing availability records');
            }

            // Insert new availability with business_id
            const availabilityData = editingBarber.workSchedule.map(day => ({
               professional_id: editingBarber.id,
               business_id: editingBarber.business_id,
               day_of_week: day.dayOfWeek,
               start_time: day.startTime,
               end_time: day.endTime,
               break_start: day.breakStart || null,
               break_end: day.breakEnd || null,
               is_active: day.active
            }));

            console.log('📤 Availability data to insert:', JSON.stringify(availabilityData, null, 2));

            const { data: availData, error: availError } = await supabase
               .from('professional_availability')
               .insert(availabilityData)
               .select();

            if (availError) {
               console.error('❌ Error saving availability:', availError);
               // Continue even if availability save fails
            } else {
               console.log('✅ Availability saved successfully:', availData);
            }
         }

         // Save professional services associations
         console.log('🔧 Saving professional services...');
         console.log('🔧 Services to save:', professionalServices);

         // Delete existing service associations for this professional
         const { error: deleteServicesError } = await supabase
            .from('professional_services')
            .delete()
            .eq('professional_id', editingBarber.id);

         if (deleteServicesError) {
            console.log('⚠️ Delete services error (may be ok if table does not exist):', deleteServicesError);
         } else {
            console.log('✅ Deleted existing service associations');
         }

         // Insert new service associations
         if (professionalServices.length > 0) {
            const serviceAssociations = professionalServices.map(serviceId => ({
               professional_id: editingBarber.id,
               service_id: serviceId,
               business_id: editingBarber.business_id
            }));

            console.log('📤 Service associations to insert:', serviceAssociations);

            const { data: servicesData, error: servicesError } = await supabase
               .from('professional_services')
               .insert(serviceAssociations)
               .select();

            if (servicesError) {
               console.error('❌ Error saving service associations:', servicesError);
            } else {
               console.log('✅ Service associations saved successfully:', servicesData);
            }
         }

         setBarbers(prev => prev.map(b => b.id === editingBarber.id ? editingBarber : b));
         setIsEditingInfo(false);
         setEditingBarber(null);
         console.log('🔄 Calling refetchProfessionals...');
         refetchProfessionals();
         console.log('✅ Save completed successfully!');
         alert('Profissional salvo com sucesso!');
      } catch (error) {
         console.error('❌ Error saving professional:', error);
         alert('Erro ao salvar profissional');
      }
   };

   const handleDeleteBarber = async (barberId: string) => {
      if (!confirm('Tem certeza que deseja excluir este profissional? Esta ação não pode ser desfeita.')) {
         return;
      }
      try {
         await deleteProfessional(barberId);
         setBarbers(prev => prev.filter(b => b.id !== barberId));
         setEditingBarber(null);
         refetchProfessionals();
      } catch (error) {
         console.error('Error deleting professional:', error);
         alert('Erro ao excluir profissional');
      }
   };

   const updateSchedule = (dayIndex: number, field: keyof WorkDay, value: any) => {
      if (!editingBarber || !editingBarber.workSchedule) return;
      const newSchedule = [...editingBarber.workSchedule];
      newSchedule[dayIndex] = { ...newSchedule[dayIndex], [field]: value };
      setEditingBarber({ ...editingBarber, workSchedule: newSchedule });
   };

   const handleCreateProfessional = () => {
      setEditingProfessional(null);
      setShowProfessionalModal(true);
   };

   const handleDeleteProfessional = async (id: string) => {
      if (confirm('Tem certeza que deseja excluir este profissional?')) {
         const result = await deleteProfessional(id);
         if (result) {
            refetchProfessionals();
         }
      }
   };

   const handleProfessionalSuccess = () => {
      refetchProfessionals();
   };

   const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

   return (
      <div className="space-y-6 animate-fade-in pb-20">

         {/* Main Header - Gestão de Equipe */}
         <div className="bg-barber-900 border border-barber-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
               <div className="bg-barber-800 p-2.5 rounded-xl">
                  <Users className="text-barber-gold" size={22} />
               </div>
               <div>
                  <h2 className="text-lg font-bold text-white">Gestão de Equipe</h2>
                  <p className="text-gray-500 text-sm">Gerencie sua equipe, metas individuais e horários de trabalho</p>
               </div>
            </div>
            <button
               onClick={handleCreateProfessional}
               className="bg-barber-gold hover:bg-barber-gold/90 text-black px-4 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
            >
               <Users size={16} /> Adicionar Profissional
            </button>
         </div>

         {/* Top Performance - Ranking */}
         <div className="bg-gradient-to-r from-barber-900 to-barber-950 border border-barber-800 rounded-xl p-6 relative">
            <div className="absolute top-0 right-0 p-10 opacity-5">
               <Trophy size={120} />
            </div>
            <div className="relative z-10">
               <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                  <Trophy className="text-yellow-500" size={20} /> Top Performance
               </h2>
               <p className="text-gray-400 text-sm mb-6">Competição saudável baseada em faturamento total.</p>

               <div className="flex items-end gap-6 md:gap-10 pb-8 pt-10 justify-center">
                  {rankedBarbers.slice(0, 3).map((barber, index) => {
                     const isFirst = index === 0;
                     const stats = professionalStats[barber.id] || { revenue: 0, appointments: 0, avgTicket: 0 };
                     const bgColor = isFirst ? 'bg-gradient-to-br from-yellow-500 to-orange-600'
                        : index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600'
                           : 'bg-gradient-to-br from-orange-700 to-orange-900';

                     return (
                        <div key={barber.id} className={`flex flex-col items-center flex-shrink-0 ${isFirst ? '' : 'opacity-90'}`}>
                           <div className="relative">
                              {/* Avatar with initials */}
                              <div
                                 className={`${bgColor} rounded-full flex items-center justify-center border-4 font-bold text-white ${isFirst ? 'w-28 h-28 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)] text-3xl' : index === 1 ? 'w-20 h-20 border-gray-400 text-xl' : 'w-16 h-16 border-orange-700 text-lg'}`}
                              >
                                 {getInitials(barber.name)}
                              </div>
                              {isFirst && (
                                 <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                                    <Crown size={32} className="text-yellow-500 fill-yellow-500" />
                                 </div>
                              )}
                              <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${isFirst ? 'bg-yellow-500 text-black' : 'bg-barber-800 text-white border border-barber-700'}`}>
                                 #{index + 1}
                              </div>
                           </div>
                           <div className="text-center mt-4">
                              <h3 className={`font-bold text-white ${isFirst ? 'text-lg' : 'text-sm'}`}>{barber.name}</h3>
                              <div className="text-green-500 font-bold text-sm">R$ {stats.revenue.toLocaleString('pt-BR')}</div>
                           </div>
                        </div>
                     )
                  })}
               </div>
            </div>
         </div>

         {/* Professionals List Header */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-white">
               Todos os Profissionais <span className="text-gray-500">({barbers.length})</span>
            </h3>

            {/* Search Bar */}
            <div className="relative w-full sm:w-80">
               <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome ou especialidade"
                  className="w-full bg-barber-900 border border-barber-800 rounded-lg pl-10 pr-4 py-2.5 text-white outline-none focus:border-barber-gold placeholder-gray-500 text-sm"
               />
               <svg className="absolute left-3 top-0 bottom-0 my-auto text-gray-500" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
               </svg>
               {searchQuery && (
                  <button
                     onClick={() => setSearchQuery('')}
                     className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                     ×
                  </button>
               )}
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {barbers.length === 0 ? (
               <div className="col-span-full p-12 text-center border-2 border-dashed border-barber-800 rounded-xl">
                  <div className="flex flex-col items-center gap-3 text-gray-500">
                     <Users size={48} className="opacity-20" />
                     <p className="text-lg font-medium">Você ainda não tem nenhum profissional cadastrado</p>
                     <p className="text-sm text-gray-600">Clique em "Adicionar Profissional" para começar</p>
                  </div>
               </div>
            ) : (() => {
               // Filter barbers based on search query
               const filteredBarbers = barbers.filter(barber => {
                  if (!searchQuery.trim()) return true;
                  const query = searchQuery.toLowerCase();
                  return (
                     barber.name?.toLowerCase().includes(query) ||
                     barber.specialty?.toLowerCase().includes(query) ||
                     barber.email?.toLowerCase().includes(query) ||
                     barber.phone?.includes(query)
                  );
               });

               if (filteredBarbers.length === 0) {
                  return (
                     <div className="col-span-full p-8 text-center border border-barber-800 rounded-xl">
                        <p className="text-gray-500">Nenhum profissional encontrado para "<span className="text-barber-gold">{searchQuery}</span>"</p>
                        <button onClick={() => setSearchQuery('')} className="text-barber-gold hover:underline text-sm mt-2">Limpar pesquisa</button>
                     </div>
                  );
               }

               return filteredBarbers.map(barber => {
                  const stats = professionalStats[barber.id] || { revenue: 0, appointments: 0, avgTicket: 0 };
                  const goal = barber.monthly_goal || 5000;
                  const progress = goal > 0 ? (stats.revenue / goal) * 100 : 0;

                  return (
                     <div key={barber.id} className="bg-barber-900 border border-barber-800 rounded-xl overflow-hidden shadow-lg group">
                        {/* Header / Profile */}
                        <div className="p-6 flex items-start gap-4 relative">
                           <div className="absolute top-0 right-0 p-4">
                              <button
                                 onClick={() => handleEditClick(barber)}
                                 className="p-2 bg-barber-950 hover:bg-barber-800 rounded-lg border border-barber-800 text-gray-400 hover:text-white transition-colors"
                                 title="Gerenciar Profissional"
                              >
                                 <Settings size={16} />
                              </button>
                           </div>

                           {/* Avatar with Initials */}
                           <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-barber-gold to-yellow-600 flex items-center justify-center border-2 border-barber-800 group-hover:border-barber-gold transition-colors font-bold text-xl text-white">
                              {getInitials(barber.name)}
                           </div>

                           <div className="flex-1">
                              <h3 className="text-lg font-bold text-white">{barber.name}</h3>
                              <div className="flex items-center gap-2 mb-2">
                                 <div className="flex items-center gap-1 text-yellow-400 text-xs">
                                    <Star size={14} fill="#facc15" />
                                    <span className="font-bold">{barber.rating || '5.0'}</span>
                                 </div>
                                 <span className="text-gray-600 text-xs">• {barber.specialty}</span>
                              </div>

                              {/* Meta Progress */}
                              <div className="mt-3 pr-10">
                                 <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-400">Meta Mensal</span>
                                    <span className="text-white font-bold">{progress.toFixed(0)}%</span>
                                 </div>
                                 <div className="w-full h-2 bg-barber-950 rounded-full overflow-hidden border border-barber-800">
                                    <div
                                       className="h-full bg-gradient-to-r from-barber-gold to-yellow-600 rounded-full transition-all duration-500"
                                       style={{ width: `${Math.min(progress, 100)}%` }}
                                    ></div>
                                 </div>
                                 <div className="flex justify-between text-[10px] mt-1 text-gray-500">
                                    <span>R$ {stats.revenue.toLocaleString('pt-BR')}</span>
                                    <span>Alvo: R$ {goal.toLocaleString('pt-BR')}</span>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 border-t border-barber-800 divide-x divide-barber-800 bg-barber-950/30">
                           <div className="p-4 text-center hover:bg-barber-800/30 transition-colors">
                              <div className="flex justify-center mb-2 text-barber-gold"><Banknote size={18} /></div>
                              <div className="text-base font-bold text-white">R$ {stats.revenue.toLocaleString('pt-BR')}</div>
                              <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Faturamento</div>
                           </div>
                           <div className="p-4 text-center hover:bg-barber-800/30 transition-colors">
                              <div className="flex justify-center mb-2 text-blue-400"><Scissors size={18} /></div>
                              <div className="text-base font-bold text-white">{stats.appointments}</div>
                              <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Atendimentos</div>
                           </div>
                           <div className="p-4 text-center hover:bg-barber-800/30 transition-colors">
                              <div className="flex justify-center mb-2 text-green-400"><TrendingUp size={18} /></div>
                              <div className="text-base font-bold text-white">R$ {stats.avgTicket}</div>
                              <div className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Ticket Médio</div>
                           </div>
                        </div>

                        {/* Action Footer */}
                        {(() => {
                           const profStatus = getProfessionalStatus(barber);
                           return (
                              <div className="p-3 bg-barber-950 flex justify-between items-center border-t border-barber-800">
                                 <span className={`text-xs flex items-center gap-1.5 ${profStatus.color}`}>
                                    <span className={`w-2 h-2 rounded-full ${profStatus.bgColor}`}></span>
                                    {profStatus.label}
                                 </span>
                                 <button onClick={() => handleEditClick(barber)} className="text-xs font-bold text-barber-gold hover:text-white uppercase tracking-wider">Detalhes &rarr;</button>
                              </div>
                           );
                        })()}
                     </div>
                  )
               })
            })()}
         </div>

         {/* Edit Modal */}
         {editingBarber && (() => {
            const rankPosition = rankedBarbers.findIndex(b => b.id === editingBarber.id) + 1;
            const stats = professionalStats[editingBarber.id] || { revenue: 0, appointments: 0, avgTicket: 0 };

            // Ranking badge only for top 3
            const getRankBadge = () => {
               if (rankPosition === 1) return { label: 'Ouro', color: 'from-yellow-500 to-orange-500', textColor: 'text-yellow-500', border: 'border-yellow-500' };
               if (rankPosition === 2) return { label: 'Prata', color: 'from-gray-300 to-gray-500', textColor: 'text-gray-400', border: 'border-gray-400' };
               if (rankPosition === 3) return { label: 'Bronze', color: 'from-orange-600 to-orange-800', textColor: 'text-orange-500', border: 'border-orange-500' };
               return null;
            };
            const rankBadge = getRankBadge();

            return (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                  <div className="bg-barber-900 w-full max-w-2xl rounded-2xl border border-barber-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                     {/* Header - Client Style */}
                     <div className="p-6 border-b border-barber-800 bg-barber-950 shrink-0">
                        {/* Top row: Avatar + Info + Actions */}
                        <div className="flex items-start justify-between">
                           <div className="flex items-start gap-4">
                              {/* Avatar with Ranking Badge below */}
                              <div className="flex flex-col items-center">
                                 <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-barber-gold to-yellow-600 flex items-center justify-center font-bold text-2xl text-white border-3 ${rankBadge?.border || 'border-barber-700'}`}>
                                    {getInitials(editingBarber.name)}
                                 </div>
                                 {rankBadge && (
                                    <span className={`mt-1 text-[10px] font-bold ${rankBadge.textColor} uppercase tracking-wider`}>
                                       {rankBadge.label}
                                    </span>
                                 )}
                              </div>

                              {/* Display Info */}
                              <div className="pt-1">
                                 <h3 className="text-xl font-bold text-white">{editingBarber.name}</h3>
                                 {editingBarber.phone && (
                                    <p className="text-gray-400 text-sm flex items-center gap-1">
                                       <Phone size={12} /> {editingBarber.phone}
                                    </p>
                                 )}
                                 {editingBarber.email && (
                                    <p className="text-gray-500 text-xs mt-0.5">{editingBarber.email}</p>
                                 )}
                              </div>
                           </div>

                           {/* Action buttons */}
                           <div className="flex items-center gap-3">
                              <button
                                 onClick={() => setIsEditingInfo(!isEditingInfo)}
                                 className={`flex items-center gap-1.5 text-sm font-medium ${isEditingInfo ? 'text-gray-400' : 'text-barber-gold hover:text-white'}`}
                              >
                                 <Edit2 size={16} /> {isEditingInfo ? 'Editando...' : 'Editar'}
                              </button>
                              <button
                                 onClick={() => handleDeleteBarber(editingBarber.id)}
                                 className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 text-sm font-medium"
                              >
                                 <Trash2 size={16} /> Excluir
                              </button>
                              <button onClick={() => { setEditingBarber(null); setIsEditingInfo(false); }} className="text-gray-500 hover:text-white p-1 ml-2">
                                 <X size={20} />
                              </button>
                           </div>
                        </div>

                        {/* Editable Form - Shows below when editing */}
                        {isEditingInfo && (
                           <div className="mt-4 pt-4 border-t border-barber-800 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                 <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Nome</label>
                                    <input
                                       type="text"
                                       value={editingBarber.name}
                                       onChange={(e) => setEditingBarber({ ...editingBarber, name: e.target.value })}
                                       placeholder="Nome do profissional"
                                       className="bg-barber-900 border border-barber-700 rounded px-3 py-2 text-white font-medium w-full outline-none focus:border-barber-gold"
                                    />
                                 </div>
                                 <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Especialidade</label>
                                    <input
                                       type="text"
                                       value={editingBarber.specialty || ''}
                                       onChange={(e) => setEditingBarber({ ...editingBarber, specialty: e.target.value })}
                                       placeholder="Ex: Barbeiro, Cabeleireiro"
                                       className="bg-barber-900 border border-barber-700 rounded px-3 py-2 text-gray-300 w-full outline-none focus:border-barber-gold"
                                    />
                                 </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                 <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Telefone</label>
                                    <input
                                       type="tel"
                                       value={editingBarber.phone || ''}
                                       onChange={(e) => setEditingBarber({ ...editingBarber, phone: formatPhoneRealtime(e.target.value) })}
                                       placeholder="(11) 99999-9999"
                                       className="bg-barber-900 border border-barber-700 rounded px-3 py-2 text-gray-300 w-full outline-none focus:border-barber-gold"
                                    />
                                 </div>
                                 <div>
                                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Email</label>
                                    <input
                                       type="email"
                                       value={editingBarber.email || ''}
                                       onChange={(e) => setEditingBarber({ ...editingBarber, email: e.target.value })}
                                       placeholder="email@exemplo.com"
                                       className="bg-barber-900 border border-barber-700 rounded px-3 py-2 text-gray-400 w-full outline-none focus:border-barber-gold"
                                    />
                                 </div>
                              </div>
                           </div>
                        )}
                     </div>

                     <div className="p-6 overflow-y-auto space-y-8 flex-1">

                        {/* Financial Settings */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="bg-barber-950 p-4 rounded-xl border border-barber-800">
                              <h4 className="text-barber-gold font-bold text-sm mb-4 flex items-center gap-2">
                                 <Target size={16} /> Metas & Comissão
                              </h4>
                              <div className="space-y-4">
                                 <div>
                                    <label className="text-xs text-gray-400 block mb-1">Meta Financeira Mensal (R$)</label>
                                    <input
                                       type="text"
                                       value={formatCurrencyValue(editingBarber.monthly_goal || 0)}
                                       onChange={(e) => {
                                          const value = parseCurrencyInput(e.target.value);
                                          console.log('📊 META input changed to:', value);
                                          setEditingBarber({ ...editingBarber, monthly_goal: value });
                                       }}
                                       placeholder="0,00"
                                       className="w-full bg-barber-900 border border-barber-800 rounded-lg p-2 text-white outline-none focus:border-barber-gold text-right"
                                    />
                                 </div>
                                 <div>
                                    <label className="text-xs text-gray-400 block mb-1">Comissão Base (%)</label>
                                    <input
                                       type="number"
                                       value={editingBarber.commission_rate || 50}
                                       onChange={(e) => {
                                          console.log('📊 COMISSÃO input changed to:', Number(e.target.value));
                                          setEditingBarber({ ...editingBarber, commission_rate: Number(e.target.value) });
                                       }}
                                       min={0}
                                       max={100}
                                       className="w-full bg-barber-900 border border-barber-800 rounded-lg p-2 text-white outline-none focus:border-barber-gold"
                                    />
                                 </div>
                              </div>
                           </div>

                           {/* Serviços Habilitados Card */}
                           <div className="bg-barber-950 p-4 rounded-xl border border-barber-800">
                              <div className="flex items-center justify-between mb-4">
                                 <h4 className="text-blue-400 font-bold text-sm flex items-center gap-2">
                                    <Scissors size={16} /> Serviços Habilitados
                                 </h4>
                                 {allServices.length > 0 && (
                                    <button
                                       onClick={() => {
                                          if (professionalServices.length === allServices.length) {
                                             // Desmarcar todos
                                             setProfessionalServices([]);
                                          } else {
                                             // Marcar todos
                                             setProfessionalServices(allServices.map(s => s.id));
                                          }
                                       }}
                                       className="text-xs text-barber-gold hover:text-white transition-colors"
                                    >
                                       {professionalServices.length === allServices.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                    </button>
                                 )}
                              </div>
                              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                 {allServices.length === 0 ? (
                                    <p className="text-gray-500 text-xs">Nenhum serviço cadastrado</p>
                                 ) : (
                                    allServices.map(service => {
                                       const isEnabled = professionalServices.includes(service.id);
                                       return (
                                          <div
                                             key={service.id}
                                             onClick={() => toggleServiceForProfessional(service.id)}
                                             className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${isEnabled
                                                ? 'bg-barber-gold/20 border border-barber-gold'
                                                : 'bg-barber-900 border border-barber-800 hover:border-barber-700'
                                                }`}
                                          >
                                             <div className={`w-5 h-5 rounded flex items-center justify-center ${isEnabled ? 'bg-barber-gold' : 'bg-barber-800 border border-barber-700'
                                                }`}>
                                                {isEnabled && <Check size={14} className="text-black" />}
                                             </div>
                                             <span className={`text-sm ${isEnabled ? 'text-white font-medium' : 'text-gray-400'}`}>
                                                {service.name}
                                             </span>
                                          </div>
                                       );
                                    })
                                 )}
                              </div>
                              {professionalServices.length === 0 && allServices.length > 0 && (
                                 <p className="text-orange-400 text-xs mt-3 flex items-center gap-1">
                                    ⚠️ Selecione os serviços que este profissional realiza
                                 </p>
                              )}
                           </div>
                        </div>

                        {/* Buffer Customizado Card */}
                        <div className="bg-barber-950 p-4 rounded-xl border border-barber-800">
                           <div className="flex items-center justify-between mb-3">
                              <div>
                                 <h4 className="text-white font-bold text-sm">Usar Buffer Customizado</h4>
                                 <p className="text-xs text-gray-500">Se desativado, usa o buffer global do estabelecimento</p>
                              </div>
                              <button
                                 onClick={() => setEditingBarber({ ...editingBarber, custom_buffer: !editingBarber.custom_buffer })}
                                 className={`w-12 h-6 rounded-full transition-colors relative ${editingBarber.custom_buffer ? 'bg-green-500' : 'bg-barber-700'}`}
                              >
                                 <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${editingBarber.custom_buffer ? 'right-1' : 'left-1'}`} />
                              </button>
                           </div>

                           {editingBarber.custom_buffer ? (
                              <div>
                                 {/* Label row */}
                                 <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-gray-400">Intervalo</span>
                                    <span className="text-sm font-bold text-green-500">{editingBarber.buffer_minutes || 15} min</span>
                                 </div>

                                 {/* Slider */}
                                 <div className="relative">
                                    <input
                                       type="range"
                                       min={0}
                                       max={60}
                                       step={5}
                                       value={editingBarber.buffer_minutes || 15}
                                       onChange={(e) => setEditingBarber({ ...editingBarber, buffer_minutes: parseInt(e.target.value) })}
                                       className="w-full h-1 bg-barber-700 rounded-lg appearance-none cursor-pointer"
                                       style={{
                                          background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${((editingBarber.buffer_minutes || 15) / 60) * 100}%, #3f3f46 ${((editingBarber.buffer_minutes || 15) / 60) * 100}%, #3f3f46 100%)`
                                       }}
                                    />
                                    {/* Markers */}
                                    <div className="flex justify-between mt-2 text-[10px] text-gray-500">
                                       <span>0 min</span>
                                       <span>15 min</span>
                                       <span>30 min</span>
                                       <span>45 min</span>
                                       <span>60 min</span>
                                    </div>
                                 </div>
                              </div>
                           ) : (
                              <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-2">
                                 <Clock size={16} />
                                 Usando buffer global do estabelecimento
                              </div>
                           )}
                        </div>

                        {/* Shifts / Schedule */}
                        <div>
                           <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                              <Calendar size={16} className="text-blue-500" /> Turnos de Trabalho (Escala)
                           </h4>

                           <div className="bg-barber-950 border border-barber-800 rounded-xl overflow-hidden">
                              {/* Header row hidden on mobile */}
                              <div className="hidden sm:grid grid-cols-[60px_1fr_1fr_1fr] bg-barber-900 p-2 text-xs font-bold text-gray-400 uppercase text-center border-b border-barber-800">
                                 <div>Dia</div>
                                 <div>Entrada / Saída</div>
                                 <div>Pausa (Almoço)</div>
                                 <div>Status</div>
                              </div>

                              {editingBarber.workSchedule?.map((day, idx) => (
                                 <div key={idx} className={`flex flex-col sm:grid sm:grid-cols-[60px_1fr_1fr_1fr] p-3 items-center border-b border-barber-800 last:border-0 gap-2 sm:gap-0 ${day.active ? 'opacity-100' : 'opacity-40 bg-black/20'}`}>
                                    <div className="flex justify-between w-full sm:w-auto sm:block">
                                       <div className="text-sm font-bold text-center text-white">{daysMap[day.dayOfWeek]}</div>
                                       <div className="sm:hidden">
                                          <button
                                             onClick={() => updateSchedule(idx, 'active', !day.active)}
                                             className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center justify-center gap-1 ${day.active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/10 text-red-500'
                                                }`}
                                          >
                                             {day.active ? 'Ativo' : 'Folga'}
                                          </button>
                                       </div>
                                    </div>

                                    <div className="flex items-center justify-center gap-2 w-full">
                                       <span className="text-[10px] text-gray-500 sm:hidden uppercase font-bold w-12">Horário:</span>
                                       <input
                                          type="time"
                                          value={day.startTime}
                                          onChange={(e) => updateSchedule(idx, 'startTime', e.target.value)}
                                          disabled={!day.active}
                                          className="bg-barber-900 border border-barber-700 rounded px-1 text-xs text-white outline-none w-20 text-center py-1"
                                       />
                                       <span className="text-gray-500">-</span>
                                       <input
                                          type="time"
                                          value={day.endTime}
                                          onChange={(e) => updateSchedule(idx, 'endTime', e.target.value)}
                                          disabled={!day.active}
                                          className="bg-barber-900 border border-barber-700 rounded px-1 text-xs text-white outline-none w-20 text-center py-1"
                                       />
                                    </div>

                                    <div className="flex items-center justify-center gap-2 w-full">
                                       <span className="text-[10px] text-gray-500 sm:hidden uppercase font-bold w-12">Pausa:</span>
                                       <input
                                          type="time"
                                          value={day.breakStart || ''}
                                          onChange={(e) => updateSchedule(idx, 'breakStart', e.target.value)}
                                          disabled={!day.active}
                                          className="bg-barber-900 border border-barber-700 rounded px-1 text-xs text-white outline-none w-20 text-center py-1"
                                       />
                                       <span className="text-gray-500">-</span>
                                       <input
                                          type="time"
                                          value={day.breakEnd || ''}
                                          onChange={(e) => updateSchedule(idx, 'breakEnd', e.target.value)}
                                          disabled={!day.active}
                                          className="bg-barber-900 border border-barber-700 rounded px-1 text-xs text-white outline-none w-20 text-center py-1"
                                       />
                                    </div>

                                    <div className="hidden sm:flex justify-center">
                                       <button
                                          onClick={() => updateSchedule(idx, 'active', !day.active)}
                                          className={`text-xs px-2 sm:px-3 py-1 rounded-full font-bold flex items-center justify-center gap-1 transition-all w-full sm:w-auto ${day.active
                                             ? 'bg-green-500/20 text-green-500 border border-green-500/50'
                                             : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                             }`}
                                       >
                                          {day.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                          <span className="hidden sm:inline">{day.active ? 'Ativo' : 'Folga'}</span>
                                       </button>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>

                     </div>

                     <div className="p-4 bg-barber-950 border-t border-barber-800 flex justify-end gap-3 shrink-0">
                        <button onClick={() => { setEditingBarber(null); setIsEditingInfo(false); }} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white font-medium text-sm">Cancelar</button>
                        <button onClick={handleSaveBarber} className="bg-barber-gold hover:bg-barber-goldhover text-black px-6 py-2 rounded-lg font-bold flex items-center gap-2 text-sm">
                           <Check size={18} /> Salvar
                        </button>
                     </div>
                  </div>
               </div>
            )
         })()}
         {/* Professional Modal */}
         {showProfessionalModal && (
            <ProfessionalModal
               professional={editingProfessional}
               onClose={() => setShowProfessionalModal(false)}
               onSuccess={handleProfessionalSuccess}
            />
         )}
      </div>
   );
};

export default Team;
