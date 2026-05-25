import { MODE_DEFINITIONS } from '../constants';
import type { ProcessingMode } from '../types';

type ModeSelectorProps = {
  mode: ProcessingMode;
  onChange: (mode: ProcessingMode) => void;
};

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  const selected = MODE_DEFINITIONS.find((item) => item.id === mode)!;

  return (
    <section className='surfaceCard stackGap'>
      <div>
        <div className='sectionLabel'>Modes</div>
        <h2 className='sectionTitle'>Выбор режима</h2>
      </div>

      <div className='modeGrid'>
        {MODE_DEFINITIONS.map((item) => (
          <button
            key={item.id}
            type='button'
            className={`modeCard ${item.id === mode ? 'isActive' : ''}`}
            onClick={() => onChange(item.id)}
          >
            <div className='modeCardTop'>
              <span className='modeIcon'>{item.iconLabel}</span>
              <strong>{item.shortTitle}</strong>
            </div>
            <span>{item.description}</span>
          </button>
        ))}
      </div>

      <div className='modeInfo'>
        <div>
          <div className='infoLabel'>Что делает режим</div>
          <p>{selected.description}</p>
        </div>
        <div>
          <div className='infoLabel'>Подходит для</div>
          <p>{selected.bestFor}</p>
        </div>
        <div>
          <div className='infoLabel'>Ограничения</div>
          <p>{selected.limitations}</p>
        </div>
      </div>
    </section>
  );
}
