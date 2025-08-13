
'use client';

import { useEffect } from 'react';
import type { Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Textarea } from './ui/textarea';

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required.'),
  description: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

type ProjectEditorProps = {
  project: Project;
  onProjectUpdate: (project: Project) => void;
};

export default function ProjectEditor({ project, onProjectUpdate }: ProjectEditorProps) {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project.name,
      description: project.description || '',
    },
  });
  
  useEffect(() => {
    form.reset({
        name: project.name,
        description: project.description || '',
    });
  }, [project, form]);


  const handleSubmit = (data: ProjectFormValues) => {
    onProjectUpdate({
      ...project,
      ...data,
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Project</DialogTitle>
        <DialogDescription>
          Update the details of your project.
        </DialogDescription>
      </DialogHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
           <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Q3 Marketing Campaign" {...field} />
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
                    <Textarea placeholder="A brief description of the project." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          <DialogFooter>
            <DialogClose asChild>
                <Button type="submit">Save Changes</Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
