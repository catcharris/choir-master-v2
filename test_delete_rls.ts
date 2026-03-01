import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vhzxriifwdjoitmxwstm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KkCMO2ftbCJDP90rU7sT9A_79zuSP83';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDelete() {
    const roomId = '000';
    console.log(`Listing files for room ${roomId}...`);

    // 1. List files
    const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
    const safeRoomId = b64EncodeUnicode(roomId.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const { data: listData, error: listError } = await supabase.storage.from('practice_tracks').list(safeRoomId);
    if (listError) {
        console.error('List error:', listError);
        return;
    }

    console.log('Files found:', listData?.map(f => f.name));

    if (!listData || listData.length === 0) {
        console.log('No files to delete test.');
        return;
    }

    const fileToDelete = listData[0].name;
    const pathToDelete = `${safeRoomId}/${fileToDelete}`;
    console.log(`Attempting to delete ${pathToDelete}...`);

    const { data: removeData, error: removeError } = await supabase.storage.from('practice_tracks').remove([pathToDelete]);

    console.log('Remove response data:', removeData);
    console.log('Remove response error:', removeError);

    // List again to verify
    const { data: listData2 } = await supabase.storage.from('practice_tracks').list(safeRoomId);
    if (listData2?.find(f => f.name === fileToDelete)) {
        console.log('❌ File STILL EXISTS after delete attempt! (RLS blocked it)');
    } else {
        console.log('✅ File was successfully deleted.');
    }
}

testDelete();
