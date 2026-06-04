export function HelpSection() {
  const steps = [
    'Загрузите изображение.',
    'Выберите режим обработки.',
    'Настройте параметры.',
    'Запустите обработку.',
    'Сравните результат.',
    'Скачайте файл.',
  ];

  return (
    <section id='help' className='surfaceCard stackGap'>
      <div>
        <h2 className='sectionTitle'>Как пользоваться сервисом</h2>
      </div>

      <div className='stepsGrid'>
        {steps.map((item, index) => (
          <article key={item} className='stepCard'>
            <span className='stepNumber'>{index + 1}</span>
            <p>{item}</p>
          </article>
        ))}
      </div>

      <div className='miniCard warningCard'>
        <h3>Ограничения</h3>
        <ul className='featureList'>
          <li>размер файла до 10 МБ;</li>
          <li>поддерживаются JPG, PNG и WebP;</li>
          <li>AI-модель используется для увеличения разрешения;</li>
          <li>пиксельные и маленькие фото лучше проверять режимом "Разрешение";</li>
          <li>режим "Старый снимок" рассчитан на выцветшие, тусклые или шумные сканы;</li>
          <li>большие AI-upscale изображения переводятся в fallback;</li>
          <li>часть сценариев выполняется backend-обработкой OpenCV/Pillow;</li>
          <li>режим подготовки для сайта пока работает как demo-сценарий;</li>
          <li>качество результата зависит от исходного изображения;</li>
        </ul>
      </div>
    </section>
  );
}
