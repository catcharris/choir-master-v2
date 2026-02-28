import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

async function listFolder() {
    console.log("Fetching Practice Tracks / MTIzNA_scores...");
    const { data: files } = await supabase.storage.from('practice_tracks').list('MTIzNA_scores');
    if (files) {
        for (const file of files) {
            console.log("File:", file.name);
            const { data: urlData } = supabase.storage.from('practice_tracks').getPublicUrl('MTIzNA_scores/' + file.name);
            console.log("  URL:", urlData?.publicUrl);
        }
    }
}
listFolder();
