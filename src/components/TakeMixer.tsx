import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Square, Volume2, VolumeX, Download, Layers, Waves, Trash2 } from 'lucide-react';
import { PracticeTrack, deleteRoomTracks } from '@/lib/storageUtils';
import { mixdownTracks } from '@/lib/audioMixdown';
import WaveSurfer from 'wavesurfer.js';

interface TakeMixerProps {
    roomId: string;
    tracks: PracticeTrack[];
    timestamp: number;
    mrUrl?: string | null; // Added to thread the backing track into playback/mixdown
    onDeleteComplete?: () => void;
}

export function TakeMixer({ roomId, tracks, timestamp, mrUrl, onDeleteComplete }: TakeMixerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMixing, setIsMixing] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    // Global reverb state
    const [reverbAmount, setReverbAmount] = useState<number>(0);

    const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const wavesurferRefs = useRef<(WaveSurfer | null)[]>([]);

    // MR Dedicated Refs
    const mrContainerRef = useRef<HTMLDivElement | null>(null);
    const mrWavesurferRef = useRef<WaveSurfer | null>(null);

    // Per-track state
    const [volumes, setVolumes] = useState<Record<string, number>>({});
    const [muted, setMuted] = useState<Record<string, boolean>>({});
    const [trackPlaying, setTrackPlaying] = useState<Record<string, boolean>>({});

    // Initialize volume states
    useEffect(() => {
        const initVols: Record<string, number> = {};
        const initMuted: Record<string, boolean> = {};
        const initPlaying: Record<string, boolean> = {};
        tracks.forEach(t => {
            initVols[t.id] = 1.0;
            initMuted[t.id] = false;
            initPlaying[t.id] = false;
        });

        // Add MR to state maps
        initVols['__mr__'] = 0.5; // Default MR volume gently lowered
        initMuted['__mr__'] = false;
        initPlaying['__mr__'] = false;

        setVolumes(initVols);
        setMuted(initMuted);
        setTrackPlaying(initPlaying);
    }, [tracks]);

    // Initialize WaveSurfers
    useEffect(() => {
        const refs = wavesurferRefs.current;

        tracks.forEach((track, i) => {
            if (!containerRefs.current[i]) return;
            // Prevent double initialization during strict mode
            if (refs[i]) {
                refs[i]?.destroy();
            }

            const ws = WaveSurfer.create({
                container: containerRefs.current[i]!,
                waveColor: '#4f46e5',
                progressColor: '#818cf8',
                url: track.publicUrl,
                height: 40,
                barWidth: 2,
                barGap: 1,
                barRadius: 2,
            });

            ws.on('finish', () => {
                const anyPlaying = refs.some(w => w?.isPlaying());
                if (!anyPlaying) setIsPlaying(false);
            });
            ws.on('play', () => setTrackPlaying(p => ({ ...p, [track.id]: true })));
            ws.on('pause', () => setTrackPlaying(p => ({ ...p, [track.id]: false })));

            refs[i] = ws;
        });

        return () => {
            refs.forEach(ws => ws?.destroy());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tracks]);

    // Initialize MR WaveSurfer Separately
    useEffect(() => {
        if (!mrUrl || !mrContainerRef.current) return;

        if (mrWavesurferRef.current) {
            mrWavesurferRef.current.destroy();
        }

        const ws = WaveSurfer.create({
            container: mrContainerRef.current,
            waveColor: '#10b981', // green-500 for MR to distinguish it
            progressColor: '#34d399',
            url: mrUrl,
            height: 40,
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
        });

        ws.on('finish', () => {
            setIsPlaying(false);
        });
        ws.on('play', () => setTrackPlaying(p => ({ ...p, '__mr__': true })));
        ws.on('pause', () => setTrackPlaying(p => ({ ...p, '__mr__': false })));

        mrWavesurferRef.current = ws;

        return () => {
            ws.destroy();
        };
    }, [mrUrl]);

    // Handle global play/pause
    const togglePlay = () => {
        if (isPlaying) {
            wavesurferRefs.current.forEach(ws => ws?.pause());
            mrWavesurferRef.current?.pause();
        } else {
            wavesurferRefs.current.forEach(ws => ws?.play());
            mrWavesurferRef.current?.play();
        }
        setIsPlaying(!isPlaying);
    };

    const stopAll = () => {
        wavesurferRefs.current.forEach(ws => {
            if (ws) ws.stop();
        });
        mrWavesurferRef.current?.stop();
        setIsPlaying(false);
    };

    const handleVolumeChange = (trackId: string, vol: number) => {
        setVolumes(prev => ({ ...prev, [trackId]: vol }));

        if (trackId === '__mr__') {
            if (mrWavesurferRef.current) mrWavesurferRef.current.setVolume(muted[trackId] ? 0 : vol);
            return;
        }

        const idx = tracks.findIndex(t => t.id === trackId);
        if (wavesurferRefs.current[idx]) {
            wavesurferRefs.current[idx]!.setVolume(muted[trackId] ? 0 : vol);
        }
    };

    const toggleMute = (trackId: string) => {
        const isMutedNow = !muted[trackId];
        setMuted(prev => ({ ...prev, [trackId]: isMutedNow }));

        if (trackId === '__mr__') {
            if (mrWavesurferRef.current) mrWavesurferRef.current.setVolume(isMutedNow ? 0 : (volumes[trackId] ?? 0.5));
            return;
        }

        const idx = tracks.findIndex(t => t.id === trackId);
        if (wavesurferRefs.current[idx]) {
            wavesurferRefs.current[idx]!.setVolume(isMutedNow ? 0 : (volumes[trackId] ?? 1.0));
        }
    };

    const toggleTrackPlay = (trackId: string, idx: number) => {
        const ws = wavesurferRefs.current[idx];
        if (ws) {
            ws.playPause();
        }
    };

    const handleMixdown = async () => {
        try {
            setIsMixing(true);
            const wavBlob = await mixdownTracks(tracks, volumes, muted, reverbAmount, mrUrl);
            const url = URL.createObjectURL(wavBlob);

            const a = document.createElement('a');
            a.href = url;
            const takeDate = new Date(timestamp).toLocaleString().replace(/[\/\s:]/g, '_');
            a.download = `ChoirTuner_Mixdown_${takeDate}.wav`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err: unknown) {
            console.error("Mixdown failed:", err);
            const msg = err instanceof Error ? err.message : "Unknown error";
            alert(`믹스다운에 실패했습니다: ${msg}`);
        } finally {
            setIsMixing(false);
        }
    };

    const b64DecodeUnicode = (str: string) => {
        try {
            const padded = str + '='.repeat((4 - str.length % 4) % 4);
            const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
            return decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
        } catch {
            return str;
        }
    };

    const handleTakeDeleteRequest = () => {
        setIsConfirmingDelete(true);
    };

    const confirmTakeDelete = async () => {
        setIsConfirmingDelete(false);
        try {
            setIsDeleting(true);
            const fileNames = tracks.map(t => t.name);
            const success = await deleteRoomTracks(roomId, fileNames);

            if (success) {
                if (onDeleteComplete) onDeleteComplete();
            } else {
                alert('음원 삭제 중 오류가 발생했습니다.');
            }
        } catch (err) {
            console.error("Take deletion failed:", err);
            alert('삭제에 실패했습니다.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-4 relative">
            {isDeleting && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 rounded-xl flex items-center justify-center">
                    <span className="text-red-400 font-bold animate-pulse">삭제 중...</span>
                </div>
            )}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-700 pb-3 gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">Take</span>
                        {isConfirmingDelete ? (
                            <div className="flex items-center gap-1.5 ml-1">
                                <span className="text-[10px] text-slate-300 font-medium">정말 삭제할까요?</span>
                                <button onClick={confirmTakeDelete} className="text-[10px] bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded transition-colors font-bold shadow-md shadow-red-500/20">예</button>
                                <button onClick={() => setIsConfirmingDelete(false)} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-0.5 rounded transition-colors font-bold">아니오</button>
                            </div>
                        ) : (
                            <button
                                onClick={handleTakeDeleteRequest}
                                disabled={isDeleting || isMixing}
                                className="text-xs bg-red-500/10 text-red-500 hover:bg-red-500/30 px-2 py-0.5 rounded transition-colors border border-red-500/20"
                                title="이 Take에 보관된 클라우드 원본 파일을 영구 삭제합니다."
                            >
                                삭제
                            </button>
                        )}
                    </div>
                    <span className="text-sm text-slate-300">
                        {new Date(timestamp).toLocaleString()}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0">
                    {/* Reverb Slider */}
                    <div className="flex items-center gap-1.5 bg-slate-900/50 px-2 py-1 rounded-md border border-slate-700/50">
                        <Waves size={14} className="text-blue-400" />
                        <span className="text-[10px] text-slate-400 font-medium">Reverb</span>
                        <input
                            type="range"
                            min="0" max="1" step="0.05"
                            value={reverbAmount}
                            onChange={(e) => setReverbAmount(parseFloat(e.target.value))}
                            className="w-16 accent-blue-500 h-1"
                            title="믹스다운에만 적용되는 공간 잔향 효과량 (0~100%)"
                        />
                    </div>

                    <button
                        onClick={handleMixdown}
                        disabled={isMixing}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs rounded-md flex items-center gap-1.5 transition-colors font-medium border border-slate-600 disabled:opacity-50"
                        title="보이는 파형과 볼륨, 리버브 설정대로 즉시 WAV 파일로 병합합니다."
                    >
                        <Layers size={14} />
                        {isMixing ? 'MIXING...' : 'MIXDOWN'}
                    </button>

                    <button
                        onClick={stopAll}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-md transition-colors"
                    >
                        <Square size={14} />
                    </button>

                    <button
                        onClick={togglePlay}
                        className="px-3 py-1 bg-indigo-500 hover:bg-indigo-400 text-white text-xs rounded-md flex items-center gap-1.5 transition-colors font-bold shadow-md shadow-indigo-500/20 whitespace-nowrap"
                    >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                        {isPlaying ? 'PAUSE ALL' : 'PLAY ALL'}
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {mrUrl && (
                    <div className="flex flex-col md:flex-row md:items-center gap-3 bg-slate-900/40 p-2.5 rounded-lg border border-emerald-500/20">
                        <div className="flex md:flex-col items-center md:items-start justify-between md:justify-center w-full md:w-32 shrink-0 pr-2 md:border-r border-slate-700/50">
                            <span className="text-emerald-400 font-bold text-sm tracking-wide break-all">MR 가이드 반주</span>
                            <div className="flex items-center gap-2 mt-1">
                                <button onClick={() => toggleTrackPlay('__mr__', -1)} className="p-1.5 hover:bg-slate-700 rounded-md transition-colors text-slate-300">
                                    {trackPlaying['__mr__'] ? <Pause size={12} /> : <Play size={12} />}
                                </button>
                                <button onClick={() => toggleMute('__mr__')} className={`p-1.5 rounded-md transition-colors ${muted['__mr__'] ? 'bg-red-500/20 text-red-400' : 'hover:bg-slate-700 text-slate-300'}`}>
                                    {muted['__mr__'] ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                </button>
                                <input
                                    type="range" min="0" max="1" step="0.05"
                                    value={volumes['__mr__'] ?? 0.5}
                                    onChange={(e) => handleVolumeChange('__mr__', parseFloat(e.target.value))}
                                    className="w-16 md:w-14 accent-emerald-500 h-1"
                                />
                            </div>
                        </div>
                        <div className="flex-1 w-full min-w-0" ref={mrContainerRef} />
                    </div>
                )}

                {tracks.map((track, i) => {
                    const originalFileName = b64DecodeUnicode(track.name.split('_')[0]) + '_' + track.name.split('_')[1];
                    const cleanPartName = originalFileName.split('_')[0];
                    const v = volumes[track.id] ?? 1.0;
                    const m = muted[track.id] ?? false;

                    return (
                        <div key={track.id} className="bg-slate-900/50 p-2.5 rounded-lg flex flex-col gap-2">
                            {/* Toolbar row */}
                            <div className="flex items-center gap-2 md:gap-3">
                                <div className="w-20 text-sm font-bold text-slate-200 truncate">
                                    {cleanPartName}
                                </div>

                                <button
                                    onClick={() => toggleTrackPlay(track.id, i)}
                                    className={`p-1 rounded-md transition-colors ${trackPlaying[track.id] ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                >
                                    {trackPlaying[track.id] ? <Pause size={14} /> : <Play size={14} />}
                                </button>

                                <button
                                    onClick={() => toggleMute(track.id)}
                                    className={`p-1 rounded-md transition-colors ${m ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                                >
                                    {m ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </button>

                                <input
                                    type="range"
                                    min="0" max="1" step="0.05"
                                    value={v}
                                    onChange={(e) => handleVolumeChange(track.id, parseFloat(e.target.value))}
                                    className="w-20 md:w-28 accent-indigo-500 h-1.5"
                                />

                                <a
                                    href={track.publicUrl}
                                    download={originalFileName}
                                    target="_blank" rel="noopener noreferrer"
                                    className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors ml-auto"
                                    title="원본 OGG/WebM 트랙 다운로드"
                                >
                                    <Download size={14} />
                                </a>
                            </div>

                            {/* WaveSurfer rendering container */}
                            <div
                                className="w-full h-8 bg-black/20 rounded border border-slate-700/30 overflow-hidden"
                                ref={(el) => { containerRefs.current[i] = el; }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
