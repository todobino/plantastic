
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
import { CalendarIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays, addDays } from 'date-fns';
import type { Task } from '@/types';
import { useEffect, useState } from 'react';
import { Textarea } from './ui/textarea';

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters.'),
  description: z.string().optional(),
  start: z.date({ required_error: 'A start date is required.' }),
  end: z.date({ required_error: 'An end date is required.' }),
  color: z.string().optional(),
}).refine(data => data.end >= data.start, {
  message: "End date cannot be before start date.",
  path: ["end"],
});

type CategoryFormValues = z.infer<typeof categorySchema>;

type CategoryEditorProps = {
  selectedCategory: Task | null;
  onAddCategory: (category: Omit<Task, 'id' | 'type' | 'dependencies'> & { dependencies: string[] }) => void;
  onUpdateCategory: (category: Task) => void;
  onDeleteCategory: (categoryId: string) => void;
};

const defaultColor = '#3b82f6';
const colorPalette = [
  '#3b82f6', '#10b981', '#f97316', '#ef4444', '#a855f7', '#6366f1', '#ec4899', '#84cc16'
];

export default function CategoryEditor({ selectedCategory, onAddCategory, onUpdateCategory, onDeleteCategory }: CategoryEditorProps) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      color: defaultColor,
    },
  });

  const [duration, setDuration] = useState(1);

  useEffect(() => {
    if (selectedCategory) {
      form.reset({
        name: selectedCategory.name,
        description: selectedCategory.description || '',
        start: selectedCategory.start,
        end: selectedCategory.end,
        color: selectedCategory.color || defaultColor,
      });
      const categoryDuration = differenceInDays(selectedCategory.end, selectedCategory.start) + 1;
      setDuration(categoryDuration >= 1 ? categoryDuration : 1);
    } else {
      const defaultStartDate = new Date();
      const defaultDuration = 1;
      form.reset({
        name: '',
        description: '',
        start: defaultStartDate,
        end: addDays(defaultStartDate, defaultDuration - 1),
        color: defaultColor,
      });
      setDuration(defaultDuration);
    }
  }, [selectedCategory, form]);

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

  const onSubmit = (data: CategoryFormValues) => {
    const categoryData = {
      ...data,
      dependencies: [],
      isExpanded: selectedCategory?.isExpanded ?? true,
    };
    if (selectedCategory) {
      onUpdateCategory({ ...categoryData, id: selectedCategory.id, type: 'category' });
    } else {
      onAddCategory(categoryData);
    }
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
                <FormLabel>Category Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Planning Phase" {...field} />
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
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Color</FormLabel>
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
        </div>

        <div className="flex justify-between items-center pt-4 border-t mt-auto">
          <Button type="submit">
            {selectedCategory ? 'Save Changes' : 'Add Category'}
          </Button>
          {selectedCategory && (
             <Button type="button" variant="destructive" size="icon" onClick={() => onDeleteCategory(selectedCategory.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
