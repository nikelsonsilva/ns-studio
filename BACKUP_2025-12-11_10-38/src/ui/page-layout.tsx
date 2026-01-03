import React from 'react';

interface PageLayoutProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}

export function PageLayout({ title, description, actions, children }: PageLayoutProps) {
    return (
        <div className="space-y-5 animate-fade-in pb-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-neutral-100">{title}</h1>
                    {description && <p className="text-sm text-neutral-500 mt-0.5">{description}</p>}
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>

            {/* Content */}
            <div className="space-y-4">
                {children}
            </div>
        </div>
    );
}

export default PageLayout;
