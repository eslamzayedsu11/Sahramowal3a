import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { detectMediaKind } from '../utils/mediaType';
import { playHoverSound, playPaperFlickSound } from '../utils/sound';

const POLAROID_HINT_SEEN_KEY = 'sahra_polaroid_hint_seen_v1';

const FALLBACK_BACK_NOTES = [
  'ذكرى تُكتب بالهمس ولا تُمحى من القلب',
  'في عينيك تختبئ كل حكايات السهر الجميلة',
  'هذه اللحظة ملكنا وحدنا في منتصف الليل',
  'ابتسامتك هي أجمل ضوء في هذه الغرفة',
  'كل نبضة بيننا تحفظ سرّ هذه الليلة',
  'قربك يجعل الوقت يتوقف بلطف لأجلنا',
  'همسة واحدة منك تكفي لتُزهر السهرة كلها',
  'دفء يديك هو أجمل توقيع على دفتر عمرنا',
  'ما بيننا أجمل من أن يصفه سطر أو صورة',
  'سهرة دافئة تبدأ بنظرة وتكتمل بابتسامة',
];

const BACK_HEART_BURST = [
  { x: -72, y: -42, delay: 0, scale: 0.9 },
  { x: 76, y: -38, delay: 0.04, scale: 1.0 },
  { x: -64, y: 48, delay: 0.06, scale: 0.85 },
  { x: 68, y: 44, delay: 0.03, scale: 0.95 },
  { x: 0, y: -74, delay: 0.05, scale: 1.05 },
];

interface PolaroidFrameProps {
  challengeId: string;
  imageUrl?: string;
  backNote?: string;
  nightTitle: string;
  altText?: string;
  tensionLevel?: number;
  candleMode?: boolean;
  externalFlipKey?: number;
  previewMode?: boolean;
  compactForTurntable?: boolean;
}

