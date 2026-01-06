/**
 * CPF Validation Helper
 * Uses Brasil API for validation when available,
 * falls back to algorithmic validation
 */

// Validate CPF format and checksum algorithmically
export const validateCPFLocal = (cpf: string): boolean => {
    // Remove non-digits
    const cleanCPF = cpf.replace(/\D/g, '');

    // Must have 11 digits
    if (cleanCPF.length !== 11) return false;

    // Reject known invalid CPFs
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

    // Validate first check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanCPF[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF[9])) return false;

    // Validate second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleanCPF[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanCPF[10])) return false;

    return true;
};

// Format CPF with mask
export const formatCPF = (cpf: string): string => {
    const cleanCPF = cpf.replace(/\D/g, '').slice(0, 11);
    if (cleanCPF.length <= 3) return cleanCPF;
    if (cleanCPF.length <= 6) return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3)}`;
    if (cleanCPF.length <= 9) return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3, 6)}.${cleanCPF.slice(6)}`;
    return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3, 6)}.${cleanCPF.slice(6, 9)}-${cleanCPF.slice(9)}`;
};

// Validate CPF using Brasil API (with fallback)
export const validateCPFWithAPI = async (cpf: string): Promise<{
    valid: boolean;
    name?: string;
    error?: string;
}> => {
    const cleanCPF = cpf.replace(/\D/g, '');

    // First check locally
    if (!validateCPFLocal(cleanCPF)) {
        return { valid: false, error: 'CPF inválido' };
    }

    // Try Brasil API (public endpoint - may have rate limits)
    try {
        const response = await fetch(`https://brasilapi.com.br/api/cpf/v1/${cleanCPF}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            return {
                valid: true,
                name: data.nome || undefined
            };
        } else if (response.status === 404) {
            // CPF not found in database - but format is valid
            return { valid: true };
        } else {
            // API error - fallback to local validation
            return { valid: validateCPFLocal(cleanCPF) };
        }
    } catch (error) {
        // Network error - fallback to local validation
        console.warn('Brasil API unavailable, using local validation');
        return { valid: validateCPFLocal(cleanCPF) };
    }
};
