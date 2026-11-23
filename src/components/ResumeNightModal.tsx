import { AnimatePresence, motion } from 'motion/react';
import { Play, RotateCcw } from 'lucide-react';
import { getCategoryMeta, type SavedNightProgress } from '../types';
import { playTapSound, playWarmChime } from '../utils/sound';

interface ResumeNightModalProps {
  progress: SavedNightProgress | null;
  onResume: () => void;
  onRestart: () => void;
  onClose: () => void;
}

export function ResumeNightModal({
  progress,
  onResume,
  onRestart,
  onClose,
}: ResumeNightModalProps) {
  if (!progress) return null;
  const category = getCategoryMeta(progress.categoryId);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, rotateX: 8 }}
          animate={{ scale: 1, opacity: 1, rotateX: 0 }}
          exit={{ scale: 0.94, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="scrapbook-paper torn-edge-note w-full max-w-sm px-6 pt-8 pb-10 text-center text-[#1B0A22]"
        >
          <p className="text-xs font-bold text-[#9E476E] mb-1">{category.title}</p>
          <h2 className="font-calligraphy text-3xl font-bold mb-2">
            سهرة لم تكتمل بعد
          </h2>
          <p className="text-xs sm:text-sm text-[#4A253A] leading-relaxed mb-6 tabular-nums">
            وقفتما عند التحدي {progress.currentIndex + 1} من {progress.deckIds.length}. هل تودّان المتابعة أم البدء من جديد؟
          </p>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                playWarmChime();
                onResume();
              }}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-xl bg-[#14081A] text-[#F4E8D8] font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Play className="h-4 w-4 fill-current text-[#FF4D8D]" />
              <span>كمّلوا من حيث وقفتم</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapSound();
                onRestart();
              }}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl border border-[#14081A]/25 bg-white/45 hover:bg-white/65 text-[#1B0A22] font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>ابدأوا من جديد</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
