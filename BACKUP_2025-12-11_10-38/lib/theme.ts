// Theme configuration based on business type
import type { BusinessType } from '../types';


export interface ThemeColors {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    primaryDark: string;
    accent: string;
    shadow: string;
}

export const themes: Record<BusinessType, ThemeColors> = {
    barbershop: {
        primary: '#f59e0b', // amber-500
        primaryHover: '#d97706', // amber-600
        primaryLight: '#fbbf24', // amber-400
        primaryDark: '#b45309', // amber-700
        accent: '#f59e0b',
        shadow: 'rgba(245, 158, 11, 0.1)'
    },
    salon: {
        primary: '#a855f7', // purple-500
        primaryHover: '#9333ea', // purple-600
        primaryLight: '#c084fc', // purple-400
        primaryDark: '#7e22ce', // purple-700
        accent: '#a855f7',
        shadow: 'rgba(168, 85, 247, 0.2)'
    }
};

export const getTheme = (businessType: BusinessType): ThemeColors => {
    return themes[businessType];
};

// CSS Variables helper
export const applyTheme = (businessType: BusinessType) => {
    const theme = getTheme(businessType);
    const root = document.documentElement;

    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-primary-hover', theme.primaryHover);
    root.style.setProperty('--color-primary-light', theme.primaryLight);
    root.style.setProperty('--color-primary-dark', theme.primaryDark);
    root.style.setProperty('--color-accent', theme.accent);
    root.style.setProperty('--color-shadow', theme.shadow);
};
