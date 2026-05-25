export function HelpSection() {
  return (
    <section id='help' className='surfaceCard stackGap'>
      <div>
        <div className='sectionLabel'>Помощь</div>
        <h2 className='sectionTitle'>Как пользоваться сервисом</h2>
      </div>

      <ol className='stepsList'>
        <li>Загрузите изображение в формате JPG, PNG или WebP.</li>
        <li>Выберите режим обработки.</li>
        <li>При необходимости измените параметры.</li>
        <li>Нажмите «Обработать».</li>
        <li>Сравните исходное и обработанное изображение.</li>
        <li>Скачайте результат.</li>
      </ol>

      <div className='miniCard warningCard'>
        <h3>Ограничения</h3>
        <ul className='featureList'>
          <li>очень маленькие изображения могут обрабатываться хуже;</li>
          <li>сильно поврежденные изображения не всегда возможно восстановить полностью;</li>
          <li>обработка больших изображений может занимать больше времени;</li>
          <li>качество результата зависит от выбранной модели и исходного изображения.</li>
        </ul>
      </div>
    </section>
  );
}
