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

    if (rootData?.length) {
        // e.g., if there's a folder like '9876'
        const folderName = rootData[0].name;
        console.log(`Fetching inside folder: ${folderName}`);
        const { data: folderData, error: folderErr } = await supabase.storage.from('practice_tracks').list(folderName);
        console.log(`Folder ${folderName} content:`, folderData || folderErr);
    }
}

testFetch();
