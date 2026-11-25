import { motion, useReducedMotion } from 'motion/react';
import {
  Heart,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  pauseSong,
  playSong,
  retrySong,
  seekSong,
  setUserSongVolume,
  subscribeSongPlayer,
  toggleSongMute,
  type SongPlayerState,
} from '../utils/audioPlayer';
import { resolveSongTitle } from '../utils/songTitle';
import {
  formatPlayerTime,
  playHeartPopSound,
  playTapSound,
  playVinylDropSound,
  playVinylLiftSound,
} from '../utils/sound';

interface MusicPlayerBarProps {
  challengeId: string;
  audioUrl: string;
  songTitle?: string;
  trackIndex?: number;
  totalTracks?: number;
  onPrevTrack?: () => void;
  onNextTrack?: () => void;
  canGoPrev?: boolean;
  canGoNext?: boolean;
  onPrevChallenge?: () => void;
  onNextChallenge?: () => void;
  previewMode?: boolean;
}

const LIKES_STORAGE_KEY = 'sahra_liked_songs_v1';
const MAX_VINYL_DEG_PER_SEC = 132;
const RTL_CHAR_RE = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;

function readLike(id: string): boolean {
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY);
    if (!raw) return false;
    const map = JSON.parse(raw) as Record<string, boolean>;
    return Boolean(map[id]);
  } catch {
    return false;
  }
}

