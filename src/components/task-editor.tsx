
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
import { CalendarIcon, Check, ChevronsUpDown, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, addDays } from 'date-fns';
import type { Task, TeamMember } from '@/types';
import { useEffect, useState } from 'react';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from './ui/badge';
import { DialogBody, DialogFooter } from './ui/dialog';
import { Slider } from './ui/slider';


const taskSchema = z.object({
  name: z.string().min(2, 'Task name must be at least 2 characters.'),
  description: z.string().optional(),
  start: z.date({ required_error: 'A start date is required.' }),
  end: z.date({ required_error: 'An end date is required.' }),
  dependencies: z.array(z.string()).optional(),
  parentId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  progress: z.number().min(0).max(100).optional(),
}).refine(data => data.end >= data.start, {
  message: "End date cannot be before start date.",
  path: ["end"],
});

type TaskFormValues = z.infer<typeof taskSchema>;

type TaskEditorProps = {
  tasks: Task[];
  selectedTask: Task | null;
  onAddTask: (task: Omit<Task, 'id' | 'dependencies' | 'type'> & { dependencies: string[] }) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  teamMembers: TeamMember[];
};

export default function TaskEditor({ tasks, selectedTask, onAddTask, onUpdateTask, onDeleteTask, teamMembers }: TaskEditorProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      description: '',
      dependencies: [],
      parentId: null,
      assigneeId: null,
      priority: 'medium',
      progress: 0,
    },
  });
  
  const [duration, setDuration] = useState(1);

  useEffect(() => {
    if (selectedTask) {
      form.reset({
        name: selectedTask.name,
        description: selectedTask.description || '',
        start: selectedTask.start,
        end: selectedTask.end,
        dependencies: selectedTask.dependencies || [],
        parentId: selectedTask.parentId || null,
        assigneeId: selectedTask.assigneeId || null,
        priority: selectedTask.priority || 'medium',
        progress: selectedTask.progress || 0,
      });
      const taskDuration = selectedTask.end && selectedTask.start ? differenceInDays(selectedTask.end, selectedTask.start) + 1 : 1;
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
        parentId: null,
        assigneeId: null,
        priority: 'medium',
        progress: 0,
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
      type: 'task' as const,
      parentId: data.parentId,
      assigneeId: data.assigneeId,
      priority: data.priority,
      progress: data.progress,
      isExpanded: selectedTask?.isExpanded ?? true,
    };
    if (selectedTask) {
      onUpdateTask({ ...taskData, id: selectedTask.id });
    } else {
      onAddTask(taskData);
    }
  };
  
  const availableCategories = tasks.filter(t => t.type === 'category' && t.id !== selectedTask?.id);
  const availableDependencies = tasks.filter(t => t.type === 'task' && t.id !== selectedTask?.id);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <DialogBody>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-4 md:col-span-1">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Task Name</FormLabel>
                            <FormControl>
                            <Input placeholder={"e.g., Design homepage"} {...field} />
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

                    <FormField
                        control={form.control}
                        name="dependencies"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dependencies</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-full justify-between h-auto min-h-10",
                                                    !field.value?.length && "text-muted-foreground"
                                                )}
                                            >
                                                <div className="flex gap-1 flex-wrap">
                                                    {field.value && field.value.length > 0 ? field.value.map(depId => (
                                                        <Badge key={depId} variant="secondary">{tasks.find(t => t.id === depId)?.name}</Badge>
                                                    )) : "Select dependencies..."}
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search tasks..." />
                                            <CommandList>
                                                <CommandEmpty>No tasks found.</CommandEmpty>
                                                <CommandGroup>
                                                    {availableDependencies.map(task => (
                                                        <CommandItem
                                                            value={task.name}
                                                            key={task.id}
                                                            onSelect={() => {
                                                                const currentDeps = field.value || [];
                                                                const newDeps = currentDeps.includes(task.id)
                                                                    ? currentDeps.filter(id => id !== task.id)
                                                                    : [...currentDeps, task.id];
                                                                field.onChange(newDeps);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    (field.value || []).includes(task.id)
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {task.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4 md:col-span-1">
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
                    <FormField
                        control={form.control}
                        name="assigneeId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Assignee</FormLabel>
                            <Select 
                                onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                                value={field.value || 'none'}
                                >
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Assign to a team member..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {teamMembers.map(member => (
                                        <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Set priority" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="parentId"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Parent Category</FormLabel>
                            <Select 
                                onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                                value={field.value || 'none'}
                                defaultValue={field.value || 'none'}
                                >
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Assign to a category..." />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {availableCategories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    
                </div>
            </div>
        </DialogBody>

        <DialogFooter>
          <div className="flex justify-between items-center w-full">
            {selectedTask && (
                <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onDeleteTask(selectedTask.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                </Button>
            )}
            <div className="ml-auto">
                <Button type="submit">
                    {selectedTask ? 'Save Changes' : 'Add Task'}
                </Button>
            </div>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
}
