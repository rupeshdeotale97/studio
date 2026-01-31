"use server";

import { suggestPoses as suggestPosesFlow } from "@/ai/flows/suggest-poses-based-on-number-of-people";
import { provideRealtimePoseMatchScore as provideRealtimePoseMatchScoreFlow } from "@/ai/flows/provide-realtime-pose-match-score";

import type { SuggestPosesInput } from "@/ai/flows/suggest-poses-based-on-number-of-people";
import type { ProvideRealtimePoseMatchScoreInput } from "@/ai/flows/provide-realtime-pose-match-score";

export async function getPoseSuggestions(input: SuggestPosesInput) {
  try {
    const result = await suggestPosesFlow(input);
    return result.suggestedPoses;
  } catch (error) {
    console.error("Error getting pose suggestions:", error);
    // Return mock data on error for a better user experience
    if (input.numberOfPeople === 1) {
        return ["Confident Stance", "Hands in Pockets", "Leaning Casually", "Candid Walking"];
    }
    if (input.numberOfPeople === 2) {
        return ["Side by Side", "Playful Back-to-Back", "Gentle Embrace", "Leading the Way"];
    }
    return ["Dynamic Group Jump", "Pyramid Formation", "Staggered Lineup", "Candid Interaction"];
  }
}

export async function getPoseMatchScore(input: ProvideRealtimePoseMatchScoreInput) {
    try {
        const result = await provideRealtimePoseMatchScoreFlow(input);
        return result;
    } catch(error) {
        console.error("Error getting pose score:", error);
        // This is a mocked response to simulate the AI.
        // In a real scenario, you would handle this error more gracefully.
        // We're calculating a score based on a simulated 'match aount'
        const userPose = JSON.parse(input.userPose) as {matchAmount: number};
        const matchAmount = userPose.matchAmount || 0;
        
        let feedback = "Adjust your pose to match the guide.";
        if (matchAmount > 0.3) feedback = "Getting warmer! Try lifting your chin.";
        if (matchAmount > 0.6) feedback = "Almost there! Straighten your left arm.";
        if (matchAmount > 0.9) feedback = "Perfect! Hold that pose!";

        return {
            poseMatchScore: matchAmount,
            feedback: feedback
        }
    }
}
