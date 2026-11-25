import { AnimatePresence, Reorder, motion, useDragControls } from 'motion/react';
import {
  AlertCircle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Edit3,
  Eye,
  FileSpreadsheet,
  GripVertical,
  ImagePlus,
  Loader2,
  Music,
  Play,
  Plus,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { isFirebaseConfigured } from '../firebase';
import {
  addChallenge,
  batchAddChallenges,
  deleteChallenge,
  reorderChallenges,
  updateChallenge,
} from '../services/challengesService';
import { uploadAudio, uploadImage } from '../services/mediaUpload';
import {
  CATEGORIES,
  HEAT_LEVELS,
  getCategoryMeta,
  getHeatMeta,
  normalizeHeat,
  type CategoryId,
  type Challenge,
  type ChallengeInput,
  type HeatLevel,
} from '../types';
import { detectMediaKind, getMediaKindLabel } from '../utils/mediaType';
import { formatChallengeText } from '../utils/preferences';
import { resolveSongTitle } from '../utils/songTitle';
import { formatPlayerTime, playTapSound } from '../utils/sound';
import { ChallengeStage } from './ChallengeStage';

interface AdminPanelProps {
  challenges: Challenge[];
  loading: boolean;
  onExit: () => void;
}

type FilterOption = 'all' | CategoryId;
type EditorSectionKey = 'text' | 'media' | 'audio' | 'time' | 'backNote';

interface FormState {
  category: CategoryId;
  text: string;
  imageUrl: string;
  backNote: string;
  audioUrl: string;
  songTitle: string;
  timerMinutes: string;
  heat: HeatLevel;
  order: string;
  active: boolean;
}

interface ParsedBulkRow {
  lineNumber: number;
  raw: string;
  text: string;
  timerMinutes: number | null;
  heat: HeatLevel;
  error: string | null;
}

const QUICK_TIMERS: { label: string; value: string }[] = [
  { label: 'بدون', value: '' },
  { label: '5 د', value: '5' },
  { label: '10 د', value: '10' },
  { label: '15 د', value: '15' },
  { label: '30 د', value: '30' },
];

function createInitialForm(
  nextOrder: number,
  defaultCategory: CategoryId = 'dal3'
): FormState {
  return {
    category: defaultCategory,
    text: '',
    imageUrl: '',
    backNote: '',
    audioUrl: '',
    songTitle: '',
    timerMinutes: '',
    heat: 'warm',
    order: String(nextOrder),
    active: true,
  };
}

function parseBulkHeatToken(raw?: string): { heat: HeatLevel; valid: boolean } {
  if (!raw || !raw.trim()) return { heat: 'warm', valid: true };
  const t = raw.trim().toLowerCase();
  if (t === 'warm' || t === 'دافئ') return { heat: 'warm', valid: true };
  if (t === 'hot' || t === 'حار') return { heat: 'hot', valid: true };
  if (t === 'blazing' || t === 'مولع') return { heat: 'blazing', valid: true };
  return { heat: 'warm', valid: false };
}

function parseBulkLines(rawText: string): ParsedBulkRow[] {
  const lines = rawText.split(/\r?\n/);
  const rows: ParsedBulkRow[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const parts = trimmed.split('|').map((p) => p.trim());
    const textPart = parts[0] ?? '';
    const minsPart = parts[1] ?? '';
    const heatPart = parts[2] ?? '';

    let error: string | null = null;
    if (!textPart) {
      error = 'نص التحدي مفقود.';
    } else if (textPart.length > 2000) {
      error = 'نص التحدي يتجاوز 2000 حرف.';
    } else if (parts.length > 3) {
      error = 'تجاوز عدد الأعمدة المسموح (النص | الدقائق | الحرارة).';
    }

    let timerMinutes: number | null = null;
    if (!error && minsPart !== '') {
      const n = Number(minsPart);
      if (!Number.isFinite(n) || n <= 0 || n > 1440) {
        error = 'المدة يجب أن تكون رقماً بين 0.5 و 1440 دقيقة.';
      } else {
        timerMinutes = n;
      }
    }

    const heatCheck = parseBulkHeatToken(heatPart);
    if (!error && !heatCheck.valid) {
      error = 'درجة الإثارة غير معروفة (استخدم warm/hot/blazing أو دافئ/حار/مولع).';
    }

    rows.push({
      lineNumber: idx + 1,
      raw: trimmed,
      text: textPart,
      timerMinutes,
      heat: heatCheck.heat,
      error,
    });
  });

  return rows;
}

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  badge?: string | null;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  subtitle,
  badge,
  open,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="rounded-xl border border-[#B98A9E]/25 bg-[#1B0A22]/90 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between gap-3 text-right hover:bg-white/[0.03] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4D8D]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-bold text-[#F4E8D8]">
              {title}
            </span>
            {badge && (
              <span className="px-2 py-0.5 rounded bg-[#FF7A3D]/15 border border-[#FF7A3D]/40 text-[11px] font-bold text-[#FF7A3D]">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[#B98A9E] truncate mt-0.5">{subtitle}</p>
          )}
        </div>

        <ChevronDown
          className={`h-5 w-5 text-[#B98A9E] shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180 text-[#FF4D8D]' : ''
          }`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-[#B98A9E]/15 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

interface ChallengeAdminRowProps {
  item: Challenge;
  idx: number;
  totalCount: number;
  isEditingThis: boolean;
  onToggleActive: (c: Challenge) => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onDuplicate: (c: Challenge) => void;
  onEdit: (c: Challenge) => void;
  onRequestDelete: (c: Challenge) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function ChallengeAdminRow({
  item,
  idx,
  totalCount,
  isEditingThis,
  onToggleActive,
  onMove,
  onDuplicate,
  onEdit,
  onRequestDelete,
  onDragStart,
  onDragEnd,
}: ChallengeAdminRowProps) {
  const dragControls = useDragControls();
  const meta = getCategoryMeta(item.category);
  const heatMeta = getHeatMeta(normalizeHeat(item.heat));

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`rounded-xl border p-4 sm:p-5 transition-colors select-none ${
        isEditingThis
          ? 'border-[#FF4D8D]/70 bg-[#260D30]/95 shadow-[0_0_24px_-8px_rgba(255,77,141,0.45)]'
          : item.active
            ? 'border-[#B98A9E]/25 bg-[#1B0A22]/92'
            : 'border-[#B98A9E]/12 bg-[#130618]/75 opacity-65'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Visible, large touch-friendly drag handle (>= 48px) */}
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            dragControls.start(e);
          }}
          aria-label="اسحب لإعادة الترتيب"
          title="اسحب لإعادة الترتيب"
          className="touch-none min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl border border-[#B98A9E]/25 bg-[#120618]/90 text-[#B98A9E] hover:text-[#F4E8D8] hover:border-[#FF7A3D]/60 cursor-grab active:cursor-grabbing shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A3D]"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#B98A9E] mb-2 tabular-nums">
            <span className="text-[#FF7A3D] font-bold">#{item.order}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#F4E8D8]/85">{meta.title}</span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold" style={{ color: heatMeta.color }}>
              {heatMeta.label}
            </span>
            {item.timerMinutes && item.timerMinutes > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>مؤقت {item.timerMinutes} د</span>
              </>
            )}
            {item.imageUrl && (
              <>
                <span aria-hidden="true">·</span>
                <span>{getMediaKindLabel(detectMediaKind(item.imageUrl))}</span>
              </>
            )}
            {item.backNote && (
              <>
                <span aria-hidden="true">·</span>
                <span>ملاحظة</span>
              </>
            )}
            {item.audioUrl && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#FF4D8D]">أغنية</span>
              </>
            )}
          </div>

          <p className="text-sm sm:text-base text-[#F4E8D8] leading-relaxed select-text break-words">
            {item.text}
          </p>
        </div>

        {item.imageUrl &&
          (detectMediaKind(item.imageUrl) === 'video' ? (
            <video
              src={item.imageUrl}
              muted
              playsInline
              preload="metadata"
              className="h-16 w-16 rounded-md object-cover border border-[#F4E8D8]/25 shrink-0 bg-[#14081A]"
            />
          ) : (
            <img
              src={item.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-md object-cover border border-[#F4E8D8]/25 shrink-0"
            />
          ))}
      </div>

      {/* Action buttons: all >= 48px touch targets */}
      <div className="mt-4 pt-3 border-t border-[#B98A9E]/15 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleActive(item)}
            className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              item.active
                ? 'border-[#FF7A3D]/45 bg-[#FF7A3D]/15 text-[#F4E8D8]'
                : 'border-[#B98A9E]/25 bg-white/5 text-[#B98A9E]'
            }`}
          >
            {item.active ? 'مفعّل' : 'موقوف'}
          </button>

          <button
            type="button"
            disabled={idx === 0}
            onClick={() => onMove(idx, -1)}
            aria-label="تحريك للأعلى"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl border border-[#B98A9E]/20 bg-[#120618] text-[#F4E8D8] hover:border-[#FF7A3D]/50 disabled:opacity-30 cursor-pointer"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={idx === totalCount - 1}
            onClick={() => onMove(idx, 1)}
            aria-label="تحريك للأسفل"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl border border-[#B98A9E]/20 bg-[#120618] text-[#F4E8D8] hover:border-[#FF7A3D]/50 disabled:opacity-30 cursor-pointer"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onDuplicate(item)}
            aria-label="نسخ التحدي"
            title="نسخ التحدي"
            className="min-h-[48px] px-3.5 py-2 rounded-xl border border-[#B98A9E]/30 bg-[#120618] hover:border-[#FF4D8D]/50 text-[#F4E8D8] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="h-4 w-4 text-[#B98A9E]" />
            <span>نسخ</span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(item)}
            className="min-h-[48px] px-4 py-2 rounded-xl border border-[#FF7A3D]/40 bg-[#FF7A3D]/15 hover:bg-[#FF7A3D]/25 text-[#F4E8D8] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="h-4 w-4" />
            <span>تعديل</span>
          </button>

          <button
            type="button"
            onClick={() => onRequestDelete(item)}
            aria-label="حذف التحدي"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl border border-[#FF4D8D]/35 bg-[#FF4D8D]/10 hover:bg-[#FF4D8D]/25 text-[#FF4D8D] cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Reorder.Item>
  );
}

export function AdminPanel({ challenges, loading, onExit }: AdminPanelProps) {
  const [filter, setFilter] = useState<FilterOption>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() =>
    createInitialForm(challenges.length + 1)
  );

  // Collapsible preview + collapsible editor sections
  const [previewCollapsed, setPreviewCollapsed] = useState(true);
  const [openSections, setOpenSections] = useState<Record<EditorSectionKey, boolean>>({
    text: true,
    media: false,
    audio: false,
    time: true,
    backNote: false,
  });

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [deleteDialogTarget, setDeleteDialogTarget] = useState<Challenge | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk import state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<CategoryId>('dal3');
  const [bulkText, setBulkText] = useState('');
  const [importingBulk, setImportingBulk] = useState(false);

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [orderedItems, setOrderedItems] = useState<Challenge[]>([]);
  const latestOrderedItemsRef = useRef<Challenge[]>([]);
  const isDraggingRef = useRef(false);

  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const [testStatus, setTestStatus] = useState<
    'idle' | 'loading' | 'playing' | 'error'
  >('idle');
  const [testDuration, setTestDuration] = useState<number>(0);
  const [testError, setTestError] = useState<string | null>(null);

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-dismiss toast after 4.5s
  useEffect(() => {
    if (!statusMessage) return;
    const t = window.setTimeout(() => setStatusMessage(null), 4500);
    return () => window.clearTimeout(t);
  }, [statusMessage]);

  const stopTestAudio = () => {
    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current.currentTime = 0;
      testAudioRef.current.removeAttribute('src');
      testAudioRef.current.load();
      testAudioRef.current = null;
    }
    setTestStatus('idle');
    setTestDuration(0);
    setTestError(null);
  };

  useEffect(() => {
    return () => {
      stopTestAudio();
    };
  }, []);

  const filteredChallenges = useMemo(() => {
    if (filter === 'all') return challenges;
    return challenges.filter((c) => c.category === filter);
  }, [challenges, filter]);

  useEffect(() => {
    if (!isDraggingRef.current) {
      setOrderedItems(filteredChallenges);
      latestOrderedItemsRef.current = filteredChallenges;
    }
  }, [filteredChallenges]);

  const parsedBulkRows = useMemo(() => parseBulkLines(bulkText), [bulkText]);
  const validBulkRows = useMemo(
    () => parsedBulkRows.filter((r) => !r.error),
    [parsedBulkRows]
  );

  const toggleSection = (key: EditorSectionKey) => {
    playTapSound();
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleInsertToken = (token: '{ولد}' | '{بنت}') => {
    playTapSound();
    const el = textAreaRef.current;
    if (!el) {
      setForm((prev) => ({
        ...prev,
        text: prev.text ? `${prev.text} ${token}` : token,
      }));
      return;
    }

    const start = el.selectionStart ?? form.text.length;
    const end = el.selectionEnd ?? form.text.length;
    const nextText = form.text.slice(0, start) + token + form.text.slice(end);
    setForm((prev) => ({ ...prev, text: nextText }));

    window.requestAnimationFrame(() => {
      el.focus();
      const caret = start + token.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const handleTestPlay = async () => {
    playTapSound();
    if (testStatus === 'playing' || testStatus === 'loading') {
      stopTestAudio();
      return;
    }

    const url = form.audioUrl;
    if (!url || !/^https?:\/\//i.test(url)) {
      setTestStatus('error');
      setTestError('يجب أن يبدأ رابط الأغنية بـ http:// أو https://');
      return;
    }

    stopTestAudio();
    setTestStatus('loading');
    setTestError(null);

    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
    testAudioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setTestDuration(audio.duration);
      }
    });

    audio.addEventListener('ended', () => {
      setTestStatus('idle');
    });

    audio.addEventListener('error', () => {
      setTestStatus('error');
      setTestError('تعذّر تشغيل الأغنية');
    });

    try {
      await audio.play();
      setTestStatus('playing');
    } catch {
      setTestStatus('error');
      setTestError('تعذّر تشغيل الأغنية');
    }
  };

  const previewChallenge: Challenge = useMemo(() => {
    const parsedMinutes = form.timerMinutes.trim() ? Number(form.timerMinutes) : null;
    return {
      id: editingId ?? 'preview',
      category: form.category,
      text: form.text,
      imageUrl: form.imageUrl,
      backNote: form.backNote,
      audioUrl: form.audioUrl,
      songTitle: form.songTitle,
      timerMinutes:
        parsedMinutes && Number.isFinite(parsedMinutes) && parsedMinutes > 0
          ? parsedMinutes
          : null,
      heat: form.heat,
      order: Number(form.order) || 1,
      active: form.active,
      createdAt: Date.now(),
    };
  }, [editingId, form]);

  const previewDisplayText = useMemo(
    () =>
      form.text
        ? formatChallengeText(form.text, { boy: 'الولد', girl: 'البنت' })
        : '',
    [form.text]
  );

  const previewDisplayBackNote = useMemo(
    () =>
      form.backNote.trim()
        ? formatChallengeText(form.backNote, { boy: 'الولد', girl: 'البنت' })
        : '',
    [form.backNote]
  );

  const previewSeconds =
    previewChallenge.timerMinutes && previewChallenge.timerMinutes > 0
      ? Math.round(previewChallenge.timerMinutes * 60)
      : 0;

  const detectedMediaKind = useMemo(
    () => (form.imageUrl.trim() ? detectMediaKind(form.imageUrl) : null),
    [form.imageUrl]
  );

  const resetForm = (targetCat?: CategoryId, openMobile = false) => {
    stopTestAudio();
    setEditingId(null);
    const maxOrder = challenges.reduce((max, c) => Math.max(max, c.order), 0);
    setForm(
      createInitialForm(
        maxOrder + 1,
        targetCat ?? (filter === 'all' ? 'dal3' : filter)
      )
    );
    setOpenSections({
      text: true,
      media: false,
      audio: false,
      time: true,
      backNote: false,
    });
    if (openMobile) {
      setPreviewCollapsed(true);
      setMobileEditorOpen(true);
    }
  };

  const handleEdit = (challenge: Challenge) => {
    playTapSound();
    stopTestAudio();
    setEditingId(challenge.id);
    setForm({
      category: challenge.category,
      text: challenge.text,
      imageUrl: challenge.imageUrl ?? '',
      backNote: challenge.backNote ?? '',
      audioUrl: challenge.audioUrl ?? '',
      songTitle: challenge.songTitle ?? '',
      timerMinutes:
        typeof challenge.timerMinutes === 'number' && challenge.timerMinutes > 0
          ? String(challenge.timerMinutes)
          : '',
      heat: normalizeHeat(challenge.heat),
      order: String(challenge.order),
      active: challenge.active,
    });
    // Auto-expand populated sections when editing
    setOpenSections({
      text: true,
      media: Boolean(challenge.imageUrl?.trim()),
      audio: Boolean(challenge.audioUrl?.trim() || challenge.songTitle?.trim()),
      time: true,
      backNote: Boolean(challenge.backNote?.trim()),
    });
    setPreviewCollapsed(true);
    setMobileEditorOpen(true);
    setStatusMessage(null);
  };

  const handleDuplicate = async (item: Challenge) => {
    playTapSound();
    setStatusMessage(null);
    try {
      const subsequent = challenges
        .filter((c) => c.order > item.order)
        .map((c) => ({ id: c.id, order: c.order + 1 }));
      if (subsequent.length > 0) {
        await reorderChallenges(subsequent);
      }
      await addChallenge({
        category: item.category,
        text: item.text,
        imageUrl: item.imageUrl ?? '',
        backNote: item.backNote ?? '',
        audioUrl: item.audioUrl ?? '',
        songTitle: item.songTitle ?? '',
        timerMinutes: item.timerMinutes ?? null,
        heat: normalizeHeat(item.heat),
        order: item.order + 1,
        active: item.active,
      });
      setStatusMessage({ type: 'success', text: 'تم نسخ التحدي وإضافته بعده مباشرة.' });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر نسخ التحدي.',
      });
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingImage(true);
    setStatusMessage(null);
    try {
      const url = await uploadImage(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
      setStatusMessage({ type: 'success', text: 'تم رفع الصورة وحفظ رابطها بنجاح.' });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر رفع الصورة حالياً.',
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingAudio(true);
    setStatusMessage(null);
    try {
      const url = await uploadAudio(file);
      setForm((prev) => ({ ...prev, audioUrl: url }));
      setStatusMessage({ type: 'success', text: 'تم رفع الملف الصوتي بنجاح.' });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر رفع الملف الصوتي.',
      });
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playTapSound();

    if (!form.text.trim()) {
      setOpenSections((prev) => ({ ...prev, text: true }));
      setStatusMessage({ type: 'error', text: 'يرجى كتابة نص التحدي قبل الحفظ.' });
      return;
    }

    if (form.audioUrl !== '' && !/^https?:\/\//i.test(form.audioUrl)) {
      setOpenSections((prev) => ({ ...prev, audio: true }));
      setStatusMessage({
        type: 'error',
        text: 'رابط الأغنية يجب أن يبدأ بـ http:// أو https://',
      });
      return;
    }

    if (form.imageUrl !== '' && !/^https?:\/\//i.test(form.imageUrl)) {
      setOpenSections((prev) => ({ ...prev, media: true }));
      setStatusMessage({
        type: 'error',
        text: 'رابط الميديا يجب أن يبدأ بـ http:// أو https://',
      });
      return;
    }

    const parsedTimer = form.timerMinutes.trim() ? Number(form.timerMinutes) : null;
    if (
      parsedTimer !== null &&
      (!Number.isFinite(parsedTimer) || parsedTimer <= 0)
    ) {
      setOpenSections((prev) => ({ ...prev, time: true }));
      setStatusMessage({
        type: 'error',
        text: 'يرجى إدخال مدة صحيحة بالدقائق أو ترك الحقل فارغاً.',
      });
      return;
    }

    const parsedOrder = Number(form.order);
    const payload: ChallengeInput = {
      category: form.category,
      text: form.text.trim(),
      imageUrl: form.imageUrl,
      backNote: form.backNote.trim().slice(0, 300),
      audioUrl: form.audioUrl,
      songTitle: form.songTitle.trim().slice(0, 120),
      timerMinutes: parsedTimer,
      heat: form.heat,
      order:
        Number.isFinite(parsedOrder) && parsedOrder >= 0
          ? parsedOrder
          : challenges.length + 1,
      active: form.active,
    };

    setSaving(true);
    setStatusMessage(null);
    try {
      if (editingId) {
        await updateChallenge(editingId, payload);
        setStatusMessage({ type: 'success', text: 'تم تحديث التحدي بنجاح.' });
      } else {
        await addChallenge(payload);
        setStatusMessage({ type: 'success', text: 'تمت إضافة التحدي الجديد بنجاح.' });
      }
      resetForm(payload.category);
      setMobileEditorOpen(false);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء الحفظ.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkImport = async () => {
    playTapSound();
    if (validBulkRows.length === 0) return;

    const toImport = validBulkRows.slice(0, 100);
    const baseOrder = challenges.reduce((max, c) => Math.max(max, c.order), 0);
    const inputs: ChallengeInput[] = toImport.map((row, idx) => ({
      category: bulkCategory,
      text: row.text,
      imageUrl: '',
      backNote: '',
      audioUrl: '',
      songTitle: '',
      timerMinutes: row.timerMinutes,
      heat: row.heat,
      order: baseOrder + idx + 1,
      active: true,
    }));

    setImportingBulk(true);
    setStatusMessage(null);
    try {
      await batchAddChallenges(inputs);
      setBulkText('');
      setBulkOpen(false);
      setStatusMessage({
        type: 'success',
        text: `تم استيراد ${inputs.length} تحديات دفعة واحدة بنجاح.`,
      });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر استيراد التحديات.',
      });
    } finally {
      setImportingBulk(false);
    }
  };

  const handleToggleActive = async (challenge: Challenge) => {
    playTapSound();
    try {
      await updateChallenge(challenge.id, { active: !challenge.active });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر تغيير حالة التحدي.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialogTarget) return;
    playTapSound();
    setDeleting(true);
    try {
      await deleteChallenge(deleteDialogTarget.id);
      if (editingId === deleteDialogTarget.id) {
        resetForm();
        setMobileEditorOpen(false);
      }
      setDeleteDialogTarget(null);
      setStatusMessage({ type: 'success', text: 'تم حذف التحدي نهائياً.' });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر حذف التحدي.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleMove = async (indexInFiltered: number, direction: -1 | 1) => {
    playTapSound();
    const targetIndex = indexInFiltered + direction;
    if (targetIndex < 0 || targetIndex >= orderedItems.length) return;

    const currentItem = orderedItems[indexInFiltered];
    const swapItem = orderedItems[targetIndex];

    const newCurrentOrder =
      swapItem.order !== currentItem.order ? swapItem.order : targetIndex + 1;
    const newSwapOrder =
      swapItem.order !== currentItem.order ? currentItem.order : indexInFiltered + 1;

    try {
      await reorderChallenges([
        { id: currentItem.id, order: newCurrentOrder },
        { id: swapItem.id, order: newSwapOrder },
      ]);
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر إعادة الترتيب.',
      });
    }
  };

  const commitDragReorder = async (itemsToCommit: Challenge[]) => {
    isDraggingRef.current = false;
    const existingSlots = [...filteredChallenges]
      .map((c) => c.order)
      .sort((a, b) => a - b);

    const cleanSlots: number[] = [];
    existingSlots.forEach((slot, i) => {
      if (i === 0) {
        cleanSlots.push(slot);
      } else {
        cleanSlots.push(Math.max(slot, cleanSlots[i - 1] + 1));
      }
    });

    const updates: { id: string; order: number }[] = [];
    itemsToCommit.forEach((item, idx) => {
      const nextOrder = cleanSlots[idx] ?? idx + 1;
      if (item.order !== nextOrder) {
        updates.push({ id: item.id, order: nextOrder });
      }
    });

    if (updates.length === 0) return;

    try {
      await reorderChallenges(updates);
      setStatusMessage({ type: 'success', text: 'تم حفظ الترتيب الجديد.' });
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر حفظ الترتيب الجديد.',
      });
      setOrderedItems(filteredChallenges);
    }
  };

  const firebaseReady = isFirebaseConfigured();

  // Shared editor body used inside desktop split panel AND mobile bottom sheet
  const renderEditorBody = (isMobileSheet: boolean) => (
    <form
      id={isMobileSheet ? 'admin-editor-form-mobile' : 'admin-editor-form-desktop'}
      onSubmit={handleSubmit}
      className="space-y-3.5"
    >
      {/* Collapsible Live Polaroid & Stage Preview at Top of Editor */}
      <div className="rounded-xl border border-[#B98A9E]/25 bg-[#16071D]/90 overflow-hidden">
        <button
          type="button"
          onClick={() => {
            playTapSound();
            setPreviewCollapsed((v) => !v);
          }}
          aria-expanded={!previewCollapsed}
          className="w-full min-h-[50px] px-4 py-2.5 flex items-center justify-between gap-2 text-right hover:bg-white/[0.03] cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-[#F4E8D8]">
            <Eye className="h-4 w-4 text-[#FF7A3D]" />
            <span>المعاينة الحية للتحدي والصور</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-[#B98A9E]">
            <span>{previewCollapsed ? 'عرض' : 'إخفاء'}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                !previewCollapsed ? 'rotate-180 text-[#FF4D8D]' : ''
              }`}
            />
          </span>
        </button>

        {!previewCollapsed && (
          <div className="p-3 pt-1 border-t border-[#B98A9E]/15">
            <ChallengeStage
              challenge={previewChallenge}
              displayText={previewDisplayText}
              displayBackNote={previewDisplayBackNote}
              remainingSeconds={previewSeconds}
              totalSeconds={previewSeconds}
              timerFinished={previewSeconds === 0}
              hasStarted={false}
              isTimerPaused={false}
              heartBurstKey={0}
              onStart={() => undefined}
              onTogglePauseTimer={() => undefined}
              onSkip={() => undefined}
              onNext={() => undefined}
              previewMode
            />
          </div>
        )}
      </div>

      {/* Section 1: النص (Text + Category) */}
      <CollapsibleSection
        title="النص والقسم"
        subtitle={form.text.trim() ? form.text.slice(0, 36) : 'اكتب نص التحدي واختر السهرة'}
        open={openSections.text}
        onToggle={() => toggleSection('text')}
      >
        <div>
          <label className="block text-xs font-semibold text-[#B98A9E] mb-1.5">
            القسم
          </label>
          <select
            value={form.category}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                category: e.target.value as CategoryId,
              }))
            }
            className="w-full min-h-[48px] rounded-lg border border-[#B98A9E]/30 bg-[#120618] px-3.5 py-2 text-base text-[#F4E8D8] focus:outline-none focus:border-[#FF4D8D]"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label className="text-xs font-semibold text-[#B98A9E]">
              نص التحدي (بالعربية)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleInsertToken('{ولد}')}
                title="إدراج اسم الولد تلقائياً"
                className="min-h-[40px] px-3.5 py-1 rounded-lg border border-[#FF4D8D]/45 bg-[#FF4D8D]/15 hover:bg-[#FF4D8D]/25 text-xs font-bold text-[#F4E8D8] cursor-pointer"
              >
                + ولد
              </button>
              <button
                type="button"
                onClick={() => handleInsertToken('{بنت}')}
                title="إدراج اسم البنت تلقائياً"
                className="min-h-[40px] px-3.5 py-1 rounded-lg border border-[#FF7A3D]/45 bg-[#FF7A3D]/15 hover:bg-[#FF7A3D]/25 text-xs font-bold text-[#F4E8D8] cursor-pointer"
              >
                + بنت
              </button>
            </div>
          </div>

          <textarea
            ref={textAreaRef}
            rows={4}
            required
            value={form.text}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, text: e.target.value }))
            }
            placeholder="اكتب التحدي الرومانسي بأسلوب راقٍ ولطيف... (اضغط + ولد أو + بنت لإدراج اسميهما)"
            className="w-full rounded-lg border border-[#B98A9E]/30 bg-[#120618] px-3.5 py-3 text-base text-[#F4E8D8] placeholder:text-[#B98A9E]/45 focus:outline-none focus:border-[#FF4D8D] leading-relaxed"
          />
        </div>
      </CollapsibleSection>

      {/* Section 2: الميديا (Photo / GIF / Video link + upload) */}
      <CollapsibleSection
        title="الميديا (صورة / GIF / فيديو)"
        subtitle={form.imageUrl.trim() ? 'تم إرفاق وسائط للتحدي' : 'اختياري'}
        badge={detectedMediaKind ? getMediaKindLabel(detectedMediaKind) : null}
        open={openSections.media}
        onToggle={() => toggleSection('media')}
      >
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileChange}
          className="hidden"
        />

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            disabled={uploadingImage}
            onClick={() => imageInputRef.current?.click()}
            className="min-h-[48px] px-4 py-2 rounded-lg border border-[#FF7A3D]/45 bg-[#FF7A3D]/15 hover:bg-[#FF7A3D]/25 text-[#F4E8D8] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 disabled:opacity-60"
          >
            {uploadingImage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري رفع الصورة...</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4 text-[#FF7A3D]" />
                <span>رفع صورة</span>
              </>
            )}
          </button>

          <input
            type="text"
            dir="ltr"
            value={form.imageUrl}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
            }
            placeholder="https://... (jpg, gif, mp4, webm)"
            className="flex-1 min-h-[48px] rounded-lg border border-[#B98A9E]/30 bg-[#120618] px-3.5 py-2 text-base text-[#F4E8D8] placeholder:text-[#B98A9E]/40 focus:outline-none focus:border-[#FF4D8D]"
          />
        </div>
      </CollapsibleSection>

      {/* Section 3: الأغنية (Link + Test Play + Upload) */}
      <CollapsibleSection
        title="الأغنية"
        subtitle={form.audioUrl.trim() ? 'مرتبطة بأغنية' : 'اختياري'}
        badge={testDuration > 0 ? formatPlayerTime(testDuration) : null}
        open={openSections.audio}
        onToggle={() => toggleSection('audio')}
      >
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioFileChange}
          className="hidden"
        />

        <div className="flex flex-col gap-2.5">
          <div>
            <label className="block text-xs font-semibold text-[#B98A9E] mb-1">
              رابط الأغنية المباشر
            </label>
            <input
              type="text"
              dir="ltr"
              value={form.audioUrl}
              onChange={(e) => {
                stopTestAudio();
                setForm((prev) => ({ ...prev, audioUrl: e.target.value }));
              }}
              placeholder="https://res.cloudinary.com/.../song.mp3"
              className="w-full min-h-[48px] rounded-lg border border-[#B98A9E]/30 bg-[#120618] px-3.5 py-2 text-base text-[#F4E8D8] placeholder:text-[#B98A9E]/40 focus:outline-none focus:border-[#FF4D8D]"
            />
            {(form.audioUrl.trim() || form.songTitle.trim()) && (
              <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-[#B98A9E]/20 bg-[#120618]/80 px-3 py-1.5 text-xs">
                <span className="text-[#B98A9E] shrink-0">العنوان على المشغل:</span>
                <span
                  dir="auto"
                  className="font-bold text-[#F4E8D8] truncate"
                >
                  {resolveSongTitle(form.songTitle, form.audioUrl)}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#B98A9E] mb-1">
              اسم الأغنية (اختياري — يُستخرج تلقائياً إن تُرك فارغاً)
            </label>
            <input
              type="text"
              dir="auto"
              maxLength={120}
              value={form.songTitle}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, songTitle: e.target.value }))
              }
              placeholder="مثال: تملي معاك - عمرو دياب"
              className="w-full min-h-[46px] rounded-lg border border-[#B98A9E]/30 bg-[#120618] px-3.5 py-2 text-base text-[#F4E8D8] placeholder:text-[#B98A9E]/40 focus:outline-none focus:border-[#FF4D8D]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestPlay}
              disabled={!form.audioUrl}
              className="flex-1 min-h-[48px] px-4 py-2 rounded-lg border border-[#FF4D8D]/45 bg-[#FF4D8D]/15 hover:bg-[#FF4D8D]/25 text-[#F4E8D8] text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              {testStatus === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري التحميل...</span>
                </>
              ) : testStatus === 'playing' ? (
                <>
                  <Square className="h-4 w-4 fill-current text-[#FF7A3D]" />
                  <span>إيقاف التجربة</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current text-[#FF4D8D]" />
                  <span>تشغيل تجريبي</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={uploadingAudio}
              onClick={() => audioInputRef.current?.click()}
              className="min-h-[48px] px-4 py-2 rounded-lg border border-[#B98A9E]/30 bg-[#120618] hover:border-[#FF7A3D]/55 text-xs sm:text-sm text-[#B98A9E] hover:text-[#F4E8D8] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {uploadingAudio ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري الرفع...</span>
                </>
              ) : (
                <>
                  <Music className="h-4 w-4" />
                  <span>رفع صوت</span>
                </>
              )}
            </button>
          </div>

          {testError && <p className="text-xs text-[#FF7A3D]">{testError}</p>}
        </div>
      </CollapsibleSection>

      {/* Section 4: الوقت والدرجة */}
      <CollapsibleSection
        title="الوقت والدرجة والترتيب"
        subtitle={`${getHeatMeta(form.heat).label} · ${
          form.timerMinutes.trim() ? `${form.timerMinutes} دقيقة` : 'بدون مؤقت'
        }`}
        open={openSections.time}
        onToggle={() => toggleSection('time')}
      >
        <div>
          <label className="block text-xs font-semibold text-[#B98A9E] mb-1.5">
            درجة الإثارة
          </label>
          <div className="grid grid-cols-3 gap-2">
            {HEAT_LEVELS.map((h) => {
              const active = form.heat === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setForm((prev) => ({ ...prev, heat: h.id }));
                  }}
                  className={`min-h-[48px] px-2 rounded-lg border text-sm font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#281034] text-[#F4E8D8]'
                      : 'border-[#B98A9E]/25 bg-[#120618] text-[#B98A9E] hover:text-[#F4E8D8]'
                  }`}
                  style={{
                    borderColor: active ? h.color : undefined,
                    color: active ? h.color : undefined,
                  }}
                >
                  {h.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#B98A9E] mb-1.5">
            اختيار سريع للمؤقت
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_TIMERS.map((qt) => {
              const active = form.timerMinutes.trim() === qt.value;
              return (
                <button
                  key={qt.label}
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setForm((prev) => ({ ...prev, timerMinutes: qt.value }));
                  }}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-lg border text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                    active
                      ? 'border-[#FF7A3D] bg-[#FF7A3D]/25 text-[#F4E8D8]'
                      : 'border-[#B98A9E]/25 bg-[#120618] text-[#B98A9E] hover:text-[#F4E8D8]'
                  }`}
                >
                  {qt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-[#B98A9E] mb-1.5">
              مؤقت مخصص (د)
            </label>
            <input
              type="number"
              min="0.5"
              step="0.5"
              dir="ltr"
              value={form.timerMinutes}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, timerMinutes: e.target.value }))
              }
              placeholder="بدون"
              className="w-full min-h-[48px] rounded-lg border border-[#B98A9E]/30 bg-[#120618] px-3 py-2 text-base text-[#F4E8D8] placeholder:text-[#B98A9E]/40 tabular-nums focus:outline-none focus:border-[#FF4D8D]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#B98A9E] mb-1.5">
              الترتيب
            </label>
            <input
              type="number"
              min="0"
              dir="ltr"
              value={form.order}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, order: e.target.value }))
              }
              className="w-full min-h-[48px] rounded-lg border border-[#B98A9E]/30 bg-[#120618] px-3 py-2 text-base text-[#F4E8D8] tabular-nums focus:outline-none focus:border-[#FF4D8D]"
            />
          </div>

          <label className="col-span-2 sm:col-span-1 min-h-[48px] flex items-center justify-between gap-2 rounded-lg border border-[#B98A9E]/30 bg-[#120618] px-3.5 py-2 cursor-pointer">
            <span className="text-sm font-semibold text-[#F4E8D8]">مفعّل</span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, active: e.target.checked }))
              }
              className="h-5 w-5 accent-[#FF4D8D] cursor-pointer"
            />
          </label>
        </div>
      </CollapsibleSection>

      {/* Section 5: ملاحظة خلف الصورة */}
      <CollapsibleSection
        title="ملاحظة خلف الصورة"
        subtitle={form.backNote.trim() ? form.backNote.slice(0, 34) : 'اختياري — تظهر عند قلب البولارويد'}
        open={openSections.backNote}
        onToggle={() => toggleSection('backNote')}
      >
        <div className="flex items-center justify-between gap-2">
          <label className="text-xs font-semibold text-[#B98A9E]">
            نص الملاحظة (يدعم {'{name}'} و {'{partner}'})
          </label>
          <span className="text-xs text-[#B98A9E]/75 tabular-nums">
            {form.backNote.length}/300
          </span>
        </div>
        <textarea
          rows={3}
          maxLength={300}
          value={form.backNote}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, backNote: e.target.value }))
          }
          placeholder="مثال: لحظة ما تتنسيش يا {partner} ❤️ (أو اتركه لعبارة رومانسية تلقائية)"
          className="w-full rounded-lg border border-[#B98A9E]/30 bg-[#120618] px-3.5 py-2.5 text-base text-[#F4E8D8] placeholder:text-[#B98A9E]/40 focus:outline-none focus:border-[#FF4D8D] leading-relaxed"
        />
      </CollapsibleSection>

      {/* Desktop Inline Submit Bar */}
      {!isMobileSheet && (
        <div className="pt-2 flex items-center gap-2.5">
          <button
            type="submit"
            disabled={saving || uploadingImage || uploadingAudio}
            className="flex-1 min-h-[50px] px-5 py-2.5 rounded-xl bg-gradient-to-l from-[#FF4D8D] to-[#FF7A3D] text-[#F4E8D8] font-bold text-base inline-flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                <span>{editingId ? 'حفظ التعديلات' : 'إضافة التحدي'}</span>
              </>
            )}
          </button>

          {editingId && (
            <button
              type="button"
              onClick={() => resetForm()}
              className="min-h-[50px] px-4 py-2.5 rounded-xl border border-[#B98A9E]/30 bg-[#120618] text-[#B98A9E] hover:text-[#F4E8D8] text-sm font-semibold cursor-pointer"
            >
              إلغاء التعديل
            </button>
          )}
        </div>
      )}
    </form>
  );

  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 min-h-[100dvh] w-full overflow-x-hidden pb-16"
    >
      {/* Floating Success / Error Toast */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            role="status"
            className={`fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-[60] flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl ${
              statusMessage.type === 'success'
                ? 'border-[#FF7A3D]/60 bg-[#240D20]/95 text-[#F4E8D8]'
                : 'border-[#FF4D8D]/70 bg-[#360A22]/95 text-[#F4E8D8]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-[#FF7A3D] shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-[#FF4D8D] shrink-0" />
              )}
              <span className="font-semibold break-words">{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              aria-label="إغلاق التنبيه"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-white/10 cursor-pointer shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Top Bar (Mobile-First + Clean on Desktop) */}
      <header className="sticky top-0 z-30 border-b border-[#B98A9E]/20 bg-[#14081A]/98">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-3 space-y-2.5">
          {/* Row 1: Back + Title + Bulk + "+ تحدي جديد" */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  stopTestAudio();
                  onExit();
                }}
                aria-label="العودة للطاولة"
                className="min-h-[48px] px-3 sm:px-4 py-2 rounded-xl border border-[#B98A9E]/30 bg-[#1F0B29]/90 hover:border-[#FF4D8D]/55 text-[#F4E8D8] text-sm font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <ArrowRight className="h-4 w-4" />
                <span className="hidden sm:inline">العودة للطاولة</span>
              </button>
              <div className="min-w-0">
                <h1 className="font-calligraphy text-xl sm:text-2xl lg:text-3xl font-bold text-[#F4E8D8] truncate">
                  إدارة التحديات
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setBulkOpen((v) => !v);
                }}
                aria-label="استيراد جماعي"
                className={`min-h-[48px] px-3 sm:px-4 py-2 rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                  bulkOpen
                    ? 'border-[#FF7A3D] bg-[#FF7A3D]/20 text-[#F4E8D8]'
                    : 'border-[#B98A9E]/35 bg-[#1B0A22]/85 hover:border-[#FF7A3D]/60 text-[#F4E8D8]'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4 text-[#FF7A3D]" />
                <span className="hidden sm:inline">استيراد جماعي</span>
              </button>

              {/* Mobile opens Bottom Sheet; Desktop resets & focuses split-view editor */}
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  const isMobile =
                    typeof window !== 'undefined' && window.innerWidth < 1024;
                  resetForm(undefined, isMobile);
                }}
                className="min-h-[48px] px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-l from-[#FF4D8D] to-[#FF7A3D] text-[#F4E8D8] font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-[0_6px_18px_rgba(255,77,141,0.35)] cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span>تحدي جديد</span>
              </button>
            </div>
          </div>

          {/* Row 2: Night Filter inside Sticky Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => {
                playTapSound();
                setFilter('all');
              }}
              className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                filter === 'all'
                  ? 'bg-[#F4E8D8] text-[#14081A]'
                  : 'border border-[#B98A9E]/25 bg-[#1B0A22]/85 text-[#B98A9E] hover:text-[#F4E8D8]'
              }`}
            >
              الكل ({challenges.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = challenges.filter((c) => c.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setFilter(cat.id);
                  }}
                  className={`min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    filter === cat.id
                      ? 'bg-[#F4E8D8] text-[#14081A]'
                      : 'border border-[#B98A9E]/25 bg-[#1B0A22]/85 text-[#B98A9E] hover:text-[#F4E8D8]'
                  }`}
                >
                  {cat.title} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 pt-5">
        {!firebaseReady && (
          <div className="mb-5 rounded-xl border border-[#FF7A3D]/40 bg-[#250E2A]/85 px-4 py-3 text-xs sm:text-sm text-[#F4E8D8]">
            يعمل التطبيق الآن على التخزين المحلي المؤقت للمعاينة. ضع متغيرات Firebase في{' '}
            <code dir="ltr" className="px-1.5 py-0.5 rounded bg-black/40 text-[#FF7A3D]">
              .env.local
            </code>{' '}
            أو في إعدادات Vercel لتفعيل المزامنة السحابية عبر Firestore.
          </div>
        )}

        {/* Bulk Import Expandable Card (Mobile-first Card Preview instead of table) */}
        {bulkOpen && (
          <section className="mb-6 rounded-xl border border-[#FF7A3D]/40 bg-[#1B0A22]/95 p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-calligraphy text-2xl font-bold text-[#F4E8D8]">
                  استيراد تحديات دفعة واحدة
                </h2>
                <p className="text-xs text-[#B98A9E] mt-1">
                  سطر لكل تحدٍ بصيغة:{' '}
                  <code dir="ltr" className="px-1.5 py-0.5 rounded bg-black/40 text-[#FF7A3D]">
                    text | minutes | heat
                  </code>{' '}
                  (الدقائق والحرارة اختياريان).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                aria-label="إغلاق الاستيراد الجماعي"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#B98A9E] hover:text-[#F4E8D8] cursor-pointer shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#B98A9E] mb-1.5">
                  القسم المستهدف
                </label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value as CategoryId)}
                  className="w-full min-h-[48px] rounded-lg border border-[#B98A9E]/30 bg-[#120618] px-3.5 py-2 text-base text-[#F4E8D8] focus:outline-none focus:border-[#FF4D8D]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-[#B98A9E] mb-1.5">
                  قائمة التحديات (سطر لكل تحدٍ)
                </label>
                <textarea
                  rows={5}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`يهمس {ولد} في أذن {بنت} بثلاث صفات يحبها فيها | 5 | دافئ\nرقصة هادئة على ضوء خافت | 10 | حار\nقبلة طويلة ومفاجأة لطيفة | | مولع`}
                  className="w-full rounded-lg border border-[#B98A9E]/30 bg-[#120618] px-3.5 py-3 text-base text-[#F4E8D8] placeholder:text-[#B98A9E]/40 focus:outline-none focus:border-[#FF4D8D] leading-relaxed"
                />
              </div>
            </div>

            {/* Mobile-Friendly Card List Preview (no wide table) */}
            {parsedBulkRows.length > 0 && (
              <div className="space-y-2 max-h-72 overflow-y-auto scrapbook-scroll pr-0.5">
                {parsedBulkRows.map((row) => {
                  const hm = getHeatMeta(row.heat);
                  return (
                    <div
                      key={row.lineNumber}
                      className={`rounded-xl border p-3.5 space-y-1.5 ${
                        row.error
                          ? 'border-[#FF4D8D]/55 bg-[#2B0C1E]/85'
                          : 'border-[#B98A9E]/20 bg-[#120618]/85'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums">
                        <div className="flex items-center gap-2 text-[#B98A9E]">
                          <span className="font-bold text-[#FF7A3D]">
                            #{row.lineNumber}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {row.timerMinutes ? `${row.timerMinutes} د` : 'بدون مؤقت'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold" style={{ color: hm.color }}>
                            {hm.label}
                          </span>
                        </div>

                        <span
                          className={`font-bold ${
                            row.error ? 'text-[#FF4D8D]' : 'text-[#FF7A3D]'
                          }`}
                        >
                          {row.error ? row.error : 'جاهز للاستيراد'}
                        </span>
                      </div>

                      <p className="text-sm text-[#F4E8D8] leading-relaxed break-words">
                        {row.text || '—'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <span className="text-xs text-[#B98A9E] tabular-nums">
                صالحة للاستيراد: {validBulkRows.length} من أصل {parsedBulkRows.length}
                {validBulkRows.length > 100 ? ' (سيتم استيراد أول 100 سطر)' : ''}
              </span>
              <button
                type="button"
                disabled={validBulkRows.length === 0 || importingBulk}
                onClick={handleBulkImport}
                className="min-h-[48px] px-5 py-2.5 rounded-xl bg-gradient-to-l from-[#FF4D8D] to-[#FF7A3D] text-[#F4E8D8] font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45"
              >
                {importingBulk ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جاري الاستيراد...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>
                      استيراد {Math.min(validBulkRows.length, 100)} تحدٍ دفعة واحدة
                    </span>
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Main Layout: Mobile Single Column List + Desktop Side-by-Side Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
          {/* Challenge Cards List (Left/Right in RTL: col-span-7 on Desktop) */}
          <div className="lg:col-span-7 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[#B98A9E]/15 bg-[#1B0A22]/70 p-5 animate-pulse space-y-3"
                  >
                    <div className="h-4 w-32 rounded bg-[#B98A9E]/15" />
                    <div className="h-5 w-3/4 rounded bg-[#B98A9E]/10" />
                  </div>
                ))}
              </div>
            ) : orderedItems.length === 0 ? (
              <div className="rounded-xl border border-[#B98A9E]/20 bg-[#1B0A22]/80 p-8 sm:p-10 text-center space-y-4">
                <p className="text-sm sm:text-base text-[#B98A9E]">
                  لا توجد تحديات في هذا القسم حالياً.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    const isMobile =
                      typeof window !== 'undefined' && window.innerWidth < 1024;
                    resetForm(undefined, isMobile);
                  }}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-gradient-to-l from-[#FF4D8D] to-[#FF7A3D] text-[#F4E8D8] font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>أضف أول تحدي الآن</span>
                </button>
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={orderedItems}
                onReorder={(next) => {
                  latestOrderedItemsRef.current = next;
                  setOrderedItems(next);
                }}
                className="space-y-3"
              >
                {orderedItems.map((item, idx) => (
                  <ChallengeAdminRow
                    key={item.id}
                    item={item}
                    idx={idx}
                    totalCount={orderedItems.length}
                    isEditingThis={editingId === item.id}
                    onToggleActive={handleToggleActive}
                    onMove={handleMove}
                    onDuplicate={handleDuplicate}
                    onEdit={handleEdit}
                    onRequestDelete={(c) => {
                      playTapSound();
                      setDeleteDialogTarget(c);
                    }}
                    onDragStart={() => {
                      isDraggingRef.current = true;
                    }}
                    onDragEnd={() => {
                      void commitDragReorder(latestOrderedItemsRef.current);
                    }}
                  />
                ))}
              </Reorder.Group>
            )}
          </div>

          {/* Desktop Split View Editor + Collapsible Live Preview (hidden on phone; no bottom sheet on desktop) */}
          <div className="hidden lg:block lg:col-span-5 lg:sticky lg:top-32 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="font-calligraphy text-2xl font-bold text-[#F4E8D8]">
                {editingId ? 'تعديل التحدي' : 'كتابة تحدي جديد'}
              </h2>
              {editingId && (
                <button
                  type="button"
                  onClick={() => resetForm()}
                  className="text-xs font-semibold text-[#B98A9E] hover:text-[#FF4D8D] underline cursor-pointer"
                >
                  تحدي جديد بدلاً منه
                </button>
              )}
            </div>

            {renderEditorBody(false)}
          </div>
        </div>
      </div>

      {/* Mobile Full-Screen Bottom Sheet Editor with Sticky Save Bar (< 1024px only) */}
      <AnimatePresence>
        {mobileEditorOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 bg-black/82 flex flex-col justify-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="h-[95dvh] w-full rounded-t-3xl border-t border-[#B98A9E]/35 bg-[#14081A] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Drag affordance & Sheet Header */}
              <div className="shrink-0 border-b border-[#B98A9E]/20 bg-[#1B0A22]/95 px-4 pt-2.5 pb-3">
                <div
                  aria-hidden="true"
                  className="mx-auto mb-2.5 h-1.5 w-12 rounded-full bg-[#B98A9E]/40"
                />
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-calligraphy text-2xl font-bold text-[#F4E8D8]">
                    {editingId ? 'تعديل التحدي' : 'تحدي جديد'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      stopTestAudio();
                      setMobileEditorOpen(false);
                    }}
                    aria-label="إغلاق المحرر"
                    className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl border border-[#B98A9E]/25 bg-[#120618] text-[#F4E8D8] cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Editor Body */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {renderEditorBody(true)}
              </div>

              {/* Sticky Bottom Save Bar */}
              <div className="shrink-0 border-t border-[#B98A9E]/25 bg-[#1B0A22] p-3 flex items-center gap-2.5">
                <button
                  type="submit"
                  form="admin-editor-form-mobile"
                  disabled={saving || uploadingImage || uploadingAudio}
                  className="flex-1 min-h-[52px] px-5 py-3 rounded-xl bg-gradient-to-l from-[#FF4D8D] to-[#FF7A3D] text-[#F4E8D8] font-bold text-base inline-flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5" />
                      <span>حفظ</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    stopTestAudio();
                    setMobileEditorOpen(false);
                  }}
                  className="min-h-[52px] px-4 py-3 rounded-xl border border-[#B98A9E]/30 bg-[#120618] text-[#B98A9E] font-bold text-sm cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Delete Modal Dialog */}
      <AnimatePresence>
        {deleteDialogTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !deleting && setDeleteDialogTarget(null)}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/82 p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
              className="w-full max-w-md rounded-2xl border border-[#FF4D8D]/45 bg-[#1B0A22] p-6 shadow-2xl text-[#F4E8D8]"
            >
              <h2
                id="delete-dialog-title"
                className="font-calligraphy text-2xl font-bold mb-2 text-[#F4E8D8]"
              >
                تأكيد حذف التحدي
              </h2>
              <p className="text-sm text-[#B98A9E] leading-relaxed mb-4">
                هل أنت متأكد من حذف هذا التحدي نهائياً؟ لا يمكن التراجع عن هذا الإجراء.
              </p>

              <div className="mb-5 rounded-xl border border-[#B98A9E]/20 bg-[#120618] p-3 text-sm text-[#F4E8D8]/90 line-clamp-3">
                {deleteDialogTarget.text}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleConfirmDelete()}
                  className="flex-1 min-h-[48px] px-5 py-2.5 rounded-xl bg-[#FF4D8D] hover:bg-[#FF357E] text-[#F4E8D8] font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>جاري الحذف...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      <span>تأكيد الحذف</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => {
                    playTapSound();
                    setDeleteDialogTarget(null);
                  }}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl border border-[#B98A9E]/30 bg-[#120618] text-[#F4E8D8] font-semibold text-sm cursor-pointer disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  );
}
