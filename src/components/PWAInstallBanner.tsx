import { Download, Share, X } from 'lucide-react';
import { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { playTapSound } from '../utils/sound';

export function PWAInstallBanner({ compact = false }: { compact?: boolean }) {
  const { isInstallable, isInstalled, isIOS, dismissed, install, dismiss } =
    usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;
  if (!isInstallable && !isIOS) return null;
  if (!compact && dismissed) return null;

  return (
    <>
      <div className="w-full max-w-md rounded-xl border border-[#B98A9E]/30 bg-[#1B0A22]/85 px-4 py-3 flex items-center justify-between gap-3 shadow-lg backdrop-blur-md">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-bold text-[#F4E8D8]">
            ثبّت التطبيق على هاتفك
          </p>
          <p className="text-[11px] text-[#B98A9E] truncate">
            يعمل بسرعة وخصوصية كاملة حتى بدون إنترنت
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isInstallable ? (
            <button
              type="button"
              onClick={() => {
                playTapSound();
                void install();
              }}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-[#FF4D8D] hover:bg-[#FF357E] text-[#F4E8D8] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="h-3.5 w-3.5" />
              <span>ثبّت التطبيق</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                playTapSound();
                setShowIOSGuide(true);
              }}
              className="min-h-[38px] px-3.5 py-1.5 rounded-lg border border-[#FF7A3D]/55 bg-[#FF7A3D]/15 text-[#F4E8D8] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Share className="h-3.5 w-3.5 text-[#FF7A3D]" />
              <span>تثبيت iOS</span>
            </button>
          )}

          {!compact && (
            <button
              type="button"
              onClick={() => {
                playTapSound();
                dismiss();
              }}
              aria-label="إخفاء إشعار التثبيت"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#B98A9E] hover:text-[#F4E8D8] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="scrapbook-paper torn-edge-note w-full max-w-sm p-6 pb-8 text-[#1B0A22]"
          >
            <h3 className="font-calligraphy text-2xl font-bold mb-3">
              تثبيت «سهرة مولعة» على آيفون
            </h3>
            <ol className="space-y-2 text-sm text-[#4A253A] leading-relaxed list-decimal list-inside mb-5">
              <li>
                اضغط على زر <strong>مشاركة (Share)</strong> في شريط سفاري بالأسفل.
              </li>
              <li>
                مرّر للأسفل واختر{' '}
                <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
              </li>
              <li>اضغط <strong>إضافة</strong> لتظهر الأيقونة على شاشتك.</li>
            </ol>
            <button
              type="button"
              onClick={() => {
                playTapSound();
                setShowIOSGuide(false);
              }}
              className="w-full min-h-[44px] rounded-lg bg-[#14081A] text-[#F4E8D8] font-bold text-sm cursor-pointer"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
}
