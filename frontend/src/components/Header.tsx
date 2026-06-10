import type { RuntimeMode } from '../types';
import artfulLogoUrl from '../assets/artful-logo.svg';

type AppSection =
  | 'home'
  | 'processing'
  | 'examples'
  | 'history'
  | 'about'
  | 'help';

type HeaderProps = {
  apiOk?: boolean;
  aiAvailable?: boolean;
  runtimeMode?: RuntimeMode;
  activeSection: AppSection;
  onNavigate: (section: AppSection) => void;
};

const NAV_ITEMS: Array<{ id: AppSection; label: string }> = [
  { id: 'home', label: 'Главная' },
  { id: 'processing', label: 'Обработка' },
  { id: 'examples', label: 'Примеры' },
  { id: 'history', label: 'История' },
  { id: 'about', label: 'О системе' },
  { id: 'help', label: 'Помощь' },
];

export function Header({ activeSection, onNavigate }: HeaderProps) {
  return (
    <header className='appHeader'>
      <div className='brandBlock'>
        <img className='brandMark' src={artfulLogoUrl} alt='' aria-hidden='true' />
        <div className='brandTitle'>Artful</div>
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
        <button
          type='button'
          className='primaryButton headerCtaButton'
          onClick={() => onNavigate('processing')}
        >
          <span className='headerCtaIcon' aria-hidden='true'>
            +
          </span>
          Загрузить фото
        </button>
      </div>
    </header>
  );
}

export type { AppSection };
