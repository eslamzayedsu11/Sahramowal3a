import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Flame, Heart, Home, Minus, Plus, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CoupleNames } from '../types';
import {
  playCelebrationFanfare,
  playCountUpTick,
  playEnvelopeSealSound,
  playHoverSound,
  playRatingTick,
  playSparkSound,
  playTapSound,
  playWhooshSound,
} from '../utils/sound';

interface NightRatingFlowProps {
  names: CoupleNames;
  nightTitle: string;
  candleMode?: boolean;
  onGoHome: () => void;
  onBackToSummary: () => void;
}

type RatingTier = 1 | 2 | 3 | 4 | 5 | 6;

interface TierInfo {
  tier: RatingTier;
  caption: string;
  pairLine: string;
}

function getRatingTier(value: number): TierInfo {
  if (value <= 4) {
    return {
      tier: 1,
      caption: 'هنعوّضها المرة الجاية بحماس أكتر 🤍',
      pairLine: 'السهرة الجاية بتعويض أحلى وأقرب',
    };
  }
  if (value <= 7) {
    return {
      tier: 2,
      caption: 'حلوة، وأكيد فيه أحلى جاية',
      pairLine: 'سهرة رايقة، واللي جاي أحلى',
    };
  }
  if (value <= 10) {
    return {
      tier: 3,
      caption: 'سهرة جامدة ❤️',
      pairLine: 'سهرة تتعاد من حلاوتها',
    };
  }
  if (value <= 99) {
    return {
      tier: 4,
      caption: 'التقييم عدّى المقياس! 😍',
      pairLine: 'القلب معاكما عدّى كل المقاييس',
    };
  }
  if (value <= 999) {
    return {
      tier: 5,
      caption: 'المقياس اتكسر 😂🔥',
      pairLine: 'كسرتوا مقياس الحلاوة الليلة',
    };
  }
  return {
    tier: 6,
    caption: 'سهرة أسطورية، مفيش مقياس يكفيها 👑🔥',
    pairLine: 'سهرة أسطورية تتكتب في التاريخ',
  };
}

function clampRating(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(1_000_000, Math.round(raw)));
}

function formatNumber(val: number): string {
  return val.toLocaleString('en-US');
}

