import { clearRoomData } from './src/lib/clearRoomData';
import { supabase } from './src/lib/supabaseClient';
import { fetchLatestBackingTrack } from './src/lib/backingTrackUtils';

async function test() {
    console.log("Before clear:", await fetchLatestBackingTrack("1234"));
    await clearRoomData("1234");
    console.log("After clear:", await fetchLatestBackingTrack("1234"));
}
test();
