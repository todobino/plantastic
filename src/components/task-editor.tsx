
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Trash2, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, addDays } from 'date-fns';
import type { Task } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const taskSchema = z.object({
  name: z.string().min(2, 'Task name must be at least 2 characters.'),
  description: z.string().optional(),
  start: z.date({ required_error: 'A start date is required.' }),
  end: z.date({ required_error: 'An end date is required.' }),
  duration: z.number().min(0, "Duration must be positive."),
}).refine(data => data.end >= data.start, {
  message: "End date cannot be before start date.",
  path: ["end"],
});

type TaskFormValues = z.infer<typeof taskSchema>;

type TaskEditorProps = {
  tasks: Task[];
  selectedTask: Task | null;
  onAddTask: (task: Omit<Task, 'id' | 'dependencies'> & { dependencies: string[] }) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateDependencies: (taskId: string, newDependencies: string[], newBlockedTasks: string[]) => void;
};

export default function TaskEditor({ tasks, selectedTask, onAddTask, onUpdateTask, onDeleteTask, onUpdateDependencies }: TaskEditorProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      description: '',
      duration: 1,
    },
  });
  
  const [duration, setDuration] = useState(1);
  const [dependsOn, setDependsOn] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  
  const blockedByThisTask = useMemo(() => {
    if (!selectedTask) return [];
    return tasks.filter(task => task.dependencies.includes(selectedTask.id)).map(t => t.id);
  }, [tasks, selectedTask]);


  useEffect(() => {
    if (selectedTask) {
      const taskDuration = differenceInDays(selectedTask.end, selectedTask.start) + 1;
      const currentDuration = taskDuration >= 0 ? taskDuration : 1;
      form.reset({
        name: selectedTask.name,
        description: selectedTask.description || '',
        start: selectedTask.start,
        end: selectedTask.end,
        duration: currentDuration,
      });
      setDuration(currentDuration);
      setDependsOn(selectedTask.dependencies);
      setBlocks(blockedByThisTask);
    } else {
      const defaultDuration = 1;
      form.reset({
        name: '',
        description: '',
        start: new Date(),
        end: addDays(new Date(), defaultDuration - 1),
        duration: defaultDuration
      });
      setDuration(defaultDuration);
      setDependsOn([]);
      setBlocks([]);
    }
  }, [selectedTask, tasks, form, blockedByThisTask]);


  const availableTasksForDependsOn = useMemo(() => {
      if(!selectedTask) return tasks.filter(t => !dependsOn.includes(t.id));;
      // Cannot depend on itself or tasks that depend on it (circular)
      const unselectableIds = new Set([selectedTask.id, ...blockedByThisTask, ...dependsOn]);
      return tasks.filter(t => !unselectableIds.has(t.id));
  }, [tasks, selectedTask, dependsOn, blockedByThisTask]);

  const availableTasksForBlocks = useMemo(() => {
    if(!selectedTask) return tasks.filter(t => !blocks.includes(t.id));;
    // Cannot block itself or tasks it depends on (circular)
    const unselectableIds = new Set([selectedTask.id, ...dependsOn, ...blocks]);
    return tasks.filter(t => !unselectableIds.has(t.id));
  }, [tasks, selectedTask, dependsOn, blocks]);

  const handleStartDateChange = (date: Date) => {
    form.setValue('start', date);
    const currentDuration = form.getValues('duration');
    form.setValue('end', addDays(date, currentDuration - 1));
  }
  
  const handleDurationChange = (newDuration: number) => {
    if (newDuration < 1) newDuration = 1;
    setDuration(newDuration);
    form.setValue('duration', newDuration);
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
      dependencies: dependsOn,
    };
    if (selectedTask) {
      onUpdateTask({ ...taskData, id: selectedTask.id });
      onUpdateDependencies(selectedTask.id, dependsOn, blocks);
    } else {
      onAddTask(taskData);
      // We don't have the new task ID here, so we can't update other tasks to block them.
      // This will need to be handled in the parent component after the task is created.
      // For now, we assume onAddTask will be followed by a full state update.
    }
  };

  const handleAddDependency = (taskId: string) => {
    if (!dependsOn.includes(taskId)) {
      setDependsOn([...dependsOn, taskId]);
    }
  }

  const handleRemoveDependency = (taskId: string) => {
    setDependsOn(dependsOn.filter(id => id !== taskId));
  }

  const handleAddBlockedTask = (taskId: string) => {
     if (!blocks.includes(taskId)) {
      setBlocks([...blocks, taskId]);
    }
  }

  const handleRemoveBlockedTask = (taskId: string) => {
    setBlocks(blocks.filter(id => id !== taskId));
  }
  
  const DependencySelector = ({
    availableTasks,
    onSelect,
    children
  }: {
    availableTasks: Task[],
    onSelect: (taskId: string) => void,
    children: React.ReactNode
  }) => {
    const [open, setOpen] = useState(false);

    return (
       <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {children}
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tasks..." />
            <CommandList>
              <CommandEmpty>No tasks found.</CommandEmpty>
              <CommandGroup>
                {availableTasks.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={task.name}
                    onSelect={() => {
                      onSelect(task.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        "opacity-0" // We are just adding, not marking selection
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
    )
  }

  const DependencyBadge = ({ taskId, onRemove }: { taskId: string, onRemove: (taskId: string) => void }) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return null;
    return (
      <Badge variant="secondary" className="font-normal flex items-center gap-1.5 cursor-pointer">
        {task.name}
        <button onClick={() => onRemove(taskId)} className="rounded-full hover:bg-muted-foreground/20">
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col h-full">
        <div className="space-y-4 flex-grow overflow-y-auto pr-2 pb-4">
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
             <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
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
                    <FormMessage />
                  </FormItem>
                )}
              />
          </div>
          
          <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                  <Label>Follows</Label>
                  <div className="flex flex-wrap gap-2">
                      {dependsOn.map(id => <DependencyBadge key={`dep-${id}`} taskId={id} onRemove={handleRemoveDependency} />)}
                        <DependencySelector availableTasks={availableTasksForDependsOn} onSelect={handleAddDependency}>
                          <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs">+ Add</Button>
                      </DependencySelector>
                  </div>
              </div>
                <div className="space-y-2">
                  <Label>Proceeds</Label>
                  <div className="flex flex-wrap gap-2">
                      {blocks.map(id => <DependencyBadge key={`block-${id}`} taskId={id} onRemove={handleRemoveBlockedTask} />)}
                        <DependencySelector availableTasks={availableTasksForBlocks} onSelect={handleAddBlockedTask}>
                          <Button type="button" variant="outline" size="sm" className="h-6 px-2 text-xs">+ Add</Button>
                      </DependencySelector>
                  </div>
              </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t mt-auto">
          <Button type="submit">
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
