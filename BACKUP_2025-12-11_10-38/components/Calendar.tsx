
import React, { useState, useEffect } from 'react';
import { format, addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon,
    Clock, AlertCircle, LayoutGrid, List, Lock,
    Users, Armchair, UserPlus, GripVertical, Trash2, ShoppingBag, Check
} from 'lucide-react';
import { Barber, Appointment, Status, Service, WaitlistItem, Resource, Product, PaymentStatus } from '../types';

import { useSupabaseQuery } from '../lib/hooks';
import { fetchProfessionals, fetchServices, fetchProducts, fetchAppointments } from '../lib/database';

interface CalendarProps { }

const hours = Array.from({ length: 13 }, (_, i) => i + 9); // 09:00 to 21:00

// Mock Resources
const resources: Resource[] = [
    { id: 'r1', name: 'Cadeira 01 (Vitrine)', type: 'Cadeira', status: 'active' },
    { id: 'r2', name: 'Cadeira 02 (Meio)', type: 'Cadeira', status: 'active' },
    { id: 'r3', name: 'Cadeira 03 (Fundo)', type: 'Cadeira', status: 'active' },
    { id: 'r4', name: 'Lavatório Spa', type: 'Lavatório', status: 'active' },
];

const Calendar: React.FC<CalendarProps> = () => {
    const { data: barbersData } = useSupabaseQuery(fetchProfessionals);
    const { data: servicesData } = useSupabaseQuery(fetchServices);
    const { data: productsData } = useSupabaseQuery(fetchProducts);

    const { data: appointmentsData } = useSupabaseQuery(fetchAppointments);

    const barbers = barbersData || [];
    const services = servicesData || [];
    const products = productsData || [];
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'day' | 'month'>('day');
    const [viewEntity, setViewEntity] = useState<'barber' | 'resource'>('barber');
    const [showWaitlist, setShowWaitlist] = useState(false);

    const [selectedBarber, setSelectedBarber] = useState<string | 'all'>('all');
    const [selectedService, setSelectedService] = useState<string | 'all'>('all');

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [waitlist, setWaitlist] = useState<WaitlistItem[]>([]);

    useEffect(() => {
        if (appointmentsData) {
            setAppointments(appointmentsData);
        }
    }, [appointmentsData]);
    const [draggedAppointmentId, setDraggedAppointmentId] = useState<string | null>(null);

    // Command State
    const [activeCommandApp, setActiveCommandApp] = useState<string | null>(null);

    // Feedback Simulation
    const [feedbackSent, setFeedbackSent] = useState(false);

    const handlePrev = () => {
        if (viewMode === 'day') {
            setCurrentDate(addDays(currentDate, -1));
        } else {
            setCurrentDate(addMonths(currentDate, -1));
        }
    };

    const handleNext = () => {
        if (viewMode === 'day') {
            setCurrentDate(addDays(currentDate, 1));
        } else {
            setCurrentDate(addMonths(currentDate, 1));
        }
    };

    // Generic getter for slot (Barber OR Resource)
    const getAppointmentForSlot = (entityId: string, hour: number) => {
        const timeString = `${hour.toString().padStart(2, '0')}:00`;

        return appointments.find(app => {
            const isEntityMatch = viewEntity === 'barber' ? app.barberId === entityId : app.resourceId === entityId;
            const isDateMatch = app.date === format(currentDate, 'yyyy-MM-dd');
            const isTimeMatch = (app.time === timeString || (parseInt(app.time.split(':')[0]) === hour && parseInt(app.time.split(':')[1]) > 0));
            const isServiceMatch = selectedService === 'all' || app.serviceId === selectedService;

            return isEntityMatch && isDateMatch && isTimeMatch && isServiceMatch;
        });
    };

    const handleBlockSlot = (entityId: string, hour: number) => {
        const time = `${hour.toString().padStart(2, '0')}:00`;
        if (confirm('Deseja bloquear este horário?')) {
            const newBlock: Appointment = {
                id: Math.random().toString(),
                clientName: 'Bloqueado',
                barberId: viewEntity === 'barber' ? entityId : '1', // Default or derived
                resourceId: viewEntity === 'resource' ? entityId : 'r1', // Default or derived
                serviceId: 'block',
                date: format(currentDate, 'yyyy-MM-dd'),
                time,
                status: Status.BLOCKED,
                hasDeposit: false,
                consumption: [],
                // Required fields
                client_name: 'Bloqueado',
                appointment_date: format(currentDate, 'yyyy-MM-dd'),
                appointment_time: time,
                duration_minutes: 60,
                payment_status: PaymentStatus.PENDING,
                amount: 0
            };
            setAppointments([...appointments, newBlock]);
        }
    };

    const handleStatusChange = (id: string, newStatus: Status) => {
        setAppointments(prev => prev.map(app =>
            app.id === id ? { ...app, status: newStatus } : app
        ));

        if (newStatus === Status.COMPLETED) {
            // Trigger Automated Feedback Simulation
            setFeedbackSent(true);
            setTimeout(() => setFeedbackSent(false), 3000);
        }
    };

    const getStatusStyle = (status: Status) => {
        switch (status) {
            case Status.CONFIRMED:
                return 'bg-green-500/10 border-green-500 text-green-400 hover:bg-green-500/20';
            case Status.PENDING:
                return 'bg-yellow-500/10 border-yellow-500 text-yellow-500 hover:bg-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.1)]';
            case Status.COMPLETED:
                return 'bg-blue-500/10 border-blue-500 text-blue-400 hover:bg-blue-500/20';
            case Status.NOSHOW:
                return 'bg-red-500/10 border-red-500 text-red-400 hover:bg-red-500/20';
            case Status.BLOCKED:
                return 'bg-barber-950 border-barber-700 text-gray-500 opacity-70 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#27272a_5px,#27272a_10px)]';
            default:
                return 'bg-gray-700 border-gray-600 text-gray-300';
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, appointmentId: string) => {
        setDraggedAppointmentId(appointmentId);
        e.dataTransfer.effectAllowed = 'move';
        const target = e.target as HTMLElement;
        target.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedAppointmentId(null);
        const target = e.target as HTMLElement;
        target.style.opacity = '1';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetEntityId: string, targetHour: number) => {
        e.preventDefault();
        if (!draggedAppointmentId) return;

        const targetTime = `${targetHour.toString().padStart(2, '0')}:00`;

        // Check conflicts
        const isOccupied = getAppointmentForSlot(targetEntityId, targetHour);
        if (isOccupied && isOccupied.id !== draggedAppointmentId) {
            alert('Horário ocupado!');
            return;
        }

        setAppointments(prev => prev.map(app => {
            if (app.id === draggedAppointmentId) {
                return {
                    ...app,
                    barberId: viewEntity === 'barber' ? targetEntityId : app.barberId,
                    resourceId: viewEntity === 'resource' ? targetEntityId : app.resourceId,
                    time: targetTime,
                };
            }
            return app;
        }));
    };

    // Command Logic
    const handleAddToCommand = (productId: string) => {
        if (!activeCommandApp) return;

        const product = products.find(p => p.id === productId);
        if (!product) return;

        setAppointments(prev => prev.map(app => {
            if (app.id === activeCommandApp) {
                const currentConsumption = app.consumption || [];
                return {
                    ...app,
                    consumption: [...currentConsumption, {
                        id: Math.random().toString(),
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        quantity: 1
                    }]
                };
            }
            return app;
        }));
    };

    const filteredBarbers = selectedBarber === 'all'
        ? barbers
        : barbers.filter(b => b.id === selectedBarber);

    // Helper for Month View Stats
    const getDayStats = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayApps = appointments.filter(app => app.date === dateStr && app.status !== Status.BLOCKED);
        const revenue = dayApps.reduce((acc, app) => {
            const s = services.find(srv => srv.id === app.serviceId);
            return acc + (s ? s.price : 0);
        }, 0);
        return { count: dayApps.length, revenue, hasPending: dayApps.some(app => app.status === Status.PENDING) };
    };

    // Month Grid Generation
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
        <div className="flex flex-col md:flex-row h-full md:h-[calc(100vh-8rem)] gap-6 overflow-hidden relative">

            {/* Feedback Toast */}
            {feedbackSent && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-black px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2 animate-bounce w-max max-w-[90vw] text-xs sm:text-sm">
                    <Check size={20} /> Feedback automático enviado via WhatsApp!
                </div>
            )}

            {/* Command Modal */}
            {activeCommandApp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-barber-900 w-full max-w-md rounded-xl border border-barber-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-barber-800 flex justify-between items-center bg-barber-950">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <ShoppingBag className="text-barber-gold" size={18} /> Comanda Digital
                            </h3>
                            <button onClick={() => setActiveCommandApp(null)}><Users size={16} /></button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            <p className="text-xs text-gray-400 mb-4 uppercase font-bold">Adicionar Produtos</p>
                            <div className="grid grid-cols-2 gap-3">
                                {products.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => handleAddToCommand(product.id)}
                                        className="bg-barber-950 p-3 rounded-lg border border-barber-800 hover:border-barber-gold transition-colors text-left"
                                    >
                                        <div className="text-sm font-bold text-white truncate">{product.name}</div>
                                        <div className="text-xs text-barber-gold">R$ {product.price.toFixed(2)}</div>
                                    </button>
                                ))}
                            </div>

                            <div className="mt-6 border-t border-barber-800 pt-4">
                                <p className="text-xs text-gray-400 mb-2 uppercase font-bold">Consumo Atual</p>
                                {appointments.find(a => a.id === activeCommandApp)?.consumption?.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">Nenhum item adicionado.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {appointments.find(a => a.id === activeCommandApp)?.consumption?.map((item, idx) => (
                                            <li key={idx} className="flex justify-between text-sm text-gray-300">
                                                <span>{item.name}</span>
                                                <span>R$ {item.price.toFixed(2)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                        <div className="p-4 bg-barber-950 border-t border-barber-800">
                            <button onClick={() => setActiveCommandApp(null)} className="w-full bg-barber-gold hover:bg-barber-goldhover text-black font-bold py-2 rounded-lg">
                                Concluir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CALENDAR AREA */}
            <div className="flex-1 flex flex-col h-full min-w-0">

                {/* Header Controls */}
                <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center mb-4 gap-4 shrink-0">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                        {/* Date Navigation */}
                        <div className="flex items-center gap-2 bg-barber-900 p-1.5 rounded-lg border border-barber-800 justify-between">
                            <button onClick={handlePrev} className="p-1.5 hover:bg-barber-800 rounded-md text-gray-400 hover:text-white transition-colors">
                                <ChevronLeft size={18} />
                            </button>
                            <div className="flex items-center gap-2 px-2 min-w-[140px] justify-center">
                                <CalendarIcon size={16} className="text-barber-gold" />
                                <span className="text-white font-bold capitalize text-sm whitespace-nowrap">
                                    {viewMode === 'day'
                                        ? format(currentDate, "EEE, d MMM", { locale: ptBR })
                                        : format(currentDate, "MMMM yyyy", { locale: ptBR })
                                    }
                                </span>
                            </div>
                            <button onClick={handleNext} className="p-1.5 hover:bg-barber-800 rounded-md text-gray-400 hover:text-white transition-colors">
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        {/* View Entity Switcher (Barber vs Resource) */}
                        <div className="flex bg-barber-900 rounded-lg p-1 border border-barber-800">
                            <button
                                onClick={() => setViewEntity('barber')}
                                className={`flex-1 sm:flex-none p-1.5 px-3 rounded flex justify-center items-center gap-2 text-xs font-bold transition-all ${viewEntity === 'barber' ? 'bg-barber-800 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <Users size={14} /> Equipe
                            </button>
                            <button
                                onClick={() => setViewEntity('resource')}
                                className={`flex-1 sm:flex-none p-1.5 px-3 rounded flex justify-center items-center gap-2 text-xs font-bold transition-all ${viewEntity === 'resource' ? 'bg-barber-800 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <Armchair size={14} /> Recursos
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full xl:w-auto">
                        {/* View Mode Switcher (Day vs Month) - Visible on all sizes now but stacked on mobile */}
                        <div className="flex bg-barber-900 rounded-lg p-1 border border-barber-800">
                            <button
                                onClick={() => setViewMode('day')}
                                className={`flex-1 p-1.5 rounded flex justify-center items-center gap-2 text-xs font-bold transition-all ${viewMode === 'day' ? 'bg-barber-800 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <List size={14} /> Dia
                            </button>
                            <button
                                onClick={() => setViewMode('month')}
                                className={`flex-1 p-1.5 rounded flex justify-center items-center gap-2 text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-barber-800 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <LayoutGrid size={14} /> Mês
                            </button>
                        </div>

                        <select
                            value={selectedService}
                            onChange={(e) => setSelectedService(e.target.value)}
                            className="flex-1 bg-barber-900 border border-barber-800 text-white rounded-lg px-3 py-1.5 outline-none text-xs h-9"
                        >
                            <option value="all">Serviços</option>
                            {services.map(service => (
                                <option key={service.id} value={service.id}>{service.name}</option>
                            ))}
                        </select>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowWaitlist(!showWaitlist)}
                                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold h-9 transition-colors ${showWaitlist ? 'bg-barber-gold text-black border-barber-gold' : 'bg-barber-900 text-white border-barber-800'}`}
                            >
                                <UserPlus size={16} /> <span className="inline">Fila</span>
                                {waitlist.length > 0 && <span className="bg-red-500 text-white px-1.5 rounded-full text-[10px]">{waitlist.length}</span>}
                            </button>

                            <button className="flex-1 sm:flex-none bg-barber-gold hover:bg-barber-goldhover text-black px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/20 h-9 text-xs whitespace-nowrap">
                                <Plus size={16} /> <span className="inline">Novo</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden bg-barber-900 border border-barber-800 rounded-xl shadow-2xl flex flex-col relative">
                    {viewMode === 'day' ? (
                        <div className="flex-1 overflow-x-auto overflow-y-auto relative">
                            <div className="min-w-[600px] h-full flex flex-col">
                                {/* Header Row (Barbers or Resources) */}
                                <div className="flex border-b border-barber-800 sticky top-0 bg-barber-900 z-10">
                                    <div className="w-16 border-r border-barber-800 p-2 shrink-0 bg-barber-950/50 flex flex-col items-center justify-center sticky left-0 z-20">
                                        <Clock size={16} className="text-gray-500" />
                                    </div>

                                    {viewEntity === 'barber' ? (
                                        filteredBarbers.map(barber => (
                                            <div key={barber.id} className="flex-1 p-3 border-r border-barber-800 min-w-[200px] flex items-center gap-3">
                                                <img src={barber.avatar} alt={barber.name} className="w-8 h-8 rounded-full border border-barber-700 object-cover" />
                                                <div>
                                                    <div className="font-bold text-white text-sm">{barber.name}</div>
                                                    <div className="text-[10px] text-gray-400">{barber.specialty}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        resources.map(resource => (
                                            <div key={resource.id} className="flex-1 p-3 border-r border-barber-800 min-w-[200px] flex items-center gap-3">
                                                <div className="w-8 h-8 bg-barber-800 rounded-lg flex items-center justify-center text-barber-gold">
                                                    <Armchair size={16} />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white text-sm">{resource.name}</div>
                                                    <div className="text-[10px] text-gray-400">{resource.type}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Time Slots Grid */}
                                <div className="flex-1 relative">
                                    {/* Current Time Indicator */}
                                    <div className="absolute top-[320px] left-16 right-0 border-t border-red-500 z-10 pointer-events-none opacity-50 flex items-center">
                                        <div className="absolute -left-12 bg-red-500 text-white text-[10px] px-1 rounded sticky left-1">13:45</div>
                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full -mt-[3px] -ml-[3px]"></div>
                                    </div>

                                    {hours.map(hour => (
                                        <div key={hour} className="flex border-b border-barber-800/50 h-24 group hover:bg-barber-800/10 transition-colors">
                                            <div className="w-16 border-r border-barber-800 p-2 text-right shrink-0 bg-barber-950/30 text-gray-500 font-mono text-xs pt-2 sticky left-0 z-10">
                                                {hour}:00
                                            </div>

                                            {(viewEntity === 'barber' ? filteredBarbers : resources).map((entity: any) => {
                                                const appointment = getAppointmentForSlot(entity.id, hour);
                                                const service = appointment ? services.find(s => s.id === appointment.serviceId) : null;
                                                const isBlocked = appointment?.status === Status.BLOCKED;
                                                const consumptionTotal = appointment?.consumption?.reduce((acc, item) => acc + (item.price * item.quantity), 0) || 0;

                                                return (
                                                    <div
                                                        key={`${entity.id}-${hour}`}
                                                        className="flex-1 border-r border-barber-800 min-w-[200px] p-1 relative transition-colors"
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => handleDrop(e, entity.id, hour)}
                                                    >
                                                        {!appointment ? (
                                                            <div className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-all">
                                                                <button className="bg-barber-800/80 hover:bg-barber-gold hover:text-black text-gray-300 rounded p-1.5 transition-colors" title="Novo Agendamento">
                                                                    <Plus size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleBlockSlot(entity.id, hour)}
                                                                    className="bg-barber-800/80 hover:bg-red-500/80 text-gray-300 hover:text-white rounded p-1.5 transition-colors"
                                                                    title="Bloquear Horário"
                                                                >
                                                                    <Lock size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                draggable={!isBlocked}
                                                                onDragStart={(e) => handleDragStart(e, appointment.id)}
                                                                onDragEnd={handleDragEnd}
                                                                className={`w-full h-full rounded-md p-2 border-l-4 text-xs flex flex-col gap-0.5 cursor-grab active:cursor-grabbing transition-all shadow-lg overflow-hidden group/card relative ${getStatusStyle(appointment.status)}`}
                                                            >
                                                                {/* Card Actions Overlay */}
                                                                {!isBlocked && (
                                                                    <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity bg-black/50 rounded p-0.5 backdrop-blur-sm z-30">
                                                                        <button
                                                                            onClick={() => setActiveCommandApp(appointment.id)}
                                                                            className="p-1 hover:bg-barber-gold hover:text-black rounded text-white"
                                                                            title="Comanda / Consumo"
                                                                        >
                                                                            <ShoppingBag size={12} />
                                                                        </button>
                                                                        {appointment.status !== Status.COMPLETED && (
                                                                            <button
                                                                                onClick={() => handleStatusChange(appointment.id, Status.COMPLETED)}
                                                                                className="p-1 hover:bg-green-500 hover:text-black rounded text-white"
                                                                                title="Concluir Atendimento"
                                                                            >
                                                                                <Check size={12} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {isBlocked ? (
                                                                    <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-1">
                                                                        <Lock size={16} />
                                                                        <span className="font-bold uppercase tracking-wider text-[10px]">Bloqueado</span>
                                                                        <span className="text-[9px]">{appointment.clientName}</span>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <div className="flex justify-between items-start pointer-events-none">
                                                                            <div className="font-bold truncate text-sm">{appointment.clientName}</div>
                                                                            {appointment.status === Status.PENDING && <AlertCircle size={12} className="text-yellow-500" />}
                                                                        </div>
                                                                        <div className="flex items-center gap-1 opacity-80 pointer-events-none">
                                                                            <Clock size={10} /> {appointment.time}
                                                                            {service && <span className="opacity-70">({service.duration}m)</span>}
                                                                        </div>
                                                                        <div className="mt-auto flex justify-between items-end pointer-events-none">
                                                                            {service && (
                                                                                <div className="flex flex-col">
                                                                                    <span className="truncate max-w-[120px] font-medium">{service.name}</span>
                                                                                    {consumptionTotal > 0 && (
                                                                                        <span className="text-[9px] text-barber-gold font-bold">+ R$ {consumptionTotal} consumo</span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* MONTH VIEW */
                        <div className="flex flex-col h-full bg-barber-950 overflow-auto">
                            <div className="grid grid-cols-7 border-b border-barber-800 bg-barber-900 min-w-[400px]">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                    <div key={day} className="py-2 text-center text-xs font-bold text-gray-500 uppercase">{day}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 flex-1 auto-rows-fr min-w-[400px]">
                                {monthDays.map((day, idx) => {
                                    const stats = getDayStats(day);
                                    const isSelectedMonth = isSameMonth(day, currentDate);
                                    const isDayToday = isToday(day);

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                                            className={`border-b border-r border-barber-800 p-2 flex flex-col justify-between cursor-pointer hover:bg-barber-800/30 transition-colors min-h-[100px] ${!isSelectedMonth ? 'opacity-30 bg-black/50' : ''}`}
                                        >
                                            <div className="flex justify-between">
                                                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${isDayToday ? 'bg-barber-gold text-black' : 'text-gray-400'}`}>
                                                    {format(day, 'd')}
                                                </span>
                                                {stats.hasPending && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>}
                                            </div>
                                            {stats.count > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    <div className="text-[10px] text-gray-400">{stats.count} agend.</div>
                                                    <div className="text-[10px] text-green-500 font-bold">R$ {stats.revenue}</div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* WAITLIST SIDEBAR - Responsive Drawer */}
            <div className={`fixed inset-y-0 right-0 z-40 w-full sm:w-80 bg-barber-950 border-l border-barber-800 shadow-2xl transform transition-transform duration-300 ${showWaitlist ? 'translate-x-0' : 'translate-x-full'} md:relative md:transform-none md:w-80 md:block ${showWaitlist ? '' : 'hidden md:hidden'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-barber-800 bg-barber-900 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <List size={18} className="text-barber-gold" /> Lista de Espera
                        </h3>
                        <button onClick={() => setShowWaitlist(false)} className="md:hidden text-gray-500 p-2 hover:bg-barber-800 rounded">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {waitlist.length === 0 ? (
                            <div className="text-center text-gray-500 text-sm py-10">Lista vazia</div>
                        ) : (
                            waitlist.map(item => (
                                <div key={item.id} className="bg-barber-900 border border-barber-800 p-3 rounded-lg shadow-sm hover:border-barber-gold/50 transition-colors group relative cursor-grab active:cursor-grabbing">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-bold text-white text-sm">{item.clientName}</div>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${item.priority === 'High' ? 'bg-red-500/20 text-red-500' : 'bg-gray-700 text-gray-300'}`}>
                                            {item.priority === 'High' ? 'Urgente' : item.priority}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-400 mb-2">{item.serviceName} • {item.phone}</div>

                                    <div className="flex items-center justify-between text-xs border-t border-barber-800 pt-2">
                                        <span className="text-barber-gold font-medium flex items-center gap-1">
                                            <Clock size={10} /> {item.requestTime}
                                        </span>
                                        <span className="text-gray-600">{item.createdAt}</span>
                                    </div>

                                    <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-opacity">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-barber-800 bg-barber-900">
                        <button className="w-full bg-barber-800 hover:bg-barber-700 text-gray-300 hover:text-white py-3 rounded-lg text-sm font-bold border border-barber-700 border-dashed flex items-center justify-center gap-2 transition-colors">
                            <Plus size={16} /> Adicionar à Lista
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default Calendar;
