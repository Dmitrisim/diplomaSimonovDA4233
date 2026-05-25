import { ACCEPTED_TYPES, MODE_BY_ID } from './constants';
import type {
  FileMeta,
  ProcessingMode,
  ProcessingParameters,
  ProcessResult,
  ProgressState,
  ResultMeta,
  ServiceStatus,
} from './types';
import { blobToDataUrl, delay, fileTypeLabel, getImageDimensions, progressStages, urlToBlob } from './utils';

type ProcessRequest = {
  file: File;
  mode: ProcessingMode;
  params: ProcessingParameters;
  sourceMeta: FileMeta;
  onProgress?: (stage: ProgressState) => void;
  signal?: AbortSignal;
};

function nextId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function emitProgress(onProgress?: (stage: ProgressState) => void, signal?: AbortSignal) {
  for (const stage of progressStages().slice(0, 4)) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    onProgress?.(stage);
    await delay(180);
  }
}

export async function getServiceStatus(): Promise<ServiceStatus> {
  try {
    const healthResp = await fetch('/api/health');
    if (!healthResp.ok) throw new Error('health_error');
    const healthData = await healthResp.json();

    let aiAvailable = Boolean(healthData?.ai_model_present);
    try {
      const modelResp = await fetch('/api/model/status');
      if (modelResp.ok) {
        const modelData = await modelResp.json();
        aiAvailable = Boolean(modelData?.available ?? modelData?.ai_model_present ?? aiAvailable);
      }
    } catch {
      // Keep health-derived value.
    }

    return {
      apiOk: true,
      aiAvailable,
      runtimeMode: 'production',
    };
  } catch {
    return {
      apiOk: false,
      aiAvailable: false,
      runtimeMode: 'demo',
    };
  }
}

export async function processImageRequest(request: ProcessRequest): Promise<ProcessResult> {
  await emitProgress(request.onProgress, request.signal);

  const modeConfig = MODE_BY_ID[request.mode];
  const canUseBackend = Boolean(modeConfig.backendMode);

  if (!canUseBackend) {
    return simulateProcess(request, `${modeConfig.title}: используется demo-режим`);
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

    const data = await response.json();
    request.onProgress?.({ value: 100, label: '100% · результат готов' });

    const resultUrl = String(data.result_url);
    const fullUrl = resultUrl.startsWith('http') ? resultUrl : resultUrl;
    const blob = await urlToBlob(fullUrl);
    const previewUrl = await blobToDataUrl(blob);
    const dimensions = await getImageDimensions(previewUrl);

    const resultMeta: ResultMeta = {
      format: request.params.resultFormat,
      size: blob.size,
      width: dimensions.width,
      height: dimensions.height,
    };

    return {
      id: String(data.job_id ?? nextId()),
      resultUrl: previewUrl,
      downloadUrl: fullUrl,
      mode: request.mode,
      usedAi: Boolean(data.used_ai),
      modelName: data.model_name ? String(data.model_name) : null,
      timingMs: Number(data.timing_ms ?? 1600),
      resultMeta,
      sourceMeta: request.sourceMeta,
      isDemo: false,
      statusText: Boolean(data.used_ai)
        ? 'Обработка выполнена с подключенной AI-моделью.'
        : 'AI-модель недоступна, использована fallback-обработка.',
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    return simulateProcess(request, 'Демо-режим: реальная AI-обработка не выполнялась');
  }
}

export async function deleteRemoteResult(id: string): Promise<void> {
  try {
    await fetch(`/api/result/${id}`, { method: 'DELETE' });
  } catch {
    // Best effort only.
  }
}

async function simulateProcess(request: ProcessRequest, statusText: string): Promise<ProcessResult> {
  if (request.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');

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
