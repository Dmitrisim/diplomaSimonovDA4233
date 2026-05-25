export function AboutSection() {
  return (
    <section id='about' className='surfaceCard stackGap'>
      <div>
        <div className='sectionLabel'>О системе</div>
        <h2 className='sectionTitle'>Назначение и стек</h2>
      </div>

      <p className='sectionText'>
        Система предназначена для обработки цифровых изображений с использованием AI-алгоритмов
        компьютерного зрения. Пользователь может загрузить изображение, выбрать режим обработки,
        запустить обработку, сравнить исходный и обработанный варианты и скачать результат.
      </p>

      <div className='twoCols'>
        <div className='miniCard'>
          <h3>Технологический стек</h3>
          <ul className='featureList'>
            <li>Frontend: React</li>
            <li>Backend: FastAPI</li>
            <li>Image processing: OpenCV, Pillow</li>
            <li>AI-модель: PyTorch / предобученная модель компьютерного зрения</li>
            <li>Хранение временных файлов: uploads/results</li>
            <li>Контроль версий: Git</li>
          </ul>
        </div>
        <div className='miniCard'>
          <h3>Основные возможности</h3>
          <ul className='featureList'>
            <li>загрузка изображений</li>
            <li>проверка формата и размера</li>
            <li>выбор режима обработки</li>
            <li>AI-обработка / demo fallback</li>
            <li>сравнение до/после</li>
            <li>скачивание результата</li>
            <li>история операций</li>
            <li>обработка ошибок</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
