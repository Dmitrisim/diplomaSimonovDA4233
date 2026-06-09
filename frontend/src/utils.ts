import { MODE_BY_ID } from './constants';
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
  maxSize = 360,
): Promise<string> {
  const objectUrl =
    typeof source === 'string' ? source : URL.createObjectURL(source);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(
      maxSize / image.naturalWidth,
      maxSize / image.naturalHeight,
      1,
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.78);
  } finally {
    if (typeof source !== 'string') {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export async function analyzeImageFile(
  file: File,
  meta: FileMeta,
): Promise<ImageAnalysis> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const sampleSize = 96;
    const canvas = document.createElement('canvas');
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(image, 0, 0, sampleSize, sampleSize);
    const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;

    let brightnessSum = 0;
    let saturationSum = 0;
    let minLuma = 255;
    let maxLuma = 0;
    let edgeSum = 0;
    let noiseSum = 0;
    let previousLuma = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const maxChannel = Math.max(r, g, b);
      const minChannel = Math.min(r, g, b);
      brightnessSum += luma;
      saturationSum +=
        maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;
      minLuma = Math.min(minLuma, luma);
      maxLuma = Math.max(maxLuma, luma);
      if (i > 0) {
        const diff = Math.abs(luma - previousLuma);
        edgeSum += diff;
        if (diff > 18) noiseSum += diff;
      }
      previousLuma = luma;
    }

    const pixels = data.length / 4;
    const brightness = brightnessSum / pixels;
    const contrast = maxLuma - minLuma;
    const sharpness = edgeSum / Math.max(1, pixels - 1);
    const noise = noiseSum / Math.max(1, pixels - 1);
    const colorfulness = (saturationSum / pixels) * 100;
    const lowResolution = meta.width < 700 || meta.height < 700;
    const exceedsAiUpscaleLimit = meta.width * meta.height > 512 * 512;
    const likelyGrayscale = colorfulness < 8;

    let recommendedMode: ProcessingMode = 'auto-enhance';
    const reasons: string[] = [];

    if (likelyGrayscale && colorfulness < 5) {
      recommendedMode = 'colorize-photo';
      reasons.push('image looks grayscale');
    } else if (lowResolution && !exceedsAiUpscaleLimit) {
      recommendedMode = 'super-resolution';
      reasons.push('low resolution fits AI x2');
    } else if (noise > 12) {
      recommendedMode = 'denoise';
      reasons.push('visible digital noise');
    } else if (sharpness < 9) {
      recommendedMode = 'sharpen';
      reasons.push('image looks soft');
    } else if (brightness < 85 || contrast < 90) {
      recommendedMode = 'auto-enhance';
      reasons.push('tone and contrast can be improved');
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
  sourceUrl?: string;
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
