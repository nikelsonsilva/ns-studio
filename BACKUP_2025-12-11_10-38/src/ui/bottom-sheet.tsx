// src/ui/bottom-sheet.tsx - Modal bottom sheet component
import React, { useEffect } from 'react';
import { cn } from '../lib/cn';
import { Icon } from './icon';

export interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    showHandle?: boolean;
    className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
    isOpen,
    onClose,
    title,
    children,
    showHandle = true,
    className,
}) => {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                className={cn(
                    'absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl bg-barber-900 border-t border-barber-800',
                    'animate-slide-up',
                    className,
                )}
            >
                {/* Handle */}
                {showHandle && (
                    <div className="flex justify-center pt-3 pb-1">
                        <div className="h-1 w-10 rounded-full bg-barber-700" />
                    </div>
                )}

                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-5 py-3 border-b border-barber-800">
                        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-barber-800 transition-colors"
                        >
                            <Icon name="x" size={18} className="text-gray-400" />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="overflow-y-auto p-5" style={{ maxHeight: 'calc(85vh - 80px)' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default BottomSheet;
