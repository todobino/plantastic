'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { runOptimizeSchedule } from '@/lib/actions';
import type { Task } from '@/types';
import { useState, useTransition } from 'react';
import { Sparkles } from 'lucide-react';
import type { OptimizeScheduleOutput } from '@/ai/flows/smart-schedule';
import { Skeleton } from './ui/skeleton';

const scheduleSchema = z.object({
  projectTimelines: z.string().min(10, 'Please provide more details about project timelines.'),
  taskDependencies: z.string().min(10, 'Please provide more details about task dependencies.'),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

type SmartSchedulerProps = {
  tasks: Task[];
};

export default function SmartScheduler({ tasks }: SmartSchedulerProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<OptimizeScheduleOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      projectTimelines: 'The project should start immediately and finish within the next month.',
      taskDependencies: tasks.map(t => `Task "${t.name}" (ID: ${t.id}) depends on [${t.dependencies.join(', ')}]`).join('\n'),
    },
  });

  const onSubmit = (data: ScheduleFormValues) => {
    setResult(null);
    setError(null);
    startTransition(async () => {
      try {
        const res = await runOptimizeSchedule(data);
        setResult(res);
        console.log('Schedule Optimized!', 'The AI has generated an optimized schedule for your project.');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Something went wrong.';
        setError(errorMessage);
        console.error('An error occurred', errorMessage);
      }
    });
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="projectTimelines"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Timelines</FormLabel>
                <FormControl>
                  <Textarea rows={3} placeholder="Describe project start/end dates, milestones, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="taskDependencies"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task Dependencies & Constraints</FormLabel>
                <FormControl>
                  <Textarea rows={6} placeholder="Describe how tasks are related, resource constraints, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending} className="w-full">
            <Sparkles className="mr-2 h-4 w-4" />
            {isPending ? 'Optimizing...' : 'Generate Optimized Schedule'}
          </Button>
        </form>
      </Form>

       {error && (
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p>{error}</p>
            </CardContent>
        </Card>
      )}

      {isPending && (
         <Card className="flex-grow">
          <CardHeader><CardTitle>AI Analysis</CardTitle></CardHeader>
          <CardContent className="space-y-4">
             <Skeleton className="h-4 w-1/4" />
             <Skeleton className="h-8 w-full" />
             <Skeleton className="h-4 w-1/3" />
             <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="flex-grow bg-secondary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-accent" /> AI Optimized Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold">Optimized Schedule</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap font-code">{result.optimizedSchedule}</p>
            </div>
            <div>
              <h4 className="font-semibold">Rationale</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.rationale}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
