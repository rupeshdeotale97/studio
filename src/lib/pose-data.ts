export type Point = { x: number; y: number };

export type Skeleton = {
  nose: Point;
  leftEye: Point;
  rightEye: Point;
  leftEar: Point;
  rightEar: Point;
  leftShoulder: Point;
  rightShoulder: Point;
  leftElbow: Point;
  rightElbow: Point;
  leftWrist: Point;
  rightWrist: Point;
  leftHip: Point;
  rightHip: Point;
  leftKnee: Point;
  rightKnee: Point;
  leftAnkle: Point;
  rightAnkle: Point;
};

export const initialPose: Skeleton = {
  nose: { x: 50, y: 25 },
  leftEye: { x: 52, y: 24 },
  rightEye: { x: 48, y: 24 },
  leftEar: { x: 55, y: 26 },
  rightEar: { x: 45, y: 26 },
  leftShoulder: { x: 65, y: 35 },
  rightShoulder: { x: 35, y: 35 },
  leftElbow: { x: 70, y: 45 },
  rightElbow: { x: 30, y: 45 },
  leftWrist: { x: 75, y: 55 },
  rightWrist: { x: 25, y: 55 },
  leftHip: { x: 60, y: 60 },
  rightHip: { x: 40, y: 60 },
  leftKnee: { x: 62, y: 75 },
  rightKnee: { x: 38, y: 75 },
  leftAnkle: { x: 64, y: 90 },
  rightAnkle: { x: 36, y: 90 },
};

export const perfectPose: Skeleton = {
  nose: { x: 50, y: 20 },
  leftEye: { x: 52, y: 19 },
  rightEye: { x: 48, y: 19 },
  leftEar: { x: 56, y: 21 },
  rightEar: { x: 44, y: 21 },
  leftShoulder: { x: 70, y: 30 },
  rightShoulder: { x: 30, y: 30 },
  leftElbow: { x: 80, y: 45 },
  rightElbow: { x: 20, y: 45 },
  leftWrist: { x: 75, y: 60 },
  rightWrist: { x: 25, y: 60 },
  leftHip: { x: 60, y: 55 },
  rightHip: { x: 40, y: 55 },
  leftKnee: { x: 65, y: 70 },
  rightKnee: { x: 35, y: 70 },
  leftAnkle: { x: 70, y: 85 },
  rightAnkle: { x: 30, y: 85 },
};

export const skeletonConnections: (keyof Skeleton)[][] = [
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
];

export function interpolateSkeletons(start: Skeleton, end: Skeleton, alpha: number): Skeleton {
  const interpolated = {} as Skeleton;
  for (const key in start) {
    const k = key as keyof Skeleton;
    const startPoint = start[k];
    const endPoint = end[k];
    interpolated[k] = {
      x: startPoint.x + (endPoint.x - startPoint.x) * alpha,
      y: startPoint.y + (endPoint.y - startPoint.y) * alpha,
    };
  }
  return interpolated;
}
