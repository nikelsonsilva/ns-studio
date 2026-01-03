/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: ['./index.html', './**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
            },

            colors: {
                // Barber Dark Premium Theme
                barber: {
                    // Backgrounds
                    950: '#0a0a0a',   // Background principal (página)
                    900: '#18181b',   // Background cards/inputs
                    800: '#27272a',   // Bordas padrão
                    700: '#3f3f46',   // Hover backgrounds
                    600: '#52525b',   // Hover borders

                    // Gold/Amber accent
                    gold: '#f59e0b',       // Destaque principal
                    goldhover: '#d97706',  // Hover do gold
                    goldlight: '#fbbf24',  // Gold mais claro
                    golddark: '#b45309',   // Gold mais escuro
                },

                // Semantic Text Colors (for ns-studio UI compatibility)
                main: '#ffffff',           // Branco puro - texto principal
                muted: '#a1a1aa',           // Zinc 400 - texto secundário
                inverted: '#000000',        // Preto - texto sobre gold

                // Input Background
                'input-bg': '#0a0a0a',      // Background dos inputs

                // Superfícies (aliases semânticos)
                surface: {
                    DEFAULT: '#0a0a0a',     // bg-barber-950
                    raised: '#18181b',      // bg-barber-900
                    elevated: '#27272a',    // bg-barber-800
                },

                // Bordas
                border: {
                    subtle: '#27272a',      // barber-800
                    strong: '#3f3f46',      // barber-700
                },

                // Texto
                text: {
                    strong: '#ffffff',      // Branco puro
                    soft: '#d4d4d8',        // zinc-300
                    muted: '#a1a1aa',       // zinc-400
                    faint: '#71717a',       // zinc-500
                },

                // Primary (alias para gold)
                primary: {
                    300: '#fcd34d',
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                    700: '#b45309',
                },

                // Estados
                success: {
                    400: '#4ade80',
                    500: '#22c55e',
                    600: '#16a34a',
                },
                danger: {
                    400: '#f87171',
                    500: '#ef4444',
                    600: '#dc2626',
                },
                warning: {
                    400: '#fb923c',
                    500: '#f97316',
                    600: '#ea580c',
                },
                info: {
                    400: '#38bdf8',
                    500: '#0ea5e9',
                    600: '#0284c7',
                },
            },

            boxShadow: {
                card: '0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.3)',
                'card-lg': '0 10px 15px -3px rgba(0,0,0,0.4), 0 4px 6px -4px rgba(0,0,0,0.3)',
                'card-gold': '0 0 20px rgba(245,158,11,0.15)',
                modal: '0 25px 50px -12px rgba(0,0,0,0.6)',
            },

            borderRadius: {
                xl: '0.75rem',
                '2xl': '1rem',
            },

            animation: {
                'fade-in': 'fade-in 200ms ease-out',
                'slide-up': 'slide-up 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                'slide-down': 'slide-down 300ms cubic-bezier(0.16, 1, 0.3, 1)',
                'scale-in': 'scale-in 200ms ease-out',
            },
            keyframes: {
                'fade-in': {
                    from: { opacity: 0, transform: 'translateY(4px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                },
                'slide-up': {
                    from: { opacity: 0, transform: 'translateY(100%)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                },
                'slide-down': {
                    from: { opacity: 0, transform: 'translateY(-10px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                },
                'scale-in': {
                    from: { opacity: 0, transform: 'scale(0.95)' },
                    to: { opacity: 1, transform: 'scale(1)' },
                },
            },
        },
    },
    plugins: [],
};
