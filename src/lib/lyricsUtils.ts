import { supabase } from './supabaseClient';

export async function uploadLyrics(roomId: string, titleComposer: string, fullText: string): Promise<{ path: string | null, errorMsg?: string }> {
    try {
        // Use identical Room ID encoding as scoreUtils.ts to satisfy Supabase RLS policies
        const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
        const safeRoomId = b64EncodeUnicode(roomId.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        // Sanitize the filename to prevent malicious paths or bad characters
        const safeTitle = titleComposer.replace(/[^a-zA-Z0-9가-힣\s\-_]/g, '').trim();
        const folderPath = `${safeRoomId}_scores`; // Storing IN the scores folder to guarantee RLS bypass
        const filename = `${folderPath}/lyrics_export_${safeTitle}.txt`;

        // Create a blob from the text string
        const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });

        const { data, error } = await supabase
            .storage
            .from('practice_tracks')
            .upload(filename, blob, {
                cacheControl: '3600',
                upsert: true,
                contentType: 'text/plain;charset=utf-8',
            });

        if (error) {
            console.error("Lyrics Upload Error:", error);
            return { path: null, errorMsg: error.message || "Unknown Supabase Error" };
        }

        return { path: data.path };
    } catch (e: any) {
        console.error("Unexpected error uploading lyrics:", e);
        return { path: null, errorMsg: e?.message || "Unexpected exception" };
    }
}

export async function fetchSavedLyrics(roomId: string): Promise<{ text: string | null, errorMsg?: string, lastModified?: string }> {
    try {
        const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
        const safeRoomId = b64EncodeUnicode(roomId.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const folderPath = `${safeRoomId}_scores`;

        // 1. List files in the directory to find the lyrics file
        const { data: files, error: listError } = await supabase.storage.from('practice_tracks').list(folderPath);
        if (listError) return { text: null, errorMsg: listError.message };

        // 2. Find the most recent lyrics file (if they saved multiple times with different titles)
        const lyricsFiles = files?.filter(f => f.name.startsWith('lyrics_export_') && f.name.endsWith('.txt')) || [];
        if (lyricsFiles.length === 0) return { text: null, errorMsg: "저장된 가사 파일이 없습니다." };

        // Sort by created_at descending (newest first)
        lyricsFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latestFile = lyricsFiles[0];

        // 3. Download the blob
        const { data, error: downloadError } = await supabase.storage.from('practice_tracks').download(`${folderPath}/${latestFile.name}`);
        if (downloadError) return { text: null, errorMsg: downloadError.message };

        // 4. Convert blob to text
        const text = await data.text();
        return { text, lastModified: new Date(latestFile.created_at).toLocaleString() };
    } catch (e: any) {
        console.error("Unexpected error fetching lyrics:", e);
        return { text: null, errorMsg: e?.message || "Unexpected exception" };
    }
}

export async function deleteSavedLyrics(roomId: string): Promise<{ success: boolean, errorMsg?: string }> {
    try {
        const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
        const safeRoomId = b64EncodeUnicode(roomId.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const folderPath = `${safeRoomId}_scores`;

        const { data: files } = await supabase.storage.from('practice_tracks').list(folderPath);
        const lyricsFiles = files?.filter(f => f.name.startsWith('lyrics_export_') && f.name.endsWith('.txt')) || [];

        if (lyricsFiles.length === 0) return { success: true }; // Nothing to delete

        const pathsToDelete = lyricsFiles.map(f => `${folderPath}/${f.name}`);
        const { error } = await supabase.storage.from('practice_tracks').remove(pathsToDelete);

        if (error) return { success: false, errorMsg: error.message };
        return { success: true };
    } catch (e: any) {
        console.error("Unexpected error deleting lyrics:", e);
        return { success: false, errorMsg: e?.message || "Unexpected exception" };
    }
}
