import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  Clock,
  Feather,
  Lock,
  Pause,
  Play,
  SkipForward,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  getCategoryMeta,
  getHeatMeta,
  type Challenge,
  type ChallengeSong,
} from '../types';
import { getChallengeManualSongs } from '../utils/playlist';
import {
  formatSecondsMMSS,
  playHoverSound,
  playSparkSound,
  playTapSound,
} from '../utils/sound';
import { MusicPlayerBar } from './MusicPlayerBar';
import { PolaroidFrame } from './PolaroidFrame';

interface ChallengeStageProps {
  challenge: Challenge;
  displayText: string;
  displayBackNote?: string;
  remainingSeconds: number;
  totalSeconds: number;
  timerFinished: boolean;
  hasStarted: boolean;
  isTimerPaused: boolean;
  heartBurstKey: number;
  finishBurstKey?: number;
  tensionSecond?: number | null;
  tensionMaxSecond?: number;
  candleMode?: boolean;
  canGoPrev?: boolean;
  polaroidFlipKey?: number;
  showKeyHints?: boolean;
  playlist?: ChallengeSong[];
  activeTrackIndex?: number;
  onPrevTrack?: () => void;
  onNextTrack?: () => void;
  onStart: () => void;
  onTogglePauseTimer: () => void;
  onSkip: () => void;
  onNext: () => void;
  onPrevChallenge?: () => void;
  onOpenComfort?: () => void;
  previewMode?: boolean;
}

const BURST_PARTICLES = [
  { x: -46, y: -32, scale: 0.9, delay: 0 },
  { x: 48, y: -28, scale: 1.0, delay: 0.03 },
  { x: -24, y: -48, scale: 0.8, delay: 0.05 },
  { x: 24, y: -44, scale: 0.85, delay: 0.02 },
  { x: 0, y: -56, scale: 1.1, delay: 0.04 },
  { x: -58, y: 8, scale: 0.75, delay: 0.06 },
  { x: 58, y: 10, scale: 0.8, delay: 0.05 },
];

