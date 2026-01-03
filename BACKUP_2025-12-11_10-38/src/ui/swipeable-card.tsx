// src/ui/swipeable-card.tsx - Card with swipe-to-reveal actions
import React, { useState, useRef } from 'react';
import { cn } from '../lib/cn';
import { Icon, IconName } from './icon';

export interface SwipeAction {
    iconName: IconName;
    label: string;
    color: 'danger' | 'success' | 'warning' | 'info';
    onClick: () => void;
}

export interface SwipeableCardProps {
    children: React.ReactNode;
    leftActions?: SwipeAction[];
    rightActions?: SwipeAction[];
    className?: string;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
    children,
    leftActions = [],
    rightActions = [],
    className,
}) => {
    const [offsetX, setOffsetX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startX = useRef(0);
    const cardRef = useRef<HTMLDivElement>(null);

    const actionWidth = 72;
    const maxLeftOffset = leftActions.length * actionWidth;
    const maxRightOffset = rightActions.length * actionWidth;

    const colorClasses = {
        danger: 'bg-red-500/90 text-white',
        success: 'bg-green-500/90 text-white',
        warning: 'bg-yellow-500/90 text-black',
        info: 'bg-blue-500/90 text-white',
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        startX.current = e.touches[0].clientX - offsetX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const x = e.touches[0].clientX - startX.current;
        const clampedX = Math.max(-maxRightOffset, Math.min(maxLeftOffset, x));
        setOffsetX(clampedX);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        // Snap to nearest position
        if (offsetX > maxLeftOffset / 2) {
            setOffsetX(maxLeftOffset);
        } else if (offsetX < -maxRightOffset / 2) {
            setOffsetX(-maxRightOffset);
        } else {
            setOffsetX(0);
        }
    };

    const handleActionClick = (action: SwipeAction) => {
        setOffsetX(0);
        action.onClick();
    };

    return (
        <div className={cn('relative overflow-hidden rounded-xl', className)}>
            {/* Left Actions */}
            {leftActions.length > 0 && (
                <div className="absolute left-0 top-0 bottom-0 flex">
                    {leftActions.map((action, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleActionClick(action)}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1',
                                colorClasses[action.color],
                            )}
                            style={{ width: actionWidth }}
                        >
                            <Icon name={action.iconName} size={20} />
                            <span className="text-[10px] font-medium">{action.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Right Actions */}
            {rightActions.length > 0 && (
                <div className="absolute right-0 top-0 bottom-0 flex">
                    {rightActions.map((action, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleActionClick(action)}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1',
                                colorClasses[action.color],
                            )}
                            style={{ width: actionWidth }}
                        >
                            <Icon name={action.iconName} size={20} />
                            <span className="text-[10px] font-medium">{action.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Card Content */}
            <div
                ref={cardRef}
                className={cn(
                    'relative bg-barber-900 border border-barber-800 rounded-xl',
                    isDragging ? '' : 'transition-transform duration-200',
                )}
                style={{ transform: `translateX(${offsetX}px)` }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </div>
    );
};

export default SwipeableCard;
