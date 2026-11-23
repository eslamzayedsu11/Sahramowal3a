import { env } from '../config/env';

async function uploadToImgBB(file: File): Promise<string> {
  const apiKey = env.uploads.imgbbApiKey;
  if (!apiKey) {
    throw new Error('مفتاح ImgBB غير مضبوط (VITE_IMGBB_API_KEY).');
  }

  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`ImgBB HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    success?: boolean;
    data?: { url?: string };
    error?: { message?: string };
  };

  if (!data?.success || !data?.data?.url) {
    throw new Error(data?.error?.message || 'ImgBB returned no URL');
  }

  return data.data.url;
}

async function uploadToFreeImageHost(file: File): Promise<string> {
  const apiKey = env.uploads.freeimageApiKey;
  if (!apiKey) {
    throw new Error('مفتاح Freeimage.host غير مضبوط (VITE_FREEIMAGE_API_KEY).');
  }

  const formData = new FormData();
  formData.append('key', apiKey);
  formData.append('source', file);
  formData.append('format', 'json');

  const response = await fetch('https://freeimage.host/api/1/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Freeimage.host HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    status_code?: number;
    image?: { url?: string };
    error?: { message?: string };
  };

  if (!data?.image?.url) {
    throw new Error(data?.error?.message || 'Freeimage.host returned no URL');
  }

  return data.image.url;
}

/**
 * Uploads an image using ImgBB as primary and Freeimage.host as fallback.
 */
export async function uploadImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('يرجى اختيار ملف صورة صالح (JPG, PNG, WEBP).');
  }

  const maxSizeBytes = 15 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error('حجم الصورة كبير جداً. الحد الأقصى المسموح به هو 15 ميجابايت.');
  }

  try {
    return await uploadToImgBB(file);
  } catch (primaryErr) {
    console.warn('Primary image upload (ImgBB) failed, trying Freeimage.host...', primaryErr);
    try {
      return await uploadToFreeImageHost(file);
    } catch (fallbackErr) {
      console.error('Both ImgBB and Freeimage.host uploads failed:', fallbackErr);
      throw new Error(
        'تعذر رفع الصورة عبر الخادمين. تأكد من اتصالك بالإنترنت أو الصق رابط الصورة مباشرة.'
      );
    }
  }
}

/**
 * Separate, easily replaceable audio upload function.
 *
 * TODO: Replace this placeholder implementation with your audio-hosting API.
 * Example implementation:
 *
 *   const formData = new FormData();
 *   formData.append('file', file);
 *   const res = await fetch('https://YOUR_AUDIO_HOST_API/upload', {
 *     method: 'POST',
 *     headers: { Authorization: 'Bearer YOUR_API_KEY' },
 *     body: formData,
 *   });
 *   if (!res.ok) throw new Error('Audio upload failed');
 *   const data = await res.json();
 *   return data.url;
 */
export async function uploadAudio(file: File): Promise<string> {
  if (!file.type.startsWith('audio/')) {
    throw new Error('يرجى اختيار ملف صوتي صالح (MP3, WAV, M4A, OGG).');
  }

  // TODO: Plug in your preferred audio-hosting API here and return the hosted direct URL.
  throw new Error(
    'خدمة رفع الصوت التلقائي غير مربوطة بعد. يمكنك لصق رابط الصوت المباشر في الحقل أدناه.'
  );
}
