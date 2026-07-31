import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type ViewMode = 'front' | 'side';
type PanelTab = 'head' | 'eye' | 'face' | 'print';
type EyeSide = 'left' | 'right';

type EyeHole = {
  scale: number;
  width: number;
  height: number;
  outerLift: number;
};

type HeadAnchors = {
  headHeight: number;
  headWidth: number;
  headDepth: number;
  occiputRoundness: number;
  foreheadTilt: number;
  templeWidth: number;
  cheekboneWidth: number;
  cheekFullness: number;
  jawWidth: number;
  jawLength: number;
  eyeHeight: number;
  eyeGap: number;
  noseHeight: number;
  noseLength: number;
  mouthPosition: number;
  chinProjection: number;
};

type HeadProject = {
  anchors: HeadAnchors;
  eyesLinked: boolean;
  leftEye: EyeHole;
  rightEye: EyeHole;
  slitWidth: number;
};

type FieldConfig = {
  key: keyof HeadAnchors;
  label: string;
  min: number;
  max: number;
  tab: PanelTab;
};

type EyeFieldConfig = {
  key: keyof EyeHole;
  label: string;
  min: number;
  max: number;
  step?: number;
};

const STORAGE_KEY = 'bjd-core-reference-deform:v1';

const defaultEye: EyeHole = {
  scale: 1,
  width: 22,
  height: 8,
  outerLift: 1,
};

const defaultProject: HeadProject = {
  anchors: {
    headHeight: 170,
    headWidth: 88,
    headDepth: 108,
    occiputRoundness: 0,
    foreheadTilt: 0,
    templeWidth: 0,
    cheekboneWidth: 0,
    cheekFullness: 0,
    jawWidth: 0,
    jawLength: 0,
    eyeHeight: 0,
    eyeGap: 18,
    noseHeight: 0,
    noseLength: 0,
    mouthPosition: 0,
    chinProjection: 0,
  },
  eyesLinked: true,
  leftEye: { ...defaultEye },
  rightEye: { ...defaultEye },
  slitWidth: 2,
};

const fields: FieldConfig[] = [
  { key: 'headHeight', label: '頭頂から顎下', min: 120, max: 190, tab: 'head' },
  { key: 'headWidth', label: '頭幅', min: 62, max: 112, tab: 'head' },
  { key: 'headDepth', label: '頭奥行', min: 74, max: 135, tab: 'head' },
  { key: 'occiputRoundness', label: '後頭部の丸み', min: -12, max: 18, tab: 'head' },
  { key: 'foreheadTilt', label: '額の傾き', min: -12, max: 12, tab: 'head' },
  { key: 'templeWidth', label: 'こめかみ', min: -12, max: 12, tab: 'head' },
  { key: 'cheekboneWidth', label: '頬骨', min: -12, max: 14, tab: 'face' },
  { key: 'cheekFullness', label: '頬の膨らみ', min: -10, max: 14, tab: 'face' },
  { key: 'jawWidth', label: '顎幅', min: -14, max: 14, tab: 'face' },
  { key: 'jawLength', label: '顎長', min: -12, max: 16, tab: 'face' },
  { key: 'eyeHeight', label: '目の高さ', min: -20, max: 20, tab: 'eye' },
  { key: 'eyeGap', label: '目の間隔', min: 8, max: 34, tab: 'eye' },
  { key: 'noseHeight', label: '鼻の高さ', min: -12, max: 14, tab: 'face' },
  { key: 'noseLength', label: '鼻の長さ', min: -12, max: 18, tab: 'face' },
  { key: 'mouthPosition', label: '口の位置', min: -16, max: 16, tab: 'face' },
  { key: 'chinProjection', label: '顎の突出', min: -10, max: 18, tab: 'face' },
];

const eyeFields: EyeFieldConfig[] = [
  { key: 'scale', label: '基準形状の拡大縮小', min: 0.72, max: 1.32, step: 0.01 },
  { key: 'width', label: '目の横幅', min: 12, max: 34 },
  { key: 'height', label: '目の縦幅', min: 4, max: 16 },
  { key: 'outerLift', label: '目尻の上下', min: -7, max: 8 },
];

const tabLabels: Record<PanelTab, string> = {
  head: '頭部',
  eye: 'アイホール',
  face: '顔輪郭',
  print: '印刷',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function loadProject(): HeadProject {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProject;
    const saved = JSON.parse(raw) as Partial<HeadProject>;
    return {
      ...defaultProject,
      ...saved,
      anchors: { ...defaultProject.anchors, ...saved.anchors },
      leftEye: { ...defaultProject.leftEye, ...saved.leftEye },
      rightEye: { ...defaultProject.rightEye, ...saved.rightEye },
    };
  } catch {
    return defaultProject;
  }
}

