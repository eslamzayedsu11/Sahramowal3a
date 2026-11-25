import { motion, useReducedMotion } from 'motion/react';
import { BrandLogo } from './BrandLogo';
import { playHoverSound, playWarmChime } from '../utils/sound';

interface AgeGateScreenProps {
  onConfirm: () => void;
}

export function AgeGateScreen({ onConfirm }: AgeGateScreenProps) {
  const prefersReducedMotion = useReducedMotion();

  const handleEnter = () => {
    playWarmChime();
    onConfirm();
  };

  return (
    <motion.main
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden flex flex-col items-center justify-center px-5 py-8"
    >
      <div className="w-full max-w-[1600px] mx-auto flex flex-col items-center justify-center">
        <div className="mb-[clamp(1.2rem,3vh,2rem)]">
          <BrandLogo size="lg" />
        </div>

        {/* Cream Love-Letter Scrapbook Gate Card */}
        <div className="relative w-full max-w-lg lg:max-w-xl">
          <div
            aria-hidden="true"
            className="washi-tape absolute -top-3 right-8 z-20 h-6 w-20 -rotate-6 rounded-[2px]"
          />
          <div
            aria-hidden="true"
            className="washi-tape-cream absolute -top-3 left-8 z-20 h-6 w-20 rotate-6 rounded-[2px]"
          />

          <div className="scrapbook-paper torn-edge-note relative px-7 pt-[clamp(1.75rem,4vh,2.75rem)] pb-[clamp(2rem,4.5vh,3rem)] sm:px-10 text-center text-[#1B0A22] -rotate-[0.8deg]">
            <div className="mx-auto mb-4 flex justify-center">
              <svg width="64" height="64" viewBox="0 0 68 68" fill="none" aria-hidden="true">
                <path
                  d="M34 4C41.2 4 45.4 7.8 50.8 9.6C56.2 11.4 61.5 16.4 62.6 22.8C63.7 29.2 61.2 35.4 60.4 41.2C59.6 47 56.2 54.4 50.1 58.1C44 61.8 39.2 63.6 34 63.6C28.8 63.6 22.8 61.4 17.5 57.5C12.2 53.6 7.8 47.4 6.8 40.9C5.8 34.4 5.2 28.4 7.6 22.1C10 15.8 14.8 10.6 20.6 8.2C26.4 5.8 28.2 4 34 4Z"
                  fill="#8F1D48"
                />
                <circle
                  cx="34"
                  cy="34"
                  r="22"
                  fill="#B3245B"
                  stroke="#FF4D8D"
                  strokeOpacity="0.45"
                  strokeWidth="1.5"
                />
                <text
                  x="34"
                  y="39"
                  textAnchor="middle"
                  fill="#F4E8D8"
                  fontSize="15"
                  fontWeight="700"
                  fontFamily="IBM Plex Sans Arabic, sans-serif"
                >
                  +18
                </text>
              </svg>
            </div>

            <h1 className="font-calligraphy text-[clamp(1.75rem,3vw,2.5rem)] font-bold text-[#1B0A22] text-balance leading-snug mb-3">
              هذا الموقع للمتزوجين فقط – 18+
            </h1>

            <p className="text-[clamp(0.9rem,1.2vw,1.06rem)] text-[#4A253A] leading-relaxed mb-7 max-w-md mx-auto">
              دفتر سهرات حميمي وأنيق صُمّم للأزواج وحدهم، لتجديد الشغف والضحك والقرب في خصوصية تامة.
            </p>

            <motion.button
              type="button"
              whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
              onPointerEnter={(e) => {
                if (e.pointerType === 'mouse') playHoverSound();
              }}
              onClick={handleEnter}
              className="btn-shimmer relative overflow-hidden w-full min-h-[54px] px-6 py-3 rounded-xl bg-[#14081A] hover:bg-[#230E2D] text-[#F4E8D8] border border-[#FF4D8D]/55 hover:border-[#FF4D8D] font-sans-ar font-bold text-sm sm:text-base shadow-[0_10px_24px_rgba(20,8,26,0.35)] cursor-pointer flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D]"
            >
              <span>نعم، نحن متزوجان (+18) — افتح الدفتر</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
