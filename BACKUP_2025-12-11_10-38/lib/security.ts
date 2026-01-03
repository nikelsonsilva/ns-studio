import { supabase } from './supabase';

/**
 * Verificar se o usuário tem permissão para acessar um recurso
 */
export const checkPermission = async (
    userId: string,
    resource: string,
    action: 'read' | 'write' | 'delete'
): Promise<boolean> => {
    try {
        // Esta função será implementada conforme criamos a tabela de permissões
        // Por enquanto, retorna true para permitir desenvolvimento
        console.log(`Checking permission for user ${userId} on ${resource} (${action})`);
        return true;
    } catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
};

/**
 * Validar email
 */
export const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validar senha (mínimo 8 caracteres, pelo menos 1 letra e 1 número)
 */
export const isValidPassword = (password: string): boolean => {
    if (password.length < 8) return false;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasLetter && hasNumber;
};

/**
 * Sanitizar input do usuário
 */
export const sanitizeInput = (input: string): string => {
    return input.trim().replace(/[<>]/g, '');
};

/**
 * Verificar se o usuário está autenticado
 */
export const isAuthenticated = async (): Promise<boolean> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    } catch (error) {
        console.error('Error checking authentication:', error);
        return false;
    }
};

/**
 * Obter role do usuário atual
 */
export const getUserRole = async (): Promise<'Admin' | 'Manager' | 'Barber' | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        // O role está armazenado nos metadados do usuário
        const role = user.user_metadata?.role;

        if (role === 'Admin' || role === 'Manager' || role === 'Barber') {
            return role;
        }

        return 'Barber'; // Default role
    } catch (error) {
        console.error('Error getting user role:', error);
        return null;
    }
};

/**
 * Verificar se o usuário tem role específico
 */
export const hasRole = async (requiredRole: 'Admin' | 'Manager' | 'Barber'): Promise<boolean> => {
    const userRole = await getUserRole();

    if (!userRole) return false;

    // Admin tem acesso a tudo
    if (userRole === 'Admin') return true;

    // Manager tem acesso a Manager e Barber
    if (userRole === 'Manager' && (requiredRole === 'Manager' || requiredRole === 'Barber')) {
        return true;
    }

    // Verificação exata
    return userRole === requiredRole;
};

/**
 * Rate limiting simples (prevenir abuso)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (
    key: string,
    maxRequests: number = 10,
    windowMs: number = 60000
): boolean => {
    const now = Date.now();
    const record = requestCounts.get(key);

    if (!record || now > record.resetTime) {
        requestCounts.set(key, { count: 1, resetTime: now + windowMs });
        return true;
    }

    if (record.count >= maxRequests) {
        return false;
    }

    record.count++;
    return true;
};

/**
 * Gerar token seguro para convites, etc.
 */
export const generateSecureToken = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Verificar se a sessão está válida
 */
export const isSessionValid = async (): Promise<boolean> => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) return false;

        // Verificar se o token não expirou
        const expiresAt = session.expires_at;
        if (!expiresAt) return false;

        const now = Math.floor(Date.now() / 1000);
        return expiresAt > now;
    } catch (error) {
        console.error('Error validating session:', error);
        return false;
    }
};

/**
 * Refresh token se necessário
 */
export const refreshSessionIfNeeded = async (): Promise<boolean> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) return false;

        const expiresAt = session.expires_at;
        if (!expiresAt) return false;

        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = expiresAt - now;

        // Refresh se faltar menos de 5 minutos para expirar
        if (timeUntilExpiry < 300) {
            const { error } = await supabase.auth.refreshSession();
            if (error) {
                console.error('Error refreshing session:', error);
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Error refreshing session:', error);
        return false;
    }
};
