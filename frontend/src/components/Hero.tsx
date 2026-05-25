type HeroProps = {
  onStart: () => void;
  onExplore: () => void;
};

export function Hero({ onStart, onExplore }: HeroProps) {
  return (
    <section id='home' className='heroSection'>
      <div className='heroText'>
        <h1>AI-обработка изображений в браузере</h1>
        <p>
          Загрузите изображение, выберите режим обработки, сравните результат и
          скачайте готовый файл.
        </p>
        <div className='heroActions'>
          <button
            type='button'
            className='primaryButton heroPrimary'
            onClick={onStart}
          >
            Начать обработку
          </button>
          <button
            type='button'
            className='ghostButton heroSecondary'
            onClick={onExplore}
          >
            О сервисе
          </button>
        </div>
        <div className='heroMetrics'>
          <span className='metricChip'>6 режимов</span>
          <span className='metricChip'>до 10 МБ</span>
          <span className='metricChip'>JPG / PNG / WebP</span>
          <span className='metricChip'>demo / API</span>
        </div>
      </div>

      <div className='heroMockup productMockup'>
        <div className='mockupTop'>
          <strong>Пример сценария обработки</strong>
          <span className='mockupMetaText'>Light Image Studio</span>
        </div>

        <div className='mockupWorkflow'>
          <article className='mockupAssetCard'>
            <div className='mockupAssetPreview mockupAssetPreviewSource' />
            <div className='mockupAssetMeta'>
              <strong>original.jpg</strong>
              <span>Исходное изображение</span>
            </div>
          </article>

          <div className='mockupProcessFlow'>
            <span className='mockupProcessLabel'>processing</span>
            <div className='mockupProcessArrow' aria-hidden='true' />
          </div>

          <article className='mockupAssetCard'>
            <div className='mockupAssetPreview mockupAssetPreviewResult' />
            <div className='mockupAssetMeta'>
              <strong>result.png</strong>
              <span>Готовый результат</span>
            </div>
          </article>
        </div>

        <div className='mockupSettings'>
          <div className='mockupSettingsGrid'>
            <div className='mockupSetting'>
              <span>Режим</span>
              <strong>Автоулучшение</strong>
            </div>
            <div className='mockupSetting'>
              <span>Интенсивность</span>
              <strong>65%</strong>
            </div>
            <div className='mockupSetting'>
              <span>Формат</span>
              <strong>PNG</strong>
            </div>
          </div>
          <button
            type='button'
            className='secondaryButton mockupDownloadButton'
          >
            Скачать результат
          </button>
        </div>
      </div>
    </section>
  );
}
