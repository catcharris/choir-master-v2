import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
    console.log("Testing upload to practice_tracks...");
    const dummyBlob = new Blob(['hello world'], { type: 'text/plain' });

    // Test base64 encoded name
    const b64Name = Buffer.from('베이스').toString('base64');
    const fileName3 = `test_room/bass_${Date.now()}.webm`;
    console.log(`\nAttempt 3: English name (${fileName3})`);
    const { error: err3 } = await supabase.storage.from('practice_tracks').upload(fileName3, dummyBlob);
    console.log(err3 ? "Error 3: " + err3.message : "Success 3");

    const fileName4 = `test_room/kr_${b64Name}_${Date.now()}.webm`;
    console.log(`\nAttempt 4: Base64 exact name (${fileName4})`);
    const { error: err4 } = await supabase.storage.from('practice_tracks').upload(fileName4, dummyBlob);
    console.log(err4 ? "Error 4: " + err4.message : "Success 4");
}

testUpload();
