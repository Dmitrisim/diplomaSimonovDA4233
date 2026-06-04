import { AI_UPSCALE_LIMIT_PIXELS, MODE_BY_ID } from './constants';
import type {
  FileMeta,
  HistoryItem,
  ImageAnalysis,
  ProcessingMode,
  ProgressState,
  ResultFormat,
  ResultMeta,
} from './types';

export function formatBytes(value: number | null): string {
  if (value === null) return '—';
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} КБ`;
  return `${(value / (1024 * 1024)).toFixed(2)} МБ`;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function modeLabel(mode: ProcessingMode): string {
  return MODE_BY_ID[mode].title;
}

export async function getImageMeta(file: File): Promise<FileMeta> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const dimensions = await getImageDimensions(objectUrl);
    return {
      name: file.name,
      type: file.type || 'unknown',
      size: file.size,
      width: dimensions.width,
      height: dimensions.height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function getImageDimensions(
  src: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () =>
      reject(new Error('Не удалось получить размеры изображения'));
    img.src = src;
  });
}

export function fileTypeLabel(type: string): string {
  if (type === 'image/jpeg') return 'JPG';
  if (type === 'image/png') return 'PNG';
  if (type === 'image/webp') return 'WebP';
  return type || 'unknown';
}

export function progressStages(): ProgressState[] {
  return [
    { value: 0, label: '0% · загрузка' },
    { value: 25, label: '25% · проверка файла' },
    { value: 50, label: '50% · предобработка' },
    { value: 75, label: '75% · AI-обработка' },
    { value: 100, label: '100% · результат готов' },
  ];
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyzeImageFile(
  file: File,
  meta: FileMeta,
): Promise<ImageAnalysis> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const maxSide = 180;
    const ratio = Math.min(1, maxSide / image.naturalWidth, maxSide / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas недоступен');
    ctx.drawImage(image, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    const luma = new Float32Array(width * height);
    let brightness = 0;
    let colorfulness = 0;

    for (let i = 0, p = 0; i < pixels.length; i += 4, p += 1) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const y = 0.299 * r + 0.587 * g + 0.114 * b;
      luma[p] = y;
      brightness += y;
      colorfulness += Math.max(r, g, b) - Math.min(r, g, b);
    }

    const count = Math.max(1, width * height);
    brightness /= count;
    colorfulness /= count;

    let variance = 0;
    let sharpness = 0;
    let noise = 0;
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const idx = y * width + x;
        const value = luma[idx];
        variance += (value - brightness) ** 2;
        const gx = luma[idx + 1] - luma[idx - 1];
        const gy = luma[idx + width] - luma[idx - width];
        sharpness += Math.sqrt(gx * gx + gy * gy);
        const localMean =
          (luma[idx - 1] +
            luma[idx + 1] +
            luma[idx - width] +
            luma[idx + width]) /
          4;
        noise += Math.abs(value - localMean);
      }
    }

    const innerCount = Math.max(1, (width - 2) * (height - 2));
    const contrast = Math.sqrt(variance / innerCount);
    sharpness /= innerCount;
    noise /= innerCount;

    const pixelCount = meta.width * meta.height;
    const lowResolution = pixelCount <= AI_UPSCALE_LIMIT_PIXELS || Math.min(meta.width, meta.height) <= 512;
    const exceedsAiUpscaleLimit = pixelCount > AI_UPSCALE_LIMIT_PIXELS;
    const likelyGrayscale = colorfulness < 9;
    const reasons: string[] = [];
    let recommendedMode: ProcessingMode = 'auto-enhance';

    if (likelyGrayscale) {
      recommendedMode = 'colorize-photo';
      reasons.push('изображение похоже на чёрно-белое');
    } else if (lowResolution) {
      recommendedMode = 'super-resolution';
      reasons.push('низкое разрешение');
    } else if (brightness < 82 || contrast < 38) {
      recommendedMode = 'auto-enhance';
      reasons.push('низкая яркость или контраст');
    } else if (sharpness < 15) {
      recommendedMode = 'sharpen';
      reasons.push('мягкая детализация');
    } else if (noise > 18) {
      recommendedMode = 'denoise';
      reasons.push('заметные мелкие перепады яркости');
    } else {
      reasons.push('подходит базовое улучшение');
    }

    if (exceedsAiUpscaleLimit && recommendedMode === 'super-resolution') {
      reasons.push('AI-upscale для этого размера уйдёт в fallback');
    }

    return {
      brightness,
      contrast,
      sharpness,
      noise,
      colorfulness,
      lowResolution,
      exceedsAiUpscaleLimit,
      likelyGrayscale,
      recommendedMode,
      reasons,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Не удалось преобразовать файл'));
    reader.readAsDataURL(blob);
  });
}

export async function fileToDataUrl(file: File): Promise<string> {
  return blobToDataUrl(file);
}

export async function createImageThumbnailDataUrl(
  source: Blob | string,
  maxWidth = 360,
  maxHeight = 240,
): Promise<string> {
  let objectUrl: string | null = null;
  const src =
    typeof source === 'string'
      ? source
      : (objectUrl = URL.createObjectURL(source));

  try {
    const image = await loadImage(src);
    const ratio = Math.min(
      1,
      maxWidth / image.naturalWidth,
      maxHeight / image.naturalHeight,
    );
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas недоступен');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.72);
  } finally {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export async function urlToBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Не удалось получить файл результата');
  }
  return response.blob();
}

export async function convertImageBlob(
  blob: Blob,
  format: ResultFormat,
  quality: number,
): Promise<Blob> {
  if (format === 'png' && blob.type === 'image/png') {
    return blob;
  }

  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas недоступен');
    ctx.drawImage(img, 0, 0);
    const mime =
      format === 'jpeg'
        ? 'image/jpeg'
        : format === 'webp'
          ? 'image/webp'
          : 'image/png';
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Не удалось сконвертировать изображение'));
        },
        mime,
        quality / 100,
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function createHistoryItem(input: {
  id: string;
  fileName: string;
  downloadUrl: string;
  mode: ProcessingMode;
  status: string;
  timingMs: number;
  usedAi: boolean;
  modelName: string | null;
  sourcePreview: string;
  resultPreview: string;
  sourceMeta: FileMeta;
  resultMeta: ResultMeta;
  isDemo: boolean;
}): HistoryItem {
  return {
    ...input,
    createdAt: new Date().toISOString(),
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Не удалось загрузить изображение'));
    image.src = src;
  });
}
