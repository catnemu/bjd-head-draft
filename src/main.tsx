import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

type AppScreen = 'home' | 'work' | 'output';
type BasePresetId = 'sd' | 'sdm' | 'msd' | 'yosd' | 'original';
type ViewMode = 'wire' | 'core' | 'finished';
type OutputMode = 'finished' | 'templates' | 'crossCore';
type ControlTab = 'base' | 'skull' | 'face' | 'core' | 'print';

type HeadDimensions = {
  totalHeight: number;
  headWidth: number;
  headDepth: number;
  neckWidth: number;
  neckOffsetX: number;
  neckOffsetY: number;
};

type SkullShape = {
  backRoundness: number;
  foreheadProjection: number;
  foreheadSlope: number;
  templeWidth: number;
  cheekboneWidth: number;
  cheekVolume: number;
  jawWidth: number;
  jawLength: number;
  jawAngle: number;
  chinWidth: number;
  chinProjection: number;
};

type EyeSettings = {
  height: number;
  width: number;
  gap: number;
  tilt: number;
  depth: number;
  socketDepth: number;
};

type NoseSettings = {
  bridge: number;
  height: number;
  length: number;
  wingWidth: number;
  tipRoundness: number;
  tipHeight: number;
};

type MouthSettings = {
  upperLip: number;
  lowerLip: number;
  width: number;
  projection: number;
  corner: number;
};

type EarSettings = {
  height: number;
  size: number;
  position: number;
  tilt: number;
};

type FaceLandmarks = {
  eye: EyeSettings;
  nose: NoseSettings;
  mouth: MouthSettings;
  ear: EarSettings;
};

type DisplaySettings = {
  mode: ViewMode;
  mirrored: boolean;
  translucent: boolean;
};

type CoreSettings = {
  coreInset: number;
  shellThickness: number;
  materialThickness: number;
  slitClearance: number;
  slitDepthRatio: number;
  guideLines: boolean;
};

type PrintSettings = {
  scale: number;
  a4Split: boolean;
  showGuides: boolean;
};

type HeadProject = {
  base: BasePresetId;
  dimensions: HeadDimensions;
  skull: SkullShape;
  face: FaceLandmarks;
  display: DisplaySettings;
  core: CoreSettings;
  print: PrintSettings;
};

type NumericField<TGroup extends keyof HeadProject> = {
  group: TGroup;
  key: keyof HeadProject[TGroup];
  label: string;
  min: number;
  max: number;
  unit?: string;
};

type FaceField = {
  part: keyof FaceLandmarks;
  key: string;
  label: string;
  min: number;
  max: number;
  unit?: string;
};

const STORAGE_KEY = 'bjd-core-designer:v1';

const basePresets: Record<BasePresetId, { label: string; dimensions: HeadDimensions; skull: SkullShape }> = {
  sd: {
    label: 'SD',
    dimensions: { totalHeight: 70, headWidth: 48, headDepth: 56, neckWidth: 22, neckOffsetX: 0, neckOffsetY: 4 },
    skull: { backRoundness: 72, foreheadProjection: 12, foreheadSlope: 4, templeWidth: 40, cheekboneWidth: 44, cheekVolume: 10, jawWidth: 30, jawLength: 18, jawAngle: 8, chinWidth: 16, chinProjection: 4 },
  },
  sdm: {
    label: 'SDM',
    dimensions: { totalHeight: 60, headWidth: 42, headDepth: 49, neckWidth: 18, neckOffsetX: 0, neckOffsetY: 3 },
    skull: { backRoundness: 68, foreheadProjection: 10, foreheadSlope: 3, templeWidth: 35, cheekboneWidth: 38, cheekVolume: 9, jawWidth: 26, jawLength: 15, jawAngle: 7, chinWidth: 14, chinProjection: 3 },
  },
  msd: {
    label: 'MSD',
    dimensions: { totalHeight: 55, headWidth: 38, headDepth: 45, neckWidth: 16, neckOffsetX: 0, neckOffsetY: 3 },
    skull: { backRoundness: 66, foreheadProjection: 9, foreheadSlope: 3, templeWidth: 32, cheekboneWidth: 35, cheekVolume: 8, jawWidth: 24, jawLength: 14, jawAngle: 6, chinWidth: 13, chinProjection: 3 },
  },
  yosd: {
    label: '幼SD',
    dimensions: { totalHeight: 50, headWidth: 36, headDepth: 42, neckWidth: 14, neckOffsetX: 0, neckOffsetY: 2 },
    skull: { backRoundness: 78, foreheadProjection: 12, foreheadSlope: 2, templeWidth: 32, cheekboneWidth: 34, cheekVolume: 12, jawWidth: 22, jawLength: 12, jawAngle: 5, chinWidth: 12, chinProjection: 2 },
  },
  original: {
    label: 'オリジナル',
    dimensions: { totalHeight: 60, headWidth: 40, headDepth: 48, neckWidth: 18, neckOffsetX: 0, neckOffsetY: 3 },
    skull: { backRoundness: 70, foreheadProjection: 10, foreheadSlope: 3, templeWidth: 34, cheekboneWidth: 38, cheekVolume: 9, jawWidth: 26, jawLength: 15, jawAngle: 7, chinWidth: 14, chinProjection: 3 },
  },
};

