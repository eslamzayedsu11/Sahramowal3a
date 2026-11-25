import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import type { SavedSong, SongCategory } from '../types';
import { handleFirestoreError, OperationType } from './challengesService';

const CATEGORIES_COLLECTION = 'songCategories';
const SONGS_COLLECTION = 'savedSongs';
const LOCAL_CATEGORIES_KEY = 'sahra_molaa_song_categories_v1';
const LOCAL_SONGS_KEY = 'sahra_molaa_saved_songs_v1';

type CategoriesListener = (categories: SongCategory[]) => void;
type SongsListener = (songs: SavedSong[]) => void;

const localCategoryListeners = new Set<CategoriesListener>();
const localSongListeners = new Set<SongsListener>();

function formatSongWriteError(err: unknown, fallback: string): Error {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const code = (err as { code?: string } | null)?.code ?? '';
  if (
    code.includes('permission-denied') ||
    raw.includes('permission-denied') ||
    raw.includes('Missing or insufficient permissions')
  ) {
    return new Error(
      'صلاحيات Firestore لا تسمح بالكتابة حالياً — يرجى التأكد من نشر قواعد firestore.rules.'
    );
  }
  return new Error(fallback);
}

function sortCategories(list: SongCategory[]): SongCategory[] {
  return [...list].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.createdAt - b.createdAt;
  });
}

function sortSongs(list: SavedSong[]): SavedSong[] {
  return [...list].sort((a, b) => a.createdAt - b.createdAt);
}

function readLocalCategories(): SongCategory[] {
  try {
    const raw = localStorage.getItem(LOCAL_CATEGORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortCategories(parsed) : [];
  } catch {
    return [];
  }
}

function writeLocalCategories(items: SongCategory[]) {
  const sorted = sortCategories(items);
  localStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(sorted));
  localCategoryListeners.forEach((cb) => cb(sorted));
}

function readLocalSongs(): SavedSong[] {
  try {
    const raw = localStorage.getItem(LOCAL_SONGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortSongs(parsed) : [];
  } catch {
    return [];
  }
}

function writeLocalSongs(items: SavedSong[]) {
  const sorted = sortSongs(items);
  localStorage.setItem(LOCAL_SONGS_KEY, JSON.stringify(sorted));
  localSongListeners.forEach((cb) => cb(sorted));
}

export function subscribeSongCategories(
  onData: (categories: SongCategory[]) => void,
  onError?: (message: string) => void
): () => void {
  if (!db || !isFirebaseConfigured()) {
    const initial = readLocalCategories();
    const timer = window.setTimeout(() => onData(initial), 40);
    localCategoryListeners.add(onData);
    return () => {
      window.clearTimeout(timer);
      localCategoryListeners.delete(onData);
    };
  }

  return onSnapshot(
    collection(db, CATEGORIES_COLLECTION),
    (snapshot) => {
      const items: SongCategory[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name ?? '').trim(),
          order: typeof data.order === 'number' ? data.order : 0,
          createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
        };
      });
      onData(sortCategories(items));
    },
    (error) => {
      console.error('Firestore songCategories error:', error);
      onError?.('تعذر تحميل أقسام الأغاني المحفوظة.');
      try {
        handleFirestoreError(error, OperationType.LIST, CATEGORIES_COLLECTION);
      } catch {
        // Logged
      }
    }
  );
}

export function subscribeSavedSongs(
  onData: (songs: SavedSong[]) => void,
  onError?: (message: string) => void
): () => void {
  if (!db || !isFirebaseConfigured()) {
    const initial = readLocalSongs();
    const timer = window.setTimeout(() => onData(initial), 40);
    localSongListeners.add(onData);
    return () => {
      window.clearTimeout(timer);
      localSongListeners.delete(onData);
    };
  }

  return onSnapshot(
    collection(db, SONGS_COLLECTION),
    (snapshot) => {
      const items: SavedSong[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          categoryId: String(data.categoryId ?? ''),
          title: String(data.title ?? ''),
          // Preserve exact URL verbatim
          url: String(data.url ?? ''),
          createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
        };
      });
      onData(sortSongs(items));
    },
    (error) => {
      console.error('Firestore savedSongs error:', error);
      onError?.('تعذر تحميل الأغاني المحفوظة.');
      try {
        handleFirestoreError(error, OperationType.LIST, SONGS_COLLECTION);
      } catch {
        // Logged
      }
    }
  );
}

