import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

async function list() {
    console.log("Fetching Practice Tracks...");
    const { data, error } = await supabase.storage.from('practice_tracks').list();
    if (error) console.error("Error:", error);
    if (data) {
        console.log("Bucket folders/files (root):", data.map(d => d.name));
    }
}
list();
