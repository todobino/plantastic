
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
import { Folder, GanttChartSquare } from 'lucide-react';


type GanttasticListViewProps = {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
};

type HierarchicalTask = Task & {
  level: number;
  hierarchicalId: string;
};

export function GanttasticListView({ tasks, onTaskClick }: GanttasticListViewProps) {
  const hierarchicalTasks = useMemo(() => {
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const taskToChildren = new Map<string, Task[]>();
    
    tasks.forEach(task => {
        if (task.parentId) {
            if (!taskToChildren.has(task.parentId)) {
                taskToChildren.set(task.parentId, []);
            }
            taskToChildren.get(task.parentId)!.push(task);
        }
    });

    const topLevelCategories = tasks.filter(t => t.type === 'category' && (!t.parentId || !taskMap.has(t.parentId)))
        .sort((a,b) => a.name.localeCompare(b.name));

    const flatList: HierarchicalTask[] = [];

    topLevelCategories.forEach((category, catIndex) => {
        const categoryId = `${catIndex + 1}`;
        flatList.push({ ...category, level: 0, hierarchicalId: categoryId });

        const children = taskToChildren.get(category.id) || [];
        children.forEach((task, taskIndex) => {
            const taskId = `${categoryId}.${taskIndex + 1}`;
            flatList.push({ ...task, level: 1, hierarchicalId: taskId });
        });
    });

    return flatList;
  }, [tasks]);

  const getTaskById = (id: string) => tasks.find(t => t.id === id);

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">ID#</TableHead>
            <TableHead className="w-[40%]">Task Name</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Dependencies</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hierarchicalTasks.map(task => (
            <TableRow key={task.id} onClick={() => onTaskClick(task)} className={cn("cursor-pointer", task.type === 'category' && 'bg-muted/50 hover:bg-muted/80')}>
              <TableCell className={cn(task.type === 'category' && 'font-bold')}>{task.hierarchicalId}</TableCell>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2" style={{ paddingLeft: `${task.level * 1.5}rem`}}>
                 {task.type === 'category' ? <Folder className="h-4 w-4 text-primary" /> : <GanttChartSquare className="h-4 w-4" style={{ color: task.color || 'hsl(var(--primary))' }} />}
                  <span>{task.name}</span>
                </div>
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
