type HeroProps = {
  onStart: () => void;
  onExplore: () => void;
};

export function Hero({ onStart, onExplore }: HeroProps) {
  return (
    <section id='home' className='heroSection'>
      <div className='heroText'>
        <h1>Восстановите и улучшите изображение за минуту</h1>
        <p>
          Загрузите фото, выберите сценарий обработки и сравните результат
          до/после прямо в браузере.
        </p>
        <div className='heroActions'>
          <button
            type='button'
            className='primaryButton heroPrimary'
            onClick={onStart}
          >
            Загрузить фото
          </button>
          <button
            type='button'
            className='ghostButton heroSecondary'
            onClick={onExplore}
          >
            Смотреть примеры
          </button>
        </div>
        <div className='heroMetrics'>
          <span className='metricChip'>JPG / PNG / WebP</span>
          <span className='metricChip'>до 10 МБ</span>
          <span className='metricChip'>7 сценариев обработки</span>
          <span className='metricChip'>AI / алгоритмы / API</span>
        </div>
      </div>

      <div className='heroMockup productMockup'>
        <div className='mockupWindowBar'>
          <div className='mockupWindowDots' aria-hidden='true'>
            <span />
            <span />
            <span />
          </div>
          <span className='mockupWindowTitle'>Artful</span>
        </div>
        <div className='mockupTop'>
          <strong>Сравнение результата</strong>
          <span className='mockupMetaText'>before / after preview</span>
        </div>

        <div className='heroComparePreview'>
          <div className='heroCompareHalf isBefore'>
            <span className='heroCompareLabel'>До</span>
            <div className='heroPhotoPreview heroPhotoBefore' />
          </div>
          <div className='heroCompareDivider' aria-hidden='true'>
            <span />
          </div>
          <div className='heroCompareHalf isAfter'>
            <span className='heroCompareLabel isAfter'>После</span>
            <div className='heroPhotoPreview heroPhotoAfter' />
          </div>
        </div>
        <div className='heroCompareCaption'>
          <span>Чёрно-белое фото</span>
          <span>AI-колоризация</span>
        </div>

        <div className='mockupSettings'>
          <div className='mockupSettingsGrid'>
            <div className='mockupSetting'>
              <span>Сценарий</span>
              <strong>Колоризация</strong>
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
