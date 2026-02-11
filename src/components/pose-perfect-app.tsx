"use client";

import { useState, useEffect, useCallback, Fragment, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, RefreshCw, Sparkles, Users, RotateCw } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/icons';
import PoseSuggestions from '@/components/pose-suggestions';
import PoseScore from '@/components/pose-score';
import FoxCoach from '@/components/fox-coach';
import { usePoseDetection } from '@/hooks/use-pose-detection';
import { calculatePoseMatchScore, getPoseFeedback } from '@/lib/pose-coach';
import type { Skeleton } from '@/lib/pose-data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type AppState = 'IDLE' | 'SUGGESTING' | 'GUIDING' | 'CAPTURING' | 'CAPTURED';

type SuggestedPose = {
  id: string;
  title: string;
  skeleton: Skeleton;
};

export default function PosePerfectApp() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('Select number of people to start.');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedPose, setSelectedPose] = useState<SuggestedPose | null>(null);
  const [flash, setFlash] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const smoothedScoreRef = useRef(0);
  const { toast } = useToast();

  const isGuiding = appState === 'GUIDING';
  const { landmarks, ready: poseReady, error: poseError, fps } = usePoseDetection({
    videoRef,
    enabled: isGuiding && hasCameraPermission === true,
    smoothing: 0.32,
  });

  const canCapture = isGuiding && !!selectedPose && score >= 0.8 && hasCameraPermission === true;

  useEffect(() => {
    const stopExistingStream = () => {
      try {
        const current = videoRef.current?.srcObject as MediaStream | null;
        if (current) {
          current.getTracks().forEach((track) => track.stop());
          if (videoRef.current) videoRef.current.srcObject = null;
        }
      } catch {
        // no-op
      }
    };

    const getCameraPermission = async () => {
      try {
        stopExistingStream();
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: cameraFacing }, frameRate: { ideal: 60, min: 24 } },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings to use this app.',
        });
      }
    };

    getCameraPermission();

    return () => stopExistingStream();
  }, [toast, cameraFacing]);

  useEffect(() => {
    if (!isGuiding || !selectedPose || !landmarks) return;
    const nextScore = calculatePoseMatchScore(landmarks, selectedPose.skeleton);
    const smoothed = smoothedScoreRef.current * 0.72 + nextScore * 0.28;
    smoothedScoreRef.current = smoothed;
    setScore(smoothed);
    setFeedback(getPoseFeedback(smoothed, landmarks));
  }, [isGuiding, landmarks, selectedPose]);

  useEffect(() => {
    if (appState !== 'CAPTURING') return;

    setFlash(true);
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(160);
    }

    const timer = window.setTimeout(() => {
      setFlash(false);
      setAppState('CAPTURED');
      toast({
        title: 'Photo Captured!',
        description: 'Your perfect pose has been saved.',
        action: <Check className="h-4 w-4 text-green-500" />,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [appState, toast]);

  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handlePoseSelect = (pose: SuggestedPose) => {
    setSelectedPose(pose);
    setAppState('GUIDING');
    setIsSheetOpen(false);
    setScore(0);
    smoothedScoreRef.current = 0;
    setFeedback('Match Fox by aligning your shoulders, elbows, and hips.');
  };

  const capturePhoto = async () => {
    if (!canCapture || !videoRef.current) return;

    try {
      setAppState('CAPTURING');

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to get canvas context');

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('Failed to capture image');

      const file = new File([blob], `poseperfect-${Date.now()}.jpg`, { type: 'image/jpeg' });

      if (typeof navigator !== 'undefined' && 'canShare' in navigator && (navigator as any).canShare?.({ files: [file] })) {
        await (navigator as any).share({ files: [file], title: 'PosePerfect Photo' }).catch(() => undefined);
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = file.name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Capture failed', err);
      toast({ title: 'Capture failed', description: 'Unable to save photo.' });
      setAppState('GUIDING');
    }
  };

  const handleReset = useCallback(() => {
    setAppState('IDLE');
    setSelectedPose(null);
    setScore(0);
    smoothedScoreRef.current = 0;
    setFeedback('Select number of people to start.');
  }, []);

  return (
    <main className="h-screen w-screen bg-black flex items-center justify-center">
      <div className="relative w-full h-screen md:max-w-[420px] md:h-[840px] bg-background overflow-hidden rounded-none md:rounded-lg shadow-2xl">
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 md:p-4 bg-gradient-to-b from-black/20 to-transparent">
          <div className="flex items-center gap-2 text-white">
            <AppLogo className="h-6 w-6" />
            <h1 className="font-bold text-lg tracking-tight">PosePerfect</h1>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full transition-all" onClick={handleReset}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </header>

        <div className="absolute inset-0">
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" autoPlay muted playsInline />

          {hasCameraPermission === false && (
            <div className="absolute inset-0 flex items-center justify-center p-8 bg-black/50">
              <Alert variant="destructive">
                <AlertTitle>Camera Access Required</AlertTitle>
                <AlertDescription>
                  Please allow camera access to use this feature. You may need to grant permissions in your browser settings.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {(appState === 'GUIDING' || appState === 'CAPTURING') && (
            <FoxCoach landmarks={landmarks} poseScore={score} trackingReady={poseReady} />
          )}

          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 bg-white"
              />
            )}
          </AnimatePresence>
        </div>

        <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 md:p-6 text-white pointer-events-none">
          <AnimatePresence>
            {(appState === 'GUIDING' || appState === 'CAPTURING') && (
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                className="self-center mt-16 px-4 py-2 bg-black/50 rounded-full backdrop-blur-sm"
              >
                <p className="font-medium text-center">{feedback}</p>
                <p className="text-[10px] text-white/75 text-center mt-1">
                  Pose tracking {poseReady ? 'ready' : 'loading'}{poseError ? ` (${poseError})` : ''} {poseReady ? `• ${Math.round(fps)} FPS` : ''}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col items-center gap-4">
            <AnimatePresence>
              {(appState === 'GUIDING' || appState === 'CAPTURING' || appState === 'CAPTURED') && (
                <motion.div
                  className="pointer-events-auto transform scale-90 md:scale-100"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                >
                  <PoseScore score={score} state={appState} />
                </motion.div>
              )}
            </AnimatePresence>

            {appState === 'GUIDING' && (
              <div className="w-full max-w-xs pointer-events-auto">
                <div className="flex items-center justify-between text-xs text-white/80 mb-2">
                  <span>Pose match</span>
                  <span>{Math.round(score * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className={cn('h-full transition-all duration-200', score >= 0.8 ? 'bg-emerald-400' : 'bg-rose-400')}
                    style={{ width: `${Math.min(100, Math.round(score * 100))}%` }}
                  />
                </div>
                <p className="text-xs text-center mt-2 text-white/70">Match 80%+ to enable capture.</p>
              </div>
            )}

            <AnimatePresence>
              {appState === 'CAPTURED' && (
                <motion.div className="pointer-events-auto" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                  <Button onClick={handleReset} className="bg-primary/90 backdrop-blur-sm text-primary-foreground hover:bg-primary">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Start Over
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <footer
          className={cn(
            'absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center p-4 md:p-6 bg-gradient-to-t from-black/60 via-black/30 to-transparent',
            appState !== 'IDLE' && appState !== 'SUGGESTING' && 'justify-between'
          )}
        >
          {appState === 'IDLE' || appState === 'SUGGESTING' ? (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}>
              <Button
                size="lg"
                className="h-14 px-8 md:h-16 md:px-10 rounded-full shadow-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold flex items-center gap-2"
                onClick={() => setIsSheetOpen(true)}
              >
                <Sparkles className="h-5 w-5" />
                Find my Pose
              </Button>
            </motion.div>
          ) : (
            <Fragment>
              <motion.div className="flex gap-2" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleCameraFacing}
                  className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all duration-200 flex items-center justify-center"
                >
                  <RotateCw className="h-5 w-5 md:h-6 md:w-6" />
                </motion.button>
              </motion.div>

              <motion.div className="flex items-center gap-3" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                <motion.button
                  whileHover={canCapture ? { scale: 1.08 } : undefined}
                  whileTap={canCapture ? { scale: 0.92 } : undefined}
                  onClick={capturePhoto}
                  disabled={!canCapture}
                  aria-disabled={!canCapture}
                  className={cn(
                    'h-14 w-14 md:h-16 md:w-16 rounded-full border-4 shadow-lg text-white transition-all duration-200 flex items-center justify-center',
                    canCapture
                      ? 'border-white/60 bg-gradient-to-br from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600'
                      : 'border-white/20 bg-white/10 opacity-60 cursor-not-allowed'
                  )}
                >
                  <Camera className="h-7 w-7 md:h-8 md:w-8" />
                </motion.button>
              </motion.div>

              <motion.div className="flex items-center gap-2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsSheetOpen(true)}
                  className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all duration-200 flex items-center justify-center"
                >
                  <Users className="h-5 w-5 md:h-6 md:w-6" />
                </motion.button>
              </motion.div>
            </Fragment>
          )}
        </footer>

        <PoseSuggestions isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} onPoseSelect={handlePoseSelect} />
      </div>
    </main>
  );
}

