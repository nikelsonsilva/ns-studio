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
];

files.forEach(file => {
    try {
        let c = fs.readFileSync(file, 'utf8');
        // Fix text-white to use CSS variable
        c = c.replace(/text-white(?=["' ])/g, 'text-[var(--text)]');
        // Fix text-gray-400 to use CSS variable
        c = c.replace(/text-gray-400(?=["' ])/g, 'text-[var(--text-muted)]');
        // Fix text-gray-500 to use CSS variable
        c = c.replace(/text-gray-500(?=["' ])/g, 'text-[var(--text-subtle)]');
        fs.writeFileSync(file, c);
        console.log('Fixed:', file);
    } catch (e) {
        console.log('Error:', file, e.message);
    }
});

console.log('Done!');
