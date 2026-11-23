const AUDIO_NOISE_TAIL_RE =
  /(?:\s*[-–—_[\]()]+\s*|\s+)(?:mp3|m4a|wav|ogg|aac|flac|opus|webm|hq|hd|audio|official|lyric|lyrics|original|128kbps|160kbps|192kbps|256kbps|320kbps|128k|160k|192k|256k|320k|kbps)(?:\s*[\])])*$/i;

const KNOWN_WORDS = new Set([
  'remix',
  'cover',
  'intro',
  'outro',
  'music',
  'sound',
  'audio',
  'piano',
  'night',
  'heart',
  'love',
  'dance',
  'chill',
  'beats',
]);

/**
 * Derive a clean display title from an audio URL when admin did not provide songTitle:
 * - Decodes percent-encoding
 * - Drops file extension
 * - Strips Cloudinary random suffix (e.g. _a1b2c3)
 * - Replaces underscores with spaces
 * - Removes trailing noise like MP3, 160K, 320kbps, etc.
 */
export function deriveSongTitleFromUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return 'موسيقى السهرة';

  try {
    // Strip query/hash first, take last segment
    const cleanPath = trimmed.split('#')[0].split('?')[0];
    const lastSegment = cleanPath.split('/').filter(Boolean).pop() ?? '';
    if (!lastSegment) return 'موسيقى السهرة';

    let decoded = lastSegment;
    try {
      decoded = decodeURIComponent(lastSegment);
    } catch {
      // Fallback if URL contains malformed percent sequences
      try {
        decoded = decodeURI(lastSegment);
      } catch {
        decoded = lastSegment;
      }
    }

    // Drop extension
    let name = decoded.replace(/\.(?:mp3|wav|m4a|ogg|aac|flac|opus|webm|mp4)$/i, '');
    if (name === decoded) {
      name = decoded.replace(/\.[a-z0-9]{2,5}$/i, '');
    }

    // Strip Cloudinary random suffix at end (e.g., _a1b2c3 or _x9k2m1p)
    const suffixMatch = name.match(/_([a-zA-Z0-9]{5,9})$/);
    if (suffixMatch) {
      const token = suffixMatch[1];
      const hasDigit = /\d/.test(token);
      const isRandomLen6 = token.length === 6 && !KNOWN_WORDS.has(token.toLowerCase());
      if (hasDigit || isRandomLen6) {
        name = name.slice(0, -suffixMatch[0].length);
      }
    }

    // Replace underscores and normalize whitespace
    name = name.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();

    // Iteratively remove trailing noise tokens like MP3, 160K, 320kbps, (320kbps), [MP3]
    let guard = 0;
    while (guard < 6) {
      guard += 1;
      const next = name
        .replace(AUDIO_NOISE_TAIL_RE, '')
        .replace(/[\s\-–—]+$/g, '')
        .trim();
      if (next === name) break;
      name = next;
    }

    // Clean any empty trailing brackets left behind
    name = name.replace(/\(\s*\)|\[\s*\]/g, '').trim();

    return name || 'موسيقى السهرة';
  } catch {
    return 'موسيقى السهرة';
  }
}

export function resolveSongTitle(
  songTitle?: string | null,
  audioUrl?: string | null
): string {
  const explicit = songTitle?.trim();
  if (explicit) return explicit;
  return deriveSongTitleFromUrl(audioUrl ?? '');
}
