import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type ViewMode = 'front' | 'side';
type PanelTab = 'front' | 'eye' | 'side' | 'view';

type Point = {
  x: number;
  y: number;
};

type FrontParams = {
  headWidthMm: number;
  templeWidth: number;
  cheekboneWidth: number;
  cheekWidth: number;
  jawWidth: number;
  jawLength: number;
};

type EyeParams = {
  eyeHeight: number;
  eyeWidthMm: number;
  eyeHeightMm: number;
  eyeGapMm: number;
  outerLift: number;
};

type SideParams = {
  headDepthMm: number;
  occiputRoundness: number;
  foreheadTilt: number;
  noseProjection: number;
  mouthProjection: number;
  chinProjection: number;
  chinUnder: number;
  neckPosition: number;
};

type HeadProject = {
  headHeightMm: number;
  front: FrontParams;
  eye: EyeParams;
  side: SideParams;
  showAnchors: boolean;
};

type FieldConfig<T> = {
  key: keyof T;
  label: string;
  min: number;
  max: number;
  unit: 'mm';
  step?: number;
};

const STORAGE_KEY = 'bjd-photo-mesh-warp:v1';
const FRONT_PHOTO = './reference/front.jpg';
const SIDE_PHOTO = './reference/side.jpg';
const BASE_HEAD_HEIGHT = 60;
const BASE_HEAD_WIDTH = 46;
const BASE_HEAD_DEPTH = 52;
const BASE_EYE_WIDTH = 18;
const BASE_EYE_HEIGHT = 7;
const BASE_EYE_GAP = 9;

const defaultProject: HeadProject = {
  headHeightMm: BASE_HEAD_HEIGHT,
  front: {
    headWidthMm: BASE_HEAD_WIDTH,
    templeWidth: 0,
    cheekboneWidth: 0,
    cheekWidth: 0,
    jawWidth: 0,
    jawLength: 0,
  },
  eye: {
    eyeHeight: 0,
    eyeWidthMm: BASE_EYE_WIDTH,
    eyeHeightMm: BASE_EYE_HEIGHT,
    eyeGapMm: BASE_EYE_GAP,
    outerLift: 0,
  },
  side: {
    headDepthMm: BASE_HEAD_DEPTH,
    occiputRoundness: 0,
    foreheadTilt: 0,
    noseProjection: 0,
    mouthProjection: 0,
    chinProjection: 0,
    chinUnder: 0,
    neckPosition: 0,
  },
  showAnchors: false,
};

const frontFields: FieldConfig<FrontParams>[] = [
  { key: 'headWidthMm', label: '頭幅', min: 38, max: 54, unit: 'mm' },
  { key: 'templeWidth', label: 'こめかみ幅', min: -5, max: 5, unit: 'mm' },
  { key: 'cheekboneWidth', label: '頬骨幅', min: -5, max: 6, unit: 'mm' },
  { key: 'cheekWidth', label: '頬幅', min: -5, max: 6, unit: 'mm' },
  { key: 'jawWidth', label: '顎幅', min: -5, max: 5, unit: 'mm' },
  { key: 'jawLength', label: '顎長', min: -5, max: 6, unit: 'mm' },
];

const eyeFields: FieldConfig<EyeParams>[] = [
  { key: 'eyeHeight', label: 'アイホール高さ', min: -5, max: 5, unit: 'mm' },
  { key: 'eyeWidthMm', label: 'アイホール横幅', min: 12, max: 24, unit: 'mm' },
  { key: 'eyeHeightMm', label: 'アイホール縦幅', min: 4, max: 11, unit: 'mm' },
  { key: 'eyeGapMm', label: '左右間隔', min: 5, max: 14, unit: 'mm' },
  { key: 'outerLift', label: '目尻上下', min: -4, max: 4, unit: 'mm' },
];

