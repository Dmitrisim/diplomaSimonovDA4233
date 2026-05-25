import type { ChangeEvent, DragEventHandler, RefObject } from 'react';
import type { FileMeta } from '../types';
import { fileTypeLabel, formatBytes } from '../utils';

type UploadPanelProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  fileMeta: FileMeta | null;
  previewUrl: string | null;
  isDragActive: boolean;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onDrop: DragEventHandler<HTMLDivElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragLeave: DragEventHandler<HTMLDivElement>;
  onPickClick: () => void;
  onClear: () => void;
};

export function UploadPanel(props: UploadPanelProps) {
  const {
    inputRef,
    fileMeta,
    previewUrl,
    isDragActive,
    onInputChange,
    onDrop,
    onDragOver,
    onDragLeave,
    onPickClick,
    onClear,
  } = props;

  return (
    <section className='surfaceCard stackGap'>
      <div>
        <div className='sectionLabel'>Upload</div>
        <h2 className='sectionTitle'>Загрузите изображение</h2>
        <p className='sectionMuted'>
          Перетащите файл в рабочую область или выберите его вручную.
        </p>
      </div>

      <div
        className={`dropzone ${isDragActive ? 'isActive' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <input
          ref={inputRef}
          type='file'
          accept='image/png,image/jpeg,image/webp'
          className='fileInput'
          onChange={onInputChange}
        />
        <div className='dropzoneInner'>
          <div className='dropIcon'>UP</div>
          <div className='dropTitle'>
            {fileMeta ? 'Файл загружен' : 'Перетащите изображение сюда'}
          </div>
          <div className='dropSubtitle'>
            {fileMeta ? fileMeta.name : 'или выберите файл с устройства'}
          </div>
          <button
            type='button'
            className='secondaryButton'
            onClick={onPickClick}
          >
            Выбрать файл
          </button>
          <div className='chipRow'>
            <span className='metricChip'>JPG</span>
            <span className='metricChip'>PNG</span>
            <span className='metricChip'>WebP</span>
            <span className='metricChip'>до 10 МБ</span>
          </div>
        </div>
      </div>

      {fileMeta && (
        <div className='uploadDetails'>
          <div className='uploadAssetRow'>
            <div className='filePreviewBox'>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt='Предпросмотр исходного изображения'
                />
              ) : null}
            </div>
            <div className='fileMetaGrid'>
              <MetaItem label='Имя файла' value={fileMeta.name} />
              <MetaItem label='Формат' value={fileTypeLabel(fileMeta.type)} />
              <MetaItem
                label='Размер файла'
                value={formatBytes(fileMeta.size)}
              />
              <MetaItem
                label='Разрешение'
                value={`${fileMeta.width} × ${fileMeta.height}`}
              />
            </div>
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
