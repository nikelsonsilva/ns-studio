/**
 * =====================================================
 * TIME UTILITIES
 * =====================================================
 * Funções utilitárias para manipulação de horários
 * =====================================================
 */

/**
 * Gera slots de horário baseado em início, fim e intervalo de exibição
 * slotInterval é o intervalo entre slots mostrados (ex: 30 min ou 60 min)
 */
export function generateTimeSlots(
    start: string,          // '09:00'
    end: string,            // '18:00'
    durationMinutes: number, // duração do serviço (usado para verificar se cabe no horário)
    bufferMinutes: number,   // buffer entre agendamentos
    slotInterval: number = 60 // intervalo de exibição entre slots (default: 1 hora)
): string[] {
    const slots: string[] = [];

    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);

    let current = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    // Gera slots a cada slotInterval minutos
    // Só inclui se o serviço + buffer couber antes do fim
    while (current + durationMinutes <= endMinutes) {
        const h = Math.floor(current / 60).toString().padStart(2, '0');
        const m = (current % 60).toString().padStart(2, '0');
        slots.push(`${h}:${m}`);

        current += slotInterval; // Avança pelo intervalo de exibição, não pela duração
    }

    return slots;
}

/**
 * Verifica se dois intervalos de tempo se sobrepõem
 */
export function isOverlapping(
    slotStart: Date,
    slotEnd: Date,
    ranges: { start_datetime: string; end_datetime: string }[]
): boolean {
    return ranges?.some(r => {
        const rStart = new Date(r.start_datetime);
        const rEnd = new Date(r.end_datetime);
        return slotStart < rEnd && slotEnd > rStart;
    }) || false;
}

/**
 * Converte data e hora para ISO string
 */
export function toISODateTime(date: string, time: string): string {
    return new Date(`${date}T${time}:00Z`).toISOString();
}

/**
 * Adiciona minutos a uma data
 */
export function addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
}
