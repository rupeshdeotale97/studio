"use client";

import { useState, useEffect, useMemo, useCallback, Fragment, useRef } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, RefreshCw, Sparkles, Users, X, RotateCw } from 'lucide-react';

import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/icons';
import PoseSuggestions from '@/components/pose-suggestions';
import PoseScore from '@/components/pose-score';
import ARPoseGuide from '@/components/ar-pose-guide';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type AppState = 'IDLE' | 'SUGGESTING' | 'GUIDING' | 'CAPTURING' | 'CAPTURED';

export default function PosePerfectApp() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [poseMatch, setPoseMatch] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('Select number of people to start.');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedPose, setSelectedPose] = useState<{id: string; title: string; skeleton: any} | null>(null);
  const [showGhost, setShowGhost] = useState(true);
  const [flash, setFlash] = useState(false);
  const [arMode, setArMode] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const ghostImage = useMemo(() => {
    if (!selectedPose) return null;
    const poseId = `pose-${selectedPose.id}`;
    return PlaceHolderImages.find(p => p.id.startsWith(poseId)) || null;
  }, [selectedPose]);

  
  useEffect(() => {
    const stopExistingStream = () => {
      try {
        const current = videoRef.current?.srcObject as MediaStream | null;
        if (current) {
          current.getTracks().forEach(t => t.stop());
          if (videoRef.current) videoRef.current.srcObject = null;
        }
      } catch (e) {
        // ignore
      }
    };

    const getCameraPermission = async () => {
      try {
        stopExistingStream();
        // Try to request the requested facing mode, fall back to any camera
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: cameraFacing } } });
        } catch (err) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
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

  const toggleCameraFacing = () => {
    setCameraFacing(prev => (prev === 'environment' ? 'user' : 'environment'));
  };
  
  useEffect(() => {
    if (appState === 'CAPTURING') {
      setFlash(true);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(200);
      }
      setTimeout(() => {
        setFlash(false);
        setAppState('CAPTURED');
        toast({
            title: "Photo Captured!",
            description: "Your perfect pose has been saved.",
            action: <Check className="h-4 w-4 text-green-500" />,
        });
      }, 300);
    }
  }, [appState, toast]);

  const handlePoseSelect = (pose: {id: string; title: string; skeleton: any}) => {
    setSelectedPose(pose);
    setAppState('GUIDING');
    setIsSheetOpen(false);
    setPoseMatch(0);
    setScore(0);
    setFeedback('Align your body with the guide.');
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    try {
      // show capture flash
      setAppState('CAPTURING');

      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to get canvas context');

      // draw the current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Optionally draw ghost/overlay here if desired (not implemented)

      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
      if (!blob) throw new Error('Failed to capture image');

      const file = new File([blob], `poseperfect-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Try Web Share API with files (saves to gallery via share target on many mobiles)
      if (typeof navigator !== 'undefined' && 'canShare' in navigator && (navigator as any).canShare?.({ files: [file] })) {
        try {
          await (navigator as any).share({ files: [file], title: 'PosePerfect Photo' });
        } catch (shareErr) {
          console.warn('Share canceled or failed', shareErr);
        }
      } else {
        // Fallback: trigger download (user can save image to album manually)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

    } catch (err) {
      console.error('Capture failed', err);
      toast({ title: 'Capture failed', description: 'Unable to save photo.' });
      // return to guiding state
      setAppState('GUIDING');
      return;
    }
  };
  
  const handleReset = useCallback(() => {
    setAppState('IDLE');
    setSelectedPose(null);
    setPoseMatch(0);
    setScore(0);
    setFeedback('Select number of people to start.');
  }, []);

  return (
    <main className="h-screen w-screen bg-black flex items-center justify-center">
      <div className="relative w-full h-screen md:max-w-[420px] md:h-[840px] bg-background overflow-hidden rounded-none md:rounded-lg shadow-2xl">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 md:p-4 bg-gradient-to-b from-black/20 to-transparent">
          <div className="flex items-center gap-2 text-white">
            <AppLogo className="h-6 w-6" />
            <h1 className="font-bold text-lg tracking-tight">PosePerfect</h1>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full transition-all" onClick={handleReset}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </header>

        {/* Camera View */}
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

          {/* AR mode overlay */}
          {arMode && (
            <div className="absolute inset-0 z-30">
              <ARPoseGuide targetSkeleton={selectedPose?.skeleton ?? null} matchScore={score} />
            </div>
          )}
          <AnimatePresence>
            {appState === 'GUIDING' && showGhost && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
              >
                {ghostImage && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.55 }} className="absolute inset-0">
                    <Image src={ghostImage.imageUrl} alt="Pose Guide" layout="fill" objectFit="contain" data-ai-hint={ghostImage.imageHint} />
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          
          
          <AnimatePresence>
            {flash && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.15}} className="absolute inset-0 bg-white" />}
          </AnimatePresence>
        </div>


        {/* UI Overlays */}
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
                <Slider
                  value={[poseMatch * 100]}
                  onValueChange={([val]) => setPoseMatch(val / 100)}
                  max={100}
                  step={1}
                />
                 <p className="text-xs text-center mt-2 text-muted-foreground">Debug: Adjust Pose Match</p>
              </div>
            )}
            
            <AnimatePresence>
            {appState === 'CAPTURED' && (
                <motion.div
                    className="pointer-events-auto"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    <Button onClick={handleReset} className="bg-primary/90 backdrop-blur-sm text-primary-foreground hover:bg-primary">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Start Over
                    </Button>
                </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer controls */}
          <footer className={cn(
            "absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center p-4 md:p-6 bg-gradient-to-t from-black/60 via-black/30 to-transparent",
            (appState !== 'IDLE' && appState !== 'SUGGESTING') && 'justify-between'
        )}>
          {appState === 'IDLE' || appState === 'SUGGESTING' ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Button size="lg" className="h-14 px-8 md:h-16 md:px-10 rounded-full shadow-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold flex items-center gap-2" onClick={() => setIsSheetOpen(true)}>
                <Sparkles className="h-5 w-5" />
                Find my Pose
              </Button>
            </motion.div>
          ) : (
            <Fragment>
                <motion.div 
                  className="flex gap-2"
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowGhost(!showGhost)}
                      className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all duration-200 flex items-center justify-center relative"
                    >
                        <svg className="h-5 w-5 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        {!showGhost && <X className="h-2.5 w-2.5 absolute bottom-0.5 right-0.5 bg-rose-500 text-white rounded-full p-0.5" />}
                    </motion.button>
                </motion.div>
                 <motion.div 
                  className="flex items-center gap-3"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                   <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={toggleCameraFacing} 
                    className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all duration-200 flex items-center justify-center"
                   >
                     <RotateCw className="h-5 w-5 md:h-6 md:w-6" />
                   </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={capturePhoto} 
                    className="h-14 w-14 md:h-16 md:w-16 rounded-full border-4 border-white/60 bg-gradient-to-br from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg text-white transition-all duration-200 flex items-center justify-center"
                  >
                     <Camera className="h-7 w-7 md:h-8 md:w-8" />
                   </motion.button>
                 </motion.div>
                <motion.div 
                  className="flex items-center gap-2"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setArMode(v => !v)}
                    aria-pressed={arMode}
                    className={`h-10 w-10 md:h-12 md:w-12 rounded-full ${arMode ? 'bg-rose-600' : 'bg-white/20'} hover:bg-white/30 backdrop-blur-sm text-white transition-all duration-200 flex items-center justify-center`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7"/><path d="M8 3v4"/><path d="M16 3v4"/><path d="M3 11h18"/></svg>
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsSheetOpen(true)}
                    className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all duration-200 flex items-center justify-center"
                  >
                    <Users className="h-5 w-5 md:h-6 md:w-6"/>
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
