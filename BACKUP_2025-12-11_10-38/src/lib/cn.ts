// src/lib/cn.ts - Utility for merging classNames
// Similar to clsx/tailwind-merge but simpler

export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}

export default cn;
