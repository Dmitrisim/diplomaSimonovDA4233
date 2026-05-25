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
  } = props;

  return (
    <section className='surfaceCard stackGap previewPanel'>
      <div className='sectionHeading'>
        <div>
          <div className='sectionLabel'>Предпросмотр и результат</div>
          <h2 className='sectionTitle'>Сравнение «до/после»</h2>
        </div>
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
      </div>

      {!sourceUrl && !result ? (
        <div className='emptyResult'>
          Загрузите изображение и запустите обработку. Здесь появится сравнение исходного и обработанного варианта.
        </div>
      ) : compareView === 'slider' ? (
        <div className='compareCard'>
          <div className='compareStage'>
            {sourceUrl ? <img className='compareImg' src={sourceUrl} alt='Исходное изображение' /> : null}
            {result ? (
              <div className='compareTop' style={{ width: `${compareValue}%` }}>
                <img className='compareImg' src={result.resultUrl} alt='Результат обработки' />
              </div>
            ) : null}
            {result ? <div className='compareHandle' style={{ left: `${compareValue}%` }} /> : null}
            {isProcessing ? (
              <div className='loadingOverlay'>
                <div className='spinner' />
              </div>
            ) : null}
          </div>
          <div className='compareFooter'>
            <input
              className='range'
              type='range'
              min={0}
              max={100}
              value={compareValue}
              onChange={(e) => onCompareValueChange(Number(e.target.value))}
              disabled={!result}
            />
          </div>
        </div>
      ) : (
        <div className='splitPreview'>
          <ImageCard title='Исходное изображение' url={sourceUrl} />
          <ImageCard
            title={result?.isDemo ? 'Результат (демо)' : 'Результат обработки'}
            url={result?.resultUrl ?? null}
          />
        </div>
      )}

      <div className='buttonRow'>
        <button type='button' className='ghostButton' onClick={onReprocess} disabled={!sourceUrl}>
          Обработать заново
        </button>
        <button type='button' className='ghostButton' onClick={onReset} disabled={!sourceUrl && !result}>
          Сбросить
        </button>
        <button type='button' className='primaryButton' onClick={() => onDownload('png')} disabled={!result}>
          Скачать результат
        </button>
        <button type='button' className='secondaryButton' onClick={() => onDownload('png')} disabled={!result}>
          Скачать в PNG
        </button>
        <button type='button' className='secondaryButton' onClick={() => onDownload('jpeg')} disabled={!result}>
          Скачать в JPEG
        </button>
      </div>
    </section>
  );
}

function ImageCard({ title, url }: { title: string; url: string | null }) {
  return (
    <div className='imageCard'>
      <div className='cardTitle'>{title}</div>
      <div className='imageCardBody'>
        {url ? <img src={url} alt={title} /> : <div className='emptyResult'>Пока нет данных</div>}
      </div>
    </div>
  );
}
