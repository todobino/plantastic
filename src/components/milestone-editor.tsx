
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
import { Trash2 } from 'lucide-react';
import type { Task } from '@/types';
import { useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { DialogBody, DialogFooter } from './ui/dialog';
import { startOfDay } from 'date-fns';

const milestoneSchema = z.object({
  name: z.string().min(2, 'Milestone name must be at least 2 characters.'),
  parentId: z.string().nullable().optional(),
});

type MilestoneFormValues = z.infer<typeof milestoneSchema>;

type MilestoneEditorProps = {
  tasks: Task[];
  selectedMilestone: Task | null;
  onUpsert: (milestone: Omit<Task, 'id'> | Task) => void;
  onDelete: (taskId: string) => void;
};

export default function MilestoneEditor({ tasks, selectedMilestone, onUpsert, onDelete }: MilestoneEditorProps) {
  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: {
      name: '',
      parentId: null,
    },
  });

  useEffect(() => {
    if (selectedMilestone) {
      form.reset({
        name: selectedMilestone.name,
        parentId: selectedMilestone.parentId || null,
      });
    } else {
        form.reset({
            name: '',
            parentId: null,
        });
    }
  }, [selectedMilestone, form]);


  const onSubmit = (data: MilestoneFormValues) => {
    const categoryTasks = tasks.filter(t => t.parentId === data.parentId && t.type === 'task' && t.end);
    const latestEndDate = categoryTasks.reduce((latest, current) => {
        return current.end && (!latest || current.end > latest) ? current.end : latest;
    }, null as Date | null);
    
    const milestoneDate = latestEndDate ? startOfDay(latestEndDate) : startOfDay(new Date());

    const milestoneData = {
        ...data,
        start: milestoneDate,
        end: milestoneDate,
        dependencies: categoryTasks.map(t => t.id),
        type: 'milestone' as const,
    };
    
    if (selectedMilestone) {
      onUpsert({ ...selectedMilestone, ...milestoneData });
    } else {
      onUpsert(milestoneData);
    }
  };
  
  const existingMilestoneParentIds = tasks.filter(t => t.type === 'milestone' && t.id !== selectedMilestone?.id).map(t => t.parentId);
  const availableCategories = tasks.filter(t => t.type === 'category' && !existingMilestoneParentIds.includes(t.id));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
        <DialogBody>
            <div className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Milestone Name</FormLabel>
                        <FormControl>
                        <Input placeholder="e.g., Project Launch" {...field} />
                        </FormControl>
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
        </DialogBody>

        <DialogFooter>
          <div className="flex justify-between items-center w-full">
             {selectedMilestone && (
                <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete(selectedMilestone.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                </Button>
            )}
            <div className="ml-auto">
                <Button type="submit">
                    {selectedMilestone ? 'Save Changes' : 'Add Milestone'}
                </Button>
            </div>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
}
