import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
    const textBlob = new Blob(["test lyrics content"], { type: 'text/plain;charset=utf-8' });
    console.log('Attempting upload...');
    const { data, error } = await supabase.storage
        .from('practice_tracks')
        .upload('testRoom_scores/test_lyrics.txt', textBlob, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'text/plain;charset=utf-8',
        });
    console.log("Data:", data);
    console.log("Error:", error);
}

test();