const sideFields: FieldConfig<SideParams>[] = [
  { key: 'headDepthMm', label: '頭奥行', min: 44, max: 62, unit: 'mm' },
  { key: 'occiputRoundness', label: '後頭部の丸み', min: -6, max: 7, unit: 'mm' },
  { key: 'foreheadTilt', label: '額の傾き', min: -5, max: 5, unit: 'mm' },
  { key: 'noseProjection', label: '鼻の突出', min: -5, max: 7, unit: 'mm' },
  { key: 'mouthProjection', label: '口元の突出', min: -5, max: 6, unit: 'mm' },
  { key: 'chinProjection', label: '顎の突出', min: -5, max: 6, unit: 'mm' },
  { key: 'chinUnder', label: '顎下', min: -4, max: 5, unit: 'mm' },
  { key: 'neckPosition', label: '首位置', min: -6, max: 6, unit: 'mm' },
];

const tabLabels: Record<PanelTab, string> = {
  front: '正面',
  eye: 'アイホール',
  side: '側面',
  view: '表示',
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
      front: { ...defaultProject.front, ...saved.front },
      eye: { ...defaultProject.eye, ...saved.eye },
      side: { ...defaultProject.side, ...saved.side },
    };
  } catch {
    return defaultProject;
  }
}

function gaussian(value: number, center: number, radius: number) {
  const distance = (value - center) / radius;
  return Math.exp(-distance * distance);
}

function signedFromCenter(x: number, center: number) {
  if (Math.abs(x - center) < 0.001) return 0;
  return x > center ? 1 : -1;
}

function mmToFrontPx(mm: number) {
  return mm * 2.15;
}

function mmToSidePx(mm: number) {
  return mm * 2.1;
}

function mapFrontPoint(point: Point, project: HeadProject): Point {
  const centerX = 110;
  let x = point.x;
  let y = point.y;
  const side = signedFromCenter(x, centerX);
  const yOriginal = point.y;
  const headMask = gaussian(point.x, centerX, 78) * gaussian(point.y, 118, 92);
  const widthDelta = project.front.headWidthMm - BASE_HEAD_WIDTH;

  x += side * mmToFrontPx(widthDelta) * 0.5 * headMask;
  x += side * mmToFrontPx(project.front.templeWidth) * gaussian(yOriginal, 120, 15) * gaussian(point.x, centerX, 82);
  x += side * mmToFrontPx(project.front.cheekboneWidth) * gaussian(yOriginal, 139, 14) * gaussian(point.x, centerX, 76);
  x += side * mmToFrontPx(project.front.cheekWidth) * gaussian(yOriginal, 158, 17) * gaussian(point.x, centerX, 72);
  x += side * mmToFrontPx(project.front.jawWidth) * gaussian(yOriginal, 179, 17) * gaussian(point.x, centerX, 62);
  y += mmToFrontPx(project.front.jawLength) * gaussian(yOriginal, 191, 20) * gaussian(point.x, centerX, 52);

  const eye = project.eye;
  const eyeCenterY = 126;
  const eyeYShift = mmToFrontPx(eye.eyeHeight) * gaussian(point.y, eyeCenterY, 18);
  y += eyeYShift;

  const leftEyeX = 110 - mmToFrontPx(BASE_EYE_GAP + BASE_EYE_WIDTH * 0.5) * 0.5;
  const rightEyeX = 110 + mmToFrontPx(BASE_EYE_GAP + BASE_EYE_WIDTH * 0.5) * 0.5;
  const eyeWidthDelta = mmToFrontPx(eye.eyeWidthMm - BASE_EYE_WIDTH);
  const eyeHeightDelta = mmToFrontPx(eye.eyeHeightMm - BASE_EYE_HEIGHT);
  const gapDelta = mmToFrontPx(eye.eyeGapMm - BASE_EYE_GAP);
  const leftInfluence = gaussian(point.x, leftEyeX, 20) * gaussian(point.y, eyeCenterY, 12);
  const rightInfluence = gaussian(point.x, rightEyeX, 20) * gaussian(point.y, eyeCenterY, 12);
  const eyeInfluence = leftInfluence + rightInfluence;
  x += -gapDelta * 0.32 * leftInfluence + gapDelta * 0.32 * rightInfluence;
  x += signedFromCenter(point.x, point.x < centerX ? leftEyeX : rightEyeX) * eyeWidthDelta * 0.35 * eyeInfluence;
  y += signedFromCenter(point.y, eyeCenterY) * eyeHeightDelta * 0.32 * eyeInfluence;
  y -= mmToFrontPx(eye.outerLift) * (point.x > centerX ? rightInfluence : leftInfluence) * gaussian(point.x, point.x > centerX ? rightEyeX + 18 : leftEyeX - 18, 18);

  return { x, y };
}

