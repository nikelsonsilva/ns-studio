/**
 * MiniCalendar Component
 * Calendário pequeno da sidebar
 */

import React from 'react';
import { format, isSameDay, isSameMonth, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '@/components/ui/Card';
import type { Appointment } from '@/types';

interface MiniCalendarProps {
    currentDate: Date;
    miniCalendarMonth: Date;
    calendarDays: Date[];
    appointments: Appointment[];
    onDateClick: (date: Date) => void;
    onPrevMonth: () => void;
    onNextMonth: () => void;
}

const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
    currentDate,
    miniCalendarMonth,
    calendarDays,
    appointments,
    onDateClick,
    onPrevMonth,
    onNextMonth
}) => {
    return (
        <Card noPadding className="p-3 bg-zinc-950 border-zinc-800 shadow-md shrink-0">
            <div className="flex justify-between items-center mb-3">
                <button onClick={onPrevMonth} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
                    <ChevronLeft size={14} />
                </button>
                <span className="font-bold text-white capitalize text-xs">
                    {format(miniCalendarMonth, 'MMMM yyyy', { locale: ptBR })}
                </span>
                <button onClick={onNextMonth} className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
                    <ChevronRight size={14} />
                </button>
            </div>
            <div className="grid grid-cols-7 mb-1 text-center text-[9px] font-bold text-zinc-500 h-5">
                {weekDays.map((day, i) => <div key={i}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((day, idx) => {
                    const isSelected = isSameDay(day, currentDate);
                    const isCurrentMonth = isSameMonth(day, miniCalendarMonth);
                    const isDayToday = isToday(day);
                    const hasEvents = appointments.some(a => isSameDay(new Date(a.start_datetime || a.date), day));

                    return (
                        <button
                            key={idx}
                            onClick={() => onDateClick(day)}
                            className={`h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-medium transition-all relative
                ${!isCurrentMonth ? 'text-zinc-600 opacity-30' : 'text-white'}
                ${isSelected ? 'bg-amber-500 text-black font-bold shadow-lg shadow-amber-500/20' : 'hover:bg-zinc-800'}
                ${isDayToday && !isSelected ? 'border border-amber-500 text-amber-500' : ''}
              `}
                        >
                            {format(day, 'd')}
                            {hasEvents && !isSelected && (
                                <span className="absolute bottom-1 w-1 h-1 bg-amber-500 rounded-full"></span>
                            )}
                        </button>
                    );
                })}
            </div>
        </Card>
    );
};

export default MiniCalendar;
