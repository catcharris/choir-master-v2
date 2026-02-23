import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log("Fetching: https://vhzxriifwdjoitmxwstm.supabase.co/storage/v1/object/public/practice_tracks/MTIzNA/67Kg7J207Iqk_1771768469188.webm");
    try {
        const res = await fetch("https://vhzxriifwdjoitmxwstm.supabase.co/storage/v1/object/public/practice_tracks/MTIzNA/67Kg7J207Iqk_1771768469188.webm");
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Body:", text);
    } catch(e) {
        console.log(e);
    }
}
testFetch();
