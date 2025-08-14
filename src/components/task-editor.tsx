
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
import { format, differenceInDays, addDays } from 'date-fns';
import type { Task } from '@/types';
import { useEffect, useState } from 'react';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';

const taskSchema = z.object({
  name: z.string().min(2, 'Task name must be at least 2 characters.'),
  description: z.string().optional(),
  start: z.date({ required_error: 'A start date is required.' }),
  end: z.date({ required_error: 'An end date is required.' }),
  dependencies: z.array(z.string()).optional(),
  color: z.string().optional(),
  type: z.enum(['task', 'category']),
  parentId: z.string().nullable().optional(),
}).refine(data => data.end >= data.start, {
  message: "End date cannot be before start date.",
  path: ["end"],
});

type TaskFormValues = z.infer<typeof taskSchema>;

type TaskEditorProps = {
  tasks: Task[];
  selectedTask: Task | null;
  onAddTask: (task: Omit<Task, 'id' | 'dependencies'> & { dependencies: string[], color?: string }) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
};

const defaultColor = '#3b82f6';
const colorPalette = [
  '#3b82f6', '#10b981', '#f97316', '#ef4444', '#a855f7', '#6366f1', '#ec4899', '#84cc16'
];

export default function TaskEditor({ tasks, selectedTask, onAddTask, onUpdateTask, onDeleteTask }: TaskEditorProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      description: '',
      dependencies: [],
      color: defaultColor,
      type: 'task',
      parentId: null,
    },
  });
  
  const [duration, setDuration] = useState(1);
  const taskType = form.watch('type');

  useEffect(() => {
    if (selectedTask) {
      const taskDuration = differenceInDays(selectedTask.end, selectedTask.start) + 1;
      form.reset({
        name: selectedTask.name,
        description: selectedTask.description || '',
        start: selectedTask.start,
        end: selectedTask.end,
        dependencies: selectedTask.dependencies || [],
        color: selectedTask.color || defaultColor,
        type: selectedTask.type || 'task',
        parentId: selectedTask.parentId || null,
      });
      setDuration(taskDuration >= 1 ? taskDuration : 1);
    } else {
      const defaultStartDate = new Date();
      const defaultDuration = 1;
      form.reset({
        name: '',
        description: '',
        start: defaultStartDate,
        end: addDays(defaultStartDate, defaultDuration - 1),
        dependencies: [],
        color: defaultColor,
        type: 'task',
        parentId: null,
      });
      setDuration(defaultDuration);
    }
  }, [selectedTask, form]);


  const handleStartDateChange = (date: Date) => {
    form.setValue('start', date);
    const currentDuration = duration;
    form.setValue('end', addDays(date, currentDuration - 1));
  }
  
  const handleDurationChange = (newDuration: number) => {
    if (newDuration < 1) newDuration = 1;
    setDuration(newDuration);
    const startDate = form.getValues('start');
    if (startDate) {
      form.setValue('end', addDays(startDate, newDuration - 1));
    }
  }


  const onSubmit = (data: TaskFormValues) => {
    const taskData = {
      name: data.name,
      description: data.description,
      start: data.start,
      end: data.end,
      dependencies: data.dependencies || [],
      color: data.type === 'task' ? (data.color || defaultColor) : undefined,
      type: data.type,
      parentId: data.parentId,
      isExpanded: selectedTask?.isExpanded ?? true,
    };
    if (selectedTask) {
      onUpdateTask({ ...taskData, id: selectedTask.id });
    } else {
      onAddTask(taskData);
    }
  };
  
  const availableCategories = tasks.filter(t => t.type === 'category' && t.id !== selectedTask?.id);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col h-full">
        <div className="space-y-4 flex-grow overflow-y-auto pr-2 pb-4">
           <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Is this a Category?</FormLabel>
                  <FormDescription>
                    Categories act as containers for other tasks.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value === 'category'}
                    onCheckedChange={(checked) => field.onChange(checked ? 'category' : 'task')}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{taskType === 'category' ? 'Category' : 'Task'} Name</FormLabel>
                <FormControl>
                  <Input placeholder={taskType === 'category' ? "e.g., Planning Phase" : "e.g., Design homepage"} {...field} />
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
                  <Textarea placeholder="Add a short description..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

         {taskType === 'task' && (
            <FormField
              control={form.control}
              name="parentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Parent Category</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Assign to a category..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="null">None</SelectItem>
                        {availableCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
             <FormField
              control={form.control}
              name="start"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-2">
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
                            {field.value ? format(field.value, "MMM d, yyyy") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={(date) => date && handleStartDateChange(date)} initialFocus />
                      </PopoverContent>
                    </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormItem className="flex flex-col gap-2">
                <FormLabel>Duration (days)</FormLabel>
                <FormControl>
                    <Input 
                    type="number" 
                    min="1" 
                    value={duration}
                    onChange={(e) => handleDurationChange(parseInt(e.target.value, 10) || 1)}
                    />
                </FormControl>
             </FormItem>
          </div>
          
          {taskType === 'task' && (
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      {colorPalette.map(color => (
                          <button
                            type="button"
                            key={color}
                            onClick={() => field.onChange(color)}
                            className={cn(
                              "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                              field.value === color ? 'border-primary ring-2 ring-ring' : 'border-transparent'
                            )}
                            style={{backgroundColor: color}}
                          />
                      ))}
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          )}

        </div>

        <div className="flex justify-between items-center pt-4 border-t mt-auto">
          <Button type="submit">
            {selectedTask ? 'Save Changes' : `Add ${taskType === 'category' ? 'Category' : 'Task'}`}
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
