import { supabase } from './supabaseClient';

export async function uploadScoreImages(files: FileList | File[], roomId: string): Promise<string[]> {
    if (!roomId || files.length === 0) return [];

    try {
        const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
        const safeRoomId = b64EncodeUnicode(roomId.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const folderPath = `${safeRoomId}_scores`;

        // 1. Delete all existing score images in this room's folder to prevent accumulation
        let hasMoreFiles = true;
        while (hasMoreFiles) {
            const { data: existingFiles } = await supabase.storage
                .from('practice_tracks')
                .list(folderPath, { limit: 100 });

            if (existingFiles && existingFiles.length > 0) {
                // Ignore empty folder placeholder if it's the only thing left
                const validFiles = existingFiles.filter(f => f.name !== '.emptyFolderPlaceholder');

                if (validFiles.length === 0) {
                    hasMoreFiles = false;
                    break;
                }

                const filesToRemove = validFiles.map(f => `${folderPath}/${f.name}`);
                const { error: removeError } = await supabase.storage
                    .from('practice_tracks')
                    .remove(filesToRemove);

                if (removeError) {
                    console.warn("Failed to clean up old scores, continuing anyway:", removeError);
                    break; // stop loop to prevent infinite loop on permission error
                }
            } else {
                hasMoreFiles = false;
            }
        }

        // Convert to Array and sort numerically/alphabetically by original filename
        const fileArray = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

        const uploadedUrls: string[] = [];

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            const fileExt = file.name.split('.').pop() || 'png';
            // Pad the index (e.g., page_001, page_002) so alphabetical sorting by name works perfectly
            const fileName = `page_${String(i + 1).padStart(3, '0')}_${Date.now()}.${fileExt}`;
            const filePath = `${safeRoomId}_scores/${fileName}`;

            const { data, error } = await supabase.storage
                .from('practice_tracks')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true
                });

            if (error) {
                console.error(`Error uploading score image ${file.name}:`, error);
                continue;
            }

            const { data: urlData } = supabase.storage
                .from('practice_tracks')
                .getPublicUrl(filePath);

            if (urlData?.publicUrl) {
                uploadedUrls.push(urlData.publicUrl);
            }
        }

        return uploadedUrls;
    } catch (err) {
        console.error("Unexpected error uploading scores:", err);
        return [];
    }
}

export async function fetchLatestScores(roomId: string): Promise<string[]> {
    if (!roomId) return [];

    try {
        const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
        const safeRoomId = b64EncodeUnicode(roomId.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const folderPath = `${safeRoomId}_scores`;

        const urls: string[] = [];
        let hasMore = true;
        let offset = 0;

        while (hasMore) {
            const { data, error } = await supabase.storage
                .from('practice_tracks')
                .list(folderPath, {
                    limit: 100,
                    offset: offset,
                    sortBy: { column: 'name', order: 'asc' }
                });

            if (error || !data) {
                console.error("Error fetching score images:", error);
                break;
            }

            if (data.length === 0) {
                hasMore = false;
                break;
            }

            for (const file of data) {
                // Ignore any hidden/dummy files like .emptyFolderPlaceholder
                if (file.name === '.emptyFolderPlaceholder') continue;

                const filePath = `${folderPath}/${file.name}`;
                const { data: urlData } = supabase.storage
                    .from('practice_tracks')
                    .getPublicUrl(filePath);

                if (urlData?.publicUrl) {
                    urls.push(urlData.publicUrl);
                }
            }

            if (data.length < 100) {
                hasMore = false;
            } else {
                offset += 100;
            }
        }

        return urls;
    } catch (err) {
        console.error("Unexpected error fetching scores:", err);
        return [];
    }
}
