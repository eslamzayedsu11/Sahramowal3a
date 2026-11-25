import { setSfxDucking } from './sound';

export type SongPlaybackStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error';

export interface SongPlayerState {
  url: string;
  status: SongPlaybackStatus;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  errorMessage: string | null;
  userVolume: number;
  userMuted: boolean;
  challengeVolume: number;
  fadeFactor: number;
  endedSeq: number;
}

type StateListener = (state: SongPlayerState) => void;

/**
 * Shared singleton HTML5 Audio player.
 * - Uses ONE shared Audio instance.
 * - Does NOT set crossOrigin.
 * - Uses preload="auto".
 * - Preserves the exact URL string as pasted (never decodes/re-encodes).
 */
let sharedAudio: HTMLAudioElement | null = null;
const listeners = new Set<StateListener>();
let state: SongPlayerState = {
  url: '',
  status: 'idle',
  currentTime: 0,
  duration: 0,
  isBuffering: false,
  errorMessage: null,
  userVolume: 1,
  userMuted: false,
  challengeVolume: 1,
  fadeFactor: 1,
  endedSeq: 0,
};

function emit(partial: Partial<SongPlayerState>) {
  state = { ...state, ...partial };
  setSfxDucking(state.status === 'playing');
  listeners.forEach((cb) => cb(state));
}

function applyEffectiveVolume(audio: HTMLAudioElement): boolean {
  const target =
    (state.userMuted ? 0 : state.userVolume) *
    Math.max(0, Math.min(1, state.challengeVolume)) *
    Math.max(0, Math.min(1, state.fadeFactor));
  const clamped = Math.max(0, Math.min(1, target));
  try {
    const probe = clamped === 1 ? 0.99 : clamped;
    audio.volume = probe;
    // On iOS Safari, audio.volume is read-only and stays 1
    if (Math.abs(audio.volume - probe) > 0.02) {
      return false;
    }
    if (probe !== clamped) {
      audio.volume = clamped;
    }
    return true;
  } catch {
    return false;
  }
}

function getSharedAudio(): HTMLAudioElement {
  if (sharedAudio) return sharedAudio;

  const audio = new Audio();
  // Intentionally do NOT set crossOrigin
  audio.preload = 'auto';

  audio.addEventListener('loadstart', () => {
    if (!state.url) return;
    emit({ isBuffering: true, errorMessage: null });
  });

  audio.addEventListener('loadedmetadata', () => {
    const d = Number.isFinite(audio.duration) ? audio.duration : 0;
    emit({ duration: d });
  });

  audio.addEventListener('canplay', () => {
    emit({ isBuffering: false, errorMessage: null });
  });

  audio.addEventListener('waiting', () => {
    if (state.status === 'playing' || state.status === 'loading') {
      emit({ isBuffering: true });
    }
  });

  audio.addEventListener('playing', () => {
    emit({ status: 'playing', isBuffering: false, errorMessage: null });
  });

  audio.addEventListener('pause', () => {
    if (!state.url) return;
    if (state.status !== 'error' && state.status !== 'ended' && !audio.ended) {
      emit({ status: 'paused', isBuffering: false });
    }
  });

  audio.addEventListener('timeupdate', () => {
    emit({ currentTime: audio.currentTime || 0 });
  });

  audio.addEventListener('ended', () => {
    emit({
      status: 'ended',
      currentTime: audio.duration || state.duration || 0,
      isBuffering: false,
      endedSeq: state.endedSeq + 1,
    });
  });

  audio.addEventListener('error', () => {
    if (!state.url) return;
    emit({
      status: 'error',
      isBuffering: false,
      errorMessage: 'تعذّر تشغيل الأغنية',
    });
  });

  sharedAudio = audio;
  return audio;
}

export function subscribeSongPlayer(listener: StateListener): () => void {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
}

export function loadSong(rawUrl: string): void {
  const audio = getSharedAudio();
  if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
    stopAndReleaseSong();
    return;
  }

  audio.pause();
  audio.currentTime = 0;
  state = { ...state, fadeFactor: 1 };
  applyEffectiveVolume(audio);

  // Set exact URL without decoding, encoding, or modifying
  audio.src = rawUrl;
  audio.preload = 'auto';
  audio.load();

  emit({
    url: rawUrl,
    status: 'paused',
    currentTime: 0,
    duration: 0,
    isBuffering: false,
    errorMessage: null,
    fadeFactor: 1,
  });
}

