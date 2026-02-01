// This file defines a Genkit flow that suggests poses based on the number of people.
'use server';

/**
 * @fileOverview This file defines a Genkit flow that suggests poses based on the number of people detected in the camera frame.
 *
 * - `suggestPoses` - An async function that takes the number of people as input and returns a list of suggested poses.
 * - `SuggestPosesInput` - The input type for the `suggestPoses` function, defining the number of people in the frame.
 * - `SuggestPosesOutput` - The output type for the `suggestPoses` function, providing an array of suggested poses.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPosesInputSchema = z.object({
  numberOfPeople: z.number().describe('The number of people detected in the camera frame.'),
});
export type SuggestPosesInput = z.infer<typeof SuggestPosesInputSchema>;

// Each suggested pose is a small pose guide represented as a skeleton matching the app's `Skeleton` shape.
const KeypointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const SkeletonSchema = z.object({
  nose: KeypointSchema,
  leftEye: KeypointSchema,
  rightEye: KeypointSchema,
  leftEar: KeypointSchema,
  rightEar: KeypointSchema,
  leftShoulder: KeypointSchema,
  rightShoulder: KeypointSchema,
  leftElbow: KeypointSchema,
  rightElbow: KeypointSchema,
  leftWrist: KeypointSchema,
  rightWrist: KeypointSchema,
  leftHip: KeypointSchema,
  rightHip: KeypointSchema,
  leftKnee: KeypointSchema,
  rightKnee: KeypointSchema,
  leftAnkle: KeypointSchema,
  rightAnkle: KeypointSchema,
});

const SuggestedPoseSchema = z.object({
  id: z.string().describe('A short id for this pose, suitable for lookups.'),
  title: z.string().describe('A short human-friendly title for the pose.'),
  skeleton: SkeletonSchema.describe('A guide skeleton with normalized coordinates (0-100).'),
});

const SuggestPosesOutputSchema = z.object({
  suggestedPoses: z.array(SuggestedPoseSchema).describe('An array of suggested pose skeletons suitable for the detected number of people.'),
});
export type SuggestPosesOutput = z.infer<typeof SuggestPosesOutputSchema>;

export async function suggestPoses(input: SuggestPosesInput): Promise<SuggestPosesOutput> {
  return suggestPosesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPosesPrompt',
  input: {schema: SuggestPosesInputSchema},
  output: {schema: SuggestPosesOutputSchema},
  prompt: `You are an AI posing assistant that suggests pose guides as skeletons for a camera-based guide.

  Requirements:
  - Return a JSON object that matches the output schema exactly: { "suggestedPoses": [ { "id": string, "title": string, "skeleton": { ... } } ] }.
  - For each suggested pose provide:
    - id: short kebab-case identifier (e.g. "confident-stance").
    - title: short human-friendly title (e.g. "Confident Stance").
    - skeleton: pose keypoints with numeric x/y coordinates normalized to a 0-100 square (numbers only).
  - Do NOT include any commentary or extraneous text — return only the JSON matching the schema.

  Here's the number of people in the photo: {{{numberOfPeople}}}

  Provide 3-6 varied poses appropriate for that number of people.
  `,
});

const suggestPosesFlow = ai.defineFlow(
  {
    name: 'suggestPosesFlow',
    inputSchema: SuggestPosesInputSchema,
    outputSchema: SuggestPosesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
