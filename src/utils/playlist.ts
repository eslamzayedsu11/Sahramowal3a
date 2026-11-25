import type { Challenge, ChallengeSong, SavedSong } from '../types';

export function shuffleArray<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getChallengeManualSongs(
  challenge: Pick<Challenge, 'songs' | 'audioUrl' | 'songTitle'>
): ChallengeSong[] {
  if (Array.isArray(challenge.songs) && challenge.songs.length > 0) {
    return challenge.songs.filter((s) => s && s.url && /^https?:\/\//i.test(s.url));
  }
  if (challenge.audioUrl && /^https?:\/\//i.test(challenge.audioUrl)) {
    return [{ url: challenge.audioUrl, title: challenge.songTitle ?? '' }];
  }
  return [];
}

/**
 * Resolves the full playback queue for a challenge:
 * 1. Manual tracks added directly in the challenge (played in sequential order).
 * 2. Songs from the selected saved category (played in random shuffled order).
 */
export function resolveChallengePlaylist(
  challenge: Pick<Challenge, 'songs' | 'audioUrl' | 'songTitle' | 'audioCategoryId'>,
  savedSongs: readonly SavedSong[]
): ChallengeSong[] {
  const manual = getChallengeManualSongs(challenge);

  const catId = challenge.audioCategoryId?.trim();
  if (!catId) {
    return manual;
  }

  const categoryTracks = savedSongs
    .filter((s) => s.categoryId === catId && /^https?:\/\//i.test(s.url))
    .map((s) => ({ url: s.url, title: s.title }));

  if (categoryTracks.length === 0) {
    return manual;
  }

  const shuffledCategoryTracks = shuffleArray(categoryTracks);
  return [...manual, ...shuffledCategoryTracks];
}
