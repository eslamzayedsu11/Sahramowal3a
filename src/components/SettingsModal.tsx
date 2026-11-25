import { AnimatePresence, motion } from 'motion/react';
import { Flame, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CoupleNames } from '../types';
import { playTapSound } from '../utils/sound';
import { PWAInstallBanner } from './PWAInstallBanner';

interface SettingsModalProps {
  open: boolean;
  names: CoupleNames;
  candleMode: boolean;
  sfxEnabled: boolean;
  onClose: () => void;
  onSaveNames: (names: CoupleNames) => void;
  onToggleCandleMode: () => void;
  onToggleSfx: () => void;
}

export function SettingsModal({
  open,
  names,
  candleMode,
  sfxEnabled,
  onClose,
  onSaveNames,
  onToggleCandleMode,
  onToggleSfx,
}: SettingsModalProps) {
  const [boy, setBoy] = useState(names.boy);
  const [girl, setGirl] = useState(names.girl);

  useEffect(() => {
    setBoy(names.boy);
    setGirl(names.girl);
  }, [names.boy, names.girl, open]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    playTapSound();
    onSaveNames({ boy: boy.trim(), girl: girl.trim() });
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
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-[#B98A9E]/30 bg-[#1B0A22] p-6 shadow-2xl text-[#F4E8D8] max-h-[90dvh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-calligraphy text-2xl font-bold">
                إعدادات السهرة
              </h2>
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  onClose();
                }}
                aria-label="إغلاق"
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#B98A9E] hover:text-[#F4E8D8] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mb-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#B98A9E] mb-1">
                    اسم الولد
                  </label>
                  <input
                    type="text"
                    maxLength={24}
                    value={boy}
                    onChange={(e) => setBoy(e.target.value)}
                    placeholder="مثال: أحمد"
                    className="w-full min-h-[42px] rounded-lg border border-[#B98A9E]/30 bg-[#120618] px-3 py-2 text-sm text-[#F4E8D8] focus:outline-none focus:border-[#FF4D8D]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#B98A9E] mb-1">
                    اسم البنت
                  </label>
                  <input
                    type="text"
                    maxLength={24}
                    value={girl}
                    onChange={(e) => setGirl(e.target.value)}
                    placeholder="مثال: سارة"
                    className="w-full min-h-[42px] rounded-lg border border-[#B98A9E]/30 bg-[#120618] px-3 py-2 text-sm text-[#F4E8D8] focus:outline-none focus:border-[#FF4D8D]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[44px] rounded-lg bg-[#F4E8D8] text-[#14081A] font-bold text-sm cursor-pointer"
              >
                حفظ الأسماء
              </button>
            </form>

            <div className="space-y-2.5 pt-4 border-t border-[#B98A9E]/20">
              {/* Candle Mode Toggle */}
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  onToggleCandleMode();
                }}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-[#B98A9E]/25 bg-[#120618] flex items-center justify-between cursor-pointer"
              >
                <span className="inline-flex items-center gap-2.5 text-sm font-medium">
                  <Flame className="h-4 w-4 text-[#FF7A3D]" />
                  <span>وضع الشمعة (إضاءة خافتة هادئة)</span>
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded ${
                    candleMode
                      ? 'bg-[#FF7A3D]/25 text-[#FF7A3D]'
                      : 'bg-white/5 text-[#B98A9E]'
                  }`}
                >
                  {candleMode ? 'مفعّل' : 'مغلق'}
                </span>
              </button>

              {/* SFX Toggle */}
              <button
                type="button"
                onClick={() => {
                  onToggleSfx();
                }}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-[#B98A9E]/25 bg-[#120618] flex items-center justify-between cursor-pointer"
              >
                <span className="inline-flex items-center gap-2.5 text-sm font-medium">
                  {sfxEnabled ? (
                    <Volume2 className="h-4 w-4 text-[#FF4D8D]" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-[#B98A9E]" />
                  )}
                  <span>المؤثرات الصوتية</span>
                </span>
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded ${
                    sfxEnabled
                      ? 'bg-[#FF4D8D]/25 text-[#FF4D8D]'
                      : 'bg-white/5 text-[#B98A9E]'
                  }`}
                >
                  {sfxEnabled ? 'مفعّلة' : 'مكتومة'}
                </span>
              </button>
            </div>

            <div className="mt-4">
              <PWAInstallBanner compact />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
