import { Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { playTapSound } from '../utils/sound';

export function FullscreenToggle({ className = '' }: { className?: string }) {
  const [supported, setSupported] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const canFs =
      typeof document !== 'undefined' &&
      Boolean(
        document.fullscreenEnabled ||
          (document as unknown as { webkitFullscreenEnabled?: boolean })
            .webkitFullscreenEnabled
      );
    setSupported(canFs);

    const handleFsChange = () => {
      const fsEl =
        document.fullscreenElement ||
        (document as unknown as { webkitFullscreenElement?: Element | null })
          .webkitFullscreenElement;
      setIsFullscreen(Boolean(fsEl));
    };

    handleFsChange();
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  if (!supported) return null;

  const handleToggle = async () => {
    playTapSound();
    try {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        webkitExitFullscreen?: () => Promise<void>;
      };
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };

      const active = Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
      if (active) {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      } else {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
      }
    } catch {
      // Ignore if browser or iframe blocks fullscreen
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      aria-label={isFullscreen ? 'الخروج من وضع ملء الشاشة' : 'تكبير ملء الشاشة'}
      title={isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة (وضع التلفاز)'}
      className={`min-h-[44px] min-w-[44px] rounded-full border flex items-center justify-center backdrop-blur-md shadow-[0_6px_18px_rgba(0,0,0,0.45)] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D] ${
        isFullscreen
          ? 'border-[#FF4D8D] bg-[#2D1038]/90 text-[#FF4D8D]'
          : 'border-[#B98A9E]/35 bg-[#1C0B24]/80 text-[#F4E8D8] hover:border-[#FF4D8D]/65'
      } ${className}`}
    >
      {isFullscreen ? (
        <Minimize2 className="h-4 w-4" />
      ) : (
        <Maximize2 className="h-4 w-4" />
      )}
    </button>
  );
}
