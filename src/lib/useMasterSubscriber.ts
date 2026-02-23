import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { PitchData } from './pitch';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SatelliteState {
    part: string;
    pitch: PitchData | null;
    lastUpdated: number;
    connected: boolean;
}

export function useMasterSubscriber(roomId: string) {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
    const [satellites, setSatellites] = useState<Record<string, SatelliteState>>({});
    const channelRef = useRef<RealtimeChannel | null>(null);

    // Throttle React state updates to avoid rendering 40x a second
    const pendingStateRef = useRef<Record<string, SatelliteState>>({});
    const lastRenderTimeRef = useRef<number>(0);

    const connect = useCallback(() => {
        if (!roomId) return;
        setStatus('connecting');

        const channel = supabase.channel(`room-${roomId}`);

        channel
            .on('broadcast', { event: 'pitch_update' }, ({ payload }) => {
                // Store fast incoming data into the Ref
                pendingStateRef.current[payload.part] = {
                    part: payload.part,
                    pitch: payload.pitch,
                    lastUpdated: payload.timestamp,
                    connected: true
                };

                // Throttle UI renders to approx 15 FPS (every ~66ms) so React 18 doesn't choke
                const now = Date.now();
                if (now - lastRenderTimeRef.current > 66) {
                    setSatellites(prev => ({ ...prev, ...pendingStateRef.current }));
                    lastRenderTimeRef.current = now;
                }
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

    }, [roomId]);

    const disconnect = useCallback(() => {
        if (channelRef.current) {
            channelRef.current.unsubscribe();
            channelRef.current = null;
        }
        setStatus('disconnected');
        setSatellites({});
        pendingStateRef.current = {};
    }, []);

    // Cleanup stale satellites that stopped broadcasting for > 3 seconds
    // Helps maintain a clean UI if a member closes their phone
    useEffect(() => {
        if (status !== 'connected') return;

        const interval = setInterval(() => {
            const now = Date.now();
            setSatellites(prev => {
                let changed = false;
                const next = { ...prev };
                for (const part in next) {
                    if (next[part].connected && now - next[part].lastUpdated > 3000) {
                        // Instead of deleting the satellite, mark it as disconnected/silent
                        // so the conductor's grid doesn't violently resize during rests
                        next[part] = {
                            ...next[part],
                            connected: false,
                            pitch: null
                        };
                        pendingStateRef.current[part] = next[part];
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [status]);

    useEffect(() => {
        return () => {
            disconnect();
        };
    }, [disconnect]);

    // Command broadcast for Phase 3, 8 and 10
    const broadcastCommand = useCallback((action: 'START_RECORD' | 'STOP_RECORD' | 'PRELOAD_MR' | 'SCORE_SYNC' | 'PAGE_SYNC', payloadData?: Record<string, any>) => {
        if (channelRef.current && status === 'connected') {
            const payload: any = { action, ...payloadData, timestamp: Date.now() };

            channelRef.current.send({
                type: 'broadcast',
                event: 'master_command',
                payload
            }).catch(err => console.error("Failed to broadcast command:", err));
        }
    }, [status]);

    return {
        status,
        satellites,
        connect,
        disconnect,
        broadcastCommand
    };
}
