/**
 * useSettings Hook
 * Gerencia configurações do negócio
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getCurrentBusinessId } from '@/lib/database';

interface BusinessHours {
    [key: string]: {
        open: string;
        close: string;
        closed: boolean;
    };
}

interface BusinessSettings {
    id: string;
    name: string;
    business_hours: BusinessHours;
    booking_settings: {
        buffer_minutes: number;
        max_days_advance: number;
        allow_same_day: boolean;
    };
    features_enabled: {
        loyalty: boolean;
        marketing: boolean;
        reminders: boolean;
        gallery: boolean;
        payments: boolean;
    };
}

interface UseSettingsResult {
    settings: BusinessSettings | null;
    isLoading: boolean;
    error: string | null;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    refresh: () => Promise<void>;
    updateBusinessInfo: (data: Partial<BusinessSettings>) => Promise<boolean>;
    updateBusinessHours: (hours: BusinessHours) => Promise<boolean>;
    updateBookingSettings: (settings: any) => Promise<boolean>;
    toggleFeature: (feature: string, enabled: boolean) => Promise<boolean>;
}

export function useSettings(): UseSettingsResult {
    const [settings, setSettings] = useState<BusinessSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('geral');

    const loadSettings = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const businessId = await getCurrentBusinessId();

            const { data, error: fetchError } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', businessId)
                .single();

            if (fetchError) throw fetchError;
            setSettings(data);
        } catch (err) {
            setError('Erro ao carregar configurações');
            console.error('[useSettings] Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateBusinessInfo = useCallback(async (data: Partial<BusinessSettings>): Promise<boolean> => {
        try {
            const businessId = await getCurrentBusinessId();

            const { error } = await supabase
                .from('businesses')
                .update(data)
                .eq('id', businessId);

            if (error) throw error;
            await loadSettings();
            return true;
        } catch (err) {
            console.error('[useSettings] Error updating business info:', err);
            return false;
        }
    }, [loadSettings]);

    const updateBusinessHours = useCallback(async (hours: BusinessHours): Promise<boolean> => {
        try {
            const businessId = await getCurrentBusinessId();

            const { error } = await supabase
                .from('businesses')
                .update({ business_hours: hours })
                .eq('id', businessId);

            if (error) throw error;
            await loadSettings();
            return true;
        } catch (err) {
            console.error('[useSettings] Error updating business hours:', err);
            return false;
        }
    }, [loadSettings]);

    const updateBookingSettings = useCallback(async (bookingSettings: any): Promise<boolean> => {
        try {
            const businessId = await getCurrentBusinessId();

            // Merge with existing settings
            const currentSettings = settings?.booking_settings || {};
            const mergedSettings = { ...currentSettings, ...bookingSettings };

            const { error } = await supabase
                .from('businesses')
                .update({ booking_settings: mergedSettings })
                .eq('id', businessId);

            if (error) throw error;
            await loadSettings();
            return true;
        } catch (err) {
            console.error('[useSettings] Error updating booking settings:', err);
            return false;
        }
    }, [loadSettings, settings]);

    const toggleFeature = useCallback(async (feature: string, enabled: boolean): Promise<boolean> => {
        try {
            const businessId = await getCurrentBusinessId();

            const currentFeatures = settings?.features_enabled || {};
            const updatedFeatures = { ...currentFeatures, [feature]: enabled };

            const { error } = await supabase
                .from('businesses')
                .update({ features_enabled: updatedFeatures })
                .eq('id', businessId);

            if (error) throw error;
            await loadSettings();
            return true;
        } catch (err) {
            console.error('[useSettings] Error toggling feature:', err);
            return false;
        }
    }, [loadSettings, settings]);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    return {
        settings,
        isLoading,
        error,
        activeTab,
        setActiveTab,
        refresh: loadSettings,
        updateBusinessInfo,
        updateBusinessHours,
        updateBookingSettings,
        toggleFeature
    };
}
