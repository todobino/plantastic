'use server';

import { extractProjectFromFile as extractProjectFlow } from '@/ai/flows/extract-project-from-file';
import type { ExtractProjectInput, ExtractedProjectOutput } from '@/types';

export async function runExtractProjectFromFile(input: ExtractProjectInput): Promise<ExtractedProjectOutput> {
  try {
    return await extractProjectFlow(input);
  } catch (error) {
    console.error("Error extracting project from file:", error);
    throw new Error("Failed to extract project data from the file using AI.");
  }
}
