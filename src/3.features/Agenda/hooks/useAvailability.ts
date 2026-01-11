/**
 * useAvailability Hook
 * Lógica para verificar disponibilidade de slots
 * Extraído do Calendar.tsx (linhas 538-620)
 */

import { useMemo, useCallback } from 'react';
import { isSameDay, parseISO } from 'date-fns';
import type { TimeBlock, ProfessionalAvailability, DayHours } from '../types';

interface UseAvailabilityProps {
    currentDate: Date;
    businessHours: DayHours | null;
    profAvailability: ProfessionalAvailability[];
    timeBlocks: TimeBlock[];
}

export function useAvailability({
    currentDate,
    businessHours,
    profAvailability,
    timeBlocks
}: UseAvailabilityProps) {

    /**
     * Verifica se um slot de horário já passou
     */
    const isTimeSlotPast = useCallback((time: string): boolean => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const selectedDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

        if (selectedDay < today) return true;

        if (isSameDay(currentDate, now)) {
            const [hours, minutes] = time.split(':').map(Number);
            const slotTime = new Date();
            slotTime.setHours(hours, minutes, 0, 0);
            return slotTime < now;
        }

        return false;
    }, [currentDate]);

    /**
     * Verifica se um slot está no intervalo de pausa do profissional
     */
    const isSlotInBreak = useCallback((professionalId: string, time: string): boolean => {
        const dayOfWeek = currentDate.getDay();
        const availability = profAvailability.find(
            a => a.professional_id === professionalId && a.day_of_week === dayOfWeek && a.is_active
        );
        if (!availability || !availability.break_start || !availability.break_end) return false;

        const [hour, minute] = time.split(':').map(Number);
        const timeMinutes = hour * 60 + minute;
        const [bsH, bsM] = availability.break_start.split(':').map(Number);
        const [beH, beM] = availability.break_end.split(':').map(Number);

        return timeMinutes >= (bsH * 60 + bsM) && timeMinutes < (beH * 60 + beM);
    }, [currentDate, profAvailability]);

    /**
     * Verifica se o profissional está trabalhando neste horário
     */
    const isProfessionalWorkingAt = useCallback((professionalId: string, time: string): boolean => {
        const dayOfWeek = currentDate.getDay();
        const availability = profAvailability.find(
            a => a.professional_id === professionalId && a.day_of_week === dayOfWeek
        );

        // Se não tem disponibilidade configurada, assume que trabalha
        if (!availability) return true;
        if (!availability.is_active) return false;

        const [hour, minute] = time.split(':').map(Number);
        const timeMinutes = hour * 60 + minute;
        const [startH, startM] = availability.start_time.split(':').map(Number);
        const [endH, endM] = availability.end_time.split(':').map(Number);

        let endMinutes = endH * 60 + endM;
        if (endMinutes === 0) endMinutes = 1440; // meia-noite

        return timeMinutes >= (startH * 60 + startM) && timeMinutes < endMinutes;
    }, [currentDate, profAvailability]);

    /**
     * Retorna o bloqueio para um slot específico, se existir
     */
    const getBlockForSlot = useCallback((professionalId: string, time: string): TimeBlock | null => {
        return timeBlocks.find(block => {
            // Só considera bloqueios deste profissional específico
            if (block.professional_id !== professionalId) return false;

            const blockStart = parseISO(block.start_datetime);
            const blockEnd = parseISO(block.end_datetime);

            const [hours, minutes] = time.split(':').map(Number);
            const slotDate = new Date(currentDate);
            slotDate.setHours(hours, minutes, 0, 0);

            return slotDate >= blockStart && slotDate < blockEnd;
        }) || null;
    }, [currentDate, timeBlocks]);

    /**
     * Verifica se o estabelecimento está fechado no dia selecionado
     */
    const isBusinessClosed = useMemo((): boolean => {
        return businessHours === null;
    }, [businessHours]);

    /**
     * Gera array de slots de horário baseado no horário de funcionamento
     */
    const generateTimeSlots = useCallback((bufferMinutes: number): string[] => {
        if (!businessHours) return [];

        const [openHour, openMin = 0] = businessHours.open.split(':').map(Number);
        let [closeHour, closeMin = 0] = businessHours.close.split(':').map(Number);

        // Tratar 00:00 como meia-noite (24:00)
        if (closeHour === 0 && closeMin === 0) closeHour = 24;

        const slotInterval = Math.max(bufferMinutes || 30, 5);
        const rawStartMinutes = openHour * 60 + openMin;
        const endMinutes = closeHour * 60 + closeMin;
        const startMinutes = Math.floor(rawStartMinutes / slotInterval) * slotInterval;

        const slots: string[] = [];
        for (let minutes = startMinutes; minutes < endMinutes; minutes += slotInterval) {
            const h = Math.floor(minutes / 60);
            const m = minutes % 60;
            slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }

        return slots;
    }, [businessHours]);

    return {
        isTimeSlotPast,
        isSlotInBreak,
        isProfessionalWorkingAt,
        getBlockForSlot,
        isBusinessClosed,
        generateTimeSlots
    };
}