export function ChallengeStage({
  challenge,
  displayText,
  displayBackNote = '',
  remainingSeconds,
  totalSeconds,
  timerFinished,
  hasStarted,
  isTimerPaused,
  heartBurstKey,
  finishBurstKey = 0,
  tensionSecond = null,
  tensionMaxSecond = 5,
  candleMode = false,
  canGoPrev = false,
  polaroidFlipKey = 0,
  showKeyHints = false,
  playlist,
  activeTrackIndex = 0,
  onPrevTrack,
  onNextTrack,
  onStart,
  onTogglePauseTimer,
  onSkip,
  onNext,
  onPrevChallenge,
  onOpenComfort,
  previewMode = false,
}: ChallengeStageProps) {
  const prefersReducedMotion = useReducedMotion();
  const [nextSparkKey, setNextSparkKey] = useState(0);

  const noteContainerRef = useRef<HTMLDivElement | null>(null);
  const noteTextRef = useRef<HTMLParagraphElement | null>(null);
  const lastFitSigRef = useRef<string>('');
  const [fittedFontPx, setFittedFontPx] = useState<number>(28);
  const [needsInnerScroll, setNeedsInnerScroll] = useState(false);

  const effectivePlaylist = playlist ?? getChallengeManualSongs(challenge);
  const safeTrackIndex =
    effectivePlaylist.length > 0
      ? Math.max(0, Math.min(activeTrackIndex, effectivePlaylist.length - 1))
      : 0;
  const activeTrack = effectivePlaylist[safeTrackIndex];

  const hasTimer =
    typeof challenge.timerMinutes === 'number' && challenge.timerMinutes > 0;
  const hasAudio = effectivePlaylist.length > 0;
  const hasMedia = Boolean(
    challenge.imageUrl && challenge.imageUrl.trim().length > 0
  );
  const hasBackNote = Boolean(displayBackNote && displayBackNote.trim().length > 0);
  const showPolaroid = hasMedia || hasBackNote;

  const showStartArea = hasTimer || hasAudio;
  const isNextDisabled = hasTimer && remainingSeconds > 0;
  const heatMeta = getHeatMeta(challenge.heat);
  const categoryMeta = getCategoryMeta(challenge.category);

  const inTension = tensionSecond !== null;
  const tensionIntensity = inTension
    ? Math.max(1, tensionMaxSecond - tensionSecond + 1)
    : 0;
  const tremblePx = candleMode
    ? tensionIntensity * 0.55
    : tensionIntensity * 1.15;

  const formattedClock = formatSecondsMMSS(remainingSeconds);
  const [minsPart, secsPart] = formattedClock.split(':');

  // Circular progress ring math
  const ringRadius = 18;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const progressRatio =
    totalSeconds > 0
      ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds))
      : 0;
  const ringDashOffset = ringCircumference * (1 - progressRatio);

  const combinedFinishBurst = finishBurstKey + nextSparkKey;

  // Auto-fit challenge text inside the taped paper note so long text shrinks cleanly
  const recomputeTextFit = useCallback(() => {
    const container = noteContainerRef.current;
    const textEl = noteTextRef.current;
    if (!container || !textEl) return;

    const availHeight = container.clientHeight;
    const availWidth = container.clientWidth;
    if (availHeight <= 24) return;

    const sig = `${displayText}|${showPolaroid}|${previewMode}|${availWidth}|${availHeight}`;
    if (lastFitSigRef.current === sig) return;
    lastFitSigRef.current = sig;

    const isWide = typeof window !== 'undefined' && window.innerWidth >= 1024;
    const minPx = previewMode ? 16 : 18;
    const maxPx = previewMode
      ? 26
      : isWide
        ? showPolaroid
          ? 38
          : 44
        : showPolaroid
          ? 27
          : 32;

    let low = minPx;
    let high = maxPx;
    let best = minPx;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      textEl.style.fontSize = `${mid}px`;
      if (textEl.scrollHeight <= availHeight) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    textEl.style.fontSize = `${best}px`;
    setFittedFontPx(best);
    setNeedsInnerScroll(textEl.scrollHeight > availHeight + 2);
  }, [displayText, previewMode, showPolaroid]);

  useLayoutEffect(() => {
    recomputeTextFit();
  }, [recomputeTextFit]);

  useEffect(() => {
    const container = noteContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      recomputeTextFit();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [recomputeTextFit]);

  return (
    <motion.div
      dir="ltr"
      animate={
        inTension
          ? prefersReducedMotion
            ? { opacity: [1, 0.86, 1] }
            : {
                x: [-tremblePx, tremblePx, -tremblePx * 0.6, tremblePx * 0.6, 0],
                y: [tremblePx * 0.45, -tremblePx * 0.45, 0],
              }
          : { x: 0, y: 0, opacity: 1 }
      }
      transition={
        inTension
          ? { duration: 0.22, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.2 }
      }
      className={`relative w-full rounded-[18px] border bg-[#190A20]/94 p-4 sm:p-6 lg:px-10 lg:py-[clamp(0.75rem,1.8vh,1.5rem)] shadow-[0_28px_72px_-16px_rgba(0,0,0,0.9)] flex flex-col justify-between transition-colors ${
        previewMode
          ? 'min-h-[460px]'
          : 'min-h-[500px] lg:h-full lg:min-h-0'
      } ${
        inTension
          ? 'border-[#FF7A3D]/65 shadow-[0_28px_72px_-16px_rgba(255,87,51,0.35)]'
          : 'border-[#B98A9E]/25'
      }`}
    >
      {/* TOP BAR: Top-Left Timer, Center Meta + Comfort, Top-Right Music Player */}
      <div className="flex flex-wrap lg:flex-nowrap items-start justify-between gap-3 shrink-0">
        {/* Top-Left: Vintage Flip-Clock Timer */}
        <div className="shrink-0">
          {hasTimer ? (
            <div className="inline-flex items-center gap-2.5">
              <motion.div
                animate={
                  inTension && !prefersReducedMotion
                    ? { scale: [1, 1.12, 1] }
                    : { scale: 1 }
                }
                transition={
                  inTension ? { duration: 0.5, repeat: Infinity } : undefined
                }
                className={`flex h-10 w-10 items-center justify-center rounded-full border bg-[#120518] transition-colors ${
                  inTension
                    ? 'border-[#FF5733] text-[#FF5733] shadow-[0_0_20px_rgba(255,87,51,0.55)]'
                    : 'border-[#FF7A3D]/60 text-[#FF7A3D] shadow-[0_0_16px_rgba(255,122,61,0.28)]'
                }`}
              >
                <Clock className="h-5 w-5" />
              </motion.div>

              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="font-neon text-lg sm:text-xl leading-none tracking-wide text-[#F4E8D8]">
                    Timer
                  </span>
                </div>

                <motion.div
                  animate={
                    inTension
                      ? prefersReducedMotion
                        ? { opacity: [1, 0.6, 1] }
                        : { scale: [1, 1.07, 1], opacity: [1, 0.85, 1] }
                      : { scale: 1, opacity: 1 }
                  }
                  transition={
                    inTension ? { duration: 0.5, repeat: Infinity } : undefined
                  }
                  className="inline-flex items-center gap-1 tabular-nums"
                >
                  <div
                    className={`relative rounded-[4px] border px-2 py-0.5 text-base sm:text-lg font-bold shadow-inner transition-colors ${
                      inTension
                        ? 'bg-[#260811] border-[#FF5733]/80 text-[#FF7A3D]'
                        : timerFinished
                          ? 'bg-[#0E0412] border-[#FF7A3D]/60 text-[#FF7A3D]'
                          : 'bg-[#0E0412] border-[#B98A9E]/30 text-[#F4E8D8]'
                    }`}
                  >
                    {minsPart}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-1/2 h-[1px] bg-black/55"
                    />
                  </div>
                  <span
                    className={`text-sm font-bold ${
                      inTension ? 'text-[#FF5733]' : 'text-[#FF7A3D]'
                    }`}
                  >
                    :
                  </span>
                  <div
                    className={`relative rounded-[4px] border px-2 py-0.5 text-base sm:text-lg font-bold shadow-inner transition-colors ${
                      inTension
                        ? 'bg-[#260811] border-[#FF5733] text-[#FF5733]'
                        : timerFinished
                          ? 'bg-[#0E0412] border-[#FF4D8D]/65 text-[#FF4D8D]'
                          : 'bg-[#0E0412] border-[#B98A9E]/30 text-[#F4E8D8]'
                    }`}
                  >
                    {secsPart}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-0 top-1/2 h-[1px] bg-black/55"
                    />
                  </div>
                </motion.div>
              </div>
            </div>
          ) : (
            <div className="h-10 min-w-[44px]" aria-hidden="true" />
          )}
        </div>

        {/* Center Strip on Desktop: Heat · Comfort */}
        <div
          dir="rtl"
          className="order-3 lg:order-2 w-full lg:w-auto flex items-center justify-between lg:justify-center gap-3 px-1 pt-1 lg:pt-1.5"
        >
          <div className="flex items-center gap-2 text-xs sm:text-sm text-[#B98A9E]">
            <span className="font-semibold" style={{ color: heatMeta.color }}>
              {heatMeta.label}
            </span>
          </div>

          {onOpenComfort && (
            <button
              type="button"
              onClick={onOpenComfort}
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') playHoverSound();
              }}
              className="min-h-[40px] px-3.5 py-1 rounded-full border border-[#FF70A6]/30 bg-[#250E2A]/85 hover:border-[#FF70A6]/70 hover:bg-[#311238] text-[#F4E8D8]/90 text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF70A6]"
            >
              <Feather className="h-3.5 w-3.5 text-[#FF70A6]" />
              <span>براحتكم</span>
            </button>
          )}
        </div>

        {/* Top-Right: Midnight Turntable */}
        <div className="order-2 lg:order-3 w-full sm:w-auto shrink-0 flex justify-end">
          {hasAudio && activeTrack ? (
            <MusicPlayerBar
              challengeId={challenge.id}
              audioUrl={activeTrack.url}
              songTitle={activeTrack.title}
              trackIndex={safeTrackIndex}
              totalTracks={effectivePlaylist.length}
              onPrevTrack={onPrevTrack}
              onNextTrack={onNextTrack}
              canGoPrev={canGoPrev}
              canGoNext={!isNextDisabled}
              onPrevChallenge={onPrevChallenge}
              onNextChallenge={onNext}
              previewMode={previewMode}
            />
          ) : (
            <div className="h-10 min-w-[44px]" aria-hidden="true" />
          )}
        </div>
      </div>

      {/* MIDDLE LANDSCAPE TABLETOP SCENE */}
      <div
        className={`my-3 lg:my-2 flex-1 min-h-0 flex flex-col ${
          showPolaroid
            ? previewMode
              ? 'gap-4 items-center'
              : 'lg:flex-row lg:items-center lg:justify-between gap-5 lg:gap-10'
            : 'items-center justify-center'
        }`}
      >
        {/* Middle-Left (~45% width on desktop): Taped Cream Paper Note with Auto-Fitting Text */}
        <div
          dir="rtl"
          className={`relative w-full ${
            showPolaroid
              ? previewMode
                ? ''
                : 'lg:w-[45%] lg:shrink-0'
              : 'max-w-2xl mx-auto'
          }`}
        >
          <div
            aria-hidden="true"
            className="washi-tape absolute -top-2.5 right-6 z-20 h-5 w-16 -rotate-6 rounded-[2px]"
          />
          <div
            aria-hidden="true"
            className="washi-tape-cream absolute -top-2.5 left-6 z-20 h-5 w-14 rotate-6 rounded-[2px]"
          />

          <div
            className={`scrapbook-paper torn-edge-note relative px-5 pt-6 pb-7 sm:px-7 sm:pt-7 sm:pb-8 lg:px-8 lg:pt-6 lg:pb-7 -rotate-[0.8deg] flex items-center ${
              previewMode
                ? 'min-h-[140px]'
                : hasAudio
                  ? 'min-h-[160px] lg:h-[clamp(170px,30dvh,360px)]'
                  : 'min-h-[170px] lg:h-[clamp(200px,38dvh,390px)]'
            }`}
          >
            <div
              ref={noteContainerRef}
              className={`w-full ${
                previewMode
                  ? 'max-h-[190px]'
                  : hasAudio
                    ? 'max-h-[240px] lg:h-[clamp(135px,24dvh,290px)] lg:max-h-full'
                    : 'max-h-[260px] lg:h-[clamp(155px,30dvh,315px)] lg:max-h-full'
              } flex items-center ${
                needsInnerScroll
                  ? 'overflow-y-auto items-start scrapbook-scroll pl-1'
                  : 'overflow-hidden'
              }`}
            >
              <p
                ref={noteTextRef}
                style={{ fontSize: `${fittedFontPx}px` }}
                className={`w-full font-calligraphy font-bold text-[#1B0A22] leading-[1.65] text-balance ${
                  showPolaroid ? 'text-right' : 'text-center'
                }`}
              >
                {displayText || 'اكتب نص التحدي هنا لتظهر معاينته مباشرة...'}
              </p>
            </div>
          </div>
        </div>

        {/* Middle-Right: Big Swinging 3D Flippable Polaroid Clipped to String */}
        {showPolaroid && (
          <div
            className={`relative flex flex-col items-center justify-center ${
              previewMode ? 'w-full' : 'w-full lg:flex-1 lg:min-w-0'
            }`}
          >
            <PolaroidFrame
              challengeId={challenge.id}
              imageUrl={challenge.imageUrl}
              backNote={displayBackNote}
              nightTitle={categoryMeta.title}
              altText="وسائط التحدي الرومانسي"
              tensionLevel={tensionIntensity}
              candleMode={candleMode}
              externalFlipKey={polaroidFlipKey}
              previewMode={previewMode}
              compactForTurntable={hasAudio}
            />
            {showKeyHints && !previewMode && (
              <p
                dir="rtl"
                className="hidden lg:flex items-center gap-1.5 mt-1.5 text-[11px] text-[#B98A9E]/85 transition-opacity duration-500"
              >
                <span>لقلب الصورة</span>
                <kbd className="kbd-chip">F</kbd>
              </p>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM CENTER ACTIONS AREA */}
      <div className="shrink-0 w-full max-w-2xl mx-auto pt-1">
        {/* Start / Pause-Resume Primary Action */}
        {showStartArea && (
          <div dir="rtl" className="relative flex flex-col items-center mb-3 lg:mb-3.5">
            <AnimatePresence>
              {heartBurstKey > 0 && !prefersReducedMotion && (
                <div
                  key={`heart-burst-${heartBurstKey}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2 z-30"
                >
                  {BURST_PARTICLES.map((p, idx) => (
                    <motion.svg
                      key={`heart-p-${idx}`}
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
                      animate={{
                        x: p.x,
                        y: p.y,
                        scale: [0.3, p.scale, 0.2],
                        opacity: [1, 0.95, 0],
                      }}
                      transition={{
                        duration: 0.72,
                        delay: p.delay,
                        ease: 'easeOut',
                      }}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                    >
                      <path
                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                        fill={idx % 2 === 0 ? '#FF4D8D' : '#FF7A3D'}
                      />
                    </motion.svg>
                  ))}
                </div>
              )}
            </AnimatePresence>

            {!hasStarted ? (
              <motion.button
                type="button"
                whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') playHoverSound();
                }}
                onClick={onStart}
                className="btn-primary-ember btn-shimmer relative overflow-hidden min-h-[56px] lg:min-h-[60px] px-9 py-3 rounded-xl font-sans-ar font-bold text-base sm:text-lg inline-flex items-center justify-center gap-2.5 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4E8D8]"
              >
                <Sparkles className="h-5 w-5 shrink-0" />
                <span>ابدأ التحدي</span>
              </motion.button>
            ) : hasTimer && !timerFinished ? (
              <motion.button
                type="button"
                whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
                onClick={onTogglePauseTimer}
                className="min-h-[50px] px-7 py-2.5 rounded-xl border border-[#FF7A3D]/55 bg-[#1F0B29] hover:bg-[#2C103A] hover:border-[#FF7A3D] text-[#F4E8D8] font-sans-ar font-semibold text-sm sm:text-base inline-flex items-center justify-center gap-2 shadow-md cursor-pointer whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A3D]"
              >
                {isTimerPaused ? (
                  <>
                    <Play className="h-4 w-4 fill-current text-[#FF7A3D]" />
                    <span>استئناف المؤقت</span>
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 fill-current text-[#FF7A3D]" />
                    <span>إيقاف المؤقت</span>
                  </>
                )}
              </motion.button>
            ) : null}

            <AnimatePresence>
              {showKeyHints && !previewMode && (!hasStarted || (hasTimer && !timerFinished)) && (
                <motion.span
                  key="hint-space"
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 0.85, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="hidden lg:inline-flex items-center gap-1.5 mt-1.5 text-[11px] text-[#B98A9E]"
                >
                  <kbd className="kbd-chip">Space</kbd>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Two Action Buttons in a Row at Bottom Center */}
        <div className="relative grid grid-cols-2 gap-3 sm:gap-5">
          {/* Finish / Next Heart & Spark Burst */}
          <AnimatePresence>
            {combinedFinishBurst > 0 && !prefersReducedMotion && (
              <div
                key={`finish-burst-${combinedFinishBurst}`}
                aria-hidden="true"
                className="pointer-events-none absolute right-[25%] top-1/2 z-30"
              >
                {BURST_PARTICLES.map((p, idx) => (
                  <motion.svg
                    key={`finish-p-${idx}`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
                    animate={{
                      x: p.x,
                      y: p.y,
                      scale: [0.3, p.scale, 0.2],
                      opacity: [1, 0.95, 0],
                    }}
                    transition={{
                      duration: 0.72,
                      delay: p.delay,
                      ease: 'easeOut',
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2"
                  >
                    <path
                      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                      fill={idx % 2 === 0 ? '#FF4D8D' : '#FF7A3D'}
                    />
                  </motion.svg>
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Secondary: "تخطي التحدي" Paper Ticket Ghost Button */}
          <div className="flex flex-col items-center">
            <motion.button
              type="button"
              whileHover={prefersReducedMotion ? undefined : { y: -2 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') playHoverSound();
              }}
              onClick={onSkip}
              dir="rtl"
              className="w-full btn-skip-ticket min-h-[56px] sm:min-h-[60px] rounded-xl px-4 sm:px-5 py-3 font-sans-ar text-base sm:text-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4E8D8]"
            >
              <SkipForward className="h-4 w-4 shrink-0 rtl:-scale-x-100 opacity-90" />
              <span>تخطي التحدي</span>
            </motion.button>

            <AnimatePresence>
              {showKeyHints && !previewMode && (
                <motion.span
                  key="hint-skip"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="hidden lg:inline-flex items-center gap-1 mt-1.5 text-[11px] text-[#B98A9E]"
                >
                  <kbd className="kbd-chip">S</kbd>
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Primary / Locked Morphing Button: "اللي بعدوا" */}
          <div className="flex flex-col items-center">
            <motion.button
              layout
              type="button"
              disabled={isNextDisabled}
              whileHover={
                isNextDisabled || prefersReducedMotion ? undefined : { y: -2 }
              }
              whileTap={
                isNextDisabled || prefersReducedMotion ? undefined : { scale: 0.96 }
              }
              onPointerEnter={(e) => {
                if (!isNextDisabled && e.pointerType === 'mouse') playHoverSound();
              }}
              animate={
                timerFinished && hasTimer
                  ? prefersReducedMotion
                    ? { opacity: [1, 0.85, 1] }
                    : { scale: [1, 1.025, 1] }
                  : inTension
                    ? prefersReducedMotion
                      ? { opacity: [1, 0.72, 1] }
                      : { scale: [1, 1.02, 1] }
                    : undefined
              }
              transition={
                timerFinished && hasTimer
                  ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                  : inTension
                    ? { duration: 0.5, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.38, ease: [0.16, 1, 0.3, 1] }
              }
              onClick={() => {
                if (isNextDisabled) return;
                setNextSparkKey((k) => k + 1);
                playTapSound();
                playSparkSound();
                onNext();
              }}
              dir="rtl"
              className={`w-full relative overflow-hidden min-h-[56px] sm:min-h-[60px] rounded-xl px-4 sm:px-5 py-2 font-sans-ar text-base sm:text-lg font-bold transition-all flex items-center justify-center whitespace-nowrap focus:outline-none focus-visible:ring-2 ${
                isNextDisabled
                  ? `btn-next-locked ${inTension ? 'tension-ember' : ''} focus-visible:ring-[#FF7A3D]`
                  : 'btn-primary-ember btn-shimmer cursor-pointer focus-visible:ring-[#F4E8D8]'
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isNextDisabled ? (
                  <motion.span
                    key="locked"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.08 }}
                    transition={{ duration: 0.22 }}
                    className="inline-flex items-center gap-2.5"
                  >
                    <span className="relative flex h-11 w-11 items-center justify-center shrink-0">
                      <svg
                        viewBox="0 0 44 44"
                        className="h-full w-full -rotate-90"
                        aria-hidden="true"
                      >
                        <circle
                          cx="22"
                          cy="22"
                          r={ringRadius}
                          fill="none"
                          stroke={
                            inTension
                              ? 'rgba(255, 122, 61, 0.25)'
                              : 'rgba(185, 138, 158, 0.2)'
                          }
                          strokeWidth="3"
                        />
                        <circle
                          cx="22"
                          cy="22"
                          r={ringRadius}
                          fill="none"
                          stroke={inTension ? '#FF7A3D' : '#FF4D8D'}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          strokeDashoffset={ringDashOffset}
                          style={{
                            transition:
                              'stroke-dashoffset 0.28s linear, stroke 0.2s ease',
                          }}
                        />
                      </svg>
                      <span
                        className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums ${
                          inTension ? 'text-[#FF7A3D]' : 'text-[#F4E8D8]'
                        }`}
                      >
                        {formatSecondsMMSS(remainingSeconds)}
                      </span>
                    </span>

                    <Lock
                      className={`h-4 w-4 shrink-0 ${
                        inTension ? 'text-[#FF7A3D]' : 'text-[#B98A9E]'
                      }`}
                    />
                    <span className="text-sm sm:text-base font-semibold">اللي بعدوا</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="unlocked"
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                    className="inline-flex items-center gap-2"
                  >
                    <span>اللي بعدوا</span>
                    <ArrowLeft className="h-5 w-5 shrink-0 ltr:rotate-180" />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <AnimatePresence>
              {showKeyHints && !previewMode && (
                <motion.span
                  key="hint-next"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  dir="ltr"
                  className="hidden lg:inline-flex items-center gap-1 mt-1.5 text-[11px] text-[#B98A9E]"
                >
                  <kbd className="kbd-chip">←</kbd>
                  <span>/</span>
                  <kbd className="kbd-chip">Enter</kbd>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
