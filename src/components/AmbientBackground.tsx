import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { subscribeTensionLevel } from '../utils/tensionState';

interface Petal {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  rot: number;
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

export function AmbientBackground({ candleMode = false }: { candleMode?: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const [tensionLevel, setTensionLevel] = useState(0);
  const rawX = useMotionValue(-300);
  const rawY = useMotionValue(-300);
  const candleX = useSpring(rawX, { stiffness: 70, damping: 24 });
  const candleY = useSpring(rawY, { stiffness: 70, damping: 24 });

  useEffect(() => {
    return subscribeTensionLevel(setTensionLevel);
  }, []);

  useEffect(() => {
    rawX.set(window.innerWidth * 0.5);
    rawY.set(window.innerHeight * 0.38);

    const handleMove = (e: PointerEvent) => {
      rawX.set(e.clientX);
      rawY.set(e.clientY);
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    return () => window.removeEventListener('pointermove', handleMove);
  }, [rawX, rawY]);

  const petals = useMemo<Petal[]>(
    () => [
      { id: 1, left: 9, size: 18, duration: 22, delay: 0, drift: 26, rot: 20, opacity: 0.35 },
      { id: 2, left: 23, size: 14, duration: 25, delay: 4, drift: -20, rot: -35, opacity: 0.28 },
      { id: 3, left: 39, size: 20, duration: 20, delay: 7, drift: 30, rot: 50, opacity: 0.32 },
      { id: 4, left: 56, size: 15, duration: 24, delay: 2, drift: -24, rot: 12, opacity: 0.26 },
      { id: 5, left: 73, size: 17, duration: 21, delay: 6, drift: 22, rot: -45, opacity: 0.34 },
      { id: 6, left: 88, size: 14, duration: 26, delay: 9, drift: -28, rot: 30, opacity: 0.28 },
    ],
    []
  );

  const visiblePetals = candleMode ? petals.slice(0, 3) : petals;
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

      {/* Interactive flickering candle glow */}
      <motion.div
        style={{
          x: candleX,
          y: candleY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={
          prefersReducedMotion
            ? { opacity: candleMode ? 0.28 : 0.42 }
            : candleMode
              ? { scale: [1, 1.03, 0.99, 1], opacity: [0.28, 0.32, 0.26, 0.28] }
              : { scale: [1, 1.07, 0.96, 1.04, 1], opacity: [0.42, 0.52, 0.38, 0.48, 0.42] }
        }
        transition={
          prefersReducedMotion
            ? undefined
            : {
                duration: candleMode ? 4.5 : 3.1,
                repeat: Infinity,
                ease: 'easeInOut',
              }
        }
        className="absolute top-0 left-0 h-[420px] w-[420px] rounded-full blur-3xl"
      >
        <div
          className="h-full w-full rounded-full"
          style={{
            background: candleMode
              ? 'radial-gradient(circle, rgba(255,152,72,0.22) 0%, rgba(180,90,45,0.08) 45%, transparent 72%)'
              : 'radial-gradient(circle, rgba(255,122,61,0.22) 0%, rgba(255,77,141,0.10) 42%, transparent 72%)',
          }}
        />
      </motion.div>

      {/* String of warm fairy lights across top */}
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
              : Math.max(0.32, 0.85 - tensionLevel * 0.09)
            : 3 + (i % 3) * 0.7;

          return (
            <motion.div
              key={i}
              style={{ left: `${bulb.x}%`, top: `${bulb.y * 0.65}px` }}
              animate={
                prefersReducedMotion
                  ? { opacity: inTension ? [0.45, 0.85, 0.45] : 0.75 }
                  : candleMode
                    ? { opacity: inTension ? [0.35, 0.72, 0.35] : [0.4, 0.55, 0.4] }
                    : inTension
                      ? {
                          opacity: [0.35, 1, 0.4, 0.98, 0.35],
                          scale: [0.9, 1.24, 0.92, 1.18, 0.9],
                        }
                      : {
                          opacity: [0.45, 1, 0.55, 0.95, 0.45],
                          scale: [0.92, 1.15, 0.95, 1.08, 0.92],
                        }
              }
              transition={{
                duration: flickerDuration,
                delay: inTension ? (i % 3) * 0.08 : bulb.delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute -translate-x-1/2"
            >
              <div
                className="h-2.5 w-2 rounded-full transition-colors duration-200"
                style={{
                  backgroundColor: tint,
                  boxShadow: candleMode
                    ? `0 0 8px 2px ${tint}55`
                    : inTension
                      ? `0 0 16px 4px ${tint}cc, 0 0 32px 8px ${tint}66`
                      : `0 0 12px 3px ${tint}99, 0 0 26px 6px ${tint}44`,
                }}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Drifting pressed rose petals */}
      {!prefersReducedMotion &&
        visiblePetals.map((p) => (
          <motion.div
            key={p.id}
            className="absolute -bottom-10"
            style={{ left: `${p.left}%`, opacity: 0 }}
            animate={{
              y: ['0vh', '-112vh'],
              x: [0, p.drift, -p.drift * 0.4, p.drift * 0.6],
              rotate: [p.rot, p.rot + 140, p.rot + 280],
              opacity: [
                0,
                candleMode ? p.opacity * 0.45 : p.opacity,
                candleMode ? p.opacity * 0.45 : p.opacity,
                0,
              ],
            }}
            transition={{
              duration: candleMode ? p.duration * 1.4 : p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: 'linear',
            }}
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
          </motion.div>
        ))}

      {/* Film grain + soft dark vignette */}
      <div className="film-grain absolute inset-0 opacity-65 mix-blend-overlay" />
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
