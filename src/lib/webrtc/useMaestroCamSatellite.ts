import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

const STUN_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

export function useMaestroCamSatellite(roomId: string, isScoreOpen: boolean) {
    const [maestroStream, setMaestroStream] = useState<MediaStream | null>(null);
    const clientIdRef = useRef<string | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const channelRef = useRef<any>(null);

    useEffect(() => {
        if (!clientIdRef.current) {
            clientIdRef.current = crypto.randomUUID();
        }
    }, []);

    useEffect(() => {
        if (!roomId || !isScoreOpen) {
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            setMaestroStream(null);
            if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
            return;
        }

        const clientId = clientIdRef.current;
        const channel = supabase.channel(`webrtc-${roomId}`, {
            config: { broadcast: { ack: false } }
        });

        const initPeerConnection = () => {
            if (pcRef.current) pcRef.current.close();
            const pc = new RTCPeerConnection(STUN_SERVERS);

            pc.onicecandidate = (event) => {
                if (event.candidate && channelRef.current) {
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'webrtc_signal',
                        payload: { type: 'ICE', targetId: 'MASTER', clientId, candidate: event.candidate }
                    });
                }
            };

            pc.ontrack = (event) => {
                const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
                setMaestroStream(stream);
            };

            pc.onconnectionstatechange = () => {
                if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                    setMaestroStream(null);
                }
            };

            pcRef.current = pc;
            return pc;
        };

        channel.on('broadcast', { event: 'webrtc_signal' }, async ({ payload }) => {
            const { type, sdp, candidate, targetId } = payload;

            if (type === 'CAM_STARTED') {
                channel.send({
                    type: 'broadcast',
                    event: 'webrtc_signal',
                    payload: { type: 'JOIN', clientId }
                });
            } else if (type === 'CAM_STOPPED') {
                setMaestroStream(null);
                if (pcRef.current) pcRef.current.close();
            } else if (type === 'OFFER' && targetId === clientId) {
                const pc = initPeerConnection();
                await pc.setRemoteDescription(new RTCSessionDescription(sdp)).catch(e => console.error(e));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer).catch(e => console.error(e));

                channel.send({
                    type: 'broadcast',
                    event: 'webrtc_signal',
                    payload: { type: 'ANSWER', targetId: 'MASTER', clientId, sdp: answer }
                });
            } else if (type === 'ICE' && targetId === clientId) {
                if (pcRef.current && candidate) {
                    await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e));
                }
            }
        }).subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                // Slight delay to ensure channel is fully established across Supabase nodes
                setTimeout(() => {
                    if (!channelRef.current) return;
                    channelRef.current.send({
                        type: 'broadcast',
                        event: 'webrtc_signal',
                        payload: { type: 'JOIN', clientId }
                    });
                }, 500);
            }
        });

        channelRef.current = channel;

        return () => {
            channel.unsubscribe();
            if (pcRef.current) {
                pcRef.current.close();
            }
            setMaestroStream(null);
        };
    }, [roomId, isScoreOpen]);

    return { maestroStream };
}
