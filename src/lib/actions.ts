'use server';

import { optimizeSchedule as optimizeScheduleFlow, OptimizeScheduleInput, OptimizeScheduleOutput } from '@/ai/flows/smart-schedule';

export async function runOptimizeSchedule(input: OptimizeScheduleInput): Promise<OptimizeScheduleOutput> {
  try {
    return await optimizeScheduleFlow(input);
  } catch (error) {
    console.error("Error optimizing schedule:", error);
    throw new Error("Failed to get an optimized schedule from the AI.");
  }
}
