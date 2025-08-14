
'use client';

import type { Task } from '@/types';
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

type GanttasticListViewProps = {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
};

export function GanttasticListView({ tasks, onTaskClick }: GanttasticListViewProps) {
  const getTaskById = (id: string) => tasks.find(t => t.id === id);

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Task Name</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Dependencies</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => (
            <TableRow key={task.id} onClick={() => onTaskClick(task)} className="cursor-pointer">
              <TableCell className="font-medium flex items-center gap-2">
                <span 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: task.color || 'hsl(var(--primary))' }}
                />
                {task.name}
              </TableCell>
              <TableCell>{format(task.start, 'MMM d, yyyy')}</TableCell>
              <TableCell>{format(task.end, 'MMM d, yyyy')}</TableCell>
              <TableCell>{differenceInDays(task.end, task.start) + 1} days</TableCell>
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
