import fs from 'fs';

const files = [
    'components/Dashboard.tsx',
    'components/Services.tsx',
    'components/Clients.tsx',
    'components/Team.tsx',
    'components/Finance.tsx',
    'components/Calendar.tsx',
    'components/Agenda.tsx',
    'components/Settings.tsx',
    'components/ManualBookingModal.tsx',
    'components/QuickBookingModal.tsx',
    'components/ClientDetailsModal.tsx',
    'components/AvailableNowBar.tsx'
];

const replacements = [
    // Backgrounds
    [/bg-white dark:bg-barber-900/g, 'bg-[var(--bg-card)]'],
    [/bg-gray-50 dark:bg-barber-950/g, 'bg-[var(--bg-muted)]'],
    [/bg-gray-100 dark:bg-barber-950/g, 'bg-[var(--bg-muted)]'],
    [/bg-gray-200 dark:bg-barber-800/g, 'bg-[var(--bg-subtle)]'],
    [/bg-barber-900(?!\/)/g, 'bg-[var(--bg-card)]'],
    [/bg-barber-950(?!\/)/g, 'bg-[var(--bg-muted)]'],
    [/bg-barber-800(?!\/)/g, 'bg-[var(--bg-subtle)]'],

    // Borders
    [/border-gray-200 dark:border-barber-800/g, 'border-[var(--border)]'],
    [/border-barber-800(?!\/)/g, 'border-[var(--border)]'],
    [/border-barber-700/g, 'border-[var(--border-strong)]'],
    [/divide-gray-200 dark:divide-barber-800/g, 'divide-[var(--border)]'],
    [/divide-barber-800/g, 'divide-[var(--border)]'],

    // Brand colors
    [/text-indigo-600 dark:text-amber-500/g, 'text-[var(--brand)]'],
    [/text-barber-gold/g, 'text-[var(--brand)]'],
    [/bg-indigo-600 dark:bg-amber-500/g, 'bg-[var(--brand)]'],
    [/bg-barber-gold/g, 'bg-[var(--brand)]'],
    [/hover:bg-indigo-700 dark:hover:bg-amber-600/g, 'hover:bg-[var(--brand-hover)]'],
    [/hover:bg-barber-goldhover/g, 'hover:bg-[var(--brand-hover)]'],

    // Text colors
    [/text-gray-900 dark:text-white/g, 'text-[var(--text)]'],
    [/text-gray-500 dark:text-gray-400/g, 'text-[var(--text-muted)]'],

    // Hover backgrounds
    [/hover:bg-gray-100 dark:hover:bg-barber-800/g, 'hover:bg-[var(--bg-hover)]'],
    [/hover:bg-gray-50 dark:hover:bg-barber-800/g, 'hover:bg-[var(--bg-hover)]'],
    [/hover:bg-barber-800/g, 'hover:bg-[var(--bg-hover)]'],

    // Focus
    [/focus:border-indigo-500 dark:focus:border-amber-500/g, 'focus:border-[var(--ring-strong)]'],
    [/focus:border-barber-gold/g, 'focus:border-[var(--ring-strong)]'],
];

files.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        const original = content;

        replacements.forEach(([pattern, replacement]) => {
            content = content.replace(pattern, replacement);
        });

        if (content !== original) {
            fs.writeFileSync(file, content);
            console.log('Updated:', file);
        } else {
            console.log('No changes:', file);
        }
    } catch (e) {
        console.log('Error:', file, e.message);
    }
});

console.log('Done!');
