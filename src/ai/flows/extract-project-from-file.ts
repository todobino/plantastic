'use server';

/**
 * @fileOverview An AI flow to extract project structure from a file.
 *
 * - extractProjectFromFile - A function that analyzes a file (CSV or text) and extracts project details.
 * - ExtractProjectInput - The input type for the extractProjectFromFile function.
 * - ExtractedProjectOutput - The return type for the extractProjectFromFile function.
 */

import {ai} from '@/ai/genkit';
import type { ExtractProjectInput, ExtractedProjectOutput } from '@/types';
import { ExtractProjectInputSchema, ExtractedProjectOutputSchema } from '@/types';


export async function extractProjectFromFile(input: ExtractProjectInput): Promise<ExtractedProjectOutput> {
  return extractProjectFlow(input);
}


const prompt = ai.definePrompt({
  name: 'extractProjectPrompt',
  input: {schema: ExtractProjectInputSchema},
  output: {schema: ExtractedProjectOutputSchema},
  prompt: `You are an expert project manager. Your task is to analyze the content of a file and extract a structured project plan from it. The file can be a CSV or a plain text document.

You must identify tasks, their start and end dates, descriptions, dependencies, and group them into milestones or phases if possible.

- Analyze the provided file content.
- Determine a suitable project name and description.
- For each task, extract its name, description, start date, and end date. All dates must be in YYYY-MM-DD format.
- If the document implies categories, phases, or milestones, assign tasks to them.
- If dates are relative (e.g., "next week", "3 days from start"), assume today's date is {{currentDate}} and calculate the absolute dates.
- Generate a unique ID for each task (e.g., "task-1", "task-2") and use these IDs for the dependency list.

File Type: {{{fileType}}}
File Content:
\`\`\`
{{{fileContent}}}
\`\`\`
`,
});

const extractProjectFlow = ai.defineFlow(
  {
    name: 'extractProjectFlow',
    inputSchema: ExtractProjectInputSchema,
    outputSchema: ExtractedProjectOutputSchema,
  },
  async input => {
    const today = new Date().toISOString().split('T')[0];
    const {output} = await prompt({...input, currentDate: today });
    return output!;
  }
);
