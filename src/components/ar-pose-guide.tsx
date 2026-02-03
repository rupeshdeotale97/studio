"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

// Lightweight AR pose guide that uses TFJS MoveNet / BlazePose via dynamic import.
// - Loads model on client only (try/catch to gracefully degrade if not available)
// - Draws an SVG overlay of smoothed keypoints + connections
// - Provides simple guidance pulses and interpolation

type Point = { x: number; y: number; z?: number };

interface ARPoseGuideProps {
  targetSkeleton?: Record<string, Point> | null;
  matchScore?: number; // 0..1 for adaptive brightness
  className?: string;
}

export default function ARPoseGuide({ targetSkeleton = null, matchScore = 0.3, className = "" }: ARPoseGuideProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const overlayRef = useRef<SVGSVGElement | null>(null);
  const smoothRef = useRef<Record<string, Point>>({});

  useEffect(() => {
    let detector: any = null;
    let running = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        console.error("Camera start failed", e);
      }
    };

    const setup = async () => {
      await startCamera();
      
      // Try to load TFJS and pose detection, but gracefully fall back if unavailable
      try {
        // @ts-ignore - modules may not be installed
        const tfjsCore = await import("@tensorflow/tfjs-core").catch(() => null);
        // @ts-ignore - modules may not be installed
        const poseDetectionModule = await import("@tensorflow-models/pose-detection").catch(() => null);

        if (!tfjsCore || !poseDetectionModule) {
          console.warn("TFJS modules not available, AR disabled");
          setReady(false);
          return;
        }

        const { createDetector, SupportedModels, poseDetection } = poseDetectionModule as any;
        const tf = tfjsCore.default || (window as any).tf;

        if (tf && tf.ready) await tf.ready();

        // Attempt to load the WebGL backend if available and set it. This
        // improves performance and avoids silent backend fallbacks in some
        // browsers where the default backend may not be optimal.
        try {
          // @ts-ignore - optional import
          const tfBackendWebgl = await import('@tensorflow/tfjs-backend-webgl').catch(() => null);
          if (tfBackendWebgl && tf && typeof tf.setBackend === 'function') {
            await tf.setBackend('webgl');
            if (tf.ready) await tf.ready();
          }
        } catch (e) {
          // non-fatal — continue without explicit backend
        }

        // Try MoveNet first
        try {
          detector = await createDetector(SupportedModels.MoveNet, { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING });
        } catch (e) {
          // fallback: BlazePose
          try {
            detector = await createDetector(SupportedModels.BlazePose, { runtime: 'tfjs' });
          } catch (err) {
            console.error('Failed to create detector', err);
            setReady(false);
            return;
          }
        }

        setReady(true);

        const loop = async () => {
          if (!running) return;
          try {
            if (videoRef.current && detector) {
              const poses = await detector.estimatePoses(videoRef.current, { flipHorizontal: true });
              const pose = poses && poses[0];
              if (pose && pose.keypoints) {
                const w = videoRef.current!.videoWidth || videoRef.current!.clientWidth;
                const h = videoRef.current!.videoHeight || videoRef.current!.clientHeight;
                const keypoints: Record<string, Point> = {};
                for (const k of pose.keypoints) {
                  const part = (k.part || k.name || k) as string;
                  const x = ((k.x ?? 0) / (w || 1)) * 100;
                  const y = ((k.y ?? 0) / (h || 1)) * 100;
                  const z = (k.z ?? 0) as number | undefined;
                  keypoints[part] = { x, y, z };
                }

                // smoothing
                for (const p in keypoints) {
                  const prev = smoothRef.current[p] ?? keypoints[p];
                  const cur = keypoints[p];
                  const smoothed = {
                    x: prev.x + (cur.x - prev.x) * 0.25,
                    y: prev.y + (cur.y - prev.y) * 0.25,
                    z: (prev.z ?? 0) + ((cur.z ?? 0) - (prev.z ?? 0)) * 0.25,
                  };
                  smoothRef.current[p] = smoothed;
                }

                // trigger re-render
                setTick(t => t + 1);
              }
            }
          } catch (err) {
            // ignore per-frame errors
          }
          rafRef.current = requestAnimationFrame(loop);
        };

        rafRef.current = requestAnimationFrame(loop);
      } catch (err) {
        console.error("AR setup failed:", err);
        setReady(false);
      }
    };

    setup();

    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try {
        (videoRef.current?.srcObject as MediaStream | null)?.getTracks().forEach((t) => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
      } catch (e) {}
    };
  }, []);

  const [tick, setTick] = useState(0);

  const mapKeypoint = (key: string) => {
    const mapping: Record<string, string> = {
      nose: "nose",
      left_eye: "leftEye",
      right_eye: "rightEye",
      left_ear: "leftEar",
      right_ear: "rightEar",
      left_shoulder: "leftShoulder",
      right_shoulder: "rightShoulder",
      left_elbow: "leftElbow",
      right_elbow: "rightElbow",
      left_wrist: "leftWrist",
      right_wrist: "rightWrist",
      left_hip: "leftHip",
      right_hip: "rightHip",
      left_knee: "leftKnee",
      right_knee: "rightKnee",
      left_ankle: "leftAnkle",
      right_ankle: "rightAnkle",
    };
    return mapping[key] ?? key;
  };

  const points = Object.entries(smoothRef.current || {}).map(([k, p]) => ({ name: mapKeypoint(k.toLowerCase()), x: p.x, y: p.y, z: p.z }));

  const connections = [
    ["leftShoulder", "rightShoulder"],
    ["leftShoulder", "leftElbow"],
    ["leftElbow", "leftWrist"],
    ["rightShoulder", "rightElbow"],
    ["rightElbow", "rightWrist"],
    ["leftShoulder", "leftHip"],
    ["rightShoulder", "rightHip"],
    ["leftHip", "rightHip"],
    ["leftHip", "leftKnee"],
    ["leftKnee", "leftAnkle"],
    ["rightHip", "rightKnee"],
    ["rightKnee", "rightAnkle"],
  ];

  const find = (name: string) => points.find(p => p.name === name) as (typeof points)[0] | undefined;

  const baseOpacity = 0.5 + matchScore * 0.45;
  const glowOpacity = 0.3 + matchScore * 0.7;

  if (!ready) {
    return (
      <div className={`absolute inset-0 pointer-events-none ${className}`}>
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
      <svg ref={overlayRef} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={1.2 + matchScore * 1.8} result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <style>{`
            @keyframes pulse-hand {
              0%, 100% { r: 2.2px; }
              50% { r: ${3.6 + matchScore * 2.4}px; }
            }
            @keyframes pulse-glow {
              0%, 100% { r: 4.4px; opacity: 0.3; }
              50% { r: ${6.8 + matchScore * 3.2}px; opacity: ${0.7 + matchScore * 0.3}; }
            }
            .hand-target {
              animation: pulse-hand ${1.2 - matchScore * 0.5}s ease-in-out infinite;
              fill: white;
            }
            .hand-glow {
              animation: pulse-glow ${1.2 - matchScore * 0.5}s ease-in-out infinite;
              fill: none;
              stroke: white;
              stroke-width: 0.4;
            }
          `}</style>
        </defs>

        {/* connections */}
        {connections.map(([a, b], i) => {
          const p1 = find(a);
          const p2 = find(b);
          if (!p1 || !p2) return null;
          const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          return (
            <line
              key={`c-${a}-${b}-${i}`}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={`rgba(255,255,255,${baseOpacity})`}
              strokeWidth={0.85 + matchScore * 0.25}
              strokeLinecap="round"
              style={{ filter: 'url(#glow)' }}
            />
          );
        })}

        {/* joints */}
        {points.map((p, i) => {
          const isHand = p.name === 'leftWrist' || p.name === 'rightWrist';
          return (
            <g key={`pt-${p.name}-${i}`}>
              {isHand ? (
                <>
                  <circle cx={p.x} cy={p.y} className="hand-target" />
                  <circle cx={p.x} cy={p.y} className="hand-glow" />
                </>
              ) : (
                <>
                  <circle cx={p.x} cy={p.y} r={1.4} fill="white" opacity={baseOpacity} />
                  <circle cx={p.x} cy={p.y} r={3.2} fill="none" stroke="white" strokeWidth={0.3} opacity={glowOpacity * 0.5} />
                </>
              )}
            </g>
          );
        })}

        {/* optional target skeleton heartbeat when provided */}
        {targetSkeleton && (
          <g opacity={0.5 + matchScore * 0.3}>
            {Object.entries(targetSkeleton).map(([k, v], i) => (
              <circle key={`t-${k}-${i}`} cx={v.x} cy={v.y} r={1.8} fill="white" opacity={0.4} />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
