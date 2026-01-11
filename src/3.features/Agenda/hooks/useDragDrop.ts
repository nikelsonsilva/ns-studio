/**
 * useDragDrop Hook
 * Lógica de drag & drop para reagendamento
 * Extraído do Calendar.tsx (linhas 719-835)
 */

import React, { useState, useCallback } from 'react';
import { isSameDay } from 'date-fns';
import type { TimeBlock, PendingDrop } from '../types';
import type { Appointment } from '@/types';
import { updateAppointment } from '../api/agendaService';
import { fromUTC } from '@/lib/timezone';

interface UseDragDropProps {
    currentDate: Date;
    appointments: Appointment[];
    onSuccess: () => void;
    onToast: {
        success: (msg: string) => void;
        error: (msg: string) => void;
        warning: (msg: string) => void;
    };
    // Funções de validação do useAvailability
    isTimeSlotPast: (time: string) => boolean;
    getBlockForSlot: (professionalId: string, time: string) => TimeBlock | null;
    isProfessionalWorkingAt: (professionalId: string, time: string) => boolean;
    isSlotInBreak: (professionalId: string, time: string) => boolean;
}

export function useDragDrop({
    currentDate,
    appointments,
    onSuccess,
    onToast,
    isTimeSlotPast,
    getBlockForSlot,
    isProfessionalWorkingAt,
    isSlotInBreak
}: UseDragDropProps) {
    const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
    const [isDragConfirmOpen, setIsDragConfirmOpen] = useState(false);
    const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);

    const handleAppointmentDragStart = useCallback((e: React.DragEvent, appointment: Appointment) => {
        setDraggedAppointment(appointment);
        e.currentTarget.classList.add('opacity-50', 'scale-95');
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleAppointmentDragEnd = useCallback((e: React.DragEvent) => {
        e.currentTarget.classList.remove('opacity-50', 'scale-95');
        setDraggedAppointment(null);
    }, []);

    const handleSlotDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleSlotDrop = useCallback(async (
        e: React.DragEvent,
        professionalId: string,
        time: string
    ) => {
        e.preventDefault();
        if (!draggedAppointment) return;

        // 1. Verificar se está soltando em horário passado
        if (isTimeSlotPast(time)) {
            onToast.error('Não é possível mover para um horário passado!');
            setDraggedAppointment(null);
            return;
        }

        // 2. Verificar se slot está bloqueado
        const block = getBlockForSlot(professionalId, time);
        if (block) {
            onToast.error('Este horário está bloqueado!');
            setDraggedAppointment(null);
            return;
        }

        // 3. Verificar se profissional trabalha neste horário
        if (!isProfessionalWorkingAt(professionalId, time)) {
            onToast.error('Este profissional está de folga neste horário!');
            setDraggedAppointment(null);
            return;
        }

        // 4. Verificar se está em pausa
        if (isSlotInBreak(professionalId, time)) {
            onToast.error('Este profissional está em pausa neste horário!');
            setDraggedAppointment(null);
            return;
        }

        // 5. Verificar conflito com outros agendamentos
        const existingAppointments = appointments.filter((a: any) => {
            if (a.status === 'cancelled' || a.status === 'canceled' || a.status === 'no_show') return false;
            const profId = a.professional_id || a.barberId;
            if (profId !== professionalId) return false;
            const startDt = a.start_datetime || a.date;
            const d = startDt ? fromUTC(startDt) : null;
            if (!d || !isSameDay(d, currentDate)) return false;
            const aptHour = d.getHours();
            const [slotHour] = time.split(':').map(Number);
            return aptHour === slotHour && a.id !== draggedAppointment.id;
        });

        if (existingAppointments.length > 0) {
            onToast.error('Este horário já está ocupado por outro agendamento!');
            setDraggedAppointment(null);
            return;
        }

        // 6. Todas validações passaram - abrir modal de confirmação
        setPendingDrop({
            appointment: draggedAppointment,
            targetProfessionalId: professionalId,
            targetTime: time
        });
        setIsDragConfirmOpen(true);
        setDraggedAppointment(null);
    }, [
        draggedAppointment,
        currentDate,
        appointments,
        isTimeSlotPast,
        getBlockForSlot,
        isProfessionalWorkingAt,
        isSlotInBreak,
        onToast
    ]);

    const confirmDrop = useCallback(async () => {
        if (!pendingDrop) return;

        const { appointment, targetProfessionalId, targetTime } = pendingDrop;

        // Construir nova data/hora
        const [hours, minutes] = targetTime.split(':').map(Number);
        const newDate = new Date(currentDate);
        newDate.setHours(hours, minutes, 0, 0);

        const success = await updateAppointment(appointment.id, {
            professional_id: targetProfessionalId,
            start_datetime: newDate.toISOString()
        });

        if (success) {
            onToast.success('Agendamento reagendado com sucesso!');
            onSuccess();
        } else {
            onToast.error('Erro ao reagendar. Tente novamente.');
        }

        setIsDragConfirmOpen(false);
        setPendingDrop(null);
    }, [pendingDrop, currentDate, onSuccess, onToast]);

    const cancelDrop = useCallback(() => {
        setIsDragConfirmOpen(false);
        setPendingDrop(null);
    }, []);

    return {
        draggedAppointment,
        isDragConfirmOpen,
        pendingDrop,
        handleAppointmentDragStart,
        handleAppointmentDragEnd,
        handleSlotDragOver,
        handleSlotDrop,
        confirmDrop,
        cancelDrop
    };
}
