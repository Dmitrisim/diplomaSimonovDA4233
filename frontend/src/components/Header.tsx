import type { RuntimeMode } from '../types';

type AppSection = 'home' | 'processing' | 'history' | 'about' | 'help';

type HeaderProps = {
  apiOk: boolean;
  aiAvailable: boolean;
  runtimeMode: RuntimeMode;
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
};

const NAV_ITEMS: Array<{ id: AppSection; label: string }> = [
  { id: 'home', label: 'Главная' },
  { id: 'processing', label: 'Обработка' },
  { id: 'history', label: 'История' },
  { id: 'about', label: 'О системе' },
  { id: 'help', label: 'Помощь' },
];

export function Header({
  apiOk,
  aiAvailable,
  runtimeMode,
  activeSection,
  onNavigate,
}: HeaderProps) {
  return (
    <header className='appHeader'>
      <div className='brandBlock'>
        <div className='brandMark' aria-hidden='true' />
        <div>
          <div className='brandTitle'>AI Image Processing</div>
          <div className='brandSubtitle'>Сервис обработки изображений</div>
        </div>
      </div>

      <nav className='mainNav' aria-label='Навигация'>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type='button'
            className={`navButton ${activeSection === item.id ? 'isActive' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className='statusGroup'>
        <StatusBadge
          label='API'
          value={apiOk ? 'online' : 'offline'}
          tone={apiOk ? 'success' : 'danger'}
        />
        <StatusBadge
          label='Model'
          value={aiAvailable ? 'online' : 'demo'}
          tone={aiAvailable ? 'info' : 'muted'}
        />
        <StatusBadge
          label='Mode'
          value={runtimeMode}
          tone={runtimeMode === 'production' ? 'success' : 'warning'}
        />
      </div>
    </header>
  );
}

export type { AppSection };

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
