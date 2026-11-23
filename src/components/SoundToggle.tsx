import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  isSfxEnabled,
  playTapSound,
  setSfxEnabled,
  subscribeSfxEnabled,
} from '../utils/sound';

export function SoundToggle() {
  const [enabled, setEnabled] = useState<boolean>(() => isSfxEnabled());

  useEffect(() => {
    return subscribeSfxEnabled(setEnabled);
  }, []);

  const handleToggle = () => {
    const next = !enabled;
    setSfxEnabled(next);
    if (next) {
      playTapSound();
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={enabled ? 'كتم المؤثرات الصوتية' : 'تفعيل المؤثرات الصوتية'}
      title={enabled ? 'المؤثرات الصوتية مفعّلة' : 'المؤثرات الصوتية مكتومة'}
      className="fixed top-3 left-3 z-40 min-h-[44px] min-w-[44px] rounded-full border border-[#B98A9E]/35 bg-[#1C0B24]/80 text-[#F4E8D8] hover:border-[#FF4D8D]/65 hover:text-white flex items-center justify-center backdrop-blur-md shadow-[0_6px_18px_rgba(0,0,0,0.45)] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A3D]"
    >
      {enabled ? (
        <Volume2 className="h-4 w-4 text-[#FF7A3D]" />
      ) : (
        <VolumeX className="h-4 w-4 text-[#B98A9E]" />
      )}
    </button>
  );
}
