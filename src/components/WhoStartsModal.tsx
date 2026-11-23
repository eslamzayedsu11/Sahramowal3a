import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { CoupleNames } from '../types';
import { getTurnDisplayName } from '../utils/preferences';
import { playTapSound, playWarmChime, playWheelTickSound } from '../utils/sound';

interface WhoStartsModalProps {
  open: boolean;
  names: CoupleNames;
  nightTitle: string;
  onSelectStarter: (turnIndex: 0 | 1) => void;
  onCancel: () => void;
}

export function WhoStartsModal({
  open,
  names,
  nightTitle,
  onSelectStarter,
  onCancel,
}: WhoStartsModalProps) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<0 | 1 | null>(null);

  useEffect(() => {
    if (open) {
      setSpinning(false);
      setWinner(null);
    }
  }, [open]);

  const name1 = getTurnDisplayName(names, 0);
  const name2 = getTurnDisplayName(names, 1);

  const handleSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setWinner(null);
    playTapSound();

    const chosen: 0 | 1 = Math.random() < 0.5 ? 0 : 1;
    // Half 0 = top/right (0-180deg), Half 1 = bottom/left (180-360deg)
    const targetSectorAngle = chosen === 0 ? 90 : 270;
    const extraSpins = 360 * 4;
    const nextRotation = rotation + extraSpins + (targetSectorAngle - (rotation % 360));
    setRotation(nextRotation);

    // Subtle wheel ticks during spin
    const tickTimes = [120, 260, 420, 620, 860, 1140, 1450];
    tickTimes.forEach((ms) => {
      window.setTimeout(() => playWheelTickSound(), ms);
    });

    window.setTimeout(() => {
      setSpinning(false);
      setWinner(chosen);
      playWarmChime();
    }, 1750);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.93, opacity: 0, rotateX: 10 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            exit={{ scale: 0.93, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="scrapbook-paper torn-edge-note w-full max-w-sm px-6 pt-8 pb-10 text-center text-[#1B0A22]"
          >
            <p className="text-xs font-bold text-[#9E476E] mb-1">{nightTitle}</p>
            <h2 className="font-calligraphy text-3xl font-bold mb-2">
              من يبدأ أولاً؟
            </h2>
            <p className="text-xs text-[#4A253A] mb-6">
              أديرا عجلة البتلات لنعرف صاحب الضربة الأولى، أو اختارا بأنفسكما.
            </p>

            {/* Spinning Rose-Petal Wheel */}
            <div className="relative mx-auto mb-6 h-48 w-48 flex items-center justify-center">
              {/* Top pointer */}
              <div
                aria-hidden="true"
                className="absolute -top-2 left-1/2 -translate-x-1/2 z-20"
              >
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path d="M12 22 L4 4 L20 4 Z" fill="#14081A" stroke="#FF4D8D" strokeWidth="1.5" />
                </svg>
              </div>

              <motion.div
                animate={{ rotate: rotation }}
                transition={{ duration: 1.75, ease: [0.16, 1, 0.3, 1] }}
                className="relative h-44 w-44 rounded-full border-4 border-[#14081A] shadow-[0_12px_28px_rgba(20,8,26,0.45)] overflow-hidden"
                style={{
                  background:
                    'conic-gradient(#FF4D8D 0deg 180deg, #1B0A22 180deg 360deg)',
                }}
              >
                {/* Name 1 on pink half */}
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-sm text-[#F4E8D8] max-w-[68px] truncate">
                  {name1}
                </span>
                {/* Name 2 on plum half */}
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-sm text-[#F4E8D8] max-w-[68px] truncate">
                  {name2}
                </span>

                {/* Center rose hub */}
                <div className="absolute inset-0 m-auto h-10 w-10 rounded-full bg-[#F4E8D8] border-2 border-[#14081A] flex items-center justify-center shadow-md">
                  <span className="text-[#FF4D8D] text-base">♥</span>
                </div>
              </motion.div>
            </div>

            {winner !== null ? (
              <div className="space-y-3">
                <p className="font-calligraphy text-2xl font-bold text-[#9E2457]">
                  البداية مع: {winner === 0 ? name1 : name2}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    onSelectStarter(winner);
                  }}
                  className="w-full min-h-[48px] rounded-xl bg-[#14081A] text-[#F4E8D8] font-bold text-sm cursor-pointer shadow-md"
                >
                  انطلقا الآن
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  disabled={spinning}
                  onClick={handleSpin}
                  className="w-full min-h-[48px] rounded-xl bg-[#FF4D8D] hover:bg-[#FF357E] text-[#F4E8D8] font-bold text-sm cursor-pointer shadow-md disabled:opacity-65"
                >
                  {spinning ? 'العجلة تدور...' : 'أدر عجلة البتلات'}
                </button>

                <button
                  type="button"
                  disabled={spinning}
                  onClick={() => {
                    playTapSound();
                    onSelectStarter(0);
                  }}
                  className="w-full min-h-[44px] rounded-xl border border-[#14081A]/25 bg-white/45 hover:bg-white/65 text-[#1B0A22] font-semibold text-xs cursor-pointer"
                >
                  اختاروا بأنفسكم (ابدأ بـ {name1})
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
