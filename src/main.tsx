import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type HeadDimensions = {
  headHeight: number;
  maxWidth: number;
  depth: number;
  jawWidth: number;
  neckWidth: number;
  eyeHoleWidth: number;
  eyeHoleHeight: number;
  eyeHoleGap: number;
  topToEyeCenter: number;
  topToNoseTip: number;
  topToMouth: number;
  topToChin: number;
  noseProjection: number;
  mouthProjection: number;
  chinProjection: number;
};

type DimensionField = {
  key: keyof HeadDimensions;
  label: string;
  min: number;
  max: number;
  step?: number;
};

const STORAGE_KEY = 'bjd-head-orthographic-mm:v1';

const defaultDimensions: HeadDimensions = {
  headHeight: 180,
  maxWidth: 92,
  depth: 112,
  jawWidth: 48,
  neckWidth: 38,
  eyeHoleWidth: 22,
  eyeHoleHeight: 9,
  eyeHoleGap: 18,
  topToEyeCenter: 78,
  topToNoseTip: 108,
  topToMouth: 132,
  topToChin: 166,
  noseProjection: 18,
  mouthProjection: 9,
  chinProjection: 5,
};

const dimensionFields: DimensionField[] = [
  { key: 'headHeight', label: '頭部全高', min: 80, max: 190 },
  { key: 'maxWidth', label: '頭部最大幅', min: 40, max: 120 },
  { key: 'depth', label: '頭部前後長', min: 50, max: 135 },
  { key: 'jawWidth', label: '顎幅', min: 18, max: 80 },
  { key: 'neckWidth', label: '首幅', min: 12, max: 70 },
  { key: 'eyeHoleWidth', label: 'アイホール横幅', min: 6, max: 42 },
  { key: 'eyeHoleHeight', label: 'アイホール縦幅', min: 3, max: 24 },
  { key: 'eyeHoleGap', label: '左右アイホール間隔', min: 6, max: 48 },
  { key: 'topToEyeCenter', label: '頭頂からアイホール中心まで', min: 25, max: 125 },
  { key: 'topToNoseTip', label: '頭頂から鼻先まで', min: 45, max: 150 },
  { key: 'topToMouth', label: '頭頂から口まで', min: 55, max: 170 },
  { key: 'topToChin', label: '頭頂から顎先まで', min: 65, max: 190 },
  { key: 'noseProjection', label: '鼻の突出量', min: 0, max: 38 },
  { key: 'mouthProjection', label: '口元の突出量', min: 0, max: 28 },
  { key: 'chinProjection', label: '顎の突出量', min: 0, max: 24 },
];

