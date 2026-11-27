import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { Flame, Settings } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { PWAInstallBanner } from './PWAInstallBanner';
import type { CategoryId, Challenge } from '../types';
import {
  playHoverSound,
  playTapSound,
  playWarmChime,
  playWhooshSound,
} from '../utils/sound';

interface HomeScreenProps {
  challenges: Challenge[];
  loading: boolean;
  error: string | null;
  candleMode: boolean;
  onToggleCandleMode: () => void;
  onOpenSettings: () => void;
  onSelectCategory: (categoryId: CategoryId) => void;
  onOpenAdmin: () => void;
}

interface ParallaxNightCardProps {
  baseRotate: number;
  hoverRotate: number;
  delay: number;
  className: string;
  onClick: () => void;
  children: (hovered: boolean) => ReactNode;
}

function ParallaxNightCard({
  baseRotate,
  hoverRotate,
  delay,
  className,
  onClick,
  children,
}: ParallaxNightCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  const rawRotX = useMotionValue(0);
  const rawRotY = useMotionValue(0);
  const tiltX = useSpring(rawRotX, { stiffness: 220, damping: 22 });
  const tiltY = useSpring(rawRotY, { stiffness: 220, damping: 22 });

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (prefersReducedMotion || e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    rawRotX.set(-ny * 9);
    rawRotY.set(nx * 11);
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
    setHovered(true);
    if (e.pointerType === 'mouse') {
      playHoverSound();
    }
  };

  const handlePointerLeave = () => {
    setHovered(false);
    rawRotX.set(0);
    rawRotY.set(0);
  };

  return (
    <motion.button
      type="button"
      style={
        prefersReducedMotion
          ? undefined
          : {
              transformPerspective: 1000,
              rotateX: tiltX,
              rotateY: tiltY,
            }
      }
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, rotate: baseRotate * 1.2 }}
      animate={
        prefersReducedMotion
          ? { opacity: 1 }
          : { opacity: 1, y: 0, rotate: baseRotate }
      }
      whileHover={
        prefersReducedMotion
          ? undefined
          : { scale: 1.032, rotate: hoverRotate, y: -8 }
      }
      whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.22, delay: delay * 0.5, ease: [0.16, 1, 0.3, 1] }}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
      className={className}
    >
      {children(hovered)}
    </motion.button>
  );
}

