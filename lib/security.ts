import { supabase } from './supabase';

// =====================================================
// INPUT VALIDATION & SANITIZATION
// =====================================================

/**
 * Valida UUID para prevenir injection
 */
export const isValidUUID = (str: string): boolean => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
};

/**
 * Sanitiza string para prevenir XSS
 */
export const sanitizeHtml = (input: string): string => {
    if (!input) return '';
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

/**
 * Verificar se o usuário tem permissão para acessar um recurso
 */
export const checkPermission = async (
    userId: string,
    resource: string,
    action: 'read' | 'write' | 'delete'
): Promise<boolean> => {
    try {
        // Validate UUID to prevent injection
        if (!isValidUUID(userId)) return false;
        return true; // Will be enhanced when permissions table is ready
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
export const getUserRole = async (): Promise<'saas_admin' | 'tenant_owner' | 'professional' | 'client' | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // Check profiles table for role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        const role = profile?.role || user.user_metadata?.role;

        if (['saas_admin', 'tenant_owner', 'professional', 'client'].includes(role)) {
            return role;
        }

        return 'client'; // Default role
    } catch (error) {
        console.error('Error getting user role:', error);
        return null;
    }
};

/**
 * MULTI-TENANT: Verificar se usuário pode acessar um business específico
 * - saas_admin: pode acessar QUALQUER business
 * - tenant_owner/professional: apenas SEU PRÓPRIO business
 */
export const canAccessBusiness = async (targetBusinessId: string): Promise<boolean> => {
    try {
        if (!isValidUUID(targetBusinessId)) return false;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const role = await getUserRole();

        // SaaS admin can access any business
        if (role === 'saas_admin') return true;

        // Get user's business_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('business_id')
            .eq('id', user.id)
            .single();

        // Tenant isolation: can only access own business
        return profile?.business_id === targetBusinessId;
    } catch (error) {
        console.error('Error checking business access:', error);
        return false;
    }
};

/**
 * Verificar se o usuário tem role específico
 * Role hierarchy: saas_admin > tenant_owner > professional > client
 */
export const hasRole = async (requiredRole: 'saas_admin' | 'tenant_owner' | 'professional' | 'client'): Promise<boolean> => {
    const userRole = await getUserRole();

    if (!userRole) return false;

    // saas_admin tem acesso a tudo
    if (userRole === 'saas_admin') return true;

    // tenant_owner tem acesso a tenant_owner, professional e client
    if (userRole === 'tenant_owner' && (requiredRole === 'tenant_owner' || requiredRole === 'professional' || requiredRole === 'client')) {
        return true;
    }

    // professional tem acesso a professional e client
    if (userRole === 'professional' && (requiredRole === 'professional' || requiredRole === 'client')) {
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
