import { useMemo, useState } from 'react';
import { MODE_DEFINITIONS } from '../constants';
import type { ProcessingMode } from '../types';

type ExampleCardData = {
  id: string;
  mode: ProcessingMode;
  title: string;
  description: string;
  tone: 'blue' | 'violet' | 'cyan' | 'orange';
  filter: 'restore' | 'noise' | 'sharpness' | 'resolution' | 'web';
  visual:
    | 'restore'
    | 'noise'
    | 'portrait'
    | 'scan'
    | 'web'
    | 'enhance';
};

type ExamplesSectionProps = {
  title?: string;
  description?: string;
  compact?: boolean;
  showFilter?: boolean;
  onTryMode: (mode: ProcessingMode) => void;
};

const EXAMPLE_CARDS: ExampleCardData[] = [
  {
    id: 'restore-photo',
    mode: 'restore-photo',
    title: 'Восстановление старого фото',
    description: 'Поднимает контраст, ослабляет следы времени и делает старые снимки чище.',
    tone: 'orange',
    filter: 'restore',
    visual: 'restore',
  },
  {
    id: 'sharpen',
    mode: 'sharpen',
    title: 'Повысить чёткость',
    description: 'Возвращает контуры и детали на мягких портретах, сканах и предметных фото.',
    tone: 'blue',
    filter: 'sharpness',
    visual: 'portrait',
  },
  {
    id: 'denoise',
    mode: 'denoise',
    title: 'Убрать шум',
    description: 'Снижает зернистость и цифровой шум на вечерних и архивных снимках.',
    tone: 'cyan',
    filter: 'noise',
    visual: 'noise',
  },
  {
    id: 'super-resolution',
    mode: 'super-resolution',
    title: 'Увеличить разрешение',
    description: 'Делает маленькие изображения крупнее и пригоднее для печати или показа.',
    tone: 'violet',
    filter: 'resolution',
    visual: 'scan',
  },
  {
    id: 'web-export',
    mode: 'web-export',
    title: 'Подготовить для сайта',
    description: 'Оптимизирует размер файла и качество изображения перед публикацией.',
    tone: 'blue',
    filter: 'web',
    visual: 'web',
  },
  {
    id: 'auto-enhance',
    mode: 'auto-enhance',
    title: 'Быстро улучшить снимок',
    description: 'Быстрый сценарий для общей коррекции света, цвета и выразительности фото.',
    tone: 'violet',
    filter: 'sharpness',
    visual: 'enhance',
  },
];

export function ExamplesSection({
  title = 'Примеры обработки',
  description = 'Посмотрите, как разные режимы улучшают изображение до запуска собственной обработки.',
  compact = false,
  showFilter = false,
  onTryMode,
}: ExamplesSectionProps) {
  const [filter, setFilter] = useState<
    'all' | 'restore' | 'noise' | 'sharpness' | 'resolution' | 'web'
  >('all');

  const filteredItems = useMemo(() => {
    if (filter === 'all') {
      return EXAMPLE_CARDS;
    }
    return EXAMPLE_CARDS.filter((item) => item.filter === filter);
  }, [filter]);

  const filterItems = useMemo(
    () => [
      { id: 'all' as const, label: 'Все' },
      { id: 'restore' as const, label: 'Старые фото' },
      { id: 'noise' as const, label: 'Шум' },
      { id: 'sharpness' as const, label: 'Резкость' },
      { id: 'resolution' as const, label: 'Разрешение' },
      { id: 'web' as const, label: 'Web' },
    ],
    [],
  );

  return (
    <section className='surfaceCard stackGap examplesSection'>
      <div className='sectionHeading examplesSectionHeading'>
        <div>
          <h2 className='sectionTitle'>{title}</h2>
          <p className='sectionMuted'>{description}</p>
        </div>
        {showFilter ? (
          <div className='examplesFilterBar'>
            {filterItems.map((item) => (
              <button
                key={item.id}
                type='button'
                className={`examplesFilterChip ${filter === item.id ? 'isActive' : ''}`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={`examplesGrid ${compact ? 'isCompact' : ''}`}>
        {filteredItems.map((item) => (
          <article key={item.id} className={`exampleCard tone-${item.tone}`}>
            <div className='exampleCardPreview'>
              <div className='examplePreviewPane isBefore'>
                <span className='examplePreviewBadge'>До</span>
                <div
                  className={`examplePreviewArt preview-${item.visual} before`}
                />
              </div>
              <div className='examplePreviewDivider' aria-hidden='true' />
              <div className='examplePreviewPane isAfter'>
                <span className='examplePreviewBadge isAfter'>После</span>
                <div
                  className={`examplePreviewArt preview-${item.visual} after`}
                />
              </div>
            </div>

            <div className='exampleCardBody'>
              <div className='exampleModeTag'>
                {MODE_DEFINITIONS.find((mode) => mode.id === item.mode)?.shortTitle}
              </div>
              <h3>{item.title}</h3>
              <p className='sectionText'>{item.description}</p>
              <button
                type='button'
                className='secondaryButton exampleCardButton'
                onClick={() => onTryMode(item.mode)}
              >
                Попробовать режим
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
