import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

const STUN_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

export function useMaestroCamMaster(roomId: string) {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCamActive, setIsCamActive] = useState(false);
    const channelRef = useRef<any>(null);
    const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

    const startCamera = async () => {
        try {
            // Optimized for ultra-low latency. Since the satellite renders a tiny ~160px PIP,
            // 320x240 at 30fps is more than enough and drastically cuts encoding/transmission time.
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 320 },
                    height: { ideal: 240 },
                    frameRate: { ideal: 30, max: 30 }
                },
                audio: false // No audio needed, maestro just conducts
            });
            setStream(mediaStream);
            setIsCamActive(true);

            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'webrtc_signal',
                    payload: { type: 'CAM_STARTED' }
                });
            }
        } catch (err) {
            console.error("Failed to start Maestro Cam:", err);
            throw err;
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            setStream(null);
        }
        setIsCamActive(false);
        peersRef.current.forEach(pc => pc.close());
        peersRef.current.clear();

        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'webrtc_signal',
                payload: { type: 'CAM_STOPPED' }
            });
        }
    };

    useEffect(() => {
        if (!roomId) return;

        const channel = supabase.channel(`webrtc-${roomId}`, {
            config: { broadcast: { ack: false } }
        });

        channel.on('broadcast', { event: 'webrtc_signal' }, async ({ payload }) => {
            const { type, clientId, sdp, candidate, targetId } = payload;

            if (!clientId) return;

            if (type === 'JOIN' && isCamActive && stream) {
                let pc = peersRef.current.get(clientId);
                if (pc) {
                    pc.close();
                }
                pc = new RTCPeerConnection(STUN_SERVERS);
                peersRef.current.set(clientId, pc);

                stream.getTracks().forEach(track => pc!.addTrack(track, stream));

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        channel.send({
                            type: 'broadcast',
                            event: 'webrtc_signal',
                            payload: { type: 'ICE', targetId: clientId, candidate: event.candidate }
                        });
                    }
                };

                pc.onconnectionstatechange = () => {
                    if (pc!.connectionState === 'disconnected' || pc!.connectionState === 'failed') {
                        pc!.close();
                        peersRef.current.delete(clientId);
                    }
                };

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                channel.send({
                    type: 'broadcast',
                    event: 'webrtc_signal',
                    payload: { type: 'OFFER', targetId: clientId, sdp: offer }
                });
            } else if (type === 'ANSWER' && targetId === 'MASTER') {
                const pc = peersRef.current.get(clientId);
                if (pc && sdp) {
                    await pc.setRemoteDescription(new RTCSessionDescription(sdp)).catch(e => console.error(e));
                }
            } else if (type === 'ICE' && targetId === 'MASTER') {
                const pc = peersRef.current.get(clientId);
                if (pc && candidate) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e));
                }
            }
        }).subscribe();

        channelRef.current = channel;

        return () => {
            channel.unsubscribe();
            // Optional: Close all PCs on cleanup? 
            // We want to keep them alive if it's just a mild re-render, but here stream/isCamActive changes cause full restart.
            peersRef.current.forEach(pc => pc.close());
        };
    }, [roomId, isCamActive, stream]);

    return { stream, isCamActive, startCamera, stopCamera };
}
