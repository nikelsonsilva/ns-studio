import React from 'react';

interface SectionTitleProps {
    children: React.ReactNode;
    className?: string;
}

export function SectionTitle({ children, className = '' }: SectionTitleProps) {
    return (
        <h2 className={`text-neutral-100 text-base font-semibold mb-3 ${className}`}>
            {children}
        </h2>
    );
}

export default SectionTitle;
