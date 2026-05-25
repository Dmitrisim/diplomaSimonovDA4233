import type { RuntimeMode } from '../types';

type HeaderProps = {
  apiOk: boolean;
  aiAvailable: boolean;
  runtimeMode: RuntimeMode;
};

export function Header({ apiOk, aiAvailable, runtimeMode }: HeaderProps) {
  return (
    <header className='appHeader'>
      <div className='brandBlock'>
        <div className='brandMark' aria-hidden='true' />
        <div>
          <div className='brandTitle'>AI Image Processing</div>
          <div className='brandSubtitle'>
            Система обработки цифровых изображений на основе AI-алгоритмов
          </div>
        </div>
      </div>

      <nav className='mainNav' aria-label='Навигация'>
        <a href='#home'>Главная</a>
        <a href='#processing'>Обработка</a>
        <a href='#history'>История</a>
        <a href='#about'>О системе</a>
        <a href='#help'>Помощь</a>
      </nav>

      <div className='statusGroup'>
        <StatusBadge label='API' value={apiOk ? 'ok' : 'error'} tone={apiOk ? 'success' : 'danger'} />
        <StatusBadge
          label='AI-модель'
          value={aiAvailable ? 'доступна' : 'недоступна'}
          tone={aiAvailable ? 'info' : 'muted'}
        />
        <StatusBadge label='режим' value={runtimeMode} tone={runtimeMode === 'production' ? 'success' : 'warning'} />
      </div>
    </header>
  );
}

function StatusBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'success' | 'danger' | 'warning' | 'info' | 'muted';
}) {
  return (
    <span className={`statusBadge tone-${tone}`}>
      <span className='statusLabel'>{label}</span>
      <span className='statusValue'>{value}</span>
    </span>
  );
}
