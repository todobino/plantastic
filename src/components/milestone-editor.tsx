
'use client';

import { useState } from 'react';
import type { Milestone } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Trash2, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';

const milestoneSchema = z.object({
  name: z.string().min(1, 'Milestone name is required.'),
  date: z.date({ required_error: 'A date is required.' }),
});

type MilestoneFormValues = z.infer<typeof milestoneSchema>;

type MilestoneEditorProps = {
  milestones: Milestone[];
  setMilestones: React.Dispatch<React.SetStateAction<Milestone[]>>;
};

export default function MilestoneEditor({ milestones, setMilestones }: MilestoneEditorProps) {
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);

  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema),
    defaultValues: { name: '', date: new Date() },
  });

  const handleAddMilestone = (data: MilestoneFormValues) => {
    setMilestones([...milestones, { id: `milestone-${Date.now()}`, ...data }]);
    form.reset({ name: '', date: new Date() });
  };

  const handleUpdateMilestone = (data: MilestoneFormValues) => {
    if (editingMilestone) {
      setMilestones(
        milestones.map(m => (m.id === editingMilestone.id ? { ...m, ...data } : m))
      );
      setEditingMilestone(null);
      form.reset({ name: '', date: new Date() });
    }
  };
  
  const handleEditClick = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    form.reset({
      name: milestone.name,
      date: milestone.date
    })
  }

  const handleDeleteMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };
  
  const onCancelEdit = () => {
    setEditingMilestone(null);
    form.reset({ name: '', date: new Date() });
  }

  const onSubmit = editingMilestone ? handleUpdateMilestone : handleAddMilestone;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Milestones</DialogTitle>
        <DialogDescription>
          Add, edit, or remove project milestones to mark significant points in your timeline.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4 py-4">
        {milestones.length > 0 ? (
          <ul className="space-y-2">
            {milestones.map(milestone => (
              <li key={milestone.id} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                <div className="flex flex-col">
                  <span className="font-semibold">{milestone.name}</span>
                  <span className="text-sm text-muted-foreground">{format(milestone.date, 'PPP')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditClick(milestone)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteMilestone(milestone.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No milestones yet. Add one below!</p>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
           <div className="grid grid-cols-3 items-end gap-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="col-span-2">
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
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
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
                        <Calendar mode="single" selected={field.value} onSelect={(date) => date && field.onChange(date)} initialFocus />
                      </PopoverContent>
                    </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <DialogFooter>
            {editingMilestone && <Button type="button" variant="ghost" onClick={onCancelEdit}>Cancel</Button>}
            <Button type="submit">{editingMilestone ? 'Save Changes' : 'Add Milestone'}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
