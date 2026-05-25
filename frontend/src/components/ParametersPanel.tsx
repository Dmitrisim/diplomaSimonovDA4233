import type { ProcessingMode, ProcessingParameters } from '../types';

type ParametersPanelProps = {
  mode: ProcessingMode;
  params: ProcessingParameters;
  onChange: <K extends keyof ProcessingParameters>(
    key: K,
    value: ProcessingParameters[K],
  ) => void;
};

export function ParametersPanel({
  mode,
  params,
  onChange,
}: ParametersPanelProps) {
  const showUpscale = mode === 'super-resolution';
  const showDenoise = mode === 'denoise';
  const showWeb = mode === 'web-export';

  return (
    <section className='surfaceCard stackGap'>
      <div>
        <div className='sectionLabel'>Controls</div>
        <h2 className='sectionTitle'>Настройки</h2>
      </div>

      <div className='formGrid'>
        <label className='field'>
          <span className='fieldLabel'>Интенсивность</span>
          <strong className='fieldValue'>{params.intensity}%</strong>
          <input
            className='range'
            type='range'
            min={0}
            max={100}
            value={params.intensity}
            onChange={(e) => onChange('intensity', Number(e.target.value))}
          />
        </label>

        <label className='field'>
          <span className='fieldLabel'>Формат результата</span>
          <div className='segmentedControl fullWidth'>
            {(['png', 'jpeg', 'webp'] as const).map((format) => (
              <button
                key={format}
                type='button'
                className={params.resultFormat === format ? 'active' : ''}
                onClick={() => onChange('resultFormat', format)}
              >
                {format.toUpperCase()}
              </button>
            ))}
          </div>
        </label>

        <label className='field'>
          <span className='fieldLabel'>Качество</span>
          <strong className='fieldValue'>{params.quality}</strong>
          <input
            className='range'
            type='range'
            min={1}
            max={100}
            value={params.quality}
            onChange={(e) => onChange('quality', Number(e.target.value))}
          />
        </label>

        <label className='toggleRow'>
          <input
            type='checkbox'
            checked={params.keepAspectRatio}
            onChange={(e) => onChange('keepAspectRatio', e.target.checked)}
          />
          <span>Сохранять пропорции</span>
        </label>

        <label className='toggleRow'>
          <input
            type='checkbox'
            checked={params.autoResizeLarge}
            onChange={(e) => onChange('autoResizeLarge', e.target.checked)}
          />
          <span>Автоуменьшение больших файлов</span>
        </label>

        <label className='toggleRow'>
          <input
            type='checkbox'
            checked={params.preferAi}
            onChange={(e) => onChange('preferAi', e.target.checked)}
          />
          <span>Использовать AI, если доступна</span>
        </label>

        <label className={`field ${showUpscale ? '' : 'isDisabled'}`}>
          <span className='fieldLabel'>Масштаб</span>
          <div className='segmentedControl fullWidth'>
            {(['x2', 'x4'] as const).map((scale) => (
              <button
                key={scale}
                type='button'
                disabled={!showUpscale}
                className={params.upscaleFactor === scale ? 'active' : ''}
                onClick={() => onChange('upscaleFactor', scale)}
              >
                {scale}
              </button>
            ))}
          </div>
        </label>

        <label className={`field ${showDenoise ? '' : 'isDisabled'}`}>
          <span className='fieldLabel'>Сила шумоподавления</span>
          <div className='segmentedControl fullWidth'>
            {(
              [
                ['low', 'Низкая'],
                ['medium', 'Средняя'],
                ['high', 'Высокая'],
              ] as const
            ).map(([level, label]) => (
              <button
                key={level}
                type='button'
                disabled={!showDenoise}
                className={params.denoiseLevel === level ? 'active' : ''}
                onClick={() => onChange('denoiseLevel', level)}
              >
                {label}
              </button>
            ))}
          </div>
        </label>

        <label className={`field ${showWeb ? '' : 'isDisabled'}`}>
          <span className='fieldLabel'>Максимальная ширина</span>
          <input
            type='number'
            disabled={!showWeb}
            value={params.maxWidth}
            onChange={(e) => onChange('maxWidth', Number(e.target.value))}
          />
        </label>

        <label className={`field ${showWeb ? '' : 'isDisabled'}`}>
          <span className='fieldLabel'>Максимальная высота</span>
          <input
            type='number'
            disabled={!showWeb}
            value={params.maxHeight}
            onChange={(e) => onChange('maxHeight', Number(e.target.value))}
          />
        </label>

        <label className={`toggleRow ${showWeb ? '' : 'isDisabled'}`}>
          <input
            type='checkbox'
            disabled={!showWeb}
            checked={params.optimizeFileSize}
            onChange={(e) => onChange('optimizeFileSize', e.target.checked)}
          />
          <span>Оптимизировать размер файла</span>
        </label>
      </div>
    </section>
  );
}
