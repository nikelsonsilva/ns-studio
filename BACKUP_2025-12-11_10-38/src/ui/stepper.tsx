// src/ui/stepper.tsx - Wizard/Multi-step component
import React from 'react';
import { cn } from '../lib/cn';
import { Icon } from './icon';

export interface StepItem {
    id: string;
    label: string;
    description?: string;
}

export interface StepperProps {
    steps: StepItem[];
    activeId: string;
    onChange?: (id: string) => void;
    orientation?: 'horizontal' | 'vertical';
    className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
    steps,
    activeId,
    onChange,
    orientation = 'horizontal',
    className,
}) => {
    const activeIndex = steps.findIndex(s => s.id === activeId);

    if (orientation === 'vertical') {
        return (
            <div className={cn('space-y-2', className)}>
                {steps.map((step, index) => {
                    const isActive = step.id === activeId;
                    const isCompleted = activeIndex > index;

                    return (
                        <div key={step.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                                <button
                                    type="button"
                                    onClick={() => onChange?.(step.id)}
                                    className={cn(
                                        'flex h-8 w-8 items-center justify-center rounded-full border-2 text-[12px] font-semibold transition-all',
                                        isCompleted
                                            ? 'border-green-500 bg-green-500 text-black'
                                            : isActive
                                                ? 'border-barber-gold bg-barber-gold text-black'
                                                : 'border-barber-800 bg-barber-900 text-gray-500 hover:border-barber-gold/60',
                                    )}
                                >
                                    {isCompleted ? (
                                        <Icon name="check" size={14} />
                                    ) : (
                                        index + 1
                                    )}
                                </button>
                                {index < steps.length - 1 && (
                                    <div
                                        className={cn(
                                            'w-0.5 flex-1 my-1',
                                            isCompleted ? 'bg-green-500' : 'bg-barber-800',
                                        )}
                                        style={{ minHeight: '24px' }}
                                    />
                                )}
                            </div>
                            <div className="pt-1 pb-4">
                                <h4 className={cn(
                                    'text-[13px] font-medium',
                                    isActive ? 'text-white' : isCompleted ? 'text-gray-400' : 'text-gray-600',
                                )}>
                                    {step.label}
                                </h4>
                                {step.description && (
                                    <p className="text-[11px] text-gray-600 mt-0.5">{step.description}</p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div className={cn('flex items-center gap-2 rounded-xl border border-barber-800 bg-barber-900 px-3 py-2', className)}>
            {steps.map((step, index) => {
                const isActive = step.id === activeId;
                const isCompleted = activeIndex > index;

                return (
                    <React.Fragment key={step.id}>
                        <button
                            type="button"
                            onClick={() => onChange?.(step.id)}
                            className={cn(
                                'flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] transition-all',
                                isActive
                                    ? 'bg-barber-gold/15 text-barber-gold'
                                    : 'text-gray-500 hover:bg-barber-800',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold',
                                    isCompleted
                                        ? 'border-green-500 bg-green-500 text-black'
                                        : isActive
                                            ? 'border-barber-gold bg-barber-gold text-black'
                                            : 'border-barber-700',
                                )}
                            >
                                {isCompleted ? (
                                    <Icon name="check" size={10} />
                                ) : (
                                    index + 1
                                )}
                            </span>
                            <span className="font-medium whitespace-nowrap">{step.label}</span>
                        </button>
                        {index < steps.length - 1 && (
                            <span className="h-px flex-1 bg-barber-800 hidden sm:block" />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default Stepper;