const defaultProject: HeadProject = {
  base: 'sdm',
  dimensions: { ...basePresets.sdm.dimensions },
  skull: { ...basePresets.sdm.skull },
  face: {
    eye: { height: 25, width: 9, gap: 10, tilt: 0, depth: 4, socketDepth: 3 },
    nose: { bridge: 5, height: 6, length: 13, wingWidth: 10, tipRoundness: 5, tipHeight: 4 },
    mouth: { upperLip: 2, lowerLip: 3, width: 16, projection: 3, corner: 0 },
    ear: { height: 27, size: 14, position: 0, tilt: 0 },
  },
  display: { mode: 'core', mirrored: false, translucent: true },
  core: { coreInset: 4, shellThickness: 5, materialThickness: 1.5, slitClearance: 0.2, slitDepthRatio: 0.52, guideLines: true },
  print: { scale: 100, a4Split: false, showGuides: true },
};

const dimensionFields: NumericField<'dimensions'>[] = [
  { group: 'dimensions', key: 'totalHeight', label: '頭頂から顎下', min: 45, max: 90, unit: 'mm' },
  { group: 'dimensions', key: 'headWidth', label: '頭幅', min: 30, max: 70, unit: 'mm' },
  { group: 'dimensions', key: 'headDepth', label: '頭奥行', min: 34, max: 76, unit: 'mm' },
  { group: 'dimensions', key: 'neckWidth', label: '首の太さ', min: 10, max: 34, unit: 'mm' },
  { group: 'dimensions', key: 'neckOffsetX', label: '首の左右位置', min: -8, max: 8, unit: 'mm' },
  { group: 'dimensions', key: 'neckOffsetY', label: '首の前後位置', min: -8, max: 8, unit: 'mm' },
];

const skullFields: NumericField<'skull'>[] = [
  { group: 'skull', key: 'backRoundness', label: '後頭部の丸み', min: 40, max: 95 },
  { group: 'skull', key: 'foreheadProjection', label: '前頭部の張り', min: 0, max: 20, unit: 'mm' },
  { group: 'skull', key: 'foreheadSlope', label: '額の傾き', min: -8, max: 12 },
  { group: 'skull', key: 'templeWidth', label: 'こめかみ', min: 24, max: 60, unit: 'mm' },
  { group: 'skull', key: 'cheekboneWidth', label: '頬骨', min: 26, max: 65, unit: 'mm' },
  { group: 'skull', key: 'cheekVolume', label: '頬の膨らみ', min: 0, max: 20 },
  { group: 'skull', key: 'jawWidth', label: '顎幅', min: 14, max: 45, unit: 'mm' },
  { group: 'skull', key: 'jawLength', label: '顎長', min: 8, max: 28, unit: 'mm' },
  { group: 'skull', key: 'jawAngle', label: '顎角度', min: -6, max: 18 },
  { group: 'skull', key: 'chinWidth', label: '顎先幅', min: 8, max: 30, unit: 'mm' },
  { group: 'skull', key: 'chinProjection', label: '顎先の突出', min: -4, max: 12, unit: 'mm' },
];

