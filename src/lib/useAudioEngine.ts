import { PitchData } from './pitch';
import { usePitchTracker } from './audio/usePitchTracker';
import { useVocalRecorder } from './audio/useVocalRecorder';
import { useBackingTrack } from './audio/useBackingTrack';

export type ListenMode = 'idle' | 'vocal' | 'piano';

/**
 * Facade hook that combines pitch tracking, vocal recording, and backing track playback.
 * It delegates the actual work to single-responsibility hooks inside the 'audio' folder.
 */
export function useAudioEngine(a4: number = 440, onPitchUpdate?: (pitch: PitchData | null) => void, isStudioMode: boolean = false) {
    const {
        listenMode,
        isListening,
        startListening,
        stopListening,
        clearPitch,
        pitch,
        error: pitchError,
        audioContextRef,
        streamRef,
        processedStreamRef
    } = usePitchTracker(a4, onPitchUpdate);
    const {
        isRecording,
        startRecording,
        stopRecording,
        getRecordedBlob,
        recordError
    } = useVocalRecorder(processedStreamRef, isStudioMode); // Processed WebAudio stream w/ Gain + Comp

    const {
        preloadBackingTrack,
        playBackingTrack,
        stopBackingTrack
    } = useBackingTrack(audioContextRef);

    return {
        // Pitch Tracker (Microphone Input)
        listenMode,
        isListening,
        startListening,
        stopListening,
        clearPitch,
        pitch,
        error: pitchError || recordError,

        // Vocal Recorder (MediaRecorder Blob)
        isRecording,
        startRecording,
        stopRecording,
        getRecordedBlob,

        // Backing Track (Web Audio Playback)
        preloadBackingTrack,
        playBackingTrack,
        stopBackingTrack
    };
}