function mapSidePoint(point: Point, project: HeadProject): Point {
  const baseX = 42;
  const topY = 34;
  const heightScale = project.headHeightMm / BASE_HEAD_HEIGHT;
  const depthScale = project.side.headDepthMm / BASE_HEAD_DEPTH;
  let x = baseX + (point.x - baseX) * depthScale;
  let y = topY + (point.y - topY) * heightScale;

  x -= mmToSidePx(project.side.occiputRoundness) * gaussian(point.x, 56, 36) * gaussian(point.y, 105, 68);
  x += mmToSidePx(project.side.foreheadTilt) * gaussian(point.x, 160, 24) * gaussian(point.y, 72, 44);
  x += mmToSidePx(project.side.noseProjection) * gaussian(point.x, 188, 23) * gaussian(point.y, 130, 20);
  x += mmToSidePx(project.side.mouthProjection) * gaussian(point.x, 174, 20) * gaussian(point.y, 148, 18);
  x += mmToSidePx(project.side.chinProjection) * gaussian(point.x, 164, 26) * gaussian(point.y, 167, 24);
  y += mmToSidePx(project.side.chinUnder) * gaussian(point.x, 145, 38) * gaussian(point.y, 174, 22);
  x += mmToSidePx(project.side.neckPosition) * gaussian(point.x, 111, 44) * gaussian(point.y, 176, 24);

  const eye = project.eye;
  const eyeInfluence = gaussian(point.x, 166, 18) * gaussian(point.y, 117, 13);
  y += mmToSidePx(eye.eyeHeight) * eyeInfluence;
  x += mmToSidePx(eye.eyeWidthMm - BASE_EYE_WIDTH) * 0.18 * eyeInfluence;
  y += signedFromCenter(point.y, 117) * mmToSidePx(eye.eyeHeightMm - BASE_EYE_HEIGHT) * 0.25 * eyeInfluence;

  return { x, y };
}

function transformFromTriangles(source: [Point, Point, Point], target: [Point, Point, Point]) {
  const [s0, s1, s2] = source;
  const [t0, t1, t2] = target;
  const denominator = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
  return {
    a: (t0.x * (s1.y - s2.y) + t1.x * (s2.y - s0.y) + t2.x * (s0.y - s1.y)) / denominator,
    b: (t0.y * (s1.y - s2.y) + t1.y * (s2.y - s0.y) + t2.y * (s0.y - s1.y)) / denominator,
    c: (t0.x * (s2.x - s1.x) + t1.x * (s0.x - s2.x) + t2.x * (s1.x - s0.x)) / denominator,
    d: (t0.y * (s2.x - s1.x) + t1.y * (s0.x - s2.x) + t2.y * (s1.x - s0.x)) / denominator,
    e: (t0.x * (s1.x * s2.y - s2.x * s1.y) + t1.x * (s2.x * s0.y - s0.x * s2.y) + t2.x * (s0.x * s1.y - s1.x * s0.y)) / denominator,
    f: (t0.y * (s1.x * s2.y - s2.x * s1.y) + t1.y * (s2.x * s0.y - s0.x * s2.y) + t2.y * (s0.x * s1.y - s1.x * s0.y)) / denominator,
  };
}

