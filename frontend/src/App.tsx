import type { ChangeEvent, DragEventHandler } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteRemoteResult,
  getServiceStatus,
  processImageRequest,
  validateFile,
} from './apiClient';
import './App.css';
import {
  DEFAULT_PARAMETERS,
  MAX_FILE_SIZE,
  MODE_DEFINITIONS,
  STORAGE_HISTORY_KEY,
} from './constants';
import { AboutSection } from './components/AboutSection';
import { ExamplesSection } from './components/ExamplesSection';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import type { AppSection } from './components/Header';
import { HelpSection } from './components/HelpSection';
import { Hero } from './components/Hero';
import { HistorySection } from './components/HistorySection';
import { InfoPanel } from './components/InfoPanel';
import { ModeSelector } from './components/ModeSelector';
import { ParametersPanel } from './components/ParametersPanel';
import { PreviewPanel } from './components/PreviewPanel';
import { UploadPanel } from './components/UploadPanel';
import type {
  CompareView,
  FileMeta,
  HistoryItem,
  ProcessResult,
  ProcessStage,
  ProcessingMode,
  ProcessingParameters,
  ProgressState,
  ServiceStatus,
} from './types';
import {
  convertImageBlob,
  createHistoryItem,
  downloadBlob,
  fileToDataUrl,
  getImageMeta,
  urlToBlob,
} from './utils';

type ControlSectionId = 'source' | 'mode' | 'settings' | 'run';
type ContextTabId = 'info' | 'history';

function readStoredHistory(): HistoryItem[] {
  const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as HistoryItem[]) : [];
  } catch {
    localStorage.removeItem(STORAGE_HISTORY_KEY);
    return [];
  }
}

