import { supabase } from './supabaseClient';

export async function uploadAudioBlob(blob: Blob, roomId: string, partName: string) {
    if (!blob || blob.size === 0) {
        console.error("Cannot upload empty audio blob.");
        return null;
    }

    try {
        const actualType = blob.type || 'audio/webm';
        let extension = 'webm';
        if (actualType.includes('mp4')) extension = 'mp4';
        else if (actualType.includes('ogg')) extension = 'ogg';

        const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));

        const safeRoomId = b64EncodeUnicode(roomId.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const safePartName = b64EncodeUnicode(partName.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const timestamp = Date.now();
        const fileName = `${safeRoomId}/${safePartName}_${timestamp}.${extension}`;

        const { data, error } = await supabase.storage
            .from('practice_tracks')
            .upload(fileName, blob, {
                contentType: blob.type || 'audio/webm',
                upsert: false
            });

        if (error) {
            console.error("Supabase Storage upload error:", error);
            alert("업로드 실패 (에러): " + error.message);
            throw error;
        }

        console.log(`Successfully uploaded: ${fileName}`);
        return data.path;
    } catch (err) {
        console.error("Failed to upload audio to Supabase:", err);
        return null;
    }
}
