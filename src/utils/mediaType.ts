export type MediaKind = 'image' | 'gif' | 'video';

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv']);
const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'avif',
  'svg',
  'bmp',
  'ico',
  'apng',
]);

function extractExtension(cleanPath: string): string {
  const lastSegment = cleanPath.split('/').pop() ?? '';
  const dotIdx = lastSegment.lastIndexOf('.');
  if (dotIdx <= 0 || dotIdx === lastSegment.length - 1) return '';
  return lastSegment.slice(dotIdx + 1).toLowerCase();
}

export function detectMediaKind(rawUrl?: string | null): MediaKind {
  if (!rawUrl || !rawUrl.trim()) return 'image';

  // Ignore query string & hash
  const withoutQuery = rawUrl.trim().split(/[?#]/)[0];

  // Safely decode percent-encoding
  let decoded = withoutQuery;
  try {
    decoded = decodeURIComponent(withoutQuery);
  } catch {
    decoded = withoutQuery;
  }

  const lower = decoded.toLowerCase();
  const ext = extractExtension(lower);

  if (VIDEO_EXTENSIONS.has(ext)) {
    return 'video';
  }

  // Cloudinary or similar "/video/upload/" path with a non-image extension = video
  if (lower.includes('/video/upload/') && (!ext || !IMAGE_EXTENSIONS.has(ext))) {
    return 'video';
  }

  if (ext === 'gif' || lower.includes('/f_gif/')) {
    return 'gif';
  }

  return 'image';
}

export function getMediaKindLabel(kind: MediaKind): string {
  if (kind === 'video') return 'فيديو';
  if (kind === 'gif') return 'GIF';
  return 'صورة';
}
