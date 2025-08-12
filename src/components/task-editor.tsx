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
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Task } from '@/types';
import { Slider } from '@/components/ui/slider';
import { useEffect, useMemo } from 'react';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';

const taskSchema = z.object({
  name: z.string().min(2, 'Task name must be at least 2 characters.'),
  description: z.string().optional(),
  start: z.date({ required_error: 'A start date is required.' }),
  end: z.date({ required_error: 'An end date is required.' }),
  progress: z.number().min(0).max(100),
  dependencies: z.string().optional(),
}).refine(data => data.end >= data.start, {
  message: "End date cannot be before start date.",
  path: ["end"],
});

type TaskFormValues = z.infer<typeof taskSchema>;

type TaskEditorProps = {
  tasks: Task[];
  selectedTask: Task | null;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
};

export default function TaskEditor({ tasks, selectedTask, onAddTask, onUpdateTask, onDeleteTask }: TaskEditorProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      description: '',
      progress: 0,
      dependencies: '',
    },
  });

  const dependentTasks = useMemo(() => {
    if (!selectedTask) return [];
    return tasks.filter(task => task.dependencies.includes(selectedTask.id));
  }, [tasks, selectedTask]);

  useEffect(() => {
    if (selectedTask) {
      form.reset({
        name: selectedTask.name,
        description: selectedTask.description || '',
        start: selectedTask.start,
        end: selectedTask.end,
        progress: selectedTask.progress,
        dependencies: selectedTask.dependencies.join(', '),
      });
    } else {
      form.reset({
        name: '',
        description: '',
        start: undefined,
        end: undefined,
        progress: 0,
        dependencies: '',
      });
    }
  }, [selectedTask, form]);


  const onSubmit = (data: TaskFormValues) => {
    const taskData = {
      name: data.name,
      description: data.description,
      start: data.start,
      end: data.end,
      progress: data.progress,
      dependencies: data.dependencies ? data.dependencies.split(',').map(d => d.trim()).filter(Boolean) : [],
    };
    if (selectedTask) {
      onUpdateTask({ ...taskData, id: selectedTask.id });
    } else {
      onAddTask(taskData);
    }
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col h-full">
        <div className="space-y-4 flex-grow overflow-y-auto pr-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Task Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Design homepage" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="Add a short description of the task..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="start"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                   <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="end"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
                  <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
           <FormField
            control={form.control}
            name="progress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Progress - {field.value}%</FormLabel>
                <FormControl>
                  <Slider
                    min={0}
                    max={100}
                    step={1}
                    value={[field.value]}
                    onValueChange={(vals) => field.onChange(vals[0])}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dependencies"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dependencies</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., task-1, task-2" {...field} />
                </FormControl>
                 <FormDescription>
                  Comma-separated list of task IDs this task depends on.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
           {selectedTask && dependentTasks.length > 0 && (
            <div className="space-y-2">
              <Label>Dependent Tasks</Label>
              <div className="flex flex-wrap gap-2">
                {dependentTasks.map(task => (
                  <Badge key={task.id} variant="secondary" className="font-normal">
                    {task.name}
                  </Badge>
                ))}
              </div>
               <p className="text-sm text-muted-foreground">
                  Tasks that depend on this task.
                </p>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button type="submit" className="bg-accent hover:bg-accent/90">
            {selectedTask ? 'Save Changes' : 'Add Task'}
          </Button>
          {selectedTask && (
             <Button type="button" variant="destructive" size="icon" onClick={() => onDeleteTask(selectedTask.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
