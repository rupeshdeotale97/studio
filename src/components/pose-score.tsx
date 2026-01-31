"use client";

import { motion } from 'framer-motion';
import { Check, Camera, Sparkles } from 'lucide-react';

interface PoseScoreProps {
  score: number;
  state: 'GUIDING' | 'CAPTURING' | 'CAPTURED' | string;
}

export default function PoseScore({ score, state }: PoseScoreProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - score * circumference;

  const scoreColor = score > 0.95 ? 'hsl(var(--accent))' : 'hsl(var(--primary))';
  const displayScore = Math.min(100, Math.floor(score * 100));

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="absolute w-full h-full" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke="hsl(var(--border))"
          strokeWidth="6"
          strokeOpacity="0.2"
        />
        <motion.circle
          cx="50"
          cy="50"
          r={radius}
          fill="transparent"
          stroke={scoreColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </svg>
      <div className="relative flex flex-col items-center justify-center text-white font-bold text-3xl">
        {state === 'CAPTURING' && <motion.div initial={{scale:0.5, opacity:0}} animate={{scale:1, opacity:1}}><Camera className="w-10 h-10" /></motion.div>}
        {state === 'CAPTURED' && <motion.div initial={{scale:0.5, opacity:0}} animate={{scale:1, opacity:1}}><Check className="w-12 h-12 text-green-400" /></motion.div>}
        {state === 'GUIDING' && (
          <>
            <motion.span 
              key={displayScore} 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {displayScore}
            </motion.span>
            <span className="text-xs font-normal text-white/70">MATCH</span>
          </>
        )}
      </div>
      {score > 0.95 && state === 'GUIDING' && (
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.1, 1], opacity: 1 }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
            className="absolute -top-2 -right-2 bg-accent text-accent-foreground rounded-full p-2 shadow-lg"
        >
            <Sparkles className="w-4 h-4" />
        </motion.div>
      )}
    </div>
  );
}