function formatAverage(val: number): string {
  const rounded = Math.round(val * 10) / 10;
  return Number.isInteger(rounded)
    ? rounded.toLocaleString('en-US')
    : rounded.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

interface BurstParticle {
  id: number;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  kind: 'heart' | 'spark';
}

const SOFT_FLOAT_HEARTS = [
  { id: 1, left: '14%', delay: 0, duration: 2.8, size: 14 },
  { id: 2, left: '28%', delay: 0.6, duration: 3.1, size: 16 },
  { id: 3, left: '52%', delay: 1.1, duration: 2.7, size: 13 },
  { id: 4, left: '72%', delay: 0.3, duration: 3.0, size: 15 },
  { id: 5, left: '86%', delay: 0.9, duration: 2.9, size: 14 },
];

export function NightRatingFlow({
  names,
  nightTitle,
  candleMode = false,
  onGoHome,
  onBackToSummary,
}: NightRatingFlowProps) {
  const prefersReducedMotion = useReducedMotion();

  const savedName1 = names.boy.trim();
  const savedName2 = names.girl.trim();
  const hasSavedName1 = savedName1.length > 0;
  const hasSavedName2 = savedName2.length > 0;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [customName1, setCustomName1] = useState(savedName1);
  const [customName2, setCustomName2] = useState(savedName2);

  const [rating1, setRating1] = useState<number>(8);
  const [rating2, setRating2] = useState<number>(8);
  const [inputText, setInputText] = useState<string>('8');
  const [pumping, setPumping] = useState(false);

  // Visual celebration triggers for input steps
  const [bursts, setBursts] = useState<BurstParticle[]>([]);
  const [shakeTrigger, setShakeTrigger] = useState(0);
  const burstIdRef = useRef(0);
  const numberInputRef = useRef<HTMLInputElement>(null);

  // Step 3 Reveal animation states
  const [revealedCard1, setRevealedCard1] = useState(false);
  const [revealedCard2, setRevealedCard2] = useState(false);
  const [displayR1, setDisplayR1] = useState(0);
  const [displayR2, setDisplayR2] = useState(0);
  const [verdictReady, setVerdictReady] = useState(false);

  const displayName1 = customName1.trim() || 'الولد';
  const displayName2 = customName2.trim() || 'البنت';

  const activeValue = step === 1 ? rating1 : rating2;
  const activeTier = useMemo(() => getRatingTier(activeValue), [activeValue]);

  const spawnBursts = useCallback(
    (count: number, includeSparks: boolean) => {
      if (prefersReducedMotion) return;
      const actualCount = candleMode ? Math.min(count, 6) : count;
      const created: BurstParticle[] = Array.from({ length: actualCount }, (_, idx) => {
        const angle = (Math.PI * 2 * idx) / actualCount + (Math.random() - 0.5) * 0.4;
        const radius = (includeSparks ? 110 : 75) + Math.random() * 65;
        burstIdRef.current += 1;
        return {
          id: burstIdRef.current,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius - 18,
          rotate: (Math.random() - 0.5) * 60,
          scale: 0.75 + Math.random() * 0.7,
          kind: includeSparks && idx % 2 === 1 ? 'spark' : 'heart',
        };
      });
      setBursts((prev) => [...prev.slice(-24), ...created]);
      window.setTimeout(() => {
        const ids = new Set(created.map((p) => p.id));
        setBursts((prev) => prev.filter((p) => !ids.has(p.id)));
      }, 950);
    },
    [candleMode, prefersReducedMotion]
  );

  const setActiveRating = useCallback(
    (nextRaw: number, options?: { syncInput?: boolean; sound?: boolean }) => {
      const next = clampRating(nextRaw);
      const prev = step === 1 ? rating1 : rating2;

      if (step === 1) {
        setRating1(next);
      } else {
        setRating2(next);
      }

      if (options?.syncInput !== false) {
        setInputText(String(next));
      }

      if (options?.sound !== false && next !== prev) {
        playRatingTick(next);
      }

      if (next > 10 && prev <= 10) {
        spawnBursts(10, false);
      }
      if (next > 100 && next !== prev) {
        setShakeTrigger((s) => s + 1);
      }
      if (next >= 1000 && prev < 1000) {
        spawnBursts(18, true);
        playSparkSound();
      }
    },
    [rating1, rating2, spawnBursts, step]
  );

  // Sync input text and focus input when moving between Step 1 and Step 2
  useEffect(() => {
    if (step === 1 || step === 2) {
      const val = step === 1 ? rating1 : rating2;
      setInputText(String(val));
      const t = window.setTimeout(() => {
        numberInputRef.current?.focus();
        numberInputRef.current?.select();
      }, 90);
      return () => window.clearTimeout(t);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pump button hold logic (accelerates progressively from +1 up to +15000)
  const pumpIntervalRef = useRef<number | null>(null);
  const pumpTicksRef = useRef(0);
  const activeValueRef = useRef(activeValue);
  activeValueRef.current = activeValue;

  const stopPump = useCallback(() => {
    if (pumpIntervalRef.current !== null) {
      window.clearInterval(pumpIntervalRef.current);
      pumpIntervalRef.current = null;
    }
    pumpTicksRef.current = 0;
    setPumping(false);
  }, []);

  useEffect(() => stopPump, [stopPump, step]);

  const startPump = useCallback(() => {
    if (pumpIntervalRef.current !== null) return;
    setPumping(true);
    pumpTicksRef.current = 0;

    // Immediate +1 tap reward
    setActiveRating(activeValueRef.current + 1);

    pumpIntervalRef.current = window.setInterval(() => {
      pumpTicksRef.current += 1;
      const t = pumpTicksRef.current;
      let delta = 1;
      if (t > 65) delta = 25000;
      else if (t > 52) delta = 5000;
      else if (t > 40) delta = 1000;
      else if (t > 30) delta = 250;
      else if (t > 22) delta = 50;
      else if (t > 14) delta = 10;
      else if (t > 6) delta = 3;

      const current = activeValueRef.current;
      if (current >= 1_000_000) {
        stopPump();
        return;
      }
      setActiveRating(current + delta);
    }, 85);
  }, [setActiveRating, stopPump]);

  const handleConfirmStep = useCallback(() => {
    stopPump();
    if (step === 1) {
      playEnvelopeSealSound();
      setStep(2);
    } else if (step === 2) {
      playTapSound();
      playWhooshSound();
      setStep(3);
    }
  }, [step, stopPump]);

  // Step 3 sequential count-up & reveal choreography
  useEffect(() => {
    if (step !== 3) return;

    setRevealedCard1(false);
    setRevealedCard2(false);
    setDisplayR1(0);
    setDisplayR2(0);
    setVerdictReady(false);

    if (prefersReducedMotion) {
      setRevealedCard1(true);
      setRevealedCard2(true);
      setDisplayR1(rating1);
      setDisplayR2(rating2);
      setVerdictReady(true);
      const intense = Math.max(rating1, rating2) >= 1000 || (rating1 + rating2) / 2 >= 1000;
      playCelebrationFanfare(intense);
      return;
    }

    let rafId1 = 0;
    let rafId2 = 0;
    let t1 = 0;
    let t2 = 0;
    let t3 = 0;
    let cancelled = false;

    const animateValue = (
      target: number,
      setter: (n: number) => void,
      durationMs: number,
      onDone: () => void
    ) => {
      const start = performance.now();
      let lastTickAt = 0;
      const tick = (now: number) => {
        if (cancelled) return;
        const p = Math.min(1, (now - start) / durationMs);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - p, 3);
        let current = Math.round(target * eased);
        // Slot-machine rapid flicker for 1000+ values before locking
        if (target >= 1000 && p > 0.15 && p < 0.92) {
          const jitter = Math.floor((Math.random() - 0.5) * Math.max(12, target * 0.08));
          current = clampRating(current + jitter);
        }
        setter(current);

        if (now - lastTickAt > 75 && p < 0.98) {
          lastTickAt = now;
          playCountUpTick(p);
        }

        if (p < 1) {
          const id = requestAnimationFrame(tick);
          if (setter === setDisplayR1) rafId1 = id;
          else rafId2 = id;
        } else {
          setter(target);
          onDone();
        }
      };
      const id = requestAnimationFrame(tick);
      if (setter === setDisplayR1) rafId1 = id;
      else rafId2 = id;
    };

    t1 = window.setTimeout(() => {
      if (cancelled) return;
      setRevealedCard1(true);
      playWhooshSound();
      const dur1 = rating1 >= 1000 ? 1250 : rating1 >= 100 ? 950 : 650;
      animateValue(rating1, setDisplayR1, dur1, () => {
        t2 = window.setTimeout(() => {
          if (cancelled) return;
          setRevealedCard2(true);
          playWhooshSound();
          const dur2 = rating2 >= 1000 ? 1250 : rating2 >= 100 ? 950 : 650;
          animateValue(rating2, setDisplayR2, dur2, () => {
            t3 = window.setTimeout(() => {
              if (cancelled) return;
              setVerdictReady(true);
              const avg = (rating1 + rating2) / 2;
              const intense = Math.max(rating1, rating2) >= 1000 || avg >= 1000;
              playCelebrationFanfare(intense);
              if (intense) {
                spawnBursts(22, true);
              } else if (avg > 10) {
                spawnBursts(12, false);
              }
            }, 260);
          });
        }, 280);
      });
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      if (rafId1) cancelAnimationFrame(rafId1);
      if (rafId2) cancelAnimationFrame(rafId2);
    };
  }, [prefersReducedMotion, rating1, rating2, spawnBursts, step]);

  const averageRating = (rating1 + rating2) / 2;
  const averageTier = useMemo(() => getRatingTier(Math.round(averageRating)), [averageRating]);
  const isLegendaryActive = activeValue >= 1000;
  const isOverHundredActive = activeValue > 100;
  const isLegendaryReveal =
    Math.max(rating1, rating2) >= 1000 || averageRating >= 1000;

  return (
    <motion.main
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden flex flex-col items-center justify-center px-4 sm:px-6 pt-14 pb-6"
    >
      {/* Fireworks / Heart Bursts Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center overflow-hidden"
      >
        <AnimatePresence>
          {bursts.map((b) => (
            <motion.div
              key={`rating-burst-${b.id}`}
              initial={{ opacity: 1, x: 0, y: 0, scale: 0.3, rotate: 0 }}
              animate={{
                opacity: [1, 1, 0],
                x: b.x,
                y: b.y,
                scale: b.scale,
                rotate: b.rotate,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="absolute"
            >
              {b.kind === 'heart' ? (
                <Heart className="h-6 w-6 fill-[#FF4D8D] text-[#FF4D8D] drop-shadow-[0_0_10px_rgba(255,77,141,0.75)]" />
              ) : (
                <Sparkles className="h-6 w-6 text-[#FF7A3D] drop-shadow-[0_0_12px_rgba(255,122,61,0.85)]" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="w-full max-w-[1600px] mx-auto flex justify-center">
        <AnimatePresence mode="wait">
          {(step === 1 || step === 2) && (
            <motion.div
              key={`rate-step-${step}-${shakeTrigger > 0 && isOverHundredActive ? 'shake' : 'steady'}`}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : isOverHundredActive && shakeTrigger > 0
                  ? {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      x: candleMode ? [0, -2, 2, 0] : [0, -5, 5, -3, 3, 0],
                    }
                  : { opacity: 1, y: 0, scale: 1, x: 0 }
              }
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.97 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-2xl"
            >
              {/* Washi tape corners */}
              <div
                aria-hidden="true"
                className="washi-tape absolute -top-3 right-10 z-20 h-6 w-20 -rotate-3 rounded-[2px]"
              />
              <div
                aria-hidden="true"
                className="washi-tape-cream absolute -top-3 left-10 z-20 h-6 w-20 rotate-6 rounded-[2px]"
              />

              <div className="scrapbook-paper torn-edge-note relative px-6 pt-7 pb-9 sm:px-10 text-center text-[#1B0A22]">
                {/* Soft Floating Hearts when rating >= 1 */}
                {!prefersReducedMotion && activeValue >= 1 && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-6 bottom-12 overflow-hidden"
                  >
                    {SOFT_FLOAT_HEARTS.slice(0, activeValue >= 10 ? 5 : 3).map((h) => (
                      <motion.div
                        key={`float-heart-${h.id}`}
                        style={{ left: h.left }}
                        animate={{
                          y: [30, -70],
                          opacity: [0, candleMode ? 0.3 : 0.55, 0],
                        }}
                        transition={{
                          duration: h.duration,
                          delay: h.delay,
                          repeat: Infinity,
                          ease: 'easeOut',
                        }}
                        className="absolute bottom-6"
                      >
                        <Heart
                          style={{ width: h.size, height: h.size }}
                          className="fill-[#FF4D8D]/70 text-[#FF4D8D]"
                        />
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Top Step Indicator + Night Title */}
                <div className="relative z-10 flex items-center justify-between gap-2 text-xs font-bold text-[#7A3F5D] mb-3">
                  <span>{nightTitle}</span>
                  <span>
                    تقييم {step === 1 ? '١' : '٢'} من ٢
                  </span>
                </div>

                {/* Step 2 Sealed Envelope Suspense Banner */}
                {step === 2 && (
                  <motion.div
                    initial={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 mx-auto mb-3.5 inline-flex items-center gap-2.5 rounded-xl border border-[#8F1D48]/25 bg-[#FF4D8D]/10 px-4 py-2 text-xs sm:text-sm font-bold text-[#6E1A42] shadow-sm"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 36 28"
                      className="h-5 w-6 shrink-0"
                    >
                      <rect
                        x="1.5"
                        y="2"
                        width="33"
                        height="24"
                        rx="3"
                        fill="#F4E8D8"
                        stroke="#8F1D48"
                        strokeWidth="1.8"
                      />
                      <path
                        d="M2 3 L18 16 L34 3"
                        fill="none"
                        stroke="#8F1D48"
                        strokeWidth="1.8"
                        strokeLinejoin="round"
                      />
                      <circle cx="18" cy="16" r="4.2" fill="#FF4D8D" />
                    </svg>
                    <span>تقييم {displayName1} مستني يتكشف 🤫</span>
                  </motion.div>
                )}

                {/* Romantic Heading */}
                <h1 className="relative z-10 font-calligraphy text-[clamp(1.75rem,3vw,2.4rem)] font-bold text-[#1B0A22] leading-snug mb-1.5">
                  {step === 1 ? displayName1 : displayName2}، قيّم سهرتكم
                </h1>
                <p className="relative z-10 text-xs sm:text-sm text-[#582E49] mb-3">
                  التقييم من 10… بس إحساسكم ملوش سقف
                </p>

                {/* Optional Name Input if not saved */}
                {((step === 1 && !hasSavedName1) || (step === 2 && !hasSavedName2)) && (
                  <div className="relative z-10 mx-auto mb-3 max-w-xs">
                    <input
                      type="text"
                      value={step === 1 ? customName1 : customName2}
                      onChange={(e) =>
                        step === 1
                          ? setCustomName1(e.target.value)
                          : setCustomName2(e.target.value)
                      }
                      placeholder="اكتب اسمك (اختياري)"
                      maxLength={24}
                      className="w-full min-h-[42px] rounded-xl border border-[#14081A]/20 bg-white/65 px-3.5 py-1.5 text-center text-sm font-bold text-[#1B0A22] placeholder:text-[#7A3F5D]/70 focus:border-[#FF4D8D] focus:outline-none"
                    />
                  </div>
                )}

                {/* Big Neon / Handwritten Rating Display */}
                <div className="relative z-10 my-2.5 flex flex-col items-center">
                  <motion.div
                    key={`rating-val-${activeValue}`}
                    animate={
                      prefersReducedMotion
                        ? undefined
                        : isLegendaryActive
                        ? { scale: [1.08, 1] }
                        : isOverHundredActive
                        ? { scale: [1.05, 1] }
                        : { scale: [1.02, 1] }
                    }
                    transition={{ duration: 0.16 }}
                    dir="ltr"
                    className={`inline-flex items-baseline justify-center gap-2 rounded-2xl px-6 py-2.5 shadow-inner transition-colors ${
                      isLegendaryActive
                        ? 'bg-[#14081A] border-2 border-[#FF7A3D] shadow-[0_0_28px_rgba(255,122,61,0.55)]'
                        : isOverHundredActive
                        ? 'bg-[#14081A] border border-[#FF4D8D]/70 shadow-[0_0_20px_rgba(255,77,141,0.4)]'
                        : 'bg-[#14081A]/92 border border-[#B98A9E]/30'
                    }`}
                  >
                    <span
                      className={`font-neon text-[clamp(2.4rem,4.6vw,3.6rem)] leading-none tabular-nums ${
                        isLegendaryActive
                          ? 'text-[#FFE4EE] drop-shadow-[0_0_16px_rgba(255,122,61,0.95)]'
                          : isOverHundredActive
                          ? 'neon-rose-text'
                          : 'text-[#F4E8D8]'
                      }`}
                    >
                      {formatNumber(activeValue)}
                    </span>
                    <span className="font-neon text-xl sm:text-2xl text-[#FF4D8D]">
                      / 10
                    </span>
                  </motion.div>

                  {/* Live Egyptian Arabic Tier Caption */}
                  <motion.p
                    key={`rating-tier-${activeTier.tier}`}
                    initial={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2.5 min-h-[28px] text-sm sm:text-base font-bold text-[#6E1A42]"
                  >
                    {activeTier.caption}
                  </motion.p>
                </div>

                {/* Controls Panel: Number Input, +/- , Slider 0..10, Pump Hold */}
                <div className="relative z-10 mx-auto max-w-md space-y-3.5 rounded-2xl border border-[#14081A]/12 bg-white/45 p-4 shadow-sm">
                  {/* - / Number Input / + */}
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setActiveRating(activeValue - 1);
                      }}
                      aria-label="إنقاص التقييم"
                      className="min-h-[48px] min-w-[48px] rounded-xl border border-[#14081A]/20 bg-white/80 hover:bg-white text-[#1B0A22] flex items-center justify-center cursor-pointer active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D]"
                    >
                      <Minus className="h-5 w-5" />
                    </button>

                    <div className="relative flex-1 max-w-[190px]">
                      <input
                        ref={numberInputRef}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={1000000}
                        step={1}
                        dir="ltr"
                        value={inputText}
                        aria-label="أدخل التقييم من 10"
                        onChange={(e) => {
                          const raw = e.target.value;
                          setInputText(raw);
                          if (raw === '') {
                            setActiveRating(0, { syncInput: false, sound: false });
                            return;
                          }
                          const parsed = Number.parseInt(raw, 10);
                          if (!Number.isNaN(parsed)) {
                            const clamped = clampRating(parsed);
                            setActiveRating(clamped, {
                              syncInput: clamped !== parsed,
                              sound: true,
                            });
                          }
                        }}
                        onBlur={() => setInputText(String(activeValue))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleConfirmStep();
                          }
                        }}
                        className="w-full min-h-[48px] rounded-xl border-2 border-[#14081A]/20 bg-white px-3 py-2 text-center font-neon text-2xl text-[#1B0A22] tabular-nums focus:border-[#FF4D8D] focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setActiveRating(activeValue + 1);
                      }}
                      aria-label="زيادة التقييم"
                      className="min-h-[48px] min-w-[48px] rounded-xl border border-[#14081A]/20 bg-white/80 hover:bg-white text-[#1B0A22] flex items-center justify-center cursor-pointer active:scale-95 transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D]"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Quick 0..10 Slider */}
                  <div className="px-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#7A3F5D] mb-1">
                      <span>اختيار سريع من 0 لـ 10</span>
                      <span dir="ltr">{Math.min(10, activeValue)} / 10</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={1}
                      value={Math.min(10, activeValue)}
                      aria-label="شريط التقييم السريع من 0 إلى 10"
                      onChange={(e) => setActiveRating(Number(e.target.value))}
                      className="w-full accent-[#FF4D8D] cursor-pointer h-2 rounded-lg"
                    />
                  </div>

                  {/* Funny Pump Hold Button */}
                  <div>
                    <motion.button
                      type="button"
                      animate={
                        pumping && !prefersReducedMotion
                          ? { scale: [1, 1.03, 0.99, 1.04] }
                          : { scale: 1 }
                      }
                      transition={
                        pumping ? { duration: 0.25, repeat: Infinity } : undefined
                      }
                      onPointerDown={(e) => {
                        e.preventDefault();
                        startPump();
                      }}
                      onPointerUp={stopPump}
                      onPointerLeave={stopPump}
                      onPointerCancel={stopPump}
                      onBlur={stopPump}
                      onKeyDown={(e) => {
                        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
                          e.preventDefault();
                          startPump();
                        }
                      }}
                      onKeyUp={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          stopPump();
                        }
                      }}
                      className={`w-full min-h-[46px] rounded-xl border-2 px-4 py-2 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 select-none cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D] ${
                        pumping
                          ? 'border-[#FF7A3D] bg-[#14081A] text-[#FFE4EE] shadow-[0_0_20px_rgba(255,77,141,0.45)]'
                          : 'border-dashed border-[#8F1D48]/45 bg-[#FF4D8D]/10 hover:bg-[#FF4D8D]/18 text-[#6E1A42]'
                      }`}
                    >
                      <Flame className={`h-4 w-4 shrink-0 ${pumping ? 'text-[#FF7A3D]' : 'text-[#FF4D8D]'}`} />
                      <span>
                        {pumping
                          ? 'السهرة بتولّع أكتر… 🔥'
                          : 'اضغط مطوّلاً لضخّ التقييم بلا حدود! 🚀'}
                      </span>
                    </motion.button>
                  </div>
                </div>

                {/* Confirm & Next / Reveal Actions */}
                <div className="relative z-10 mt-5 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <motion.button
                    type="button"
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                    onPointerEnter={(e) => {
                      if (e.pointerType === 'mouse') playHoverSound();
                    }}
                    onClick={handleConfirmStep}
                    className="btn-primary-ember btn-shimmer relative overflow-hidden w-full sm:flex-1 min-h-[50px] px-6 py-2.5 rounded-xl font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#14081A]"
                  >
                    <Sparkles className="h-4 w-4 shrink-0" />
                    <span>
                      {step === 1
                        ? `اختم تقييم ${displayName1} 💌`
                        : 'اكشفوا التقييمين معاً! ✨'}
                    </span>
                  </motion.button>

                  {step === 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        playTapSound();
                        onBackToSummary();
                      }}
                      className="min-h-[48px] px-4 py-2 rounded-xl border border-[#14081A]/20 bg-white/40 hover:bg-white/65 text-[#4A253A] font-bold text-xs sm:text-sm cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#14081A]"
                    >
                      رجوع للملخص
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="rate-step-3-reveal"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-3xl"
            >
              <div className="scrapbook-paper torn-edge-note relative px-6 pt-7 pb-9 sm:px-10 text-center text-[#1B0A22]">
                <div
                  aria-hidden="true"
                  className="washi-tape absolute -top-3 right-12 z-20 h-6 w-24 -rotate-2 rounded-[2px]"
                />
                <div
                  aria-hidden="true"
                  className="washi-tape-cream absolute -top-3 left-12 z-20 h-6 w-24 rotate-3 rounded-[2px]"
                />

                <p className="text-xs font-bold text-[#7A3F5D] mb-1">
                  {nightTitle} · لحظة الحقيقة
                </p>
                <h1 className="font-calligraphy text-[clamp(1.85rem,3.2vw,2.55rem)] font-bold text-[#1B0A22] mb-5">
                  تقييم سهرتكم الليلة
                </h1>

                {/* Side-by-side Polaroid / Paper Note Rating Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-5">
                  {/* Partner 1 Card */}
                  <motion.div
                    initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18, rotate: -3 }}
                    animate={
                      revealedCard1
                        ? { opacity: 1, y: 0, rotate: -1.5 }
                        : { opacity: 0.35, y: 10, rotate: -2 }
                    }
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="relative rounded-2xl border border-[#14081A]/12 bg-white p-5 shadow-[0_14px_28px_-14px_rgba(20,8,26,0.5)]"
                  >
                    <div
                      aria-hidden="true"
                      className="washi-tape absolute -top-2.5 left-1/2 -translate-x-1/2 h-4 w-16 rotate-1 rounded-[2px]"
                    />
                    <p className="font-calligraphy text-xl font-bold text-[#4A253A] mb-2">
                      {displayName1}
                    </p>
                    <div
                      dir="ltr"
                      className={`inline-flex items-baseline justify-center gap-1.5 rounded-xl px-4 py-2 ${
                        rating1 >= 1000
                          ? 'bg-[#14081A] border border-[#FF7A3D] shadow-[0_0_20px_rgba(255,122,61,0.45)]'
                          : 'bg-[#14081A]'
                      }`}
                    >
                      <span
                        className={`font-neon text-3xl sm:text-4xl tabular-nums ${
                          rating1 >= 100 ? 'neon-rose-text' : 'text-[#F4E8D8]'
                        }`}
                      >
                        {formatNumber(displayR1)}
                      </span>
                      <span className="font-neon text-lg text-[#FF4D8D]">/ 10</span>
                    </div>
                    <p className="mt-2.5 text-xs font-bold text-[#7A3F5D] min-h-[20px]">
                      {revealedCard1 ? getRatingTier(rating1).caption : '...'}
                    </p>
                  </motion.div>

                  {/* Partner 2 Card */}
                  <motion.div
                    initial={prefersReducedMotion ? undefined : { opacity: 0, y: 18, rotate: 3 }}
                    animate={
                      revealedCard2
                        ? { opacity: 1, y: 0, rotate: 1.5 }
                        : { opacity: 0.35, y: 10, rotate: 2 }
                    }
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="relative rounded-2xl border border-[#14081A]/12 bg-white p-5 shadow-[0_14px_28px_-14px_rgba(20,8,26,0.5)]"
                  >
                    <div
                      aria-hidden="true"
                      className="washi-tape-cream absolute -top-2.5 left-1/2 -translate-x-1/2 h-4 w-16 -rotate-1 rounded-[2px]"
                    />
                    <p className="font-calligraphy text-xl font-bold text-[#4A253A] mb-2">
                      {displayName2}
                    </p>
                    <div
                      dir="ltr"
                      className={`inline-flex items-baseline justify-center gap-1.5 rounded-xl px-4 py-2 ${
                        rating2 >= 1000
                          ? 'bg-[#14081A] border border-[#FF7A3D] shadow-[0_0_20px_rgba(255,122,61,0.45)]'
                          : 'bg-[#14081A]'
                      }`}
                    >
                      <span
                        className={`font-neon text-3xl sm:text-4xl tabular-nums ${
                          rating2 >= 100 ? 'neon-rose-text' : 'text-[#F4E8D8]'
                        }`}
                      >
                        {formatNumber(displayR2)}
                      </span>
                      <span className="font-neon text-lg text-[#FF4D8D]">/ 10</span>
                    </div>
                    <p className="mt-2.5 text-xs font-bold text-[#7A3F5D] min-h-[20px]">
                      {revealedCard2 ? getRatingTier(rating2).caption : '...'}
                    </p>
                  </motion.div>
                </div>

                {/* Combined Romantic Verdict */}
                <AnimatePresence>
                  {verdictReady && (
                    <motion.div
                      key="rating-verdict"
                      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className={`mx-auto mb-5 max-w-xl rounded-2xl border px-5 py-4 ${
                        isLegendaryReveal
                          ? 'border-[#FF7A3D]/60 bg-[#14081A] text-[#F4E8D8] shadow-[0_12px_30px_-8px_rgba(255,122,61,0.5)]'
                          : 'border-[#8F1D48]/25 bg-white/75 text-[#1B0A22]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold mb-1 opacity-85">
                        <span>النتيجة المشتركة:</span>
                        <span dir="ltr" className="font-neon text-base text-[#FF4D8D]">
                          {formatAverage(averageRating)} / 10
                        </span>
                      </div>
                      <p className="font-calligraphy text-xl sm:text-2xl font-bold leading-snug">
                        {displayName1} و{displayName2}، {averageTier.pairLine}
                      </p>
                      <p
                        className={`mt-1 text-xs sm:text-sm font-semibold ${
                          isLegendaryReveal ? 'text-[#FFE4EE]' : 'text-[#6E1A42]'
                        }`}
                      >
                        {averageTier.caption}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Back to Home CTA */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <motion.button
                    type="button"
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                    onPointerEnter={(e) => {
                      if (e.pointerType === 'mouse') playHoverSound();
                    }}
                    onClick={() => {
                      playTapSound();
                      playWhooshSound();
                      onGoHome();
                    }}
                    className="btn-primary-ember btn-shimmer relative overflow-hidden w-full sm:w-auto min-w-[220px] min-h-[50px] px-7 py-2.5 rounded-xl font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#14081A]"
                  >
                    <Home className="h-4 w-4 shrink-0" />
                    <span>رجوع للرئيسية</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
