import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Square, Volume2, VolumeX, Download, Layers, Waves, AlertTriangle, Settings2, X, SlidersHorizontal } from 'lucide-react';
import { PracticeTrack, deleteRoomTracks } from '@/lib/storageUtils';
import { mixdownTracks, START_RECORD_DELAY_SEC } from '@/lib/audioMixdown';
import WaveSurfer from 'wavesurfer.js';
import toast from 'react-hot-toast';

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
    const [isMixerOpen, setIsMixerOpen] = useState(false);

    // Global reverb state
    const [reverbAmount, setReverbAmount] = useState<number>(0);
    const [channelBank, setChannelBank] = useState<number>(0);

    const containerRefs = useRef<(HTMLDivElement | null)[]>([]);
    const wavesurferRefs = useRef<(WaveSurfer | null)[]>([]);

    // MR Dedicated Refs
    const mrContainerRef = useRef<HTMLDivElement | null>(null);
    const mrWavesurferRef = useRef<WaveSurfer | null>(null);

    // Per-track state
    const [volumes, setVolumes] = useState<Record<string, number>>({});
    const [muted, setMuted] = useState<Record<string, boolean>>({});
    const [trackPlaying, setTrackPlaying] = useState<Record<string, boolean>>({});
    const [tracksReadyStatus, setTracksReadyStatus] = useState<Record<string, boolean>>({});
    const [panning, setPanning] = useState<Record<string, number>>({});
    const [masterEq, setMasterEq] = useState({ low: 0, mid: 0, high: 0 });

    const handlePanChange = (trackId: string, val: number) => setPanning(prev => ({ ...prev, [trackId]: val }));

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

        // Initialize panning map
        const initPan: Record<string, number> = {};
        tracks.forEach(t => { initPan[t.id] = 0; });
        if (mrUrl) initPan['__mr__'] = 0;
        setPanning(initPan);

        // Initialize ready status
        const initReady: Record<string, boolean> = {};
        tracks.forEach(t => { initReady[t.id] = false; });
        if (mrUrl) initReady['__mr__'] = false;

        setVolumes(initVols);
        setMuted(initMuted);
        setTrackPlaying(initPlaying);
        setTracksReadyStatus(initReady);
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
            ws.on('ready', () => setTracksReadyStatus(p => ({ ...p, [track.id]: true })));
            ws.on('error', (err) => {
                console.error(`Error loading track ${track.id}:`, err);
                setTracksReadyStatus(p => ({ ...p, [track.id]: true }));
            });

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
        ws.on('ready', () => setTracksReadyStatus(p => ({ ...p, '__mr__': true })));
        ws.on('error', (err) => {
            console.error(`Error loading MR track:`, err);
            setTracksReadyStatus(p => ({ ...p, '__mr__': true }));
        });

        mrWavesurferRef.current = ws;

        return () => {
            ws.destroy();
        };
    }, [mrUrl]);

    const togglePlay = () => {
        if (isPlaying) {
            wavesurferRefs.current.forEach(ws => ws?.pause());
            mrWavesurferRef.current?.pause();
        } else {
            // Because the Satellite's MediaRecorder starts exactly 1.5s AFTER the MR begins,
            // the recorded blob's 0.0s mark corresponds to the MR's 1.5s mark.
            // When playing them back together from the beginning, we must skip the MR forward by 1.5s
            // so they align perfectly.
            wavesurferRefs.current.forEach(ws => {
                if (ws) {
                    ws.setTime(0);
                    ws.play();
                }
            });
            if (mrWavesurferRef.current) {
                // If the user hasn't explicitly scrubbed, force sync
                mrWavesurferRef.current.setTime(START_RECORD_DELAY_SEC);
                mrWavesurferRef.current.play();
            }
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
            const wavBlob = await mixdownTracks(tracks, volumes, muted, panning, masterEq, reverbAmount, mrUrl);
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
            toast.error(`믹스다운에 실패했습니다: ${msg}`);
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
                toast.success('해당 Take의 원본 음원들이 삭제되었습니다.');
                if (onDeleteComplete) onDeleteComplete();
            } else {
                toast.error('음원 삭제 중 오류가 발생했습니다.');
            }
        } catch (err) {
            console.error("Take deletion failed:", err);
            toast.error('삭제에 실패했습니다.');
        } finally {
            setIsDeleting(false);
        }
    };

    const expectedTracksCount = tracks.length + (mrUrl ? 1 : 0);
    const currentReadyCount = Object.values(tracksReadyStatus).filter(Boolean).length;
    const isAllReady = currentReadyCount >= expectedTracksCount;

    return (
        <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 flex flex-col gap-4 relative">
            {isDeleting && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 rounded-xl flex items-center justify-center">
                    <span className="text-red-400 font-bold animate-pulse">삭제 중...</span>
                </div>
            )}
            {/* Take Header Info */}
            <div className="flex items-start justify-between pb-2 gap-2">
                <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest bg-indigo-500/10 px-1.5 py-0.5 rounded w-fit border border-indigo-500/20 mb-1 shrink-0">
                        Take Session
                    </span>
                    <span className="text-sm font-medium text-slate-300 tracking-tight whitespace-nowrap truncate pr-1">
                        {new Date(timestamp).toLocaleString()}
                    </span>
                </div>

                {/* Delete Button Container */}
                <div className="flex items-center pt-1 shrink-0">
                    {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-md border border-red-500/30 shadow-lg">
                            <span className="text-[9px] text-red-300 font-bold pl-1 hidden xsm:inline sm:inline">삭제할까요?</span>
                            <button onClick={confirmTakeDelete} className="text-[10px] bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors font-bold shadow-md">삭제</button>
                            <button onClick={() => setIsConfirmingDelete(false)} className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded transition-colors font-bold">취소</button>
                        </div>
                    ) : (
                        <button
                            onClick={handleTakeDeleteRequest}
                            disabled={isDeleting || isMixing}
                            className="text-[10px] bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 px-3 py-1.5 rounded-md transition-all border border-slate-700 font-bold flex items-center gap-1.5"
                            title="이 Take에 보관된 클라우드 원본 파일을 영구 삭제합니다."
                        >
                            삭제
                        </button>
                    )}
                </div>
            </div>

            {/* Action Buttons Toolbar (Systematic Layout) */}
            <div className="flex flex-col gap-2 w-full pt-3 border-t border-slate-700/60">
                {/* Primary Play */}
                <button
                    onClick={togglePlay}
                    disabled={!isAllReady}
                    className={`w-full py-2 px-4 text-white text-[11px] sm:text-xs rounded-lg flex items-center justify-center gap-2 transition-all font-bold shadow-md h-10 ${isAllReady ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}`}
                >
                    {!isAllReady ? (
                        <>
                            <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
                            <span className="tracking-wide">LOADING... ({currentReadyCount}/{expectedTracksCount})</span>
                        </>
                    ) : isPlaying ? (
                        <>
                            <Pause size={14} fill="currentColor" />
                            <span className="tracking-widest">PAUSE ALL</span>
                        </>
                    ) : (
                        <>
                            <Play size={14} fill="currentColor" />
                            <span className="tracking-widest">PLAY ALL</span>
                        </>
                    )}
                </button>

                {/* Secondary Actions (Uniform Grid) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                    <button
                        onClick={stopAll}
                        className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 h-10 px-2 sm:px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700/80 shadow-sm"
                        title="모든 재생 정지"
                    >
                        <Square size={13} className="text-slate-400" fill="currentColor" />
                        <span className="font-bold tracking-wider text-[9px] sm:text-[10px]">STOP</span>
                    </button>

                    <button
                        onClick={() => setIsMixerOpen(true)}
                        className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 h-10 px-2 sm:px-4 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg transition-colors border border-indigo-500/30 shadow-sm"
                        title="믹싱 콘솔 열기"
                    >
                        <Settings2 size={13} className="text-indigo-400" />
                        <span className="font-bold tracking-wider text-[9px] sm:text-[10px]">MIXER</span>
                    </button>

                    <button
                        onClick={handleMixdown}
                        disabled={isMixing}
                        className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 h-10 px-2 sm:px-4 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-lg transition-colors border border-teal-500/30 shadow-sm disabled:opacity-50"
                        title="보이는 믹스대로 음원 병합"
                    >
                        {isMixing ? (
                            <>
                                <div className="w-3 h-3 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
                                <span className="font-bold tracking-wider text-[9px] sm:text-[10px]">MIXING</span>
                            </>
                        ) : (
                            <>
                                <Layers size={13} className="text-teal-400" />
                                <span className="font-bold tracking-wider text-[9px] sm:text-[10px]">MIXDOWN</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Mixer Modal Override (V3: Scroll-free, Vertical Faders) */}
            {isMixerOpen && (
                <div className="fixed inset-4 md:inset-10 z-[100] bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl shadow-black/80 flex flex-col h-[90vh]">
                    {/* Compact Master Section: Header + FX */}
                    <div className="flex flex-col bg-slate-950 shrink-0 border-b border-slate-700/50 pb-2">
                        {/* Top Action Bar */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
                            <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-[10px] md:text-sm">
                                <SlidersHorizontal size={16} />
                                <span>Mixing Console</span>
                            </div>
                            <button onClick={() => setIsMixerOpen(false)} className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        {/* Warning Bar */}
                        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 flex items-center gap-2">
                            <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                            <span className="text-[10px] text-amber-500/90 font-bold tracking-tight">마스터 EQ와 리버브는 미리보기가 지원되지 않으며, [MIXDOWN] 결과물에만 적용됩니다.</span>
                        </div>

                        {/* FX + Pagination Container */}
                        <div className="flex flex-col gap-2.5 px-3 pt-3">
                            {/* EQ Row */}
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-indigo-400 font-bold tracking-widest shrink-0 w-10 text-center"><Layers size={12} className="inline mr-1" /> EQ</span>
                                <div className="flex items-center gap-2 w-full max-w-xs">
                                    {(['low', 'mid', 'high'] as const).map(band => (
                                        <div key={band} className="flex flex-col items-center bg-slate-900/60 rounded px-1.5 py-1 flex-1 border border-slate-700/30">
                                            <div className="flex w-full justify-between items-center">
                                                <button onClick={() => setMasterEq(p => ({ ...p, [band]: Math.max(-12, p[band] - 1) }))} className="text-slate-500 hover:text-white px-1 pb-1">-</button>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] font-black text-slate-500 uppercase leading-none">{band}</span>
                                                    <span className="text-[10px] font-bold text-slate-300 tabular-nums leading-none mt-1">{masterEq[band] > 0 ? '+' : ''}{masterEq[band]}</span>
                                                </div>
                                                <button onClick={() => setMasterEq(p => ({ ...p, [band]: Math.min(12, p[band] + 1) }))} className="text-slate-500 hover:text-white px-1 pb-1">+</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Reverb Row + Bank Pagination Switch */}
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-blue-400 font-bold tracking-widest shrink-0 w-10 text-center"><Waves size={12} className="inline mr-1" /> RVB</span>

                                {/* Half-width Reverb Slider */}
                                <div className="flex items-center gap-2 w-full max-w-[170px] h-7 bg-slate-900/60 rounded px-3 border border-slate-700/30">
                                    <input type="range" min="0" max="1" step="0.05" value={reverbAmount} onChange={(e) => setReverbAmount(parseFloat(e.target.value))} className="flex-1 accent-blue-500 h-1 min-w-0" />
                                    <span className="text-[9px] font-bold text-blue-400/80 w-7 text-right tabular-nums shrink-0">{Math.round(reverbAmount * 100)}%</span>
                                </div>

                                {/* Bank Switch Buttons (Pagination 1-8 / 9-16) Always rendered */}
                                <div className="flex bg-slate-950 rounded-md p-0.5 border border-slate-700/80 shadow-inner ml-auto">
                                    <button
                                        onClick={() => setChannelBank(0)}
                                        className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${channelBank === 0 ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        CH 1-8
                                    </button>
                                    <button
                                        onClick={() => setChannelBank(1)}
                                        className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${channelBank === 1 ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        9-16
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Vertical Channel Strips (Strict 4x2 Grid Layout for Pagination) */}
                    <div className="flex-1 overflow-y-auto bg-slate-950 px-2 py-4 custom-scrollbar flex items-center justify-center">
                        <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full max-w-3xl h-full max-h-[600px] place-items-stretch pb-2">
                            {/* Function to render a single channel strip */}
                            {(() => {
                                const renderChannel = (id: string, name: string, isMr: boolean, idx: number) => {
                                    const v = volumes[id] ?? (isMr ? 0.5 : 1.0);
                                    const m = muted[id] ?? false;
                                    const p = panning[id] ?? 0;
                                    const playing = trackPlaying[id];
                                    const aiTargetVolume = isMr ? 0.65 : 0.85; // Mock AI volume recommendations
                                    const aiTargetBottom = `${aiTargetVolume * 100}%`;

                                    return (
                                        <div key={`strip-${id}`} className="flex flex-col w-full min-w-0 max-w-[90px] mx-auto bg-slate-900 border border-slate-800 rounded-lg overflow-hidden h-full flex-1 shadow-lg shadow-black/40">
                                            {/* Header */}
                                            <div className={`py-2 text-center border-b ${isMr ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
                                                <span className={`text-[10px] font-black tracking-wider truncate px-1 block ${isMr ? 'text-emerald-400' : 'text-slate-300'}`}>
                                                    {name}
                                                </span>
                                            </div>

                                            {/* Transport Controls */}
                                            <div className="flex justify-center gap-1.5 p-2">
                                                <button onClick={() => toggleTrackPlay(id, idx)} className={`p-1.5 rounded transition-colors ${playing ? (isMr ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400') : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                                                    {playing ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                                </button>
                                                <button onClick={() => toggleMute(id)} className={`p-1.5 rounded transition-colors ${m ? 'bg-red-500 text-white shadow-md shadow-red-500/20' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}>
                                                    <span className="text-[10px] font-black leading-none px-0.5">M</span>
                                                </button>
                                            </div>

                                            {/* Vertical Fader Region (Ticks + AI Guide + Hardware Fader) */}
                                            <div className="flex-1 flex flex-col items-center justify-center min-h-[50px] relative py-4 bg-slate-800/80 border-y border-black/60 shadow-inner overflow-hidden">

                                                {/* Scale Ticks (Left & Right of Fader) */}
                                                <div className="absolute inset-y-5 left-1.5 w-2 opacity-40 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #94a3b8 0px, #94a3b8 1px, transparent 1px, transparent 8px)' }} />
                                                <div className="absolute inset-y-5 right-1.5 w-2 opacity-40 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #94a3b8 0px, #94a3b8 1px, transparent 1px, transparent 8px)' }} />

                                                {/* Heavy Fader Track Background Graphic */}
                                                <div className="absolute inset-y-5 w-2 bg-black rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] opacity-90 border border-slate-700/50" />

                                                {/* AI Auto-Balance Guide (Yellow Line) */}
                                                <div
                                                    className="absolute w-8 h-[2px] bg-yellow-400 z-10 shadow-[0_0_8px_rgba(250,204,21,1)] pointer-events-none transition-all duration-500 rounded-full"
                                                    style={{ bottom: `calc(1.25rem + (100% - 2.5rem) * ${aiTargetVolume})`, transform: 'translateY(50%)' }}
                                                    title={`AI 권장 볼륨: ${Math.round(aiTargetVolume * 100)}%`}
                                                />

                                                {/* Vertical Input Range Hardware Hack */}
                                                <div className="h-full w-full flex items-center justify-center z-20 px-2">
                                                    <input
                                                        type="range" min="0" max="1" step="0.01"
                                                        value={v}
                                                        onChange={(e) => handleVolumeChange(id, parseFloat(e.target.value))}
                                                        className="w-full h-full cursor-pointer custom-vertical-slider m-0 bg-transparent outline-none"
                                                        style={{ writingMode: 'vertical-lr', direction: 'rtl', WebkitAppearance: 'slider-vertical' } as any}
                                                        title={`현재 볼륨: ${Math.round(v * 100)}% \n(권장: ${Math.round(aiTargetVolume * 100)}%)`}
                                                    />
                                                </div>
                                            </div>

                                            {/* Fader Value */}
                                            <div className="text-center py-1.5 bg-slate-950">
                                                <span className="text-[9px] font-bold text-slate-500 tabular-nums">
                                                    {v === 0 ? '-∞' : `${Math.round(v * 100)}%`}
                                                </span>
                                            </div>

                                            {/* Panning / Balance */}
                                            <div className="p-1 border-t border-slate-800 bg-slate-900/80 flex flex-col items-center gap-1.5 pb-2">
                                                <div className="flex justify-between w-full px-1.5">
                                                    <span className="text-[7px] font-bold text-slate-600">L</span>
                                                    <span className="text-[7px] font-bold text-slate-600">PAN</span>
                                                    <span className="text-[7px] font-bold text-slate-600">R</span>
                                                </div>
                                                <div className="relative w-12 h-3 flex items-center">
                                                    {/* Center Tick Mark */}
                                                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 bg-slate-600 rounded-full z-0 pointer-events-none" />
                                                    <input
                                                        type="range" min="-1" max="1" step="0.1"
                                                        value={p}
                                                        onChange={(e) => handlePanChange(id, parseFloat(e.target.value))}
                                                        className={`w-full h-1 custom-pan-slider z-10 relative bg-transparent appearance-none ${isMr ? 'accent-emerald-400' : 'accent-indigo-400'}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                };

                                return (
                                    <>
                                        {/* Always show MR if it exists and we're on the first bank, OR if we want it permanently pinned on all banks. Digital mixers often pin the main bus. Let's pin MR on bank 0 only for space, or pin it always? Let's pin it always as it's the guide. */}
                                        {mrUrl && renderChannel('__mr__', 'MR Guide', true, -1)}
                                        {tracks.slice(channelBank * 7, (channelBank + 1) * 7).map((track, i) => {
                                            const originalIndex = channelBank * 7 + i;
                                            const cleanPartName = (b64DecodeUnicode(track.name.split('_')[0]) + '_' + track.name.split('_')[1]).split('_')[0];
                                            return renderChannel(track.id, cleanPartName, false, originalIndex);
                                        })}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {mrUrl && (
                    <div className="flex flex-col md:flex-row md:items-center gap-3 bg-slate-900/40 p-2.5 rounded-lg border border-emerald-500/20">
                        <div className="flex md:flex-col items-center md:items-start justify-between md:justify-center w-full md:w-32 shrink-0 pr-2 md:border-r border-slate-700/50">
                            <span className="text-emerald-400 font-bold text-sm tracking-wide break-all">MR 가이드 반주</span>
                            <div className="flex items-center gap-2 mt-1">
                                <button onClick={() => toggleTrackPlay('__mr__', -1)} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors border border-slate-700/50 text-slate-300 z-10 relative">
                                    {trackPlaying['__mr__'] ? <Pause size={12} /> : <Play size={12} />}
                                </button>
                                <button onClick={() => toggleMute('__mr__')} className={`p-1.5 border rounded-md transition-colors z-10 relative ${muted['__mr__'] ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700/50'}`}>
                                    {muted['__mr__'] ? <VolumeX size={12} /> : <Volume2 size={12} />}
                                </button>
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
                            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                                <div className="text-sm font-bold text-slate-200 truncate shrink-0 max-w-[80px] sm:max-w-[120px]">
                                    {cleanPartName}
                                </div>

                                <button
                                    onClick={() => toggleTrackPlay(track.id, i)}
                                    className={`p-1.5 md:p-1 rounded-md transition-colors shadow-sm shrink-0 border ${trackPlaying[track.id] ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700/50'}`}
                                >
                                    {trackPlaying[track.id] ? <Pause size={14} /> : <Play size={14} />}
                                </button>

                                <button
                                    onClick={() => toggleMute(track.id)}
                                    className={`p-1.5 md:p-1 rounded-md transition-colors shadow-sm shrink-0 border ${m ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700/50'}`}
                                >
                                    {m ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </button>

                                <a
                                    href={track.publicUrl}
                                    download={originalFileName}
                                    target="_blank" rel="noopener noreferrer"
                                    className="p-1.5 text-slate-500 bg-slate-800 border border-slate-700/50 rounded-md hover:text-indigo-400 hover:bg-slate-700 transition-colors ml-auto flex items-center gap-1 shadow-sm shrink-0 z-10 relative"
                                    title="원본 OGG/WebM 트랙 다운로드"
                                >
                                    <Download size={14} />
                                    <span className="text-[8px] font-bold hidden sm:inline uppercase">Wav</span>
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
