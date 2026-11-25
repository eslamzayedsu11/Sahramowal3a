import { motion, useReducedMotion } from 'motion/react';
import { Home, RotateCcw, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getCategoryMeta, type CategoryId, type CoupleNames } from '../types';
import {
  formatArabicDuration,
  playHoverSound,
  playTapSound,
  playWarmChime,
  playWhooshSound,
} from '../utils/sound';
import { NightRatingFlow } from './NightRatingFlow';

interface EndScreenProps {
  categoryId: CategoryId;
  names: CoupleNames;
  stats: { completed: number; skipped: number; totalSeconds: number };
  candleMode?: boolean;
  onReplay: () => void;
  onGoHome: () => void;
}

const SWEET_MESSAGES = [
  'أجمل ما في الليالي هو أنكما تصنعانها معاً بقلوب دافئة.',
  'كل لحظة قرب بينكما هي رسالة حب جديدة تُكتب في دفتر العمر.',
  'الضحكة والهمسة واللمسة الصادقة تساوي الدنيا وما فيها.',
  'عسى أيامكما ولياليكما كلها مودة وسكينة وشغف متجدد.',
  'الاهتمام بالتفاصيل الصغيرة هو سر السحر الذي يجمعكما دائماً.',
  'الحب يكبر عندما نمنحه وقتاً خالصاً بعيداً عن ضجيج العالم.',
  'كل ليلة تجمعكما على مودة هي انتصار جميل لقلبيكما.',
  'ابقيا قريبين هكذا، فدفء يديكما معاً هو أجمل وطن.',
  'الليلة انتهت بطاقاتها، لكن قصتكما الرومانسية مستمرة بكل شغف.',
  'شكراً لأنكما اخترتما أن تهديا بعضكما هذا الوقت الثمين الليلة.',
];

export function EndScreen({
  categoryId,
  names,
  stats,
  candleMode = false,
  onReplay,
  onGoHome,
}: EndScreenProps) {
  const prefersReducedMotion = useReducedMotion();
  const category = getCategoryMeta(categoryId);
  const [showRatingFlow, setShowRatingFlow] = useState(false);

  const sweetMessage = useMemo(
    () => SWEET_MESSAGES[Math.floor(Math.random() * SWEET_MESSAGES.length)],
    []
  );

  if (showRatingFlow) {
    return (
      <NightRatingFlow
        names={names}
        nightTitle={category.title}
        candleMode={candleMode}
        onGoHome={onGoHome}
        onBackToSummary={() => setShowRatingFlow(false)}
      />
    );
  }

  return (
    <motion.main
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden flex flex-col items-center justify-center px-5 pt-14 pb-8"
    >
      <div className="w-full max-w-[1600px] mx-auto flex justify-center">
        <div className="relative w-full max-w-lg lg:max-w-xl">
          <div
            aria-hidden="true"
            className="washi-tape absolute -top-3 right-10 z-20 h-6 w-20 -rotate-3 rounded-[2px]"
          />
          <div
            aria-hidden="true"
            className="washi-tape-cream absolute -top-3 left-10 z-20 h-6 w-20 rotate-6 rounded-[2px]"
          />

          <div className="scrapbook-paper torn-edge-note relative px-7 pt-[clamp(1.75rem,3.6vh,2.6rem)] pb-[clamp(2rem,4vh,2.9rem)] sm:px-10 text-center text-[#1B0A22] rotate-[0.5deg]">
            <div className="relative mx-auto mb-3 flex h-16 w-16 items-center justify-center">
              <motion.svg
                aria-hidden="true"
                viewBox="0 0 64 64"
                className="h-15 w-15 drop-shadow-[0_8px_14px_rgba(255,77,141,0.38)]"
                animate={
                  prefersReducedMotion ? undefined : { scale: [1, 1.14, 1, 1.09, 1] }
                }
                transition={
                  prefersReducedMotion
                    ? undefined
                    : { duration: 1.9, repeat: Infinity, ease: 'easeInOut' }
                }
              >
                <path
                  d="M32 55.5L28.7 52.5C16.8 41.7 9 34.6 9 25.8C9 18.7 14.6 13 21.8 13C25.9 13 29.8 14.9 32 18C34.2 14.9 38.1 13 42.2 13C49.4 13 55 18.7 55 25.8C55 34.6 47.2 41.7 35.3 52.5L32 55.5Z"
                  fill="#FF4D8D"
                  stroke="#8F1D48"
                  strokeWidth="2"
                />
                <path
                  d="M17 24C17 20.5 19.6 18 22.8 18"
                  stroke="#F4E8D8"
                  strokeOpacity="0.65"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  fill="none"
                />
              </motion.svg>
            </div>

            <h1 className="font-calligraphy text-[clamp(1.85rem,3vw,2.5rem)] font-bold text-[#1B0A22] text-balance leading-snug mb-2">
              سهرة لا تُنسى… حبّكما يزداد اشتعالاً
            </h1>

            <p className="text-[clamp(0.9rem,1.1vw,1.05rem)] text-[#4A253A] leading-relaxed mb-4">
              {sweetMessage}
            </p>

            {/* Summary Stats */}
            <div className="mb-2 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-bold text-[#582E49] tabular-nums">
              <span>أكملتما {stats.completed} تحديات</span>
              <span aria-hidden="true">·</span>
              <span>الوقت معاً: {formatArabicDuration(stats.totalSeconds)}</span>
            </div>

            {stats.skipped > 0 && (
              <p className="mb-4 text-xs text-[#7A3F5D] tabular-nums">
                اخترتوا تتخطّوا {stats.skipped} تحديات، وده تمام
              </p>
            )}

            {/* Primary Actions: Rate the Night + Back to Home */}
            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              <motion.button
                type="button"
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') playHoverSound();
                }}
                onClick={() => {
                  playWarmChime();
                  playWhooshSound();
                  setShowRatingFlow(true);
                }}
                className="btn-primary-ember btn-shimmer relative overflow-hidden flex-1 min-h-[50px] px-5 py-2.5 rounded-xl font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#14081A]"
              >
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>قيّموا السهرة</span>
              </motion.button>

              <motion.button
                type="button"
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                onClick={() => {
                  playTapSound();
                  playWhooshSound();
                  onGoHome();
                }}
                className="flex-1 min-h-[50px] px-5 py-2.5 rounded-xl bg-[#14081A] hover:bg-[#230E2D] text-[#F4E8D8] font-bold text-sm sm:text-base cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D]"
              >
                <Home className="h-4 w-4 shrink-0" />
                <span>العودة للطاولة الرئيسية</span>
              </motion.button>
            </div>

            {/* Secondary Replay Action */}
            <div className="mt-3 flex justify-center">
              <motion.button
                type="button"
                whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                onClick={() => {
                  playWarmChime();
                  playWhooshSound();
                  onReplay();
                }}
                className="min-h-[44px] px-5 py-2 rounded-xl border border-[#14081A]/20 bg-white/45 hover:bg-white/75 text-[#1B0A22] font-bold text-xs sm:text-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#14081A]"
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0" />
                <span>إعادة القسم</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
