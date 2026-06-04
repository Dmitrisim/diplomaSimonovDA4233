import type { ReactNode } from 'react';
import {
  AI_UPSCALE_LIMIT_LABEL,
  AI_UPSCALE_LIMIT_PIXELS,
  MODE_BY_ID,
} from '../constants';
import type {
  FileMeta,
  ImageAnalysis,
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
  analysis: ImageAnalysis | null;
};

export function InfoPanel({
  sourceMeta,
  result,
  mode,
  params,
  stage,
  serviceStatus,
  analysis,
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
  const selectedModeCanUseAi =
    modeConfig.backendMode === 'upscale' || modeConfig.backendMode === 'colorize';
  const selectedModeIsUpscale = modeConfig.backendMode === 'upscale';
  const selectedModeIsColorize = modeConfig.backendMode === 'colorize';
  const selectedModeAiAvailable = Boolean(
    modeConfig.backendMode &&
      (serviceStatus.aiSupportedModes?.includes(modeConfig.backendMode) ??
        (selectedModeIsUpscale && serviceStatus.aiAvailable)),
  );
  const sourceExceedsAiUpscaleLimit =
    selectedModeIsUpscale &&
    sourceMeta.width * sourceMeta.height > AI_UPSCALE_LIMIT_PIXELS;
  const aiProcessingLabel = result
    ? result.usedAi
      ? 'Да'
      : result.isDemo
        ? 'Нет, demo-сценарий'
        : 'Нет, backend fallback'
    : selectedModeCanUseAi
      ? !params.preferAi
        ? 'Нет, AI отключена'
        : sourceExceedsAiUpscaleLimit
          ? 'Нет, размер уйдет в fallback'
          : selectedModeAiAvailable
            ? 'Возможна для этого режима'
            : 'Нет, модель режима не подключена'
      : 'Не используется в этом режиме';
  const modelLabel =
    result?.modelName ??
    (selectedModeCanUseAi
      ? !params.preferAi ||
        sourceExceedsAiUpscaleLimit ||
        !selectedModeAiAvailable
        ? 'fallback-opencv-pillow'
        : serviceStatus.modelName || 'Будет выбрана автоматически'
      : selectedModeUsesBackend
        ? 'fallback-opencv-pillow'
        : 'demo-сценарий');
  const runtimeLabel = result?.isDemo
    ? 'Demo mode'
    : result
      ? result.usedAi
        ? selectedModeIsColorize
          ? 'AI colorization'
          : 'AI super-resolution'
        : 'Backend fallback'
      : selectedModeCanUseAi
        ? !params.preferAi
          ? 'Backend fallback'
          : sourceExceedsAiUpscaleLimit
            ? 'Backend fallback из-за размера'
            : selectedModeAiAvailable
              ? selectedModeIsColorize
                ? 'AI colorization при доступности модели'
                : 'AI super-resolution при доступности модели'
              : 'Backend fallback без модели режима'
        : selectedModeUsesBackend
          ? 'Backend fallback'
          : 'Demo mode';
  const modelComment =
    !serviceStatus.apiOk
      ? serviceStatus.availabilityReason || 'API недоступен'
      : selectedModeCanUseAi
      ? result?.usedAi
        ? selectedModeIsColorize
          ? 'AI-колоризация выполнена отдельной моделью для чёрно-белых снимков.'
          : 'AI super-resolution выполнено моделью увеличения разрешения.'
        : result && !result.usedAi
        ? selectedModeIsColorize
          ? 'AI-колоризация не использована: модель колоризации не подключена или недоступна. Выполнено fallback-тонирование.'
          : sourceExceedsAiUpscaleLimit
          ? `AI не использована: исходник больше безопасного лимита ${AI_UPSCALE_LIMIT_LABEL} пикселей по площади. Выполнено fallback-увеличение.`
          : 'AI не использована: выполнено fallback-увеличение OpenCV/Pillow.'
        : !params.preferAi
          ? 'AI отключена в параметрах, поэтому будет использован backend fallback.'
          : sourceExceedsAiUpscaleLimit
            ? 'Для такого размера AI не запускается: после обработки будет безопасное fallback-увеличение.'
            : !selectedModeAiAvailable
              ? selectedModeIsColorize
                ? 'Модель AI-колоризации не подключена. Режим останется рабочим через fallback-тонирование OpenCV/Pillow.'
                : serviceStatus.availabilityReason ||
                  'AI-модель увеличения разрешения не подключена. Режим останется рабочим через fallback.'
        : selectedModeIsColorize
          ? 'AI-колоризация применяется для чёрно-белых снимков при подключенной модели.'
          : 'AI применяется для увеличения разрешения при доступной модели и подходящем размере изображения.'
      : selectedModeUsesBackend
        ? 'Этот режим выполняется серверной обработкой OpenCV/Pillow без AI-модели.'
        : 'Этот сценарий пока демонстрационный и выполняется на клиенте.';

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

        {analysis ? (
          <InfoGroup title='Анализ изображения'>
            <InfoRow
              label='Рекомендация'
              value={MODE_BY_ID[analysis.recommendedMode].title}
            />
            <InfoRow
              label='Причина'
              value={analysis.reasons.join(', ')}
            />
            <InfoRow
              label='Яркость'
              value={qualityLabel(analysis.brightness, 85, 175)}
            />
            <InfoRow
              label='Контраст'
              value={qualityLabel(analysis.contrast, 35, 70)}
            />
            <InfoRow
              label='Резкость'
              value={qualityLabel(analysis.sharpness, 15, 28)}
            />
            <InfoRow
              label='Цветность'
              value={analysis.likelyGrayscale ? 'Похоже на ч/б' : 'Цветное'}
            />
          </InfoGroup>
        ) : null}

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
              !serviceStatus.apiOk
                ? 'API недоступен'
                : selectedModeCanUseAi
                  ? selectedModeAiAvailable
                    ? 'Model online'
                    : 'AI режима недоступна'
                  : serviceStatus.aiAvailable
                    ? 'Model online'
                    : 'AI недоступна'
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

function qualityLabel(value: number, low: number, normal: number): string {
  if (value < low) return 'Низкая';
  if (value < normal) return 'Средняя';
  return 'Высокая';
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
