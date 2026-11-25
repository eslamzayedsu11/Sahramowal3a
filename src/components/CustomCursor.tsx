import { useEffect, useRef, useState } from 'react';

const INTERACTIVE_SELECTOR =
  'a, button, [role="button"], input, textarea, select, label, summary';

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const cursorRef = useRef<HTMLDivElement | null>(null);
  const visibleRef = useRef(false);
  const interactiveRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const check = () => {
      setEnabled(pointerQuery.matches && !motionQuery.matches);
    };
    check();

    pointerQuery.addEventListener('change', check);
    motionQuery.addEventListener('change', check);
    return () => {
      pointerQuery.removeEventListener('change', check);
      motionQuery.removeEventListener('change', check);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      visibleRef.current = false;
      setVisible(false);
      return;
    }

    let targetX = -100;
    let targetY = -100;
    let rafId = 0;

    const flush = () => {
      rafId = 0;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
      }
    };

    const handleMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      targetX = e.clientX;
      targetY = e.clientY;

      if (!rafId) {
        rafId = window.requestAnimationFrame(flush);
      }

      if (!visibleRef.current) {
        visibleRef.current = true;
        setVisible(true);
      }

      const target = e.target as HTMLElement | null;
      const interactive = Boolean(target?.closest(INTERACTIVE_SELECTOR));
      if (interactive !== interactiveRef.current) {
        interactiveRef.current = interactive;
        setIsInteractive(interactive);
      }
    };

    const handleDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') setIsPressed(true);
    };

    const handleUp = () => setIsPressed(false);
    const handleLeave = () => {
      visibleRef.current = false;
      setVisible(false);
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('pointerdown', handleDown, { passive: true });
    window.addEventListener('pointerup', handleUp, { passive: true });
    document.addEventListener('mouseleave', handleLeave);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerdown', handleDown);
      window.removeEventListener('pointerup', handleUp);
      document.removeEventListener('mouseleave', handleLeave);
    };
  }, [enabled]);

  if (!enabled || !visible) return null;

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[9999] flex items-center justify-center will-change-transform"
    >
      <div
        className="relative flex items-center justify-center transition-transform duration-150 ease-out"
        style={{
          transform: `scale(${isPressed ? 0.85 : isInteractive ? 1.65 : 1})`,
        }}
      >
        <div
          className="h-7 w-7 rounded-full transition-colors duration-150"
          style={{
            background: isInteractive
              ? 'radial-gradient(circle, rgba(255,77,141,0.34) 0%, rgba(255,122,61,0.12) 55%, transparent 72%)'
              : 'radial-gradient(circle, rgba(255,122,61,0.25) 0%, transparent 70%)',
          }}
        />

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
      </div>
    </div>
  );
}
