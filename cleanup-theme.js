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
    'App.tsx'
];

// Simple string replacements - order matters!
const replacements = [
    // Clean up previous partial migrations
    ['bg-[var(--bg-card)]', 'bg-[var(--surface-card)]'],
    ['bg-[var(--bg-muted)]', 'bg-[var(--surface-subtle)]'],
    ['bg-[var(--bg-subtle)]', 'bg-[var(--surface-subtle)]'],
    ['bg-[var(--bg-hover)]', 'bg-[var(--hover-background)]'],
    ['bg-[var(--bg-app)]', 'bg-[var(--surface-app)]'],
    ['border-[var(--border)]', 'border-[var(--border-default)]'],
    ['text-[var(--text)]', 'text-[var(--text-primary)]'],
    ['text-[var(--brand)]', 'text-[var(--brand-primary)]'],
    ['hover:bg-[var(--brand-hover)]', 'hover:bg-[var(--brand-hover)]'],
    ['focus:border-[var(--ring-strong)]', 'focus:border-[var(--focus-border)]'],
    ['focus:ring-[var(--ring)]', 'focus:ring-[var(--focus-ring)]'],
    ['divide-[var(--border)]', 'divide-[var(--border-default)]'],

    // Barber classes that may remain
    ['bg-barber-950', 'bg-[var(--surface-app)]'],
    ['bg-barber-900', 'bg-[var(--surface-card)]'],
    ['bg-barber-800', 'bg-[var(--surface-subtle)]'],
    ['bg-barber-700', 'bg-[var(--hover-background-strong)]'],
    ['border-barber-800', 'border-[var(--border-default)]'],
    ['border-barber-700', 'border-[var(--border-strong)]'],
    ['border-barber-gold', 'border-[var(--brand-primary)]'],
    ['divide-barber-800', 'divide-[var(--border-default)]'],
    ['text-barber-gold', 'text-[var(--brand-primary)]'],
    ['bg-barber-gold', 'bg-[var(--brand-primary)]'],
    ['hover:bg-barber-goldhover', 'hover:bg-[var(--brand-hover)]'],
    ['hover:bg-barber-800', 'hover:bg-[var(--hover-background)]'],
    ['hover:bg-barber-700', 'hover:bg-[var(--hover-background-strong)]'],
    ['hover:border-barber-700', 'hover:border-[var(--border-strong)]'],
    ['hover:border-barber-gold', 'hover:border-[var(--brand-primary)]'],
    ['focus:border-barber-gold', 'focus:border-[var(--focus-border)]'],
    ['focus:bg-barber-900', 'focus:bg-[var(--focus-background)]'],
    ['hover:text-barber-gold', 'hover:text-[var(--brand-primary)]'],
    ['placeholder:text-gray-600', 'placeholder:text-[var(--text-placeholder)]'],

    // Text colors
    ['text-white', 'text-[var(--text-primary)]'],
    ['text-gray-300', 'text-[var(--text-secondary)]'],
    ['text-gray-400', 'text-[var(--text-muted)]'],
    ['text-gray-500', 'text-[var(--text-subtle)]'],
    ['text-gray-600', 'text-[var(--text-placeholder)]'],
    ['hover:text-white', 'hover:text-[var(--text-primary)]'],

    // Remove dark: prefixes since we use CSS vars now
    ['dark:bg-[var(--surface-card)]', 'bg-[var(--surface-card)]'],
    ['dark:bg-[var(--surface-subtle)]', ''],
    ['dark:bg-barber-900', ''],
    ['dark:bg-barber-950', ''],
    ['dark:bg-barber-800', ''],
    ['dark:border-barber-800', ''],
    ['dark:text-white', ''],
    ['dark:text-[var(--text-primary)]', ''],
    ['dark:text-[var(--text-muted)]', ''],
    ['dark:hover:text-[var(--text-primary)]', ''],
    ['dark:hover:bg-barber-800', ''],
    ['  ', ' '], // Clean double spaces
];

let totalChanges = 0;

files.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        const original = content;
        let changes = 0;

        replacements.forEach(([old, newVal]) => {
            if (content.includes(old)) {
                const count = (content.match(new RegExp(old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
                changes += count;
                content = content.split(old).join(newVal);
            }
        });

        // Clean up empty class parts
        content = content.replace(/className="([^"]*)\s{2,}([^"]*)"/g, 'className="$1 $2"');
        content = content.replace(/className="\s+/g, 'className="');
        content = content.replace(/\s+"/g, '"');

        if (content !== original) {
            fs.writeFileSync(file, content);
            console.log(`✓ ${file}: ${changes} changes`);
            totalChanges += changes;
        } else {
            console.log(`- ${file}: no changes`);
        }
    } catch (e) {
        console.log(`⚠ ${file}: ${e.message}`);
    }
});

console.log(`\n✅ Done! ${totalChanges} total changes`);
