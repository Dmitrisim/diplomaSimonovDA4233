import { useMemo, useState } from 'react';
import { MODE_DEFINITIONS } from '../constants';
import type { ProcessingMode } from '../types';

type ExampleCardData = {
  id: string;
  mode: ProcessingMode;
  title: string;
  description: string;
  meta: string;
  tone: 'blue' | 'violet' | 'cyan' | 'orange';
  filter: 'enhance' | 'restore' | 'colorize' | 'noise' | 'sharpness' | 'resolution' | 'web';
  visual: 'restore' | 'colorize' | 'noise' | 'portrait' | 'scan' | 'web' | 'enhance';
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
    id: 'auto-enhance',
    mode: 'auto-enhance',
    title: 'Быстрое улучшение снимка',
    description:
      'Подтягивает контраст, яркость и локальную выразительность обычного фото через серверные алгоритмы OpenCV/Pillow.',
    meta: 'OpenCV/Pillow',
    tone: 'blue',
    filter: 'enhance',
    visual: 'enhance',
  },
  {
    id: 'super-resolution',
    mode: 'super-resolution',
    title: 'AI-увеличение разрешения',
    description:
      'Увеличивает небольшой фрагмент изображения в 2 раза через AI super-resolution на модели EDSR_x2.pb.',
    meta: 'AI x2',
    tone: 'violet',
    filter: 'resolution',
    visual: 'scan',
  },
  {
    id: 'denoise-photo',
    mode: 'denoise',
    title: 'Снижение цифрового шума',
    description:
      'Уменьшает зернистость на зашумленном фото алгоритмическим denoise без генеративного восстановления деталей.',
    meta: 'шум',
    tone: 'orange',
    filter: 'noise',
    visual: 'noise',
  },
  {
    id: 'restore-photo',
    mode: 'restore-photo',
    title: 'Мягкая обработка старого снимка',
    description:
      'Корректирует тон, контраст и мелкие дефекты архивного изображения средствами OpenCV/Pillow.',
    meta: 'архив',
    tone: 'blue',
    filter: 'restore',
    visual: 'restore',
  },
  {
    id: 'colorize-photo',
    mode: 'colorize-photo',
    title: 'AI-колоризация ч/б фото',
    description:
      'Добавляет реалистичный цвет к чёрно-белым снимкам через отдельную AI-модель, а без неё использует fallback-тонирование.',
    meta: 'ч/б фото',
    tone: 'cyan',
    filter: 'colorize',
    visual: 'colorize',
  },
  {
    id: 'web-export',
    mode: 'web-export',
    title: 'Подготовить для сайта',
    description:
      'Оптимизирует размер файла и качество изображения перед публикацией.',
    meta: 'web',
    tone: 'blue',
    filter: 'web',
    visual: 'web',
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
    'all' | 'enhance' | 'restore' | 'colorize' | 'noise' | 'sharpness' | 'resolution' | 'web'
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
      { id: 'enhance' as const, label: 'Улучшение' },
      { id: 'resolution' as const, label: 'Разрешение' },
      { id: 'noise' as const, label: 'Шум' },
      { id: 'restore' as const, label: 'Архив' },
      { id: 'colorize' as const, label: 'Колоризация' },
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
              <div className='exampleCardMetaRow'>
                <div className='exampleModeTag'>
                  {
                    MODE_DEFINITIONS.find((mode) => mode.id === item.mode)
                      ?.shortTitle
                  }
                </div>
                <div className='exampleTinyMeta'>{item.meta}</div>
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
