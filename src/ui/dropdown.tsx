// src/ui/dropdown.tsx - Dropdown Menu
import React, { useState, useRef, useEffect } from 'react';

export interface DropdownItem {
    id: string;
    label: string;
    iconLeft?: React.ReactNode;
    onClick?: () => void;
}

interface DropdownProps {
    trigger: React.ReactNode;
    items: DropdownItem[];
    align?: 'left' | 'right';
}

export const Dropdown: React.FC<DropdownProps> = ({
    trigger,
    items,
    align = 'right',
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (!ref.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div className="relative inline-flex" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex items-center justify-center"
            >
                {trigger}
            </button>
            {open && (
                <div
                    className={`
            absolute z-50 mt-2 min-w-[180px] rounded-lg border border-border-subtle 
            bg-surface-raised shadow-xl py-1 animate-fade-in
            ${align === 'right' ? 'right-0' : 'left-0'}
          `}
                >
                    {items.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                                item.onClick?.();
                                setOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-text-soft hover:bg-surface/80 hover:text-text-strong transition-colors"
                        >
                            {item.iconLeft && <span className="text-text-muted">{item.iconLeft}</span>}
                            <span className="truncate">{item.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dropdown;
