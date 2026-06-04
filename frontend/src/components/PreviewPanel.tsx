import type { CompareView, ProcessResult } from '../types';

type PreviewPanelProps = {
  sourceUrl: string | null;
  result: ProcessResult | null;
  compareValue: number;
  compareView: CompareView;
  isProcessing: boolean;
  onCompareValueChange: (value: number) => void;
  onCompareViewChange: (view: CompareView) => void;
  onReprocess: () => void;
  onReset: () => void;
  onDownload: (format: 'png' | 'jpeg' | 'webp') => void;
  onPickFile: () => void;
};

export function PreviewPanel(props: PreviewPanelProps) {
  const {
    sourceUrl,
    result,
    compareValue,
    compareView,
    isProcessing,
    onCompareValueChange,
    onCompareViewChange,
    onReprocess,
    onReset,
    onDownload,
    onPickFile,
  } = props;

  return (
    <section className='surfaceCard stackGap previewPanel'>
      <div className='canvasToolbar'>
        <div className='canvasToolbarGroup'>
          <div className='segmentedControl'>
            <button
              type='button'
              className={compareView === 'slider' ? 'active' : ''}
              onClick={() => onCompareViewChange('slider')}
            >
              Слайдер
            </button>
            <button
              type='button'
              className={compareView === 'split' ? 'active' : ''}
              onClick={() => onCompareViewChange('split')}
            >
              Рядом
            </button>
          </div>
          <span className='canvasZoomBadge'>Масштаб 100%</span>
        </div>

        <div className='canvasToolbarGroup'>
          <button
            type='button'
            className='secondaryButton toolbarButton'
            onClick={() => onDownload('png')}
            disabled={!result}
          >
            Скачать PNG
          </button>
          <button
            type='button'
            className='secondaryButton toolbarButton'
            onClick={() => onDownload('jpeg')}
            disabled={!result}
          >
            Скачать JPEG
          </button>
        </div>
      </div>

      <div className='canvasMetaStrip'>
        <span className={`canvasMetaChip ${sourceUrl ? 'isActive' : ''}`}>
          {sourceUrl ? 'Источник загружен' : 'Источник не выбран'}
        </span>
        <span className={`canvasMetaChip ${result ? 'isActive' : ''}`}>
          {result ? (result.isDemo ? 'Demo-результат' : 'Результат готов') : 'Нет результата'}
        </span>
        <span className='canvasMetaChip'>
          {compareView === 'slider' ? 'Режим сравнения: слайдер' : 'Режим сравнения: рядом'}
        </span>
      </div>

      {!sourceUrl && !result ? (
        <div className='emptyPreviewState'>
          <div className='emptyPreviewIcon'>IMG</div>
          <strong>Загрузите изображение, чтобы начать обработку</strong>
          <span>
            После обработки здесь появится сравнение исходного и улучшенного
            варианта.
          </span>
          <button
            type='button'
            className='primaryButton emptyPreviewButton'
            onClick={onPickFile}
          >
            Выбрать файл
          </button>
        </div>
      ) : compareView === 'slider' ? (
        <div className='compareCard'>
          <div className='canvasStageFrame'>
            <div className='canvasStageHeader'>
              <span>Холст сравнения</span>
              <span>{result?.isDemo ? 'demo output' : 'processing output'}</span>
            </div>
            <div className='compareStage'>
              {result ? (
                <img
                  className='compareImg'
                  src={result.resultUrl}
                  alt='Результат обработки'
                />
              ) : sourceUrl ? (
                <img
                  className='compareImg'
                  src={sourceUrl}
                  alt='Исходное изображение'
                />
              ) : null}
              {sourceUrl && result ? (
                <div
                  className='compareTop'
                  style={{
                    clipPath: `inset(0 ${100 - compareValue}% 0 0)`,
                  }}
                >
                  <img
                    className='compareImg'
                    src={sourceUrl}
                    alt='Исходное изображение'
                  />
                </div>
              ) : null}
              {result ? (
                <div
                  className='compareHandle'
                  style={{ left: `${compareValue}%` }}
                />
              ) : null}
              {isProcessing ? (
                <div className='loadingOverlay'>
                  <div className='loadingCard'>
                    <div className='spinner' />
                    <span>Идет обработка изображения...</span>
                  </div>
                </div>
              ) : null}
            </div>
            {sourceUrl ? (
              <div className='canvasStageLegend'>
                <span>До</span>
                <span>После</span>
              </div>
            ) : null}
          </div>
          <div className='compareFooter'>
            <div className='compareLabels'>
              <span>Исходное изображение</span>
              <span>
                {result?.isDemo ? 'Демо-результат' : 'Результат обработки'}
              </span>
            </div>
            <input
              className='range'
              type='range'
              min={0}
              max={100}
              value={compareValue}
              onChange={(e) => onCompareValueChange(Number(e.target.value))}
              disabled={!result}
            />
            <div className='canvasActionRow'>
              <button
                type='button'
                className='ghostButton toolbarButton'
                onClick={onReprocess}
                disabled={!sourceUrl}
              >
                Обработать заново
              </button>
              <button
                type='button'
                className='ghostButton toolbarButton'
                onClick={onReset}
                disabled={!sourceUrl && !result}
              >
                Сбросить
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className='splitPreview'>
          <ImageCard
            title='Исходное изображение'
            url={sourceUrl}
            variant='split'
          />
          <ImageCard
            title={result?.isDemo ? 'Результат (демо)' : 'Результат обработки'}
            url={result?.resultUrl ?? null}
            variant='split'
          />
        </div>
      )}
    </section>
  );
}

function ImageCard({
  title,
  url,
  variant = 'default',
}: {
  title: string;
  url: string | null;
  variant?: 'default' | 'split';
}) {
  return (
    <div className={`imageCard ${variant === 'split' ? 'isSplitPreview' : ''}`}>
      <div className='cardTitle'>{title}</div>
      <div className='imageCardBody'>
        {url ? (
          <img src={url} alt={title} />
        ) : (
          <div className='emptyResult'>Пока нет данных</div>
        )}
      </div>
    </div>
  );
}
