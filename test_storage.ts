import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log("Checking buckets...");
    const { data: buckets } = await supabase.storage.listBuckets();
    console.log(buckets?.map(b => b.name));

    console.log("Fetching root of practice_tracks...");
    const { data: rootData, error: rootErr } = await supabase.storage.from('practice_tracks').list();
    console.log("Root content:", rootData || rootErr);

    console.log(`Fetching inside folder: MTIzNA`);
    const { data: folderData, error: folderErr } = await supabase.storage.from('practice_tracks').list('MTIzNA', { limit: 5, sortBy: { column: 'created_at', order: 'desc' } });
    console.log(`Folder MTIzNA content:`, folderData?.map(f => ({ name: f.name, size: f.metadata.size, type: f.metadata.mimetype, created_at: f.created_at })) || folderErr);
}

testFetch();