const faceFields: FaceField[] = [
  { part: 'eye', key: 'height', label: '目の高さ', min: 18, max: 38, unit: 'mm' },
  { part: 'eye', key: 'width', label: '目の横幅', min: 4, max: 18, unit: 'mm' },
  { part: 'eye', key: 'gap', label: '目の左右距離', min: 4, max: 20, unit: 'mm' },
  { part: 'eye', key: 'tilt', label: '目の傾き', min: -12, max: 12 },
  { part: 'eye', key: 'depth', label: '目の奥行', min: 0, max: 12, unit: 'mm' },
  { part: 'eye', key: 'socketDepth', label: '眼窩の深さ', min: 0, max: 12, unit: 'mm' },
  { part: 'nose', key: 'bridge', label: '鼻筋', min: 0, max: 12 },
  { part: 'nose', key: 'height', label: '鼻の高さ', min: 0, max: 14, unit: 'mm' },
  { part: 'nose', key: 'length', label: '鼻の長さ', min: 6, max: 24, unit: 'mm' },
  { part: 'nose', key: 'wingWidth', label: '小鼻幅', min: 5, max: 18, unit: 'mm' },
  { part: 'nose', key: 'tipRoundness', label: '鼻先形状', min: 0, max: 12 },
  { part: 'nose', key: 'tipHeight', label: '鼻先の高さ', min: 0, max: 12, unit: 'mm' },
  { part: 'mouth', key: 'upperLip', label: '上唇厚み', min: 0, max: 8, unit: 'mm' },
  { part: 'mouth', key: 'lowerLip', label: '下唇厚み', min: 0, max: 8, unit: 'mm' },
  { part: 'mouth', key: 'width', label: '唇の横幅', min: 8, max: 28, unit: 'mm' },
  { part: 'mouth', key: 'projection', label: '唇の突出量', min: 0, max: 10, unit: 'mm' },
  { part: 'mouth', key: 'corner', label: '口角', min: -8, max: 8 },
  { part: 'ear', key: 'height', label: '耳の高さ', min: 18, max: 45, unit: 'mm' },
  { part: 'ear', key: 'size', label: '耳の大きさ', min: 8, max: 24, unit: 'mm' },
  { part: 'ear', key: 'position', label: '耳の前後位置', min: -10, max: 10, unit: 'mm' },
  { part: 'ear', key: 'tilt', label: '耳の傾き', min: -12, max: 12 },
];

const coreFields: NumericField<'core'>[] = [
  { group: 'core', key: 'coreInset', label: '芯の控え量', min: 1, max: 12, unit: 'mm' },
  { group: 'core', key: 'shellThickness', label: '肉付け厚み', min: 1, max: 12, unit: 'mm' },
  { group: 'core', key: 'materialThickness', label: 'スリット幅', min: 0.5, max: 5, unit: 'mm' },
  { group: 'core', key: 'slitClearance', label: '差し込み余裕', min: 0, max: 1, unit: 'mm' },
  { group: 'core', key: 'slitDepthRatio', label: 'スリット深さ', min: 0.35, max: 0.7 },
];

