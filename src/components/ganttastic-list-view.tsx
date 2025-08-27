
'use client';

import type { Task } from '@/types';
import { useMemo, useCallback } from 'react';
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

    const topLevelTasks = tasks.filter(t => !t.parentId || !taskMap.has(t.parentId))
        .sort((a,b) => {
            if(a.type === 'category' && b.type !== 'category') return -1;
            if(a.type !== 'category' && b.type === 'category') return 1;
            const startTimeA = a.start ? a.start.getTime() : 0;
            const startTimeB = b.start ? b.start.getTime() : 0;
            return startTimeA - startTimeB;
        });

    const flatList: HierarchicalTask[] = [];

    const buildHierarchy = (task: Task, level: number, prefix: string) => {
        const id = `${prefix}${flatList.filter(t => t.level === level && t.hierarchicalId.startsWith(prefix.slice(0, -1))).length + 1}`;
        flatList.push({ ...task, level, hierarchicalId: id });
        
        const children = (taskToChildren.get(task.id) || []).sort((a,b) => {
            const startTimeA = a.start ? a.start.getTime() : 0;
            const startTimeB = b.start ? b.start.getTime() : 0;
            return startTimeA - startTimeB;
        });
        children.forEach((child) => {
            buildHierarchy(child, level + 1, `${id}.`);
        });
    };
    
    topLevelTasks.forEach((task) => {
        buildHierarchy(task, 0, '');
    });


    return flatList;
  }, [tasks]);

  const getTaskById = (id: string) => tasks.find(t => t.id === id);

  const getTaskColor = useCallback((task: Task) => {
    if (task.type === 'category') {
        return task.color;
    }
    if (task.parentId) {
        const parent = tasks.find(t => t.id === task.parentId);
        return parent?.color || 'hsl(var(--primary))';
    }
    return 'hsl(var(--primary))';
  }, [tasks]);


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
                 {task.type === 'category' ? <Folder className="h-4 w-4 text-primary" /> : <GanttChartSquare className="h-4 w-4" style={{ color: getTaskColor(task) || 'hsl(var(--primary))' }} />}
                  <span>{task.name}</span>
                </div>
              </TableCell>
              <TableCell>{task.start ? format(task.start, 'MMM d, yyyy') : '-'}</TableCell>
              <TableCell>{task.end ? format(task.end, 'MMM d, yyyy') : '-'}</TableCell>
              <TableCell>
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
