"use client";

import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { PoseLandmarkMap, PoseKeypointName } from '@/lib/pose-coach';

type UsePoseDetectionOptions = {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled?: boolean;
  smoothing?: number;
};

type PoseDetectionState = {
  landmarks: PoseLandmarkMap | null;
  fps: number;
  ready: boolean;
  error: string | null;
};

const MEDIAPIPE_INDEX_TO_NAME: Partial<Record<number, PoseKeypointName>> = {
  0: 'nose',
  2: 'leftEye',
  5: 'rightEye',
  7: 'leftEar',
  8: 'rightEar',
  11: 'leftShoulder',
  12: 'rightShoulder',
  13: 'leftElbow',
  14: 'rightElbow',
  15: 'leftWrist',
  16: 'rightWrist',
  23: 'leftHip',
  24: 'rightHip',
  25: 'leftKnee',
  26: 'rightKnee',
  27: 'leftAnkle',
  28: 'rightAnkle',
};

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';
const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';

export function usePoseDetection(options: UsePoseDetectionOptions): PoseDetectionState {
  const { videoRef, enabled = true, smoothing = 0.35 } = options;
  const [state, setState] = useState<PoseDetectionState>({
    landmarks: null,
    fps: 0,
    ready: false,
    error: null,
  });
  const smoothRef = useRef<PoseLandmarkMap | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef(0);
  const fpsWindowRef = useRef<number[]>([]);

  useEffect(() => {
    if (!enabled) {
      setState((prev) => ({ ...prev, landmarks: null, ready: false }));
      return;
    }

    let running = true;
    let poseLandmarker: any = null;

    const run = async () => {
      try {
        const { FilesetResolver, PoseLandmarker } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
        poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
          },
          runningMode: 'VIDEO',
          numPoses: 1,
        });
        if (!running) return;
        setState((prev) => ({ ...prev, ready: true, error: null }));
      } catch (error) {
        if (!running) return;
        setState((prev) => ({
          ...prev,
          error: 'Unable to load MediaPipe Pose',
          ready: false,
        }));
        return;
      }

      const detect = () => {
        if (!running) return;
        const video = videoRef.current;
        if (!video || video.readyState < 2 || !poseLandmarker) {
          rafRef.current = requestAnimationFrame(detect);
          return;
        }

        const now = performance.now();
        const elapsed = now - lastFrameTimeRef.current;
        if (elapsed < 16) {
          rafRef.current = requestAnimationFrame(detect);
          return;
        }
        lastFrameTimeRef.current = now;

        try {
          const result = poseLandmarker.detectForVideo(video, now);
          const rawLandmarks = result?.landmarks?.[0];
          if (rawLandmarks) {
            const mapped: PoseLandmarkMap = {};
            for (let i = 0; i < rawLandmarks.length; i += 1) {
              const name = MEDIAPIPE_INDEX_TO_NAME[i];
              if (!name) continue;
              const point = rawLandmarks[i];
              mapped[name] = {
                x: point.x,
                y: point.y,
                z: point.z ?? 0,
                visibility: point.visibility ?? 1,
              };
            }

            const previous = smoothRef.current;
            if (!previous) {
              smoothRef.current = mapped;
            } else {
              const next: PoseLandmarkMap = {};
              for (const [key, value] of Object.entries(mapped) as [PoseKeypointName, NonNullable<PoseLandmarkMap[PoseKeypointName]>][]) {
                const prev = previous[key] ?? value;
                next[key] = {
                  x: prev.x + (value.x - prev.x) * smoothing,
                  y: prev.y + (value.y - prev.y) * smoothing,
                  z: prev.z + (value.z - prev.z) * smoothing,
                  visibility: prev.visibility ?? value.visibility,
                };
              }
              smoothRef.current = next;
            }

            if (elapsed > 0) {
              const frameFps = 1000 / elapsed;
              fpsWindowRef.current.push(frameFps);
              if (fpsWindowRef.current.length > 20) fpsWindowRef.current.shift();
              const avgFps =
                fpsWindowRef.current.reduce((sum, value) => sum + value, 0) / fpsWindowRef.current.length;
              setState((prev) => ({
                ...prev,
                landmarks: smoothRef.current,
                fps: Number.isFinite(avgFps) ? avgFps : 0,
              }));
            }
          }
        } catch {
          setState((prev) => ({ ...prev, error: 'Pose detection frame failed' }));
        }

        rafRef.current = requestAnimationFrame(detect);
      };

      rafRef.current = requestAnimationFrame(detect);
    };

    run();

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (poseLandmarker?.close) poseLandmarker.close();
    };
  }, [enabled, smoothing, videoRef]);

  return state;
}
