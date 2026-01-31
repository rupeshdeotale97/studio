'use server';
/**
 * @fileOverview This file defines a Genkit flow for automatically capturing a photo when the user achieves a 'perfect' pose based on AI assessment.
 *
 * - automaticallyCapturePerfectPose - A function that initiates the pose assessment and auto-capture process.
 * - AutomaticallyCapturePerfectPoseInput - The input type for the automaticallyCapturePerfectPose function.
 * - AutomaticallyCapturePerfectPoseOutput - The return type for the automaticallyCapturePerfectPose function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutomaticallyCapturePerfectPoseInputSchema = z.object({
  poseData: z.string().describe('Real-time pose data from on-device human pose detection.'),
  numberOfPeople: z.number().describe('The number of people detected in the image.'),
  suggestedPose: z.string().describe('The suggested pose for the detected number of people.'),
  cameraAngle: z.string().describe('The angle of the camera, e.g., low, high, level.'),
});
export type AutomaticallyCapturePerfectPoseInput = z.infer<typeof AutomaticallyCapturePerfectPoseInputSchema>;

const AutomaticallyCapturePerfectPoseOutputSchema = z.object({
  isPerfectPose: z.boolean().describe('Indicates whether the current pose is considered a perfect match to the suggested pose.'),
  feedback: z.string().describe('Real-time feedback to guide the user towards a better pose.'),
  capturePhoto: z.boolean().describe('A flag indicating whether the photo should be automatically captured.'),
});
export type AutomaticallyCapturePerfectPoseOutput = z.infer<typeof AutomaticallyCapturePerfectPoseOutputSchema>;

export async function automaticallyCapturePerfectPose(input: AutomaticallyCapturePerfectPoseInput): Promise<AutomaticallyCapturePerfectPoseOutput> {
  return automaticallyCapturePerfectPoseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'automaticallyCapturePerfectPosePrompt',
  input: {schema: AutomaticallyCapturePerfectPoseInputSchema},
  output: {schema: AutomaticallyCapturePerfectPoseOutputSchema},
  prompt: `You are an AI pose assessment assistant that helps users capture the perfect photo.

You will receive real-time pose data, the number of people in the image, a suggested pose, and the camera angle.

Based on this information, you will determine if the user's current pose is a perfect match to the suggested pose.

Provide real-time feedback to guide the user towards a better pose, and indicate when the photo should be automatically captured.

Pose Data: {{{poseData}}}
Number of People: {{{numberOfPeople}}}
Suggested Pose: {{{suggestedPose}}}
Camera Angle: {{{cameraAngle}}}

Output in JSON format:
{
  "isPerfectPose": true/false, // true if the pose is a perfect match, false otherwise
  "feedback": "string", // Real-time feedback to guide the user towards a better pose
  "capturePhoto": true/false // true if the photo should be automatically captured, false otherwise
}
`,
});

const automaticallyCapturePerfectPoseFlow = ai.defineFlow(
  {
    name: 'automaticallyCapturePerfectPoseFlow',
    inputSchema: AutomaticallyCapturePerfectPoseInputSchema,
    outputSchema: AutomaticallyCapturePerfectPoseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
