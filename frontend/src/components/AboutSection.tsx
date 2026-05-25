export function AboutSection() {
  const technologies = [
    'React',
    'FastAPI',
    'Python',
    'OpenCV',
    'Pillow',
    'PyTorch',
    'Git',
  ];
  const capabilities = [
    'Загрузка изображений и проверка формата',
    'AI-обработка и demo fallback',
    'Сравнение до/после в двух режимах',
    'Скачивание результата в разных форматах',
    'История последних операций',
    'Подготовка к интеграции с backend API',
  ];

  return (
    <section id='about' className='surfaceCard stackGap'>
      <div>
        <div className='sectionLabel'>About</div>
        <h2 className='sectionTitle'>Что умеет сервис</h2>
      </div>

      <p className='sectionText'>
        AI Image Processing предназначен для загрузки, улучшения и экспорта
        цифровых изображений в удобном браузерном интерфейсе. Пользователь
        выбирает режим, задает параметры, сравнивает исходник с результатом и
        сохраняет итоговый файл.
      </p>

      <div className='twoCols'>
        <div className='miniCard'>
          <h3>Технологии сервиса</h3>
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
            Клиентская часть построена на React, серверная API-часть реализуется
            на FastAPI, а обработка изображений выполняется через OpenCV, Pillow
            и AI-модели компьютерного зрения.
          </p>
        </div>
        <div className='miniCard'>
          <h3>Готовность к демонстрации</h3>
          <p className='sectionText'>
            Интерфейс поддерживает demo mode, поэтому сервис можно показывать и
            тестировать даже до полного подключения production backend.
          </p>
        </div>
      </div>
    </section>
  );
}