export function HomeScreen({
  challenges,
  loading,
  error,
  candleMode,
  onToggleCandleMode,
  onOpenSettings,
  onSelectCategory,
  onOpenAdmin,
}: HomeScreenProps) {
  const prefersReducedMotion = useReducedMotion();

  const getCategoryCount = (categoryId: CategoryId) =>
    challenges.filter((c) => c.category === categoryId && c.active).length;

  const handleChooseNight = (categoryId: CategoryId) => {
    playWarmChime();
    playWhooshSound();
    onSelectCategory(categoryId);
  };

  return (
    <motion.main
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden flex flex-col items-center justify-between px-4 sm:px-6 lg:px-10 pt-16 lg:pt-[62px] pb-6 lg:pb-[clamp(0.75rem,2vh,1.75rem)]"
    >
      {/* Top Quick Controls (Candle + Settings beside fixed Sound & Fullscreen toggles) */}
      <div className="fixed top-3 left-[116px] z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            playTapSound();
            onToggleCandleMode();
          }}
          aria-label={candleMode ? 'إيقاف وضع الشمعة' : 'تفعيل وضع الشمعة'}
          title="وضع الشمعة"
          className={`min-h-[44px] min-w-[44px] rounded-full border flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.45)] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A3D] ${
            candleMode
              ? 'border-[#FF7A3D] bg-[#3A1A14]/95 text-[#FF7A3D]'
              : 'border-[#B98A9E]/35 bg-[#1C0B24]/92 text-[#F4E8D8] hover:border-[#FF7A3D]/65'
          }`}
        >
          <Flame className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            playTapSound();
            onOpenSettings();
          }}
          aria-label="الإعدادات"
          title="الإعدادات"
          className="min-h-[44px] min-w-[44px] rounded-full border border-[#B98A9E]/35 bg-[#1C0B24]/92 text-[#F4E8D8] hover:border-[#FF4D8D]/65 flex items-center justify-center shadow-[0_6px_18px_rgba(0,0,0,0.45)] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D]"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Centered Max-Width Desktop Stage (~1600px on wide screens) */}
      <div className="w-full max-w-[1600px] mx-auto flex-1 min-h-0 flex flex-col justify-between gap-[clamp(0.75rem,2vh,1.75rem)]">
        {/* Rebalanced Top Scrapbook Header */}
        <header className="w-full flex flex-col items-center text-center gap-1.5 shrink-0 pt-1">
          <BrandLogo onTripleTap={onOpenAdmin} size="xl" />
          <p className="mt-1 inline-block -rotate-1 font-calligraphy text-[clamp(1.15rem,1.9vw,1.7rem)] text-[#B98A9E]">
            اختارا نكهة السهرة على طاولة منتصف الليل...
          </p>
        </header>

        {error && (
          <div className="w-full max-w-2xl mx-auto rounded-[4px] border border-[#FF4D8D]/40 bg-[#250C2B]/90 px-5 py-3 text-sm text-[#F4E8D8] text-center shrink-0">
            {error}
          </div>
        )}

        {/* Diagonal Staircase Composition: Top-Right -> Center -> Bottom-Left */}
        <section
          aria-label="أقسام السهرة"
          className="relative w-full flex-1 min-h-0 flex items-center justify-center py-2 lg:py-4"
        >
          {loading ? (
            <div className="w-full max-w-[1380px] mx-auto flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:gap-8 items-center">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-[90%] sm:w-[78%] lg:w-full h-[clamp(210px,30dvh,300px)] rounded-lg border border-[#B98A9E]/15 bg-[#1F0B29]/70 animate-pulse p-6 ${
                    i === 0
                      ? 'self-start lg:self-auto lg:-translate-y-[clamp(1.75rem,4.5dvh,3.75rem)]'
                      : i === 1
                        ? 'self-center lg:self-auto'
                        : 'self-end lg:self-auto lg:translate-y-[clamp(1.75rem,4.5dvh,3.75rem)]'
                  }`}
                />
              ))}
            </div>
          ) : (
            <div
              dir="rtl"
              className="relative w-full max-w-[1380px] mx-auto flex flex-col lg:grid lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-7 items-stretch lg:items-center lg:py-[clamp(1.85rem,4.6dvh,3.85rem)]"
            >
              {/* Subtle Diagonal Connecting Thread behind the 3 Staircase Steps (Desktop) */}
              <svg
                aria-hidden="true"
                viewBox="0 0 1200 320"
                preserveAspectRatio="none"
                className="pointer-events-none hidden lg:block absolute inset-0 w-full h-full z-0"
              >
                <defs>
                  <linearGradient id="stairThreadGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FF70A6" stopOpacity="0.48" />
                    <stop offset="50%" stopColor="#FF4D8D" stopOpacity="0.62" />
                    <stop offset="100%" stopColor="#9D4EDD" stopOpacity="0.52" />
                  </linearGradient>
                </defs>
                <path
                  d="M 1020 55 C 830 55, 760 160, 600 160 C 440 160, 370 265, 180 265"
                  fill="none"
                  stroke="url(#stairThreadGrad)"
                  strokeWidth="2"
                  strokeDasharray="7 7"
                  strokeLinecap="round"
                />
                <circle cx="1020" cy="55" r="4.5" fill="#FF70A6" fillOpacity="0.65" />
                <circle cx="600" cy="160" r="4.5" fill="#FF4D8D" fillOpacity="0.7" />
                <circle cx="180" cy="265" r="4.5" fill="#C77DFF" fillOpacity="0.65" />
              </svg>

              {/* STEP 1 (Top-Right): سهرة الدلع — Pink Velvet Ribbon-Tied Tag */}
              <div className="w-[92%] sm:w-[78%] lg:w-full self-start lg:self-auto lg:-translate-y-[clamp(1.8rem,4.8dvh,4rem)] relative z-10 hover:z-30">
                <ParallaxNightCard
                  baseRotate={-2.4}
                  hoverRotate={-0.6}
                  delay={0.05}
                  onClick={() => handleChooseNight('dal3')}
                  className="w-full relative text-right cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF70A6]"
                >
                  {(hovered) => (
                    <>
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 110 70"
                        className="pointer-events-none absolute -top-7 right-6 z-20 w-24 h-16 drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:scale-105"
                      >
                        <path
                          d="M52 34 C44 48, 36 58, 28 65 L37 64 C44 55, 50 45, 54 36 Z"
                          fill="#D63876"
                        />
                        <path
                          d="M58 34 C68 47, 78 56, 86 62 L75 64 C66 56, 59 46, 55 36 Z"
                          fill="#E84B8A"
                        />
                        <path
                          d="M52 30 C36 12, 12 16, 16 32 C19 43, 39 39, 52 32 Z"
                          fill="#FF70A6"
                        />
                        <path
                          d="M58 30 C74 12, 98 16, 94 32 C91 43, 71 39, 58 32 Z"
                          fill="#FF5C99"
                        />
                        <path
                          d="M24 25 C31 20, 41 22, 48 28"
                          stroke="#FFD1E3"
                          strokeOpacity="0.6"
                          strokeWidth="1.8"
                          fill="none"
                          strokeLinecap="round"
                        />
                        <path
                          d="M86 25 C79 20, 69 22, 62 28"
                          stroke="#FFD1E3"
                          strokeOpacity="0.55"
                          strokeWidth="1.8"
                          fill="none"
                          strokeLinecap="round"
                        />
                        <ellipse cx="55" cy="31" rx="7" ry="6" fill="#C42B67" />
                      </svg>

                      <div
                        className="relative bg-[#F4E8D8] text-[#281024] px-5 lg:px-6 pt-[clamp(1.5rem,3.4vh,2.35rem)] pb-[clamp(1.1rem,2.4vh,1.75rem)] border border-[#FF70A6]/45 transition-shadow duration-300"
                        style={{
                          clipPath: 'polygon(0 0, 86% 0, 100% 16%, 100% 100%, 0 100%)',
                          boxShadow: hovered
                            ? '0 28px 56px -10px rgba(0,0,0,0.88), 0 0 36px -4px rgba(255,112,166,0.58)'
                            : '0 22px 45px -12px rgba(0,0,0,0.8), 0 0 24px -6px rgba(255,112,166,0.35)',
                        }}
                      >
                        <div className="border border-dashed border-[#B98A9E]/75 px-4 lg:px-5 py-[clamp(0.85rem,2vh,1.45rem)]">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs font-semibold tracking-wide text-[#9E476E]">
                              ٠١ · بطاقة همس
                            </span>
                            <span className="h-3 w-3 rounded-full bg-[#14081A] ring-2 ring-[#FF70A6]/60" />
                          </div>

                          <h2 className="font-calligraphy text-[clamp(1.75rem,2.5vw,2.45rem)] font-bold text-[#2A0E24] mb-1.5 leading-tight">
                            سهرة الدلع
                          </h2>

                          <p className="text-[clamp(0.84rem,0.98vw,0.98rem)] text-[#582E49] leading-relaxed mb-[clamp(0.75rem,1.8vh,1.25rem)]">
                            همسات دافئة ولمسات ناعمة تذيب المسافات بينكما
                          </p>

                          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[#9E476E] pt-2.5 border-t border-[#B98A9E]/40 tabular-nums">
                            <span>
                              {getCategoryCount('dal3') > 0
                                ? `${getCategoryCount('dal3')} تحديات جاهزة`
                                : 'لا توجد تحديات مفعّلة بعد'}
                            </span>
                            <span className="text-[#D63876] group-hover:-translate-x-1.5 transition-transform">
                              افتح البطاقة ←
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </ParallaxNightCard>
              </div>

              {/* STEP 2 (Center): سهرة المتعة والاثارة — Flickering Neon Sign */}
              <div className="w-[92%] sm:w-[78%] lg:w-full self-center lg:self-auto relative z-20 hover:z-30">
                <ParallaxNightCard
                  baseRotate={1.4}
                  hoverRotate={0.2}
                  delay={0.12}
                  onClick={() => handleChooseNight('motaa')}
                  className="w-full relative text-right cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D]"
                >
                  {(hovered) => (
                    <div
                      className="relative rounded-md bg-[#120718] border-2 px-5 lg:px-7 py-[clamp(1.2rem,2.8vh,2.05rem)] transition-all duration-300"
                      style={{
                        borderColor: hovered ? '#FF4D8D' : 'rgba(255,77,141,0.85)',
                        boxShadow: hovered
                          ? '0 30px 64px -10px rgba(0,0,0,0.95), 0 0 46px rgba(255,77,141,0.62), inset 0 0 32px rgba(255,122,61,0.28)'
                          : '0 26px 54px -12px rgba(0,0,0,0.9), 0 0 32px rgba(255,77,141,0.38), inset 0 0 24px rgba(255,122,61,0.16)',
                      }}
                    >
                      <span aria-hidden="true" className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-[#FF7A3D]/60" />
                      <span aria-hidden="true" className="absolute top-2.5 left-2.5 h-2 w-2 rounded-full bg-[#FF7A3D]/60" />
                      <span aria-hidden="true" className="absolute bottom-2.5 right-2.5 h-2 w-2 rounded-full bg-[#FF7A3D]/60" />
                      <span aria-hidden="true" className="absolute bottom-2.5 left-2.5 h-2 w-2 rounded-full bg-[#FF7A3D]/60" />

                      <div className="mb-2.5 flex items-center justify-between">
                        <svg aria-hidden="true" viewBox="0 0 84 36" className="h-8 w-20">
                          <path
                            d="M4 22 L18 22 L24 10 L32 30 L40 6 L47 24 L54 18 L66 18 C72 18 76 13 80 18"
                            fill="none"
                            stroke="#FF4D8D"
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={candleMode ? 'opacity-80' : 'neon-flicker'}
                            style={{
                              filter: 'drop-shadow(0 0 7px #FF4D8D)',
                            }}
                          />
                          <circle cx="80" cy="18" r="2.8" fill="#FF7A3D" />
                        </svg>
                        <span className="text-[11px] font-bold tracking-wider text-[#FF7A3D]">
                          ٠٢ · NEON NIGHT
                        </span>
                      </div>

                      <h2
                        className={`font-neon text-[clamp(1.75rem,2.45vw,2.45rem)] neon-rose-text mb-1.5 leading-tight ${
                          candleMode ? 'opacity-90' : 'neon-flicker'
                        }`}
                      >
                        سهرة المتعة والاثارة
                      </h2>

                      <p className="text-[clamp(0.84rem,0.98vw,0.98rem)] text-[#F4E8D8]/88 leading-relaxed mb-[clamp(0.8rem,2vh,1.45rem)]">
                        شغف متجدد ولحظات جريئة تشعل الأجواء بالحب
                      </p>

                      <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[#B98A9E] pt-2.5 border-t border-[#FF4D8D]/25 tabular-nums">
                        <span>
                          {getCategoryCount('motaa') > 0
                            ? `${getCategoryCount('motaa')} تحديات جاهزة`
                            : 'لا توجد تحديات مفعّلة بعد'}
                        </span>
                        <span className="text-[#FF7A3D] group-hover:-translate-x-1.5 transition-transform">
                          أشعل الليلة ←
                        </span>
                      </div>
                    </div>
                  )}
                </ParallaxNightCard>
              </div>

              {/* STEP 3 (Bottom-Left): سهرة على آخرنا — Black Wax-Sealed Envelope */}
              <div className="w-[92%] sm:w-[78%] lg:w-full self-end lg:self-auto lg:translate-y-[clamp(1.8rem,4.8dvh,4rem)] relative z-10 hover:z-30">
                <ParallaxNightCard
                  baseRotate={-1.8}
                  hoverRotate={0}
                  delay={0.19}
                  onClick={() => handleChooseNight('akher')}
                  className="w-full relative text-right cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9D4EDD]"
                >
                  {(hovered) => (
                    <div
                      className="relative overflow-hidden rounded-[6px] bg-[#0D0612] border px-5 lg:px-6 py-[clamp(1.2rem,2.7vh,1.95rem)] transition-all duration-300"
                      style={{
                        borderColor: hovered ? '#C77DFF' : 'rgba(157,78,221,0.55)',
                        boxShadow: hovered
                          ? '0 28px 58px -10px rgba(0,0,0,0.95), 0 0 48px -4px rgba(157,78,221,0.68)'
                          : '0 24px 50px -12px rgba(0,0,0,0.92), 0 0 38px -6px rgba(157,78,221,0.5)',
                      }}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 320 200"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute inset-0 w-full h-full opacity-45"
                      >
                        <path
                          d="M0 0 L160 105 L320 0"
                          fill="none"
                          stroke="#9D4EDD"
                          strokeOpacity="0.45"
                          strokeWidth="1.2"
                        />
                        <path
                          d="M0 200 L125 90 M320 200 L195 90"
                          fill="none"
                          stroke="#B98A9E"
                          strokeOpacity="0.22"
                          strokeWidth="1"
                        />
                      </svg>

                      <div className="relative z-10 mb-2.5 flex items-center justify-between">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 58 58"
                          className="h-11 w-11 lg:h-12 lg:w-12 drop-shadow-[0_6px_12px_rgba(157,78,221,0.45)] transition-transform duration-300 group-hover:scale-105"
                        >
                          <path
                            d="M29 3C35 3 39 6 44 7.5C49 9 53 14 54 19.5C55 25 53 31 52 36C51 41 48 47 43 50C38 53 33.5 55 29 55C24.5 55 19.5 53 15 49.5C10.5 46 6.5 41 5.5 35.5C4.5 30 4 24.5 6.5 19C9 13.5 13 9 18 7C23 5 24.5 3 29 3Z"
                            fill="#5A189A"
                          />
                          <circle
                            cx="29"
                            cy="29"
                            r="17"
                            fill="#7B2CBF"
                            stroke="#C77DFF"
                            strokeOpacity="0.55"
                            strokeWidth="1.2"
                          />
                          <path
                            d="M29 36.5L27.7 35.3C23.1 31.1 20 28.3 20 24.9C20 22.1 22.2 20 25 20C26.6 20 28.1 20.8 29 22C29.9 20.8 31.4 20 33 20C35.8 20 38 22.1 38 24.9C38 28.3 34.9 31.1 30.3 35.3L29 36.5Z"
                            fill="#F4E8D8"
                            fillOpacity="0.9"
                          />
                        </svg>
                        <span className="text-[11px] font-medium tracking-wide text-[#C77DFF]">
                          ٠٣ · مغلف مختوم بالشمع
                        </span>
                      </div>

                      <h2 className="relative z-10 font-calligraphy text-[clamp(1.75rem,2.5vw,2.45rem)] font-bold text-[#F4E8D8] mb-1.5 leading-tight">
                        سهرة على آخرنا
                      </h2>

                      <p className="relative z-10 text-[clamp(0.84rem,0.98vw,0.98rem)] text-[#B98A9E] leading-relaxed mb-[clamp(0.75rem,1.8vh,1.25rem)]">
                        ليلة بلا حدود ترفع نبض القرب لأقصى مداه
                      </p>

                      <div className="relative z-10 flex items-center justify-between text-xs sm:text-sm font-semibold text-[#C77DFF] pt-2.5 border-t border-[#9D4EDD]/30 tabular-nums">
                        <span>
                          {getCategoryCount('akher') > 0
                            ? `${getCategoryCount('akher')} تحديات جاهزة`
                            : 'لا توجد تحديات مفعّلة بعد'}
                        </span>
                        <span className="text-[#F4E8D8] group-hover:-translate-x-1.5 transition-transform">
                          اكسر الختم ←
                        </span>
                      </div>
                    </div>
                  )}
                </ParallaxNightCard>
              </div>
            </div>
          )}
        </section>

        {/* Tasteful PWA Install Banner (kept compact so zero scroll on desktop) */}
        <div className="w-full flex justify-center shrink-0">
          <PWAInstallBanner />
        </div>
      </div>
    </motion.main>
  );
}
