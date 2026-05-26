import { useMemo, useState } from 'react';
import { MODE_DEFINITIONS } from '../constants';
import type { ProcessingMode } from '../types';

type ExampleCardData = {
  id: string;
  mode: ProcessingMode;
  title: string;
  description: string;
  tone: 'blue' | 'violet' | 'cyan' | 'orange';
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
    description: 'Поднимает контраст, очищает дефекты и делает архивные снимки выразительнее.',
    tone: 'orange',
  },
  {
    id: 'sharpen',
    mode: 'sharpen',
    title: 'Повышение резкости',
    description: 'Подчеркивает контуры и детали для портретов, сканов и предметных фото.',
    tone: 'blue',
  },
  {
    id: 'denoise',
    mode: 'denoise',
    title: 'Удаление шума',
    description: 'Снижает зернистость и цифровой шум на фото при слабом освещении.',
    tone: 'cyan',
  },
  {
    id: 'super-resolution',
    mode: 'super-resolution',
    title: 'Повышение разрешения',
    description: 'Увеличивает изображение и делает его пригодным для детального просмотра.',
    tone: 'violet',
  },
  {
    id: 'web-export',
    mode: 'web-export',
    title: 'Подготовка для веба',
    description: 'Оптимизирует формат, размер и качество перед публикацией на сайте.',
    tone: 'blue',
  },
  {
    id: 'auto-enhance',
    mode: 'auto-enhance',
    title: 'Автоматическое улучшение',
    description: 'Быстрый режим для общей коррекции яркости, цвета и четкости.',
    tone: 'violet',
  },
];

export function ExamplesSection({
  title = 'Примеры обработки',
  description = 'Посмотрите, как разные режимы улучшают изображение до запуска собственной обработки.',
  compact = false,
  showFilter = false,
  onTryMode,
}: ExamplesSectionProps) {
  const [filter, setFilter] = useState<ProcessingMode | 'all'>('all');

  const filteredItems = useMemo(() => {
    if (filter === 'all') {
      return EXAMPLE_CARDS;
    }
    return EXAMPLE_CARDS.filter((item) => item.mode === filter);
  }, [filter]);

  const filterItems = useMemo(
    () => [
      { id: 'all' as const, label: 'Все режимы' },
      ...MODE_DEFINITIONS.map((item) => ({
        id: item.id,
        label: item.shortTitle,
      })),
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
                <div className={`examplePreviewArt art-${item.tone} before`} />
              </div>
              <div className='examplePreviewDivider' aria-hidden='true' />
              <div className='examplePreviewPane isAfter'>
                <span className='examplePreviewBadge isAfter'>После</span>
                <div className={`examplePreviewArt art-${item.tone} after`} />
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
                className='secondaryButton'
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
