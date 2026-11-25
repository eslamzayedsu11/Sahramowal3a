import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { subscribeTensionLevel } from '../utils/tensionState';

interface Petal {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  opacity: number;
}

const FAIRY_BULBS = [
  { x: 6, y: 22, color: '#F4E8D8', delay: 0 },
  { x: 15, y: 34, color: '#FF7A3D', delay: 0.4 },
  { x: 24, y: 40, color: '#F4E8D8', delay: 0.9 },
  { x: 34, y: 36, color: '#FF4D8D', delay: 0.2 },
  { x: 44, y: 27, color: '#F4E8D8', delay: 1.1 },
  { x: 54, y: 31, color: '#FF7A3D', delay: 0.6 },
  { x: 64, y: 41, color: '#F4E8D8', delay: 1.4 },
  { x: 74, y: 38, color: '#FF4D8D', delay: 0.3 },
  { x: 84, y: 28, color: '#F4E8D8', delay: 0.8 },
  { x: 93, y: 21, color: '#FF7A3D', delay: 1.2 },
];

const PETALS: Petal[] = [
  { id: 1, left: 9, size: 18, duration: 22, delay: 0, drift: 26, opacity: 0.35 },
  { id: 2, left: 23, size: 14, duration: 25, delay: 4, drift: -20, opacity: 0.28 },
  { id: 3, left: 39, size: 20, duration: 20, delay: 7, drift: 30, opacity: 0.32 },
  { id: 4, left: 56, size: 15, duration: 24, delay: 2, drift: -24, opacity: 0.26 },
  { id: 5, left: 73, size: 17, duration: 21, delay: 6, drift: 22, opacity: 0.34 },
  { id: 6, left: 88, size: 14, duration: 26, delay: 9, drift: -28, opacity: 0.28 },
];

export function AmbientBackground({ candleMode = false }: { candleMode?: boolean }) {
  const [tensionLevel, setTensionLevel] = useState(0);
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return subscribeTensionLevel(setTensionLevel);
  }, []);

  // Lightweight rAF-throttled pointer glow using GPU translate3d (no blur-3xl filter, no JS springs)
  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;

    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.38;
    let currentX = targetX;
    let currentY = targetY;
    let rafId = 0;
    let active = false;

    const applyTransform = (x: number, y: number) => {
      el.style.transform = `translate3d(${x - 240}px, ${y - 240}px, 0)`;
    };

    applyTransform(currentX, currentY);

    const step = () => {
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      currentX += dx * 0.16;
      currentY += dy * 0.16;
      applyTransform(currentX, currentY);

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        rafId = window.requestAnimationFrame(step);
      } else {
        active = false;
      }
    };

    const handleMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      targetX = e.clientX;
      targetY = e.clientY;
      if (!active) {
        active = true;
        rafId = window.requestAnimationFrame(step);
      }
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handleMove);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const visiblePetals = candleMode ? PETALS.slice(0, 3) : PETALS;
  const inTension = tensionLevel > 0;

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Dim bedroom midnight tabletop surface */}
      <div
        className="absolute inset-0"
        style={{
          background: candleMode
            ? 'radial-gradient(ellipse at 50% 28%, #1C0D12 0%, #10060B 58%, #070306 100%)'
            : 'radial-gradient(ellipse at 50% 28%, #251030 0%, #14081A 56%, #0B0410 100%)',
        }}
      />

      {/* Soft radial candle glow (gradient-only, no expensive CSS blur-3xl filter) */}
      <div
        ref={glowRef}
        className="absolute top-0 left-0 h-[480px] w-[480px] rounded-full will-change-transform"
        style={{
          opacity: candleMode ? 0.3 : 0.46,
          background: candleMode
            ? 'radial-gradient(circle, rgba(255,152,72,0.22) 0%, rgba(180,90,45,0.08) 42%, transparent 72%)'
            : 'radial-gradient(circle, rgba(255,122,61,0.2) 0%, rgba(255,77,141,0.09) 40%, transparent 72%)',
        }}
      />

      {/* String of warm fairy lights across top (CSS-composited flicker) */}
      <div className={`absolute top-0 left-0 right-0 h-20 ${candleMode ? 'opacity-45' : 'opacity-100'}`}>
        <svg
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          className="w-full h-14 overflow-visible"
        >
          <path
            d="M 0 2 Q 25 14 50 7 T 100 2"
            fill="none"
            stroke="rgba(244,232,216,0.22)"
            strokeWidth="0.22"
          />
        </svg>
        {FAIRY_BULBS.map((bulb, i) => {
          const tint = inTension
            ? i % 2 === 0
              ? '#FF7A3D'
              : '#FF4D8D'
            : candleMode
              ? '#FF9E57'
              : bulb.color;
          const flickerDuration = inTension
            ? candleMode
              ? 0.9
              : Math.max(0.35, 0.85 - tensionLevel * 0.09)
            : 3 + (i % 3) * 0.7;

          return (
            <div
              key={i}
              style={
                {
                  left: `${bulb.x}%`,
                  top: `${bulb.y * 0.65}px`,
                  '--bulb-dur': `${flickerDuration}s`,
                  '--bulb-delay': `${inTension ? (i % 3) * 0.08 : bulb.delay}s`,
                } as CSSProperties
              }
              className="ambient-bulb absolute"
            >
              <div
                className="h-2.5 w-2 rounded-full transition-colors duration-200"
                style={{
                  backgroundColor: tint,
                  boxShadow: candleMode
                    ? `0 0 6px 1px ${tint}55`
                    : inTension
                      ? `0 0 12px 3px ${tint}cc`
                      : `0 0 10px 2px ${tint}88`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Drifting pressed rose petals (pure CSS compositor animation) */}
      {visiblePetals.map((p) => (
        <div
          key={p.id}
          className="ambient-petal absolute -bottom-10"
          style={
            {
              left: `${p.left}%`,
              opacity: 0,
              '--petal-dur': `${candleMode ? p.duration * 1.4 : p.duration}s`,
              '--petal-delay': `${p.delay}s`,
              '--petal-drift': `${p.drift}px`,
              '--petal-opacity': candleMode ? p.opacity * 0.45 : p.opacity,
            } as CSSProperties
          }
        >
          <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="none">
            <path
              d="M12.5 2C17.2 4.8 20.4 10.2 18.6 15.6C17.1 20.1 12.6 22.3 8.7 21C4.8 19.7 3.2 15.1 4.9 10.5C6.3 6.7 9.4 3.8 12.5 2Z"
              fill="#B98A9E"
              fillOpacity="0.45"
            />
            <path
              d="M12 4.5C13.8 9.2 13.6 14.5 11.2 19.2"
              stroke="#FF4D8D"
              strokeOpacity="0.3"
              strokeWidth="0.8"
            />
          </svg>
        </div>
      ))}

      {/* Subtle atmospheric sheen + dark vignette */}
      <div className="film-grain absolute inset-0 opacity-75" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, transparent 54%, rgba(8, 2, 12, 0.72) 100%)',
        }}
      />
    </div>
  );
}
