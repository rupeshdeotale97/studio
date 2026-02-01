"use client";

import { useState, useEffect, useMemo, useCallback, Fragment, useRef } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, Check, RefreshCw, Sparkles, Users, X } from 'lucide-react';

import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { getPoseMatchScore } from '@/app/actions';
import { AppLogo } from '@/components/icons';
import PoseSuggestions from '@/components/pose-suggestions';
import PoseScore from '@/components/pose-score';
import {
  initialPose,
  perfectPose,
  interpolateSkeletons,
  skeletonConnections,
  type Skeleton
} from '@/lib/pose-data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type AppState = 'IDLE' | 'SUGGESTING' | 'GUIDING' | 'CAPTURING' | 'CAPTURED';

export default function PosePerfectApp() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [poseMatch, setPoseMatch] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('Select number of people to start.');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedPose, setSelectedPose] = useState<{id: string; title: string; skeleton: any} | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showGhost, setShowGhost] = useState(true);
  const [flash, setFlash] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const ghostImage = useMemo(() => {
    if (!selectedPose) return null;
    const poseId = `pose-${selectedPose.id}`;
    return PlaceHolderImages.find(p => p.id.startsWith(poseId)) || null;
  }, [selectedPose]);

  const userSkeleton: Skeleton = useMemo(
    () => interpolateSkeletons(initialPose, perfectPose, poseMatch),
    [poseMatch]
  );
  
  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        // Prefer the back (environment) camera when available, fall back to any camera.
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
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
  }, [toast]);

  useEffect(() => {
    if (appState !== 'GUIDING') return;

    const getScore = async () => {
      // Send actual skeletons to the scoring action for deterministic comparison
      const { poseMatchScore, feedback } = await getPoseMatchScore({
        userPose: JSON.stringify(userSkeleton),
        suggestedPose: JSON.stringify(selectedPose?.skeleton || perfectPose),
      });
      setScore(poseMatchScore);
      setFeedback(feedback);

      if (poseMatchScore > 0.95 && appState === 'GUIDING') {
        setAppState('CAPTURING');
      }
    };

    const debounce = setTimeout(getScore, 100);
    return () => clearTimeout(debounce);
  }, [poseMatch, appState]);
  
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
  
  const handleReset = useCallback(() => {
    setAppState('IDLE');
    setSelectedPose(null);
    setPoseMatch(0);
    setScore(0);
    setFeedback('Select number of people to start.');
  }, []);

  return (
    <main className="h-screen w-screen bg-black flex items-center justify-center">
      <div className="relative w-full max-w-[420px] h-full max-h-[840px] bg-background overflow-hidden rounded-lg shadow-2xl">
        {/* Header */}
        <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center gap-2 text-white">
            <AppLogo className="h-6 w-6" />
            <h1 className="font-bold text-lg tracking-tight">PosePerfect</h1>
          </div>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={handleReset}>
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
          <AnimatePresence>
            {appState === 'GUIDING' && showGhost && ghostImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0"
              >
                <Image src={ghostImage.imageUrl} alt="Pose Guide" layout="fill" objectFit="contain" data-ai-hint={ghostImage.imageHint} />
              </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence>
            {appState === 'GUIDING' && showSkeleton && (
              <motion.svg
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                viewBox="0 0 100 100"
                className="absolute inset-0 w-full h-full"
                preserveAspectRatio="xMidYMid meet"
              >
                {skeletonConnections.map(([startKey, endKey]) => {
                  const p1 = userSkeleton[startKey];
                  const p2 = userSkeleton[endKey];
                  return <line key={`${startKey}-${endKey}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="url(#skeleton-gradient)" strokeWidth="1" strokeLinecap="round" />;
                })}
                {Object.values(userSkeleton).map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="1.5" fill="hsl(var(--primary))" />
                ))}
                <defs>
                    <linearGradient id="skeleton-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{stopColor: 'hsl(var(--primary))', stopOpacity: 1}} />
                        <stop offset="100%" style={{stopColor: 'hsl(var(--accent))', stopOpacity: 1}} />
                    </linearGradient>
                </defs>
              </motion.svg>
            )}
          </AnimatePresence>
          
          <AnimatePresence>
            {flash && <motion.div initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} transition={{duration: 0.15}} className="absolute inset-0 bg-white" />}
          </AnimatePresence>
        </div>

        {/* UI Overlays */}
        <div className="absolute inset-0 z-10 flex flex-col justify-between p-6 text-white pointer-events-none">
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
                    className="pointer-events-auto"
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
            "absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center p-6 bg-gradient-to-t from-black/50 to-transparent",
            (appState !== 'IDLE' && appState !== 'SUGGESTING') && 'justify-between'
        )}>
          {appState === 'IDLE' || appState === 'SUGGESTING' ? (
            <Button size="lg" className="h-16 w-48 rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setIsSheetOpen(true)}>
              <Sparkles className="mr-2 h-5 w-5" />
              Find my Pose
            </Button>
          ) : (
            <Fragment>
                <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" onClick={() => setShowSkeleton(!showSkeleton)}>
                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        {!showSkeleton && <X className="h-3 w-3 absolute bottom-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full" onClick={() => setShowGhost(!showGhost)}>
                        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        {!showGhost && <X className="h-3 w-3 absolute bottom-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5" />}
                    </Button>
                </div>
                 <Button variant="outline" size="icon" className="h-16 w-16 rounded-full border-4 border-white/50 bg-white/20 hover:bg-white/30">
                    <Camera className="h-7 w-7 text-white" />
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full h-12 w-12" onClick={() => setIsSheetOpen(true)}>
                    <Users className="h-6 w-6"/>
                </Button>
            </Fragment>
          )}
        </footer>

        <PoseSuggestions isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} onPoseSelect={handlePoseSelect} />
      </div>
    </main>
  );
}
