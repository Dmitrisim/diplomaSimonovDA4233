import type { ModeDefinition, ProcessingParameters, ProcessingMode } from './types';

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const AI_UPSCALE_LIMIT_PIXELS = 1024 * 1024;
export const AI_UPSCALE_LIMIT_LABEL = '1024 × 1024';

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
      'Увеличивает маленькое или пиксельное изображение в 2 раза через AI super-resolution.',
    bestFor: 'Подходит для маленьких фото, обрезков, аватарок и изображений с низким разрешением.',
    limitations: 'Не восстанавливает полностью потерянные детали и может добавить артефакты на сложных текстурах.',
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
    backendMode: 'denoise',
  },
  {
    id: 'sharpen',
    title: 'Повысить чёткость',
    shortTitle: 'Чёткость',
    iconLabel: 'FX',
    description: 'Подчеркивает контуры, делает сканы, предметные фото и портреты более четкими.',
    bestFor: 'Подходит для слегка размытых снимков, документов и изображений для публикации.',
    limitations: 'Не исправляет сильный дефокус и может подчеркнуть шум.',
    backendMode: 'enhance',
  },
  {
    id: 'restore-photo',
    title: 'Восстановить старый снимок',
    shortTitle: 'Старый снимок',
    iconLabel: 'RS',
    description:
      'Мягко вытягивает тон, контраст и шум на выцветших или тусклых сканах.',
    bestFor: 'Подходит для архивных бумажных снимков, выцветших сканов и фото с серым налетом.',
    limitations: 'Не исправляет пикселизацию и не увеличивает разрешение. Для маленьких фото используйте режим "Разрешение".',
    backendMode: 'restore',
  },
  {
    id: 'colorize-photo',
    title: 'Раскрасить ч/б фото',
    shortTitle: 'Колоризация',
    iconLabel: 'CL',
    description:
      'Добавляет цвет к чёрно-белому изображению через AI-колоризацию при доступной модели.',
    bestFor: 'Подходит для чёрно-белых архивных снимков, портретов и сканов без цвета.',
    limitations: 'Цвета прогнозируются моделью и могут отличаться от реальных. Если AI-модель не подключена, используется fallback-тонирование.',
    backendMode: 'colorize',
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
    backendMode: 'web',
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
