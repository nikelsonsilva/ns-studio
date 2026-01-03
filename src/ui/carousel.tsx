// src/ui/carousel.tsx - Carousel/Slider component
import React from 'react';
import { cn } from '../lib/cn';
import { Icon } from './icon';

export interface CarouselProps {
    children: React.ReactNode;
    className?: string;
    showDots?: boolean;
    showArrows?: boolean;
    autoPlay?: boolean;
    autoPlayInterval?: number;
}

export const Carousel: React.FC<CarouselProps> = ({
    children,
    className,
    showDots = true,
    showArrows = true,
    autoPlay = false,
    autoPlayInterval = 5000,
}) => {
    const slides = React.Children.toArray(children);
    const [current, setCurrent] = React.useState(0);

    React.useEffect(() => {
        if (!autoPlay || slides.length <= 1) return;

        const interval = setInterval(() => {
            setCurrent(prev => (prev + 1) % slides.length);
        }, autoPlayInterval);

        return () => clearInterval(interval);
    }, [autoPlay, autoPlayInterval, slides.length]);

    const goTo = (index: number) => {
        if (!slides.length) return;
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        setCurrent(index);
    };

    if (!slides.length) return null;

    return (
        <div className={cn('relative w-full overflow-hidden rounded-xl bg-barber-900 border border-barber-800', className)}>
            <div
                className="flex transition-transform duration-300 ease-out"
                style={{
                    transform: `translateX(-${current * 100}%)`,
                    width: `${slides.length * 100}%`,
                }}
            >
                {slides.map((slide, idx) => (
                    <div
                        key={idx}
                        className="w-full shrink-0 grow-0"
                        style={{ width: `${100 / slides.length}%` }}
                    >
                        {slide}
                    </div>
                ))}
            </div>

            {showArrows && slides.length > 1 && (
                <>
                    <button
                        type="button"
                        onClick={() => goTo(current - 1)}
                        className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-barber-800 bg-barber-900/90 text-gray-400 shadow-lg hover:border-barber-gold/70 hover:bg-barber-800 hover:text-white transition-all"
                    >
                        <Icon name="chevron-left" size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => goTo(current + 1)}
                        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-barber-800 bg-barber-900/90 text-gray-400 shadow-lg hover:border-barber-gold/70 hover:bg-barber-800 hover:text-white transition-all"
                    >
                        <Icon name="chevron-right" size={18} />
                    </button>
                </>
            )}

            {showDots && slides.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => goTo(idx)}
                            className={cn(
                                'h-2 rounded-full transition-all duration-200',
                                idx === current
                                    ? 'w-6 bg-barber-gold'
                                    : 'w-2 bg-barber-700 hover:bg-barber-600',
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Carousel;
