import type { ChangeEvent, DragEventHandler } from 'react';
import { useEffect, useRef, useState } from 'react';
import './App.css';

type Mode = 'enhance' | 'upscale';

type HistoryItem = {
  jobId: string;
  createdAt: number;
  fileName: string;
  mode: Mode;
  preferAi: boolean;
  usedAi: boolean;
  modelName: string | null;
  timingMs: number | null;
  input: { width: number; height: number; bytes: number } | null;
  output: { width: number; height: number; bytes: number } | null;
  resultUrl: string;
  srcUrl: string;
};

function App() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const currentSrcUrlRef = useRef<string | null>(null);
  const historyRef = useRef<HistoryItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [preferAi, setPreferAi] = useState(true);
  const [mode, setMode] = useState<Mode>('enhance');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [compare, setCompare] = useState(55);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [usedAi, setUsedAi] = useState<boolean | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const [aiModelPresent, setAiModelPresent] = useState<boolean | null>(null);
  const [timingMs, setTimingMs] = useState<number | null>(null);
  const [inputMeta, setInputMeta] = useState<HistoryItem['input']>(null);
  const [outputMeta, setOutputMeta] = useState<HistoryItem['output']>(null);
  const [currentSrcUrl, setCurrentSrcUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    return () => {
      if (currentSrcUrlRef.current) URL.revokeObjectURL(currentSrcUrlRef.current);
      for (const item of historyRef.current) {
        URL.revokeObjectURL(item.srcUrl);
      }
    };
  }, []);

  useEffect(() => {
    currentSrcUrlRef.current = currentSrcUrl;
  }, [currentSrcUrl]);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    const run = async () => {
      try {
        const resp = await fetch('/api/health');
        const data = await resp.json();
        setAiModelPresent(Boolean(data?.ai_model_present));
      } catch {
        setAiModelPresent(null);
      }
    };
    run();
  }, []);

  const selectFile = (f: File | null) => {
    if (currentSrcUrl) URL.revokeObjectURL(currentSrcUrl);
    setFile(f);
    setError(null);
    setStatus(null);
    setResultUrl(null);
    setUsedAi(null);
    setModelName(null);
    setTimingMs(null);
    setInputMeta(null);
    setOutputMeta(null);
    setCompare(55);
    setCurrentSrcUrl(f ? URL.createObjectURL(f) : null);
  };

  const onPickClick = () => {
    inputRef.current?.click();
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    selectFile(f);
  };

  const onDrop: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) selectFile(f);
  };

  const onDragOver: DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
  };

  const process = async () => {
    if (!file) {
      setError('Выберите изображение (JPG/PNG/WebP).');
      return;
    }

    setProcessing(true);
    setError(null);
    setStatus('Загрузка и обработка...');

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('prefer_ai', preferAi ? 'true' : 'false');
      fd.append('mode', mode);

      const resp = await fetch('/api/process', { method: 'POST', body: fd });
      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        const msg = String(data?.detail ?? 'Ошибка обработки');
        throw new Error(msg);
      }

      const jobId = String(data.job_id);
      const usedAiValue = Boolean(data.used_ai);
      const modelNameValue = data.model_name ? String(data.model_name) : null;
      const resultUrlValue = String(data.result_url);
      const timingMsValue =
        typeof data.timing_ms === 'number' ? Number(data.timing_ms) : null;
      const inputValue = data.input ?? null;
      const outputValue = data.output ?? null;

      setResultUrl(resultUrlValue);
      setUsedAi(usedAiValue);
      setModelName(modelNameValue);
      setTimingMs(timingMsValue);
      setInputMeta(inputValue);
      setOutputMeta(outputValue);
      setStatus('Готово');

      const srcHistoryUrl = URL.createObjectURL(file);
      setHistory((prev) => {
        const next: HistoryItem[] = [
          {
            jobId,
            createdAt: Date.now(),
            fileName: file.name,
            mode,
            preferAi,
            usedAi: usedAiValue,
            modelName: modelNameValue,
            timingMs: timingMsValue,
            input: inputValue,
            output: outputValue,
            resultUrl: resultUrlValue,
            srcUrl: srcHistoryUrl,
          },
          ...prev,
        ];
        const limit = 8;
        if (next.length <= limit) return next;
        for (const removed of next.slice(limit)) {
          URL.revokeObjectURL(removed.srcUrl);
        }
        return next.slice(0, limit);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка обработки');
      setStatus(null);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className='page'>
      <header className='topbar'>
        <div className='brand'>
          <div className='brandMark' aria-hidden='true' />
          <div>
            <div className='brandTitle'>AI Image Processing</div>
            <div className='brandSubtitle'>
              Загрузка → обработка → результат
            </div>
          </div>
        </div>
        <div className='badges'>
          <span className='badge'>
            API: {aiModelPresent === null ? 'нет связи' : 'ok'}
          </span>
          <span className='badge'>
            AI-модель: {aiModelPresent ? 'есть' : 'нет'}
          </span>
        </div>
      </header>

      <main className='grid'>
        <section className='panel'>
          <div className='panelHeader'>
            <h1>Обработка изображений</h1>
            <p className='muted'>
              Поддержка: JPG, PNG, WebP. Результат сохраняется в PNG.
            </p>
          </div>

          <div className='dropzone' onDrop={onDrop} onDragOver={onDragOver}>
            <input
              ref={inputRef}
              type='file'
              accept='image/png,image/jpeg,image/webp'
              onChange={onInputChange}
              className='fileInput'
            />
            <div className='dropzoneInner'>
              <div className='dropTitle'>
                {file ? file.name : 'Перетащите изображение сюда'}
              </div>
              <div className='muted'>
                или{' '}
                <button
                  type='button'
                  className='linkButton'
                  onClick={onPickClick}
                >
                  выберите файл
                </button>
              </div>
            </div>
          </div>

          <div className='controls'>
            <div className='row2'>
              <label className='field'>
                <span className='fieldLabel'>Режим</span>
                <select
                  className='select'
                  value={mode}
                  onChange={(e) => setMode(e.target.value as Mode)}
                >
                  <option value='enhance'>Улучшение</option>
                  <option value='upscale'>Upscale ×2</option>
                </select>
              </label>
              <label className='toggle'>
                <input
                  type='checkbox'
                  checked={preferAi}
                  onChange={(e) => setPreferAi(e.target.checked)}
                />
                <span>Предпочитать AI (если доступно)</span>
              </label>
            </div>
            <button
              type='button'
              className='primary'
              onClick={process}
              disabled={processing}
            >
              {processing ? 'Обработка...' : 'Обработать'}
            </button>
          </div>

          {(status || error) && (
            <div className={error ? 'toast error' : 'toast'}>
              <div className='toastTitle'>{error ? 'Ошибка' : 'Статус'}</div>
              <div className='toastText'>{error ?? status}</div>
            </div>
          )}

          <div className='meta'>
            <div className='metaRow'>
              <span className='metaKey'>used_ai</span>
              <span className='metaVal'>
                {usedAi === null ? '—' : usedAi ? 'true' : 'false'}
              </span>
            </div>
            <div className='metaRow'>
              <span className='metaKey'>model</span>
              <span className='metaVal'>{modelName ?? '—'}</span>
            </div>
            <div className='metaRow'>
              <span className='metaKey'>time</span>
              <span className='metaVal'>{timingMs === null ? '—' : `${timingMs}ms`}</span>
            </div>
            <div className='metaRow'>
              <span className='metaKey'>in</span>
              <span className='metaVal'>
                {inputMeta ? `${inputMeta.width}×${inputMeta.height}` : '—'}
              </span>
            </div>
            <div className='metaRow'>
              <span className='metaKey'>out</span>
              <span className='metaVal'>
                {outputMeta ? `${outputMeta.width}×${outputMeta.height}` : '—'}
              </span>
            </div>
          </div>
        </section>

        <section className='preview'>
          <div className='compareCard'>
            <div className='cardHeader'>Сравнение</div>
            <div className='compareBody'>
              {currentSrcUrl && resultUrl ? (
                <div className='compareStage'>
                  <img className='compareImg' src={currentSrcUrl} alt='Исходное' />
                  <div
                    className='compareTop'
                    style={{ width: `${compare}%` }}
                  >
                    <img className='compareImg' src={resultUrl} alt='Результат' />
                  </div>
                  <div className='compareHandle' style={{ left: `${compare}%` }} />
                  {processing && (
                    <div className='loadingOverlay'>
                      <div className='spinner' />
                    </div>
                  )}
                </div>
              ) : (
                <div className='placeholder'>Загрузите файл и получите результат</div>
              )}
            </div>
            <div className='compareFooter'>
              <input
                className='range'
                type='range'
                min={0}
                max={100}
                value={compare}
                onChange={(e) => setCompare(Number(e.target.value))}
                disabled={!currentSrcUrl || !resultUrl}
              />
              <div className='actions'>
                {resultUrl ? (
                  <a className='download' href={resultUrl} download>
                    Скачать PNG
                  </a>
                ) : (
                  <span className='muted'>—</span>
                )}
              </div>
            </div>
          </div>

          <div className='history'>
            <div className='historyHeader'>
              <div className='historyTitle'>История</div>
              <button
                type='button'
                className='ghost'
                onClick={() => {
                  for (const item of history) URL.revokeObjectURL(item.srcUrl);
                  setHistory([]);
                }}
                disabled={history.length === 0}
              >
                Очистить
              </button>
            </div>
            {history.length === 0 ? (
              <div className='historyEmpty'>Пока пусто</div>
            ) : (
              <div className='historyList'>
                {history.map((h) => (
                  <div key={h.jobId} className='historyItem'>
                    <img className='thumb' src={h.srcUrl} alt='' />
                    <div className='historyMeta'>
                      <div className='historyName'>{h.fileName}</div>
                      <div className='historyLine'>
                        {h.mode} · used_ai={h.usedAi ? 'true' : 'false'}
                        {h.timingMs !== null ? ` · ${h.timingMs}ms` : ''}
                      </div>
                      <div className='historyLinks'>
                        <a className='smallLink' href={h.resultUrl} target='_blank' rel='noreferrer'>
                          открыть
                        </a>
                        <a className='smallLink' href={h.resultUrl} download>
                          скачать
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
