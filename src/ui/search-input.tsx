// src/ui/search-input.tsx - Search input with debounce
import React from 'react';
import { cn } from '../lib/cn';
import { Icon } from './icon';

export interface SearchInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    value: string;
    onChange: (value: string) => void;
    onSearch?: (value: string) => void;
    debounceMs?: number;
    loading?: boolean;
    onClear?: () => void;
    size?: 'sm' | 'md' | 'lg';
}

export const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChange,
    onSearch,
    debounceMs = 300,
    loading = false,
    onClear,
    placeholder = 'Buscar...',
    className,
    size = 'md',
    ...props
}) => {
    const timeoutRef = React.useRef<NodeJS.Timeout>();

    React.useEffect(() => {
        if (!onSearch) return;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            onSearch(value);
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [value, onSearch, debounceMs]);

    const handleClear = () => {
        onChange('');
        onClear?.();
    };

    const sizeClasses = {
        sm: 'h-8 text-[12px] pl-8 pr-8',
        md: 'h-10 text-[13px] pl-10 pr-10',
        lg: 'h-12 text-[14px] pl-12 pr-12',
    };

    const iconSizes = { sm: 14, md: 16, lg: 18 };

    return (
        <div className={cn('relative', className)}>
            <Icon
                name="search"
                size={iconSizes[size]}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    'w-full rounded-lg border border-barber-800 bg-barber-900 text-white placeholder:text-gray-600',
                    'focus:border-barber-gold/70 focus:outline-none focus:ring-2 focus:ring-barber-gold/20',
                    'transition-colors duration-150',
                    sizeClasses[size],
                )}
                {...props}
            />
            {(loading || value) && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {loading ? (
                        <Icon name="loader" size={iconSizes[size]} className="animate-spin text-barber-gold" />
                    ) : (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-barber-800 text-gray-500 hover:bg-barber-700 hover:text-white transition-colors"
                        >
                            <Icon name="x" size={12} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchInput;
