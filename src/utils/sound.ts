const SFX_STORAGE_KEY = 'sahra_sfx_enabled_v1';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let isDucked = false;
let isCandleDimmed = false;
let sfxEnabled = readInitialSfxEnabled();
const sfxListeners = new Set<(enabled: boolean) => void>();

function readInitialSfxEnabled(): boolean {
  try {
    const val = localStorage.getItem(SFX_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

function computeTargetGain(): number {
  if (!sfxEnabled) return 0;
  const base = isDucked ? 0.08 : 0.22;
  return isCandleDimmed ? base * 0.55 : base;
}

export function isSfxEnabled(): boolean {
  return sfxEnabled;
}

export function setSfxEnabled(enabled: boolean): void {
  sfxEnabled = enabled;
  try {
    localStorage.setItem(SFX_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage errors
  }
  if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(computeTargetGain(), audioCtx.currentTime, 0.04);
  }
  sfxListeners.forEach((cb) => cb(enabled));
}

export function subscribeSfxEnabled(cb: (enabled: boolean) => void): () => void {
  sfxListeners.add(cb);
  cb(sfxEnabled);
  return () => sfxListeners.delete(cb);
}

export function setSfxDucking(songPlaying: boolean): void {
  isDucked = songPlaying;
  if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(computeTargetGain(), audioCtx.currentTime, 0.08);
  }
}

export function setSfxCandleMode(candleActive: boolean): void {
  isCandleDimmed = candleActive;
  if (masterGain && audioCtx) {
    masterGain.gain.setTargetAtTime(computeTargetGain(), audioCtx.currentTime, 0.08);
  }
}

function getContext(): { ctx: AudioContext; out: GainNode } | null {
  if (!sfxEnabled) return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!audioCtx) {
      audioCtx = new AudioCtx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = computeTargetGain();
      masterGain.connect(audioCtx.destination);
    }

    if (audioCtx.state === 'suspended') {
      void audioCtx.resume().catch(() => undefined);
    }

    if (!masterGain) return null;
    return { ctx: audioCtx, out: masterGain };
  } catch {
    return null;
  }
}

export function initAudioOnFirstTap(): void {
  const unlock = () => {
    getContext();
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  };
  window.addEventListener('pointerdown', unlock, { capture: true, once: true });
  window.addEventListener('keydown', unlock, { capture: true, once: true });
}

/** 1. Soft tactile tap on buttons */
export function playTapSound(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(340, now);
  osc.frequency.exponentialRampToValueAtTime(140, now + 0.045);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.32, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

  osc.connect(gain);
  gain.connect(out);
  osc.start(now);
  osc.stop(now + 0.055);
}

let lastHoverSoundAt = 0;

/** 1b. Whisper-soft hover chime for desktop mouse interactions */
export function playHoverSound(): void {
  const nowMs = Date.now();
  if (nowMs - lastHoverSoundAt < 110) return;
  lastHoverSoundAt = nowMs;

  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(420, now);
  osc.frequency.exponentialRampToValueAtTime(510, now + 0.04);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.075, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

  osc.connect(gain);
  gain.connect(out);
  osc.start(now);
  osc.stop(now + 0.06);
}

/** 2. Warm romantic chime when choosing a night */
export function playWarmChime(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const freqs = [392.0, 493.88, 587.33, 739.99];
  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const start = now + idx * 0.065;
    osc.frequency.setValueAtTime(f, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.24, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.65);

    osc.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(start + 0.68);
  });
}

/** 3. Soft paper/air whoosh on page or challenge transitions */
export function playWhooshSound(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const bufferSize = Math.floor(ctx.sampleRate * 0.24);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = 1.4;
  filter.frequency.setValueAtTime(280, now);
  filter.frequency.exponentialRampToValueAtTime(1100, now + 0.12);
  filter.frequency.exponentialRampToValueAtTime(320, now + 0.24);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.35, now + 0.07);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(out);
  noise.start(now);
  noise.stop(now + 0.25);
}

/** 4. Shimmering "spark" when pressing Start Challenge */
export function playSparkSound(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const notes = [659.25, 880, 1174.66, 1567.98];
  notes.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
    const start = now + idx * 0.04;
    osc.frequency.setValueAtTime(f, start);
    osc.frequency.exponentialRampToValueAtTime(f * 1.06, start + 0.22);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.24, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);

    osc.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(start + 0.36);
  });
}

/** 5. Very soft tick for seconds 10..7 of the countdown */
export function playCountdownTick(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(760, now);
  osc.frequency.exponentialRampToValueAtTime(380, now + 0.028);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.11, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.036);

  osc.connect(gain);
  gain.connect(out);
  osc.start(now);
  osc.stop(now + 0.04);
}

