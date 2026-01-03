// src/ui/segmented-control.tsx - Filter Chips with Linear Dark tokens
import React from 'react';

export interface SegmentItem {
    id: string;
    label: string;
    badgeCount?: number;
}

interface SegmentedControlProps {
    items: SegmentItem[];
    value: string;
    onChange: (id: string) => void;
    className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
    items,
    value,
    onChange,
    className = '',
}) => (
    <div className={`inline-flex items-center rounded-full bg-surface border border-border-subtle p-1 gap-0.5 ${className}`}>
        {items.map((item) => {
            const active = item.id === value;
            return (
                <button
                    key={item.id}
                    type="button"
                    onClick={() => onChange(item.id)}
                    className={`
            flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all
            ${active
                            ? 'bg-primary-500 text-background shadow-sm'
                            : 'text-text-muted hover:text-text-soft hover:bg-surface-soft'
                        }
          `}
                >
                    <span>{item.label}</span>
                    {item.badgeCount != null && (
                        <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${active ? 'bg-primary-600 text-background' : 'bg-surface-elevated text-text-faint'}`}>
                            {item.badgeCount}
                        </span>
                    )}
                </button>
            );
        })}
    </div>
);

export default SegmentedControl;
