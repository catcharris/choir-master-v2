import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
    console.log("Testing upload to practice_tracks...");

    // Create a dummy blob
    const dummyBlob = new Blob(['hello world'], { type: 'text/plain' });
    const fileName = `test_room/dummy_${Date.now()}.txt`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('practice_tracks')
        .upload(fileName, dummyBlob);

    if (uploadErr) {
        console.error("Upload Error:", uploadErr);
    } else {
        console.log("Upload Success:", uploadData);

        console.log("Now testing list...");
        const { data: listData, error: listErr } = await supabase.storage
            .from('practice_tracks')
            .list('test_room');

        console.log("List Result:", listData || listErr);
    }
}

testUpload();
