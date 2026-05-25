export function HelpSection() {
  const steps = [
    'Загрузите изображение в формате JPG, PNG или WebP.',
    'Выберите режим обработки под ваш сценарий.',
    'Настройте параметры качества, формата и AI-опций.',
    'Запустите обработку и дождитесь результата.',
    'Сравните исходное и обработанное изображение.',
    'Скачайте итоговый файл в нужном формате.',
  ];

  return (
    <section id='help' className='surfaceCard stackGap'>
      <div>
        <div className='sectionLabel'>Help</div>
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
          <li>очень маленькие изображения могут обрабатываться хуже;</li>
          <li>
            сильно поврежденные изображения не всегда возможно восстановить
            полностью;
          </li>
          <li>обработка больших изображений может занимать больше времени;</li>
          <li>
            качество результата зависит от выбранной модели и исходного
            изображения.
          </li>
        </ul>
      </div>
    </section>
  );
}
