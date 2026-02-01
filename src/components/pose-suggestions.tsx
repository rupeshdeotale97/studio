"use client";

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader, User, Users, ChevronRight } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { getPoseSuggestions } from '@/app/actions';
import { skeletonConnections, type Skeleton } from '@/lib/pose-data';
import { Skeleton as UISkeleton } from '@/components/ui/skeleton';

interface SuggestedPose {
  id: string;
  title: string;
  skeleton: Skeleton;
}

interface PoseSuggestionsProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPoseSelect: (pose: SuggestedPose) => void;
}

type SuggestionState = 'IDLE' | 'LOADING' | 'SHOWING';

const peopleOptions = [
  { label: 'Solo', count: 1, icon: <User className="h-8 w-8" /> },
  { label: 'Couple', count: 2, icon: <Users className="h-8 w-8" /> },
  { label: 'Group', count: 3, icon: <Users className="h-8 w-8" /> },
];

function PosePreview({ skeleton }: { skeleton: Skeleton }) {
  return (
    <svg viewBox="0 0 100 100" width={56} height={72} className="rounded-sm bg-muted/30 p-1">
      {skeletonConnections.map(([a, b]) => {
        const p1 = skeleton[a as keyof Skeleton];
        const p2 = skeleton[b as keyof Skeleton];
        return (
          <line
            key={`${a}-${b}`}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="rgba(255,255,255,0.85)"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        );
      })}
      {Object.values(skeleton).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.6} fill="white" />
      ))}
    </svg>
  );
}

export default function PoseSuggestions({ isOpen, onOpenChange, onPoseSelect }: PoseSuggestionsProps) {
  const [state, setState] = useState<SuggestionState>('IDLE');
  const [suggestions, setSuggestions] = useState<SuggestedPose[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<number | null>(null);

  const handlePeopleSelect = async (count: number) => {
    setState('LOADING');
    setSelectedPeople(count);
    const poses = await getPoseSuggestions({ numberOfPeople: count });
    setSuggestions(poses as SuggestedPose[]);
    setState('SHOWING');
  };

  const resetState = () => {
    if (isOpen) {
      setState('IDLE');
      setSuggestions([]);
      setSelectedPeople(null);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange} onAnimationEnd={resetState}>
      <SheetContent side="bottom" className="rounded-t-lg">
        <SheetHeader>
          <SheetTitle>Find a Pose</SheetTitle>
          <SheetDescription>
            {state === 'IDLE'
              ? 'How many people are in the shot?'
              : `Great! Here are some ideas for your photo.`}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <AnimatePresence mode="wait">
            {state === 'IDLE' && (
              <motion.div
                key="people-select"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="grid grid-cols-3 gap-4"
              >
                {peopleOptions.map(opt => (
                  <Button
                    key={opt.label}
                    variant="outline"
                    className="h-24 flex flex-col gap-2"
                    onClick={() => handlePeopleSelect(opt.count)}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </Button>
                ))}
              </motion.div>
            )}

                {state === 'LOADING' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 h-48"
              >
                    <Loader className="h-8 w-8 animate-spin text-primary" />
                    <UISkeleton className="h-4 w-48" />
              </motion.div>
            )}

            {state === 'SHOWING' && (
              <motion.div
                key="suggestions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1 }}
                className="flex flex-col gap-2"
              >
                {suggestions.map((suggestion, i) => (
                  <motion.button
                    key={suggestion.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => onPoseSelect(suggestion)}
                    className="w-full text-left p-4 rounded-lg bg-secondary hover:bg-primary/10 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <PosePreview skeleton={suggestion.skeleton} />
                      <span className="font-medium text-secondary-foreground">{suggestion.title}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
