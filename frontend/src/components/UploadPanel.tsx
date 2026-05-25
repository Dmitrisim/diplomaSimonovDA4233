import type { ChangeEvent, DragEventHandler, RefObject } from 'react';
import type { FileMeta } from '../types';
import { fileTypeLabel, formatBytes } from '../utils';

type UploadPanelProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  fileMeta: FileMeta | null;
  previewUrl: string | null;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDrop: DragEventHandler<HTMLDivElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onPickClick: () => void;
  onClear: () => void;
};

export function UploadPanel(props: UploadPanelProps) {
  const { inputRef, fileMeta, previewUrl, onInputChange, onDrop, onDragOver, onPickClick, onClear } = props;

  return (
    <section className='surfaceCard stackGap'>
      <div>
        <div className='sectionLabel'>Загрузка изображения</div>
        <h2 className='sectionTitle'>Источник</h2>
        <p className='sectionMuted'>Поддерживаются JPG, PNG, WebP. Размер файла до 10 МБ.</p>
      </div>

      <div className='dropzone' onDrop={onDrop} onDragOver={onDragOver}>
        <input
          ref={inputRef}
          type='file'
          accept='image/png,image/jpeg,image/webp'
          className='fileInput'
          onChange={onInputChange}
        />
        <div className='dropzoneInner'>
          <div className='dropTitle'>
            {fileMeta ? fileMeta.name : 'Перетащите изображение сюда'}
          </div>
          <div className='dropSubtitle'>или</div>
          <button type='button' className='secondaryButton' onClick={onPickClick}>
            Выбрать файл
          </button>
        </div>
      </div>

      {fileMeta && (
        <div className='uploadDetails'>
          <div className='filePreviewBox'>
            {previewUrl ? <img src={previewUrl} alt='Предпросмотр исходного изображения' /> : null}
          </div>
          <div className='fileMetaGrid'>
            <MetaItem label='Имя файла' value={fileMeta.name} />
            <MetaItem label='Формат' value={fileTypeLabel(fileMeta.type)} />
            <MetaItem label='Размер файла' value={formatBytes(fileMeta.size)} />
            <MetaItem label='Разрешение' value={`${fileMeta.width} × ${fileMeta.height}`} />
          </div>
          <div className='buttonRow'>
            <button type='button' className='ghostButton' onClick={onPickClick}>
              Заменить файл
            </button>
            <button type='button' className='dangerButton' onClick={onClear}>
              Удалить файл
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className='metaTile'>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
