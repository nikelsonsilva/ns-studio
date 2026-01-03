import { supabase } from './supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { Business, BusinessType } from '../types';

/**
 * =====================================================
 * MULTI-TENANT AUTHENTICATION
 * =====================================================
 */

/**
 * Interface para dados de registro (Multi-Tenant)
 */
export interface SignUpData {
    email: string;
    password: string;
    fullName: string;
    businessType: BusinessType;
    businessName: string;
    phone?: string;
}

/**
 * Interface para dados de login
 */
export interface SignInData {
    email: string;
    password: string;
}

/**
 * Hook para obter o usuário atual
 */
export const getCurrentUser = async (): Promise<User | null> => {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
            console.error('Error getting current user:', error);
            return null;
        }

        return user;
    } catch (error) {
        console.error('Unexpected error getting user:', error);
        return null;
    }
};

/**
 * Hook para obter a sessão atual
 */
export const getCurrentSession = async (): Promise<Session | null> => {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
            console.error('Error getting session:', error);
            return null;
        }

        return session;
    } catch (error) {
        console.error('Unexpected error getting session:', error);
        return null;
    }
};

/**
 * Registrar novo usuário E criar business (Multi-Tenant)
 */
export const signUp = async ({
    email,
    password,
    fullName,
    businessType,
    businessName,
    phone
}: SignUpData) => {
    try {
        // 1. Criar usuário no Supabase Auth com metadados
        // O trigger 'on_auth_user_created' no banco vai criar o business automaticamente
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    business_name: businessName,
                    business_type: businessType,
                    phone: phone
                },
            },
        });

        if (authError) {
            return { user: null, error: authError };
        }

        return { user: authData.user, error: null };

    } catch (error) {
        console.error('Unexpected error during sign up:', error);
        return { user: null, error: error as AuthError };
    }
};

/**
 * Fazer login
 */
export const signIn = async ({ email, password }: SignInData) => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { user: null, session: null, error };
        }

        return { user: data.user, session: data.session, error: null };
    } catch (error) {
        console.error('Unexpected error during sign in:', error);
        return { user: null, session: null, error: error as AuthError };
    }
};

/**
 * Fazer logout
 */
export const signOut = async () => {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Error signing out:', error);
            return { error };
        }

        return { error: null };
    } catch (error) {
        console.error('Unexpected error during sign out:', error);
        return { error: error as AuthError };
    }
};

/**
 * Resetar senha
 */
export const resetPassword = async (email: string) => {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
            return { error };
        }

        return { error: null };
    } catch (error) {
        console.error('Unexpected error resetting password:', error);
        return { error: error as AuthError };
    }
};

/**
 * Atualizar senha
 */
export const updatePassword = async (newPassword: string) => {
    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            return { error };
        }

        return { error: null };
    } catch (error) {
        console.error('Unexpected error updating password:', error);
        return { error: error as AuthError };
    }
};

/**
 * Listener para mudanças no estado de autenticação
 */
export const onAuthStateChange = (callback: (user: User | null) => void) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
            callback(session?.user ?? null);
        }
    );

    return subscription;
};
