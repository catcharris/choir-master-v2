import { supabase } from './supabaseClient';

/**
 * Uploads a backing track (MR) to the 'backing_tracks' bucket in Supabase.
 * Returns the public URL of the uploaded file.
 */
export async function uploadBackingTrack(file: File, roomId: string): Promise<string | null> {
    if (!file || !roomId) return null;

    try {
        const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
        const safeRoomId = b64EncodeUnicode(roomId.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        // Clean filename and append timestamp to prevent overwrites
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const timestamp = Date.now();
        const filePath = `${safeRoomId}/${timestamp}_${safeFileName}`;

        const { data, error } = await supabase.storage
            .from('backing_tracks')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false // Don't overwrite, we use timestamps
            });

        if (error) {
            console.error("Error uploading backing track:", error);
            return null;
        }

        const { data: publicUrlData } = supabase.storage
            .from('backing_tracks')
            .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
    } catch (err) {
        console.error("Unexpected error during backing track upload:", err);
        return null; // Silent failure on the logic side, UI should handle
    }
}

/**
 * Fetches the most recently uploaded backing track (MR) for a specific room.
 * Useful for restoring state when the Master UI is refreshed.
 */
export async function fetchLatestBackingTrack(roomId: string): Promise<string | null> {
    if (!roomId) return null;

    try {
        const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
        const safeRoomId = b64EncodeUnicode(roomId.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        // List files in the room's folder
        const { data, error } = await supabase.storage
            .from('backing_tracks')
            .list(safeRoomId, {
                limit: 100,
                sortBy: { column: 'name', order: 'desc' } // Names start with timestamp, so desc gets newest
            });

        if (error || !data || data.length === 0) {
            return null;
        }

        // Get the latest file
        const latestFile = data[0];
        const filePath = `${safeRoomId}/${latestFile.name}`;

        const { data: publicUrlData } = supabase.storage
            .from('backing_tracks')
            .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
    } catch (err) {
        console.error("Unexpected error fetching latest backing track:", err);
        return null;
    }
}
