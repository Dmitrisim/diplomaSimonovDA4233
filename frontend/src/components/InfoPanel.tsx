import type { ReactNode } from 'react';
import { MODE_BY_ID } from '../constants';
import type {
  FileMeta,
  ProcessResult,
  ProcessingParameters,
  ProcessingMode,
  ProcessStage,
  ServiceStatus,
} from '../types';
import { fileTypeLabel, formatBytes } from '../utils';

type InfoPanelProps = {
  sourceMeta: FileMeta | null;
  result: ProcessResult | null;
  mode: ProcessingMode;
  params: ProcessingParameters;
  stage: ProcessStage;
  serviceStatus: ServiceStatus;
};

export function InfoPanel({
  sourceMeta,
  result,
  mode,
  params,
  stage,
  serviceStatus,
}: InfoPanelProps) {
  if (!sourceMeta) {
    return (
      <section className='surfaceCard stackGap'>
        <div>
          <h2 className='sectionTitle'>Информация</h2>
        </div>
        <div className='infoEmptyState'>
          <div className='emptyPreviewIcon'>INF</div>
          <strong>Загрузите фото - здесь появятся параметры и результат</strong>
          <span>
            После загрузки здесь появятся размер, формат, выбранный сценарий и
            сведения о результате обработки.
          </span>
        </div>
      </section>
    );
  }

  const modeConfig = MODE_BY_ID[mode];
  const selectedModeUsesBackend = Boolean(modeConfig.backendMode);
  const selectedModeCanUseAi = modeConfig.backendMode === 'upscale';
  const aiProcessingLabel = result
    ? result.usedAi
      ? 'Да'
      : result.isDemo
        ? 'Нет, demo-сценарий'
        : 'Нет, backend fallback'
    : selectedModeCanUseAi
      ? 'Возможна для этого режима'
      : 'Не используется в этом режиме';
  const modelLabel =
    result?.modelName ??
    (selectedModeCanUseAi
      ? serviceStatus.modelName ||
        (params.preferAi ? 'Будет выбрана автоматически' : 'AI отключена')
      : selectedModeUsesBackend
        ? 'fallback-opencv-pillow'
        : 'demo-сценарий');
  const runtimeLabel = result?.isDemo
    ? 'Demo mode'
    : result
      ? result.usedAi
        ? 'AI super-resolution'
        : 'Backend fallback'
      : selectedModeCanUseAi
        ? 'AI/API при доступности модели'
        : selectedModeUsesBackend
          ? 'Backend API fallback'
          : 'Demo mode';
  const modelComment =
    serviceStatus.availabilityReason ||
    (selectedModeCanUseAi
      ? 'AI применяется для увеличения разрешения при доступной модели и подходящем размере изображения.'
      : selectedModeUsesBackend
        ? 'Этот режим выполняется серверной обработкой OpenCV/Pillow без AI-модели.'
        : 'Этот сценарий пока демонстрационный и выполняется на клиенте.');

  return (
    <section className='surfaceCard stackGap'>
      <div>
        <h2 className='sectionTitle'>Информация</h2>
      </div>

      <div className='infoSectionList'>
        <InfoGroup title='Файл'>
          <InfoRow label='Имя файла' value={sourceMeta.name} />
          <InfoRow label='Формат' value={fileTypeLabel(sourceMeta.type)} />
          <InfoRow label='Размер' value={formatBytes(sourceMeta.size)} />
          <InfoRow
            label='Разрешение'
            value={`${sourceMeta.width} × ${sourceMeta.height}`}
          />
        </InfoGroup>

        <InfoGroup title='Обработка'>
          <InfoRow label='Режим' value={modeConfig.title} />
          <InfoRow label='Интенсивность' value={`${params.intensity}%`} />
          <InfoRow
            label='Формат результата'
            value={params.resultFormat.toUpperCase()}
          />
          <InfoRow label='Статус' value={statusLabel(stage, result)} />
        </InfoGroup>

        {result ? (
          <InfoGroup title='Результат'>
            <InfoRow
              label='Формат'
              value={result.resultMeta.format.toUpperCase()}
            />
            <InfoRow
              label='Размер'
              value={formatBytes(result.resultMeta.size)}
            />
            <InfoRow
              label='Разрешение'
              value={`${result.resultMeta.width} × ${result.resultMeta.height}`}
            />
            <InfoRow label='Время обработки' value={`${result.timingMs} мс`} />
          </InfoGroup>
        ) : null}

        <InfoGroup title='Модель'>
          <InfoRow
            label='Статус AI'
            value={
              serviceStatus.aiAvailable
                ? 'Model online'
                : serviceStatus.apiOk
                  ? 'AI недоступна'
                  : 'API недоступен'
            }
          />
          <InfoRow
            label='AI-обработка'
            value={aiProcessingLabel}
          />
          <InfoRow label='Модель' value={modelLabel} />
          <InfoRow label='Режим работы' value={runtimeLabel} />
          <InfoRow
            label='Комментарий'
            value={modelComment}
          />
        </InfoGroup>
      </div>
    </section>
  );
}

function InfoGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className='infoGroup'>
      <div className='infoGroupTitle'>{title}</div>
      <div className='infoGrid'>{children}</div>
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
