import { supabase } from './supabaseClient';

/**
 * Permanently deletes all uploaded scores and backing tracks (MR)
 * for the given roomId in Supabase Storage.
 * Used when a Master explicitly terminates a session to prevent old files
 * from loading the next time they use the same room code.
 */
export async function clearRoomData(roomId: string) {
    if (!roomId) return;

    try {
        const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
        const safeRoomId = b64EncodeUnicode(roomId.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        console.log(`Clearing all session data for room: ${roomId}`);

        // 1. Clear MR Tracks
        await deleteAllFilesInFolder('backing_tracks', safeRoomId);

        // 2. Clear Score Images
        const scoreFolderPath = `${safeRoomId}_scores`;
        await deleteAllFilesInFolder('practice_tracks', scoreFolderPath);

    } catch (err) {
        console.error("Error clearing room data:", err);
    }
}

async function deleteAllFilesInFolder(bucket: string, folderPath: string) {
    let hasMore = true;
    while (hasMore) {
        const { data: existingFiles, error: listError } = await supabase.storage
            .from(bucket)
            .list(folderPath, { limit: 100 });

        if (listError || !existingFiles || existingFiles.length === 0) {
            hasMore = false;
            break;
        }

        const validFiles = existingFiles.filter(f => f.name !== '.emptyFolderPlaceholder');
        if (validFiles.length === 0) {
            hasMore = false;
            break;
        }

        const filesToRemove = validFiles.map(f => `${folderPath}/${f.name}`);
        const { error: removeError } = await supabase.storage
            .from(bucket)
            .remove(filesToRemove);

        if (removeError) {
            console.warn(`Failed to clean up files in ${folderPath}:`, removeError);
            break;
        }

        // If returned exactly 100 files, there might be more. Otherwise we're done.
        if (existingFiles.length < 100) {
            hasMore = false;
        }
    }
}
