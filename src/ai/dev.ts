import { config } from 'dotenv';
config();

import '@/ai/flows/provide-realtime-pose-match-score.ts';
import '@/ai/flows/automatically-capture-perfect-pose.ts';
import '@/ai/flows/suggest-poses-based-on-number-of-people.ts';