function loadProject() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultProject, ...JSON.parse(raw) } as HeadProject : defaultProject;
  } catch {
    return defaultProject;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function n(value: number) {
  return Number(value.toFixed(2));
}

function frontOutline(project: HeadProject, inset = 0) {
  const { dimensions: d, skull: s } = project;
  const h = d.totalHeight - inset * 1.2;
  const centerX = 70;
  const topY = 12 + inset * 0.6;
  const templeY = topY + h * 0.31;
  const cheekY = topY + h * 0.58;
  const jawY = topY + h - s.jawLength;
  const chinY = topY + h;
  const maxHalf = Math.max(4, d.headWidth / 2 - inset);
  const templeHalf = Math.max(4, s.templeWidth / 2 - inset * 0.7);
  const cheekHalf = Math.max(4, (s.cheekboneWidth + s.cheekVolume * 0.35) / 2 - inset);
  const jawHalf = Math.max(3, s.jawWidth / 2 - inset * 0.75);
  const chinHalf = Math.max(2, s.chinWidth / 2 - inset * 0.5);
  const jawPull = s.jawAngle * 0.35;

  return [
    `M ${n(centerX)} ${n(topY)}`,
    `C ${n(centerX - maxHalf * 0.9)} ${n(topY + 2)}, ${n(centerX - maxHalf)} ${n(templeY - 7)}, ${n(centerX - templeHalf)} ${n(templeY)}`,
    `C ${n(centerX - cheekHalf)} ${n(cheekY - 6)}, ${n(centerX - cheekHalf + jawPull)} ${n(cheekY + 4)}, ${n(centerX - jawHalf)} ${n(jawY)}`,
    `C ${n(centerX - chinHalf)} ${n(chinY - 4)}, ${n(centerX - chinHalf)} ${n(chinY)}, ${n(centerX)} ${n(chinY)}`,
    `C ${n(centerX + chinHalf)} ${n(chinY)}, ${n(centerX + chinHalf)} ${n(chinY - 4)}, ${n(centerX + jawHalf)} ${n(jawY)}`,
    `C ${n(centerX + cheekHalf - jawPull)} ${n(cheekY + 4)}, ${n(centerX + cheekHalf)} ${n(cheekY - 6)}, ${n(centerX + templeHalf)} ${n(templeY)}`,
    `C ${n(centerX + maxHalf)} ${n(templeY - 7)}, ${n(centerX + maxHalf * 0.9)} ${n(topY + 2)}, ${n(centerX)} ${n(topY)}`,
    'Z',
  ].join(' ');
}

function sideOutline(project: HeadProject, inset = 0) {
  const { dimensions: d, skull: s, face } = project;
  const h = d.totalHeight - inset * 1.2;
  const rearX = 170 + inset * 0.4;
  const topY = 12 + inset * 0.6;
  const depth = Math.max(12, d.headDepth - inset * 1.5);
  const back = rearX + (100 - s.backRoundness) * 0.08;
  const facePlane = rearX + depth * 0.72;
  const foreheadX = facePlane + s.foreheadProjection - s.foreheadSlope * 0.35;
  const noseY = topY + face.nose.length + face.eye.height + 6;
  const mouthY = topY + h * 0.72;
  const chinY = topY + h;
  const noseX = facePlane + face.nose.height + face.nose.tipHeight - inset * 0.5;
  const lipX = facePlane + face.mouth.projection - inset * 0.4;
  const chinX = facePlane - 4 + s.chinProjection - inset * 0.5;

  return [
    `M ${n(rearX + depth * 0.45)} ${n(topY)}`,
    `C ${n(back - 8)} ${n(topY + 8)}, ${n(back - 9)} ${n(topY + h * 0.45)}, ${n(back)} ${n(topY + h * 0.65)}`,
    `C ${n(back + 7)} ${n(topY + h * 0.88)}, ${n(rearX + depth * 0.45)} ${n(chinY)}, ${n(chinX)} ${n(chinY)}`,
    `C ${n(lipX - 3)} ${n(mouthY + 12)}, ${n(lipX)} ${n(mouthY + 4)}, ${n(lipX)} ${n(mouthY)}`,
    `C ${n(lipX - 2)} ${n(mouthY - 7)}, ${n(noseX - face.nose.tipRoundness * 0.3)} ${n(noseY + 5)}, ${n(noseX)} ${n(noseY)}`,
    `C ${n(foreheadX + 2)} ${n(topY + h * 0.36)}, ${n(foreheadX)} ${n(topY + h * 0.1)}, ${n(rearX + depth * 0.45)} ${n(topY)}`,
    'Z',
  ].join(' ');
}

function topOutline(project: HeadProject, inset = 0) {
  const { dimensions: d, skull: s } = project;
  const cx = 70;
  const cy = 43;
  const rx = Math.max(8, d.headWidth / 2 - inset);
  const ry = Math.max(8, d.headDepth / 2 - inset);
  const cheek = (s.cheekboneWidth - d.headWidth) * 0.12 + s.cheekVolume * 0.12;
  const temple = (s.templeWidth - d.headWidth) * 0.08;
  return [
    `M ${n(cx)} ${n(cy - ry)}`,
    `C ${n(cx - rx + temple)} ${n(cy - ry * 0.78)}, ${n(cx - rx - cheek)} ${n(cy - ry * 0.15)}, ${n(cx - rx * 0.86)} ${n(cy + ry * 0.33)}`,
    `C ${n(cx - rx * 0.55)} ${n(cy + ry * 0.95)}, ${n(cx - rx * 0.25)} ${n(cy + ry)}, ${n(cx)} ${n(cy + ry)}`,
    `C ${n(cx + rx * 0.25)} ${n(cy + ry)}, ${n(cx + rx * 0.55)} ${n(cy + ry * 0.95)}, ${n(cx + rx * 0.86)} ${n(cy + ry * 0.33)}`,
    `C ${n(cx + rx + cheek)} ${n(cy - ry * 0.15)}, ${n(cx + rx - temple)} ${n(cy - ry * 0.78)}, ${n(cx)} ${n(cy - ry)}`,
    'Z',
  ].join(' ');
}

function eyePath(cx: number, cy: number, width: number, height: number, tilt: number) {
  const skew = tilt * 0.07;
  return [
    `M ${n(cx - width / 2)} ${n(cy + skew)}`,
    `C ${n(cx - width * 0.25)} ${n(cy - height * 0.45)}, ${n(cx + width * 0.25)} ${n(cy - height * 0.45)}, ${n(cx + width / 2)} ${n(cy - skew)}`,
    `C ${n(cx + width * 0.28)} ${n(cy + height * 0.45)}, ${n(cx - width * 0.28)} ${n(cy + height * 0.45)}, ${n(cx - width / 2)} ${n(cy + skew)}`,
    'Z',
  ].join(' ');
}

function GuideLines({ project, variant }: { project: HeadProject; variant: 'front' | 'side' | 'top' }) {
  if (!project.print.showGuides && !project.core.guideLines) return null;
  const h = project.dimensions.totalHeight;
  const topY = 12;
  const eyeY = topY + project.face.eye.height;
  const noseY = eyeY + project.face.nose.length;
  const mouthY = topY + h * 0.72;
  const chinY = topY + h;
  const x1 = variant === 'side' ? 150 : 25;
  const x2 = variant === 'side' ? 240 : 115;
  const cx = variant === 'side' ? 190 : 70;
  return (
    <g className="guides">
      <line x1={cx} y1={topY} x2={cx} y2={chinY} />
      <line x1={x1} y1={eyeY} x2={x2} y2={eyeY} />
      <line x1={x1} y1={noseY} x2={x2} y2={noseY} />
      <line x1={x1} y1={mouthY} x2={x2} y2={mouthY} />
      <line x1={x1} y1={chinY} x2={x2} y2={chinY} />
      <text x={x2 + 3} y={eyeY + 1}>目線</text>
      <text x={x2 + 3} y={noseY + 1}>鼻線</text>
      <text x={x2 + 3} y={mouthY + 1}>口線</text>
      <text x={x2 + 3} y={chinY + 1}>顎</text>
    </g>
  );
}

function FrontView({ project, compact = false }: { project: HeadProject; compact?: boolean }) {
  const { dimensions: d, face, core, display } = project;
  const cx = 70;
  const topY = 12;
  const eyeY = topY + face.eye.height;
  const leftEye = cx - face.eye.gap / 2 - face.eye.width / 2;
  const rightEye = cx + face.eye.gap / 2 + face.eye.width / 2;
  const coreInset = display.mode === 'finished' ? core.coreInset + core.shellThickness : core.coreInset;
  return (
    <svg viewBox="0 0 140 96" className="view-svg" role="img" aria-label="正面ビュー">
      <rect className="view-bg" width="140" height="96" />
      <GuideLines project={project} variant="front" />
      {display.mode !== 'core' && <path className={`shape finished ${display.translucent ? 'soft' : ''}`} d={frontOutline(project, 0)} />}
      {display.mode !== 'finished' && <path className="shape core" d={frontOutline(project, coreInset)} />}
      <path className="feature" d={eyePath(leftEye, eyeY, face.eye.width, 3.2, face.eye.tilt)} />
      <path className="feature" d={eyePath(rightEye, eyeY, face.eye.width, 3.2, -face.eye.tilt)} />
      <path className="feature" d={`M ${cx - 2} ${topY + face.eye.height + face.nose.length - 4} L ${cx} ${topY + face.eye.height + face.nose.length} L ${cx + 2} ${topY + face.eye.height + face.nose.length - 4}`} />
      <path className="feature" d={`M ${cx - face.mouth.width / 2} ${topY + d.totalHeight * 0.72} Q ${cx} ${topY + d.totalHeight * 0.72 + face.mouth.corner * 0.15} ${cx + face.mouth.width / 2} ${topY + d.totalHeight * 0.72}`} />
      <line className="neck" x1={cx - d.neckWidth / 2 + d.neckOffsetX} y1={topY + d.totalHeight} x2={cx - d.neckWidth / 2 + d.neckOffsetX} y2={94} />
      <line className="neck" x1={cx + d.neckWidth / 2 + d.neckOffsetX} y1={topY + d.totalHeight} x2={cx + d.neckWidth / 2 + d.neckOffsetX} y2={94} />
      {!compact && <text className="view-title" x="8" y="10">正面</text>}
    </svg>
  );
}

function SideView({ project, compact = false }: { project: HeadProject; compact?: boolean }) {
  const { dimensions: d, face, core, display } = project;
  const coreInset = display.mode === 'finished' ? core.coreInset + core.shellThickness : core.coreInset;
  const topY = 12;
  const earY = topY + face.ear.height;
  const earX = 171 + d.headDepth * 0.35 + face.ear.position;
  return (
    <svg viewBox="140 0 120 96" className="view-svg" role="img" aria-label="側面ビュー">
      <rect className="view-bg" x="140" width="120" height="96" />
      <GuideLines project={project} variant="side" />
      {display.mode !== 'core' && <path className={`shape finished ${display.translucent ? 'soft' : ''}`} d={sideOutline(project, 0)} />}
      {display.mode !== 'finished' && <path className="shape core" d={sideOutline(project, coreInset)} />}
      <ellipse className="feature" cx={earX} cy={earY} rx={face.ear.size * 0.28} ry={face.ear.size * 0.52} transform={`rotate(${face.ear.tilt} ${earX} ${earY})`} />
      <line className="neck" x1={185 + d.neckOffsetY} y1={topY + d.totalHeight - 4} x2={185 + d.neckOffsetY} y2={94} />
      {!compact && <text className="view-title" x="148" y="10">側面</text>}
    </svg>
  );
}

function TopView({ project, compact = false }: { project: HeadProject; compact?: boolean }) {
  const { core, display } = project;
  const coreInset = display.mode === 'finished' ? core.coreInset + core.shellThickness : core.coreInset;
  return (
    <svg viewBox="0 0 140 96" className="view-svg" role="img" aria-label="上面ビュー">
      <rect className="view-bg" width="140" height="96" />
      <line className="guideline" x1="70" y1="10" x2="70" y2="86" />
      <line className="guideline" x1="24" y1="43" x2="116" y2="43" />
      {display.mode !== 'core' && <path className={`shape finished ${display.translucent ? 'soft' : ''}`} d={topOutline(project, 0)} />}
      {display.mode !== 'finished' && <path className="shape core" d={topOutline(project, coreInset)} />}
      {!compact && <text className="view-title" x="8" y="10">上面</text>}
    </svg>
  );
}

function AngleView({ project }: { project: HeadProject }) {
  return (
    <svg viewBox="0 0 150 96" className="view-svg" role="img" aria-label="斜め45度ビュー">
      <rect className="view-bg" width="150" height="96" />
      <g transform="translate(9 0) skewY(-5) scale(0.88 1)">
        <path className="shape angle-side" d={sideOutline(project, project.core.coreInset * 0.6)} />
      </g>
      <g transform="translate(22 0) skewY(5)">
        <path className="shape core" d={frontOutline(project, project.core.coreInset)} />
      </g>
      <text className="view-title" x="8" y="10">斜め45度</text>
    </svg>
  );
}

function ViewGrid({ project }: { project: HeadProject }) {
  return (
    <section className={`view-grid ${project.display.mirrored ? 'mirrored' : ''}`} aria-label="連動プレビュー">
      <div className="view-cell"><FrontView project={project} /></div>
      <div className="view-cell"><SideView project={project} /></div>
      <div className="view-cell"><AngleView project={project} /></div>
      <div className="view-cell"><TopView project={project} /></div>
    </section>
  );
}

function FieldControl({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit?: string; onChange: (value: number) => void }) {
  const step = max - min <= 2 ? 0.1 : 1;
  return (
    <label className="field-control">
      <span>{label}</span>
      <span className="number-input">
        <input type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <small>{unit ?? ''}</small>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function Controls({ project, setProject, setScreen }: { project: HeadProject; setProject: React.Dispatch<React.SetStateAction<HeadProject>>; setScreen: (screen: AppScreen) => void }) {
  const [tab, setTab] = useState<ControlTab>('base');

  function updateGroup<TGroup extends 'dimensions' | 'skull' | 'core'>(group: TGroup, key: keyof HeadProject[TGroup], value: number) {
    setProject((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [key]: value,
      },
    }));
  }

  function updateFace(part: keyof FaceLandmarks, key: string, value: number) {
    setProject((current) => ({
      ...current,
      face: {
        ...current.face,
        [part]: {
          ...current.face[part],
          [key]: value,
        },
      },
    }));
  }

  function updatePrint(key: keyof PrintSettings, value: number | boolean) {
    setProject((current) => ({
      ...current,
      print: {
        ...current.print,
        [key]: value,
      },
    }));
  }

  function applyPreset(id: BasePresetId) {
    setProject((current) => ({
      ...current,
      base: id,
      dimensions: { ...basePresets[id].dimensions },
      skull: { ...basePresets[id].skull },
    }));
  }

  return (
    <aside className="control-panel">
      <div className="panel-tabs" role="tablist" aria-label="設定カテゴリ">
        {[
          ['base', '基本'],
          ['skull', '頭蓋'],
          ['face', '顔'],
          ['core', '芯'],
          ['print', '印刷'],
        ].map(([id, label]) => (
          <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id as ControlTab)}>{label}</button>
        ))}
      </div>

      <div className="panel-body">
        {tab === 'base' && (
          <>
            <div className="preset-grid">
              {(Object.keys(basePresets) as BasePresetId[]).map((id) => (
                <button key={id} type="button" className={project.base === id ? 'active' : ''} onClick={() => applyPreset(id)}>{basePresets[id].label}</button>
              ))}
            </div>
            {dimensionFields.map((field) => (
              <FieldControl
                key={String(field.key)}
                label={field.label}
                value={project.dimensions[field.key] as number}
                min={field.min}
                max={field.max}
                unit={field.unit}
                onChange={(value) => updateGroup(field.group, field.key, clamp(value, field.min, field.max))}
              />
            ))}
          </>
        )}

        {tab === 'skull' && skullFields.map((field) => (
          <FieldControl
            key={String(field.key)}
            label={field.label}
            value={project.skull[field.key] as number}
            min={field.min}
            max={field.max}
            unit={field.unit}
            onChange={(value) => updateGroup(field.group, field.key, clamp(value, field.min, field.max))}
          />
        ))}

        {tab === 'face' && faceFields.map((field) => (
          <FieldControl
            key={`${field.part}.${String(field.key)}`}
            label={field.label}
            value={project.face[field.part][field.key as keyof FaceLandmarks[typeof field.part]] as number}
            min={field.min}
            max={field.max}
            unit={field.unit}
            onChange={(value) => updateFace(field.part, field.key, clamp(value, field.min, field.max))}
          />
        ))}

        {tab === 'core' && (
          <>
            <div className="toggle-row">
              {(['wire', 'core', 'finished'] as ViewMode[]).map((mode) => (
                <button key={mode} type="button" className={project.display.mode === mode ? 'active' : ''} onClick={() => setProject((current) => ({ ...current, display: { ...current.display, mode } }))}>
                  {mode === 'wire' ? 'ワイヤー' : mode === 'core' ? '芯表示' : '完成予想'}
                </button>
              ))}
            </div>
            <label className="check-row"><input type="checkbox" checked={project.display.mirrored} onChange={(event) => setProject((current) => ({ ...current, display: { ...current.display, mirrored: event.target.checked } }))} />左右反転</label>
            <label className="check-row"><input type="checkbox" checked={project.display.translucent} onChange={(event) => setProject((current) => ({ ...current, display: { ...current.display, translucent: event.target.checked } }))} />半透明表示</label>
            <label className="check-row"><input type="checkbox" checked={project.core.guideLines} onChange={(event) => setProject((current) => ({ ...current, core: { ...current.core, guideLines: event.target.checked } }))} />芯ガイド線</label>
            {coreFields.map((field) => (
              <FieldControl
                key={String(field.key)}
                label={field.label}
                value={project.core[field.key] as number}
                min={field.min}
                max={field.max}
                unit={field.unit}
                onChange={(value) => updateGroup(field.group, field.key, clamp(value, field.min, field.max))}
              />
            ))}
          </>
        )}

        {tab === 'print' && (
          <>
            <label className="check-row"><input type="checkbox" checked={project.print.showGuides} onChange={(event) => updatePrint('showGuides', event.target.checked)} />ガイド線あり</label>
            <label className="check-row"><input type="checkbox" checked={project.print.a4Split} onChange={(event) => updatePrint('a4Split', event.target.checked)} />A4分割印刷</label>
            <FieldControl label="印刷倍率" value={project.print.scale} min={80} max={120} unit="%" onChange={(value) => updatePrint('scale', value)} />
            <button className="primary-action" type="button" onClick={() => setScreen('output')}>テンプレートを確認</button>
            <button className="secondary-action" type="button" onClick={() => window.print()}>原寸印刷</button>
          </>
        )}
      </div>
    </aside>
  );
}

