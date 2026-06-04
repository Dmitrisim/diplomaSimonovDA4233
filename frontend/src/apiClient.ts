import { ACCEPTED_TYPES, AI_UPSCALE_LIMIT_PIXELS, MODE_BY_ID } from './constants';
import type {
  BackendProcessingMode,
  FileMeta,
  ProcessingMode,
  ProcessingParameters,
  ProcessResult,
  ProgressState,
  ResultMeta,
  ServiceStatus,
} from './types';
import {
  blobToDataUrl,
  delay,
  fileTypeLabel,
  progressStages,
  urlToBlob,
} from './utils';

type ProcessRequest = {
  file: File;
  mode: ProcessingMode;
  params: ProcessingParameters;
  sourceMeta: FileMeta;
  onProgress?: (stage: ProgressState) => void;
  signal?: AbortSignal;
};

type BackendProcessResponse = {
  id: string;
  status: string;
  message: string;
  input: {
    filename: string | null;
    format: string | null;
    size_bytes: number | null;
    width: number | null;
    height: number | null;
  };
  output: {
    filename: string;
    format: string;
    size_bytes: number;
    width: number;
    height: number;
  };
  processing: {
    mode: string;
    used_ai: boolean;
    model: string | null;
    time_ms: number | null;
  };
  urls: {
    result: string;
    download: string;
  };
};

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toResultFormat(
  value: string | null | undefined,
): 'png' | 'jpeg' | 'webp' {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'jpg' || normalized === 'jpeg') return 'jpeg';
  if (normalized === 'webp') return 'webp';
  return 'png';
}

function isBackendProcessingMode(value: unknown): value is BackendProcessingMode {
  return (
    value === 'enhance' ||
    value === 'restore' ||
    value === 'upscale' ||
    value === 'colorize'
  );
}

async function emitProgress(
  onProgress?: (stage: ProgressState) => void,
  signal?: AbortSignal,
) {
  for (const stage of progressStages().slice(0, 4)) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    onProgress?.(stage);
    await delay(180);
  }
}

function buildBackendStatusText(
  data: BackendProcessResponse,
  backendMode: NonNullable<(typeof MODE_BY_ID)[ProcessingMode]['backendMode']>,
  preferAi: boolean,
  sourceMeta: FileMeta,
): string {
  const usedAi = Boolean(data.processing?.used_ai);
  const model = data.processing?.model || 'fallback-opencv-pillow';
  const sourceExceedsAiUpscaleLimit =
    sourceMeta.width * sourceMeta.height > AI_UPSCALE_LIMIT_PIXELS;

  if (usedAi) {
    return `Результат готов. Использована AI-модель ${model}.`;
  }

  if (backendMode === 'upscale') {
    if (preferAi && sourceExceedsAiUpscaleLimit) {
      return 'Результат готов. Исходник больше лимита AI-upscale, поэтому выполнено безопасное fallback-увеличение OpenCV/Pillow.';
    }

    return preferAi
      ? 'Результат готов. Для этого изображения использована fallback-обработка OpenCV/Pillow вместо AI.'
      : 'Результат готов. AI отключена в параметрах, использована fallback-обработка OpenCV/Pillow.';
  }

  if (backendMode === 'colorize') {
    return preferAi
      ? 'Результат готов. AI-колоризация недоступна, выполнено fallback-тонирование OpenCV/Pillow.'
      : 'Результат готов. AI отключена в параметрах, выполнено fallback-тонирование OpenCV/Pillow.';
  }

  return 'Результат готов. Режим выполнен backend-обработкой OpenCV/Pillow.';
}

export async function getServiceStatus(): Promise<ServiceStatus> {
  try {
    const healthResp = await fetch('/api/health');
    if (!healthResp.ok) throw new Error('health_error');
    const healthData = await healthResp.json();

    let aiAvailable = Boolean(healthData?.ai_model_present);
    let activeProcessor: string | null = null;
    let modelName: string | null = null;
    let availabilityReason: string | null = null;
    let aiSupportedModes: BackendProcessingMode[] = [];
    let aiProcessors: string[] = [];
    let fallbackAvailable = true;
    try {
      const modelResp = await fetch('/api/model/status');
      if (modelResp.ok) {
        const modelData = await modelResp.json();
        aiAvailable = Boolean(
          modelData?.available ?? modelData?.ai_model_present ?? aiAvailable,
        );
        activeProcessor = modelData?.active_processor
          ? String(modelData.active_processor)
          : null;
        modelName = modelData?.model ? String(modelData.model) : null;
        availabilityReason = modelData?.availability_reason
          ? String(modelData.availability_reason)
          : null;
        aiSupportedModes = Array.isArray(modelData?.ai_supported_modes)
          ? modelData.ai_supported_modes.filter(isBackendProcessingMode)
          : [];
        aiProcessors = Array.isArray(modelData?.ai_processors)
          ? modelData.ai_processors.map(String)
          : [];
        fallbackAvailable = Boolean(
          modelData?.fallback_available ?? fallbackAvailable,
        );
      }
    } catch {
      // Keep health-derived value.
    }

    return {
      apiOk: true,
      aiAvailable,
      runtimeMode: 'production',
      activeProcessor,
      modelName,
      availabilityReason,
      aiSupportedModes,
      aiProcessors,
      fallbackAvailable,
    };
  } catch {
    return {
      apiOk: false,
      aiAvailable: false,
      runtimeMode: 'demo',
      activeProcessor: null,
      modelName: null,
      availabilityReason: 'API недоступен',
      aiSupportedModes: [],
      aiProcessors: [],
      fallbackAvailable: false,
    };
  }
}

