import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type ViewMode = 'front' | 'side';
type PanelTab = 'head' | 'eye' | 'face' | 'neck' | 'print';
type EyeSide = 'left' | 'right';

type Point = {
  x: number;
  y: number;
};

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
  neckWidth: number;
  neckForward: number;
};

type HeadProject = {
  anchors: HeadAnchors;
  eyesLinked: boolean;
  leftEye: EyeHole;
  rightEye: EyeHole;
  slitWidth: number;
  showPhoto: boolean;
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

const STORAGE_KEY = 'bjd-photo-traced-base:v1';
const FRONT_PHOTO = './reference/front.jpg';
const SIDE_PHOTO = './reference/side.jpg';

const defaultEye: EyeHole = {
  scale: 1,
  width: 25,
  height: 9,
  outerLift: 1,
};

const defaultProject: HeadProject = {
  anchors: {
    headHeight: 180,
    headWidth: 106,
    headDepth: 142,
    occiputRoundness: 0,
    foreheadTilt: 0,
    templeWidth: 0,
    cheekboneWidth: 0,
    cheekFullness: 0,
    jawWidth: 0,
    jawLength: 0,
    eyeHeight: 0,
    eyeGap: 20,
    noseHeight: 0,
    noseLength: 0,
    mouthPosition: 0,
    chinProjection: 0,
    neckWidth: 58,
    neckForward: 0,
  },
  eyesLinked: true,
  leftEye: { ...defaultEye },
  rightEye: { ...defaultEye },
  slitWidth: 2,
  showPhoto: true,
};

const fields: FieldConfig[] = [
  { key: 'headHeight', label: '頭頂から顎下', min: 160, max: 198, tab: 'head' },
  { key: 'headWidth', label: '頭幅', min: 92, max: 120, tab: 'head' },
  { key: 'headDepth', label: '頭奥行', min: 122, max: 160, tab: 'head' },
  { key: 'occiputRoundness', label: '後頭部', min: -14, max: 18, tab: 'head' },
  { key: 'foreheadTilt', label: '額の傾き', min: -12, max: 14, tab: 'head' },
  { key: 'templeWidth', label: 'こめかみ', min: -10, max: 10, tab: 'face' },
  { key: 'cheekboneWidth', label: '頬骨', min: -12, max: 12, tab: 'face' },
  { key: 'cheekFullness', label: '頬', min: -10, max: 12, tab: 'face' },
  { key: 'jawWidth', label: '下顎角', min: -12, max: 12, tab: 'face' },
  { key: 'jawLength', label: '顎先', min: -8, max: 10, tab: 'face' },
  { key: 'noseHeight', label: '鼻先上下', min: -10, max: 10, tab: 'face' },
  { key: 'noseLength', label: '鼻先突出', min: -10, max: 16, tab: 'face' },
  { key: 'mouthPosition', label: '口元', min: -12, max: 12, tab: 'face' },
  { key: 'chinProjection', label: '顎先突出', min: -10, max: 14, tab: 'face' },
  { key: 'eyeHeight', label: 'アイホール位置', min: -18, max: 18, tab: 'eye' },
  { key: 'eyeGap', label: '左右アイホール間隔', min: 10, max: 32, tab: 'eye' },
  { key: 'neckWidth', label: '首幅', min: 42, max: 74, tab: 'neck' },
  { key: 'neckForward', label: '首前後', min: -12, max: 12, tab: 'neck' },
];

const eyeFields: EyeFieldConfig[] = [
  { key: 'scale', label: 'アイホール倍率', min: 0.78, max: 1.24, step: 0.01 },
  { key: 'width', label: 'アイホール横幅', min: 18, max: 32 },
  { key: 'height', label: 'アイホール縦幅', min: 6, max: 14 },
  { key: 'outerLift', label: '目尻上下', min: -6, max: 6 },
];

const tabLabels: Record<PanelTab, string> = {
  head: '頭部',
  eye: 'アイホール',
  face: '顔',
  neck: '首',
  print: '印刷',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function n(value: number) {
  return Number(value.toFixed(2));
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

function frontPoint(anchor: HeadAnchors, point: Point): Point {
  const scaleX = anchor.headWidth / defaultProject.anchors.headWidth;
  const scaleY = anchor.headHeight / defaultProject.anchors.headHeight;
  return {
    x: 110 + (point.x - 110) * scaleX,
    y: 28 + (point.y - 28) * scaleY,
  };
}

function sidePoint(anchor: HeadAnchors, point: Point): Point {
  const scaleX = anchor.headDepth / defaultProject.anchors.headDepth;
  const scaleY = anchor.headHeight / defaultProject.anchors.headHeight;
  return {
    x: 34 + (point.x - 34) * scaleX,
    y: 24 + (point.y - 24) * scaleY,
  };
}

function frontHeadPath(anchor: HeadAnchors) {
  const pt = (point: Point) => frontPoint(anchor, point);
  const top = pt({ x: 110, y: 28 });
  const upperLeft = pt({ x: 65, y: 48 });
  const sideLeft = pt({ x: 47 - anchor.templeWidth, y: 109 });
  const templeLeft = pt({ x: 52 - anchor.templeWidth, y: 126 });
  const cheekboneLeft = pt({ x: 41 - anchor.cheekboneWidth, y: 142 });
  const cheekLeft = pt({ x: 52 - anchor.cheekFullness, y: 168 });
  const jawLeft = pt({ x: 70 - anchor.jawWidth, y: 196 + anchor.jawLength * 0.35 });
  const chinSideLeft = pt({ x: 84 - anchor.jawWidth * 0.15, y: 214 + anchor.jawLength });
  const chin = pt({ x: 110, y: 222 + anchor.jawLength });
  const mirror = (point: Point): Point => ({ x: 220 - point.x, y: point.y });
  const upperRight = mirror(upperLeft);
  const sideRight = mirror(sideLeft);
  const templeRight = mirror(templeLeft);
  const cheekboneRight = mirror(cheekboneLeft);
  const cheekRight = mirror(cheekLeft);
  const jawRight = mirror(jawLeft);
  const chinSideRight = mirror(chinSideLeft);

  return [
    `M ${n(top.x)} ${n(top.y)}`,
    `C ${n(top.x - 24)} ${n(top.y - 1)}, ${n(upperLeft.x - 10)} ${n(upperLeft.y + 8)}, ${n(upperLeft.x)} ${n(upperLeft.y)}`,
    `C ${n(48)} ${n(70)}, ${n(sideLeft.x)} ${n(88)}, ${n(sideLeft.x)} ${n(sideLeft.y)}`,
    `C ${n(sideLeft.x + 3)} ${n(120)}, ${n(templeLeft.x)} ${n(123)}, ${n(templeLeft.x)} ${n(templeLeft.y)}`,
    `C ${n(templeLeft.x - 9)} ${n(130)}, ${n(cheekboneLeft.x)} ${n(136)}, ${n(cheekboneLeft.x)} ${n(cheekboneLeft.y)}`,
    `C ${n(cheekboneLeft.x + 2)} ${n(158)}, ${n(cheekLeft.x)} ${n(160)}, ${n(cheekLeft.x)} ${n(cheekLeft.y)}`,
    `C ${n(cheekLeft.x + 2)} ${n(184)}, ${n(jawLeft.x)} ${n(187)}, ${n(jawLeft.x)} ${n(jawLeft.y)}`,
    `C ${n(jawLeft.x + 2)} ${n(208)}, ${n(chinSideLeft.x)} ${n(chinSideLeft.y)}, ${n(chin.x)} ${n(chin.y)}`,
    `C ${n(chinSideRight.x)} ${n(chinSideRight.y)}, ${n(jawRight.x - 2)} ${n(208)}, ${n(jawRight.x)} ${n(jawRight.y)}`,
    `C ${n(jawRight.x)} ${n(187)}, ${n(cheekRight.x - 2)} ${n(184)}, ${n(cheekRight.x)} ${n(cheekRight.y)}`,
    `C ${n(cheekRight.x)} ${n(160)}, ${n(cheekboneRight.x - 2)} ${n(158)}, ${n(cheekboneRight.x)} ${n(cheekboneRight.y)}`,
    `C ${n(cheekboneRight.x)} ${n(136)}, ${n(templeRight.x + 9)} ${n(130)}, ${n(templeRight.x)} ${n(templeRight.y)}`,
    `C ${n(templeRight.x)} ${n(123)}, ${n(sideRight.x - 3)} ${n(120)}, ${n(sideRight.x)} ${n(sideRight.y)}`,
    `C ${n(sideRight.x)} ${n(88)}, ${n(172)} ${n(70)}, ${n(upperRight.x)} ${n(upperRight.y)}`,
    `C ${n(upperRight.x + 10)} ${n(upperRight.y + 8)}, ${n(top.x + 24)} ${n(top.y - 1)}, ${n(top.x)} ${n(top.y)}`,
    'Z',
  ].join(' ');
}

function sideHeadPath(anchor: HeadAnchors) {
  const pt = (point: Point) => sidePoint(anchor, point);
  const top = pt({ x: 116, y: 34 });
  const rearTop = pt({ x: 70 - anchor.occiputRoundness, y: 53 });
  const occiput = pt({ x: 44 - anchor.occiputRoundness, y: 104 });
  const rearLow = pt({ x: 61 - anchor.occiputRoundness * 0.45, y: 148 });
  const neckBack = pt({ x: 84 - anchor.neckWidth * 0.12, y: 166 });
  const neckFront = pt({ x: 119 + anchor.neckForward + anchor.neckWidth * 0.1, y: 168 });
  const chinUnder = pt({ x: 145 + anchor.chinProjection * 0.35, y: 172 + anchor.jawLength });
  const chin = pt({ x: 163 + anchor.chinProjection, y: 164 + anchor.jawLength });
  const lowerLip = pt({ x: 166 + anchor.chinProjection * 0.22, y: 150 + anchor.mouthPosition });
  const upperLip = pt({ x: 176 + anchor.chinProjection * 0.14, y: 143 + anchor.mouthPosition });
  const subNasal = pt({ x: 173 + anchor.noseLength * 0.2, y: 136 + anchor.noseHeight * 0.42 });
  const noseTip = pt({ x: 188 + anchor.noseLength, y: 129 + anchor.noseHeight });
  const noseRoot = pt({ x: 161 + anchor.foreheadTilt * 0.35, y: 101 });
  const forehead = pt({ x: 158 + anchor.foreheadTilt, y: 66 });

  return [
    `M ${n(top.x)} ${n(top.y)}`,
    `C ${n(92)} ${n(31)}, ${n(rearTop.x)} ${n(rearTop.y)}, ${n(rearTop.x)} ${n(rearTop.y)}`,
    `C ${n(48)} ${n(72)}, ${n(occiput.x)} ${n(92)}, ${n(occiput.x)} ${n(occiput.y)}`,
    `C ${n(occiput.x + 5)} ${n(133)}, ${n(rearLow.x)} ${n(146)}, ${n(rearLow.x)} ${n(rearLow.y)}`,
    `C ${n(rearLow.x + 3)} ${n(160)}, ${n(neckBack.x)} ${n(neckBack.y)}, ${n(neckBack.x)} ${n(neckBack.y)}`,
    `C ${n(96)} ${n(169)}, ${n(109)} ${n(169)}, ${n(neckFront.x)} ${n(neckFront.y)}`,
    `C ${n(144)} ${n(191)}, ${n(chinUnder.x)} ${n(chinUnder.y)}, ${n(chin.x)} ${n(chin.y)}`,
    `C ${n(176)} ${n(168)}, ${n(lowerLip.x - 3)} ${n(lowerLip.y + 4)}, ${n(lowerLip.x)} ${n(lowerLip.y)}`,
    `C ${n(186)} ${n(156)}, ${n(193)} ${n(155)}, ${n(upperLip.x)} ${n(upperLip.y)}`,
    `C ${n(188)} ${n(147)}, ${n(182)} ${n(147)}, ${n(subNasal.x)} ${n(subNasal.y)}`,
    `C ${n(181)} ${n(136)}, ${n(noseTip.x + 6)} ${n(noseTip.y + 4)}, ${n(noseTip.x)} ${n(noseTip.y)}`,
    `C ${n(184)} ${n(119)}, ${n(174)} ${n(116)}, ${n(noseRoot.x)} ${n(noseRoot.y)}`,
    `C ${n(163 + anchor.foreheadTilt)} ${n(91)}, ${n(forehead.x)} ${n(78)}, ${n(forehead.x)} ${n(forehead.y)}`,
    `C ${n(156 + anchor.foreheadTilt)} ${n(44)}, ${n(135)} ${n(35)}, ${n(top.x)} ${n(top.y)}`,
    'Z',
  ].join(' ');
}

function frontEyePath(anchor: HeadAnchors, eye: EyeHole, side: -1 | 1) {
  const cy = 132 + anchor.eyeHeight;
  const cx = 110 + side * (anchor.eyeGap / 2 + eye.width * eye.scale / 2 + 5);
  return eyeHolePath(cx, cy, eye, side);
}

function sideEyePath(anchor: HeadAnchors, eye: EyeHole) {
  const scale = eye.scale;
  const cy = 116 + anchor.eyeHeight;
  const cx = 168 + anchor.foreheadTilt * 0.2;
  const width = eye.width * 0.42 * scale;
  const height = eye.height * 0.9 * scale;
  return [
    `M ${n(cx - width * 0.45)} ${n(cy)}`,
    `C ${n(cx - width * 0.08)} ${n(cy - height)}, ${n(cx + width * 0.5)} ${n(cy - height * 0.6)}, ${n(cx + width * 0.58)} ${n(cy - eye.outerLift * 0.5)}`,
    `C ${n(cx + width * 0.42)} ${n(cy + height * 0.7)}, ${n(cx - width * 0.18)} ${n(cy + height * 0.55)}, ${n(cx - width * 0.45)} ${n(cy)}`,
    'Z',
  ].join(' ');
}

function eyeHolePath(cx: number, cy: number, eye: EyeHole, side: -1 | 1) {
  const width = eye.width * eye.scale;
  const height = eye.height * eye.scale;
  const innerX = cx - side * width / 2;
  const outerX = cx + side * width / 2;
  const innerY = cy + height * 0.12;
  const outerY = cy - eye.outerLift;
  return [
    `M ${n(innerX)} ${n(innerY)}`,
    `C ${n(innerX + side * width * 0.2)} ${n(cy - height)}, ${n(outerX - side * width * 0.38)} ${n(cy - height * 0.85)}, ${n(outerX)} ${n(outerY)}`,
    `C ${n(outerX - side * width * 0.22)} ${n(cy + height * 0.58)}, ${n(innerX + side * width * 0.24)} ${n(cy + height * 0.62)}, ${n(innerX)} ${n(innerY)}`,
    'Z',
  ].join(' ');
}

function activeClass(activeKey: string | null, keys: string[]) {
  return activeKey && keys.includes(activeKey) ? ' active-shape' : '';
}

function TraceDot({ point, active = false }: { point: Point; active?: boolean }) {
  return <circle className={`trace-dot${active ? ' active-dot' : ''}`} cx={point.x} cy={point.y} r="2.1" />;
}

function FrontReferenceView({ project, activeKey }: { project: HeadProject; activeKey: string | null }) {
  const { anchors } = project;
  const eyeActive = ['scale', 'width', 'height', 'outerLift', 'eyeGap', 'eyeHeight'];
  const faceActive = ['templeWidth', 'cheekboneWidth', 'cheekFullness', 'jawWidth', 'jawLength'];
  const points = [
    frontPoint(anchors, { x: 110, y: 28 }),
    frontPoint(anchors, { x: 52 - anchors.templeWidth, y: 126 }),
    frontPoint(anchors, { x: 41 - anchors.cheekboneWidth, y: 142 }),
    frontPoint(anchors, { x: 52 - anchors.cheekFullness, y: 168 }),
    frontPoint(anchors, { x: 70 - anchors.jawWidth, y: 196 + anchors.jawLength * 0.35 }),
    frontPoint(anchors, { x: 110, y: 222 + anchors.jawLength }),
  ];

  return (
    <svg className="model-svg" viewBox="0 0 220 232" role="img" aria-label="正面BJDヘッド固定ベース">
      <rect className="sheet-bg" width="220" height="232" />
      {project.showPhoto && <image className="reference-photo" href={FRONT_PHOTO} x="0" y="0" width="220" height="232" preserveAspectRatio="xMidYMid slice" />}
      <path className={`head-fill${activeClass(activeKey, ['headHeight', 'headWidth', ...faceActive])}`} d={frontHeadPath(anchors)} />
      <line className="datum" x1="110" y1="24" x2="110" y2="224" />
      <line className={`datum${activeClass(activeKey, ['eyeHeight'])}`} x1="44" y1={132 + anchors.eyeHeight} x2="176" y2={132 + anchors.eyeHeight} />
      <path className={`cut-line eye-cut${activeClass(activeKey, eyeActive)}`} d={frontEyePath(anchors, project.leftEye, -1)} />
      <path className={`cut-line eye-cut${activeClass(activeKey, eyeActive)}`} d={frontEyePath(anchors, project.rightEye, 1)} />
      <path className={`feature${activeClass(activeKey, ['noseHeight'])}`} d={`M 104 ${137 + anchors.noseHeight} C 101 ${149 + anchors.noseHeight}, 104 ${158 + anchors.noseHeight}, 110 ${160 + anchors.noseHeight} C 116 ${158 + anchors.noseHeight}, 119 ${149 + anchors.noseHeight}, 116 ${137 + anchors.noseHeight}`} />
      <path className={`feature${activeClass(activeKey, ['mouthPosition'])}`} d={`M 87 ${177 + anchors.mouthPosition} C 99 ${181 + anchors.mouthPosition}, 121 ${181 + anchors.mouthPosition}, 133 ${177 + anchors.mouthPosition}`} />
      <path className="feature soft" d={`M 48 ${156 + anchors.cheekFullness * 0.4} C 65 ${170 + anchors.cheekFullness}, 82 ${174 + anchors.cheekFullness}, 102 ${168}`} />
      <path className="feature soft" d={`M 172 ${156 + anchors.cheekFullness * 0.4} C 155 ${170 + anchors.cheekFullness}, 138 ${174 + anchors.cheekFullness}, 118 ${168}`} />
      {points.map((point, index) => <TraceDot key={index} point={point} active={activeKey !== null && ['headHeight', 'headWidth', ...faceActive].includes(activeKey)} />)}
    </svg>
  );
}

function SideReferenceView({ project, activeKey }: { project: HeadProject; activeKey: string | null }) {
  const { anchors } = project;
  const points = [
    sidePoint(anchors, { x: 116, y: 34 }),
    sidePoint(anchors, { x: 158 + anchors.foreheadTilt, y: 66 }),
    sidePoint(anchors, { x: 161 + anchors.foreheadTilt * 0.35, y: 101 }),
    sidePoint(anchors, { x: 188 + anchors.noseLength, y: 129 + anchors.noseHeight }),
    sidePoint(anchors, { x: 173 + anchors.noseLength * 0.2, y: 136 + anchors.noseHeight * 0.42 }),
    sidePoint(anchors, { x: 176 + anchors.chinProjection * 0.14, y: 143 + anchors.mouthPosition }),
    sidePoint(anchors, { x: 166 + anchors.chinProjection * 0.22, y: 150 + anchors.mouthPosition }),
    sidePoint(anchors, { x: 163 + anchors.chinProjection, y: 164 + anchors.jawLength }),
    sidePoint(anchors, { x: 119 + anchors.neckForward + anchors.neckWidth * 0.1, y: 168 }),
    sidePoint(anchors, { x: 84 - anchors.neckWidth * 0.12, y: 166 }),
    sidePoint(anchors, { x: 44 - anchors.occiputRoundness, y: 104 }),
  ];

  return (
    <svg className="model-svg" viewBox="0 0 240 220" role="img" aria-label="側面BJDヘッド固定ベース">
      <rect className="sheet-bg" width="240" height="220" />
      {project.showPhoto && <image className="reference-photo" href={SIDE_PHOTO} x="0" y="0" width="240" height="220" preserveAspectRatio="xMidYMid slice" />}
      <path className={`head-fill${activeClass(activeKey, ['headHeight', 'headDepth', 'occiputRoundness', 'foreheadTilt', 'jawLength', 'chinProjection', 'noseHeight', 'noseLength', 'mouthPosition', 'neckWidth', 'neckForward'])}`} d={sideHeadPath(anchors)} />
      <line className={`datum${activeClass(activeKey, ['eyeHeight'])}`} x1="78" y1={116 + anchors.eyeHeight} x2="186" y2={116 + anchors.eyeHeight} />
      <path className={`cut-line eye-cut${activeClass(activeKey, ['scale', 'width', 'height', 'outerLift', 'eyeHeight'])}`} d={sideEyePath(anchors, project.rightEye)} />
      <path className={`feature${activeClass(activeKey, ['noseHeight', 'noseLength'])}`} d={`M ${161 + anchors.foreheadTilt * 0.35} 101 C ${174 + anchors.noseLength * 0.18} ${116 + anchors.noseHeight * 0.35}, ${194 + anchors.noseLength} ${124 + anchors.noseHeight}, ${188 + anchors.noseLength} ${129 + anchors.noseHeight}`} />
      <path className={`feature${activeClass(activeKey, ['mouthPosition', 'chinProjection'])}`} d={`M ${173 + anchors.noseLength * 0.2} ${136 + anchors.noseHeight * 0.42} C 181 ${142 + anchors.mouthPosition}, 178 ${151 + anchors.mouthPosition}, ${166 + anchors.chinProjection * 0.22} ${150 + anchors.mouthPosition}`} />
      <path className="feature soft" d="M 96 101 C 86 115, 84 136, 92 155" />
      {points.map((point, index) => <TraceDot key={index} point={point} active={activeKey !== null} />)}
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
  const printProject = { ...project, showPhoto: false };
  return (
    <section className="print-sheet-wrap" aria-label="芯用型紙">
      <svg className="a4-sheet" width="297mm" height="210mm" viewBox="0 0 297 210" role="img" aria-label="正面側面芯用型紙">
        <rect className="sheet-bg" width="297" height="210" />
        <g transform="translate(8 -9) scale(0.92)">
          <FrontReferenceView project={printProject} activeKey={null} />
          <line className="slit" x1="110" y1="28" x2="110" y2="118" />
          <rect className="slit-box" x={110 - project.slitWidth / 2} y="28" width={project.slitWidth} height="90" />
        </g>
        <g transform="translate(104 0) scale(0.92)">
          <SideReferenceView project={printProject} activeKey={null} />
          <line className="slit" x1="126" y1="110" x2="126" y2="191" />
          <rect className="slit-box" x={126 - project.slitWidth / 2} y="110" width={project.slitWidth} height="81" />
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
      const sideKey = activeEyeSide === 'left' ? 'leftEye' : 'rightEye';
      const target = { ...current[sideKey], [key]: nextValue };
      if (current.eyesLinked) {
        return { ...current, leftEye: { ...target }, rightEye: { ...target } };
      }
      return { ...current, [sideKey]: target };
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
            <h1>写真トレース固定ベース</h1>
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
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={project.showPhoto}
                  onChange={(event) => setProject((current) => ({ ...current, showPhoto: event.target.checked }))}
                />
                下絵表示
              </label>
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