function TemplatePair({ project }: { project: HeadProject }) {
  const inset = project.core.coreInset;
  return (
    <svg className="template-sheet" width="297mm" height="210mm" viewBox="0 0 297 210" role="img" aria-label="正面と側面の芯テンプレート">
      <rect className="sheet-bg" width="297" height="210" />
      <g transform="translate(8 12)">
        <text className="sheet-heading" x="0" y="-4">正面テンプレート</text>
        <path className="cut-line" d={frontOutline(project, inset)} />
        <GuideLines project={project} variant="front" />
      </g>
      <g transform="translate(-130 12)">
        <text className="sheet-heading" x="278" y="-4">側面テンプレート</text>
        <path className="cut-line" d={sideOutline(project, inset)} />
        <GuideLines project={project} variant="side" />
      </g>
      <ScaleBox />
      <text className="sheet-note" x="10" y="204">A4横 / 100% / 自動縮小なし / 単位:mm</text>
    </svg>
  );
}

function CrossCoreSheet({ project }: { project: HeadProject }) {
  const slit = project.core.materialThickness + project.core.slitClearance;
  const depth = project.dimensions.totalHeight * project.core.slitDepthRatio;
  const frontX = 78 - slit / 2;
  const sideX = 205 - slit / 2;
  return (
    <svg className="template-sheet" width="297mm" height="210mm" viewBox="0 0 297 210" role="img" aria-label="十字芯テンプレート">
      <rect className="sheet-bg" width="297" height="210" />
      <g transform="translate(8 12)">
        <text className="sheet-heading" x="0" y="-4">正面芯</text>
        <path className="cut-line" d={frontOutline(project, project.core.coreInset)} />
        <rect className="slit" x={frontX} y="12" width={slit} height={depth} />
        <text className="slit-label" x={frontX + slit + 2} y={14 + depth}>上から差し込み</text>
        <GuideLines project={project} variant="front" />
      </g>
      <g transform="translate(-130 12)">
        <text className="sheet-heading" x="278" y="-4">側面芯</text>
        <path className="cut-line" d={sideOutline(project, project.core.coreInset)} />
        <rect className="slit" x={sideX} y={12 + project.dimensions.totalHeight - depth} width={slit} height={depth} />
        <text className="slit-label" x={sideX + slit + 2} y={12 + project.dimensions.totalHeight - depth + 5}>下から差し込み</text>
        <GuideLines project={project} variant="side" />
      </g>
      <ScaleBox />
      <text className="sheet-note" x="10" y="204">スリット幅: {n(slit)}mm / 印刷後に厚紙へ貼り付け</text>
    </svg>
  );
}

