import {
  Check,
  Edit3,
  FolderPlus,
  Loader2,
  Music,
  Play,
  Plus,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { uploadAudio } from '../services/mediaUpload';
import {
  addSavedSong,
  addSongCategory,
  deleteSavedSong,
  deleteSongCategory,
  renameSongCategory,
  updateSavedSong,
} from '../services/songsService';
import type { SavedSong, SongCategory } from '../types';
import { resolveSongTitle } from '../utils/songTitle';
import { formatPlayerTime, playTapSound } from '../utils/sound';

interface AdminSongsSettingsProps {
  categories: SongCategory[];
  songs: SavedSong[];
  onStatus: (msg: { type: 'success' | 'error'; text: string }) => void;
}

const SUGGESTED_CATEGORIES = ['أغاني هادية', 'أغاني رومانسية', 'أغاني حماسية'];

export function AdminSongsSettings({
  categories,
  songs,
  onStatus,
}: AdminSongsSettingsProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    () => categories[0]?.id ?? ''
  );

  // Category creation / rename / delete state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<SongCategory | null>(null);
  const [busyCategoryDelete, setBusyCategoryDelete] = useState(false);

  // Add song form state
  const [songUrl, setSongUrl] = useState('');
  const [songTitle, setSongTitle] = useState('');
  const [addingSong, setAddingSong] = useState(false);
  const [uploadingSong, setUploadingSong] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Inline edit song state
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [editSongUrl, setEditSongUrl] = useState('');
  const [editSongTitle, setEditSongTitle] = useState('');
  const [savingSongEdit, setSavingSongEdit] = useState(false);

  // Test playback state
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [durationsMap, setDurationsMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategoryId('');
      return;
    }
    if (!categories.some((c) => c.id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const stopAudio = () => {
    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current.currentTime = 0;
      testAudioRef.current.removeAttribute('src');
      testAudioRef.current.load();
      testAudioRef.current = null;
    }
    setPlayingKey(null);
    setLoadingKey(null);
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const handleTestPlay = async (key: string, url: string) => {
    playTapSound();
    if (playingKey === key || loadingKey === key) {
      stopAudio();
      return;
    }
    if (!url || !/^https?:\/\//i.test(url)) {
      onStatus({
        type: 'error',
        text: 'يجب أن يبدأ رابط الأغنية بـ http:// أو https://',
      });
      return;
    }

    stopAudio();
    setLoadingKey(key);

    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = url;
    testAudioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDurationsMap((prev) => ({ ...prev, [key]: audio.duration }));
      }
    });

    audio.addEventListener('ended', () => {
      setPlayingKey(null);
      setLoadingKey(null);
    });

    audio.addEventListener('error', () => {
      setPlayingKey(null);
      setLoadingKey(null);
      onStatus({ type: 'error', text: 'تعذّر تشغيل الأغنية' });
    });

    try {
      await audio.play();
      setLoadingKey(null);
      setPlayingKey(key);
    } catch {
      setPlayingKey(null);
      setLoadingKey(null);
      onStatus({ type: 'error', text: 'تعذّر تشغيل الأغنية' });
    }
  };

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );

  const categorySongs = useMemo(
    () => songs.filter((s) => s.categoryId === selectedCategoryId),
    [songs, selectedCategoryId]
  );

  const unusedSuggestions = useMemo(() => {
    const existingNames = new Set(categories.map((c) => c.name.trim()));
    return SUGGESTED_CATEGORIES.filter((name) => !existingNames.has(name));
  }, [categories]);

  const handleCreateCategory = async (nameToCreate: string) => {
    playTapSound();
    const clean = nameToCreate.trim();
    if (!clean) {
      onStatus({ type: 'error', text: 'يرجى كتابة اسم القسم أولاً.' });
      return;
    }
    setCreatingCategory(true);
    try {
      const id = await addSongCategory(clean, categories.length + 1);
      setNewCategoryName('');
      setSelectedCategoryId(id);
      onStatus({ type: 'success', text: `تمت إضافة قسم «${clean}».` });
    } catch (err) {
      onStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر إنشاء القسم.',
      });
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSaveRename = async (id: string) => {
    playTapSound();
    if (!renameValue.trim()) return;
    try {
      await renameSongCategory(id, renameValue);
      setRenamingId(null);
      onStatus({ type: 'success', text: 'تم تعديل اسم القسم.' });
    } catch (err) {
      onStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر تعديل اسم القسم.',
      });
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategory) return;
    playTapSound();
    setBusyCategoryDelete(true);
    stopAudio();
    try {
      await deleteSongCategory(deletingCategory.id);
      setDeletingCategory(null);
      onStatus({ type: 'success', text: 'تم حذف القسم وجميع أغانيه.' });
    } catch (err) {
      onStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر حذف القسم.',
      });
    } finally {
      setBusyCategoryDelete(false);
    }
  };

  const handleUploadAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingSong(true);
    try {
      const url = await uploadAudio(file);
      setSongUrl(url);
      if (!songTitle.trim()) {
        setSongTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      onStatus({ type: 'success', text: 'تم رفع الملف الصوتي بنجاح.' });
    } catch (err) {
      onStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر رفع الملف الصوتي.',
      });
    } finally {
      setUploadingSong(false);
    }
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    playTapSound();
    if (!selectedCategoryId) {
      onStatus({ type: 'error', text: 'اختر أو أضف قسماً أولاً.' });
      return;
    }
    if (!songUrl || !/^https?:\/\//i.test(songUrl)) {
      onStatus({
        type: 'error',
        text: 'يجب أن يبدأ رابط الأغنية بـ http:// أو https://',
      });
      return;
    }

    setAddingSong(true);
    try {
      await addSavedSong({
        categoryId: selectedCategoryId,
        url: songUrl,
        title: songTitle,
      });
      stopAudio();
      setSongUrl('');
      setSongTitle('');
      onStatus({ type: 'success', text: 'تم حفظ الأغنية داخل القسم.' });
    } catch (err) {
      onStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر حفظ الأغنية.',
      });
    } finally {
      setAddingSong(false);
    }
  };

  const handleSaveSongEdit = async (id: string) => {
    playTapSound();
    if (!editSongUrl || !/^https?:\/\//i.test(editSongUrl)) {
      onStatus({
        type: 'error',
        text: 'يجب أن يبدأ رابط الأغنية بـ http:// أو https://',
      });
      return;
    }
    setSavingSongEdit(true);
    try {
      await updateSavedSong(id, { url: editSongUrl, title: editSongTitle });
      setEditingSongId(null);
      onStatus({ type: 'success', text: 'تم تحديث بيانات الأغنية.' });
    } catch (err) {
      onStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر تحديث الأغنية.',
      });
    } finally {
      setSavingSongEdit(false);
    }
  };

  const handleDeleteSong = async (id: string) => {
    playTapSound();
    if (playingKey === id) stopAudio();
    try {
      await deleteSavedSong(id);
      onStatus({ type: 'success', text: 'تم حذف الأغنية.' });
    } catch (err) {
      onStatus({
        type: 'error',
        text: err instanceof Error ? err.message : 'تعذر حذف الأغنية.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="rounded-xl border border-[#B98A9E]/25 bg-[#1B0A22]/90 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-calligraphy text-2xl font-bold text-[#F4E8D8]">
            مكتبة الأغاني المحفوظة
          </h2>
          <p className="text-xs sm:text-sm text-[#B98A9E] mt-1">
            أنشئ أقساماً للأغاني (مثل: أغاني هادية، أغاني رومانسية، أغاني حماسية) وأضف فيها أي عدد من الأغاني لاختيار قسم كامل عشوائياً داخل أي تحدٍ.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-[#FF7A3D] shrink-0 tabular-nums">
          <span className="rounded-lg border border-[#FF7A3D]/35 bg-[#FF7A3D]/10 px-3 py-1.5">
            {categories.length} أقسام
          </span>
          <span className="rounded-lg border border-[#FF4D8D]/35 bg-[#FF4D8D]/10 px-3 py-1.5 text-[#FF70A6]">
            {songs.length} أغنية
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Categories Column */}
        <section className="lg:col-span-5 rounded-xl border border-[#B98A9E]/25 bg-[#1B0A22]/92 p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-[#FF7A3D]" />
            <h3 className="text-base font-bold text-[#F4E8D8]">أقسام الأغاني</h3>
          </div>

          {/* Add New Category Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreateCategory(newCategoryName);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              maxLength={80}
              placeholder="اسم القسم (مثال: أغاني هادية)"
              className="flex-1 min-h-[48px] rounded-lg border border-[#B98A9E]/30 bg-[#120618] px-3.5 py-2 text-base text-[#F4E8D8] placeholder:text-[#B98A9E]/45 focus:outline-none focus:border-[#FF4D8D]"
            />
            <button
              type="submit"
              disabled={creatingCategory || !newCategoryName.trim()}
              className="min-h-[48px] px-4 py-2 rounded-lg bg-gradient-to-l from-[#FF4D8D] to-[#FF7A3D] text-[#F4E8D8] font-bold text-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-45 shrink-0"
            >
              {creatingCategory ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>إضافة</span>
            </button>
          </form>

          {/* 1-Tap Quick Category Suggestions */}
          {unusedSuggestions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-[#B98A9E]">
                إضافة سريعة لأقسام مقترحة:
              </p>
              <div className="flex flex-wrap gap-2">
                {unusedSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    disabled={creatingCategory}
                    onClick={() => void handleCreateCategory(name)}
                    className="min-h-[40px] px-3 py-1.5 rounded-lg border border-[#FF7A3D]/40 bg-[#FF7A3D]/10 hover:bg-[#FF7A3D]/20 text-xs font-bold text-[#F4E8D8] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#FF7A3D]" />
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Existing Categories List */}
          {categories.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#B98A9E]/25 bg-[#120618]/70 p-6 text-center text-xs sm:text-sm text-[#B98A9E]">
              لا توجد أقسام بعد. أضف أول قسم من الأعلى أو اختر من الاقتراحات السريعة.
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => {
                const count = songs.filter((s) => s.categoryId === cat.id).length;
                const active = cat.id === selectedCategoryId;
                const isRenaming = renamingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`rounded-xl border p-3 transition-colors ${
                      active
                        ? 'border-[#FF4D8D]/75 bg-[#2A0E35]'
                        : 'border-[#B98A9E]/20 bg-[#120618]/85 hover:border-[#B98A9E]/45'
                    }`}
                  >
                    {isRenaming ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          maxLength={80}
                          autoFocus
                          className="flex-1 min-h-[44px] rounded-lg border border-[#FF4D8D]/60 bg-[#120618] px-3 py-1.5 text-sm text-[#F4E8D8] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSaveRename(cat.id)}
                          aria-label="حفظ الاسم"
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-[#FF7A3D] text-[#14081A] cursor-pointer"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          aria-label="إلغاء"
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[#B98A9E]/25 text-[#B98A9E] cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            playTapSound();
                            setSelectedCategoryId(cat.id);
                          }}
                          className="flex-1 min-h-[44px] text-right flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <span className="font-bold text-sm sm:text-base text-[#F4E8D8] truncate">
                            {cat.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-[#B98A9E]/25 text-[11px] text-[#B98A9E] tabular-nums shrink-0">
                            {count} أغنية
                          </span>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              playTapSound();
                              setRenamingId(cat.id);
                              setRenameValue(cat.name);
                            }}
                            aria-label="تعديل اسم القسم"
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#B98A9E] hover:text-[#FF7A3D] cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              playTapSound();
                              setDeletingCategory(cat);
                            }}
                            aria-label="حذف القسم"
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#B98A9E] hover:text-[#FF4D8D] cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Songs in Selected Category Column */}
        <section className="lg:col-span-7 rounded-xl border border-[#B98A9E]/25 bg-[#1B0A22]/92 p-4 sm:p-5 space-y-5">
          {!selectedCategory ? (
            <div className="py-12 text-center space-y-2 text-[#B98A9E]">
              <Music className="h-9 w-9 mx-auto text-[#FF4D8D]/65" />
              <p className="text-sm">اختر قسماً أو أنشئ قسماً جديداً لإضافة الأغاني بداخله.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-[#B98A9E]/15 pb-3">
                <div>
                  <h3 className="font-calligraphy text-2xl font-bold text-[#F4E8D8]">
                    أغاني قسم: {selectedCategory.name}
                  </h3>
                  <p className="text-xs text-[#B98A9E] mt-0.5 tabular-nums">
                    عدد الأغاني المحفوظة في هذا القسم: {categorySongs.length}
                  </p>
                </div>
              </div>

              {/* Add Song to Selected Category */}
              <form
                onSubmit={handleAddSong}
                className="rounded-xl border border-[#FF4D8D]/25 bg-[#120618]/85 p-3.5 sm:p-4 space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleUploadAudioFile}
                  className="hidden"
                />

                <div>
                  <label className="block text-xs font-semibold text-[#B98A9E] mb-1">
                    رابط الأغنية المباشر (يُحفظ كما هو تماماً)
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={songUrl}
                    onChange={(e) => setSongUrl(e.target.value)}
                    placeholder="https://res.cloudinary.com/.../song.mp3"
                    className="w-full min-h-[48px] rounded-lg border border-[#B98A9E]/30 bg-[#1B0A22] px-3.5 py-2 text-base text-[#F4E8D8] placeholder:text-[#B98A9E]/40 focus:outline-none focus:border-[#FF4D8D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#B98A9E] mb-1">
                    اسم الأغنية (اختياري)
                  </label>
                  <input
                    type="text"
                    dir="auto"
                    maxLength={120}
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    placeholder="مثال: تملي معاك - عمرو دياب"
                    className="w-full min-h-[46px] rounded-lg border border-[#B98A9E]/30 bg-[#1B0A22] px-3.5 py-2 text-base text-[#F4E8D8] placeholder:text-[#B98A9E]/40 focus:outline-none focus:border-[#FF4D8D]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!songUrl}
                    onClick={() => void handleTestPlay('new-song-draft', songUrl)}
                    className="min-h-[46px] px-3.5 py-2 rounded-lg border border-[#FF4D8D]/40 bg-[#FF4D8D]/15 hover:bg-[#FF4D8D]/25 text-xs sm:text-sm font-semibold text-[#F4E8D8] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    {loadingKey === 'new-song-draft' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : playingKey === 'new-song-draft' ? (
                      <Square className="h-4 w-4 fill-current text-[#FF7A3D]" />
                    ) : (
                      <Play className="h-4 w-4 fill-current text-[#FF4D8D]" />
                    )}
                    <span>
                      {playingKey === 'new-song-draft' ? 'إيقاف' : 'تشغيل تجريبي'}
                    </span>
                    {durationsMap['new-song-draft'] ? (
                      <span className="text-[11px] text-[#FF7A3D] tabular-nums">
                        ({formatPlayerTime(durationsMap['new-song-draft'])})
                      </span>
                    ) : null}
                  </button>

                  <button
                    type="button"
                    disabled={uploadingSong}
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[46px] px-3.5 py-2 rounded-lg border border-[#B98A9E]/30 bg-[#1B0A22] hover:border-[#FF7A3D]/55 text-xs sm:text-sm text-[#B98A9E] hover:text-[#F4E8D8] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {uploadingSong ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Music className="h-4 w-4" />
                    )}
                    <span>{uploadingSong ? 'جاري الرفع...' : 'رفع ملف صوت'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={addingSong || uploadingSong || !songUrl}
                    className="flex-1 min-h-[46px] px-4 py-2 rounded-lg bg-gradient-to-l from-[#FF4D8D] to-[#FF7A3D] text-[#F4E8D8] font-bold text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45"
                  >
                    {addingSong ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>حفظ في القسم</span>
                  </button>
                </div>
              </form>

              {/* Saved Songs List */}
              {categorySongs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#B98A9E]/25 bg-[#120618]/60 p-6 text-center text-xs sm:text-sm text-[#B98A9E]">
                  لا توجد أغانٍ محفوظة في «{selectedCategory.name}» بعد. أضف أول أغنية من النموذج أعلاه.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {categorySongs.map((song, idx) => {
                    const isEditing = editingSongId === song.id;
                    const displayTitle = resolveSongTitle(song.title, song.url);
                    const dur = durationsMap[song.id];

                    return (
                      <div
                        key={song.id}
                        className="rounded-xl border border-[#B98A9E]/20 bg-[#120618]/90 p-3.5 space-y-2.5"
                      >
                        {isEditing ? (
                          <div className="space-y-2.5">
                            <input
                              type="text"
                              dir="ltr"
                              value={editSongUrl}
                              onChange={(e) => setEditSongUrl(e.target.value)}
                              className="w-full min-h-[44px] rounded-lg border border-[#B98A9E]/35 bg-[#1B0A22] px-3 py-1.5 text-sm text-[#F4E8D8] focus:outline-none focus:border-[#FF4D8D]"
                            />
                            <input
                              type="text"
                              dir="auto"
                              maxLength={120}
                              value={editSongTitle}
                              onChange={(e) => setEditSongTitle(e.target.value)}
                              placeholder="اسم الأغنية (اختياري)"
                              className="w-full min-h-[44px] rounded-lg border border-[#B98A9E]/35 bg-[#1B0A22] px-3 py-1.5 text-sm text-[#F4E8D8] focus:outline-none focus:border-[#FF4D8D]"
                            />
                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => setEditingSongId(null)}
                                className="min-h-[42px] px-3.5 rounded-lg border border-[#B98A9E]/25 text-xs text-[#B98A9E] cursor-pointer"
                              >
                                إلغاء
                              </button>
                              <button
                                type="button"
                                disabled={savingSongEdit}
                                onClick={() => void handleSaveSongEdit(song.id)}
                                className="min-h-[42px] px-4 rounded-lg bg-[#FF7A3D] text-[#14081A] font-bold text-xs cursor-pointer"
                              >
                                حفظ
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2.5">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#FF7A3D] tabular-nums">
                                  #{idx + 1}
                                </span>
                                <span
                                  dir="auto"
                                  className="text-sm font-bold text-[#F4E8D8] truncate"
                                >
                                  {displayTitle}
                                </span>
                                {dur ? (
                                  <span className="text-[11px] text-[#B98A9E] tabular-nums shrink-0">
                                    {formatPlayerTime(dur)}
                                  </span>
                                ) : null}
                              </div>
                              <p
                                dir="ltr"
                                className="text-[11px] text-[#B98A9E]/65 truncate mt-0.5 text-left"
                              >
                                {song.url}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => void handleTestPlay(song.id, song.url)}
                                aria-label={
                                  playingKey === song.id ? 'إيقاف الأغنية' : 'تشغيل الأغنية'
                                }
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[#FF4D8D]/35 bg-[#FF4D8D]/12 text-[#FF4D8D] cursor-pointer"
                              >
                                {loadingKey === song.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : playingKey === song.id ? (
                                  <Square className="h-4 w-4 fill-current text-[#FF7A3D]" />
                                ) : (
                                  <Play className="h-4 w-4 fill-current" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  playTapSound();
                                  setEditingSongId(song.id);
                                  setEditSongUrl(song.url);
                                  setEditSongTitle(song.title);
                                }}
                                aria-label="تعديل الأغنية"
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[#B98A9E]/25 text-[#B98A9E] hover:text-[#FF7A3D] cursor-pointer"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDeleteSong(song.id)}
                                aria-label="حذف الأغنية"
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg border border-[#FF4D8D]/25 text-[#FF4D8D] hover:bg-[#FF4D8D]/15 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Delete Category Confirmation Dialog */}
      {deletingCategory && (
        <div
          onClick={() => !busyCategoryDelete && setDeletingCategory(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/82 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-[#FF4D8D]/45 bg-[#1B0A22] p-6 shadow-2xl text-[#F4E8D8]"
          >
            <h3 className="font-calligraphy text-2xl font-bold mb-2">
              حذف قسم «{deletingCategory.name}»؟
            </h3>
            <p className="text-sm text-[#B98A9E] leading-relaxed mb-6">
              سيتم حذف هذا القسم وجميع الأغاني المحفوظة بداخله نهائياً.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={busyCategoryDelete}
                onClick={() => setDeletingCategory(null)}
                className="min-h-[46px] px-4 rounded-xl border border-[#B98A9E]/30 bg-[#120618] text-sm font-semibold text-[#F4E8D8] cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={busyCategoryDelete}
                onClick={() => void handleConfirmDeleteCategory()}
                className="min-h-[46px] px-5 rounded-xl bg-[#FF4D8D] text-sm font-bold text-[#F4E8D8] inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {busyCategoryDelete ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span>حذف القسم</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