function loadInitialDimensions(): HeadDimensions {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDimensions;
    return { ...defaultDimensions, ...JSON.parse(raw) };
  } catch {
    return defaultDimensions;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function updateDimensionValue(
  current: HeadDimensions,
  key: keyof HeadDimensions,
  value: number,
): HeadDimensions {
  const next = { ...current, [key]: value };
  next.topToChin = clamp(next.topToChin, 1, next.headHeight);
  next.topToMouth = clamp(next.topToMouth, 1, next.topToChin - 2);
  next.topToNoseTip = clamp(next.topToNoseTip, 1, next.topToMouth - 2);
  next.topToEyeCenter = clamp(next.topToEyeCenter, 1, next.topToNoseTip - 2);
  next.jawWidth = clamp(next.jawWidth, 1, next.maxWidth);
  next.neckWidth = clamp(next.neckWidth, 1, next.jawWidth);
  return next;
}

function frontOutlinePath(dim: HeadDimensions, centerX: number, topY: number) {
  const h = dim.headHeight;
  const halfMax = dim.maxWidth / 2;
  const halfJaw = dim.jawWidth / 2;
  const chinY = topY + dim.topToChin;
  const bottomY = topY + h;
  const templeY = topY + h * 0.34;
  const cheekY = topY + h * 0.66;
  const jawY = topY + dim.topToChin * 0.88;

  return [
    `M ${centerX} ${topY}`,
    `C ${centerX - halfMax * 0.85} ${topY + h * 0.03}, ${centerX - halfMax} ${templeY - 12}, ${centerX - halfMax} ${templeY}`,
    `C ${centerX - halfMax * 0.95} ${cheekY}, ${centerX - halfJaw * 1.18} ${jawY}, ${centerX - halfJaw} ${chinY - 10}`,
    `C ${centerX - halfJaw * 0.78} ${bottomY - 4}, ${centerX - halfJaw * 0.25} ${bottomY}, ${centerX} ${bottomY}`,
    `C ${centerX + halfJaw * 0.25} ${bottomY}, ${centerX + halfJaw * 0.78} ${bottomY - 4}, ${centerX + halfJaw} ${chinY - 10}`,
    `C ${centerX + halfJaw * 1.18} ${jawY}, ${centerX + halfMax * 0.95} ${cheekY}, ${centerX + halfMax} ${templeY}`,
    `C ${centerX + halfMax} ${templeY - 12}, ${centerX + halfMax * 0.85} ${topY + h * 0.03}, ${centerX} ${topY}`,
    'Z',
  ].join(' ');
}

function sideOutlinePath(dim: HeadDimensions, originX: number, topY: number) {
  const h = dim.headHeight;
  const rearX = originX;
  const facePlaneX = originX + dim.depth * 0.65;
  const noseX = originX + dim.depth + dim.noseProjection;
  const mouthX = originX + dim.depth + dim.mouthProjection;
  const chinX = originX + dim.depth * 0.82 + dim.chinProjection;
  const bottomY = topY + h;
  const eyeY = topY + dim.topToEyeCenter;
  const noseY = topY + dim.topToNoseTip;
  const mouthY = topY + dim.topToMouth;
  const chinY = topY + dim.topToChin;

  return [
    `M ${originX + dim.depth * 0.42} ${topY}`,
    `C ${rearX + 8} ${topY + 8}, ${rearX} ${topY + h * 0.28}, ${rearX + 5} ${topY + h * 0.5}`,
    `C ${rearX + 8} ${topY + h * 0.76}, ${rearX + 38} ${bottomY}, ${originX + dim.depth * 0.58} ${bottomY}`,
    `C ${originX + dim.depth * 0.72} ${bottomY}, ${chinX} ${chinY + 7}, ${chinX} ${chinY}`,
    `C ${mouthX + 3} ${mouthY + 16}, ${mouthX + 1} ${mouthY + 4}, ${mouthX} ${mouthY}`,
    `C ${mouthX - 2} ${mouthY - 10}, ${noseX - 6} ${noseY + 9}, ${noseX} ${noseY}`,
    `C ${facePlaneX + 10} ${eyeY + 8}, ${facePlaneX + 9} ${eyeY - 22}, ${facePlaneX} ${eyeY - 30}`,
    `C ${facePlaneX - 10} ${topY + h * 0.16}, ${originX + dim.depth * 0.78} ${topY}, ${originX + dim.depth * 0.42} ${topY}`,
    'Z',
  ].join(' ');
}

function eyeHolePath(cx: number, cy: number, width: number, height: number) {
  return [
    `M ${cx - width / 2} ${cy}`,
    `C ${cx - width * 0.32} ${cy - height * 0.82}, ${cx + width * 0.3} ${cy - height * 0.82}, ${cx + width / 2} ${cy}`,
    `C ${cx + width * 0.22} ${cy + height * 0.55}, ${cx - width * 0.28} ${cy + height * 0.55}, ${cx - width / 2} ${cy}`,
    'Z',
  ].join(' ');
}

function DimensionLine({
  x1,
  y1,
  x2,
  y2,
  label,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
}) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const isVertical = Math.abs(y2 - y1) > Math.abs(x2 - x1);

  return (
    <g className="dimension">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <line x1={x1 - (isVertical ? 3 : 0)} y1={y1 - (isVertical ? 0 : 3)} x2={x1 + (isVertical ? 3 : 0)} y2={y1 + (isVertical ? 0 : 3)} />
      <line x1={x2 - (isVertical ? 3 : 0)} y1={y2 - (isVertical ? 0 : 3)} x2={x2 + (isVertical ? 3 : 0)} y2={y2 + (isVertical ? 0 : 3)} />
      <text x={midX + (isVertical ? 4 : 0)} y={midY - (isVertical ? 0 : 4)}>{label}</text>
    </g>
  );
}

function Grid() {
  const lines = [];
  for (let x = 0; x <= 297; x += 10) {
    lines.push(<line key={`x${x}`} x1={x} y1={0} x2={x} y2={210} />);
  }
  for (let y = 0; y <= 210; y += 10) {
    lines.push(<line key={`y${y}`} x1={0} y1={y} x2={297} y2={y} />);
  }
  return <g className="grid">{lines}</g>;
}

