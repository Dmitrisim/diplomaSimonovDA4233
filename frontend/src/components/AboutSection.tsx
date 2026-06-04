export function AboutSection() {
  const technologies = [
    'React',
    'FastAPI',
    'Python',
    'OpenCV',
    'OpenCV DNN',
    'Pillow',
  ];
  const capabilities = [
    'Загрузка и проверка изображений',
    'Выбор режима и настройка параметров',
    'Сравнение результата до и после обработки',
    'Скачивание результата в PNG, JPEG и WebP',
    'Локальная история последних операций',
    'Fallback-обработка при недоступности AI',
  ];

  return (
    <section id='about' className='surfaceCard stackGap'>
      <div>
        <h2 className='sectionTitle'>Назначение системы</h2>
      </div>

      <p className='sectionText'>
        Artful предназначен для браузерного восстановления, улучшения и
        подготовки цифровых изображений. Пользователь загружает фото, выбирает
        сценарий, настраивает параметры, сравнивает результат до и после
        обработки и скачивает готовый файл.
      </p>

      <div className='twoCols'>
        <div className='miniCard'>
          <h3>Технологический стек</h3>
          <div className='chipRow'>
            {technologies.map((item) => (
              <span key={item} className='metricChip'>
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className='miniCard'>
          <h3>Основные возможности</h3>
          <ul className='featureList'>
            {capabilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className='twoCols'>
        <div className='miniCard'>
          <h3>Архитектура</h3>
          <p className='sectionText'>
            Клиентская часть реализована на React и отвечает за навигацию,
            загрузку файлов, параметры обработки, сравнение результата и
            локальную историю. Серверная часть на FastAPI принимает изображения,
            запускает обработку и отдает готовый результат.
          </p>
        </div>
        <div className='miniCard'>
          <h3>Возможности</h3>
          <p className='sectionText'>
            Сервис поддерживает несколько режимов обработки, выводит статус API и
            модели, показывает метаданные файла и использует demo mode только
            для сценариев, которые пока не подключены к backend.
          </p>
        </div>
      </div>
    </section>
  );
}
