// src/ui/rating.tsx - Star rating component
import React from 'react';
import { cn } from '../lib/cn';
import { Star } from 'lucide-react';

export interface RatingProps {
    value: number; // 0-5
    onChange?: (value: number) => void;
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
    showValue?: boolean;
    className?: string;
}

export const Rating: React.FC<RatingProps> = ({
    value,
    onChange,
    readonly = false,
    size = 'md',
    showValue = false,
    className,
}) => {
    const [hover, setHover] = React.useState<number | null>(null);

    const sizeClasses = {
        sm: 14,
        md: 18,
        lg: 24,
    };

    const displayValue = hover ?? value;

    return (
        <div className={cn('flex items-center gap-1', className)}>
            {[1, 2, 3, 4, 5].map(star => {
                const filled = star <= displayValue;

                return (
                    <button
                        key={star}
                        type="button"
                        disabled={readonly}
                        onClick={() => !readonly && onChange?.(star)}
                        onMouseEnter={() => !readonly && setHover(star)}
                        onMouseLeave={() => !readonly && setHover(null)}
                        className={cn(
                            'transition-all duration-150',
                            !readonly && 'cursor-pointer hover:scale-110',
                            readonly && 'cursor-default',
                        )}
                    >
                        <Star
                            size={sizeClasses[size]}
                            strokeWidth={1.5}
                            className={cn(
                                'transition-colors',
                                filled
                                    ? 'fill-yellow-500 text-yellow-500'
                                    : 'fill-transparent text-barber-700',
                            )}
                        />
                    </button>
                );
            })}
            {showValue && (
                <span className="ml-2 text-[12px] font-medium text-gray-400">
                    {value.toFixed(1)}
                </span>
            )}
        </div>
    );
};

export default Rating;
