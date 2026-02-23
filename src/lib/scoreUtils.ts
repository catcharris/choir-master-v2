import { supabase } from './supabaseClient';

export async function uploadScoreImages(files: FileList | File[], roomId: string): Promise<string[]> {
    if (!roomId || files.length === 0) return [];

    try {
        const b64EncodeUnicode = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
        const safeRoomId = b64EncodeUnicode(roomId.trim()).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        const uploadedUrls: string[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileExt = file.name.split('.').pop() || 'png';
            const fileName = `page_${i + 1}_${Date.now()}.${fileExt}`;
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
