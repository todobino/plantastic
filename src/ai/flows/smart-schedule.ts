// This file uses server-side code, ensure appropriate 'use server' directive.
'use server';

/**
 * @fileOverview AI-powered smart scheduler to optimize project timelines and task dependencies.
 *
 * - optimizeSchedule - A function that takes project timelines and task dependencies as input and suggests an optimized schedule.
 * - OptimizeScheduleInput - The input type for the optimizeSchedule function.
 * - OptimizeScheduleOutput - The return type for the optimizeSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeScheduleInputSchema = z.object({
  projectTimelines: z
    .string()
    .describe('Description of the project timelines, including start and end dates for the project.'),
  taskDependencies: z
    .string()
    .describe('Description of the dependencies between tasks in the project.'),
});
export type OptimizeScheduleInput = z.infer<typeof OptimizeScheduleInputSchema>;

const OptimizeScheduleOutputSchema = z.object({
  optimizedSchedule: z
    .string()
    .describe('The optimized project schedule with adjusted task timelines and dependencies.'),
  rationale: z
    .string()
    .describe('Explanation of the changes made to the schedule and the reasoning behind them.'),
});
export type OptimizeScheduleOutput = z.infer<typeof OptimizeScheduleOutputSchema>;

export async function optimizeSchedule(input: OptimizeScheduleInput): Promise<OptimizeScheduleOutput> {
  return optimizeScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeSchedulePrompt',
  input: {schema: OptimizeScheduleInputSchema},
  output: {schema: OptimizeScheduleOutputSchema},
  prompt: `You are a project management expert with expertise in optimizing project schedules.

  Analyze the provided project timelines and task dependencies to identify potential bottlenecks and inefficiencies.
  Suggest an optimized schedule that minimizes project duration and maximizes resource utilization.
  Explain the changes made to the schedule and the reasoning behind them.

  Project Timelines: {{{projectTimelines}}}
  Task Dependencies: {{{taskDependencies}}}
  
Provide the optimized schedule and the rationale for the changes.
Follow this format:
\`\`\`json
{
  "optimizedSchedule": "...",
  "rationale": "..."
}
\`\`\`
  `,
});

const optimizeScheduleFlow = ai.defineFlow(
  {
    name: 'optimizeScheduleFlow',
    inputSchema: OptimizeScheduleInputSchema,
    outputSchema: OptimizeScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
