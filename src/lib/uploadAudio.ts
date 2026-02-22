import { supabase } from './supabaseClient';

export async function uploadAudioBlob(blob: Blob, roomId: string, partName: string) {
    if (!blob || blob.size === 0) {
        console.error("Cannot upload empty audio blob.");
        return null;
    }

    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${roomId}/${partName}_${timestamp}.webm`;

        const { data, error } = await supabase.storage
            .from('practice_tracks')
            .upload(fileName, blob, {
                contentType: 'audio/webm;codecs=opus',
                upsert: false
            });

        if (error) {
            console.error("Supabase Storage upload error:", error);
            throw error;
        }

        console.log(`Successfully uploaded: ${fileName}`);
        return data.path;
    } catch (err) {
        console.error("Failed to upload audio to Supabase:", err);
        return null;
    }
}