function sx(anchor: HeadAnchors) {
  return anchor.headWidth / 88;
}

function sy(anchor: HeadAnchors) {
  return anchor.headHeight / 170;
}

function frontPoint(anchor: HeadAnchors, x: number, y: number) {
  return {
    x: 90 + (x - 90) * sx(anchor),
    y: 16 + (y - 16) * sy(anchor),
  };
}

function frontHeadPath(anchor: HeadAnchors) {
  const p = (x: number, y: number) => frontPoint(anchor, x, y);
  const top = p(90, 16);
  const temple = p(47 - anchor.templeWidth, 80);
  const cheekbone = p(42 - anchor.cheekboneWidth, 118);
  const cheek = p(51 - anchor.cheekFullness, 145);
  const jaw = p(66 - anchor.jawWidth, 174 + anchor.jawLength);
  const chin = p(90, 190 + anchor.jawLength);
  const rTemple = p(180 - temple.x, 80);
  const rCheekbone = p(180 - cheekbone.x, 118);
  const rCheek = p(180 - cheek.x, 145);
  const rJaw = p(180 - jaw.x, 174 + anchor.jawLength);

  return [
    `M ${top.x} ${top.y}`,
    `C ${62 * sx(anchor)} ${18 * sy(anchor)}, ${48 * sx(anchor)} ${43 * sy(anchor)}, ${temple.x} ${temple.y}`,
    `C ${temple.x - 1} ${96 * sy(anchor)}, ${cheekbone.x} ${106 * sy(anchor)}, ${cheekbone.x} ${cheekbone.y}`,
    `C ${cheekbone.x + 1} ${132 * sy(anchor)}, ${cheek.x} ${137 * sy(anchor)}, ${cheek.x} ${cheek.y}`,
    `C ${cheek.x + 4} ${162 * sy(anchor)}, ${jaw.x} ${166 * sy(anchor)}, ${jaw.x} ${jaw.y}`,
    `C ${70 * sx(anchor)} ${192 * sy(anchor)}, ${80 * sx(anchor)} ${(197 + anchor.jawLength) * sy(anchor)}, ${chin.x} ${chin.y}`,
    `C ${100 * sx(anchor)} ${(197 + anchor.jawLength) * sy(anchor)}, ${110 * sx(anchor)} ${192 * sy(anchor)}, ${rJaw.x} ${rJaw.y}`,
    `C ${rJaw.x} ${166 * sy(anchor)}, ${rCheek.x - 4} ${162 * sy(anchor)}, ${rCheek.x} ${rCheek.y}`,
    `C ${rCheek.x} ${137 * sy(anchor)}, ${rCheekbone.x - 1} ${132 * sy(anchor)}, ${rCheekbone.x} ${rCheekbone.y}`,
    `C ${rCheekbone.x} ${106 * sy(anchor)}, ${rTemple.x + 1} ${96 * sy(anchor)}, ${rTemple.x} ${rTemple.y}`,
    `C ${132 * sx(anchor)} ${43 * sy(anchor)}, ${118 * sx(anchor)} ${18 * sy(anchor)}, ${top.x} ${top.y}`,
    'Z',
  ].join(' ');
}

function sidePoint(anchor: HeadAnchors, x: number, y: number) {
  return {
    x: 34 + (x - 34) * (anchor.headDepth / 108),
    y: 16 + (y - 16) * sy(anchor),
  };
}

