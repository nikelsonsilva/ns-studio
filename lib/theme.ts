// Theme configuration based on business type
import type { BusinessType } from '../types';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    shadow: string;
    mode: ThemeMode;
}

export const themes: Record<BusinessType, ThemeColors> = {
    barbershop: {
        primary: '#f59e0b',      // Gold - amber-500
        primaryHover: '#d97706', // amber-600
        primaryLight: '#fbbf24', // amber-400
        primaryDark: '#b45309',  // amber-700
        accent: '#f59e0b',
        shadow: 'rgba(245, 158, 11, 0.15)',
        mode: 'dark'
    },
    salon: {
        primary: '#6172F3',      // Indigo-500
        primaryHover: '#444CE7', // Indigo-600
        primaryLight: '#8098F9', // Indigo-400
        primaryDark: '#3538CD',  // Indigo-700
        accent: '#6172F3',
        shadow: 'rgba(97, 114, 243, 0.15)',
        mode: 'light'
    }
};

export const getTheme = (businessType: BusinessType): ThemeColors => {
    return themes[businessType];
};

/**
 * Get theme mode for a business type
 */
export const getThemeMode = (businessType: BusinessType): ThemeMode => {
    return themes[businessType].mode;
};

/**
 * Apply theme based on business type
 * - Barbershop: Dark mode with gold accent
 * - Salon: Light mode with purple accent
 */
export const applyTheme = (businessType: BusinessType) => {
    const theme = getTheme(businessType);
    const root = document.documentElement;

    // Apply dark/light mode class based on business type
    if (theme.mode === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
    } else {
        root.classList.remove('dark');
        root.classList.add('light');
    }

    // Apply primary color CSS variables
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-primary-hover', theme.primaryHover);
    root.style.setProperty('--color-primary-light', theme.primaryLight);
    root.style.setProperty('--color-primary-dark', theme.primaryDark);
    root.style.setProperty('--color-accent', theme.accent);
    root.style.setProperty('--color-shadow', theme.shadow);

    // Update localStorage to persist preference
    localStorage.setItem('ns-studio-theme', theme.mode);
    localStorage.setItem('ns-studio-business-theme', businessType);
};

/**
 * Manually set theme mode (allows user override)
 */
export const setThemeMode = (mode: ThemeMode) => {
    const root = document.documentElement;

    if (mode === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
    } else {
        root.classList.remove('dark');
        root.classList.add('light');
    }

    localStorage.setItem('ns-studio-theme', mode);
};

/**
 * Toggle between light and dark mode
 */
export const toggleThemeMode = (): ThemeMode => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    const newMode: ThemeMode = isDark ? 'light' : 'dark';

    setThemeMode(newMode);
    return newMode;
};

