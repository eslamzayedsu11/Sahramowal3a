import { AnimatePresence, motion } from 'motion/react';
import { Keyboard, X } from 'lucide-react';
import { playTapSound } from '../utils/sound';

interface ShortcutsSheetProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUT_ITEMS = [
  {
    keys: ['Space'],
    label: 'بدء التحدي / إيقاف أو استئناف المؤقت',
  },
  {
    keys: ['←', 'Enter'],
    label: 'التحدي التالي (عند فتح زر اللي بعدوا)',
  },
  {
    keys: ['→'],
    label: 'الرجوع للتحدي السابق',
  },
  {
    keys: ['S'],
    label: 'تخطي التحدي الحالي',
  },
  {
    keys: ['F'],
    label: 'قلب بطاقة البولارويد وقراءة الملاحظة الخلفية',
  },
  {
    keys: ['M'],
    label: 'كتم أو تفعيل المؤثرات الصوتية',
  },
  {
    keys: ['Esc'],
    label: 'فتح قائمة «براحتكم» أو إغلاق النوافذ',
  },
  {
    keys: ['?'],
    label: 'إظهار أو إخفاء قائمة الاختصارات',
  },
];

export function ShortcutsSheet({ open, onClose }: ShortcutsSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={() => {
            playTapSound();
            onClose();
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/82 p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.17, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
            className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-[#B98A9E]/30 bg-[#1B0A22] p-6 shadow-2xl text-[#F4E8D8]"
          >
            <div className="flex items-start justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF4D8D]/15 text-[#FF4D8D] border border-[#FF4D8D]/35">
                  <Keyboard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-calligraphy text-2xl font-bold leading-none">
                    اختصارات لوحة المفاتيح
                  </h2>
                  <p className="text-xs text-[#B98A9E] mt-1">
                    لتحكم أسرع وأكثر راحة من الكمبيوتر أو اللابتوب
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  onClose();
                }}
                aria-label="إغلاق"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#B98A9E] hover:text-[#F4E8D8] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="divide-y divide-[#B98A9E]/15">
              {SHORTCUT_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="py-2.5 flex items-center justify-between gap-4"
                >
                  <span className="text-sm text-[#F4E8D8]/90">{item.label}</span>
                  <div dir="ltr" className="flex items-center gap-1.5 shrink-0">
                    {item.keys.map((k) => (
                      <kbd key={k} className="kbd-chip">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
