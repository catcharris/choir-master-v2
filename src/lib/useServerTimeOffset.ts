import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

/**
 * Calculates the exact millisecond offset between the client's local clock
 * and the Supabase Postgres server clock.
 * 
 * true_server_time = Date.now() + offset
 */
export function useServerTimeOffset() {
    const [offset, setOffset] = useState<number>(0);
    const [isSynced, setIsSynced] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function syncTime() {
            try {
                // Ping the server. We record the local time right before we ask.
                const requestLocalTime = Date.now();

                // Fetch our dedicated low-latency Edge API route
                const response = await fetch('/api/time', {
                    method: 'GET',
                    cache: 'no-store'
                });

                if (!response.ok) throw new Error("Time API failed");

                const data = await response.json();
                const responseLocalTime = Date.now();

                if (data.serverTime && isMounted) {
                    const roundTripTime = responseLocalTime - requestLocalTime;
                    // Assume the server processed the request exactly in the middle of the round trip
                    const estimatedServerTimeAtResponse = data.serverTime + (roundTripTime / 2);

                    // Offset = True Server Time - My Local Time
                    const calculatedOffset = estimatedServerTimeAtResponse - responseLocalTime;

                    setOffset(calculatedOffset);
                    setIsSynced(true);
                    console.log(`[TimeSync] Master-Satellite Clock sync complete. Device Offset: ${calculatedOffset}ms`);
                }
            } catch (error) {
                console.error("[TimeSync] Failed to sync time with server:", error);
                // Fallback: assume 0 offset
                if (isMounted) {
                    setOffset(0);
                    setIsSynced(true);
                }
            }
        }

        syncTime();

        return () => {
            isMounted = false;
        };
    }, []);

    return { offset, isSynced };
}
