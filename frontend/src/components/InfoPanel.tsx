import { MODE_BY_ID } from '../constants';
import type {
  FileMeta,
  ProcessResult,
  ProcessingParameters,
  ProcessingMode,
  ProcessStage,
} from '../types';
import { fileTypeLabel, formatBytes } from '../utils';

type InfoPanelProps = {
  sourceMeta: FileMeta | null;
  result: ProcessResult | null;
  mode: ProcessingMode;
  params: ProcessingParameters;
  stage: ProcessStage;
};

export function InfoPanel({
  sourceMeta,
  result,
  mode,
  params,
  stage,
}: InfoPanelProps) {
  return (
    <section className='surfaceCard stackGap'>
      <div>
        <div className='sectionLabel'>Session</div>
        <h2 className='sectionTitle'>Инфо по обработке</h2>
      </div>

      <div className='infoGrid'>
        <InfoRow label='Имя файла' value={sourceMeta?.name ?? '—'} />
        <InfoRow
          label='Формат файла'
          value={sourceMeta ? fileTypeLabel(sourceMeta.type) : '—'}
        />
        <InfoRow
          label='Размер файла'
          value={sourceMeta ? formatBytes(sourceMeta.size) : '—'}
        />
        <InfoRow
          label='Разрешение'
          value={
            sourceMeta ? `${sourceMeta.width} × ${sourceMeta.height}` : '—'
          }
        />
        <InfoRow label='Выбранный режим' value={MODE_BY_ID[mode].title} />
        <InfoRow
          label='Параметры'
          value={`интенсивность ${params.intensity}, формат ${params.resultFormat.toUpperCase()}, AI ${
            params.preferAi ? 'вкл' : 'выкл'
          }`}
        />

        <InfoRow
          label='Формат результата'
          value={result ? result.resultMeta.format.toUpperCase() : '—'}
        />
        <InfoRow
          label='Размер результата'
          value={result ? formatBytes(result.resultMeta.size) : '—'}
        />
        <InfoRow
          label='Разрешение результата'
          value={
            result
              ? `${result.resultMeta.width} × ${result.resultMeta.height}`
              : '—'
          }
        />
        <InfoRow
          label='Время обработки'
          value={result ? `${result.timingMs} мс` : '—'}
        />
        <InfoRow
          label='Использована AI-модель'
          value={result ? (result.usedAi ? 'да' : 'нет') : '—'}
        />
        <InfoRow
          label='Название модели'
          value={result?.modelName ?? 'не подключена'}
        />
        <InfoRow label='Статус обработки' value={statusLabel(stage, result)} />
      </div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='infoRow'>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function statusLabel(
  stage: ProcessStage,
  result: ProcessResult | null,
): string {
  if (stage === 'api-error') return 'Ошибка API';
  if (stage === 'format-error') return 'Ошибка формата';
  if (stage === 'size-error') return 'Ошибка размера файла';
  if (stage === 'cancelled') return 'Обработка отменена';
  if (stage === 'saved') return 'Результат успешно сохранен';
  if (result?.isDemo) return 'Демо-режим';
  if (stage === 'done') return 'Результат готов';
  if (
    stage === 'processing' ||
    stage === 'preprocessing' ||
    stage === 'uploading' ||
    stage === 'validating'
  ) {
    return 'Выполняется обработка';
  }
  if (stage === 'file-selected') return 'Файл выбран';
  return 'Файл не выбран';
}
