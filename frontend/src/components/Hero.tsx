type HeroProps = {
  onStart: () => void;
  onExplore: () => void;
};

export function Hero({ onStart, onExplore }: HeroProps) {
  return (
    <section id='home' className='heroSection'>
      <div className='heroText'>
        <div className='heroIntroBadge'>Photo Lab / Restoration Studio</div>
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
          <span className='metricChip'>6 сценариев обработки</span>
          <span className='metricChip'>demo/API ready</span>
        </div>
      </div>

      <div className='heroMockup productMockup'>
        <div className='heroMockupStamp'>AI restored</div>
        <div className='mockupWindowBar'>
          <div className='mockupWindowDots' aria-hidden='true'>
            <span />
            <span />
            <span />
          </div>
          <span className='mockupWindowTitle'>PhotoRestore AI</span>
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
          <span>Старая фотография</span>
          <span>Восстановленная версия</span>
        </div>

        <div className='mockupSettings'>
          <div className='mockupSettingsGrid'>
            <div className='mockupSetting'>
              <span>Сценарий</span>
              <strong>Восстановление</strong>
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