function FinishedSheet({ project }: { project: HeadProject }) {
  return (
    <svg className="template-sheet" width="297mm" height="210mm" viewBox="0 0 297 210" role="img" aria-label="完成予想確認">
      <rect className="sheet-bg" width="297" height="210" />
      <g transform="translate(8 12)">
        <text className="sheet-heading" x="0" y="-4">完成予想</text>
        <path className="shape finished" d={frontOutline(project, 0)} />
        <path className="shape core" d={frontOutline(project, project.core.coreInset)} />
      </g>
      <g transform="translate(-130 12)">
        <path className="shape finished" d={sideOutline(project, 0)} />
        <path className="shape core" d={sideOutline(project, project.core.coreInset)} />
      </g>
      <ScaleBox />
    </svg>
  );
}

function ScaleBox() {
  return (
    <g className="scale-box">
      <rect x="238" y="148" width="50" height="50" />
      <line x1="238" y1="173" x2="288" y2="173" />
      <line x1="263" y1="148" x2="263" y2="198" />
      <text x="263" y="144">50mm検尺枠</text>
    </g>
  );
}

function OutputView({ project, setScreen }: { project: HeadProject; setScreen: (screen: AppScreen) => void }) {
  const [mode, setMode] = useState<OutputMode>('templates');
  return (
    <main className="output-screen">
      <header className="top-bar">
        <button type="button" onClick={() => setScreen('work')}>編集へ戻る</button>
        <div className="output-tabs">
          <button type="button" className={mode === 'finished' ? 'active' : ''} onClick={() => setMode('finished')}>完成確認</button>
          <button type="button" className={mode === 'templates' ? 'active' : ''} onClick={() => setMode('templates')}>芯テンプレート</button>
          <button type="button" className={mode === 'crossCore' ? 'active' : ''} onClick={() => setMode('crossCore')}>十字芯</button>
        </div>
        <button type="button" onClick={() => window.print()}>印刷</button>
      </header>
      <section className="sheet-preview">
        {mode === 'finished' && <FinishedSheet project={project} />}
        {mode === 'templates' && <TemplatePair project={project} />}
        {mode === 'crossCore' && <CrossCoreSheet project={project} />}
      </section>
    </main>
  );
}

