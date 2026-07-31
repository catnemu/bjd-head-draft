import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type ViewMode = 'front' | 'side';

type HeadProject = {
  outputHeightMm: number;
};

const STORAGE_KEY = 'bjd-reference-display:v1';
const FRONT_PHOTO = './reference/front-white-20260731.jpg';
const SIDE_PHOTO = './reference/side-white-20260731.jpg';

const defaultProject: HeadProject = {
  outputHeightMm: 60,
};

const referenceMeta: Record<ViewMode, {
  label: string;
  src: string;
  alt: string;
  centerLabel: string;
}> = {
  front: {
    label: '正面',
    src: FRONT_PHOTO,
    alt: '白背景のBJDヘッド正面基準画像',
    centerLabel: '顔中心',
  },
  side: {
    label: '側面',
    src: SIDE_PHOTO,
    alt: '白背景のBJDヘッド側面基準画像',
    centerLabel: '頭部中心',
  },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function loadProject(): HeadProject {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProject;
    return { ...defaultProject, ...JSON.parse(raw) };
  } catch {
    return defaultProject;
  }
}

function ReferencePreview({ view }: { view: ViewMode }) {
  const reference = referenceMeta[view];
  return (
    <div className="reference-stage" role="img" aria-label={reference.alt}>
      <img className="reference-image" src={reference.src} alt={reference.alt} />
      <div className="reference-center-line" aria-hidden="true" />
      <div className="reference-eye-line" aria-hidden="true" />
      <span className="reference-center-label">{reference.centerLabel}</span>
    </div>
  );
}

function App() {
  const [project, setProject] = useState<HeadProject>(loadProject);
  const [view, setView] = useState<ViewMode>('front');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [project]);

  function updateOutputHeight(value: number) {
    setProject((current) => ({ ...current, outputHeightMm: clamp(value, 50, 70) }));
  }

  return (
    <main className="app-shell reference-app">
      <section className="preview-area">
        <header className="app-header">
          <div>
            <p>BJD Core Draft</p>
            <h1>基準画像</h1>
          </div>
          <div className="view-tabs">
            {(['front', 'side'] as ViewMode[]).map((key) => (
              <button key={key} type="button" className={view === key ? 'active' : ''} onClick={() => setView(key)}>
                {referenceMeta[key].label}
              </button>
            ))}
          </div>
        </header>
        <div className="preview-canvas">
          <ReferencePreview view={view} />
        </div>
      </section>

      <section className="controls">
        <div className="panel-tabs single-tab">
          <button type="button" className="active">出力寸法</button>
        </div>

        <div className="control-list">
          <div className="control-row">
            <label className="number-row">
              <span>頭頂から顎下</span>
              <span className="number-unit">
                <input
                  type="number"
                  min={50}
                  max={70}
                  step={1}
                  value={project.outputHeightMm}
                  onChange={(event) => updateOutputHeight(Number(event.target.value))}
                />
                <small>mm</small>
              </span>
            </label>
            <input
              type="range"
              min={50}
              max={70}
              step={1}
              value={project.outputHeightMm}
              onChange={(event) => updateOutputHeight(Number(event.target.value))}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
