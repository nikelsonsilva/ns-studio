// src/ui/table.tsx - Advanced Table Components
import React from 'react';

export const TableRoot: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
    <div className={`w-full overflow-x-auto rounded-xl border border-border-subtle bg-surface-elevated ${className}`}>
        <table className="w-full text-left text-[13px] text-text-soft border-collapse">
            {children}
        </table>
    </div>
);

export const TableHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <thead className="bg-surface border-b border-border-subtle/80">
        {children}
    </thead>
);

export const TableHeadRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <tr className="text-[11px] uppercase tracking-wide text-text-muted">
        {children}
    </tr>
);

export const TableHeadCell: React.FC<{ className?: string; children: React.ReactNode }> = ({
    className = '',
    children,
}) => (
    <th className={`px-4 py-3 font-semibold whitespace-nowrap ${className}`}>
        {children}
    </th>
);

export const TableBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <tbody className="divide-y divide-border-subtle/60">{children}</tbody>
);

export const TableRow: React.FC<{ className?: string; children: React.ReactNode; onClick?: () => void }> = ({
    className = '',
    children,
    onClick,
}) => (
    <tr
        className={`hover:bg-surface/70 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={onClick}
    >
        {children}
    </tr>
);

export const TableCell: React.FC<{ className?: string; children: React.ReactNode }> = ({
    className = '',
    children,
}) => (
    <td className={`px-4 py-3 align-middle ${className}`}>
        {children}
    </td>
);
