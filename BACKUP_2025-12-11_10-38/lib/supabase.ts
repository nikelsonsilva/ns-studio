import { createClient } from '@supabase/supabase-js';

// Validação das variáveis de ambiente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. Please check your .env.local file.'
    );
}

// Criar cliente Supabase com configurações de segurança
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
    },
    db: {
        schema: 'public',
    },
    global: {
        headers: {
            'X-Client-Info': 'ns-studio-app',
        },
    },
});

// Tipos para o banco de dados (serão expandidos conforme criamos as tabelas)
export type Database = {
    public: {
        Tables: {
            // Tabelas serão definidas aqui conforme criamos o schema
        };
    };
};