/** 5b. Tension heartbeat thump-thump + rising-pitch tone (5..1) and deep boom (0) */
export function playTensionPulse(sec: number, maxSec: number = 5): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  const clampedMax = Math.max(1, maxSec);
  const progress = Math.max(0, Math.min(1, 1 - sec / clampedMax)); // 0 at start, 1 at 0

  if (sec <= 0) {
    // Deep boom at 0
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(98, now);
    boom.frequency.exponentialRampToValueAtTime(28, now + 0.45);
    boomGain.gain.setValueAtTime(0.001, now);
    boomGain.gain.linearRampToValueAtTime(0.75, now + 0.015);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.52);
    boom.connect(boomGain);
    boomGain.connect(out);
    boom.start(now);
    boom.stop(now + 0.55);

    // Warm sub-punch layer
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(140, now);
    sub.frequency.exponentialRampToValueAtTime(42, now + 0.25);
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.45, now + 0.01);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    sub.connect(subGain);
    subGain.connect(out);
    sub.start(now);
    sub.stop(now + 0.3);
    return;
  }

  // Heartbeat "thump-thump"
  [0, 0.145].forEach((offset, idx) => {
    const hb = ctx.createOscillator();
    const hbGain = ctx.createGain();
    hb.type = 'sine';
    const startFreq = idx === 0 ? 72 : 64;
    hb.frequency.setValueAtTime(startFreq, now + offset);
    hb.frequency.exponentialRampToValueAtTime(34, now + offset + 0.11);

    const peak = (idx === 0 ? 0.42 : 0.32) * (0.75 + progress * 0.45);
    hbGain.gain.setValueAtTime(0.001, now + offset);
    hbGain.gain.linearRampToValueAtTime(peak, now + offset + 0.012);
    hbGain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.13);

    hb.connect(hbGain);
    hbGain.connect(out);
    hb.start(now + offset);
    hb.stop(now + offset + 0.14);
  });

  // Rising-pitch tone that gets higher and louder each second
  const tone = ctx.createOscillator();
  const toneGain = ctx.createGain();
  tone.type = 'triangle';
  const baseFreq = 220 * Math.pow(1.26, Math.max(0, clampedMax - sec));
  tone.frequency.setValueAtTime(baseFreq, now);
  tone.frequency.exponentialRampToValueAtTime(baseFreq * 1.12, now + 0.22);

  const tonePeak = 0.12 + progress * 0.26;
  toneGain.gain.setValueAtTime(0.0001, now);
  toneGain.gain.linearRampToValueAtTime(tonePeak, now + 0.02);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

  tone.connect(toneGain);
  toneGain.connect(out);
  tone.start(now);
  tone.stop(now + 0.28);
}

/** 6. Gentle bell when timer ends */
export function playCompletionChime(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const start = now + idx * 0.1;
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.28, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.15);

    osc.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(start + 1.2);
  });
}

/** 7. Cute heart-pop on the like button */
export function playHeartPopSound(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(380, now);
  osc.frequency.exponentialRampToValueAtTime(760, now + 0.07);
  osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

  osc.connect(gain);
  gain.connect(out);
  osc.start(now);
  osc.stop(now + 0.14);
}

/** 8. Secret "click-click-unlock" on the 3rd logo tap into Admin */
export function playSecretUnlockSound(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  [0, 0.08].forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(620, now + offset);
    osc.frequency.exponentialRampToValueAtTime(220, now + offset + 0.025);
    gain.gain.setValueAtTime(0.001, now + offset);
    gain.gain.linearRampToValueAtTime(0.18, now + offset + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.03);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now + offset);
    osc.stop(now + offset + 0.035);
  });

  [783.99, 1174.66].forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + 0.17 + idx * 0.06;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.26, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
    osc.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(start + 0.38);
  });
}

/** 9. Subtle turntable stylus drop & warm groove click */
export function playVinylDropSound(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  // Soft mechanical arm click
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(190, now);
  osc.frequency.exponentialRampToValueAtTime(75, now + 0.045);
  oscGain.gain.setValueAtTime(0.001, now);
  oscGain.gain.linearRampToValueAtTime(0.24, now + 0.004);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
  osc.connect(oscGain);
  oscGain.connect(out);
  osc.start(now);
  osc.stop(now + 0.06);

  // Tiny warm vinyl groove touch
  const bufLen = Math.floor(ctx.sampleRate * 0.07);
  const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufLen; i++) {
    const env = Math.pow(1 - i / bufLen, 2.2);
    data[i] = (Math.random() * 2 - 1) * env * 0.45;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1350, now);
  filter.Q.value = 1.2;
  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.18, now + 0.02);
  nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
  noise.connect(filter);
  filter.connect(nGain);
  nGain.connect(out);
  noise.start(now + 0.02);
  noise.stop(now + 0.09);
}

