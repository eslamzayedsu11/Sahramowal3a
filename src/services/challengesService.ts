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
import { auth, db, isFirebaseConfigured } from '../firebase';
import { SEED_CHALLENGES } from '../data/seedChallenges';
import {
  normalizeHeat,
  type CategoryId,
  type Challenge,
  type ChallengeInput,
} from '../types';

const COLLECTION_NAME = 'challenges';
const VALID_CATEGORIES: CategoryId[] = ['dal3', 'motaa', 'akher'];
const LOCAL_STORAGE_KEY = 'sahra_molaa_challenges_local_v1';
const SEED_DONE_KEY = 'sahra_molaa_firestore_seeded_v1';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

type Listener = (challenges: Challenge[]) => void;
const localListeners = new Set<Listener>();

function sortChallenges(list: Challenge[]): Challenge[] {
  return [...list].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.createdAt - b.createdAt;
  });
}

function clampChallengePayload(input: ChallengeInput) {
  const category: CategoryId = VALID_CATEGORIES.includes(input.category)
    ? input.category
    : 'dal3';
  const text = input.text.trim().slice(0, 2000);
  const imageUrl = input.imageUrl ?? '';
  const backNote = (input.backNote ?? '').trim().slice(0, 300);
  const audioUrl = input.audioUrl ?? '';
  const songTitle = (input.songTitle ?? '').trim().slice(0, 120);
  const timerMinutes =
    typeof input.timerMinutes === 'number' &&
    Number.isFinite(input.timerMinutes) &&
    input.timerMinutes > 0
      ? Math.min(1440, input.timerMinutes)
      : null;
  const heat = normalizeHeat(input.heat);
  const order =
    Number.isFinite(input.order) && input.order >= 0
      ? Math.min(100000, input.order)
      : 1;

  return {
    category,
    text,
    imageUrl,
    backNote,
    audioUrl,
    songTitle,
    timerMinutes,
    heat,
    order,
    active: Boolean(input.active),
  };
}

function readLocalChallenges(): Challenge[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const seeded: Challenge[] = SEED_CHALLENGES.map((item, idx) => ({
        ...item,
        heat: normalizeHeat(item.heat),
        id: `seed-${idx + 1}`,
        createdAt: Date.now() + idx,
      }));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(seeded));
      return sortChallenges(seeded);
    }
    const parsed = JSON.parse(raw) as Challenge[];
    return sortChallenges(
      Array.isArray(parsed)
        ? parsed.map((c) => ({ ...c, heat: normalizeHeat(c.heat) }))
        : []
    );
  } catch {
    return [];
  }
}

function writeLocalChallenges(items: Challenge[]) {
  const sorted = sortChallenges(items);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sorted));
  localListeners.forEach((cb) => cb(sorted));
}

let seedPromise: Promise<void> | null = null;

export async function seedInitialChallengesIfEmpty(): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    readLocalChallenges();
    return;
  }

  const firestore = db;

  if (localStorage.getItem(SEED_DONE_KEY) === 'true') {
    return;
  }

  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const colRef = collection(firestore, COLLECTION_NAME);
      const q = query(colRef, where('category', 'in', VALID_CATEGORIES));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        const batch = writeBatch(firestore);
        const now = Date.now();
        SEED_CHALLENGES.forEach((item, index) => {
          const docRef = doc(colRef);
          batch.set(docRef, {
            ...clampChallengePayload(item),
            createdAt: now + index,
          });
        });
        await batch.commit();
      }
      localStorage.setItem(SEED_DONE_KEY, 'true');
    } catch (err) {
      console.error('Error seeding initial challenges:', err);
    } finally {
      seedPromise = null;
    }
  })();

  return seedPromise;
}

export function subscribeChallenges(
  onData: (challenges: Challenge[]) => void,
  onError: (message: string) => void
): () => void {
  if (!db || !isFirebaseConfigured()) {
    const initial = readLocalChallenges();
    const timer = window.setTimeout(() => {
      onData(initial);
    }, 180);
    localListeners.add(onData);
    return () => {
      window.clearTimeout(timer);
      localListeners.delete(onData);
    };
  }

  void seedInitialChallengesIfEmpty();

  const q = query(
    collection(db, COLLECTION_NAME),
    where('category', 'in', VALID_CATEGORIES)
  );
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: Challenge[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          category: VALID_CATEGORIES.includes(data.category) ? data.category : 'dal3',
          text: String(data.text ?? ''),
          imageUrl: data.imageUrl ? String(data.imageUrl) : '',
          backNote: data.backNote ? String(data.backNote) : '',
          audioUrl: data.audioUrl ? String(data.audioUrl) : '',
          songTitle: data.songTitle ? String(data.songTitle) : '',
          timerMinutes:
            typeof data.timerMinutes === 'number' && data.timerMinutes > 0
              ? data.timerMinutes
              : null,
          heat: normalizeHeat(data.heat),
          order: typeof data.order === 'number' ? data.order : 0,
          active: data.active !== false,
          createdAt: typeof data.createdAt === 'number' ? data.createdAt : Date.now(),
        };
      });
      onData(sortChallenges(items));
    },
    (error) => {
      console.error('Firestore listener error:', error);
      onError('تعذر الاتصال بقاعدة البيانات حالياً. تأكد من إعدادات Firebase واتصالك بالإنترنت.');
      try {
        handleFirestoreError(error, OperationType.LIST, COLLECTION_NAME);
      } catch {
        // Error already logged via handleFirestoreError
      }
    }
  );

  return unsubscribe;
}