function FrontView({ dim }: { dim: HeadDimensions }) {
  const centerX = 58;
  const topY = 15;
  const eyeY = topY + dim.topToEyeCenter;
  const leftEyeX = centerX - (dim.eyeHoleGap / 2 + dim.eyeHoleWidth / 2);
  const rightEyeX = centerX + (dim.eyeHoleGap / 2 + dim.eyeHoleWidth / 2);
  const maxLeft = centerX - dim.maxWidth / 2;
  const maxRight = centerX + dim.maxWidth / 2;
  const chinY = topY + dim.topToChin;
  const mouthY = topY + dim.topToMouth;
  const noseY = topY + dim.topToNoseTip;

  return (
    <g>
      <text className="view-title" x={centerX} y={9}>正面図</text>
      <path className="outline" d={frontOutlinePath(dim, centerX, topY)} />
      <line className="datum" x1={centerX} y1={topY} x2={centerX} y2={topY + dim.headHeight} />
      <line className="datum" x1={maxLeft} y1={eyeY} x2={maxRight} y2={eyeY} />
      <path className="feature-line" d={eyeHolePath(leftEyeX, eyeY, dim.eyeHoleWidth, dim.eyeHoleHeight)} />
      <path className="feature-line" d={eyeHolePath(rightEyeX, eyeY, dim.eyeHoleWidth, dim.eyeHoleHeight)} />
      <path className="feature-line" d={`M ${centerX - 3} ${noseY - 7} L ${centerX} ${noseY} L ${centerX + 3} ${noseY - 7}`} />
      <line className="feature-line" x1={centerX - dim.jawWidth * 0.28} y1={mouthY} x2={centerX + dim.jawWidth * 0.28} y2={mouthY} />
      <line className="feature-line" x1={centerX - dim.neckWidth / 2} y1={topY + dim.headHeight} x2={centerX - dim.neckWidth / 2} y2={202} />
      <line className="feature-line" x1={centerX + dim.neckWidth / 2} y1={topY + dim.headHeight} x2={centerX + dim.neckWidth / 2} y2={202} />
      <DimensionLine x1={maxLeft} y1={topY + dim.headHeight + 6} x2={maxRight} y2={topY + dim.headHeight + 6} label={`${dim.maxWidth}mm`} />
      <DimensionLine x1={maxRight + 8} y1={topY} x2={maxRight + 8} y2={topY + dim.headHeight} label={`${dim.headHeight}mm`} />
      <DimensionLine x1={leftEyeX + dim.eyeHoleWidth / 2} y1={eyeY + 12} x2={rightEyeX - dim.eyeHoleWidth / 2} y2={eyeY + 12} label={`${dim.eyeHoleGap}mm`} />
      <DimensionLine x1={maxLeft - 8} y1={topY} x2={maxLeft - 8} y2={eyeY} label={`${dim.topToEyeCenter}mm`} />
      <DimensionLine x1={maxLeft - 14} y1={topY} x2={maxLeft - 14} y2={chinY} label={`${dim.topToChin}mm`} />
    </g>
  );
}

function SideView({ dim }: { dim: HeadDimensions }) {
  const originX = 132;
  const topY = 15;
  const eyeY = topY + dim.topToEyeCenter;
  const noseY = topY + dim.topToNoseTip;
  const mouthY = topY + dim.topToMouth;
  const chinY = topY + dim.topToChin;
  const rearX = originX;
  const frontX = originX + dim.depth;

  return (
    <g>
      <text className="view-title" x={originX + dim.depth / 2} y={9}>真横図</text>
      <path className="outline" d={sideOutlinePath(dim, originX, topY)} />
      <line className="datum" x1={rearX} y1={topY} x2={rearX + dim.depth + 35} y2={topY} />
      <line className="datum" x1={rearX} y1={eyeY} x2={rearX + dim.depth + 35} y2={eyeY} />
      <path className="feature-line" d={eyeHolePath(originX + dim.depth * 0.72, eyeY, dim.eyeHoleWidth * 0.34, dim.eyeHoleHeight)} />
      <circle className="point" cx={frontX + dim.noseProjection} cy={noseY} r={1.5} />
      <line className="feature-line" x1={frontX + dim.mouthProjection - 8} y1={mouthY} x2={frontX + dim.mouthProjection + 6} y2={mouthY} />
      <circle className="point" cx={originX + dim.depth * 0.82 + dim.chinProjection} cy={chinY} r={1.5} />
      <DimensionLine x1={rearX} y1={topY + dim.headHeight + 6} x2={frontX} y2={topY + dim.headHeight + 6} label={`${dim.depth}mm`} />
      <DimensionLine x1={frontX} y1={noseY - 9} x2={frontX + dim.noseProjection} y2={noseY - 9} label={`${dim.noseProjection}mm`} />
      <DimensionLine x1={frontX} y1={mouthY + 8} x2={frontX + dim.mouthProjection} y2={mouthY + 8} label={`${dim.mouthProjection}mm`} />
      <DimensionLine x1={frontX} y1={chinY + 8} x2={originX + dim.depth * 0.82 + dim.chinProjection} y2={chinY + 8} label={`${dim.chinProjection}mm`} />
    </g>
  );
}

