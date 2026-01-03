// src/ui/pagination.tsx - Pagination component
import React from 'react';
import { cn } from '../lib/cn';
import { Icon } from './icon';

export interface PaginationProps {
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    showPageNumbers?: boolean;
    className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
    page,
    pageCount,
    onPageChange,
    showPageNumbers = true,
    className,
}) => {
    if (pageCount <= 1) return null;

    const go = (p: number) => {
        if (p < 1 || p > pageCount) return;
        onPageChange(p);
    };

    // Generate page numbers with ellipsis
    const getPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        const showEllipsis = pageCount > 7;

        if (!showEllipsis) {
            return Array.from({ length: pageCount }, (_, i) => i + 1);
        }

        pages.push(1);

        if (page > 3) {
            pages.push('ellipsis');
        }

        for (let i = Math.max(2, page - 1); i <= Math.min(pageCount - 1, page + 1); i++) {
            if (!pages.includes(i)) pages.push(i);
        }

        if (page < pageCount - 2) {
            pages.push('ellipsis');
        }

        if (!pages.includes(pageCount)) {
            pages.push(pageCount);
        }

        return pages;
    };

    return (
        <div className={cn('flex items-center justify-between gap-3 text-[12px] text-gray-500', className)}>
            <span>
                Página {page} de {pageCount}
            </span>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => go(page - 1)}
                    className={cn(
                        'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-barber-800 bg-barber-900 text-gray-400',
                        'hover:border-barber-gold/70 hover:bg-barber-800 hover:text-white',
                        'disabled:opacity-40 disabled:cursor-not-allowed',
                        'transition-colors duration-150',
                    )}
                    disabled={page === 1}
                >
                    <Icon name="chevron-left" size={16} />
                </button>

                {showPageNumbers && getPageNumbers().map((p, idx) => (
                    p === 'ellipsis' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-600">...</span>
                    ) : (
                        <button
                            key={p}
                            type="button"
                            onClick={() => go(p)}
                            className={cn(
                                'min-w-[2rem] rounded-lg px-2 py-1.5 text-center border text-[12px] font-medium',
                                'transition-colors duration-150',
                                p === page
                                    ? 'border-barber-gold bg-barber-gold text-black'
                                    : 'border-barber-800 bg-barber-900 text-gray-400 hover:border-barber-gold/70 hover:bg-barber-800 hover:text-white',
                            )}
                        >
                            {p}
                        </button>
                    )
                ))}

                <button
                    type="button"
                    onClick={() => go(page + 1)}
                    className={cn(
                        'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-barber-800 bg-barber-900 text-gray-400',
                        'hover:border-barber-gold/70 hover:bg-barber-800 hover:text-white',
                        'disabled:opacity-40 disabled:cursor-not-allowed',
                        'transition-colors duration-150',
                    )}
                    disabled={page === pageCount}
                >
                    <Icon name="chevron-right" size={16} />
                </button>
            </div>
        </div>
    );
};

export default Pagination;
