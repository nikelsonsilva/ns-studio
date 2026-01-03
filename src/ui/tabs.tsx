// src/ui/tabs.tsx - Linear Dark Style Tabs
import React from 'react';

export interface TabItem {
    id: string;
    label: string;
    icon?: React.ReactNode;
}

interface TabsProps {
    items: TabItem[];
    value: string;
    onChange: (id: string) => void;
    size?: 'sm' | 'md';
    className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
    items,
    value,
    onChange,
    size = 'md',
    className = '',
}) => {
    return (
        <div className={`inline-flex items-center rounded-lg bg-surface-elevated border border-border-subtle p-1 gap-1 ${className}`}>
            {items.map((item) => {
                const active = item.id === value;
                return (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onChange(item.id)}
                        className={`
              inline-flex items-center justify-center rounded-md font-medium transition-all whitespace-nowrap
              ${size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-[13px]'}
              ${active
                                ? 'bg-surface-raised text-text-strong shadow-sm border border-border-strong'
                                : 'text-text-muted hover:text-text-soft hover:bg-surface border border-transparent'
                            }
            `}
                    >
                        {item.icon && <span className="mr-1.5">{item.icon}</span>}
                        {item.label}
                    </button>
                );
            })}
        </div>
    );
};

export default Tabs;
