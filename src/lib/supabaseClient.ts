import { createClient } from '@supabase/supabase-js';

// These must be provided in .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// We only need Realtime (WebSockets) functionality for this app.
// If the keys are missing, it will fail gracefully (or log an error) rather than crashing the build.
export const supabase = createClient(
    supabaseUrl || 'https://placeholder-url.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        realtime: {
            params: {
                eventsPerSecond: 10, // Maximize throughput for 10Hz pitch data streaming
            },
        },
    }
);
