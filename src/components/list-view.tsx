
'use client';

import type { Task } from '@/types';
import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

type ListViewProps = {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
};

type ListedTask = Task & {
  category?: Task;
};

export function ListView({ tasks, onTaskClick }: ListViewProps) {
  const listedTasks = useMemo(() => {
    const categories = new Map(tasks.filter(t => t.type === 'category').map(c => [c.id, c]));
    const justTasks = tasks
        .filter(t => t.type === 'task')
        .sort((a,b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0));

    return justTasks.map(task => ({
        ...task,
        category: task.parentId ? categories.get(task.parentId) : undefined
    }));
  }, [tasks]);

  const getTaskById = (id: string) => tasks.find(t => t.id === id);

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px] border-r">#</TableHead>
            <TableHead className="w-[40%] border-r">Task Name</TableHead>
            <TableHead className="border-r">Category</TableHead>
            <TableHead className="border-r">Start Date</TableHead>
            <TableHead className="border-r">End Date</TableHead>
            <TableHead className="border-r">Duration</TableHead>
            <TableHead>Dependencies</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listedTasks.map((task, index) => (
            <TableRow key={task.id} onClick={() => onTaskClick(task)} className="cursor-pointer">
              <TableCell className="border-r">{index + 1}</TableCell>
              <TableCell className="font-medium border-r">
                <div className="flex items-center gap-2">
                  <span>{task.name}</span>
                </div>
              </TableCell>
              <TableCell className="border-r">
                {task.category && (
                    <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: task.category.color}} />
                        {task.category.name}
                    </div>
                )}
              </TableCell>
              <TableCell className="border-r">{task.start ? format(task.start, 'MMM d, yyyy') : '-'}</TableCell>
              <TableCell className="border-r">{task.end ? format(task.end, 'MMM d, yyyy') : '-'}</TableCell>
              <TableCell className="border-r">
                {task.start && task.end 
                  ? `${differenceInDays(task.end, task.start) + 1} day(s)`
                  : '-'
                }
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {task.dependencies.map(depId => {
                    const depTask = getTaskById(depId);
                    return depTask ? (
                      <Badge key={depId} variant="secondary" className="font-normal">
                        {depTask.name}
                      </Badge>
                    ) : null;
                  })}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

    
