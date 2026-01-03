import fs from 'fs';
import path from 'path';

// All component files to update
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

// Comprehensive replacement map: old class → new semantic class
const replacements = [
    // ===== BACKGROUNDS =====
    // App/Page background
    ['bg-barber-950', 'bg-[var(--surface-app)]'],
    // Card/Container background
    ['bg-barber-900', 'bg-[var(--surface-card)]'],
    // Subtle background
    ['bg-barber-800', 'bg-[var(--surface-subtle)]'],
    // Hover background
    ['bg-barber-700', 'bg-[var(--surface-hover)]'],
    // Brand backgrounds
    ['bg-barber-gold', 'bg-[var(--brand-primary)]'],
    ['bg-barber-goldhover', 'bg-[var(--brand-hover)]'],

    // Previous attempts cleanup
    ['bg-\\[var\\(--bg-card\\)\\]', 'bg-[var(--surface-card)]'],
    ['bg-\\[var\\(--bg-muted\\)\\]', 'bg-[var(--surface-subtle)]'],
    ['bg-\\[var\\(--bg-subtle\\)\\]', 'bg-[var(--surface-subtle)]'],
    ['bg-\\[var\\(--bg-hover\\)\\]', 'bg-[var(--hover-background)]'],
    ['bg-\\[var\\(--bg-app\\)\\]', 'bg-[var(--surface-app)]'],

    // ===== BORDERS =====
    ['border-barber-800', 'border-[var(--border-default)]'],
    ['border-barber-700', 'border-[var(--border-strong)]'],
    ['border-barber-gold', 'border-[var(--brand-primary)]'],

    // Previous attempts cleanup
    ['border-\\[var\\(--border\\)\\]', 'border-[var(--border-default)]'],
    ['border-\\[var\\(--border-strong\\)\\]', 'border-[var(--border-strong)]'],

    // ===== DIVIDERS =====
    ['divide-barber-800', 'divide-[var(--border-default)]'],
    ['divide-\\[var\\(--border\\)\\]', 'divide-[var(--border-default)]'],

    // ===== TEXT =====
    ['text-white', 'text-[var(--text-primary)]'],
    ['text-gray-300', 'text-[var(--text-secondary)]'],
    ['text-gray-400', 'text-[var(--text-muted)]'],
    ['text-gray-500', 'text-[var(--text-subtle)]'],
    ['text-gray-600', 'text-[var(--text-placeholder)]'],
    ['text-barber-gold', 'text-[var(--brand-primary)]'],
    ['text-black', 'text-[var(--text-on-brand)]'],

    // Previous attempts cleanup  
    ['text-\\[var\\(--text\\)\\]', 'text-[var(--text-primary)]'],
    ['text-\\[var\\(--text-muted\\)\\]', 'text-[var(--text-muted)]'],
    ['text-\\[var\\(--text-subtle\\)\\]', 'text-[var(--text-subtle)]'],
    ['text-\\[var\\(--brand\\)\\]', 'text-[var(--brand-primary)]'],

    // ===== HOVER STATES =====
    ['hover:bg-barber-800', 'hover:bg-[var(--hover-background)]'],
    ['hover:bg-barber-700', 'hover:bg-[var(--hover-background-strong)]'],
    ['hover:bg-barber-goldhover', 'hover:bg-[var(--brand-hover)]'],
    ['hover:border-barber-700', 'hover:border-[var(--hover-border)]'],
    ['hover:border-barber-gold', 'hover:border-[var(--brand-primary)]'],
    ['hover:text-white', 'hover:text-[var(--hover-text)]'],
    ['hover:text-barber-gold', 'hover:text-[var(--brand-primary)]'],

    // Previous attempts cleanup
    ['hover:bg-\\[var\\(--bg-hover\\)\\]', 'hover:bg-[var(--hover-background)]'],
    ['hover:bg-\\[var\\(--brand-hover\\)\\]', 'hover:bg-[var(--brand-hover)]'],

    // ===== FOCUS STATES =====
    ['focus:border-barber-gold', 'focus:border-[var(--focus-border)]'],
    ['focus:bg-barber-900', 'focus:bg-[var(--focus-background)]'],

    // Previous attempts cleanup
    ['focus:border-\\[var\\(--ring-strong\\)\\]', 'focus:border-[var(--focus-border)]'],
    ['focus:ring-\\[var\\(--ring\\)\\]', 'focus:ring-[var(--focus-ring)]'],

    // ===== PLACEHOLDERS =====
    ['placeholder:text-gray-600', 'placeholder:text-[var(--text-placeholder)]'],
    ['placeholder:text-gray-500', 'placeholder:text-[var(--text-placeholder)]'],

    // ===== SHADOWS =====
    ['shadow-card', 'shadow-[var(--shadow-sm)]'],
    ['shadow-card-lg', 'shadow-[var(--shadow-md)]'],
    ['shadow-card-gold', 'shadow-[var(--shadow-gold)]'],
];

let totalChanges = 0;

files.forEach(file => {
    try {
        let content = fs.readFileSync(file, 'utf8');
        const original = content;
        let fileChanges = 0;

        replacements.forEach(([oldPattern, newValue]) => {
            // Handle regex special characters
            const regex = new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            const matches = content.match(regex);
            if (matches) {
                fileChanges += matches.length;
                content = content.replace(regex, newValue);
            }
        });

        if (content !== original) {
            fs.writeFileSync(file, content);
            console.log(`✓ ${file}: ${fileChanges} changes`);
            totalChanges += fileChanges;
        } else {
            console.log(`- ${file}: no changes needed`);
        }
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.log(`⚠ ${file}: file not found`);
        } else {
            console.log(`✗ ${file}: ${e.message}`);
        }
    }
});

console.log(`\n✅ Total: ${totalChanges} replacements across all files`);
console.log('\nNext steps:');
console.log('1. Restart dev server: npm run dev');
console.log('2. Test dark theme (Barbershop account)');
console.log('3. Test light theme (Salon account)');