export function PolaroidFrame({
  challengeId,
  imageUrl = '',
  backNote = '',
  nightTitle,
  altText = 'صورة التحدي',
  tensionLevel = 0,
  candleMode = false,
  externalFlipKey = 0,
  previewMode = false,
  compactForTurntable = false,
}: PolaroidFrameProps) {
  const prefersReducedMotion = useReducedMotion();
  const hasMediaUrl = Boolean(imageUrl && imageUrl.trim().length > 0);
  const mediaKind = useMemo(() => detectMediaKind(imageUrl), [imageUrl]);

  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [swingPulseKey, setSwingPulseKey] = useState(0);
  const [activeBurstId, setActiveBurstId] = useState<number | null>(null);
  const [hintDismissed, setHintDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(POLAROID_HINT_SEEN_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const burstSeqRef = useRef(0);
  const burstTimerRef = useRef<number | null>(null);
  const lastExternalFlipRef = useRef<number>(externalFlipKey);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
    setIsFlipped(false);
    setActiveBurstId(null);
    if (burstTimerRef.current !== null) {
      window.clearTimeout(burstTimerRef.current);
      burstTimerRef.current = null;
    }
  }, [challengeId, imageUrl]);

  useEffect(() => {
    return () => {
      if (burstTimerRef.current !== null) {
        window.clearTimeout(burstTimerRef.current);
      }
    };
  }, []);

  const fallbackCaption = useMemo(() => {
    const idx = Math.floor(Math.random() * FALLBACK_BACK_NOTES.length);
    return FALLBACK_BACK_NOTES[idx];
  }, [challengeId]);

  const displayCaption = backNote.trim() ? backNote.trim() : fallbackCaption;

  const triggerFlip = useCallback(() => {
    setIsFlipped((prev) => {
      const nextFlipped = !prev;
      setSwingPulseKey((k) => k + 1);
      playPaperFlickSound();

      if (!hintDismissed) {
        setHintDismissed(true);
        try {
          localStorage.setItem(POLAROID_HINT_SEEN_KEY, 'true');
        } catch {
          // Ignore storage errors
        }
      }

      if (burstTimerRef.current !== null) {
        window.clearTimeout(burstTimerRef.current);
        burstTimerRef.current = null;
      }
      if (nextFlipped) {
        burstTimerRef.current = window.setTimeout(() => {
          burstSeqRef.current += 1;
          setActiveBurstId(burstSeqRef.current);
        }, 240);
      } else {
        setActiveBurstId(null);
      }

      return nextFlipped;
    });
  }, [hintDismissed]);

  useEffect(() => {
    if (externalFlipKey !== lastExternalFlipRef.current) {
      lastExternalFlipRef.current = externalFlipKey;
      triggerFlip();
    }
  }, [externalFlipKey, triggerFlip]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      triggerFlip();
    }
  };

  const inTension = tensionLevel > 0;
  const shakeAmp = candleMode ? tensionLevel * 0.7 : tensionLevel * 1.3;

  const frameSizeClasses = previewMode
    ? 'max-w-[250px]'
    : 'max-w-[335px] sm:max-w-[385px] lg:max-w-[clamp(350px,52dvh,550px)] xl:max-w-[clamp(410px,56dvh,620px)]';

  const mediaBoxHeightClasses = previewMode
    ? 'h-[190px]'
    : compactForTurntable
      ? 'h-[240px] sm:h-[275px] lg:h-[clamp(220px,37dvh,435px)]'
      : 'h-[250px] sm:h-[290px] lg:h-[clamp(235px,39dvh,455px)]';

  return (
    <div
      className={`relative flex flex-col items-center select-none w-full ${
        compactForTurntable ? 'pt-4 lg:pt-4' : 'pt-5 lg:pt-5'
      }`}
    >
      {/* Subtle twine string segment behind the clothespin */}
      <svg
        aria-hidden="true"
        viewBox="0 0 260 20"
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[260px] lg:w-[340px] h-5"
      >
        <path
          d="M 0 6 Q 130 16 260 6"
          fill="none"
          stroke="rgba(244, 232, 216, 0.35)"
          strokeWidth="1.4"
          strokeDasharray="3 2"
        />
      </svg>

      {/* Clothespin pivot assembly */}
      <motion.div
        style={{ transformOrigin: 'top center' }}
        initial={{ rotate: 2.6, opacity: 0, scale: 0.94 }}
        animate={
          prefersReducedMotion
            ? {
                opacity: inTension ? [1, 0.82, 1] : 1,
                scale: 1,
                rotate: 0,
              }
            : inTension
              ? {
                  opacity: 1,
                  scale: 1,
                  rotate: [-shakeAmp, shakeAmp, -shakeAmp * 0.8, shakeAmp * 0.8, 0],
                  x: [-shakeAmp * 0.5, shakeAmp * 0.5, 0],
                }
              : {
                  opacity: 1,
                  scale: 1,
                  rotate: [-2.1, 1.9, -2.1],
                  x: 0,
                }
        }
        transition={
          prefersReducedMotion
            ? inTension
              ? { opacity: { duration: 0.5, repeat: Infinity } }
              : { duration: 0.2 }
            : inTension
              ? {
                  rotate: { duration: 0.24, repeat: Infinity, ease: 'easeInOut' },
                  x: { duration: 0.24, repeat: Infinity, ease: 'easeInOut' },
                }
              : {
                  opacity: { duration: 0.35 },
                  scale: { duration: 0.35 },
                  rotate: {
                    duration: 5.2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  },
                }
        }
        className={`relative w-full ${frameSizeClasses}`}
      >
        {/* Wooden Clothespin */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_6px_8px_rgba(0,0,0,0.65)]"
        >
          <svg width="28" height="58" viewBox="0 0 28 58" fill="none">
            <rect x="7" y="1" width="14" height="54" rx="2.5" fill="#8C5E35" />
            <rect x="6" y="0" width="16" height="55" rx="2.5" fill="url(#woodGradPin)" />
            <path d="M10 3V52" stroke="#9D6B3E" strokeWidth="0.7" strokeOpacity="0.45" />
            <path d="M18 4V51" stroke="#7A4E28" strokeWidth="0.7" strokeOpacity="0.4" />
            <rect x="6" y="0" width="2.5" height="55" rx="1" fill="#E3BC8E" fillOpacity="0.45" />
            <rect x="19.5" y="0" width="2.5" height="55" rx="1" fill="#6F4420" fillOpacity="0.45" />
            <rect x="13" y="34" width="2" height="21" fill="#4E2F14" fillOpacity="0.65" />
            <rect x="5" y="25" width="18" height="6.5" rx="1.5" fill="url(#metalGradPin)" />
            <circle cx="14" cy="18" r="1.5" fill="#9E9E9E" />
            <path d="M6 26.5H22M6 29.5H22" stroke="#5A5A5A" strokeWidth="0.8" />
            <defs>
              <linearGradient
                id="woodGradPin"
                x1="6"
                y1="0"
                x2="22"
                y2="55"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#DFB482" />
                <stop offset="0.5" stopColor="#C99660" />
                <stop offset="1" stopColor="#A87442" />
              </linearGradient>
              <linearGradient
                id="metalGradPin"
                x1="5"
                y1="25"
                x2="23"
                y2="31"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#E5E7EB" />
                <stop offset="0.5" stopColor="#9CA3AF" />
                <stop offset="1" stopColor="#6B7280" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Tiny hearts bursting when landing on back */}
        <AnimatePresence>
          {activeBurstId !== null && isFlipped && !prefersReducedMotion && (
            <div
              key={`polaroid-burst-${activeBurstId}`}
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 z-40"
            >
              {BACK_HEART_BURST.map((p, idx) => (
                <motion.svg
                  key={`polaroid-heart-${idx}`}
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  initial={{ x: 0, y: 0, scale: 0.3, opacity: 1 }}
                  animate={{
                    x: p.x,
                    y: p.y,
                    scale: [0.3, p.scale, 0.2],
                    opacity: [1, 0.95, 0],
                  }}
                  transition={{ duration: 0.65, delay: p.delay, ease: 'easeOut' }}
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

        {/* Interactive 3D Flippable Polaroid */}
        <motion.div
          key={`swing-${swingPulseKey}`}
          style={{ transformOrigin: 'top center' }}
          initial={
            swingPulseKey > 0 && !prefersReducedMotion
              ? { rotateZ: isFlipped ? -5 : 5 }
              : false
          }
          animate={
            swingPulseKey > 0 && !prefersReducedMotion
              ? { rotateZ: [isFlipped ? -6 : 6, isFlipped ? 3.5 : -3.5, 0] }
              : { rotateZ: 0 }
          }
          transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
          className="polaroid-3d-stage relative w-full"
        >
          {/* Moving dynamic shadow */}
          <motion.div
            aria-hidden="true"
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    x: isFlipped ? -10 : 8,
                    y: isFlipped ? 18 : 14,
                    scale: isFlipped ? 0.98 : 0.95,
                    opacity: isFlipped ? 0.68 : 0.56,
                  }
            }
            transition={{ type: 'spring', stiffness: 190, damping: 20 }}
            className="pointer-events-none absolute inset-2 rounded-[4px] bg-black/80 blur-xl -z-10"
          />

          <motion.div
            role="button"
            tabIndex={0}
            aria-pressed={isFlipped}
            aria-label={
              isFlipped
                ? 'اضغط لإرجاع البطاقة للواجهة'
                : 'اضغط لقلب البطاقة وقراءة الملاحظة الخلفية'
            }
            onClick={triggerFlip}
            onKeyDown={handleKeyDown}
            onPointerEnter={(e) => {
              if (e.pointerType === 'mouse') playHoverSound();
            }}
            whileHover={prefersReducedMotion ? undefined : { y: -4 }}
            animate={
              prefersReducedMotion
                ? { rotateY: isFlipped ? 180 : 0 }
                : {
                    rotateY: isFlipped ? 180 : 0,
                    scale: swingPulseKey > 0 ? [1, 1.07, 1] : 1,
                  }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0.18 }
                : {
                    rotateY: {
                      type: 'spring',
                      stiffness: 190,
                      damping: 16,
                      mass: 0.95,
                    },
                    scale: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
                  }
            }
            className="polaroid-3d-card relative w-full cursor-pointer rounded-[3px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D]"
          >
            {/* FRONT FACE */}
            <div className="polaroid-face relative rounded-[3px] bg-[#F4E8D8] p-2 pb-5 sm:p-2.5 sm:pb-6 lg:p-3 lg:pb-7 shadow-[0_24px_44px_-12px_rgba(0,0,0,0.88),0_0_24px_rgba(255,122,61,0.14)] border border-[#B98A9E]/35">
              <div
                className={`relative w-full overflow-hidden bg-[#14081A] shadow-inner flex items-center justify-center ${mediaBoxHeightClasses}`}
              >
                {hasMediaUrl && !loaded && !failed && (
                  <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#2B1234] via-[#1C0B24] to-[#14081A]" />
                )}

                {!hasMediaUrl || failed ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2.5 p-4 text-center bg-gradient-to-br from-[#270F30] via-[#190920] to-[#110516]">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 64 64"
                      className="h-12 w-12 opacity-90 drop-shadow-[0_4px_12px_rgba(255,77,141,0.35)]"
                    >
                      <path
                        d="M32 52L29 49.3C18.2 39.5 11 33 11 25C11 18.4 16.2 13 22.8 13C26.5 13 30 14.7 32 17.5C34 14.7 37.5 13 41.2 13C47.8 13 53 18.4 53 25C53 33 45.8 39.5 35 49.3L32 52Z"
                        fill="none"
                        stroke="#FF4D8D"
                        strokeWidth="2"
                      />
                      <path
                        d="M32 43L30.2 41.4C23.8 35.6 19.5 31.7 19.5 27C19.5 23.1 22.6 20 26.5 20C28.7 20 30.8 21 32 22.6C33.2 21 35.3 20 37.5 20C41.4 20 44.5 23.1 44.5 27C44.5 31.7 40.2 35.6 33.8 41.4L32 43Z"
                        fill="#FF7A3D"
                        fillOpacity="0.28"
                      />
                    </svg>
                    <span className="font-calligraphy text-lg text-[#F4E8D8]/85">
                      لحظة خاصة بكما
                    </span>
                  </div>
                ) : mediaKind === 'video' ? (
                  <video
                    src={imageUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                    controls={false}
                    disablePictureInPicture
                    onLoadedData={() => setLoaded(true)}
                    onCanPlay={() => setLoaded(true)}
                    onError={() => setFailed(true)}
                    className={`w-full h-full object-cover object-center transition-opacity duration-300 ${
                      loaded ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                ) : (
                  <img
                    src={imageUrl}
                    alt={altText}
                    referrerPolicy="no-referrer"
                    onLoad={() => setLoaded(true)}
                    onError={() => setFailed(true)}
                    className={`w-full h-full object-cover object-center transition-opacity duration-300 ${
                      loaded ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                )}
              </div>
            </div>

            {/* BACK FACE (Aged Polaroid Paper Back) */}
            <div
              dir="rtl"
              className="polaroid-face polaroid-face-back absolute inset-0 rounded-[3px] bg-[#EFE2CF] p-3.5 sm:p-5 shadow-[0_24px_44px_-12px_rgba(0,0,0,0.88),0_0_24px_rgba(255,122,61,0.14)] border border-[#B98A9E]/45 flex flex-col justify-between text-[#2A1024]"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, rgba(130, 82, 102, 0.06) 0px, rgba(130, 82, 102, 0.06) 1px, transparent 1px, transparent 22px)',
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-bold text-[#7A3F5D] leading-tight">
                  {nightTitle}
                </span>

                <svg
                  aria-hidden="true"
                  viewBox="0 0 42 42"
                  className="h-9 w-9 shrink-0 rotate-6 opacity-80"
                >
                  <rect
                    x="3"
                    y="3"
                    width="36"
                    height="36"
                    rx="2"
                    fill="#F4E8D8"
                    stroke="#9E476E"
                    strokeWidth="1.2"
                    strokeDasharray="2.5 2"
                  />
                  <circle
                    cx="21"
                    cy="21"
                    r="11"
                    fill="none"
                    stroke="#FF4D8D"
                    strokeOpacity="0.55"
                    strokeWidth="1"
                  />
                  <path
                    d="M21 26.5L19.9 25.5C16.2 22.1 14 20.1 14 17.6C14 15.6 15.6 14 17.6 14C18.8 14 20 14.6 21 15.6C22 14.6 23.2 14 24.4 14C26.4 14 28 15.6 28 17.6C28 20.1 25.8 22.1 22.1 25.5L21 26.5Z"
                    fill="#FF4D8D"
                    fillOpacity="0.72"
                  />
                </svg>
              </div>

              <div className="my-auto py-2 px-2 text-center overflow-y-auto scrapbook-scroll">
                <p className="font-challenge text-[clamp(1.05rem,1.65vw,1.45rem)] font-bold text-[#1B0A22] leading-relaxed text-balance">
                  {displayCaption}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-[#B98A9E]/35 pt-2">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 36 24"
                  className="h-4 w-7 text-[#FF4D8D]/80"
                >
                  <path
                    d="M4 16 C8 12, 11 8, 15 11 C17 6, 22 6, 21 11 C25 11, 29 14, 33 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <span
                  dir="ltr"
                  className="text-[9px] tracking-[0.2em] uppercase font-semibold text-[#8A5770]/75"
                >
                  SAHRA · INSTANT
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Subtle one-time hint */}
      {!hintDismissed && (
        <p
          dir="rtl"
          className="mt-2 text-[11px] font-medium text-[#B98A9E]/85 text-center"
        >
          اضغط لتقلب الصورة
        </p>
      )}
    </div>
  );
}