function Home({ setScreen, newProject }: { setScreen: (screen: AppScreen) => void; newProject: () => void }) {
  return (
    <main className="home-screen">
      <section className="home-panel">
        <p>BJD Head Draft</p>
        <h1>ドールヘッド芯設計</h1>
        <div className="home-actions">
          <button type="button" onClick={() => { newProject(); setScreen('work'); }}>新規ヘッド作成</button>
          <button type="button" onClick={() => setScreen('work')}>保存データ</button>
          <button type="button" onClick={() => setScreen('work')}>テンプレート</button>
          <button type="button" onClick={() => setScreen('output')}>印刷</button>
        </div>
      </section>
    </main>
  );
}

function WorkScreen({ project, setProject, setScreen }: { project: HeadProject; setProject: React.Dispatch<React.SetStateAction<HeadProject>>; setScreen: (screen: AppScreen) => void }) {
  return (
    <main className="work-screen">
      <section className="preview-pane">
        <header className="top-bar">
          <button type="button" onClick={() => setScreen('home')}>ホーム</button>
          <div>
            <p>BJD Head Draft</p>
            <h1>芯設計</h1>
          </div>
          <button type="button" onClick={() => setScreen('output')}>出力</button>
        </header>
        <ViewGrid project={project} />
      </section>
      <Controls project={project} setProject={setProject} setScreen={setScreen} />
    </main>
  );
}

function App() {
  const [screen, setScreen] = useState<AppScreen>('work');
  const [project, setProject] = useState<HeadProject>(loadProject);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }, [project]);

  function newProject() {
    setProject(defaultProject);
    window.localStorage.removeItem(STORAGE_KEY);
  }

  if (screen === 'home') return <Home setScreen={setScreen} newProject={newProject} />;
  if (screen === 'output') return <OutputView project={project} setScreen={setScreen} />;
  return <WorkScreen project={project} setProject={setProject} setScreen={setScreen} />;
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
