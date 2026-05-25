export function Hero() {
  return (
    <section id='home' className='heroSection'>
      <div className='heroText'>
        <span className='heroEyebrow'>Дипломный веб-сервис</span>
        <h1>Обработка, улучшение и подготовка цифровых изображений в одном интерфейсе</h1>
        <p>
          Загрузите изображение, выберите режим обработки, настройте параметры, сравните результат
          «до/после» и скачайте итоговый файл. Интерфейс готов к подключению реального API и AI-модели.
        </p>
      </div>

      <div className='heroStats'>
        <div className='statCard'>
          <strong>6</strong>
          <span>режимов обработки</span>
        </div>
        <div className='statCard'>
          <strong>10 МБ</strong>
          <span>максимальный размер файла</span>
        </div>
        <div className='statCard'>
          <strong>Demo/API</strong>
          <span>готовность к fallback и production</span>
        </div>
      </div>
    </section>
  );
}
