import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder as useExpoAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

/** A finished voice recording, ready to upload. */
export interface RecordingResult {
  uri: string;
  durationSecs: number;
}

/**
 * Tap-to-record voice notes. start() asks for the mic permission, primes audio
 * mode and begins recording; stop() returns the file uri + duration (or null if
 * nothing usable was captured); cancel() discards the take. `elapsedSecs` ticks
 * once a second while recording so the UI can show a mm:ss timer.
 */
export function useAudioRecorder() {
  const recorder = useExpoAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [recording, setRecording] = useState(false);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const start = useCallback(async (): Promise<boolean> => {
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) return false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setElapsedSecs(0);
    setRecording(true);
    clearTimer();
    timer.current = setInterval(() => setElapsedSecs((s) => s + 1), 1000);
    return true;
  }, [recorder, clearTimer]);

  const stop = useCallback(async (): Promise<RecordingResult | null> => {
    clearTimer();
    setRecording(false);
    try {
      await recorder.stop();
    } catch {
      return null;
    }
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    const uri = recorder.uri;
    // Prefer the live state duration (ms); fall back to the ticked elapsed count.
    const ms = state.durationMillis ?? 0;
    const durationSecs = ms > 0 ? Math.round(ms / 1000) : elapsedSecs;
    if (!uri) return null;
    return { uri, durationSecs: Math.max(durationSecs, 1) };
  }, [recorder, state.durationMillis, elapsedSecs, clearTimer]);

  const cancel = useCallback(async () => {
    clearTimer();
    setRecording(false);
    setElapsedSecs(0);
    try {
      await recorder.stop();
    } catch {
      /* nothing was recording */
    }
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
  }, [recorder, clearTimer]);

  return { recording, elapsedSecs, start, stop, cancel };
}

/** Format a number of seconds as mm:ss. */
export function formatDuration(totalSecs: number): string {
  const s = Math.max(0, Math.round(totalSecs));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
