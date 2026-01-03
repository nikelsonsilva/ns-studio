// src/ui/timeline.tsx - Timeline/status tracking component
import React from 'react';
import { cn } from '../lib/cn';
import { Icon, IconName } from './icon';

export interface TimelineItem {
    id: string;
    title: string;
    description?: string;
    timestamp?: string;
    iconName?: IconName;
    status?: 'completed' | 'active' | 'pending';
}

export interface TimelineProps {
    items: TimelineItem[];
    className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({
    items,
    className,
}) => {
    return (
        <div className={cn('space-y-3', className)}>
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                const status = item.status ?? 'pending';

                const statusClasses = {
                    completed: 'border-green-500 bg-green-500 text-black',
                    active: 'border-barber-gold bg-barber-gold text-black animate-pulse',
                    pending: 'border-barber-800 bg-barber-900 text-gray-600',
                };

                const lineClasses = {
                    completed: 'bg-green-500/50',
                    active: 'bg-barber-gold/50',
                    pending: 'bg-barber-800',
                };

                return (
                    <div key={item.id} className="relative flex gap-3">
                        <div className="flex flex-col items-center">
                            <div
                                className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                                    statusClasses[status],
                                )}
                            >
                                {item.iconName ? (
                                    <Icon name={item.iconName} size={14} />
                                ) : status === 'completed' ? (
                                    <Icon name="check" size={14} />
                                ) : (
                                    <span className="text-[11px] font-bold">
                                        {index + 1}
                                    </span>
                                )}
                            </div>
                            {!isLast && (
                                <div
                                    className={cn('w-0.5 flex-1 mt-1', lineClasses[status])}
                                    style={{ minHeight: '20px' }}
                                />
                            )}
                        </div>

                        <div className="flex-1 pb-3">
                            <div className="flex items-start justify-between gap-2">
                                <h4
                                    className={cn(
                                        'text-[13px] font-medium',
                                        status === 'pending' ? 'text-gray-600' : 'text-white',
                                    )}
                                >
                                    {item.title}
                                </h4>
                                {item.timestamp && (
                                    <span className="text-[10px] text-gray-600 whitespace-nowrap">
                                        {item.timestamp}
                                    </span>
                                )}
                            </div>
                            {item.description && (
                                <p className="mt-0.5 text-[11px] text-gray-500">
                                    {item.description}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default Timeline;
