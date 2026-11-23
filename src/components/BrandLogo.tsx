import { motion, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { playHoverSound, playSecretUnlockSound } from '../utils/sound';

interface BrandLogoProps {
  onTripleTap?: () => void;
  size?: 'md' | 'lg' | 'xl';
}

export function BrandLogo({ onTripleTap, size = 'lg' }: BrandLogoProps) {
  const prefersReducedMotion = useReducedMotion();
  const tapTimestampsRef = useRef<number[]>([]);

  const handleTap = () => {
    if (!onTripleTap) return;
    const now = Date.now();
    const recent = tapTimestampsRef.current.filter((t) => now - t <= 1500);
    recent.push(now);
    tapTimestampsRef.current = recent;

    if (recent.length >= 3) {
      tapTimestampsRef.current = [];
      playSecretUnlockSound();
      onTripleTap();
    }
  };

  const titleClasses =
    size === 'xl'
      ? 'text-[clamp(2.25rem,3.6vw,4.1rem)]'
      : size === 'lg'
        ? 'text-[clamp(1.9rem,3vw,3.3rem)]'
        : 'text-3xl sm:text-4xl';

  const flameClasses =
    size === 'xl'
      ? 'h-[clamp(2.2rem,3.4vw,3.6rem)] w-[clamp(1.85rem,2.8vw,3rem)]'
      : size === 'lg'
        ? 'h-9 w-8 sm:h-11 sm:w-9'
        : 'h-8 w-7';

  return (
    <button
      type="button"
      onClick={handleTap}
      onPointerEnter={(e) => {
        if (onTripleTap && e.pointerType === 'mouse') {
          playHoverSound();
        }
      }}
      aria-label="سهرة مولعة"
      className="group relative inline-flex items-center justify-center gap-3 min-h-[48px] px-5 sm:px-7 py-2 sm:py-2.5 rounded-2xl border border-[#FF4D8D]/30 bg-[#1B0A22]/75 neon-ember-box hover:border-[#FF4D8D]/65 hover:brightness-110 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D]/80 active:scale-[0.98] transition-all"
    >
      {/* Wall mounting screws */}
      <span
        aria-hidden="true"
        className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-[#B98A9E]/45"
      />
      <span
        aria-hidden="true"
        className="absolute top-2 left-2.5 h-1.5 w-1.5 rounded-full bg-[#B98A9E]/45"
      />

      {/* Neon wall sign text */}
      <motion.span
        className={`font-neon ${titleClasses} neon-rose-text leading-none tracking-wide transition-all group-hover:drop-shadow-[0_0_16px_rgba(255,77,141,0.95)]`}
        animate={
          prefersReducedMotion
            ? { opacity: 1 }
            : {
                opacity: [1, 0.93, 1, 0.87, 1, 0.96, 1],
              }
        }
        transition={
          prefersReducedMotion
            ? undefined
            : {
                duration: 4.6,
                repeat: Infinity,
                times: [0, 0.14, 0.18, 0.62, 0.65, 0.85, 1],
                ease: 'easeInOut',
              }
        }
      >
        سهرة مولعة
      </motion.span>

      {/* Hand-drawn SVG living flame (no emoji) */}
      <motion.svg
        aria-hidden="true"
        viewBox="0 0 36 44"
        className={`${flameClasses} shrink-0 origin-bottom`}
        animate={
          prefersReducedMotion
            ? { opacity: 1 }
            : {
                scaleY: [1, 1.09, 0.95, 1.06, 1],
                scaleX: [1, 0.95, 1.04, 0.97, 1],
                rotate: [-2, 3, -3, 2, -2],
                filter: [
                  'drop-shadow(0 0 8px rgba(255,122,61,0.75))',
                  'drop-shadow(0 0 14px rgba(255,77,141,0.9))',
                  'drop-shadow(0 0 7px rgba(255,122,61,0.65))',
                  'drop-shadow(0 0 12px rgba(255,77,141,0.85))',
                  'drop-shadow(0 0 8px rgba(255,122,61,0.75))',
                ],
              }
        }
        transition={
          prefersReducedMotion
            ? undefined
            : {
                duration: 1.9,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
      >
        <path
          d="M18.5 2C20.2 9.4 29 14.5 29 24.8C29 33.4 23.6 40.5 17.6 40.5C10.5 40.5 6 34.1 6 26.2C6 19.3 10.6 14.1 13.3 10.5C13.6 14.3 15.6 16.3 16.5 16.3C14.7 11.4 16.1 6.1 18.5 2Z"
          fill="#FF7A3D"
        />
        <path
          d="M18.1 13.5C19.8 18.5 24.4 22.1 24.4 28.1C24.4 33.5 21.1 38.2 17.3 38.2C13 38.2 10.2 34 10.2 28.9C10.2 24.6 12.8 21.1 14.8 18.5C15.1 21 16.3 22.4 17 22.4C16.2 19.2 16.9 16.1 18.1 13.5Z"
          fill="#FF4D8D"
        />
        <path
          d="M17.4 23.8C19.1 26.6 20.6 29.1 20.6 32.1C20.6 34.8 19.1 36.8 17.2 36.8C15.2 36.8 13.8 34.8 13.8 32.3C13.8 29.4 15.5 26.4 17.4 23.8Z"
          fill="#F4E8D8"
        />
      </motion.svg>
    </button>
  );
}