function sideHeadPath(anchor: HeadAnchors) {
  const p = (x: number, y: number) => sidePoint(anchor, x, y);
  const top = p(100, 16);
  const rear = p(34 - anchor.occiputRoundness, 94);
  const backLow = p(50 - anchor.occiputRoundness * 0.45, 154);
  const neck = p(94, 190);
  const chin = p(142 + anchor.chinProjection, 174 + anchor.jawLength);
  const mouth = p(156 + anchor.chinProjection * 0.2, 138 + anchor.mouthPosition);
  const nose = p(171 + anchor.noseLength, 108 + anchor.noseHeight);
  const brow = p(142 + anchor.foreheadTilt, 72);

  return [
    `M ${top.x} ${top.y}`,
    `C ${60} ${18}, ${38} ${48}, ${rear.x} ${rear.y}`,
    `C ${rear.x} ${126}, ${backLow.x} ${146}, ${backLow.x} ${backLow.y}`,
    `C ${56} ${178}, ${74} ${191}, ${neck.x} ${neck.y}`,
    `C ${112} ${198}, ${132} ${190}, ${chin.x} ${chin.y}`,
    `C ${154} ${160}, ${149} ${148}, ${mouth.x} ${mouth.y}`,
    `C ${151} ${126}, ${166} ${123}, ${nose.x} ${nose.y}`,
    `C ${151 + anchor.foreheadTilt} ${96}, ${150 + anchor.foreheadTilt} ${84}, ${brow.x} ${brow.y}`,
    `C ${134 + anchor.foreheadTilt} ${35}, ${118} ${17}, ${top.x} ${top.y}`,
    'Z',
  ].join(' ');
}

function eyeHolePath(cx: number, cy: number, eye: EyeHole, direction: -1 | 1) {
  const width = eye.width * eye.scale;
  const height = eye.height * eye.scale;
  const innerX = cx - direction * width / 2;
  const outerX = cx + direction * width / 2;
  const innerY = cy + height * 0.1;
  const outerY = cy - eye.outerLift;
  return [
    `M ${innerX} ${innerY}`,
    `C ${innerX + direction * width * 0.28} ${cy - height}, ${outerX - direction * width * 0.3} ${cy - height * 0.9}, ${outerX} ${outerY}`,
    `C ${outerX - direction * width * 0.2} ${cy + height * 0.58}, ${innerX + direction * width * 0.24} ${cy + height * 0.56}, ${innerX} ${innerY}`,
    'Z',
  ].join(' ');
}

function activeClass(activeKey: string | null, keys: string[]) {
  return activeKey && keys.includes(activeKey) ? ' active-shape' : '';
}

function FrontReferenceView({ project, activeKey }: { project: HeadProject; activeKey: string | null }) {
  const { anchors } = project;
  const eyeY = 85 + anchors.eyeHeight;
  const leftEyeX = 90 - (anchors.eyeGap / 2 + project.leftEye.width * project.leftEye.scale / 2);
  const rightEyeX = 90 + (anchors.eyeGap / 2 + project.rightEye.width * project.rightEye.scale / 2);
  const mouthY = 148 + anchors.mouthPosition;
  const noseY = 120 + anchors.noseHeight;

  return (
    <svg className="model-svg" viewBox="0 0 180 210" role="img" aria-label="正面BJDヘッド基準変形図">
      <rect className="sheet-bg" width="180" height="210" />
      <path className={`head-fill${activeClass(activeKey, ['headHeight', 'headWidth', 'templeWidth', 'cheekboneWidth', 'cheekFullness', 'jawWidth', 'jawLength'])}`} d={frontHeadPath(anchors)} />
      <line className="datum" x1="90" y1="16" x2="90" y2="198" />
      <line className={`datum${activeClass(activeKey, ['eyeHeight'])}`} x1="36" y1={eyeY} x2="144" y2={eyeY} />
      <path className={`cut-line${activeClass(activeKey, ['scale', 'width', 'height', 'outerLift', 'eyeGap', 'eyeHeight'])}`} d={eyeHolePath(leftEyeX, eyeY, project.leftEye, -1)} />
      <path className={`cut-line${activeClass(activeKey, ['scale', 'width', 'height', 'outerLift', 'eyeGap', 'eyeHeight'])}`} d={eyeHolePath(rightEyeX, eyeY, project.rightEye, 1)} />
      <path className={`feature${activeClass(activeKey, ['noseHeight'])}`} d={`M 86 ${noseY - 13} C 82 ${noseY - 1}, 84 ${noseY + 7}, 90 ${noseY + 9} C 96 ${noseY + 7}, 98 ${noseY - 1}, 94 ${noseY - 13}`} />
      <path className={`feature${activeClass(activeKey, ['mouthPosition'])}`} d={`M 68 ${mouthY} C 80 ${mouthY + 5}, 100 ${mouthY + 5}, 112 ${mouthY}`} />
      <path className="feature soft" d={`M 52 ${126 + anchors.cheekFullness * 0.5} C 64 ${138 + anchors.cheekFullness}, 75 ${142 + anchors.cheekFullness}, 87 ${140 + anchors.cheekFullness * 0.5}`} />
      <path className="feature soft" d={`M 128 ${126 + anchors.cheekFullness * 0.5} C 116 ${138 + anchors.cheekFullness}, 105 ${142 + anchors.cheekFullness}, 93 ${140 + anchors.cheekFullness * 0.5}`} />
      <text className="view-title" x="90" y="207">正面基準ヘッド</text>
    </svg>
  );
}

