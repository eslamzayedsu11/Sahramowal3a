import { motion } from 'motion/react';
import { useState } from 'react';
import type { CoupleNames } from '../types';
import {
  playHoverSound,
  playTapSound,
  playWarmChime,
  playWhooshSound,
} from '../utils/sound';
import { BrandLogo } from './BrandLogo';

interface CoupleNamesScreenProps {
  initialNames: CoupleNames;
  onSave: (names: CoupleNames) => void;
  onSkip: () => void;
}

export function CoupleNamesScreen({
  initialNames,
  onSave,
  onSkip,
}: CoupleNamesScreenProps) {
  const [boy, setBoy] = useState(initialNames.boy);
  const [girl, setGirl] = useState(initialNames.girl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playWarmChime();
    playWhooshSound();
    onSave({ boy: boy.trim(), girl: girl.trim() });
  };

  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden flex flex-col items-center justify-center px-5 py-8"
    >
      <div className="w-full max-w-[1600px] mx-auto flex flex-col items-center justify-center">
        <div className="mb-[clamp(1rem,2.6vh,1.75rem)]">
          <BrandLogo size="lg" />
        </div>

        <div className="relative w-full max-w-lg lg:max-w-xl">
          <div
            aria-hidden="true"
            className="washi-tape absolute -top-3 right-8 z-20 h-6 w-20 -rotate-6 rounded-[2px]"
          />
          <div
            aria-hidden="true"
            className="washi-tape-cream absolute -top-3 left-8 z-20 h-6 w-20 rotate-6 rounded-[2px]"
          />

          <form
            onSubmit={handleSubmit}
            className="scrapbook-paper torn-edge-note relative px-7 pt-[clamp(1.75rem,3.6vh,2.5rem)] pb-[clamp(2rem,4vh,2.75rem)] sm:px-10 text-[#1B0A22] rotate-[0.5deg]"
          >
            <h1 className="font-calligraphy text-[clamp(1.75rem,2.8vw,2.4rem)] font-bold text-center mb-2">
              مين نجم السهرة الليلة؟
            </h1>
            <p className="text-[clamp(0.85rem,1.05vw,0.98rem)] text-[#4A253A] text-center leading-relaxed mb-6">
              اكتبا اسم الولد واسم البنت لو حابين نخصص التحديات بأسمائكما (اختياري تماماً، ويمكن تعديله في أي وقت).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-[#582E49] mb-1.5">
                  اسم الولد (اختياري)
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={boy}
                  onChange={(e) => setBoy(e.target.value)}
                  placeholder="مثال: أحمد"
                  className="w-full min-h-[48px] rounded-lg border border-[#B98A9E]/60 bg-white/70 px-3.5 py-2 text-base text-[#14081A] placeholder:text-[#8A5770]/65 focus:outline-none focus:border-[#FF4D8D] focus:ring-2 focus:ring-[#FF4D8D]/25"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#582E49] mb-1.5">
                  اسم البنت (اختياري)
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={girl}
                  onChange={(e) => setGirl(e.target.value)}
                  placeholder="مثال: سارة"
                  className="w-full min-h-[48px] rounded-lg border border-[#B98A9E]/60 bg-white/70 px-3.5 py-2 text-base text-[#14081A] placeholder:text-[#8A5770]/65 focus:outline-none focus:border-[#FF4D8D] focus:ring-2 focus:ring-[#FF4D8D]/25"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') playHoverSound();
                }}
                className="flex-1 min-h-[50px] px-5 py-2.5 rounded-xl bg-[#14081A] hover:bg-[#230E2D] text-[#F4E8D8] border border-[#FF4D8D]/55 font-bold text-sm sm:text-base cursor-pointer shadow-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D]"
              >
                حفظ والمتابعة
              </button>

              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  playWhooshSound();
                  onSkip();
                }}
                className="min-h-[50px] px-6 py-2.5 rounded-xl border border-[#14081A]/25 bg-white/45 hover:bg-white/70 text-[#1B0A22] font-bold text-sm sm:text-base cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#14081A]"
              >
                تخطّي
              </button>
            </div>
          </form>
        </div>
      </div>
    </motion.main>
  );
}