function writeLike(id: string, val: boolean): void {
  try {
    const raw = localStorage.getItem(LIKES_STORAGE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    map[id] = val;
    localStorage.setItem(LIKES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

export function MusicPlayerBar({
  challengeId,
  audioUrl,
  songTitle,
  trackIndex = 0,
  totalTracks = 1,
  onPrevTrack,
  onNextTrack,
  canGoPrev = false,
  canGoNext = true,
  onPrevChallenge,
  onNextChallenge,
  previewMode = false,
}: MusicPlayerBarProps) {
  const prefersReducedMotion = useReducedMotion();
  const [liked, setLiked] = useState<boolean>(() => readLike(challengeId));
  const [likePopKey, setLikePopKey] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewTime, setPreviewTime] = useState(32);
  const [volumeExpanded, setVolumeExpanded] = useState(false);

  const [songState, setSongState] = useState<SongPlayerState>({
    url: audioUrl,
    status: 'paused',
    currentTime: 0,
    duration: 0,
    isBuffering: false,
    errorMessage: null,
    userVolume: 1,
    userMuted: false,
    challengeVolume: 1,
    fadeFactor: 1,
    endedSeq: 0,
  });

  useEffect(() => {
    setLiked(readLike(challengeId));
  }, [challengeId]);

  useEffect(() => {
    if (previewMode) return;
    return subscribeSongPlayer(setSongState);
  }, [previewMode]);

  const isPlaying = previewMode ? previewPlaying : songState.status === 'playing';
  const isBuffering = previewMode
    ? false
    : songState.isBuffering || songState.status === 'loading';
  const hasError = previewMode ? false : songState.status === 'error';
  const isEnded = previewMode ? false : songState.status === 'ended';

  const duration = previewMode ? 195 : songState.duration;
  const currentTime = previewMode ? previewTime : songState.currentTime;
  const displayDuration = duration > 0 ? duration : 195;
  const remaining = Math.max(0, displayDuration - currentTime);
  const progressPercent =
    displayDuration > 0
      ? Math.max(0, Math.min(100, (currentTime / displayDuration) * 100))
      : 0;
  const progressRatio = progressPercent / 100;

  const resolvedTitle = useMemo(
    () => resolveSongTitle(songTitle, audioUrl),
    [songTitle, audioUrl]
  );
  const isTitleRtl = useMemo(() => RTL_CHAR_RE.test(resolvedTitle), [resolvedTitle]);

  // Marquee overflow measurement (RTL-aware)
  const titleViewportRef = useRef<HTMLDivElement | null>(null);
  const titleTextRef = useRef<HTMLSpanElement | null>(null);
  const [marqueeDeltaPx, setMarqueeDeltaPx] = useState(0);

  const measureMarquee = useCallback(() => {
    const vp = titleViewportRef.current;
    const tx = titleTextRef.current;
    if (!vp || !tx) return;
    const diff = tx.scrollWidth - vp.clientWidth;
    if (diff > 6) {
      // In RTL, clipped text sits on the left, so shifting +diff moves it into view.
      // In LTR, clipped text sits on the right, so shifting -diff moves it into view.
      setMarqueeDeltaPx(isTitleRtl ? diff + 8 : -(diff + 8));
    } else {
      setMarqueeDeltaPx(0);
    }
  }, [isTitleRtl]);

  useLayoutEffect(() => {
    measureMarquee();
  }, [resolvedTitle, measureMarquee]);

  useEffect(() => {
    const vp = titleViewportRef.current;
    if (!vp || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measureMarquee);
    ro.observe(vp);
    return () => ro.disconnect();
  }, [measureMarquee]);

  // Realistic vinyl physics loop (smooth spin-up, smooth coast-down, slows with fade-out)
  const vinylRef = useRef<HTMLDivElement | null>(null);
  const sheenRef = useRef<HTMLDivElement | null>(null);
  const reducedDotRef = useRef<HTMLDivElement | null>(null);
  const angleRef = useRef(0);
  const velocityRef = useRef(0);
  const targetVelRef = useRef(0);

  const fadeFactor = previewMode ? 1 : songState.fadeFactor;
  if (isPlaying && !isBuffering && !hasError && !isEnded) {
    targetVelRef.current = MAX_VINYL_DEG_PER_SEC * Math.max(0.08, fadeFactor);
  } else {
    targetVelRef.current = 0;
  }

  useEffect(() => {
    if (prefersReducedMotion) {
      if (vinylRef.current) {
        vinylRef.current.style.transform = 'rotate(0deg)';
      }
      if (!isPlaying || isBuffering || hasError || isEnded) return;
      // Gentle stepped indicator dot on center label under reduced motion
      const dotInterval = window.setInterval(() => {
        angleRef.current = (angleRef.current + 30) % 360;
        if (reducedDotRef.current) {
          reducedDotRef.current.style.transform = `rotate(${angleRef.current}deg)`;
        }
      }, 450);
      return () => window.clearInterval(dotInterval);
    }

    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;

      const target = targetVelRef.current;
      const curVel = velocityRef.current;
      // Motor torque accelerates smoothly (~0.7s); platter inertia coasts gracefully (~1.1s)
      const rate = target > curVel ? 3.5 : 2.1;
      const nextVel = curVel + (target - curVel) * (1 - Math.exp(-rate * dt));
      velocityRef.current = Math.abs(nextVel) < 0.35 && target === 0 ? 0 : nextVel;

      if (velocityRef.current > 0) {
        angleRef.current = (angleRef.current + velocityRef.current * dt) % 360;
        if (vinylRef.current) {
          vinylRef.current.style.transform = `rotate(${angleRef.current.toFixed(2)}deg)`;
        }
        if (sheenRef.current) {
          // Subtle counter-shimmering light reflection across the grooves
          const shimmerDeg = Math.sin((angleRef.current * Math.PI) / 180) * 14;
          sheenRef.current.style.transform = `rotate(${shimmerDeg.toFixed(2)}deg)`;
        }
      }

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [hasError, isBuffering, isEnded, isPlaying, prefersReducedMotion]);

  // Tonearm angle state:
  // - rest (paused/ended/error): -25deg
  // - buffering: -6deg (hovering over rim)
  // - playing: sweeps smoothly inward from +3deg to +19deg with progressRatio
  const tonearmDeg = hasError
    ? -25
    : isBuffering
      ? -5
      : isPlaying && !isEnded
        ? 3 + progressRatio * 16
        : -25;
  const tonearmHoverLift = isBuffering && !hasError;
  const isStylusOnVinyl = isPlaying && !isBuffering && !hasError && !isEnded;

  // Seekable Groove Progress (click & drag via pointer events)
  const grooveRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [dragPercent, setDragPercent] = useState(0);

  const displayedPercent = isDraggingSeek ? dragPercent : progressPercent;

  const seekFromClientX = useCallback(
    (clientX: number, commit: boolean) => {
      const el = grooveRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      setDragPercent(ratio * 100);
      if (commit) {
        const targetSec = ratio * displayDuration;
        if (previewMode) {
          setPreviewTime(targetSec);
        } else {
          seekSong(targetSec);
        }
      }
    },
    [displayDuration, previewMode]
  );

  const handleTogglePlay = () => {
    if (previewMode) {
      const next = !previewPlaying;
      if (next) playVinylDropSound();
      else playVinylLiftSound();
      setPreviewPlaying(next);
      return;
    }
    if (isPlaying) {
      playVinylLiftSound();
      pauseSong();
    } else {
      playVinylDropSound();
      void playSong(audioUrl);
    }
  };

  const handleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikePopKey((k) => k + 1);
    writeLike(challengeId, next);
    playHeartPopSound();
  };

  const effectiveVol = songState.userMuted ? 0 : songState.userVolume;

  // Reusable Vinyl + Tonearm Platter Assembly
  const renderPlatter = (compact: boolean) => (
    <div
      className={`relative shrink-0 flex items-center justify-center rounded-xl border border-[#B98A9E]/20 bg-[#0B0410] shadow-[inset_0_3px_12px_rgba(0,0,0,0.9)] ${
        compact ? 'h-[86px] w-[86px]' : 'h-[158px] w-[158px]'
      }`}
    >
      {/* Platter recessed ring */}
      <div
        className={`relative rounded-full bg-[#09030D] border border-[#5A4236]/55 shadow-[0_8px_18px_rgba(0,0,0,0.9)] flex items-center justify-center ${
          compact ? 'h-[76px] w-[76px]' : 'h-[142px] w-[142px]'
        }`}
      >
        {/* Spinning Vinyl Disc */}
        <div
          ref={vinylRef}
          className="relative h-[94%] w-[94%] rounded-full overflow-hidden shadow-[inset_0_0_6px_rgba(255,255,255,0.12)]"
          style={{
            backgroundImage:
              'repeating-radial-gradient(circle at center, #08030C 0px, #08030C 1.4px, #1D1125 2.1px, #0C0512 3.1px)',
          }}
        >
          {/* Groove index marker notch so spinning rotation reads visibly */}
          <span
            aria-hidden="true"
            className="absolute top-[10%] left-1/2 -translate-x-1/2 h-[8%] w-[2px] rounded-full bg-[#F4E8D8]/20"
          />

          {/* Neon-Rose Center Label with tiny flame-heart mark */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[38%] w-[38%] rounded-full border border-[#F4E8D8]/65 flex items-center justify-center shadow-[0_0_10px_rgba(255,77,141,0.55)]"
            style={{
              background:
                'radial-gradient(circle at 35% 30%, #FF70A6 0%, #FF4D8D 55%, #9B184B 100%)',
            }}
          >
            {/* Inner ring */}
            <div className="h-[74%] w-[74%] rounded-full border border-[#F4E8D8]/40 flex items-center justify-center relative">
              {/* Tiny flame-heart mark */}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className={compact ? 'h-3 w-3' : 'h-4 w-4'}
              >
                <path
                  d="M12 20.5c-3.8-3.1-6.8-5.9-6.8-9.3 0-2.1 1.6-3.7 3.6-3.7 1.2 0 2.3.6 3.2 1.6.9-1 2-1.6 3.2-1.6 2 0 3.6 1.6 3.6 3.7 0 3.4-3 6.2-6.8 9.3z"
                  fill="#14081A"
                  fillOpacity="0.88"
                />
                <path
                  d="M12 5.4c.5 1.1 1.4 1.8 1.4 2.9 0 .8-.6 1.4-1.4 1.4s-1.4-.6-1.4-1.4c0-1.1.9-1.8 1.4-2.9z"
                  fill="#F4E8D8"
                />
              </svg>

              {/* Reduced-motion orbiting dot indicator */}
              {prefersReducedMotion && (
                <div
                  ref={reducedDotRef}
                  className="pointer-events-none absolute inset-0"
                >
                  <span
                    className={`absolute top-0.5 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full transition-opacity ${
                      isStylusOnVinyl
                        ? 'bg-[#F4E8D8] opacity-100 shadow-[0_0_4px_#F4E8D8]'
                        : 'bg-[#F4E8D8] opacity-30'
                    }`}
                  />
                </div>
              )}
            </div>

            {/* Metallic spindle pin */}
            <span
              aria-hidden="true"
              className="absolute h-1.5 w-1.5 rounded-full bg-[#F4E8D8] ring-1 ring-[#14081A]/60 shadow-sm"
            />
          </div>
        </div>

        {/* Moving Light Reflection Overlay */}
        <div
          ref={sheenRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-[3%] rounded-full opacity-45 mix-blend-screen"
          style={{
            background:
              'conic-gradient(from 38deg, transparent 0deg, rgba(244,232,216,0.22) 22deg, transparent 48deg, transparent 180deg, rgba(255,122,61,0.16) 202deg, transparent 228deg)',
          }}
        />
      </div>

      {/* Tonearm Pivot & Mechanical Arm (Top-Right of platter) */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute z-20 ${
          compact ? 'top-1.5 right-1.5' : 'top-2.5 right-2.5'
        }`}
      >
        {/* Brass Gimbal Base */}
        <div
          className={`relative rounded-full border border-[#F4E8D8]/35 bg-gradient-to-br from-[#D4A373] via-[#8C5E35] to-[#4A2E17] shadow-md flex items-center justify-center ${
            compact ? 'h-4 w-4' : 'h-6 w-6'
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#14081A]/80" />

          {/* Pivoting Arm */}
          <motion.div
            style={{ transformOrigin: '50% 6px' }}
            animate={
              prefersReducedMotion
                ? { rotate: tonearmDeg, y: 0 }
                : {
                    rotate: tonearmDeg,
                    y: tonearmHoverLift ? -2 : 0,
                  }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0.15 }
                : {
                    rotate: { type: 'spring', stiffness: 230, damping: 16, mass: 0.85 },
                    y: { duration: 0.25 },
                  }
            }
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[6px] flex flex-col items-center ${
              compact ? 'w-3 h-[56px]' : 'w-4 h-[102px]'
            }`}
          >
            {/* Counterweight tail */}
            <div
              className={`rounded-sm bg-[#7A5438] border border-[#F4E8D8]/25 ${
                compact ? 'h-1.5 w-2 -mt-1.5' : 'h-2.5 w-3 -mt-2'
              }`}
            />
            {/* Slim dark-metal / brass tube */}
            <div
              className={`flex-1 rounded-full bg-gradient-to-b from-[#D4A373] via-[#9E94A0] to-[#564B5C] shadow-[1px_3px_6px_rgba(0,0,0,0.7)] ${
                compact ? 'w-[2px]' : 'w-[3px]'
              }`}
            />
            {/* Angled headshell + glowing stylus tip */}
            <div
              className={`relative -rotate-[18deg] origin-top rounded-[2px] bg-[#1D0B24] border border-[#D4A373]/75 shadow-md flex items-end justify-center ${
                compact ? 'h-3 w-2' : 'h-4 w-2.5'
              }`}
            >
              <span
                className={`mb-[-2px] h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                  isStylusOnVinyl
                    ? 'bg-[#FF7A3D] shadow-[0_0_8px_#FF7A3D,0_0_14px_#FF4D8D]'
                    : tonearmHoverLift
                      ? 'bg-[#FF4D8D] shadow-[0_0_6px_#FF4D8D]'
                      : 'bg-[#B98A9E]/55'
                }`}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Subtle Loading Spinner Overlay when Buffering */}
      {isBuffering && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-[#0B0410]/35"
        >
          <Loader2 className="h-5 w-5 animate-spin text-[#FF7A3D] drop-shadow-[0_0_8px_rgba(255,122,61,0.8)]" />
        </div>
      )}
    </div>
  );

  // Reusable Info + Groove Seek + Controls Stack
  const renderDeckRight = (compact: boolean) => (
    <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
      {/* Top Meta Row: "الآن يُعزف" + 5 Equalizer Bars + Desktop Hover Volume */}
      <div className="flex items-center justify-between gap-2">
        <div dir="rtl" className="flex items-center gap-2 min-w-0">
          <span className="inline-block rounded-[3px] border border-[#FF4D8D]/40 bg-[#FF4D8D]/12 px-1.5 py-0.5 text-[10px] font-bold text-[#F4E8D8] whitespace-nowrap">
            {hasError
              ? 'تعذّر التشغيل'
              : isBuffering
                ? 'جاري التحميل'
                : isEnded
                  ? 'انتهت الأغنية'
                  : 'الآن يُعزف'}
          </span>

          {/* 5 CSS-only Equalizer Bars */}
          <div
            aria-hidden="true"
            className={`flex items-end gap-[2.5px] h-3.5 ${
              isStylusOnVinyl ? 'turntable-eq-playing' : ''
            }`}
          >
            {[0, 1, 2, 3, 4].map((bar) => (
              <span
                key={bar}
                className="turntable-eq-bar w-[2.5px] h-full rounded-full bg-gradient-to-t from-[#FF4D8D] to-[#FF7A3D]"
              />
            ))}
          </div>

          {totalTracks > 1 && (
            <div className="inline-flex items-center gap-0.5 rounded-full border border-[#B98A9E]/25 bg-[#120618] px-1 py-0.5 text-[10px] font-bold text-[#F4E8D8] tabular-nums shrink-0">
              {onPrevTrack && (
                <button
                  type="button"
                  disabled={!previewMode && trackIndex <= 0}
                  onClick={() => {
                    playTapSound();
                    onPrevTrack();
                  }}
                  aria-label="الأغنية السابقة في القائمة"
                  className="px-1 text-[#B98A9E] hover:text-[#FF7A3D] disabled:opacity-30 cursor-pointer"
                >
                  ‹
                </button>
              )}
              <span className="px-0.5">
                {trackIndex + 1}/{totalTracks}
              </span>
              {onNextTrack && (
                <button
                  type="button"
                  disabled={!previewMode && trackIndex >= totalTracks - 1}
                  onClick={() => {
                    playTapSound();
                    onNextTrack();
                  }}
                  aria-label="الأغنية التالية في القائمة"
                  className="px-1 text-[#B98A9E] hover:text-[#FF7A3D] disabled:opacity-30 cursor-pointer"
                >
                  ›
                </button>
              )}
            </div>
          )}
        </div>

        {/* Desktop Volume Control (expands on hover/focus with mute icon) */}
        {!compact && (
          <div
            onMouseEnter={() => setVolumeExpanded(true)}
            onMouseLeave={() => setVolumeExpanded(false)}
            onFocusCapture={() => setVolumeExpanded(true)}
            onBlurCapture={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setVolumeExpanded(false);
              }
            }}
            className="hidden lg:flex items-center gap-1 rounded-full border border-[#B98A9E]/25 bg-[#120618] px-1.5 py-1 transition-all"
          >
            <button
              type="button"
              onClick={() => {
                playTapSound();
                toggleSongMute();
              }}
              aria-label={songState.userMuted || effectiveVol === 0 ? 'إلغاء كتم الأغنية' : 'كتم الأغنية'}
              className="h-5 w-5 flex items-center justify-center text-[#B98A9E] hover:text-[#F4E8D8] cursor-pointer focus:outline-none"
            >
              {songState.userMuted || effectiveVol === 0 ? (
                <VolumeX className="h-3.5 w-3.5 text-[#FF4D8D]" />
              ) : effectiveVol < 0.5 ? (
                <Volume1 className="h-3.5 w-3.5" />
              ) : (
                <Volume2 className="h-3.5 w-3.5" />
              )}
            </button>

            <div
              className={`overflow-hidden transition-all duration-200 flex items-center ${
                volumeExpanded ? 'w-14 opacity-100 pr-0.5' : 'w-0 opacity-0'
              }`}
            >
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={effectiveVol}
                aria-label="مستوى صوت الأغنية"
                onChange={(e) => setUserSongVolume(Number(e.target.value))}
                className="w-14 accent-[#FF7A3D] h-1 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>

      {/* Song Title (RTL-aware marquee scroll when overflowing) */}
      <div
        ref={titleViewportRef}
        dir={isTitleRtl ? 'rtl' : 'ltr'}
        className="relative w-full overflow-hidden my-1"
      >
        <span
          ref={titleTextRef}
          style={
            marqueeDeltaPx !== 0
              ? ({ '--marquee-delta': `${marqueeDeltaPx}px` } as React.CSSProperties)
              : undefined
          }
          className={`inline-block whitespace-nowrap font-bold text-[#F4E8D8] ${
            compact ? 'text-xs' : 'text-[13px]'
          } ${
            marqueeDeltaPx !== 0 && !prefersReducedMotion
              ? 'turntable-marquee-active'
              : ''
          }`}
        >
          {resolvedTitle}
        </span>
      </div>

      {/* Seekable Groove Progress Bar + Small Heart Handle */}
      <div>
        <div
          ref={grooveRef}
          role="slider"
          tabIndex={0}
          aria-label="تقديم أو تأخير الأغنية"
          aria-valuemin={0}
          aria-valuemax={Math.round(displayDuration)}
          aria-valuenow={Math.round(currentTime)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              seekSong(currentTime + 5);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              seekSong(currentTime - 5);
            }
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            setIsDraggingSeek(true);
            seekFromClientX(e.clientX, false);
          }}
          onPointerMove={(e) => {
            if (!isDraggingSeek) return;
            seekFromClientX(e.clientX, false);
          }}
          onPointerUp={(e) => {
            if (!isDraggingSeek) return;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              e.currentTarget.releasePointerCapture(e.pointerId);
            }
            setIsDraggingSeek(false);
            seekFromClientX(e.clientX, true);
          }}
          onPointerCancel={() => setIsDraggingSeek(false)}
          className="relative flex items-center h-5 cursor-pointer touch-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D] rounded"
        >
          {/* Recessed Vinyl Groove Track */}
          <div className="w-full h-[5px] rounded-full bg-[#09030D] border border-[#B98A9E]/20 shadow-[inset_0_1px_3px_rgba(0,0,0,0.9)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FF4D8D] to-[#FF7A3D]"
              style={{ width: `${displayedPercent}%` }}
            />
          </div>

          {/* Small Heart Handle */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-transform"
            style={{
              left: `${displayedPercent}%`,
              transform: `translate(-50%, -50%) scale(${isDraggingSeek ? 1.2 : 1})`,
            }}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5 drop-shadow-[0_0_6px_rgba(255,77,141,0.9)]"
            >
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="#FF4D8D"
                stroke="#F4E8D8"
                strokeWidth="1.6"
              />
            </svg>
          </div>
        </div>

        {/* Elapsed / -Remaining Time */}
        <div className="flex items-center justify-between text-[10px] text-[#B98A9E] tabular-nums -mt-0.5">
          <span>{formatPlayerTime(currentTime)}</span>
          <span>-{formatPlayerTime(remaining)}</span>
        </div>
      </div>

      {/* Controls or Friendly Error Row */}
      {hasError ? (
        <div
          dir="rtl"
          className="mt-1.5 pt-1.5 border-t border-[#FF4D8D]/25 flex items-center justify-between gap-2"
        >
          <span className="text-[11px] font-semibold text-[#FF7A3D] truncate">
            تعذّر تشغيل الأغنية
          </span>
          <button
            type="button"
            onClick={() => {
              playTapSound();
              retrySong();
            }}
            className="min-h-[32px] px-2.5 py-1 rounded-lg border border-[#FF4D8D]/45 bg-[#FF4D8D]/15 hover:bg-[#FF4D8D]/25 text-[11px] font-bold text-[#F4E8D8] inline-flex items-center gap-1 cursor-pointer shrink-0"
          >
            <RotateCcw className="h-3 w-3" />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      ) : (
        <div className="mt-1 flex items-center justify-between gap-1">
          {/* Heart Like Button with pop animation */}
          <motion.button
            key={likePopKey}
            type="button"
            onClick={handleLike}
            aria-label={liked ? 'إزالة الإعجاب' : 'إعجاب بالأغنية'}
            animate={
              likePopKey > 0 && !prefersReducedMotion
                ? { scale: [1, 1.38, 0.9, 1] }
                : { scale: 1 }
            }
            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            className="min-h-[36px] min-w-[34px] flex items-center justify-center rounded-lg hover:bg-white/5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D]"
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                liked
                  ? 'fill-[#FF4D8D] text-[#FF4D8D] drop-shadow-[0_0_6px_rgba(255,77,141,0.7)]'
                  : 'text-[#B98A9E] hover:text-[#F4E8D8]'
              }`}
            />
          </motion.button>

          {/* Previous Challenge */}
          <button
            type="button"
            disabled={!previewMode && !canGoPrev}
            onClick={() => {
              playTapSound();
              onPrevChallenge?.();
            }}
            aria-label="التحدي السابق"
            className="min-h-[36px] min-w-[34px] flex items-center justify-center rounded-lg text-[#F4E8D8]/85 hover:text-[#FF7A3D] disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A3D]"
          >
            <SkipBack className="h-4 w-4 fill-current" />
          </button>

          {/* Large Circular Play/Pause with Ember Neon Ring & Tactile Press */}
          <motion.button
            type="button"
            whileTap={prefersReducedMotion ? undefined : { scale: 0.91 }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
            onClick={handleTogglePlay}
            aria-label={isPlaying ? 'إيقاف الأغنية' : 'تشغيل الأغنية'}
            className={`relative rounded-full bg-[#1F0B29] text-[#F4E8D8] flex items-center justify-center border-2 border-[#FF7A3D] cursor-pointer transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4E8D8] ${
              compact ? 'h-9 w-9' : 'h-11 w-11'
            }`}
            style={{
              boxShadow: isStylusOnVinyl
                ? '0 0 18px rgba(255, 77, 141, 0.58), inset 0 0 10px rgba(255, 122, 61, 0.35)'
                : '0 0 12px rgba(255, 122, 61, 0.38), inset 0 0 8px rgba(255, 77, 141, 0.2)',
            }}
          >
            {isBuffering ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#FF7A3D]" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 fill-current text-[#F4E8D8]" />
            ) : (
              <Play className="h-4 w-4 fill-current text-[#F4E8D8] translate-x-[1px]" />
            )}
          </motion.button>

          {/* Next Challenge (respects timer lock) */}
          <button
            type="button"
            disabled={!previewMode && !canGoNext}
            onClick={() => {
              if (!previewMode && !canGoNext) return;
              playTapSound();
              onNextChallenge?.();
            }}
            aria-label="التحدي التالي"
            title={
              !previewMode && !canGoNext
                ? 'الانتقال متاح بعد انتهاء المؤقت'
                : 'التحدي التالي'
            }
            className="min-h-[36px] min-w-[34px] flex items-center justify-center rounded-lg text-[#F4E8D8]/85 hover:text-[#FF7A3D] disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A3D]"
          >
            <SkipForward className="h-4 w-4 fill-current" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div
      dir="ltr"
      className={`relative rounded-[12px] border border-[#B98A9E]/30 bg-gradient-to-br from-[#1C0A24] via-[#15081B] to-[#0E0513] text-[#F4E8D8] shadow-[0_20px_38px_-10px_rgba(0,0,0,0.92),0_4px_12px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(244,232,216,0.1)] select-none ${
        previewMode
          ? 'w-full max-w-[330px] p-3'
          : 'w-full max-w-[332px] p-3 lg:w-[340px] lg:h-[220px] lg:p-3.5'
      }`}
    >
      {/* Tiny corner brass screws for tabletop hardware realism */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-2 left-2 h-1.5 w-1.5 rounded-full bg-[#B98A9E]/35"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#B98A9E]/35"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-[#B98A9E]/35"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-[#B98A9E]/35"
      />

      {/* Desktop 340x220 Turntable vs Compact Mobile Horizontal Layout */}
      <div className="h-full flex items-center gap-3.5">
        {/* Desktop Full Turntable Platter */}
        {!previewMode && (
          <div className="hidden lg:block">{renderPlatter(false)}</div>
        )}
        {/* Compact Horizontal Platter for Mobile & Admin Preview */}
        <div className={previewMode ? 'block' : 'block lg:hidden'}>
          {renderPlatter(true)}
        </div>

        {/* Desktop Deck Right vs Compact */}
        {!previewMode && (
          <div className="hidden lg:flex flex-1 min-w-0 h-full">
            {renderDeckRight(false)}
          </div>
        )}
        <div className={`${previewMode ? 'flex' : 'flex lg:hidden'} flex-1 min-w-0 h-full`}>
          {renderDeckRight(true)}
        </div>
      </div>
    </div>
  );
}
