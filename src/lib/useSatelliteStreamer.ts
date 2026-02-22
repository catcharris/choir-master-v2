import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { PitchData } from './pitch';
import { RealtimeChannel } from '@supabase/supabase-js';

export function useSatelliteStreamer(roomId: string, partName: string) {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
    const channelRef = useRef<RealtimeChannel | null>(null);

    const connect = useCallback(() => {
        if (!roomId || !partName) return;

        setStatus('connecting');

        // Create a channel specific to this room
        const channel = supabase.channel(`room-${roomId}`, {
            config: {
                broadcast: { ack: false }, // Fire and forget for maximum speed
            },
        });

        channel
            .on('broadcast', { event: 'ping' }, () => {
                // Optional: handle ping from master
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    setStatus('connected');
                } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
                    console.error("Supabase Realtime Error:", err);
                    setStatus('error');
                }
            });

        channelRef.current = channel;

    }, [roomId, partName]);

    const disconnect = useCallback(() => {
        if (channelRef.current) {
            channelRef.current.unsubscribe();
            channelRef.current = null;
        }
        setStatus('disconnected');
    }, []);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    // The callback passed to useAudioEngine
    const broadcastPitch = useCallback((pitch: PitchData | null) => {
        if (channelRef.current && status === 'connected') {
            channelRef.current.send({
                type: 'broadcast',
                event: 'pitch_update',
                payload: {
                    part: partName,
                    pitch: pitch,
                    timestamp: Date.now()
                }
            }).catch(err => {
                // Ignore small network hiccups to prevent logging spam
            });
        }
    }, [partName, status]);

    return {
        status,
        connect,
        disconnect,
        broadcastPitch
    };
}