function drawTriangle(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  source: [Point, Point, Point],
  target: [Point, Point, Point],
  viewBox: { width: number; height: number },
  resolution: number,
) {
  const scaledTarget = target.map((point) => ({ x: point.x * resolution, y: point.y * resolution })) as [Point, Point, Point];
  const transform = transformFromTriangles(source, scaledTarget);
  context.save();
  context.beginPath();
  context.moveTo(scaledTarget[0].x, scaledTarget[0].y);
  context.lineTo(scaledTarget[1].x, scaledTarget[1].y);
  context.lineTo(scaledTarget[2].x, scaledTarget[2].y);
  context.closePath();
  context.clip();
  context.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
  context.drawImage(image, 0, 0, viewBox.width, viewBox.height);
  context.restore();
}

function WarpedPhoto({
  href,
  viewBox,
  cols,
  rows,
  mapPoint,
}: {
  href: string;
  viewBox: { width: number; height: number };
  cols: number;
  rows: number;
  mapPoint: (point: Point) => Point;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const image = new Image();
    image.src = href;
    image.onload = () => {
      if (cancelled) return;
      const resolution = 3;
      canvas.width = viewBox.width * resolution;
      canvas.height = viewBox.height * resolution;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.setTransform(resolution, 0, 0, resolution, 0, 0);
      context.drawImage(image, 0, 0, viewBox.width, viewBox.height);
      context.setTransform(1, 0, 0, 1, 0, 0);
      const tileWidth = viewBox.width / cols;
      const tileHeight = viewBox.height / rows;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const x = col * tileWidth;
          const y = row * tileHeight;
          const s0 = { x, y };
          const s1 = { x: x + tileWidth, y };
          const s2 = { x, y: y + tileHeight };
          const s3 = { x: x + tileWidth, y: y + tileHeight };
          const d0 = mapPoint(s0);
          const d1 = mapPoint(s1);
          const d2 = mapPoint(s2);
          const d3 = mapPoint(s3);
          drawTriangle(context, image, [s0, s1, s2], [d0, d1, d2], viewBox, resolution);
          drawTriangle(context, image, [s2, s1, s3], [d2, d1, d3], viewBox, resolution);
        }
      }
    };
    return () => {
      cancelled = true;
    };
  }, [cols, href, mapPoint, rows, viewBox]);

  return <canvas ref={canvasRef} className="warp-canvas" width={viewBox.width * 3} height={viewBox.height * 3} />;
}

function AnchorOverlay({ points }: { points: Point[] }) {
  return (
    <g className="anchor-overlay">
      {points.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="2.2" />
      ))}
    </g>
  );
}

function FrontView({ project }: { project: HeadProject }) {
  const mapPoint = (point: Point) => mapFrontPoint(point, project);
  const anchors = [
    { x: 110, y: 34 },
    { x: 53, y: 120 },
    { x: 43, y: 139 },
    { x: 53, y: 158 },
    { x: 71, y: 179 },
    { x: 110, y: 198 },
    { x: 81, y: 126 },
    { x: 139, y: 126 },
  ].map(mapPoint);

  return (
    <div className="warp-stage" role="img" aria-label="正面写真メッシュ変形">
      <WarpedPhoto href={FRONT_PHOTO} viewBox={{ width: 220, height: 220 }} cols={28} rows={36} mapPoint={mapPoint} />
      {project.showAnchors && (
        <svg className="anchor-svg" viewBox="0 0 220 220" aria-hidden="true">
          <AnchorOverlay points={anchors} />
        </svg>
      )}
    </div>
  );
}

function SideView({ project }: { project: HeadProject }) {
  const mapPoint = (point: Point) => mapSidePoint(point, project);
  const anchors = [
    { x: 116, y: 34 },
    { x: 158, y: 66 },
    { x: 161, y: 101 },
    { x: 188, y: 129 },
    { x: 173, y: 136 },
    { x: 176, y: 143 },
    { x: 166, y: 150 },
    { x: 163, y: 164 },
    { x: 145, y: 172 },
    { x: 119, y: 168 },
    { x: 84, y: 166 },
    { x: 44, y: 104 },
    { x: 166, y: 117 },
  ].map(mapPoint);

  return (
    <div className="warp-stage" role="img" aria-label="側面写真メッシュ変形">
      <WarpedPhoto href={SIDE_PHOTO} viewBox={{ width: 240, height: 220 }} cols={30} rows={36} mapPoint={mapPoint} />
      {project.showAnchors && (
        <svg className="anchor-svg" viewBox="0 0 240 220" aria-hidden="true">
          <AnchorOverlay points={anchors} />
        </svg>
      )}
    </div>
  );
}