function SideReferenceView({ project, activeKey }: { project: HeadProject; activeKey: string | null }) {
  const { anchors } = project;
  const eyeY = 85 + anchors.eyeHeight;
  const mouthY = 138 + anchors.mouthPosition;
  const noseY = 108 + anchors.noseHeight;

  return (
    <svg className="model-svg" viewBox="0 0 190 210" role="img" aria-label="側面BJDヘッド基準変形図">
      <rect className="sheet-bg" width="190" height="210" />
      <path className={`head-fill${activeClass(activeKey, ['headHeight', 'headDepth', 'occiputRoundness', 'foreheadTilt', 'jawLength', 'chinProjection', 'noseLength'])}`} d={sideHeadPath(anchors)} />
      <line className="datum" x1="34" y1="16" x2="178" y2="16" />
      <line className={`datum${activeClass(activeKey, ['eyeHeight'])}`} x1="34" y1={eyeY} x2="178" y2={eyeY} />
      <path className={`cut-line${activeClass(activeKey, ['scale', 'width', 'height', 'eyeHeight'])}`} d={eyeHolePath(137, eyeY, { ...project.rightEye, width: project.rightEye.width * 0.38 }, 1)} />
      <path className={`feature${activeClass(activeKey, ['noseHeight', 'noseLength'])}`} d={`M ${162 + anchors.noseLength} ${noseY - 8} C ${174 + anchors.noseLength} ${noseY - 2}, ${174 + anchors.noseLength} ${noseY + 7}, ${158 + anchors.noseLength * 0.45} ${noseY + 10}`} />
      <path className={`feature${activeClass(activeKey, ['mouthPosition'])}`} d={`M 145 ${mouthY} C 154 ${mouthY + 3}, 164 ${mouthY + 2}, 171 ${mouthY - 3}`} />
      <path className="feature soft" d="M 99 101 C 88 112, 84 132, 91 151" />
      <text className="view-title" x="95" y="207">側面基準ヘッド</text>
    </svg>
  );
}

function Preview({ project, view, activeKey }: { project: HeadProject; view: ViewMode; activeKey: string | null }) {
  return (
    <div className="preview-canvas">
      {view === 'front' ? (
        <FrontReferenceView project={project} activeKey={activeKey} />
      ) : (
        <SideReferenceView project={project} activeKey={activeKey} />
      )}
    </div>
  );
}

