"use server";

import { suggestPoses as suggestPosesFlow } from "@/ai/flows/suggest-poses-based-on-number-of-people";
import type { SuggestPosesInput } from "@/ai/flows/suggest-poses-based-on-number-of-people";
import type { ProvideRealtimePoseMatchScoreInput } from "@/ai/flows/provide-realtime-pose-match-score";
import { initialPose, perfectPose } from '@/lib/pose-data';

type SuggestedPose = {
  id: string;
  title: string;
  skeleton: typeof initialPose;
};

export async function getPoseSuggestions(input: SuggestPosesInput) {
  try {
    const result = await suggestPosesFlow(input);
    return result.suggestedPoses;
  } catch (error) {
    console.error("Error getting pose suggestions:", error);
    // Return mock data on error for a better user experience
    const single: SuggestedPose[] = [
      { id: 'confident-stance', title: 'Confident Stance', skeleton: perfectPose },
      { id: 'hands-in-pockets', title: 'Hands in Pockets', skeleton: initialPose },
    ];
    const pair: SuggestedPose[] = [
      { id: 'side-by-side', title: 'Side by Side', skeleton: perfectPose },
      { id: 'gentle-embrace', title: 'Gentle Embrace', skeleton: initialPose },
    ];
    const group: SuggestedPose[] = [
      { id: 'staggered-lineup', title: 'Staggered Lineup', skeleton: perfectPose },
      { id: 'candid-interaction', title: 'Candid Interaction', skeleton: initialPose },
    ];

    if (input.numberOfPeople === 1) return single;
    if (input.numberOfPeople === 2) return pair;
    return group;
  }
}

export async function getPoseMatchScore(input: ProvideRealtimePoseMatchScoreInput) {
  try {
    // Parse incoming poses (should be JSON strings)
    const user = JSON.parse(input.userPose) as Record<string, { x: number; y: number }>; 
    const suggested = JSON.parse(input.suggestedPose) as Record<string, { x: number; y: number }>;

    // Compute mean Euclidean distance across matching keypoints
    const keys = Object.keys(suggested).filter(k => user[k]);
    if (keys.length === 0) {
      return { poseMatchScore: 0, feedback: 'No keypoints available.' };
    }

    let totalDist = 0;
    for (const k of keys) {
      const a = user[k];
      const b = suggested[k];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      totalDist += Math.hypot(dx, dy);
    }
    const meanDist = totalDist / keys.length;

    // Normalize by diagonal of 0-100 square
    const maxDist = Math.hypot(100, 100);
    let normalized = meanDist / maxDist; // 0 = perfect, 1 = furthest
    if (normalized < 0) normalized = 0;
    if (normalized > 1) normalized = 1;

    const score = Math.max(0, Math.min(1, 1 - normalized));

    // Simple feedback tiers
    let feedback = 'Adjust to better match the guide.';
    if (score > 0.85) feedback = 'Great! Hold that pose.';
    else if (score > 0.6) feedback = 'Almost there — small adjustments needed.';
    else if (score > 0.35) feedback = 'Getting warmer — adjust your stance.';

    return { poseMatchScore: score, feedback };
  } catch (err) {
    console.error('Error computing pose score:', err);
    return { poseMatchScore: 0, feedback: 'Unable to compute pose score.' };
  }
}
