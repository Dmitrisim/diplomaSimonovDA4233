type HeroProps = {
  onStart: () => void;
  onExplore: () => void;
};

export function Hero({ onStart, onExplore }: HeroProps) {
  return (
    <section id='home' className='heroSection'>
      <div className='heroText'>
        <span className='heroEyebrow'>AI Image Studio</span>
        <h1>AI-обработка изображений в браузере</h1>
        <p>
          Загрузите изображение, выберите режим обработки, сравните результат
          «до/после» и скачайте готовый файл. Интерфейс уже готов к demo mode и
          подключению реального API.
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
            Посмотреть возможности
          </button>
        </div>
        <div className='heroMetrics'>
          <span className='metricChip'>6 режимов</span>
          <span className='metricChip'>до 10 МБ</span>
          <span className='metricChip'>JPG / PNG / WebP</span>
          <span className='metricChip'>Demo/API ready</span>
        </div>
      </div>

      <div className='heroMockup'>
        <div className='mockupTop'>
          <span className='mockupBadge'>AI enhancement</span>
          <span className='mockupDot' />
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
          <div className='mockupChip'>Режим: Auto Enhance</div>
          <div className='mockupChip'>Интенсивность: 65</div>
          <div className='mockupChip'>Формат: PNG</div>
          <div className='mockupChip'>Модель: demo</div>
        </div>
      </div>
    </section>
  );
}