function ControlRow({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onFocus,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  onFocus: () => void;
}) {
  const displayValue = step < 1 ? value.toFixed(2) : Math.round(value).toString();
  return (
    <div className="control-row">
      <label className="number-row">
        <span>{label}</span>
        <span className="number-unit">
          <input type="number" min={min} max={max} step={step} value={displayValue} onFocus={onFocus} onChange={(event) => onChange(Number(event.target.value))} />
          <small>{step < 1 ? 'x' : 'mm'}</small>
        </span>
      </label>
      <input type="range" min={min} max={max} step={step} value={value} onFocus={onFocus} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function PrintTemplates({ project }: { project: HeadProject }) {
  return (
    <section className="print-sheet-wrap" aria-label="芯用型紙">
      <svg className="a4-sheet" width="297mm" height="210mm" viewBox="0 0 297 210" role="img" aria-label="正面側面芯用型紙">
        <rect className="sheet-bg" width="297" height="210" />
        <g transform="translate(6 0) scale(0.96)">
          <FrontReferenceView project={project} activeKey={null} />
          <line className="slit" x1="90" y1="16" x2="90" y2="102" />
          <rect className="slit-box" x={90 - project.slitWidth / 2} y="16" width={project.slitWidth} height="86" />
        </g>
        <g transform="translate(112 0) scale(0.96)">
          <SideReferenceView project={project} activeKey={null} />
          <line className="slit" x1="96" y1="102" x2="96" y2="190" />
          <rect className="slit-box" x={96 - project.slitWidth / 2} y="102" width={project.slitWidth} height="88" />
        </g>
        <g className="scale-check">
          <rect x="236" y="148" width="50" height="50" />
          <text x="261" y="144">50mm検尺枠</text>
        </g>
        <text className="sheet-note" x="8" y="205">A4横 / 100%倍率 / 正面テンプレートと側面テンプレートをスリットで十字に組む</text>
      </svg>
    </section>
  );
}

function App() {
  const [project, setProject] = useState<HeadProject>(loadProject);
  const [view, setView] = useState<ViewMode>('front');
  const [tab, setTab] = useState<PanelTab>('head');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeEyeSide, setActiveEyeSide] = useState<EyeSide>('left');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [project]);

  const activeEye = project[activeEyeSide === 'left' ? 'leftEye' : 'rightEye'];
  const visibleFields = useMemo(() => fields.filter((field) => field.tab === tab), [tab]);

  function updateAnchor(key: keyof HeadAnchors, value: number) {
    const field = fields.find((item) => item.key === key);
    const nextValue = field ? clamp(value, field.min, field.max) : value;
    setActiveKey(key);
    setProject((current) => ({
      ...current,
      anchors: { ...current.anchors, [key]: nextValue },
    }));
  }

  function updateEye(key: keyof EyeHole, value: number) {
    const field = eyeFields.find((item) => item.key === key);
    const nextValue = field ? clamp(value, field.min, field.max) : value;
    setActiveKey(key);
    setProject((current) => {
      const target = { ...current[activeEyeSide === 'left' ? 'leftEye' : 'rightEye'], [key]: nextValue };
      if (current.eyesLinked) {
        return { ...current, leftEye: { ...target }, rightEye: { ...target } };
      }
      return {
        ...current,
        [activeEyeSide === 'left' ? 'leftEye' : 'rightEye']: target,
      };
    });
  }

  function reset() {
    setProject(defaultProject);
    setActiveKey(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main className="app-shell">
      <section className="preview-area">
        <header className="app-header">
          <div>
            <p>BJD Core Draft</p>
            <h1>基準ヘッド変形</h1>
          </div>
          <div className="view-tabs">
            <button type="button" className={view === 'front' ? 'active' : ''} onClick={() => setView('front')}>正面</button>
            <button type="button" className={view === 'side' ? 'active' : ''} onClick={() => setView('side')}>側面</button>
          </div>
        </header>
        <Preview project={project} view={view} activeKey={activeKey} />
      </section>

      <section className="controls">
        <div className="panel-tabs">
          {(Object.keys(tabLabels) as PanelTab[]).map((key) => (
            <button key={key} type="button" className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              {tabLabels[key]}
            </button>
          ))}
        </div>

        {tab === 'eye' && (
          <div className="eye-link-row">
            <div className="mini-segment">
              <button type="button" className={activeEyeSide === 'left' ? 'active' : ''} disabled={project.eyesLinked} onClick={() => setActiveEyeSide('left')}>左</button>
              <button type="button" className={activeEyeSide === 'right' ? 'active' : ''} disabled={project.eyesLinked} onClick={() => setActiveEyeSide('right')}>右</button>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={project.eyesLinked}
                onChange={(event) => setProject((current) => ({
                  ...current,
                  eyesLinked: event.target.checked,
                  rightEye: event.target.checked ? { ...current.leftEye } : current.rightEye,
                }))}
              />
              左右連動
            </label>
          </div>
        )}

        <div className="control-list">
          {tab === 'eye' && eyeFields.map((field) => (
            <ControlRow
              key={field.key}
              label={field.label}
              value={activeEye[field.key]}
              min={field.min}
              max={field.max}
              step={field.step}
              onFocus={() => setActiveKey(field.key)}
              onChange={(value) => updateEye(field.key, value)}
            />
          ))}

          {tab !== 'eye' && tab !== 'print' && visibleFields.map((field) => (
            <ControlRow
              key={field.key}
              label={field.label}
              value={project.anchors[field.key]}
              min={field.min}
              max={field.max}
              onFocus={() => setActiveKey(field.key)}
              onChange={(value) => updateAnchor(field.key, value)}
            />
          ))}

          {tab === 'print' && (
            <div className="print-panel">
              <ControlRow
                label="十字芯スリット幅"
                value={project.slitWidth}
                min={1}
                max={5}
                onFocus={() => setActiveKey('slitWidth')}
                onChange={(value) => setProject((current) => ({ ...current, slitWidth: value }))}
              />
              <button type="button" onClick={() => window.print()}>芯用型紙をPDF出力</button>
              <button type="button" onClick={reset}>リセット</button>
            </div>
          )}
        </div>
      </section>

      <PrintTemplates project={project} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
