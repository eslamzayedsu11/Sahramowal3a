export type CategoryId = 'dal3' | 'motaa' | 'akher';

export type HeatLevel = 'warm' | 'hot' | 'blazing';

export interface HeatMeta {
  id: HeatLevel;
  label: string;
  color: string;
  rank: number;
}

export const HEAT_LEVELS: HeatMeta[] = [
  { id: 'warm', label: 'دافئ', color: '#F59E0B', rank: 1 },
  { id: 'hot', label: 'حار', color: '#FF4D8D', rank: 2 },
  { id: 'blazing', label: 'مولع', color: '#FF7A3D', rank: 3 },
];

export function getHeatMeta(heat?: HeatLevel | null): HeatMeta {
  return HEAT_LEVELS.find((h) => h.id === heat) ?? HEAT_LEVELS[0];
}

export function normalizeHeat(raw?: string | null): HeatLevel {
  if (raw === 'hot' || raw === 'حار') return 'hot';
  if (raw === 'blazing' || raw === 'مولع') return 'blazing';
  return 'warm';
}

export interface ChallengeSong {
  url: string;
  title?: string;
}

export interface SongCategory {
  id: string;
  name: string;
  order: number;
  createdAt: number;
}

export interface SavedSong {
  id: string;
  categoryId: string;
  title: string;
  url: string;
  createdAt: number;
}

export interface Challenge {
  id: string;
  category: CategoryId;
  text: string;
  imageUrl?: string;
  backNote?: string;
  audioUrl?: string;
  songTitle?: string;
  songs?: ChallengeSong[];
  audioCategoryId?: string;
  audioVolume?: number;
  timerMinutes?: number | null;
  heat?: HeatLevel;
  order: number;
  active: boolean;
  createdAt: number;
}

export interface ChallengeInput {
  category: CategoryId;
  text: string;
  imageUrl?: string;
  backNote?: string;
  audioUrl?: string;
  songTitle?: string;
  songs?: ChallengeSong[];
  audioCategoryId?: string;
  audioVolume?: number;
  timerMinutes?: number | null;
  heat?: HeatLevel;
  order: number;
  active: boolean;
}

export interface CategoryMeta {
  id: CategoryId;
  title: string;
  tagline: string;
  accentColor: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'dal3',
    title: 'سهرة الدلع',
    tagline: 'همسات دافئة ولمسات ناعمة تذيب المسافات بينكما',
    accentColor: '#FF70A6',
  },
  {
    id: 'motaa',
    title: 'سهرة المتعة والاثارة',
    tagline: 'شغف متجدد ولحظات جريئة تشعل الأجواء بالحب',
    accentColor: '#FF4D8D',
  },
  {
    id: 'akher',
    title: 'سهرة على آخرنا',
    tagline: 'ليلة بلا حدود ترفع نبض القرب لأقصى مداه',
    accentColor: '#9D4EDD',
  },
];

export function getCategoryMeta(id: CategoryId): CategoryMeta {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];
}

export interface CoupleNames {
  boy: string;
  girl: string;
}

export interface SavedNightProgress {
  categoryId: CategoryId;
  currentIndex: number;
  deckIds: string[];
  completedCount: number;
  skippedCount: number;
  elapsedSeconds: number;
  updatedAt: number;
}
