import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetchSize() {
    console.log("Fetching recent files...");
    const { data: rootData, error: rootErr } = await supabase.storage.from('practice_tracks').list();
    if (rootData && rootData.length > 0) {
        // Assume first folder
        const folderName = rootData[0].name;
        const { data: files } = await supabase.storage.from('practice_tracks').list(folderName, { limit: 5, sortBy: { column: 'created_at', order: 'desc' } });
        console.log(`\nFiles in ${folderName}:`);
        files?.forEach(f => {
            console.log(`- ${f.name} | Size: ${f.metadata.size} bytes | Type: ${f.metadata.mimetype}`);
        });
    } else {
        console.log("No folders found.");
    }
}

testFetchSize();
