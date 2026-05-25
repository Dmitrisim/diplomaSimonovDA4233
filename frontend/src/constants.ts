import type { ModeDefinition, ProcessingParameters, ProcessingMode } from './types';

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const DEFAULT_PARAMETERS: ProcessingParameters = {
  intensity: 65,
  keepAspectRatio: true,
  autoResizeLarge: true,
  preferAi: true,
  resultFormat: 'png',
  quality: 90,
  upscaleFactor: 'x2',
  denoiseLevel: 'medium',
  maxWidth: 1920,
  maxHeight: 1080,
  optimizeFileSize: true,
};

export const MODE_DEFINITIONS: ModeDefinition[] = [
  {
    id: 'auto-enhance',
    title: 'Автоматическое улучшение',
    shortTitle: 'Улучшение',
    description:
      'Автоматическая коррекция яркости, контрастности, резкости и общего визуального качества.',
    bestFor: 'Подходит для большинства пользовательских фотографий и сканов.',
    limitations: 'Не гарантирует идеальный результат для сильно поврежденных снимков.',
    backendMode: 'enhance',
  },
  {
    id: 'super-resolution',
    title: 'Повышение разрешения',
    shortTitle: 'Super-resolution',
    description:
      'Увеличение разрешения изображения с использованием AI-подхода и super-resolution.',
    bestFor: 'Подходит для маленьких изображений и кадров, требующих увеличения.',
    limitations: 'При сильном увеличении возможны артефакты и потеря естественности.',
    backendMode: 'upscale',
  },
  {
    id: 'denoise',
    title: 'Удаление шума',
    shortTitle: 'Шумоподавление',
    description: 'Подавление цифрового шума, зернистости и мелких артефактов.',
    bestFor: 'Подходит для снимков при слабом освещении и старых цифровых фото.',
    limitations: 'Сильное шумоподавление может сгладить мелкие детали.',
  },
  {
    id: 'sharpen',
    title: 'Повышение резкости',
    shortTitle: 'Резкость',
    description: 'Усиление деталей, контуров и визуальной четкости изображения.',
    bestFor: 'Подходит для слегка размытых снимков и web-изображений.',
    limitations: 'Не исправляет серьезный дефокус и может усилить шум.',
  },
  {
    id: 'restore-photo',
    title: 'Восстановление старого фото',
    shortTitle: 'Реставрация',
    description:
      'Предварительное улучшение старых, размытых или частично поврежденных фотографий.',
    bestFor: 'Подходит для архивных снимков, семейных фото и сканов.',
    limitations: 'Полное восстановление сильно поврежденных фото не гарантируется.',
  },
  {
    id: 'web-export',
    title: 'Подготовка для веб-публикации',
    shortTitle: 'Web',
    description:
      'Оптимизация изображения для размещения на сайте: формат, размер и итоговое качество.',
    bestFor: 'Подходит для изображений, которые планируется публиковать в интернете.',
    limitations: 'Сильная оптимизация может уменьшить детализацию.',
  },
];

export const MODE_BY_ID: Record<ProcessingMode, ModeDefinition> = MODE_DEFINITIONS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<ProcessingMode, ModeDefinition>,
);

export const STORAGE_HISTORY_KEY = 'ai-image-processing-history-v1';
