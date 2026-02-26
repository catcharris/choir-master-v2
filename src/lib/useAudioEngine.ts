import { PitchData } from './pitch';
import { usePitchTracker, RecordingProfile } from './audio/usePitchTracker';
import { useVocalRecorder } from './audio/useVocalRecorder';
import { useBackingTrack } from './audio/useBackingTrack';

export type ListenMode = 'idle' | 'vocal' | 'piano';

/**
 * Facade hook that combines pitch tracking, vocal recording, and backing track playback.
 * It delegates the actual work to single-responsibility hooks inside the 'audio' folder.
 */
export function useAudioEngine(
    a4: number = 440,
    onPitchUpdate?: (pitch: PitchData | null) => void,
    isStudioMode: boolean = false,
    isCloseMic: boolean = false,
    recordingProfile: RecordingProfile = 'part'
) {
    // 0.01 is roughly 5x the normal threshold (0.002), creating a very tight proximity bubble.
    const customThreshold = isCloseMic ? 0.01 : undefined;

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
    } = usePitchTracker(a4, onPitchUpdate, customThreshold, recordingProfile);
    const {
        isRecording,
        startRecording,
        stopRecording,
        getRecordedBlob,
        clearRecordedBlob,
        recordError
    } = useVocalRecorder(processedStreamRef, isStudioMode); // Processed WebAudio stream w/ Gain + Comp

    const {
        preloadBackingTrack,
        playBackingTrack,
        stopBackingTrack,
        setBackingTrackVolume
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
        clearRecordedBlob,

        // Backing Track (Web Audio Playback)
        preloadBackingTrack,
        playBackingTrack,
        stopBackingTrack,
        setBackingTrackVolume
    };
}