function TopView({ dim }: { dim: HeadDimensions }) {
  const centerX = 245;
  const centerY = 56;
  return (
    <g>
      <text className="view-title" x={centerX} y={9}>上面図</text>
      <ellipse className="outline" cx={centerX} cy={centerY} rx={dim.maxWidth / 2} ry={dim.depth / 2} />
      <line className="datum" x1={centerX} y1={centerY - dim.depth / 2} x2={centerX} y2={centerY + dim.depth / 2} />
      <line className="datum" x1={centerX - dim.maxWidth / 2} y1={centerY} x2={centerX + dim.maxWidth / 2} y2={centerY} />
      <DimensionLine x1={centerX - dim.maxWidth / 2} y1={centerY + dim.depth / 2 + 7} x2={centerX + dim.maxWidth / 2} y2={centerY + dim.depth / 2 + 7} label={`${dim.maxWidth}mm`} />
      <DimensionLine x1={centerX + dim.maxWidth / 2 + 7} y1={centerY - dim.depth / 2} x2={centerX + dim.maxWidth / 2 + 7} y2={centerY + dim.depth / 2} label={`${dim.depth}mm`} />
    </g>
  );
}

function ScaleCheck() {
  return (
    <g className="scale-check">
      <rect x={232} y={148} width={50} height={50} />
      <line x1={232} y1={173} x2={282} y2={173} />
      <line x1={257} y1={148} x2={257} y2={198} />
      <text x={257} y={144}>50mm検尺枠</text>
    </g>
  );
}

function PrintableSheet({ dim }: { dim: HeadDimensions }) {
  return (
    <section className="sheet-wrap" aria-label="A4実寸設計図">
      <svg className="a4-sheet" width="297mm" height="210mm" viewBox="0 0 297 210" role="img" aria-label="BJDヘッド実寸正投影図">
        <rect className="sheet-bg" width={297} height={210} />
        <Grid />
        <FrontView dim={dim} />
        <SideView dim={dim} />
        <TopView dim={dim} />
        <ScaleCheck />
        <text className="sheet-note" x={10} y={205}>A4横 / 100%倍率で印刷 / 自動縮小なし / 単位:mm</text>
      </svg>
    </section>
  );
}

function DimensionInput({
  field,
  value,
  onChange,
}: {
  field: DimensionField;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="dimension-input">
      <span>{field.label}</span>
      <input
        type="number"
        min={field.min}
        max={field.max}
        step={field.step ?? 1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <small>mm</small>
    </label>
  );
}

function App() {
  const [dimensions, setDimensions] = useState<HeadDimensions>(loadInitialDimensions);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dimensions));
  }, [dimensions]);

  const groupedFields = useMemo(() => ({
    base: dimensionFields.slice(0, 5),
    features: dimensionFields.slice(5, 12),
    profile: dimensionFields.slice(12),
  }), []);

  function setDimension(key: keyof HeadDimensions, value: number) {
    const field = dimensionFields.find((item) => item.key === key);
    const safeValue = field ? clamp(value, field.min, field.max) : value;
    setDimensions((current) => updateDimensionValue(current, key, safeValue));
  }

  function reset() {
    setDimensions(defaultDimensions);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function exportPdf() {
    window.print();
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p>BJD Head Draft</p>
          <h1>実寸正投影図</h1>
        </div>
        <div className="header-actions">
          <button type="button" onClick={exportPdf}>PDF出力</button>
          <button type="button" onClick={reset}>リセット</button>
        </div>
      </header>

      <PrintableSheet dim={dimensions} />

      <section className="controls" aria-label="寸法入力">
        <fieldset>
          <legend>頭部寸法</legend>
          {groupedFields.base.map((field) => (
            <DimensionInput key={field.key} field={field} value={dimensions[field.key]} onChange={(value) => setDimension(field.key, value)} />
          ))}
        </fieldset>
        <fieldset>
          <legend>位置とアイホール</legend>
          {groupedFields.features.map((field) => (
            <DimensionInput key={field.key} field={field} value={dimensions[field.key]} onChange={(value) => setDimension(field.key, value)} />
          ))}
        </fieldset>
        <fieldset>
          <legend>横図の突出量</legend>
          {groupedFields.profile.map((field) => (
            <DimensionInput key={field.key} field={field} value={dimensions[field.key]} onChange={(value) => setDimension(field.key, value)} />
          ))}
        </fieldset>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
