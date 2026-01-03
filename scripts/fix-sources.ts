// Script to update existing appointments with correct source
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateAppointmentSources() {
    console.log('🔄 Updating appointment sources...');

    // Update appointments that were paid via Stripe (came from public link)
    const { data, error } = await supabase
        .from('appointments')
        .update({ source: 'public' })
        .or('source.is.null,source.eq.,source.eq.manual')
        .eq('payment_status', 'paid')
        .select('id, customer_name, source');

    if (error) {
        console.error('❌ Error:', error);
    } else {
        console.log(`✅ Updated ${data?.length || 0} appointments`);
        console.log('Updated:', data);
    }
}

updateAppointmentSources();