function App() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    apiOk: false,
    aiAvailable: false,
    runtimeMode: 'demo',
  });
  const [file, setFile] = useState<File | null>(null);
  const [sourceMeta, setSourceMeta] = useState<FileMeta | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(readStoredHistory);
  const [mode, setMode] = useState<ProcessingMode>('auto-enhance');
  const [params, setParams] =
    useState<ProcessingParameters>(DEFAULT_PARAMETERS);
  const [stage, setStage] = useState<ProcessStage>('idle');
  const [progress, setProgress] = useState<ProgressState>({
    value: 0,
    label: '0% · загрузка',
  });
  const [message, setMessage] = useState<string>(
    'Загрузите фото, чтобы начать восстановление и улучшение.',
  );
  const [processing, setProcessing] = useState(false);
  const [compareValue, setCompareValue] = useState(50);
  const [compareView, setCompareView] = useState<CompareView>('slider');
  const [activeSection, setActiveSection] = useState<AppSection>('home');
  const [dragActive, setDragActive] = useState(false);
  const [openControlSection, setOpenControlSection] =
    useState<ControlSectionId>('source');
  const [contextTab, setContextTab] = useState<ContextTabId>('info');

  useEffect(() => {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const run = async () => {
      const status = await getServiceStatus();
      setServiceStatus(status);
    };
    run();
  }, []);

  useEffect(() => {
    return () => {
      if (sourceUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(sourceUrl);
      }
      abortControllerRef.current?.abort();
    };
  }, [sourceUrl]);

  const canProcess = Boolean(file && sourceMeta && !processing);
  const currentInfoMessage = useMemo(() => {
    if (result?.isDemo) {
      return 'Демо-режим: реальная AI-обработка не выполнялась.';
    }
    return message;
  }, [message, result]);

  const updateParam = <K extends keyof ProcessingParameters>(
    key: K,
    value: ProcessingParameters[K],
  ) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const setWorkflowToIdle = () => {
    setResult(null);
    setCompareValue(50);
    setStage(file ? 'file-selected' : 'idle');
  };

  const clearAll = () => {
    abortControllerRef.current?.abort();
    if (sourceUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(sourceUrl);
    }
    setFile(null);
    setSourceMeta(null);
    setSourceUrl(null);
    setResult(null);
    setStage('idle');
    setMessage('Загрузите фото, чтобы начать восстановление и улучшение.');
    setProcessing(false);
    setCompareValue(50);
  };

  const selectFile = async (selected: File | null) => {
    if (!selected) {
      clearAll();
      return;
    }

    const validationError = validateFile(selected);
    if (validationError) {
      setStage('format-error');
      setMessage(validationError);
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setStage('size-error');
      setMessage('Размер файла превышает 10 МБ.');
      return;
    }

    try {
      const meta = await getImageMeta(selected);
      if (sourceUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(sourceUrl);
      }
      setFile(selected);
      setSourceMeta(meta);
      setSourceUrl(URL.createObjectURL(selected));
      setResult(null);
      setStage('file-selected');
      setActiveSection('processing');
      setOpenControlSection('mode');
      setContextTab('info');
      setMessage('Фото загружено. Выберите сценарий и запустите обработку.');
      setCompareValue(50);
    } catch {
      setStage('format-error');
      setMessage('Не удалось прочитать изображение.');
    }
  };

  const onInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    await selectFile(e.target.files?.[0] ?? null);
  };

  const onDrop: DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    setDragActive(false);
    await selectFile(e.dataTransfer.files?.[0] ?? null);
  };

  const onDragOver: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    if (!dragActive) setDragActive(true);
  };

  const onDragLeave: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handlePick = () => {
    inputRef.current?.click();
  };

  const openModeInWorkspace = (nextMode: ProcessingMode) => {
    setMode(nextMode);
    setActiveSection('processing');
    setOpenControlSection(hasSource ? 'settings' : 'source');
    setContextTab('info');
    if (!hasSource) {
      setMessage(
        'Выберите файл, затем настройте параметры и запустите обработку.',
      );
    }
  };

  const handleProcess = async () => {
    if (!file || !sourceMeta) {
      setStage('idle');
      setMessage('Нельзя запустить обработку без выбранного файла.');
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setProcessing(true);
    setProgress({ value: 0, label: '0% · загрузка' });
    setStage('uploading');
    setMessage('Идет подготовка изображения и запуск обработки...');

    try {
      const processed = await processImageRequest({
        file,
        mode,
        params,
        sourceMeta,
        signal: controller.signal,
        onProgress: (nextProgress) => {
          setProgress(nextProgress);
          if (nextProgress.value === 25) setStage('validating');
          else if (nextProgress.value === 50) setStage('preprocessing');
          else if (nextProgress.value === 75) setStage('processing');
          else if (nextProgress.value === 100) setStage('done');
        },
      });

      setResult(processed);
      setStage(processed.isDemo ? 'fallback' : 'done');
      setActiveSection('processing');
      setContextTab('info');
      setMessage(processed.statusText);

      const sourcePreview = await fileToDataUrl(file);
      const historyItem = createHistoryItem({
        id: processed.id,
        fileName: sourceMeta.name,
        downloadUrl: processed.downloadUrl,
        mode,
        status: processed.isDemo ? 'demo' : 'готово',
        timingMs: processed.timingMs,
        usedAi: processed.usedAi,
        modelName: processed.modelName,
        sourcePreview,
        resultPreview: processed.resultUrl,
        sourceMeta,
        resultMeta: processed.resultMeta,
        isDemo: processed.isDemo,
      });

      setHistory((prev) => [historyItem, ...prev].slice(0, 12));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setStage('cancelled');
        setMessage('Обработка отменена пользователем.');
      } else {
        setStage('api-error');
        setMessage(
          'Ошибка API. Используйте demo mode или повторите попытку позже.',
        );
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleResetSettings = () => {
    setParams(DEFAULT_PARAMETERS);
    setMessage('Параметры сброшены к значениям по умолчанию.');
  };

  const handleDownload = async (format: 'png' | 'jpeg' | 'webp') => {
    if (!result) return;
    try {
      const blob = await urlToBlob(result.downloadUrl || result.resultUrl);
      const converted = await convertImageBlob(blob, format, params.quality);
      const baseName =
        sourceMeta?.name.replace(/\.[^.]+$/, '') || 'processed-image';
      downloadBlob(
        converted,
        `${baseName}.${format === 'jpeg' ? 'jpg' : format}`,
      );
      setStage('saved');
      setMessage('Результат успешно сохранен.');
    } catch {
      setMessage('Не удалось скачать результат.');
    }
  };

  const handleHistoryOpen = (item: HistoryItem) => {
    setSourceMeta(item.sourceMeta);
    setSourceUrl(item.sourcePreview);
    setResult({
      id: item.id,
      resultUrl: item.resultPreview,
      downloadUrl: item.downloadUrl || item.resultPreview,
      mode: item.mode,
      usedAi: item.usedAi,
      modelName: item.modelName,
      timingMs: item.timingMs,
      resultMeta: item.resultMeta,
      sourceMeta: item.sourceMeta,
      isDemo: item.isDemo,
      statusText: item.isDemo
        ? 'Открыт результат из demo-истории.'
        : 'Открыт результат из истории.',
    });
    setMode(item.mode);
    setActiveSection('processing');
    setContextTab('info');
    setStage('done');
    setMessage('Запись из истории открыта.');
  };

  const handleHistoryDownload = async (item: HistoryItem) => {
    const blob = await urlToBlob(item.downloadUrl || item.resultPreview);
    downloadBlob(blob, item.fileName.replace(/\.[^.]+$/, '') + '.png');
  };

  const handleHistoryDelete = async (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    await deleteRemoteResult(id);
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_HISTORY_KEY);
  };

  const processingSummary = useMemo(
    () => [
      {
        icon: 'IMG',
        title: 'Поддержка JPG, PNG, WebP',
        text: 'Загрузите популярные форматы и сразу переходите к восстановлению или улучшению.',
      },
      {
        icon: 'AI',
        title: 'Сценарии восстановления',
        text: 'Подберите понятный сценарий: убрать шум, повысить четкость, восстановить старый снимок.',
      },
      {
        icon: 'HIS',
        title: 'История последних результатов',
        text: 'Открывайте, скачивайте и возвращайтесь к недавним обработкам без повторной загрузки.',
      },
    ],
    [],
  );

  const featuredScenarios = useMemo(
    () =>
      MODE_DEFINITIONS.map((item) => ({
        id: item.id,
        icon: item.iconLabel,
        title: item.shortTitle,
        text: item.bestFor,
      })),
    [],
  );

  const restorationIssues = useMemo(
    () => [
      { icon: 'SP', title: 'Царапины и пятна', tone: 'amber' },
      { icon: 'NZ', title: 'Шум и зернистость', tone: 'blue' },
      { icon: 'BL', title: 'Размытие', tone: 'violet' },
      { icon: 'HD', title: 'Низкое разрешение', tone: 'cyan' },
      { icon: 'CL', title: 'Тусклые цвета', tone: 'peach' },
      { icon: 'WB', title: 'Большой размер файла', tone: 'green' },
    ],
    [],
  );

  const processingStartScenarios = useMemo(
    () =>
      MODE_DEFINITIONS.slice(0, 4).map((item) => ({
        id: item.id,
        title: item.title,
        icon: item.iconLabel,
        text: item.bestFor,
      })),
    [],
  );

  const homeWorkflow = useMemo(
    () => [
      {
        icon: 'UP',
        title: 'Загрузите изображение',
        text: 'Добавьте фото или скан в формате JPG, PNG или WebP.',
      },
      {
        icon: 'FX',
        title: 'Выберите сценарий',
        text: 'Укажите, что именно нужно исправить на изображении.',
      },
      {
        icon: 'ADJ',
        title: 'Настройте параметры',
        text: 'Настройте интенсивность, формат результата и дополнительные опции.',
      },
      {
        icon: 'CMP',
        title: 'Сравните результат',
        text: 'Сравните исходник и улучшенную версию в одном окне.',
      },
      {
        icon: 'DL',
        title: 'Скачайте файл',
        text: 'Сохраните готовый результат в удобном формате.',
      },
    ],
    [],
  );

  const hasSource = Boolean(sourceMeta);
  const processingWorkspaceState = hasSource
    ? result
      ? 'Результат готов к просмотру'
      : 'Файл загружен, настройте обработку'
    : 'Ожидание загрузки изображения';
  const controlPipeline = useMemo(
    () => [
      {
        id: 'source',
        step: '01',
        title: 'Источник',
        text: sourceMeta ? sourceMeta.name : 'Загрузите JPG, PNG или WebP',
        state: !hasSource
          ? 'current'
          : openControlSection === 'source'
            ? 'current'
            : 'done',
      },
      {
        id: 'mode',
        step: '02',
        title: 'Режим',
        text: hasSource
          ? 'Выберите подходящий сценарий'
          : 'Станет доступно после загрузки',
        state: !hasSource
          ? 'locked'
          : openControlSection === 'mode'
            ? 'current'
            : 'ready',
      },
      {
        id: 'settings',
        step: '03',
        title: 'Параметры',
        text: hasSource
          ? 'Интенсивность, формат и AI-параметры'
          : 'Ожидает предыдущий шаг',
        state: !hasSource
          ? 'locked'
          : openControlSection === 'settings'
            ? 'current'
            : 'ready',
      },
      {
        id: 'run',
        step: '04',
        title: 'Запуск',
        text: processing
          ? 'Обработка выполняется'
          : hasSource
            ? 'Запустите обработку и сохраните результат'
            : 'Будет доступно после настройки',
        state: !hasSource
          ? 'locked'
          : openControlSection === 'run'
            ? 'current'
            : result
              ? 'done'
              : 'ready',
      },
    ],
    [hasSource, openControlSection, processing, result, sourceMeta],
  );

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return (
          <div className='contentStack'>
            <Hero
              onStart={() => setActiveSection('processing')}
              onExplore={() => setActiveSection('examples')}
            />
            <section className='surfaceCard stackGap problemGridSection'>
              <div>
                <h2 className='sectionTitle'>Что можно исправить</h2>
                <p className='sectionMuted'>
                  Сервис помогает решать конкретные проблемы изображения, а не
                  просто запускать абстрактную AI-обработку.
                </p>
              </div>
              <div className='problemGrid'>
                {restorationIssues.map((item) => (
                  <article
                    key={item.title}
                    className={`problemCard tone-${item.tone}`}
                  >
                    <span className='problemIcon'>{item.icon}</span>
                    <strong>{item.title}</strong>
                  </article>
                ))}
              </div>
            </section>
            <ExamplesSection
              compact
              title='Примеры обработки'
              description='Смотрите, как меняется фото после удаления шума, реставрации, повышения четкости и подготовки для сайта.'
              onTryMode={openModeInWorkspace}
            />
            <section className='surfaceCard stackGap scenariosSection'>
              <div className='sectionHeading'>
                <div>
                  <h2 className='sectionTitle'>
                    Что нужно сделать с изображением?
                  </h2>
                  <p className='sectionMuted'>
                    Выберите понятный сценарий: восстановить старый снимок, убрать
                    шум, повысить четкость или подготовить изображение для
                    сайта.
                  </p>
                </div>
              </div>
              <div className='scenarioRibbon' role='list'>
                {featuredScenarios.map((item, index) => (
                  <button
                    key={item.id}
                    type='button'
                    className={`scenarioCard tone-${['blue', 'violet', 'cyan', 'orange'][index % 4]}`}
                    onClick={() => openModeInWorkspace(item.id)}
                  >
                    <span className='scenarioIcon'>{item.icon}</span>
                    <strong>{item.title}</strong>
                    <span>{item.text}</span>
                  </button>
                ))}
              </div>
            </section>
            <section className='surfaceCard stackGap homeWorkflowSection'>
              <div>
                <h2 className='sectionTitle'>Как это работает</h2>
                <p className='sectionMuted'>
                  Загрузите фото, выберите сценарий и скачайте готовый результат
                  после сравнения до/после.
                </p>
              </div>
              <div className='workflowRow'>
                {homeWorkflow.map((item, index) => (
                  <article key={item.title} className='workflowStepCard'>
                    <div className='workflowStepIcon'>{item.icon}</div>
                    <div className='workflowStepContent'>
                      <h3>{item.title}</h3>
                      <p className='sectionText'>{item.text}</p>
                    </div>
                    {index < homeWorkflow.length - 1 ? (
                      <div className='workflowConnector' aria-hidden='true'>
                        →
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
            <section className='surfaceCard stackGap homeFeaturesSection'>
              <div>
                <h2 className='sectionTitle'>Почему сервис удобен</h2>
                <p className='sectionMuted'>
                  Всё важное собрано в одном интерфейсе: загрузка, обработка,
                  сравнение и история.
                </p>
              </div>
              <div className='sectionGrid compactFeatureGrid'>
                {processingSummary.map((item) => (
                  <article key={item.title} className='miniCard featureCard'>
                    <div className='featureCardBadge'>{item.icon}</div>
                    <h3>{item.title}</h3>
                    <p className='sectionText'>{item.text}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        );
      case 'processing':
        if (!hasSource) {
          return (
            <section className='processingStartScreen'>
              <aside className='surfaceCard processingStartRail'>
                <div className='processingStartCopy'>
                  <span className='processingStartEyebrow'>
                    Photo Lab onboarding
                  </span>
                  <h1 className='sectionTitle'>
                    Восстановите и улучшите изображение за минуту
                  </h1>
                  <p className='sectionMuted'>
                    Загрузите фото, выберите сценарий обработки и сравните
                    результат до/после прямо в браузере.
                  </p>
                </div>
                <div className='processingStartSteps'>
                  {homeWorkflow.slice(0, 3).map((item, index) => (
                    <div key={item.title} className='processingStartStep'>
                      <span className='processingStartStepIndex'>
                        {index + 1}
                      </span>
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>

              <section className='surfaceCard processingStartMain'>
                <div className='processingStartMainHeader'>
                  <div>
                    <h2 className='sectionTitle'>Загрузить фото</h2>
                    <p className='sectionMuted'>
                      После загрузки откроется рабочая студия с настройками,
                      сравнением результата и кнопками сохранения.
                    </p>
                  </div>
                  <span className='panelStateChip panelStateChipAccent'>
                    JPG / PNG / WebP
                  </span>
                </div>
                <UploadPanel
                  inputRef={inputRef}
                  fileMeta={sourceMeta}
                  previewUrl={sourceUrl}
                  isDragActive={dragActive}
                  onInputChange={onInputChange}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onPickClick={handlePick}
                  onClear={clearAll}
                />
              </section>

              <aside className='surfaceCard processingStartScenarios'>
                <div>
                  <h2 className='sectionTitle'>Популярные сценарии</h2>
                  <p className='sectionMuted'>
                    Выберите подходящий вариант сразу после загрузки фото.
                  </p>
                </div>
                <div className='processingStartScenarioList'>
                  {processingStartScenarios.map((item) => (
                    <button
                      key={item.id}
                      type='button'
                      className='processingStartScenarioCard'
                      onClick={() => openModeInWorkspace(item.id)}
                    >
                      <span className='processingStartScenarioIcon'>
                        {item.icon}
                      </span>
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.text}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>
            </section>
          );
        }

        return (
          <section className='workspaceStudio'>
            <section className='workspacePanel canvasPanel workspacePrimaryPanel'>
              <div className='workspacePanelShell'>
                <div className='workspacePanelHeader'>
                  <div>
                    <h2 className='sectionTitle'>Сравнение результата</h2>
                    <p className='sectionMuted'>
                      Сравните исходное фото и улучшенную версию в одном окне.
                    </p>
                  </div>
                  <span className='panelStateChip panelStateChipAccent'>
                    {compareView === 'slider' ? 'Слайдер' : 'Рядом'}
                  </span>
                </div>
                <div className='canvasPanelBody'>
                  <PreviewPanel
                    sourceUrl={sourceUrl}
                    result={result}
                    compareValue={compareValue}
                    compareView={compareView}
                    isProcessing={processing}
                    onCompareValueChange={setCompareValue}
                    onCompareViewChange={setCompareView}
                    onReprocess={handleProcess}
                    onReset={setWorkflowToIdle}
                    onDownload={handleDownload}
                    onPickFile={handlePick}
                  />
                </div>
              </div>
            </section>

            <section className='workspaceSupportStack'>
              <aside className='workspacePanel controlPanel'>
                <div className='workspacePanelShell'>
                  <div className='workspacePanelHeader'>
                    <div>
                      <h2 className='sectionTitle'>Панель обработки</h2>
                      <p className='sectionMuted'>
                        Выберите сценарий, настройте параметры и запустите
                        обработку изображения.
                      </p>
                      <div className='pipelineOverview'>
                        {controlPipeline.map((item) => (
                          <div
                            key={item.id}
                            className={`pipelineOverviewItem is-${item.state}`}
                          >
                            <span className='pipelineOverviewStep'>
                              {item.step}
                            </span>
                            <div className='pipelineOverviewBody'>
                              <strong>{item.title}</strong>
                              <span>{item.text}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <span className='panelStateChip'>
                      {processingWorkspaceState}
                    </span>
                  </div>
                  <div className='workspacePanelBody'>
                    <section className='controlSection'>
                      <button
                        type='button'
                        className='controlSectionToggle isOpen'
                        onClick={() => setOpenControlSection('source')}
                      >
                        <span className='pipelineStepTitle'>
                          <span className='pipelineStepNumber'>1</span>
                          <span>Источник</span>
                        </span>
                        <span className='controlSectionMeta'>
                          {sourceMeta ? 'файл загружен' : 'ожидает файл'}
                        </span>
                      </button>
                      <div
                        className={`controlSectionBody ${openControlSection === 'source' ? 'isOpen' : ''}`}
                      >
                        <UploadPanel
                          inputRef={inputRef}
                          fileMeta={sourceMeta}
                          previewUrl={sourceUrl}
                          isDragActive={dragActive}
                          onInputChange={onInputChange}
                          onDrop={onDrop}
                          onDragOver={onDragOver}
                          onDragLeave={onDragLeave}
                          onPickClick={handlePick}
                          onClear={clearAll}
                        />
                      </div>
                    </section>

                    <section className='controlSection'>
                      <button
                        type='button'
                        className={`controlSectionToggle ${openControlSection === 'mode' ? 'isOpen' : ''}`}
                        disabled={!hasSource}
                        onClick={() => setOpenControlSection('mode')}
                      >
                        <span className='pipelineStepTitle'>
                          <span className='pipelineStepNumber'>2</span>
                          <span>Режим</span>
                        </span>
                        <span className='controlSectionMeta'>
                          {hasSource
                            ? 'выберите сценарий'
                            : 'недоступно до загрузки'}
                        </span>
                      </button>
                      <div
                        className={`controlSectionBody ${openControlSection === 'mode' ? 'isOpen' : ''}`}
                      >
                        <ModeSelector mode={mode} onChange={setMode} />
                      </div>
                    </section>

                    <section className='controlSection'>
                      <button
                        type='button'
                        className={`controlSectionToggle ${openControlSection === 'settings' ? 'isOpen' : ''}`}
                        disabled={!hasSource}
                        onClick={() => setOpenControlSection('settings')}
                      >
                        <span className='pipelineStepTitle'>
                          <span className='pipelineStepNumber'>3</span>
                          <span>Параметры</span>
                        </span>
                        <span className='controlSectionMeta'>
                          {hasSource
                            ? 'интенсивность, формат, AI'
                            : 'станут доступны позже'}
                        </span>
                      </button>
                      <div
                        className={`controlSectionBody ${openControlSection === 'settings' ? 'isOpen' : ''}`}
                      >
                        <ParametersPanel
                          mode={mode}
                          params={params}
                          onChange={updateParam}
                        />
                      </div>
                    </section>

                    <section className='controlSection'>
                      <button
                        type='button'
                        className={`controlSectionToggle ${openControlSection === 'run' ? 'isOpen' : ''}`}
                        disabled={!hasSource}
                        onClick={() => setOpenControlSection('run')}
                      >
                        <span className='pipelineStepTitle'>
                          <span className='pipelineStepNumber'>4</span>
                          <span>Запуск</span>
                        </span>
                        <span className='controlSectionMeta'>
                          {processing
                            ? 'обработка выполняется'
                            : 'запустите pipeline'}
                        </span>
                      </button>
                      <div
                        className={`controlSectionBody ${openControlSection === 'run' ? 'isOpen' : ''}`}
                      >
                        <section className='surfaceCard stackGap actionCard'>
                          <div className='buttonGrid'>
                            <button
                              type='button'
                              className='primaryButton'
                              disabled={!canProcess}
                              onClick={handleProcess}
                            >
                              Запустить обработку
                            </button>
                            <button
                              type='button'
                              className='ghostButton'
                              disabled={!processing}
                              onClick={handleCancel}
                            >
                              Отменить
                            </button>
                            <button
                              type='button'
                              className='ghostButton'
                              onClick={handleResetSettings}
                            >
                              Сбросить
                            </button>
                            <button
                              type='button'
                              className='dangerButton'
                              disabled={!file && !result}
                              onClick={clearAll}
                            >
                              Очистить
                            </button>
                            <button
                              type='button'
                              className='successButton'
                              disabled={!result}
                              onClick={() =>
                                handleDownload(params.resultFormat)
                              }
                            >
                              Скачать результат
                            </button>
                          </div>

                          <div className='statusPanel'>
                            <div className='statusHeader'>
                              <strong>Состояние обработки</strong>
                              <span>{progress.label}</span>
                            </div>
                            <div className='progressBar'>
                              <div
                                className='progressValue'
                                style={{ width: `${progress.value}%` }}
                              />
                            </div>
                            <p
                              className={`statusMessage ${stage.includes('error') ? 'isError' : ''}`}
                            >
                              {currentInfoMessage}
                            </p>
                          </div>
                        </section>
                      </div>
                    </section>
                  </div>
                </div>
              </aside>

              <aside className='workspacePanel contextPanel'>
                <div className='workspacePanelShell'>
                  <div className='workspacePanelHeader'>
                    <div>
                      <h2 className='sectionTitle'>Информация</h2>
                      <p className='sectionMuted'>
                        Загрузите фото - здесь появятся размер, формат и
                        результат обработки.
                      </p>
                    </div>
                    <div className='segmentedControl compactSegmented'>
                      <button
                        type='button'
                        className={contextTab === 'info' ? 'active' : ''}
                        onClick={() => setContextTab('info')}
                      >
                        Инфо
                      </button>
                      <button
                        type='button'
                        className={contextTab === 'history' ? 'active' : ''}
                        onClick={() => setContextTab('history')}
                      >
                        История
                      </button>
                    </div>
                  </div>
                  <div className='workspacePanelBody'>
                    {contextTab === 'info' ? (
                      <InfoPanel
                        sourceMeta={sourceMeta}
                        result={result}
                        mode={mode}
                        params={params}
                        stage={stage}
                        serviceStatus={serviceStatus}
                      />
                    ) : (
                      <HistorySection
                        items={history}
                        onOpen={handleHistoryOpen}
                        onDownload={handleHistoryDownload}
                        onDelete={handleHistoryDelete}
                        onClear={handleClearHistory}
                        onGoToProcessing={() => setActiveSection('processing')}
                      />
                    )}
                  </div>
                </div>
              </aside>
            </section>
          </section>
        );
      case 'examples':
        return (
          <div className='contentStack'>
            <section className='surfaceCard pageIntroCard examplesIntroCard'>
              <div className='sectionHeading'>
                <div>
                  <h1 className='sectionTitle'>Примеры обработки</h1>
                  <p className='sectionMuted'>
                    Галерея показывает, как сервис справляется со старым фото,
                    шумом, мягкостью и подготовкой изображений для сайта.
                  </p>
                </div>
                <button
                  type='button'
                  className='primaryButton'
                  onClick={() => setActiveSection('processing')}
                >
                  Открыть обработку
                </button>
              </div>
            </section>
            <ExamplesSection
              showFilter
              title='Галерея до / после'
              description='Фильтруйте примеры по проблемам изображения и открывайте нужный сценарий прямо в рабочей студии.'
              onTryMode={openModeInWorkspace}
            />
          </div>
        );
      case 'history':
        return (
          <div className='contentStack'>
            <section className='surfaceCard pageIntroCard'>
              <div className='sectionHeading'>
                <div>
                  <div className='sectionLabel'>Журнал операций</div>
                  <h1 className='sectionTitle'>История обработок</h1>
                </div>
                <p className='sectionMuted'>
                  Последние результаты сохраняются локально и доступны для
                  быстрого открытия и скачивания.
                </p>
              </div>
            </section>
            <HistorySection
              items={history}
              onOpen={handleHistoryOpen}
              onDownload={handleHistoryDownload}
              onDelete={handleHistoryDelete}
              onClear={handleClearHistory}
              onGoToProcessing={() => setActiveSection('processing')}
            />
          </div>
        );
      case 'about':
        return (
          <div className='contentStack'>
            <section className='surfaceCard pageIntroCard'>
              <div className='sectionHeading'>
                <div>
                  <div className='sectionLabel'>Описание проекта</div>
                  <h1 className='sectionTitle'>О системе</h1>
                </div>
                <p className='sectionMuted'>
                  Назначение сервиса, технологии, архитектура и возможности
                  клиентской части.
                </p>
              </div>
            </section>
            <AboutSection />
          </div>
        );
      case 'help':
        return (
          <div className='contentStack'>
            <section className='surfaceCard pageIntroCard'>
              <div className='sectionHeading'>
                <div>
                  <div className='sectionLabel'>Инструкция</div>
                  <h1 className='sectionTitle'>Помощь и ограничения</h1>
                </div>
                <p className='sectionMuted'>
                  Пошаговая инструкция по работе с сервисом и ограничения для
                  демонстрации результата.
                </p>
              </div>
            </section>
            <HelpSection />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className='pageShell'>
      <div className='page'>
        <Header
          apiOk={serviceStatus.apiOk}
          aiAvailable={serviceStatus.aiAvailable}
          runtimeMode={serviceStatus.runtimeMode}
          activeSection={activeSection}
          onNavigate={setActiveSection}
        />
        <main
          className={`appContent ${activeSection === 'processing' ? 'isProcessingSection' : ''}`}
        >
          {renderSection()}
        </main>
        {activeSection !== 'processing' ? <Footer /> : null}
      </div>
    </div>
  );
}

export default App;
