
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type QuickTaskFormProps = {
  categoryId: string;
  onAddTask: (categoryId: string, taskName: string, duration: number) => void;
  onClose: () => void;
};

export default function QuickTaskForm({ categoryId, onAddTask, onClose }: QuickTaskFormProps) {
  const [taskName, setTaskName] = useState('');
  const [duration, setDuration] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskName.trim() && duration > 0) {
      onAddTask(categoryId, taskName, duration);
      setTaskName('');
      setDuration(1);
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="quick-task-name" className="text-xs">Task Name</Label>
        <Input
          id="quick-task-name"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          placeholder="New task..."
          autoFocus
          className="h-8"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="quick-task-duration" className="text-xs">Duration (days)</Label>
        <Input
          id="quick-task-duration"
          type="number"
          value={duration}
          onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
          min="1"
          className="h-8"
        />
      </div>
      <Button type="submit" size="sm" className="w-full">Add Task</Button>
    </form>
  );
}
