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
  STORAGE_HISTORY_KEY,
} from './constants';
import { AboutSection } from './components/AboutSection';
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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [mode, setMode] = useState<ProcessingMode>('auto-enhance');
  const [params, setParams] =
    useState<ProcessingParameters>(DEFAULT_PARAMETERS);
  const [stage, setStage] = useState<ProcessStage>('idle');
  const [progress, setProgress] = useState<ProgressState>({
    value: 0,
    label: '0% · загрузка',
  });
  const [message, setMessage] = useState<string>(
    'Выберите изображение для начала работы.',
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
    const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved) as HistoryItem[]);
      } catch {
        localStorage.removeItem(STORAGE_HISTORY_KEY);
      }
    }
  }, []);

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
    setMessage('Выберите изображение для начала работы.');
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
      setMessage('Файл выбран. Настройте параметры и нажмите «Обработать».');
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
      downloadUrl: item.resultPreview,
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
    const blob = await urlToBlob(item.resultPreview);
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
        title: 'Загрузка и проверка',
        text: 'Поддерживаются JPG, PNG и WebP до 10 МБ с автоматическим чтением размера, формата и разрешения.',
      },
      {
        title: 'AI-режимы',
        text: 'Доступны сценарии улучшения, увеличения, шумоподавления, повышения резкости и подготовки для веба.',
      },
      {
        title: 'Контроль результата',
        text: 'Сравнение до/после, информация о параметрах обработки и сохранение последних операций в истории.',
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

  const renderSection = () => {
    switch (activeSection) {
      case 'home':
        return (
          <div className='contentStack'>
            <Hero
              onStart={() => setActiveSection('processing')}
              onExplore={() => setActiveSection('about')}
            />
            <section className='surfaceCard stackGap'>
              <div className='sectionHeading'>
                <div>
                  <div className='sectionLabel'>Workspace</div>
                  <h2 className='sectionTitle'>Быстрый старт</h2>
                </div>
                <p className='sectionMuted'>
                  Навигация устроена как у полноценного SaaS-сервиса: каждый
                  раздел открывается отдельно.
                </p>
              </div>
              <div className='sectionGrid'>
                <article className='miniCard appNavCard'>
                  <h3>Начните обработку</h3>
                  <p className='sectionText'>
                    Откройте студию обработки, загрузите изображение и получите
                    сравнение результата.
                  </p>
                  <button
                    type='button'
                    className='primaryButton'
                    onClick={() => setActiveSection('processing')}
                  >
                    Перейти к обработке
                  </button>
                </article>
                <article className='miniCard appNavCard'>
                  <h3>История</h3>
                  <p className='sectionText'>
                    Последние операции, быстрые действия и повторное открытие
                    результатов.
                  </p>
                  <button
                    type='button'
                    className='ghostButton'
                    onClick={() => setActiveSection('history')}
                  >
                    Открыть историю
                  </button>
                </article>
                <article className='miniCard appNavCard'>
                  <h3>О сервисе</h3>
                  <p className='sectionText'>
                    Технологии, возможности, инструкция и ограничения для
                    демонстрации.
                  </p>
                  <div className='buttonRow'>
                    <button
                      type='button'
                      className='ghostButton'
                      onClick={() => setActiveSection('about')}
                    >
                      О системе
                    </button>
                    <button
                      type='button'
                      className='ghostButton'
                      onClick={() => setActiveSection('help')}
                    >
                      Помощь
                    </button>
                  </div>
                </article>
              </div>
            </section>
            <section className='surfaceCard stackGap'>
              <div>
                <div className='sectionLabel'>Highlights</div>
                <h2 className='sectionTitle'>Что уже готово</h2>
              </div>
              <div className='sectionGrid'>
                {processingSummary.map((item) => (
                  <article key={item.title} className='miniCard'>
                    <h3>{item.title}</h3>
                    <p className='sectionText'>{item.text}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        );
      case 'processing':
        return (
          <section className='contentStack'>
            <section className='surfaceCard pageIntroCard'>
              <div className='sectionHeading'>
                <div>
                  <div className='sectionLabel'>Studio</div>
                  <h1 className='sectionTitle'>Обработка изображений</h1>
                </div>
                <p className='sectionMuted'>
                  Рабочая студия для загрузки файла, выбора режима и сравнения
                  результата в одном экране.
                </p>
              </div>
            </section>
            <section className='workspaceStudio'>
              <aside className='workspacePanel controlPanel'>
                <div className='workspacePanelHeader'>
                  <div>
                    <div className='sectionLabel'>Tools</div>
                    <h2 className='sectionTitle'>Панель управления</h2>
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
                      <span>Источник</span>
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
                      <span>Режим</span>
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
                      <span>Настройки</span>
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
                      <span>Запуск</span>
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
                            onClick={() => handleDownload(params.resultFormat)}
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
              </aside>

              <section className='workspacePanel canvasPanel'>
                <div className='workspacePanelHeader'>
                  <div>
                    <div className='sectionLabel'>Canvas</div>
                    <h2 className='sectionTitle'>Сравнение до/после</h2>
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
                  />
                </div>
              </section>

              <aside className='workspacePanel contextPanel'>
                <div className='workspacePanelHeader'>
                  <div>
                    <div className='sectionLabel'>Context</div>
                    <h2 className='sectionTitle'>Контекст</h2>
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
                    />
                  ) : (
                    <HistorySection
                      items={history}
                      onOpen={handleHistoryOpen}
                      onDownload={handleHistoryDownload}
                      onDelete={handleHistoryDelete}
                      onClear={handleClearHistory}
                    />
                  )}
                </div>
              </aside>
            </section>
          </section>
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
        <main className='appContent'>{renderSection()}</main>
        <Footer />
      </div>
    </div>
  );
}

export default App;
