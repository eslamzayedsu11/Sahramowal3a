import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { useEffect, useState } from 'react';

const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], input, textarea, select, label, summary';

export function CustomCursor() {
  const prefersReducedMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const rawX = useMotionValue(-100);
  const rawY = useMotionValue(-100);
  const x = useSpring(rawX, { stiffness: 460, damping: 34, mass: 0.35 });
  const y = useSpring(rawY, { stiffness: 460, damping: 34, mass: 0.35 });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const check = () => {
      setEnabled(pointerQuery.matches && !prefersReducedMotion);
    };
    check();

    pointerQuery.addEventListener('change', check);
    return () => pointerQuery.removeEventListener('change', check);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!enabled) {
      setVisible(false);
      return;
    }

    const handleMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      rawX.set(e.clientX);
      rawY.set(e.clientY);
      setVisible(true);

      const target = e.target as HTMLElement | null;
      const interactive = Boolean(target?.closest(INTERACTIVE_SELECTOR));
      setIsInteractive(interactive);
    };

    const handleDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setIsPressed(true);
    };

    const handleUp = () => setIsPressed(false);
    const handleLeave = () => setVisible(false);

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerdown', handleDown, { passive: true });
    window.addEventListener('pointerup', handleUp, { passive: true });
    document.addEventListener('mouseleave', handleLeave);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
      document.removeEventListener('mouseleave', handleLeave);
    };
  }, [enabled, rawX, rawY]);

  if (!enabled || !visible) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{
        x,
        y,
        translateX: '-50%',
        translateY: '-50%',
      }}
      animate={{
        scale: isPressed ? 0.85 : isInteractive ? 1.65 : 1,
        opacity: visible ? 1 : 0,
      }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="pointer-events-none fixed top-0 left-0 z-[9999] flex items-center justify-center"
    >
      {/* Soft glowing aura */}
      <div
        className="h-7 w-7 rounded-full transition-colors duration-150"
        style={{
          background: isInteractive
            ? 'radial-gradient(circle, rgba(255,77,141,0.34) 0%, rgba(255,122,61,0.12) 55%, transparent 72%)'
            : 'radial-gradient(circle, rgba(255,122,61,0.25) 0%, transparent 70%)',
        }}
      />

      {/* Center glowing candle/heart dot */}
      {isInteractive ? (
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          className="absolute drop-shadow-[0_0_6px_rgba(255,77,141,0.9)]"
        >
          <path
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            fill="#FF4D8D"
            fillOpacity="0.82"
          />
        </svg>
      ) : (
        <div
          className="absolute h-2 w-2 rounded-full bg-[#F4E8D8]"
          style={{
            boxShadow: '0 0 8px 2px rgba(255, 122, 61, 0.85)',
          }}
        />
      )}
    </motion.div>
  );
}
