import type { ProcessingMode, ProcessingParameters } from '../types';

type ParametersPanelProps = {
  mode: ProcessingMode;
  params: ProcessingParameters;
  onChange: <K extends keyof ProcessingParameters>(key: K, value: ProcessingParameters[K]) => void;
};

export function ParametersPanel({ mode, params, onChange }: ParametersPanelProps) {
  const showUpscale = mode === 'super-resolution';
  const showDenoise = mode === 'denoise';
  const showWeb = mode === 'web-export';

  return (
    <section className='surfaceCard stackGap'>
      <div>
        <div className='sectionLabel'>Параметры обработки</div>
        <h2 className='sectionTitle'>Настройки</h2>
      </div>

      <div className='formGrid'>
        <label className='field'>
          <span className='fieldLabel'>Интенсивность обработки: {params.intensity}</span>
          <input
            type='range'
            min={0}
            max={100}
            value={params.intensity}
            onChange={(e) => onChange('intensity', Number(e.target.value))}
          />
        </label>

        <label className='field'>
          <span className='fieldLabel'>Формат результата</span>
          <select value={params.resultFormat} onChange={(e) => onChange('resultFormat', e.target.value as ProcessingParameters['resultFormat'])}>
            <option value='png'>PNG</option>
            <option value='jpeg'>JPEG</option>
            <option value='webp'>WebP</option>
          </select>
        </label>

        <label className='field'>
          <span className='fieldLabel'>Качество JPEG/WebP: {params.quality}</span>
          <input
            type='range'
            min={1}
            max={100}
            value={params.quality}
            onChange={(e) => onChange('quality', Number(e.target.value))}
          />
        </label>

        <label className='checkboxRow'>
          <input
            type='checkbox'
            checked={params.keepAspectRatio}
            onChange={(e) => onChange('keepAspectRatio', e.target.checked)}
          />
          <span>Сохранять исходное соотношение сторон</span>
        </label>

        <label className='checkboxRow'>
          <input
            type='checkbox'
            checked={params.autoResizeLarge}
            onChange={(e) => onChange('autoResizeLarge', e.target.checked)}
          />
          <span>Автоматически уменьшать слишком большие изображения</span>
        </label>

        <label className='checkboxRow'>
          <input
            type='checkbox'
            checked={params.preferAi}
            onChange={(e) => onChange('preferAi', e.target.checked)}
          />
          <span>Предпочитать AI-модель, если доступна</span>
        </label>

        <label className={`field ${showUpscale ? '' : 'isDisabled'}`}>
          <span className='fieldLabel'>Масштаб</span>
          <select
            value={params.upscaleFactor}
            disabled={!showUpscale}
            onChange={(e) => onChange('upscaleFactor', e.target.value as ProcessingParameters['upscaleFactor'])}
          >
            <option value='x2'>x2</option>
            <option value='x4'>x4</option>
          </select>
        </label>

        <label className={`field ${showDenoise ? '' : 'isDisabled'}`}>
          <span className='fieldLabel'>Сила шумоподавления</span>
          <select
            value={params.denoiseLevel}
            disabled={!showDenoise}
            onChange={(e) => onChange('denoiseLevel', e.target.value as ProcessingParameters['denoiseLevel'])}
          >
            <option value='low'>Низкая</option>
            <option value='medium'>Средняя</option>
            <option value='high'>Высокая</option>
          </select>
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

        <label className={`checkboxRow ${showWeb ? '' : 'isDisabled'}`}>
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
