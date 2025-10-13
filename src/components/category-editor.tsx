
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
import { cn } from '@/lib/utils';
import type { Task } from '@/types';
import { useEffect } from 'react';
import { DialogBody, DialogFooter } from './ui/dialog';

const categorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters.'),
  color: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

type CategoryEditorProps = {
  selectedCategory: Task | null;
  onAddCategory: (category: Pick<Task, 'name' | 'color' | 'dependencies'>) => void;
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
      color: defaultColor,
    },
  });

  useEffect(() => {
    if (selectedCategory) {
      form.reset({
        name: selectedCategory.name,
        color: selectedCategory.color || defaultColor,
      });
    } else {
      form.reset({
        name: '',
        color: defaultColor,
      });
    }
  }, [selectedCategory, form]);


  const onSubmit = (data: CategoryFormValues) => {
    if (selectedCategory) {
        const updatedCategory: Task = {
            ...selectedCategory,
            ...data,
        };
        onUpdateCategory(updatedCategory);
    } else {
        const categoryData = {
            ...data,
            dependencies: [],
            isExpanded: true,
        };
        onAddCategory(categoryData);
    }
  };

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
        </DialogBody>

        <DialogFooter>
          <div className="flex justify-between items-center w-full">
            <Button type="submit">
                {selectedCategory ? 'Save Changes' : 'Add Category'}
            </Button>
            {selectedCategory && (
                <Button type="button" variant="destructive" size="icon" onClick={() => onDeleteCategory(selectedCategory.id)}>
                <Trash2 className="h-4 w-4" />
                </Button>
            )}
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
}
