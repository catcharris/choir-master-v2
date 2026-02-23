import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
    console.log("Testing upload to practice_tracks with Korean characters...");

    // Create a dummy blob
    const dummyBlob = new Blob(['hello world'], { type: 'text/plain' });

    // First, test with just plain Korean characters
    const fileName1 = `1234/베이스_${Date.now()}.webm`;
    console.log(`\nAttempt 1: Plain Korean name (${fileName1})`);
    const { error: err1 } = await supabase.storage.from('practice_tracks').upload(fileName1, dummyBlob);
    console.log(err1 ? "Error 1: " + err1.message : "Success 1");

    // Second, test with encodeURIComponent
    const fileName2 = `1234/${encodeURIComponent('베이스')}_${Date.now()}.webm`;
    console.log(`\nAttempt 2: URL Encoded Korean name (${fileName2})`);
    const { error: err2 } = await supabase.storage.from('practice_tracks').upload(fileName2, dummyBlob);
    console.log(err2 ? "Error 2: " + err2.message : "Success 2");
}

testUpload();
