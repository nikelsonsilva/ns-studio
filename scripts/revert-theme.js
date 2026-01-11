import fs from 'fs';

// All component files
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
    'components/AvailableNowBar.tsx',
    'components/ServiceModal.tsx',
    'components/ProfessionalModal.tsx',
    'components/PublicBooking.tsx',
    'components/BookingSuccess.tsx',
    'components/Toast.tsx',
    'components/ui/Modal.tsx',
    'components/ui/Toast.tsx',
    'components/ui/Textarea.tsx',
    'components/ui/Select.tsx',
    'components/ui/Checkbox.tsx',
    'components/ui/Switch.tsx',
    'components/Sidebar.tsx',
    'App.tsx'
];

// Revert CSS variables back to original Tailwind classes
const reversions = [
    // Surfaces
    ['bg-[var(--surface-app)]', 'bg-barber-950'],
    ['bg-[var(--surface-card)]', 'bg-barber-900'],
    ['bg-[var(--surface-subtle)]', 'bg-barber-800'],
    ['bg-[var(--surface-hover)]', 'bg-barber-700'],
    ['bg-[var(--hover-background)]', 'bg-barber-800'],
    ['bg-[var(--hover-background-strong)]', 'bg-barber-700'],
    ['bg-[var(--focus-background)]', 'bg-barber-900'],
    ['bg-[var(--brand-primary)]', 'bg-barber-gold'],
    ['bg-[var(--brand-hover)]', 'bg-barber-goldhover'],
    ['bg-[var(--bg-card)]', 'bg-barber-900'],
    ['bg-[var(--bg-muted)]', 'bg-barber-950'],
    ['bg-[var(--bg-subtle)]', 'bg-barber-800'],
    ['bg-[var(--bg-hover)]', 'bg-barber-800'],
    ['bg-[var(--bg-app)]', 'bg-barber-950'],

    // Borders
    ['border-[var(--border-default)]', 'border-barber-800'],
    ['border-[var(--border-strong)]', 'border-barber-700'],
    ['border-[var(--border)]', 'border-barber-800'],
    ['border-[var(--brand-primary)]', 'border-barber-gold'],
    ['border-[var(--focus-border)]', 'border-barber-gold'],
    ['border-[var(--ring-strong)]', 'border-barber-gold'],

    // Dividers
    ['divide-[var(--border-default)]', 'divide-barber-800'],
    ['divide-[var(--border)]', 'divide-barber-800'],

    // Text
    ['text-[var(--text-primary)]', 'text-white'],
    ['text-[var(--text-secondary)]', 'text-gray-300'],
    ['text-[var(--text-muted)]', 'text-gray-400'],
    ['text-[var(--text-subtle)]', 'text-gray-500'],
    ['text-[var(--text-placeholder)]', 'text-gray-600'],
    ['text-[var(--text)]', 'text-white'],
    ['text-[var(--brand-primary)]', 'text-barber-gold'],
    ['text-[var(--brand)]', 'text-barber-gold'],
    ['text-[var(--text-on-brand)]', 'text-black'],

    // Hover states
    ['hover:bg-[var(--hover-background)]', 'hover:bg-barber-800'],
    ['hover:bg-[var(--hover-background-strong)]', 'hover:bg-barber-700'],
    ['hover:bg-[var(--brand-hover)]', 'hover:bg-barber-goldhover'],
    ['hover:bg-[var(--bg-hover)]', 'hover:bg-barber-800'],
    ['hover:border-[var(--border-strong)]', 'hover:border-barber-700'],
    ['hover:border-[var(--hover-border)]', 'hover:border-barber-700'],
    ['hover:border-[var(--brand-primary)]', 'hover:border-barber-gold'],
    ['hover:text-[var(--text-primary)]', 'hover:text-white'],
    ['hover:text-[var(--hover-text)]', 'hover:text-white'],
    ['hover:text-[var(--brand-primary)]', 'hover:text-barber-gold'],

    // Focus states
    ['focus:border-[var(--focus-border)]', 'focus:border-barber-gold'],
    ['focus:bg-[var(--focus-background)]', 'focus:bg-barber-900'],
    ['focus:ring-[var(--focus-ring)]', 'focus:ring-barber-gold/30'],
    ['focus:ring-[var(--ring)]', 'focus:ring-barber-gold/30'],

    // Placeholders
    ['placeholder:text-[var(--text-placeholder)]', 'placeholder:text-gray-600'],

    // Shadows
    ['shadow-[var(--shadow-sm)]', 'shadow-card'],
    ['shadow-[var(--shadow-md)]', 'shadow-card-lg'],
    ['shadow-[var(--shadow-gold)]', 'shadow-card-gold'],
];

let totalChanges = 0;

files.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        const original = content;
        let changes = 0;

        reversions.forEach(([cssVar, tailwind]) => {
            if (content.includes(cssVar)) {
                const count = (content.match(new RegExp(cssVar.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
                changes += count;
                content = content.split(cssVar).join(tailwind);
            }
        });

        if (content !== original) {
            fs.writeFileSync(file, content);
            console.log(`✓ ${file}: ${changes} reverted`);
            totalChanges += changes;
        } else {
            console.log(`- ${file}: no changes`);
        }
    } catch (e) {
        console.log(`⚠ ${file}: ${e.message}`);
    }
});

console.log(`\n✅ Done! ${totalChanges} total reversions`);
console.log('\nDark theme restored to original Tailwind classes.');
