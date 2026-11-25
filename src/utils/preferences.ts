import type {
  CategoryId,
  CoupleNames,
  SavedNightProgress,
} from '../types';

const NAMES_KEY = 'sahra_couple_names_v1';
const NAMES_VISITED_KEY = 'sahra_names_prompted_v1';
const CANDLE_MODE_KEY = 'sahra_candle_mode_v1';
const PROGRESS_PREFIX = 'sahra_night_progress_v1_';

const candleListeners = new Set<(enabled: boolean) => void>();

export function loadCoupleNames(): CoupleNames {
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    if (!raw) return { boy: '', girl: '' };
    const parsed = JSON.parse(raw) as Partial<CoupleNames>;
    return {
      boy: typeof parsed.boy === 'string' ? parsed.boy.trim() : '',
      girl: typeof parsed.girl === 'string' ? parsed.girl.trim() : '',
    };
  } catch {
    return { boy: '', girl: '' };
  }
}

export function saveCoupleNames(names: CoupleNames): void {
  try {
    localStorage.setItem(
      NAMES_KEY,
      JSON.stringify({
        boy: names.boy.trim(),
        girl: names.girl.trim(),
      })
    );
  } catch {
    // Ignore storage errors
  }
}

export function hasPromptedCoupleNames(): boolean {
  try {
    return localStorage.getItem(NAMES_VISITED_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markPromptedCoupleNames(): void {
  try {
    localStorage.setItem(NAMES_VISITED_KEY, 'true');
  } catch {
    // Ignore
  }
}

export function hasAnyCoupleName(names: CoupleNames): boolean {
  return Boolean(names.boy.trim() || names.girl.trim());
}

export function formatChallengeText(
  rawText: string,
  names: CoupleNames
): string {
  const boyName = names.boy.trim() || 'الولد';
  const girlName = names.girl.trim() || 'البنت';

  return rawText
    .replace(/\{ولد\}/g, boyName)
    .replace(/\{بنت\}/g, girlName)
    .replace(/\{boy\}/gi, boyName)
    .replace(/\{girl\}/gi, girlName)
    .replace(/\{name\}/gi, boyName)
    .replace(/\{partner\}/gi, girlName);
}

// Candle Mode
export function isCandleModeEnabled(): boolean {
  try {
    return localStorage.getItem(CANDLE_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setCandleModeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(CANDLE_MODE_KEY, String(enabled));
  } catch {
    // Ignore
  }
  candleListeners.forEach((cb) => cb(enabled));
}

export function subscribeCandleMode(cb: (enabled: boolean) => void): () => void {
  candleListeners.add(cb);
  cb(isCandleModeEnabled());
  return () => candleListeners.delete(cb);
}

// Per-night saved progress (ignores any legacy turnIndex / orderMode / heatFilter keys cleanly)
export function loadNightProgress(
  categoryId: CategoryId
): SavedNightProgress | null {
  try {
    const raw = localStorage.getItem(`${PROGRESS_PREFIX}${categoryId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object') return null;

    const rawDeckIds = parsed.deckIds;
    if (!Array.isArray(rawDeckIds) || rawDeckIds.length === 0) {
      return null;
    }
    const deckIds = rawDeckIds.filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    );
    if (deckIds.length === 0) return null;

    const currentIndex =
      typeof parsed.currentIndex === 'number' &&
      Number.isFinite(parsed.currentIndex) &&
      parsed.currentIndex >= 0
        ? Math.floor(parsed.currentIndex)
        : 0;

    if (currentIndex >= deckIds.length) {
      return null;
    }

    return {
      categoryId,
      currentIndex,
      deckIds,
      completedCount:
        typeof parsed.completedCount === 'number' &&
        Number.isFinite(parsed.completedCount)
          ? Math.max(0, Math.floor(parsed.completedCount))
          : 0,
      skippedCount:
        typeof parsed.skippedCount === 'number' &&
        Number.isFinite(parsed.skippedCount)
          ? Math.max(0, Math.floor(parsed.skippedCount))
          : 0,
      elapsedSeconds:
        typeof parsed.elapsedSeconds === 'number' &&
        Number.isFinite(parsed.elapsedSeconds)
          ? Math.max(0, Math.floor(parsed.elapsedSeconds))
          : 0,
      updatedAt:
        typeof parsed.updatedAt === 'number' && Number.isFinite(parsed.updatedAt)
          ? parsed.updatedAt
          : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveNightProgress(progress: SavedNightProgress): void {
  try {
    localStorage.setItem(
      `${PROGRESS_PREFIX}${progress.categoryId}`,
      JSON.stringify(progress)
    );
  } catch {
    // Ignore
  }
}

export function clearNightProgress(categoryId: CategoryId): void {
  try {
    localStorage.removeItem(`${PROGRESS_PREFIX}${categoryId}`);
  } catch {
    // Ignore
  }
}