/** 9b. Gentle tonearm lift click */
export function playVinylLiftSound(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(280, now);
  osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.16, now + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
  osc.connect(gain);
  gain.connect(out);
  osc.start(now);
  osc.stop(now + 0.06);
}

/** 10. Delicate wheel/petal tick for Who Starts */
export function playWheelTickSound(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(720, now);
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.03);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
  osc.connect(gain);
  gain.connect(out);
  osc.start(now);
  osc.stop(now + 0.04);
}

/** 11. Polaroid paper flick sound */
export function playPaperFlickSound(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const bufferSize = Math.floor(ctx.sampleRate * 0.12);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const env = Math.pow(1 - i / bufferSize, 1.8);
    data[i] = (Math.random() * 2 - 1) * env;
  }

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const hp = ctx.createBiquadFilter();
  hp.type = 'bandpass';
  hp.frequency.setValueAtTime(1600, now);
  hp.frequency.exponentialRampToValueAtTime(900, now + 0.11);
  hp.Q.value = 1.6;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.42, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  src.connect(hp);
  hp.connect(gain);
  gain.connect(out);
  src.start(now);
  src.stop(now + 0.13);
}

/** 12. Rising-pitch tick when adjusting or pumping the night rating */
export function playRatingTick(value: number): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const logRatio = Math.min(1, Math.log10(Math.max(1, value + 1)) / 4); // 0..1 from 0 to 10,000
  const freq = 340 + logRatio * 960;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = value >= 100 ? 'triangle' : 'sine';
  osc.frequency.setValueAtTime(freq, now);
  osc.frequency.exponentialRampToValueAtTime(freq * 1.18, now + 0.036);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.22, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

  osc.connect(gain);
  gain.connect(out);
  osc.start(now);
  osc.stop(now + 0.05);
}

/** 13. Wax-seal thump + warm chime when hiding Partner 1's rating */
export function playEnvelopeSealSound(): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  // Soft wax seal press
  const thump = ctx.createOscillator();
  const thumpGain = ctx.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(175, now);
  thump.frequency.exponentialRampToValueAtTime(62, now + 0.11);
  thumpGain.gain.setValueAtTime(0.001, now);
  thumpGain.gain.linearRampToValueAtTime(0.38, now + 0.01);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
  thump.connect(thumpGain);
  thumpGain.connect(out);
  thump.start(now);
  thump.stop(now + 0.14);

  // Secret chime
  [523.25, 659.25].forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + 0.09 + idx * 0.06;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
    osc.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(start + 0.48);
  });
}

/** 14. Rapid count-up / slot-machine rise tick during rating reveal */
export function playCountUpTick(progress: number): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;
  const p = Math.max(0, Math.min(1, progress));
  const freq = 420 + p * 660;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.032);
  osc.connect(gain);
  gain.connect(out);
  osc.start(now);
  osc.stop(now + 0.038);
}

/** 15. Short romantic celebratory fanfare for high/legendary reveals */
export function playCelebrationFanfare(intense: boolean = false): void {
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  const now = ctx.currentTime;

  const notes = intense
    ? [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98]
    : [440, 554.37, 659.25, 880];

  notes.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + idx * (intense ? 0.065 : 0.08);
    osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(f, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(intense ? 0.32 : 0.24, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + (intense ? 0.95 : 0.7));

    osc.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(start + 1.0);
  });
}

export function triggerSecondVibration(sec: number): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      if (sec <= 0) {
        navigator.vibrate([170, 50, 140]);
      } else {
        navigator.vibrate(42 + Math.max(0, 5 - sec) * 14);
      }
    }
  } catch {
    // Ignore unsupported environments
  }
}

export function triggerGentleVibration(): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([120, 60, 120]);
    }
  } catch {
    // Ignore unsupported environments
  }
}

export function formatSecondsMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatPlayerTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function formatArabicDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  if (safe < 60) return `${safe} ثانية`;
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins < 60) {
    return secs > 0 ? `${mins} دقيقة و ${secs} ثانية` : `${mins} دقيقة`;
  }
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs} ساعة و ${remMins} دقيقة` : `${hrs} ساعة`;
}
