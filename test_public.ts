import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBucket() {
    const { data: bucket, error } = await supabase.storage.getBucket('practice_tracks');
    if (error) {
        console.error("Error fetching bucket:", error.message);
    } else {
        console.log("Bucket details:", JSON.stringify(bucket, null, 2));
    }
}

checkBucket();
