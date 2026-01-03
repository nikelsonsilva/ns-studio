/**
 * =====================================================
 * VALIDAÇÃO DE TELEFONE E EMAIL
 * =====================================================
 * Funções utilitárias para validar e formatar telefones e emails
 * usando bibliotecas profissionais (Google libphonenumber e email-validator)
 * =====================================================
 */

import { parsePhoneNumberFromString, PhoneNumber } from 'libphonenumber-js';
import * as EmailValidator from 'email-validator';

// =====================================================
// VALIDAÇÃO DE TELEFONE
// =====================================================

export interface PhoneValidationResult {
    valid: boolean;
    formatted?: string;
    international?: string;
    national?: string;
    error?: string;
}

/**
 * Valida e formata número de telefone brasileiro
 */
export async function validatePhone(phone: string): Promise<PhoneValidationResult> {
    try {
        // Remover caracteres não numéricos
        const cleanPhone = phone.replace(/\D/g, '');

        // Tentar fazer parse do número
        const phoneNumber = parsePhoneNumberFromString(cleanPhone, 'BR');

        if (!phoneNumber) {
            return {
                valid: false,
                error: 'Número de telefone inválido'
            };
        }

        if (!phoneNumber.isValid()) {
            return {
                valid: false,
                error: 'Número de telefone inválido para o Brasil'
            };
        }

        return {
            valid: true,
            formatted: phoneNumber.number, // +5511999998888
            international: phoneNumber.formatInternational(), // +55 11 99999-8888
            national: phoneNumber.formatNational() // (11) 99999-8888
        };
    } catch (error) {
        return {
            valid: false,
            error: 'Erro ao validar telefone'
        };
    }
}

/**
 * Formata telefone brasileiro (apenas formatação, sem validação)
 */
export function formatPhone(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneNumber = parsePhoneNumberFromString(cleanPhone, 'BR');

    if (phoneNumber?.isValid()) {
        return phoneNumber.formatNational(); // (11) 99999-8888
    }

    return phone; // Retorna original se não conseguir formatar
}

/**
 * Limpa e normaliza telefone para formato internacional
 */
export function normalizePhone(phone: string): string | null {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneNumber = parsePhoneNumberFromString(cleanPhone, 'BR');

    return phoneNumber?.isValid() ? phoneNumber.number : null;
}

// =====================================================
// VALIDAÇÃO DE EMAIL
// =====================================================

export interface EmailValidationResult {
    valid: boolean;
    validFormat?: boolean;
    validDomain?: boolean;
    validMX?: boolean;
    disposable?: boolean;
    error?: string;
}

/**
 * Valida email (formato básico)
 * Nota: Para validação completa de domínio/MX, seria necessário backend
 */
export async function validateEmailComplete(email: string): Promise<EmailValidationResult> {
    try {
        const isValid = EmailValidator.validate(email);

        if (!isValid) {
            return {
                valid: false,
                validFormat: false,
                error: 'Formato de email inválido'
            };
        }

        // Verificar se é email descartável (lista básica)
        const disposableDomains = [
            'tempmail.com', 'throwaway.email', '10minutemail.com',
            'guerrillamail.com', 'mailinator.com', 'trashmail.com'
        ];

        const domain = email.split('@')[1]?.toLowerCase();
        const isDisposable = disposableDomains.includes(domain);

        if (isDisposable) {
            return {
                valid: false,
                validFormat: true,
                validDomain: true,
                validMX: false,
                disposable: true,
                error: 'Email descartável não é permitido'
            };
        }

        return {
            valid: true,
            validFormat: true,
            validDomain: true,
            validMX: true,
            disposable: false
        };
    } catch (error) {
        console.error('Error validating email:', error);
        return {
            valid: false,
            error: 'Erro ao validar email'
        };
    }
}

/**
 * Validação rápida de email (apenas formato)
 * Útil para validação em tempo real no frontend
 */
export function validateEmailFormat(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Normaliza email (lowercase, trim)
 */
export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

// =====================================================
// VALIDAÇÃO COMBINADA (para formulários)
// =====================================================

export interface ContactValidationResult {
    phone?: PhoneValidationResult;
    email?: EmailValidationResult;
    valid: boolean;
}

/**
 * Valida telefone e email juntos
 */
export async function validateContact(
    phone?: string,
    email?: string
): Promise<ContactValidationResult> {
    const result: ContactValidationResult = { valid: true };

    if (phone) {
        result.phone = await validatePhone(phone);
        if (!result.phone.valid) {
            result.valid = false;
        }
    }

    if (email) {
        result.email = await validateEmailComplete(email);
        if (!result.email.valid) {
            result.valid = false;
        }
    }

    return result;
}

// =====================================================
// HELPERS PARA REACT HOOK FORM
// =====================================================

/**
 * Validador para React Hook Form - Telefone
 */
export const phoneValidator = async (value: string) => {
    if (!value) return true; // Opcional
    const result = await validatePhone(value);
    return result.valid || result.error || 'Telefone inválido';
};

/**
 * Validador para React Hook Form - Email
 */
export const emailValidator = async (value: string) => {
    if (!value) return true; // Opcional
    const result = await validateEmailComplete(value);
    return result.valid || result.error || 'Email inválido';
};

/**
 * Validador para React Hook Form - Email (apenas formato, sem async)
 */
export const emailFormatValidator = (value: string) => {
    if (!value) return true;
    return validateEmailFormat(value) || 'Formato de email inválido';
};
