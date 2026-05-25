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

      <div className='heroMockup'>
        <div className='mockupTop'>
          <strong>Пример сравнения</strong>
          <span className='mockupMetaText'>PNG · demo</span>
        </div>
        <div className='mockupStage'>
          <div className='mockupBefore'>
            <span>До</span>
          </div>
          <div className='mockupAfter'>
            <span>После</span>
          </div>
          <div className='mockupDivider' />
        </div>
        <div className='mockupMeta'>
          <div className='mockupChip'>Автоулучшение</div>
          <div className='mockupChip'>Сравнение до/после</div>
          <div className='mockupChip'>Результат PNG</div>
        </div>
      </div>
    </section>
  );
}
