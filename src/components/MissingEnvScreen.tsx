import { KeyRound, RefreshCw } from 'lucide-react';

interface MissingEnvScreenProps {
  missingVars: string[];
}

export function MissingEnvScreen({ missingVars }: MissingEnvScreenProps) {
  return (
    <div
      dir="rtl"
      className="relative z-10 min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6"
    >
      <div className="w-full max-w-lg rounded-2xl border border-[#FF7A3D]/40 bg-[#1B0A22]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FF7A3D]/15 border border-[#FF7A3D]/35 text-[#FF7A3D]">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-calligraphy text-2xl sm:text-3xl font-bold text-[#F4E8D8]">
              إعداد متغيرات البيئة مطلوب
            </h1>
            <p className="text-xs sm:text-sm text-[#B98A9E]">
              سهرة مولعة 🔥 تحتاج إعداد اتصال Firebase للعمل
            </p>
          </div>
        </div>

        <p className="text-sm text-[#F4E8D8]/90 leading-relaxed mb-4">
          لم يتم العثور على المتغيرات التالية في بيئة التشغيل. أضفها إلى ملف{' '}
          <code dir="ltr" className="px-1.5 py-0.5 rounded bg-black/40 text-[#FF7A3D]">
            .env.local
          </code>{' '}
          محلياً أو في إعدادات{' '}
          <code dir="ltr" className="px-1.5 py-0.5 rounded bg-black/40 text-[#FF7A3D]">
            Vercel → Environment Variables
          </code>{' '}
          ثم أعد البناء أو التشغيل:
        </p>

        <ul
          dir="ltr"
          className="mb-6 rounded-xl border border-[#B98A9E]/25 bg-black/35 p-4 space-y-2 text-xs sm:text-sm font-mono text-[#FF4D8D]"
        >
          {missingVars.map((name) => (
            <li key={name} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF7A3D] shrink-0" />
              <span>{name}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full min-h-[46px] rounded-xl border border-[#FF4D8D]/45 bg-[#FF4D8D]/15 hover:bg-[#FF4D8D]/25 text-[#F4E8D8] font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <RefreshCw className="h-4 w-4 text-[#FF4D8D]" />
          <span>إعادة فحص الإعدادات</span>
        </button>
      </div>
    </div>
  );
}
