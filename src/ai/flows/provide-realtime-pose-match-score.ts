'use server';

/**
 * @fileOverview A flow that analyzes a user's pose in real-time and provides a score
 * indicating how well it matches the suggested pose.
 *
 * - provideRealtimePoseMatchScore - A function that handles the pose match scoring process.
 * - ProvideRealtimePoseMatchScoreInput - The input type for the provideRealtimePoseMatchScore function.
 * - ProvideRealtimePoseMatchScoreOutput - The return type for the provideRealtimePoseMatchScore function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProvideRealtimePoseMatchScoreInputSchema = z.object({
  userPose: z
    .string()
    .describe(
      'A JSON string representing the user pose data, including keypoints and confidence scores.'
    ),
  suggestedPose: z
    .string()
    .describe(
      'A JSON string representing the suggested pose data, including keypoints and confidence scores.'
    ),
});
export type ProvideRealtimePoseMatchScoreInput = z.infer<
  typeof ProvideRealtimePoseMatchScoreInputSchema
>;

const ProvideRealtimePoseMatchScoreOutputSchema = z.object({
  poseMatchScore: z
    .number()
    .describe(
      'A score between 0 and 1 indicating how well the user pose matches the suggested pose. Higher score indicates a better match.'
    ),
  feedback: z
    .string()
    .describe(
      'Textual feedback to the user on how to improve their pose to better match the suggested pose.'
    ),
});
export type ProvideRealtimePoseMatchScoreOutput = z.infer<
  typeof ProvideRealtimePoseMatchScoreOutputSchema
>;

export async function provideRealtimePoseMatchScore(
  input: ProvideRealtimePoseMatchScoreInput
): Promise<ProvideRealtimePoseMatchScoreOutput> {
  return provideRealtimePoseMatchScoreFlow(input);
}

const prompt = ai.definePrompt({
  name: 'provideRealtimePoseMatchScorePrompt',
  input: {schema: ProvideRealtimePoseMatchScoreInputSchema},
  output: {schema: ProvideRealtimePoseMatchScoreOutputSchema},
  prompt: `You are an AI pose analysis expert providing feedback to users on how well their pose matches a suggested pose.

  Analyze the userPose and suggestedPose data provided. Calculate a poseMatchScore between 0 and 1, where 1 indicates a perfect match.

  Provide specific and actionable feedback to the user on how to adjust their pose to improve the match. Focus on key areas where the user's pose deviates from the suggested pose.

  User Pose Data: {{{userPose}}}
  Suggested Pose Data: {{{suggestedPose}}}

  Pose Match Score:`, // The LLM should append the score here
});

const provideRealtimePoseMatchScoreFlow = ai.defineFlow(
  {
    name: 'provideRealtimePoseMatchScoreFlow',
    inputSchema: ProvideRealtimePoseMatchScoreInputSchema,
    outputSchema: ProvideRealtimePoseMatchScoreOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Attempt to parse LLM result to a number
    let llmScore = parseFloat(output!.poseMatchScore.toString());

    // If not a number or out of range 0 - 1, return a default value and error message
    if (isNaN(llmScore) || llmScore < 0 || llmScore > 1) {
      console.error(
        `Invalid poseMatchScore returned from LLM, defaulting to 0.5: ${output!.poseMatchScore}`
      );
      llmScore = 0.5;
    }

    return {
      poseMatchScore: llmScore,
      feedback: output!.feedback,
    };
  }
);
