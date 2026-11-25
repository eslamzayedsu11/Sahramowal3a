import { AnimatePresence, motion } from 'motion/react';
import { Feather, Heart, LogOut, PauseCircle, RefreshCw, SkipForward, X } from 'lucide-react';
import { useState } from 'react';
import { playTapSound } from '../utils/sound';

interface ComfortSheetProps {
  open: boolean;
  onClose: () => void;
  onSkipWithoutQuestions: () => void;
  onSwapLighter: () => void;
  onPauseForBreak: () => void;
  onResumeFromBreak: () => void;
  onEndNight: () => void;
  hasLighterAlternative: boolean;
}

export function ComfortSheet({
  open,
  onClose,
  onSkipWithoutQuestions,
  onSwapLighter,
  onPauseForBreak,
  onResumeFromBreak,
  onEndNight,
  hasLighterAlternative,
}: ComfortSheetProps) {
  const [breathingMode, setBreathingMode] = useState(false);

  const handleClose = () => {
    playTapSound();
    if (breathingMode) {
      setBreathingMode(false);
      onResumeFromBreak();
    }
    onClose();
  };

  const handleStartBreak = () => {
    playTapSound();
    onPauseForBreak();
    setBreathingMode(true);
  };

  const handleResume = () => {
    playTapSound();
    setBreathingMode(false);
    onResumeFromBreak();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/82 p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: 36, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 36, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-[#B98A9E]/30 bg-[#1B0A22] p-6 shadow-2xl text-[#F4E8D8]"
          >
            {breathingMode ? (
              <div className="py-4 text-center">
                <h2 className="font-calligraphy text-3xl font-bold mb-2">
                  لحظة هدوء وتنفّس
                </h2>
                <p className="text-xs sm:text-sm text-[#B98A9E] mb-8">
                  توقّفا قليلاً، خذا نفساً عميقاً معاً، ولا يوجد أي استعجال.
                </p>

                {/* Calm breathing circle */}
                <div className="relative mx-auto mb-8 flex h-40 w-40 items-center justify-center">
                  <motion.div
                    animate={{
                      scale: [1, 1.38, 1],
                      opacity: [0.35, 0.75, 0.35],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute inset-0 rounded-full bg-[#FF4D8D]/20"
                  />
                  <motion.div
                    animate={{
                      scale: [0.86, 1.18, 0.86],
                    }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="relative flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#F4E8D8]/60 bg-[#281033] shadow-inner"
                  >
                    <Heart className="h-8 w-8 text-[#FF70A6] fill-[#FF70A6]/40" />
                  </motion.div>
                </div>

                <button
                  type="button"
                  onClick={handleResume}
                  className="w-full min-h-[50px] rounded-xl bg-[#F4E8D8] text-[#14081A] font-bold text-base cursor-pointer shadow-lg"
                >
                  نكمّل
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF70A6]/15 text-[#FF70A6] border border-[#FF70A6]/30">
                      <Feather className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-calligraphy text-2xl font-bold leading-none">
                        راحتكما أولاً
                      </h2>
                      <p className="text-xs text-[#B98A9E] mt-1">
                        هذه السهرة لكما وحدكما — التغيير والتخطّي جزء طبيعي من المتعة
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    aria-label="إغلاق"
                    className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#B98A9E] hover:text-[#F4E8D8] cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-2.5 mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      onClose();
                      onSkipWithoutQuestions();
                    }}
                    className="w-full min-h-[50px] px-4 py-3 rounded-xl border border-[#B98A9E]/25 bg-[#120618] hover:border-[#FF70A6]/55 flex items-center gap-3 text-right cursor-pointer transition-colors"
                  >
                    <SkipForward className="h-4 w-4 text-[#FF70A6] shrink-0" />
                    <div>
                      <div className="text-sm font-bold">تخطّي بدون أسئلة</div>
                      <div className="text-[11px] text-[#B98A9E]">
                        الانتقال مباشرة للتحدي التالي بكل أريحية
                      </div>
                    </div>
                  </button>

                  {hasLighterAlternative && (
                    <button
                      type="button"
                      onClick={() => {
                        playTapSound();
                        onClose();
                        onSwapLighter();
                      }}
                      className="w-full min-h-[50px] px-4 py-3 rounded-xl border border-[#B98A9E]/25 bg-[#120618] hover:border-[#FF7A3D]/55 flex items-center gap-3 text-right cursor-pointer transition-colors"
                    >
                      <RefreshCw className="h-4 w-4 text-[#FF7A3D] shrink-0" />
                      <div>
                        <div className="text-sm font-bold">غيّروه لتحدي أخف</div>
                        <div className="text-[11px] text-[#B98A9E]">
                          استبدال البطاقة الحالية بتحدٍ لطيف ومختلف
                        </div>
                      </div>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleStartBreak}
                    className="w-full min-h-[50px] px-4 py-3 rounded-xl border border-[#B98A9E]/25 bg-[#120618] hover:border-[#F4E8D8]/45 flex items-center gap-3 text-right cursor-pointer transition-colors"
                  >
                    <PauseCircle className="h-4 w-4 text-[#F4E8D8] shrink-0" />
                    <div>
                      <div className="text-sm font-bold">خدوا استراحة</div>
                      <div className="text-[11px] text-[#B98A9E]">
                        إيقاف المؤقت والأغنية مؤقتاً لأخذ نفس هادئ
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      onClose();
                      onEndNight();
                    }}
                    className="w-full min-h-[50px] px-4 py-3 rounded-xl border border-[#FF4D8D]/30 bg-[#270A22] hover:bg-[#350D2D] flex items-center gap-3 text-right cursor-pointer transition-colors"
                  >
                    <LogOut className="h-4 w-4 text-[#FF4D8D] shrink-0" />
                    <div>
                      <div className="text-sm font-bold">إنهاء السهرة</div>
                      <div className="text-[11px] text-[#B98A9E]">
                        الانتقال لملخص ليلتكما الجميلة الآن
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
