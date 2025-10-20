
'use client';

import type { Task, TeamMember } from '@/types';
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
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { UserCircle } from 'lucide-react';

type ListViewProps = {
  tasks: Task[];
  teamMembers: TeamMember[];
  onTaskClick: (task: Task) => void;
  onAssigneeClick: (member: TeamMember) => void;
};

type ListedTask = Task & {
  category?: Task;
  assignee?: TeamMember;
};

export function ListView({ tasks, teamMembers, onTaskClick, onAssigneeClick }: ListViewProps) {
  const listedTasks = useMemo(() => {
    const categories = new Map(tasks.filter(t => t.type === 'category').map(c => [c.id, c]));
    const members = new Map(teamMembers.map(m => [m.id, m]));
    const justTasks = tasks
        .filter(t => t.type === 'task')
        .sort((a,b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0));

    return justTasks.map(task => ({
        ...task,
        category: task.parentId ? categories.get(task.parentId) : undefined,
        assignee: task.assigneeId ? members.get(task.assigneeId) : undefined,
    }));
  }, [tasks, teamMembers]);

  const getTaskById = (id: string) => tasks.find(t => t.id === id);

  const getAssigneeInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead className="w-[50px] border-r">#</TableHead>
            <TableHead className="w-[40%] border-r">Task Name</TableHead>
            <TableHead className="border-r">Start Date</TableHead>
            <TableHead className="border-r">End Date</TableHead>
            <TableHead className="border-r">Duration</TableHead>
            <TableHead className="border-r">Assignee</TableHead>
            <TableHead>Dependencies</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listedTasks.map((task, index) => (
            <TableRow key={task.id} >
              <TableCell className="border-r" onClick={() => onTaskClick(task)}>{index + 1}</TableCell>
              <TableCell className="font-medium border-r align-top" onClick={() => onTaskClick(task)}>
                <div className="flex flex-col gap-1">
                  {task.category && (
                      <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                          <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: task.category.color}} />
                          {task.category.name}
                      </div>
                  )}
                  <span>{task.name}</span>
                  {task.description && (
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {task.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="border-r" onClick={() => onTaskClick(task)}>{task.start ? format(task.start, 'MMM d, yyyy') : '-'}</TableCell>
              <TableCell className="border-r" onClick={() => onTaskClick(task)}>{task.end ? format(task.end, 'MMM d, yyyy') : '-'}</TableCell>
              <TableCell className="border-r" onClick={() => onTaskClick(task)}>
                {task.start && task.end 
                  ? `${differenceInDays(task.end, task.start) + 1} day(s)`
                  : '-'
                }
              </TableCell>
              <TableCell 
                className="border-r cursor-pointer" 
                onClick={() => task.assignee && onAssigneeClick(task.assignee)}
              >
                  {task.assignee ? (
                    <span className="text-sm">{task.assignee.name}</span>
                  ) : <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell onClick={() => onTaskClick(task)}>
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

    