export async function addSongCategory(name: string, order = 0): Promise<string> {
  const cleanName = name.trim().slice(0, 80);
  if (!cleanName) {
    throw new Error('يرجى كتابة اسم القسم أولاً.');
  }

  const payload = {
    name: cleanName,
    order: Number.isFinite(order) ? order : 0,
    createdAt: Date.now(),
  };

  if (!db || !isFirebaseConfigured()) {
    const current = readLocalCategories();
    const id = `songcat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    writeLocalCategories([...current, { ...payload, id }]);
    return id;
  }

  try {
    const ref = await addDoc(collection(db, CATEGORIES_COLLECTION), payload);
    return ref.id;
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.CREATE, CATEGORIES_COLLECTION);
    } catch {
      throw formatSongWriteError(err, 'تعذر إنشاء قسم الأغاني. حاول مرة أخرى.');
    }
  }
}

export async function renameSongCategory(id: string, name: string): Promise<void> {
  const cleanName = name.trim().slice(0, 80);
  if (!cleanName) throw new Error('يرجى كتابة اسم القسم.');

  if (!db || !isFirebaseConfigured()) {
    const current = readLocalCategories();
    writeLocalCategories(
      current.map((c) => (c.id === id ? { ...c, name: cleanName } : c))
    );
    return;
  }

  try {
    await updateDoc(doc(db, CATEGORIES_COLLECTION, id), { name: cleanName });
  } catch (err) {
    try {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `${CATEGORIES_COLLECTION}/${id}`
      );
    } catch {
      throw formatSongWriteError(err, 'تعذر تعديل اسم القسم.');
    }
  }
}

export async function deleteSongCategory(id: string): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    writeLocalCategories(readLocalCategories().filter((c) => c.id !== id));
    writeLocalSongs(readLocalSongs().filter((s) => s.categoryId !== id));
    return;
  }

  try {
    const firestore = db;
    const songsSnap = await getDocs(
      query(collection(firestore, SONGS_COLLECTION), where('categoryId', '==', id))
    );
    const batch = writeBatch(firestore);
    songsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(doc(firestore, CATEGORIES_COLLECTION, id));
    await batch.commit();
  } catch (err) {
    try {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `${CATEGORIES_COLLECTION}/${id}`
      );
    } catch {
      throw formatSongWriteError(err, 'تعذر حذف القسم والأغاني المرتبطة به.');
    }
  }
}

export async function addSavedSong(input: {
  categoryId: string;
  url: string;
  title?: string;
}): Promise<string> {
  if (!input.categoryId) {
    throw new Error('يرجى اختيار قسم للأغنية.');
  }
  // Preserve exact URL as pasted; only validate http(s)
  if (!input.url || !/^https?:\/\//i.test(input.url)) {
    throw new Error('يجب أن يبدأ رابط الأغنية بـ http:// أو https://');
  }

  const payload = {
    categoryId: input.categoryId,
    url: input.url,
    title: (input.title ?? '').trim().slice(0, 120),
    createdAt: Date.now(),
  };

  if (!db || !isFirebaseConfigured()) {
    const current = readLocalSongs();
    const id = `song-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    writeLocalSongs([...current, { ...payload, id }]);
    return id;
  }

  try {
    const ref = await addDoc(collection(db, SONGS_COLLECTION), payload);
    return ref.id;
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.CREATE, SONGS_COLLECTION);
    } catch {
      throw formatSongWriteError(err, 'تعذر حفظ الأغنية. حاول مرة أخرى.');
    }
  }
}

export async function updateSavedSong(
  id: string,
  updates: { url?: string; title?: string; categoryId?: string }
): Promise<void> {
  const clean: Record<string, unknown> = {};
  if (updates.url !== undefined) {
    if (!/^https?:\/\//i.test(updates.url)) {
      throw new Error('يجب أن يبدأ رابط الأغنية بـ http:// أو https://');
    }
    clean.url = updates.url;
  }
  if (updates.title !== undefined) {
    clean.title = updates.title.trim().slice(0, 120);
  }
  if (updates.categoryId !== undefined) {
    clean.categoryId = updates.categoryId;
  }

  if (!db || !isFirebaseConfigured()) {
    const current = readLocalSongs();
    writeLocalSongs(
      current.map((s) => (s.id === id ? { ...s, ...(clean as Partial<SavedSong>) } : s))
    );
    return;
  }

  try {
    await updateDoc(doc(db, SONGS_COLLECTION, id), clean);
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.UPDATE, `${SONGS_COLLECTION}/${id}`);
    } catch {
      throw formatSongWriteError(err, 'تعذر تحديث بيانات الأغنية.');
    }
  }
}

export async function deleteSavedSong(id: string): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    writeLocalSongs(readLocalSongs().filter((s) => s.id !== id));
    return;
  }

  try {
    await deleteDoc(doc(db, SONGS_COLLECTION, id));
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.DELETE, `${SONGS_COLLECTION}/${id}`);
    } catch {
      throw formatSongWriteError(err, 'تعذر حذف الأغنية.');
    }
  }
}
