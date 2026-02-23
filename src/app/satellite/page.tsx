"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useAudioEngine } from '@/lib/useAudioEngine';
import { useSatelliteStreamer } from '@/lib/useSatelliteStreamer';
import { PitchData } from '@/lib/pitch';
import { uploadAudioBlob } from '@/lib/uploadAudio';
import { RadioReceiver, AlertCircle, Mic } from 'lucide-react';

import { SatelliteConnectForm } from '@/components/satellite/SatelliteConnectForm';
import { TunerDisplay } from '@/components/satellite/TunerDisplay';
import { RecordingControls } from '@/components/satellite/RecordingControls';

export default function SatellitePage() {
    const [roomId, setRoomId] = useState('');
    const [partName, setPartName] = useState('');

    // Phase 8: Backing Track Sync
    const [mrUrl, setMrUrl] = useState<string | null>(null);
    const [isMrReady, setIsMrReady] = useState(false);
    const [mrError, setMrError] = useState<string | null>(null);

    // Phase 9: Solo "Homework" Recording Mode
    const [isSoloRecording, setIsSoloRecording] = useState(false);

    // --- Media Recorder setup for Phase 3 ---
    // The trick here is that we define our command handler BEFORE we pass it into the streamer hook,
    // but the streamer hook is what actually drives the AudioEngine via broadcastPitch.
    // To solve this cleanly, we extract references to the AudioEngine functions.
    const {
        listenMode, startListening, stopListening, pitch, error,
        isRecording, startRecording, stopRecording, getRecordedBlob,
        preloadBackingTrack, playBackingTrack, stopBackingTrack
    } = useAudioEngine(440, (p) => broadcastPitchRef.current(p));

    // We use a ref to bypass react cyclic dependency issues when passing broadcastPitch downwards
    const broadcastPitchRef = useRef<(p: PitchData | null) => void>(() => { });

    const handleMasterCommand = useCallback(async (action: 'START_RECORD' | 'STOP_RECORD' | 'PRELOAD_MR', url?: string) => {
        console.log("Satellite received command:", action, url);

        if (action === 'PRELOAD_MR' && url) {
            setMrUrl(url);
            setIsMrReady(false);
            setMrError(null);
            const { success, error } = await preloadBackingTrack(url);
            if (success) {
                setIsMrReady(true);
            } else {
                setMrError(error || "알 수 없는 다운로드 에러");
            }
        } else if (action === 'START_RECORD') {
            if (isSoloRecording) return; // Prevent master from interrupting active solo take
            startRecording();
            if (isMrReady) {
                playBackingTrack();
            }
        } else if (action === 'STOP_RECORD') {
            if (isSoloRecording) return; // Don't stop if user is recording manually
            stopRecording();
            stopBackingTrack();

            // The recorder takes a few milliseconds to finalize the Blob after stop() is called.
            // We poll quickly for the blob to be ready, then upload.
            let attempts = 0;
            const checkBlobAndUpload = setInterval(async () => {
                attempts++;
                const blob = getRecordedBlob();
                if (blob) {
                    clearInterval(checkBlobAndUpload);
                    console.log("Blob ready! Uploading to Supabase...");
                    const path = await uploadAudioBlob(blob, roomId, partName);
                    if (path) {
                        console.log("Upload successful:", path);
                        // Optional: show momentary UI success state here
                    }
                } else if (attempts > 50) { // Limit to ~2.5 seconds max wait
                    clearInterval(checkBlobAndUpload);
                    console.error("Timed out waiting for audio blob to finalize.");
                }
            }, 50);

        }
    }, [startRecording, stopRecording, getRecordedBlob, roomId, partName, preloadBackingTrack, playBackingTrack, stopBackingTrack, isMrReady, isSoloRecording]);

    const { status: wsStatus, connect, disconnect, broadcastPitch } = useSatelliteStreamer(
        roomId,
        partName,
        handleMasterCommand
    );

    // Keep the audio engine's callback up to date with the latest broadcastPitch function
    useEffect(() => {
        broadcastPitchRef.current = broadcastPitch;
    }, [broadcastPitch]);

    const isConnected = wsStatus === 'connected';

    const handleConnect = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomId.trim() || !partName.trim()) return;

        // Safari/iOS Mobile Autoplay Hack:
        // We now unlock the AudioContext globally during this user gesture by starting the mic.
        // The Web Audio API (AudioBufferSourceNode) bypasses strict HTMLMediaElement muting.

        connect();
        startListening('vocal');
    };

    const handleDisconnect = () => {
        disconnect();
        stopListening();
    };

    const handleSoloRecordToggle = () => {
        if (!isSoloRecording) {
            startRecording();
            if (isMrReady) {
                playBackingTrack();
            }
            setIsSoloRecording(true);
        } else {
            stopRecording();
            stopBackingTrack();
            setIsSoloRecording(false);

            // Wait for blob and upload (same logic as STOP_RECORD command)
            let attempts = 0;
            const checkBlobAndUpload = setInterval(async () => {
                attempts++;
                const blob = getRecordedBlob();
                if (blob) {
                    clearInterval(checkBlobAndUpload);
                    console.log("Solo Blob ready! Uploading to Supabase...");
                    const path = await uploadAudioBlob(blob, roomId, partName);
                    if (path) {
                        alert("녹음 파일 제출이 완료되었습니다!");
                    }
                } else if (attempts > 50) {
                    clearInterval(checkBlobAndUpload);
                    alert("녹음 파일 생성 시간 초과.");
                }
            }, 50);
        }
    };

    if (!isConnected) {
        return (
            <SatelliteConnectForm
                roomId={roomId}
                setRoomId={setRoomId}
                partName={partName}
                setPartName={setPartName}
                onConnect={handleConnect}
                isConnecting={wsStatus === 'connecting'}
                error={error}
            />
        );
    }

    return (
        <main className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col p-6 items-center justify-center relative">
            {/* Recording & MR Indicator */}
            {isRecording && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/50 text-red-400 px-6 py-2 rounded-full flex items-center gap-3 font-bold shadow-lg shadow-red-500/10">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    지휘자 녹음 중
                </div>
            )}

            {!isRecording && mrUrl && !mrError && (
                <div className={`absolute top-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full flex items-center gap-3 font-bold text-sm shadow-lg whitespace-nowrap border ${isMrReady ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-blue-500/10' : 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 shadow-yellow-500/10 animate-pulse'}`}>
                    {isMrReady ? 'MR 반주 장전 완료 (녹음 대기)' : 'MR 반주 다운로드 중...'}
                </div>
            )}

            {!isRecording && mrError && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/50 text-red-400 px-6 py-2 rounded-full flex items-center gap-3 font-bold text-sm shadow-lg shadow-red-500/10 whitespace-nowrap break-words max-w-[90%] text-center">
                    <AlertCircle size={16} />
                    {mrError}
                </div>
            )}

            <div className="w-full max-w-sm flex flex-col items-center mt-12">
                {/* Active Status Badge */}
                <div className={`px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold mb-12 animate-pulse ${isRecording ? 'bg-indigo-500/10 text-indigo-400' : 'bg-green-500/10 text-green-400'}`}>
                    {isRecording ? <Mic size={16} /> : <RadioReceiver size={16} />}
                    {isRecording ? '고음질 오디오 캡처 중' : '데이터 실시간 전송 중'}
                </div>

                <div className="text-center mb-8">
                    <h2 className="text-xl text-slate-400 mb-1">Room {roomId}</h2>
                    <h1 className="text-4xl font-black text-white">{partName}</h1>
                </div>

                <TunerDisplay pitch={pitch} isRecording={isRecording} />

                <RecordingControls
                    isRecording={isRecording}
                    isMrReady={isMrReady}
                    isSoloRecording={isSoloRecording}
                    onDisconnect={handleDisconnect}
                    onSoloRecordToggle={handleSoloRecordToggle}
                />
            </div>
        </main>
    );
}
