import { MODE_DEFINITIONS } from '../constants';
import type { ProcessingMode } from '../types';

type ModeSelectorProps = {
  mode: ProcessingMode;
  onChange: (mode: ProcessingMode) => void;
};

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  const selected = MODE_DEFINITIONS.find((item) => item.id === mode)!;

  return (
    <section className='surfaceCard stackGap modeSelectorSection'>
      <div>
        <div className='sectionTitleRow'>
          <h2 className='sectionTitle'>Режим обработки</h2>
          <span className='inlineStateChip isAccent'>
            {selected.shortTitle}
          </span>
        </div>
        <p className='sectionMuted'>
          Выберите один сценарий обработки для текущего изображения.
        </p>
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
              <div className='modeCardText'>
                <div className='modeCardTitleRow'>
                  <strong>{item.shortTitle}</strong>
                  <span className={`modeRuntimeChip ${runtimeClass(item)}`}>
                    {runtimeLabel(item)}
                  </span>
                </div>
                <span>{item.description}</span>
              </div>
            </div>
            <span className='modeCardArrow' aria-hidden='true'>
              {item.id === mode ? '●' : '○'}
            </span>
          </button>
        ))}
      </div>

      <div className='modeInfo modeInfoPanel'>
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

function runtimeLabel(item: (typeof MODE_DEFINITIONS)[number]): string {
  if (!item.backendMode) return 'demo';
  if (item.backendMode === 'upscale') return 'AI/API';
  return 'API';
}

function runtimeClass(item: (typeof MODE_DEFINITIONS)[number]): string {
  if (!item.backendMode) return 'isDemo';
  if (item.backendMode === 'upscale') return 'isAi';
  return 'isApi';
}
