import type { Skeleton } from '@/lib/pose-data';

export type PoseKeypointName =
  | 'nose'
  | 'leftEye'
  | 'rightEye'
  | 'leftEar'
  | 'rightEar'
  | 'leftShoulder'
  | 'rightShoulder'
  | 'leftElbow'
  | 'rightElbow'
  | 'leftWrist'
  | 'rightWrist'
  | 'leftHip'
  | 'rightHip'
  | 'leftKnee'
  | 'rightKnee'
  | 'leftAnkle'
  | 'rightAnkle';

export type PosePoint3D = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

export type PoseLandmarkMap = Partial<Record<PoseKeypointName, PosePoint3D>>;

export type FoxEmotion = 'confused' | 'focused' | 'happy' | 'celebrate';

export type FoxRigSignals = {
  headTilt: number;
  leftArmLift: number;
  rightArmLift: number;
  bodyLean: number;
  balanceShift: number;
};

export const FOX_STATE_THRESHOLDS = {
  confusedMax: 0.4,
  focusedMax: 0.7,
  happyMax: 0.9,
};

const REQUIRED_SCORE_KEYS: PoseKeypointName[] = [
  'nose',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
];

const clamp = (value: number, min = -1, max = 1) => Math.max(min, Math.min(max, value));

const toPoint3D = (x: number, y: number, z = 0): PosePoint3D => ({ x, y, z });

const visibilityWeight = (landmarks: PoseLandmarkMap, key: PoseKeypointName) => {
  const visibility = landmarks[key]?.visibility;
  if (typeof visibility !== 'number') return 1;
  return clamp((visibility - 0.2) / 0.8, 0, 1);
};

const getPoseCenter = (landmarks: PoseLandmarkMap) => {
  const leftHip = landmarks.leftHip;
  const rightHip = landmarks.rightHip;
  const leftShoulder = landmarks.leftShoulder;
  const rightShoulder = landmarks.rightShoulder;

  const centerX =
    ((leftHip?.x ?? 0) + (rightHip?.x ?? 0) + (leftShoulder?.x ?? 0) + (rightShoulder?.x ?? 0)) / 4;
  const centerY =
    ((leftHip?.y ?? 0) + (rightHip?.y ?? 0) + (leftShoulder?.y ?? 0) + (rightShoulder?.y ?? 0)) / 4;
  return toPoint3D(centerX, centerY, 0);
};

const getPoseScale = (landmarks: PoseLandmarkMap) => {
  const leftShoulder = landmarks.leftShoulder;
  const rightShoulder = landmarks.rightShoulder;
  const leftHip = landmarks.leftHip;
  const rightHip = landmarks.rightHip;

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 1;

  const shoulderWidth = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y);
  const hipWidth = Math.hypot(leftHip.x - rightHip.x, leftHip.y - rightHip.y);
  const torsoHeight = Math.hypot(
    (leftShoulder.x + rightShoulder.x) / 2 - (leftHip.x + rightHip.x) / 2,
    (leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2
  );

  return Math.max(0.0001, shoulderWidth * 0.5 + hipWidth * 0.2 + torsoHeight * 0.6);
};

export function normalizeLandmarks(landmarks: PoseLandmarkMap): PoseLandmarkMap {
  const center = getPoseCenter(landmarks);
  const scale = getPoseScale(landmarks);
  const normalized: PoseLandmarkMap = {};

  for (const [key, point] of Object.entries(landmarks) as [PoseKeypointName, PosePoint3D][]) {
    normalized[key] = {
      x: (point.x - center.x) / scale,
      y: (point.y - center.y) / scale,
      z: point.z / scale,
      visibility: point.visibility,
    };
  }

  return normalized;
}

export function skeletonToLandmarks(skeleton: Skeleton): PoseLandmarkMap {
  const converted: PoseLandmarkMap = {};
  for (const [key, point] of Object.entries(skeleton) as [PoseKeypointName, { x: number; y: number }][]) {
    converted[key] = toPoint3D(point.x / 100, point.y / 100, 0);
  }
  return converted;
}

export function calculatePoseMatchScore(current: PoseLandmarkMap, target: Skeleton | null): number {
  if (!target) return 0;
  const currentNormalized = normalizeLandmarks(current);
  const targetNormalized = normalizeLandmarks(skeletonToLandmarks(target));

  let weightedDistance = 0;
  let totalWeight = 0;

  for (const key of REQUIRED_SCORE_KEYS) {
    const a = currentNormalized[key];
    const b = targetNormalized[key];
    if (!a || !b) continue;

    const weight = visibilityWeight(current, key);
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    weightedDistance += distance * weight;
    totalWeight += weight;
  }

  if (!totalWeight) return 0;
  const meanDistance = weightedDistance / totalWeight;
  return clamp(1 - meanDistance / 1.25, 0, 1);
}

export function getFoxRigSignals(landmarks: PoseLandmarkMap): FoxRigSignals {
  const n = normalizeLandmarks(landmarks);
  const nose = n.nose;
  const leftShoulder = n.leftShoulder;
  const rightShoulder = n.rightShoulder;
  const leftElbow = n.leftElbow;
  const rightElbow = n.rightElbow;
  const leftWrist = n.leftWrist;
  const rightWrist = n.rightWrist;
  const leftHip = n.leftHip;
  const rightHip = n.rightHip;

  const shoulderSlope = leftShoulder && rightShoulder ? (leftShoulder.y - rightShoulder.y) * -2.5 : 0;
  const leftArmAngle = leftShoulder && leftElbow && leftWrist ? (leftShoulder.y - leftElbow.y + leftElbow.y - leftWrist.y) * 1.8 : 0;
  const rightArmAngle = rightShoulder && rightElbow && rightWrist ? (rightShoulder.y - rightElbow.y + rightElbow.y - rightWrist.y) * 1.8 : 0;
  const shoulderWidth = leftShoulder && rightShoulder ? leftShoulder.x - rightShoulder.x : 0;
  const bodyLean = shoulderWidth * -0.8;
  const hipCenterX = leftHip && rightHip ? (leftHip.x + rightHip.x) / 2 : 0;
  const balanceShift = clamp(hipCenterX * 2.4);

  return {
    headTilt: clamp((nose?.x ?? 0) * -2 + shoulderSlope * 0.55),
    leftArmLift: clamp(leftArmAngle),
    rightArmLift: clamp(rightArmAngle),
    bodyLean: clamp(bodyLean),
    balanceShift,
  };
}

export function getFoxEmotion(score: number): FoxEmotion {
  if (score <= FOX_STATE_THRESHOLDS.confusedMax) return 'confused';
  if (score <= FOX_STATE_THRESHOLDS.focusedMax) return 'focused';
  if (score <= FOX_STATE_THRESHOLDS.happyMax) return 'happy';
  return 'celebrate';
}

export function getPoseFeedback(score: number, landmarks: PoseLandmarkMap): string {
  const visibleCount = REQUIRED_SCORE_KEYS.reduce((count, key) => {
    const vis = landmarks[key]?.visibility;
    if (typeof vis !== 'number') return count + 1;
    return vis > 0.45 ? count + 1 : count;
  }, 0);

  if (visibleCount < 6) return 'Step back so your full upper body is visible.';
  if (score < 0.4) return 'Fox is playful. Match shoulder and elbow angles first.';
  if (score < 0.7) return 'Fox is focusing. Small arm and torso adjustments needed.';
  if (score < 0.9) return 'Nice pose. Hold steady and refine your balance.';
  return 'Perfect match. Fox is celebrating!';
}
