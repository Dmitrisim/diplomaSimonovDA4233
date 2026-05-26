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
    title: 'Быстро улучшить снимок',
    shortTitle: 'Быстро улучшить',
    iconLabel: 'QK',
    description:
      'Быстро подтягивает яркость, цвет и общую выразительность без ручной ретуши.',
    bestFor: 'Подходит для обычных фото, сканов и изображений, которым не хватает живости.',
    limitations: 'Не заменяет точечную реставрацию сильно поврежденных снимков.',
    backendMode: 'enhance',
  },
  {
    id: 'super-resolution',
    title: 'Увеличить разрешение',
    shortTitle: 'Разрешение',
    iconLabel: 'UP',
    description:
      'Помогает сделать маленькое изображение крупнее и чище перед печатью или детальным просмотром.',
    bestFor: 'Подходит для маленьких изображений, обрезков и архивных снимков низкого качества.',
    limitations: 'Сильное увеличение может добавить артефакты на сложных текстурах.',
    backendMode: 'upscale',
  },
  {
    id: 'denoise',
    title: 'Убрать шум',
    shortTitle: 'Убрать шум',
    iconLabel: 'NS',
    description: 'Снижает зернистость, цифровой шум и мелкие артефакты на шумных снимках.',
    bestFor: 'Подходит для фото при слабом освещении, старых цифровых кадров и темных сцен.',
    limitations: 'Слишком сильное шумоподавление может сделать детали мягче.',
  },
  {
    id: 'sharpen',
    title: 'Повысить чёткость',
    shortTitle: 'Чёткость',
    iconLabel: 'FX',
    description: 'Подчеркивает контуры, делает сканы, предметные фото и портреты более четкими.',
    bestFor: 'Подходит для слегка размытых снимков, документов и изображений для публикации.',
    limitations: 'Не исправляет сильный дефокус и может подчеркнуть шум.',
  },
  {
    id: 'restore-photo',
    title: 'Восстановить старое фото',
    shortTitle: 'Старое фото',
    iconLabel: 'RS',
    description:
      'Освежает старые снимки: помогает с пятнами, выцветанием, мягкостью и потерей контраста.',
    bestFor: 'Подходит для архивных семейных фото, сканов и старых бумажных снимков.',
    limitations: 'Полное восстановление сильно поврежденного изображения не гарантируется.',
  },
  {
    id: 'web-export',
    title: 'Подготовить для сайта',
    shortTitle: 'Для сайта',
    iconLabel: 'WB',
    description:
      'Готовит изображение к публикации: уменьшает вес, сохраняет читаемость и нужный формат.',
    bestFor: 'Подходит для фото товаров, баннеров, статей и любых изображений для веба.',
    limitations: 'Сильное сжатие может снизить детализацию мелких элементов.',
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
