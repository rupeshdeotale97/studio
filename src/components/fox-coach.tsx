"use client";

import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRive, useStateMachineInput, Layout, Fit, Alignment } from '@rive-app/react-canvas';
import type { FoxEmotion, FoxRigSignals, PoseLandmarkMap } from '@/lib/pose-coach';
import { getFoxEmotion, getFoxRigSignals } from '@/lib/pose-coach';

type FoxCoachProps = {
  landmarks: PoseLandmarkMap | null;
  poseScore: number;
  trackingReady: boolean;
  className?: string;
};

const FOX_STATE_MACHINE = 'FoxPoseMachine';
const FOX_RIVE_SRC = '/rive/fox-pose-coach.riv';

function useFoxSignals(landmarks: PoseLandmarkMap | null, poseScore: number) {
  return useMemo(() => {
    const rig: FoxRigSignals = landmarks
      ? getFoxRigSignals(landmarks)
      : { headTilt: 0, leftArmLift: 0, rightArmLift: 0, bodyLean: 0, balanceShift: 0 };
    const emotion = getFoxEmotion(poseScore);
    return { rig, emotion };
  }, [landmarks, poseScore]);
}

function emotionLabel(emotion: FoxEmotion) {
  if (emotion === 'confused') return 'Confused';
  if (emotion === 'focused') return 'Focused';
  if (emotion === 'happy') return 'Happy';
  return 'Celebrating';
}

export default function FoxCoach({ landmarks, poseScore, trackingReady, className = '' }: FoxCoachProps) {
  const { rive, RiveComponent } = useRive({
    src: FOX_RIVE_SRC,
    stateMachines: FOX_STATE_MACHINE,
    autoplay: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  });

  const { rig, emotion } = useFoxSignals(landmarks, poseScore);

  const inputHeadTilt = useStateMachineInput(rive, FOX_STATE_MACHINE, 'HeadTilt');
  const inputLeftArmLift = useStateMachineInput(rive, FOX_STATE_MACHINE, 'LeftArmLift');
  const inputRightArmLift = useStateMachineInput(rive, FOX_STATE_MACHINE, 'RightArmLift');
  const inputBodyLean = useStateMachineInput(rive, FOX_STATE_MACHINE, 'BodyLean');
  const inputBalanceShift = useStateMachineInput(rive, FOX_STATE_MACHINE, 'BalanceShift');
  const inputPoseScore = useStateMachineInput(rive, FOX_STATE_MACHINE, 'PoseScore');
  const inputEmotionLevel = useStateMachineInput(rive, FOX_STATE_MACHINE, 'EmotionLevel');

  useEffect(() => {
    if (inputHeadTilt) inputHeadTilt.value = rig.headTilt;
    if (inputLeftArmLift) inputLeftArmLift.value = rig.leftArmLift;
    if (inputRightArmLift) inputRightArmLift.value = rig.rightArmLift;
    if (inputBodyLean) inputBodyLean.value = rig.bodyLean;
    if (inputBalanceShift) inputBalanceShift.value = rig.balanceShift;
    if (inputPoseScore) inputPoseScore.value = poseScore;

    // Character extensibility note:
    // Keep these normalized channels for any future character rig (0..1 or -1..1).
    // New characters can reuse the same signal contract by remapping channel names in Rive.
    if (inputEmotionLevel) {
      const level = emotion === 'confused' ? 0 : emotion === 'focused' ? 1 : emotion === 'happy' ? 2 : 3;
      inputEmotionLevel.value = level;
    }
  }, [
    emotion,
    inputBalanceShift,
    inputBodyLean,
    inputEmotionLevel,
    inputHeadTilt,
    inputLeftArmLift,
    inputPoseScore,
    inputRightArmLift,
    poseScore,
    rig.balanceShift,
    rig.bodyLean,
    rig.headTilt,
    rig.leftArmLift,
    rig.rightArmLift,
  ]);

  const fallbackEarTilt = `${rig.headTilt * 12}deg`;
  const fallbackBodyLean = `${rig.bodyLean * 8}deg`;

  return (
    <div className={`pointer-events-none absolute bottom-3 right-3 z-40 ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-44 rounded-2xl border border-white/20 bg-black/35 p-3 backdrop-blur-md shadow-xl"
      >
        <div className="h-28 w-full overflow-hidden rounded-xl bg-gradient-to-b from-orange-200/90 via-amber-100/90 to-white/70">
          {rive ? (
            <RiveComponent className="h-full w-full" />
          ) : (
            <div className="relative h-full w-full">
              <motion.div
                animate={{ rotate: fallbackBodyLean }}
                className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400"
              >
                <motion.div
                  animate={{ rotate: fallbackEarTilt }}
                  className="absolute -left-2 -top-3 h-5 w-4 rounded-full bg-orange-500"
                />
                <motion.div
                  animate={{ rotate: fallbackEarTilt }}
                  className="absolute -right-2 -top-3 h-5 w-4 rounded-full bg-orange-500"
                />
                <div className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100" />
              </motion.div>
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-white/90">
          <span>{trackingReady ? 'Fox is mirroring you' : 'Initializing Fox...'}</span>
          <span>{emotionLabel(emotion)}</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-amber-300 transition-all duration-200"
            style={{ width: `${Math.max(0, Math.min(100, Math.round(poseScore * 100)))}%` }}
          />
        </div>
      </motion.div>
    </div>
  );
}
