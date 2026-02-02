"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { skeletonConnections, type Skeleton } from '@/lib/pose-data';

interface SkeletonGuideProps {
  skeleton: Skeleton;
  className?: string;
  strokeWidth?: number;
  color?: string;
}

export default function SkeletonGuide({ skeleton, className = '', strokeWidth = 2.5, color = 'white' }: SkeletonGuideProps) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className={className}>
      <defs>
        <filter id="drop-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="rgba(0,0,0,0.6)" />
        </filter>

        <linearGradient id="skeleton-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>

      {/* thicker outer stroke for silhouette (shadow) */}
      {skeletonConnections.map(([startKey, endKey], i) => {
        const p1 = skeleton[startKey];
        const p2 = skeleton[endKey];
        return (
          <line
            key={`outer-${startKey}-${endKey}-${i}`}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="rgba(0,0,0,0.6)"
            strokeWidth={strokeWidth + 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#drop-shadow)"
          />
        );
      })}

      {/* animated gradient stroke */}
      {skeletonConnections.map(([startKey, endKey], i) => {
        const p1 = skeleton[startKey];
        const p2 = skeleton[endKey];
        const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const dash = `${len} ${len}`;
        return (
          <motion.line
            key={`anim-${startKey}-${endKey}-${i}`}
            x1={p1.x}
            y1={p1.y}
            x2={p2.x}
            y2={p2.y}
            stroke="url(#skeleton-grad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={dash}
            initial={{ strokeDashoffset: len }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ delay: i * 0.03, duration: 0.6, ease: 'easeOut' }}
          />
        );
      })}

      {/* keypoints with subtle wobble */}
      {Object.values(skeleton).map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={strokeWidth * 0.6}
          fill={color}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: [0.95, 1.05, 0.98, 1], opacity: 1 }}
          transition={{ delay: 0.2 + (i % 6) * 0.08, duration: 2.4, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
        />
      ))}
    </svg>
  );
}
