import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
    defaultTheme?: Theme;
}

/**
 * ThemeProvider - Manages light/dark mode for the application
 * 
 * Usage:
 * 1. Wrap your App with <ThemeProvider>
 * 2. Use useTheme() hook to access theme and toggle functions
 * 
 * The theme is persisted in localStorage and applies the 'dark' class
 * to the document root element.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    defaultTheme = 'dark' // Default to dark since that's the current theme
}) => {
    const [theme, setThemeState] = useState<Theme>(() => {
        // FORCE dark mode - clear any light mode preference
        const stored = localStorage.getItem('ns-studio-theme');
        if (stored === 'light') {
            // Clear light mode preference and force dark
            localStorage.setItem('ns-studio-theme', 'dark');
        }

        // Always start in dark mode
        return 'dark';
    });

    // Apply theme class to document root
    useEffect(() => {
        const root = document.documentElement;

        if (theme === 'dark') {
            root.classList.add('dark');
            root.classList.remove('light');
        } else {
            root.classList.remove('dark');
            root.classList.add('light');
        }

        // Persist to localStorage
        localStorage.setItem('ns-studio-theme', theme);
    }, [theme]);

    // Listen for system preference changes
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e: MediaQueryListEvent) => {
            // Only auto-switch if user hasn't set a preference
            const stored = localStorage.getItem('ns-studio-theme');
            if (!stored) {
                setThemeState(e.matches ? 'dark' : 'light');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    const toggleTheme = () => {
        setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

/**
 * useTheme hook - Access theme state and controls
 * 
 * @returns {ThemeContextType} - { theme, setTheme, toggleTheme }
 * 
 * Example:
 * ```tsx
 * const { theme, toggleTheme } = useTheme();
 * 
 * return (
 *   <button onClick={toggleTheme}>
 *     {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
 *   </button>
 * );
 * ```
 */
export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export default ThemeProvider;
