import type { HistoryItem } from '../types';
import { formatBytes, formatDate, modeLabel } from '../utils';

type HistorySectionProps = {
  items: HistoryItem[];
  onOpen: (item: HistoryItem) => void;
  onDownload: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onGoToProcessing?: () => void;
};

export function HistorySection({
  items,
  onOpen,
  onDownload,
  onDelete,
  onClear,
  onGoToProcessing,
}: HistorySectionProps) {
  return (
    <section id='history' className='surfaceCard stackGap'>
      <div className='sectionHeading'>
        <div>
          <div className='sectionLabel'>History</div>
          <h2 className='sectionTitle'>История операций</h2>
        </div>
        <button
          type='button'
          className='ghostButton'
          onClick={onClear}
          disabled={items.length === 0}
        >
          Очистить историю
        </button>
      </div>

      {items.length === 0 ? (
        <div className='emptyPreviewState'>
          <div className='emptyPreviewIcon'>LOG</div>
          <strong>История пока пуста</strong>
          <span>
            После первой обработки здесь появятся последние результаты. История
            сохраняется локально в браузере.
          </span>
          {onGoToProcessing ? (
            <button
              type='button'
              className='primaryButton emptyPreviewButton'
              onClick={onGoToProcessing}
            >
              Перейти к обработке
            </button>
          ) : null}
        </div>
      ) : (
        <div className='historyList'>
          {items.map((item) => (
            <article key={item.id} className='historyCard'>
              {item.resultPreview || item.sourcePreview || item.downloadUrl ? (
                <img
                  className='historyImage'
                  src={item.resultPreview || item.sourcePreview || item.downloadUrl}
                  alt={item.fileName}
                />
              ) : (
                <div className='historyImage historyImagePlaceholder'>
                  Нет превью
                </div>
              )}
              <div className='historyBody'>
                <div className='historyTitleRow'>
                  <h3>{item.fileName}</h3>
                  <span className='tinyBadge'>
                    {item.isDemo ? 'demo' : 'api'}
                  </span>
                </div>
                <p>{modeLabel(item.mode)}</p>
                <div className='historyMeta'>
                  <span>{formatDate(item.createdAt)}</span>
                  <span>{item.status}</span>
                  <span>{item.timingMs} мс</span>
                  <span>{formatBytes(item.resultMeta.size)}</span>
                </div>
              </div>
              <div className='historyActions'>
                <button
                  type='button'
                  className='ghostButton'
                  onClick={() => onOpen(item)}
                >
                  Открыть
                </button>
                <button
                  type='button'
                  className='secondaryButton'
                  onClick={() => onDownload(item)}
                >
                  Скачать
                </button>
                <button
                  type='button'
                  className='dangerButton'
                  onClick={() => onDelete(item.id)}
                >
                  Удалить из истории
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
