// src/ui/location-picker.tsx - Location input/picker component
import React, { useState } from 'react';
import { cn } from '../lib/cn';
import { Icon } from './icon';

export interface LocationPickerProps {
    value?: string;
    onChange?: (value: string) => void;
    onUseCurrentLocation?: () => void;
    placeholder?: string;
    isLoading?: boolean;
    suggestions?: string[];
    onSelectSuggestion?: (suggestion: string) => void;
    className?: string;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
    value = '',
    onChange,
    onUseCurrentLocation,
    placeholder = 'Digite o endereço',
    isLoading = false,
    suggestions = [],
    onSelectSuggestion,
    className,
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const showSuggestions = isFocused && suggestions.length > 0;

    return (
        <div className={cn('relative', className)}>
            {/* Input */}
            <div className="relative">
                <Icon
                    name="map-pin"
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    placeholder={placeholder}
                    className={cn(
                        'w-full h-12 rounded-xl border bg-barber-900 pl-11 pr-12 text-[14px] text-white',
                        'placeholder:text-gray-600 focus:outline-none focus:ring-1',
                        'border-barber-800 focus:border-barber-gold focus:ring-barber-gold/50',
                        'transition-colors',
                    )}
                />
                {isLoading ? (
                    <Icon
                        name="loader"
                        size={18}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 animate-spin"
                    />
                ) : value && (
                    <button
                        type="button"
                        onClick={() => onChange?.('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                        <Icon name="x" size={16} />
                    </button>
                )}
            </div>

            {/* Use Current Location Button */}
            {onUseCurrentLocation && (
                <button
                    type="button"
                    onClick={onUseCurrentLocation}
                    className="mt-2 flex items-center gap-2 text-[13px] text-barber-gold hover:underline transition-all"
                >
                    <Icon name="navigation" size={14} />
                    Usar minha localização atual
                </button>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-barber-800 bg-barber-900 shadow-xl overflow-hidden">
                    {suggestions.map((suggestion, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onSelectSuggestion?.(suggestion)}
                            className={cn(
                                'w-full flex items-center gap-3 px-4 py-3 text-left',
                                'hover:bg-barber-800 transition-colors',
                                i !== suggestions.length - 1 && 'border-b border-barber-800',
                            )}
                        >
                            <Icon name="map-pin" size={16} className="shrink-0 text-gray-500" />
                            <span className="text-[13px] text-white truncate">
                                {suggestion}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LocationPicker;
