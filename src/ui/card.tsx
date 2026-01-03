// src/ui/card.tsx - Premium Card com profundidade Linear/NS Studio
import React from 'react';

type CardVariant = 'solid' | 'subtle' | 'ghost';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
}

export const Card: React.FC<CardProps> = ({
    className = '',
    variant = 'solid',
    ...props
}) => {
    const variants: Record<CardVariant, string> = {
        solid:
            // cards principais (clientes, fidelidade, etc)
            'bg-surface-raised/95 shadow-card hover:shadow-card-hover hover:-translate-y-0.5',
        subtle:
            // seções grandes (Base de clientes, banner topo)
            'bg-surface/95 shadow-[0_14px_40px_rgba(0,0,0,0.7)]',
        ghost: 'bg-transparent border-transparent shadow-none',
    };

    return (
        <div
            className={`
        rounded-2xl transition-all duration-200
        border border-border-subtle/70
        ${variants[variant]}
        ${className}
      `}
            {...props}
        />
    );
};

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title?: string;
    subtitle?: string;
    iconLeft?: React.ReactNode;
    action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
    className = '',
    title,
    subtitle,
    iconLeft,
    action,
    children,
    ...props
}) => (
    <div
        className={`flex items-center justify-between gap-3 px-5 pt-3 pb-2 border-b border-border-subtle/60 ${className}`}
        {...props}
    >
        <div className="flex items-center gap-3">
            {iconLeft && (
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary-500/16 text-primary-400">
                    {iconLeft}
                </div>
            )}
            <div>
                {title && (
                    <h3 className="text-[14px] font-semibold text-text-soft">
                        {title}
                    </h3>
                )}
                {subtitle && (
                    <p className="text-[11px] text-text-muted">{subtitle}</p>
                )}
            </div>
            {children}
        </div>
        {action && <div className="text-[11px]">{action}</div>}
    </div>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className = '',
    ...props
}) => (
    <div
        className={`px-5 pb-4 pt-3 text-[13px] ${className}`}
        {...props}
    />
);

export default Card;