function Preview({ project, view }: { project: HeadProject; view: ViewMode }) {
  return (
    <div className="preview-canvas">
      {view === 'front' ? <FrontView project={project} /> : <SideView project={project} />}
    </div>
  );
}

function ControlRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const displayValue = step < 1 ? value.toFixed(1) : Math.round(value).toString();
  return (
    <div className="control-row">
      <label className="number-row">
        <span>{label}</span>
        <span className="number-unit">
          <input type="number" min={min} max={max} step={step} value={displayValue} onChange={(event) => onChange(Number(event.target.value))} />
          <small>{unit}</small>
        </span>
      </label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function App() {
  const [project, setProject] = useState<HeadProject>(loadProject);
  const [view, setView] = useState<ViewMode>('front');
  const [tab, setTab] = useState<PanelTab>('front');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [project]);

  const visibleFields = useMemo(() => {
    if (tab === 'front') return frontFields;
    if (tab === 'eye') return eyeFields;
    if (tab === 'side') return sideFields;
    return [];
  }, [tab]);

  function updateHeadHeight(value: number) {
    setProject((current) => ({ ...current, headHeightMm: clamp(value, 50, 70) }));
  }

  function updateField(key: string, value: number) {
    if (tab === 'front') {
      const field = frontFields.find((item) => item.key === key);
      if (!field) return;
      setProject((current) => ({
        ...current,
        front: { ...current.front, [key]: clamp(value, field.min, field.max) },
      }));
    }
    if (tab === 'eye') {
      const field = eyeFields.find((item) => item.key === key);
      if (!field) return;
      setProject((current) => ({
        ...current,
        eye: { ...current.eye, [key]: clamp(value, field.min, field.max) },
      }));
    }
    if (tab === 'side') {
      const field = sideFields.find((item) => item.key === key);
      if (!field) return;
      setProject((current) => ({
        ...current,
        side: { ...current.side, [key]: clamp(value, field.min, field.max) },
      }));
    }
  }

  function reset() {
    setProject(defaultProject);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main className="app-shell">
      <section className="preview-area">
        <header className="app-header">
          <div>
            <p>BJD Core Draft</p>
            <h1>写真メッシュ変形</h1>
          </div>
          <div className="view-tabs">
            <button type="button" className={view === 'front' ? 'active' : ''} onClick={() => setView('front')}>正面</button>
            <button type="button" className={view === 'side' ? 'active' : ''} onClick={() => setView('side')}>側面</button>
          </div>
        </header>
        <Preview project={project} view={view} />
      </section>

      <section className="controls">
        <div className="panel-tabs">
          {(Object.keys(tabLabels) as PanelTab[]).map((key) => (
            <button key={key} type="button" className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>
              {tabLabels[key]}
            </button>
          ))}
        </div>

        <div className="control-list">
          <ControlRow
            label="全体高さ"
            value={project.headHeightMm}
            min={50}
            max={70}
            unit="mm"
            onChange={updateHeadHeight}
          />

          {visibleFields.map((field) => {
            const group = tab === 'front' ? project.front : tab === 'eye' ? project.eye : project.side;
            return (
              <ControlRow
                key={String(field.key)}
                label={field.label}
                value={group[field.key as keyof typeof group]}
                min={field.min}
                max={field.max}
                step={field.step}
                unit={field.unit}
                onChange={(value) => updateField(String(field.key), value)}
              />
            );
          })}

          {tab === 'view' && (
            <div className="print-panel">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={project.showAnchors}
                  onChange={(event) => setProject((current) => ({ ...current, showAnchors: event.target.checked }))}
                />
                アンカー点
              </label>
              <button type="button" onClick={reset}>リセット</button>
            </div>
          )}
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
