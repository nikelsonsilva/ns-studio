/**
 * =====================================================
 * SETTINGS CONTEXT
 * =====================================================
 * Contexto React para acessar configurações globalmente
 * =====================================================
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { BusinessSettings, fetchBusinessSettings, updateBusinessSettings, DEFAULT_SETTINGS } from '../lib/settingsService';
import { useBusiness } from '../lib/businessContext';

// =====================================================
// TYPES
// =====================================================

interface SettingsContextType {
    settings: BusinessSettings | null;
    isLoading: boolean;
    error: string | null;

    // Feature checks
    isLoyaltyEnabled: boolean;
    isMarketingEnabled: boolean;
    isRemindersEnabled: boolean;
    isGalleryEnabled: boolean;
    isPaymentsEnabled: boolean;

    // Actions
    updateSettings: (updates: Partial<BusinessSettings>) => Promise<boolean>;
    toggleFeature: (feature: 'loyalty' | 'marketing' | 'reminders' | 'gallery' | 'payments', enabled: boolean) => Promise<boolean>;
    refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// =====================================================
// PROVIDER
// =====================================================

interface SettingsProviderProps {
    children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
    const { business } = useBusiness();
    const businessId = business?.id;
    const [settings, setSettings] = useState<BusinessSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load settings on mount and when businessId changes
    useEffect(() => {
        if (businessId) {
            loadSettings();
        } else {
            setSettings(null);
            setIsLoading(false);
        }
    }, [businessId]);

    const loadSettings = async () => {
        if (!businessId) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await fetchBusinessSettings(businessId);
            setSettings(data);
        } catch (err) {
            console.error('Error loading settings:', err);
            setError('Erro ao carregar configurações');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateSettings = useCallback(async (updates: Partial<BusinessSettings>): Promise<boolean> => {
        if (!businessId) return false;

        const success = await updateBusinessSettings(businessId, updates);
        if (success) {
            setSettings(prev => prev ? { ...prev, ...updates } : null);
        }
        return success;
    }, [businessId]);

    const handleToggleFeature = useCallback(async (
        feature: 'loyalty' | 'marketing' | 'reminders' | 'gallery' | 'payments',
        enabled: boolean
    ): Promise<boolean> => {
        const key = `${feature}_enabled` as keyof BusinessSettings;
        return handleUpdateSettings({ [key]: enabled } as Partial<BusinessSettings>);
    }, [handleUpdateSettings]);

    const refreshSettings = useCallback(async () => {
        await loadSettings();
    }, [businessId]);

    // Feature flags
    const isLoyaltyEnabled = settings?.loyalty_enabled ?? false;
    const isMarketingEnabled = settings?.marketing_enabled ?? false;
    const isRemindersEnabled = settings?.reminders_enabled ?? false;
    const isGalleryEnabled = settings?.gallery_enabled ?? false;
    const isPaymentsEnabled = settings?.payments_enabled ?? true;

    return (
        <SettingsContext.Provider
            value={{
                settings,
                isLoading,
                error,
                isLoyaltyEnabled,
                isMarketingEnabled,
                isRemindersEnabled,
                isGalleryEnabled,
                isPaymentsEnabled,
                updateSettings: handleUpdateSettings,
                toggleFeature: handleToggleFeature,
                refreshSettings,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
};

// =====================================================
// HOOK
// =====================================================

export const useSettings = (): SettingsContextType => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

// Export for conditional use when context might not be available
export const useSettingsOptional = (): SettingsContextType | null => {
    const context = useContext(SettingsContext);
    return context ?? null;
};
