import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUrl() {
    const roomId = '1234';
    const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
    const safeRoomId = b64EncodeUnicode(roomId.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const { data: files } = await supabase.storage.from('practice_tracks').list(safeRoomId, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

    if (files && files.length > 0) {
        const file = files[0];
        const path = `${safeRoomId}/${file.name}`;
        console.log(`Path requested: ${path}`);

        const { data: urlData } = supabase.storage.from('practice_tracks').getPublicUrl(path);
        console.log(`Public URL Generated: ${urlData.publicUrl}`);

        // Let's also do a quick fetch to see what the server responds with
        try {
            const res = await fetch(urlData.publicUrl);
            console.log(`HTTP Status: ${res.status}`);
        } catch (e) {
            console.error("Fetch failed", e);
        }
    } else {
        console.log("No files found");
    }
}

testUrl();
