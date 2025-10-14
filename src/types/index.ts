
import { z } from 'zod';

export interface Task {
  id: string;
  name: string;
  description?: string;
  start?: Date;
  end?: Date;
  dependencies: string[];
  color?: string;
  milestone?: string;
  type: 'task' | 'category';
  parentId?: string | null;
  isExpanded?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  value?: number;
}

export interface Milestone {
    id: string;
    name: string;
    date: Date;
}

// AI-related types
export const ExtractProjectInputSchema = z.object({
  fileContent: z.string().describe('The full content of the file (CSV or text).'),
  fileType: z.enum(['csv', 'text']).describe('The type of the file.'),
  currentDate: z.string().describe("Today's date in YYYY-MM-DD format, for resolving relative dates.").optional(),
});
export type ExtractProjectInput = z.infer<typeof ExtractProjectInputSchema>;

export const ExtractedTaskSchema = z.object({
  id: z.string().describe('A unique identifier for the task, e.g., "task-1".'),
  name: z.string().describe('The name of the task.'),
  description: z.string().optional().describe('A brief description of the task.'),
  startDate: z.string().describe('The start date of the task in YYYY-MM-DD format.'),
  endDate: z.string().describe('The end date of the task in YYYY-MM-DD format.'),
  dependencies: z.array(z.string()).describe('A list of task IDs that this task depends on.'),
  milestone: z.string().optional().describe('The milestone or phase this task belongs to.'),
});
export type ExtractedTask = z.infer<typeof ExtractedTaskSchema>;

export const ExtractedProjectOutputSchema = z.object({
  projectName: z.string().describe('A suitable name for the project.'),
  projectDescription: z.string().describe('A brief summary of the project goals.'),
  tasks: z.array(ExtractedTaskSchema).describe('The list of tasks extracted from the document.'),
});
export type ExtractedProjectOutput = z.infer<typeof ExtractedProjectOutputSchema>;