export async function playSong(rawUrl?: string): Promise<void> {
  const audio = getSharedAudio();
  const targetUrl = rawUrl ?? state.url;
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) return;

  if (state.url !== targetUrl || !audio.src) {
    loadSong(targetUrl);
  } else if (state.status === 'ended' || audio.ended) {
    try {
      audio.currentTime = 0;
    } catch {
      // Ignore
    }
  }

  state = { ...state, fadeFactor: 1 };
  applyEffectiveVolume(audio);

  emit({
    status: 'loading',
    isBuffering: true,
    errorMessage: null,
    fadeFactor: 1,
  });
  try {
    await audio.play();
    emit({ status: 'playing', isBuffering: false, errorMessage: null });
  } catch (err) {
    console.warn('Audio playback error:', err);
    emit({
      status: 'error',
      isBuffering: false,
      errorMessage: 'تعذّر تشغيل الأغنية',
    });
  }
}

export function pauseSong(): void {
  const audio = getSharedAudio();
  audio.pause();
  emit({ status: 'paused', isBuffering: false });
}

/**
 * Sets the end-of-timer fade-out multiplier (0..1) and returns false if volume is read-only (iOS Safari).
 */
export function setSongVolume(fadeVolume: number): boolean {
  const audio = getSharedAudio();
  const clamped = Math.max(0, Math.min(1, fadeVolume));
  if (Math.abs(state.fadeFactor - clamped) > 0.004) {
    emit({ fadeFactor: clamped });
  }
  return applyEffectiveVolume(audio);
}

export function setChallengeBaseVolume(volume: number): void {
  const clamped = Number.isFinite(volume) ? Math.max(0.05, Math.min(1, volume)) : 1;
  state = { ...state, challengeVolume: clamped };
  if (sharedAudio) {
    applyEffectiveVolume(sharedAudio);
  }
  listeners.forEach((cb) => cb(state));
}

/**
 * Sets the user's turntable volume (0..1).
 */
export function setUserSongVolume(volume: number): void {
  const audio = getSharedAudio();
  const clamped = Math.max(0, Math.min(1, volume));
  emit({
    userVolume: clamped,
    userMuted: clamped === 0 ? true : false,
  });
  applyEffectiveVolume(audio);
}

export function toggleSongMute(): void {
  const audio = getSharedAudio();
  const nextMuted = !state.userMuted;
  emit({
    userMuted: nextMuted,
    userVolume: !nextMuted && state.userVolume === 0 ? 0.8 : state.userVolume,
  });
  applyEffectiveVolume(audio);
}

export function isSongPlayingNow(): boolean {
  return Boolean(sharedAudio && !sharedAudio.paused && state.status === 'playing');
}

export function seekSong(seconds: number): void {
  const audio = getSharedAudio();
  const maxDur = state.duration || seconds;
  const safe = Math.max(0, Math.min(maxDur, seconds));
  try {
    audio.currentTime = safe;
    emit({
      currentTime: safe,
      status: state.status === 'ended' ? 'paused' : state.status,
    });
  } catch {
    // Ignore seek before metadata ready
  }
}

export function retrySong(): void {
  if (!state.url) return;
  const currentUrl = state.url;
  loadSong(currentUrl);
  void playSong(currentUrl);
}

export function stopAndReleaseSong(): void {
  if (sharedAudio) {
    sharedAudio.pause();
    sharedAudio.currentTime = 0;
    try {
      sharedAudio.volume = state.userMuted ? 0 : state.userVolume;
    } catch {
      // Ignore
    }
    sharedAudio.removeAttribute('src');
    sharedAudio.load();
  }
  emit({
    url: '',
    status: 'idle',
    currentTime: 0,
    duration: 0,
    isBuffering: false,
    errorMessage: null,
    challengeVolume: 1,
    fadeFactor: 1,
  });
}
