"use client";

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader, User, Users, Heart } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { getPoseSuggestions } from '@/app/actions';
import { type Skeleton } from '@/lib/pose-data';
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
  { label: 'Solo', count: 1, icon: <User className="h-5 w-5" />, color: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { label: 'Couple', count: 2, icon: <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />, color: 'bg-rose-50 hover:bg-rose-100 border-rose-200' },
  { label: 'Group', count: 3, icon: <Users className="h-5 w-5" />, color: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
];

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
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-gradient-to-br from-white to-rose-50/50" onAnimationEnd={resetState}>
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl font-bold text-gray-900">Choose Your Pose</SheetTitle>
          <SheetDescription className="text-gray-600 text-base">
            {state === 'IDLE'
              ? 'How many people are in your shot?'
              : `Beautiful poses tailored for you`}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <AnimatePresence mode="wait">
            {state === 'IDLE' && (
              <motion.div
                key="people-select"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-3 gap-3"
              >
                {peopleOptions.map(opt => (
                  <motion.button
                    key={opt.label}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handlePeopleSelect(opt.count)}
                    className={`p-4 rounded-2xl border-2 ${opt.color} transition-all duration-200 flex flex-col items-center gap-2 font-medium text-sm text-gray-700`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {state === 'LOADING' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center gap-4 h-40"
              >
                <Loader className="h-6 w-6 animate-spin text-rose-500" />
                <UISkeleton className="h-4 w-48" />
              </motion.div>
            )}

            {state === 'SHOWING' && (
              <motion.div
                key="suggestions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.05 }}
                className="flex flex-col gap-3 max-h-96 overflow-y-auto"
              >
                {suggestions.map((suggestion, i) => (
                  <motion.button
                    key={suggestion.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(244, 114, 182, 0.05)' }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
                    onClick={() => onPoseSelect(suggestion)}
                    className="w-full text-left p-4 rounded-2xl bg-white border border-rose-100 hover:border-rose-300 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{suggestion.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">Tap to start guiding</p>
                      </div>
                      <div className="text-rose-400">
                        <Heart className="h-5 w-5 fill-current" />
                      </div>
                    </div>
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
