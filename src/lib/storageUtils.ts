import { supabase } from './supabaseClient';

export interface PracticeTrack {
    name: string;
    id: string;
    updated_at: string;
    created_at: string;
    last_accessed_at: string;
    metadata: {
        size: number;
        mimetype: string;
    };
    publicUrl: string;
    offsetMs: number; // Added for precise blob timeline sync telemetry
}

/**
 * Fetches all available practice tracks for a specific Room ID from the Supabase bucket.
 * The paths in the bucket are formatted as: {roomId}/{partName}_{timestamp}.webm
 */
export async function fetchRoomTracks(roomId: string): Promise<PracticeTrack[]> {
    if (!roomId) return [];

    try {
        // Use the safely encoded roomId for the folder path
        const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
        const safeRoomId = b64EncodeUnicode(roomId.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        const { data, error } = await supabase.storage
            .from('practice_tracks')
            .list(safeRoomId, {
                limit: 100,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' },
            });

        if (error) {
            console.error("Error fetching tracks from Supabase:", error);
            return [];
        }

        // Filter out the empty folder placeholder item that Supabase sometimes returns
        const validFiles = data.filter(file => file.name !== '.emptyFolderPlaceholder');

        // Map over the files and attach the full public URL so the HTML Audio player can use it immediately
        const tracksWithUrls = validFiles.map((file) => {
            const path = `${safeRoomId}/${file.name}`;
            const { data: urlData } = supabase.storage
                .from('practice_tracks')
                .getPublicUrl(path);

            // Extract telemetry offset from the filename (e.g. Soprano_1708940001000_offset_1482.webm)
            let parsedOffset = 1500; // Default backwards compatibility
            const offsetMatch = file.name.match(/_offset_(\d+)\./);
            if (offsetMatch && offsetMatch[1]) {
                parsedOffset = parseInt(offsetMatch[1], 10);
            }

            return {
                ...file,
                publicUrl: urlData.publicUrl,
                offsetMs: parsedOffset
            } as unknown as PracticeTrack;
        });

        return tracksWithUrls;
    } catch (err) {
        console.error("Unexpected error fetching room tracks:", err);
        return [];
    }
}

/**
 * Deletes a list of files from the practice_tracks bucket for a specific room.
 */
export async function deleteRoomTracks(roomId: string, fileNames: string[]): Promise<boolean> {
    if (!roomId || fileNames.length === 0) return false;

    try {
        const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
        const safeRoomId = b64EncodeUnicode(roomId.trim()).replace(/\+/g, '-',).replace(/\//g, '_').replace(/=/g, '');

        // Map filenames to full bucket paths
        const pathsToDelete = fileNames.map(name => `${safeRoomId}/${name}`);

        const { data, error } = await supabase.storage
            .from('practice_tracks')
            .remove(pathsToDelete);

        console.log("Supabase Remove Result:", { data, error });

        if (error) {
            console.error("Error deleting tracks from Supabase:", error);
            return false;
        }

        // Supabase returns an empty array if RLS blocks the delete silently
        if (!data || data.length === 0) {
            console.error("No files deleted. Likely blocked by RLS policies.");
            return false;
        }

        return true;
    } catch (err) {
        console.error("Unexpected error deleting room tracks:", err);
        return false;
    }
}
