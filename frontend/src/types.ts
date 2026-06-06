export type ProcessingMode =
  | 'auto-enhance'
  | 'super-resolution'
  | 'denoise'
  | 'sharpen'
  | 'restore-photo'
  | 'colorize-photo'
  | 'web-export';

export type ResultFormat = 'png' | 'jpeg' | 'webp';
export type ScaleFactor = 'x2' | 'x4';
export type DenoiseLevel = 'low' | 'medium' | 'high';
export type CompareView = 'slider' | 'split';
export type RuntimeMode = 'demo' | 'production';
export type BackendProcessingMode =
  | 'enhance'
  | 'restore'
  | 'denoise'
  | 'upscale'
  | 'colorize'
  | 'web';

export type ProcessStage =
  | 'idle'
  | 'file-selected'
  | 'uploading'
  | 'validating'
  | 'preprocessing'
  | 'processing'
  | 'done'
  | 'format-error'
  | 'size-error'
  | 'api-error'
  | 'fallback'
  | 'saved'
  | 'cancelled';

export type FileMeta = {
  name: string;
  type: string;
  size: number;
  width: number;
  height: number;
};

export type ResultMeta = {
  format: ResultFormat;
  size: number | null;
  width: number;
  height: number;
};

export type ProcessingParameters = {
  intensity: number;
  keepAspectRatio: boolean;
  autoResizeLarge: boolean;
  preferAi: boolean;
  resultFormat: ResultFormat;
  quality: number;
  upscaleFactor: ScaleFactor;
  denoiseLevel: DenoiseLevel;
  maxWidth: number;
  maxHeight: number;
  optimizeFileSize: boolean;
};

export type ServiceStatus = {
  apiOk: boolean;
  aiAvailable: boolean;
  runtimeMode: RuntimeMode;
  activeProcessor?: string | null;
  modelName?: string | null;
  availabilityReason?: string | null;
  aiSupportedModes?: BackendProcessingMode[];
  aiProcessors?: string[];
  fallbackAvailable?: boolean;
};

export type ProcessResult = {
  id: string;
  sourceUrl?: string;
  resultUrl: string;
  downloadUrl: string;
  mode: ProcessingMode;
  usedAi: boolean;
  modelName: string | null;
  timingMs: number;
  resultMeta: ResultMeta;
  sourceMeta: FileMeta;
  isDemo: boolean;
  statusText: string;
};

export type HistoryItem = {
  id: string;
  createdAt: string;
  fileName: string;
  sourceUrl?: string;
  downloadUrl: string;
  mode: ProcessingMode;
  status: string;
  timingMs: number;
  usedAi: boolean;
  modelName: string | null;
  sourcePreview: string;
  resultPreview: string;
  sourceMeta: FileMeta;
  resultMeta: ResultMeta;
  isDemo: boolean;
};

export type ModeDefinition = {
  id: ProcessingMode;
  title: string;
  shortTitle: string;
  iconLabel: string;
  description: string;
  bestFor: string;
  limitations: string;
  backendMode?: BackendProcessingMode;
};

export type ImageAnalysis = {
  brightness: number;
  contrast: number;
  sharpness: number;
  noise: number;
  colorfulness: number;
  lowResolution: boolean;
  exceedsAiUpscaleLimit: boolean;
  likelyGrayscale: boolean;
  recommendedMode: ProcessingMode;
  reasons: string[];
};

export type ProgressState = {
  value: number;
  label: string;
};