export async function addChallenge(input: ChallengeInput): Promise<void> {
  const payload = {
    ...clampChallengePayload(input),
    createdAt: Date.now(),
  };

  if (!db || !isFirebaseConfigured()) {
    const current = readLocalChallenges();
    const created: Challenge = {
      ...payload,
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    writeLocalChallenges([...current, created]);
    return;
  }

  try {
    await addDoc(collection(db, COLLECTION_NAME), payload);
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.CREATE, COLLECTION_NAME);
    } catch {
      throw new Error('حدث خطأ أثناء حفظ التحدي. حاول مرة أخرى.');
    }
  }
}

export async function batchAddChallenges(inputs: ChallengeInput[]): Promise<void> {
  if (inputs.length === 0) return;

  if (!db || !isFirebaseConfigured()) {
    const current = readLocalChallenges();
    const now = Date.now();
    const created: Challenge[] = inputs.map((item, idx) => ({
      ...clampChallengePayload(item),
      id: `local-${now}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: now + idx,
    }));
    writeLocalChallenges([...current, ...created]);
    return;
  }

  try {
    const colRef = collection(db, COLLECTION_NAME);
    const batch = writeBatch(db);
    const now = Date.now();
    inputs.forEach((item, idx) => {
      const docRef = doc(colRef);
      batch.set(docRef, {
        ...clampChallengePayload(item),
        createdAt: now + idx,
      });
    });
    await batch.commit();
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.WRITE, COLLECTION_NAME);
    } catch {
      throw new Error('تعذر استيراد التحديات دفعة واحدة. يرجى المحاولة مرة أخرى.');
    }
  }
}

export async function updateChallenge(
  id: string,
  updates: Partial<ChallengeInput>
): Promise<void> {
  const cleanUpdates: Record<string, unknown> = {};
  if (updates.category !== undefined) {
    cleanUpdates.category = VALID_CATEGORIES.includes(updates.category)
      ? updates.category
      : 'dal3';
  }
  if (updates.text !== undefined) {
    cleanUpdates.text = updates.text.trim().slice(0, 2000);
  }
  if (updates.imageUrl !== undefined) {
    cleanUpdates.imageUrl = updates.imageUrl;
  }
  if (updates.backNote !== undefined) {
    cleanUpdates.backNote = updates.backNote.trim().slice(0, 300);
  }
  if (updates.audioUrl !== undefined) {
    cleanUpdates.audioUrl = updates.audioUrl;
  }
  if (updates.songTitle !== undefined) {
    cleanUpdates.songTitle = updates.songTitle.trim().slice(0, 120);
  }
  if (updates.timerMinutes !== undefined) {
    cleanUpdates.timerMinutes =
      typeof updates.timerMinutes === 'number' &&
      Number.isFinite(updates.timerMinutes) &&
      updates.timerMinutes > 0
        ? Math.min(1440, updates.timerMinutes)
        : null;
  }
  if (updates.heat !== undefined) {
    cleanUpdates.heat = normalizeHeat(updates.heat);
  }
  if (updates.order !== undefined) {
    cleanUpdates.order =
      Number.isFinite(updates.order) && updates.order >= 0
        ? Math.min(100000, updates.order)
        : 0;
  }
  if (updates.active !== undefined) {
    cleanUpdates.active = Boolean(updates.active);
  }

  if (!db || !isFirebaseConfigured()) {
    const current = readLocalChallenges();
    const updated = current.map((item) =>
      item.id === id ? { ...item, ...(cleanUpdates as Partial<Challenge>) } : item
    );
    writeLocalChallenges(updated);
    return;
  }

  try {
    await updateDoc(doc(db, COLLECTION_NAME, id), cleanUpdates);
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
    } catch {
      throw new Error('تعذر تحديث التحدي. يرجى المحاولة مرة أخرى.');
    }
  }
}

export async function deleteChallenge(id: string): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    const current = readLocalChallenges();
    writeLocalChallenges(current.filter((item) => item.id !== id));
    return;
  }

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    } catch {
      throw new Error('تعذر حذف التحدي. يرجى المحاولة مرة أخرى.');
    }
  }
}

export async function reorderChallenges(
  orderedIds: { id: string; order: number }[]
): Promise<void> {
  if (!db || !isFirebaseConfigured()) {
    const orderMap = new Map(orderedIds.map((x) => [x.id, x.order]));
    const current = readLocalChallenges().map((item) =>
      orderMap.has(item.id) ? { ...item, order: orderMap.get(item.id)! } : item
    );
    writeLocalChallenges(current);
    return;
  }

  try {
    const firestore = db;
    const batch = writeBatch(firestore);
    orderedIds.forEach(({ id, order }) => {
      const safeOrder =
        Number.isFinite(order) && order >= 0 ? Math.min(100000, order) : 0;
      batch.update(doc(firestore, COLLECTION_NAME, id), { order: safeOrder });
    });
    await batch.commit();
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.WRITE, COLLECTION_NAME);
    } catch {
      throw new Error('تعذر إعادة ترتيب التحديات. يرجى المحاولة مرة أخرى.');
    }
  }
}