export async function processImageRequest(
  request: ProcessRequest,
): Promise<ProcessResult> {
  await emitProgress(request.onProgress, request.signal);

  const modeConfig = MODE_BY_ID[request.mode];
  const canUseBackend = Boolean(modeConfig.backendMode);

  if (!canUseBackend) {
    return simulateProcess(
      request,
      `${modeConfig.title}: используется demo-режим`,
    );
  }

  try {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('prefer_ai', request.params.preferAi ? 'true' : 'false');
    formData.append('mode', modeConfig.backendMode!);

    const response = await fetch('/api/process', {
      method: 'POST',
      body: formData,
      signal: request.signal,
    });

    if (!response.ok) {
      throw new Error(`api_error_${response.status}`);
    }

    const data = (await response.json()) as BackendProcessResponse;
    request.onProgress?.({ value: 100, label: '100% · результат готов' });

    const downloadUrl = String(data.urls?.download || '');
    if (!downloadUrl) {
      throw new Error('api_error_invalid_contract');
    }

    const blob = await urlToBlob(downloadUrl);
    const previewUrl = await blobToDataUrl(blob);

    const resultMeta: ResultMeta = {
      format: toResultFormat(data.output?.format),
      size: Number(data.output?.size_bytes ?? blob.size),
      width: Number(data.output?.width ?? request.sourceMeta.width),
      height: Number(data.output?.height ?? request.sourceMeta.height),
    };

    return {
      id: String(data.id ?? nextId()),
      resultUrl: previewUrl,
      downloadUrl,
      mode: request.mode,
      usedAi: Boolean(data.processing?.used_ai),
      modelName: data.processing?.model ? String(data.processing.model) : null,
      timingMs: Number(data.processing?.time_ms ?? 1600),
      resultMeta,
      sourceMeta: {
        name: String(data.input?.filename || request.sourceMeta.name),
        type: request.sourceMeta.type,
        size: Number(data.input?.size_bytes ?? request.sourceMeta.size),
        width: Number(data.input?.width ?? request.sourceMeta.width),
        height: Number(data.input?.height ?? request.sourceMeta.height),
      },
      isDemo: false,
      statusText: buildBackendStatusText(
        data,
        modeConfig.backendMode!,
        request.params.preferAi,
        request.sourceMeta,
      ),
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    return simulateProcess(
      request,
      'Демо-режим: реальная AI-обработка не выполнялась',
    );
  }
}

export async function deleteRemoteResult(id: string): Promise<void> {
  try {
    await fetch(`/api/result/${id}`, { method: 'DELETE' });
  } catch {
    // Best effort only.
  }
}

async function simulateProcess(
  request: ProcessRequest,
  statusText: string,
): Promise<ProcessResult> {
  if (request.signal?.aborted)
    throw new DOMException('Cancelled', 'AbortError');

  await delay(350);
  request.onProgress?.({ value: 100, label: '100% · результат готов' });

  const sourceDataUrl = await blobToDataUrl(request.file);
  const resultMeta: ResultMeta = {
    format: request.params.resultFormat,
    size: request.file.size,
    width: request.sourceMeta.width,
    height: request.sourceMeta.height,
  };

  return {
    id: nextId(),
    resultUrl: sourceDataUrl,
    downloadUrl: sourceDataUrl,
    mode: request.mode,
    usedAi: false,
    modelName: 'не подключена',
    timingMs: 2200,
    resultMeta,
    sourceMeta: request.sourceMeta,
    isDemo: true,
    statusText,
  };
}

export function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `Неподдерживаемый формат. Допустимы: JPG, PNG, WebP. Получено: ${fileTypeLabel(file.type)}`;
  }
  if (file.size <= 0) {
    return 'Файл пустой.';
  }
  return null;
}
