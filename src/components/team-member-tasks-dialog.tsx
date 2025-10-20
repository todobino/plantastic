
'use client';

import type { TeamMember, Task } from '@/types';
import { Button } from './ui/button';
import { DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trash2, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

type TeamMemberTasksDialogProps = {
  member: TeamMember;
  tasks: Task[];
  allTasks: Task[];
  onDelete: (e: React.MouseEvent) => void;
  teamMembers: TeamMember[];
  onTaskUpdate: (task: Task) => void;
};

export default function TeamMemberTasksDialog({ member, tasks, allTasks, onDelete, teamMembers, onTaskUpdate }: TeamMemberTasksDialogProps) {

  const getPriorityBadgeVariant = (priority: Task['priority']) => {
    switch (priority) {
        case 'high': return 'destructive';
        case 'medium': return 'secondary';
        case 'low': return 'outline';
        default: return 'secondary';
    }
  }

  const handleReassign = (task: Task, newAssigneeId: string) => {
    onTaskUpdate({ ...task, assigneeId: newAssigneeId });
  };
  
  const sortedTeamMembers = [...teamMembers].sort((a, b) => a.name.localeCompare(b.name));
  
  const getCategoryForTask = (task: Task) => {
    if (!task.parentId) return null;
    return allTasks.find(t => t.id === task.parentId && t.type === 'category');
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{member.name}'s Tasks</CardTitle>
        <Button variant="destructive" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%] border-r">Task</TableHead>
                <TableHead className="border-r">Due Date</TableHead>
                <TableHead className="border-r">Priority</TableHead>
                <TableHead>Reassign</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length > 0 ? tasks.map(task => {
                const category = getCategoryForTask(task);
                return (
                    <TableRow key={task.id}>
                        <TableCell className="font-medium border-r align-top">
                            <div className="flex flex-col gap-1">
                                {category && (
                                    <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                                        <div className="h-2.5 w-2.5 rounded-full" style={{backgroundColor: category.color}} />
                                        {category.name}
                                    </div>
                                )}
                                <span>{task.name}</span>
                            </div>
                        </TableCell>
                        <TableCell className="border-r">{task.end ? format(task.end, 'MMM d, yyyy') : '-'}</TableCell>
                        <TableCell className="border-r">
                            <Badge variant={getPriorityBadgeVariant(task.priority)} className="capitalize">{task.priority || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button variant="outline" className="w-[150px] justify-between">
                                        Reassign
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[200px] p-0">
                                    <div className="flex flex-col">
                                        {sortedTeamMembers.map(tm => (
                                            <Button
                                                key={tm.id}
                                                variant="ghost"
                                                className="justify-start"
                                                onClick={() => handleReassign(task, tm.id)}
                                                disabled={tm.id === member.id}
                                            >
                                                {tm.name}
                                            </Button>
                                        ))}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </TableCell>
                    </TableRow>
                )
              }) : (
                  <TableRow>
                      <TableCell colSpan={4} className="text-center">No tasks assigned to this member.</TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
