
'use client';

import type { TeamMember, Task } from '@/types';
import { DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type TeamMemberTasksDialogProps = {
  member: TeamMember;
  tasks: Task[];
};

export default function TeamMemberTasksDialog({ member, tasks }: TeamMemberTasksDialogProps) {

  const getPriorityBadgeVariant = (priority: Task['priority']) => {
    switch (priority) {
        case 'high': return 'destructive';
        case 'medium': return 'secondary';
        case 'low': return 'outline';
        default: return 'secondary';
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{member.name}'s Tasks</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Task</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length > 0 ? tasks.map(task => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.name}</TableCell>
                  <TableCell>{task.end ? format(task.end, 'MMM d, yyyy') : '-'}</TableCell>
                  <TableCell>
                      <Badge variant={getPriorityBadgeVariant(task.priority)} className="capitalize">{task.priority || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>
                      <div className="flex items-center gap-2">
                          <Progress value={task.progress || 0} className="w-[60%]" />
                          <span className="text-sm text-muted-foreground">{task.progress || 0}%</span>
                      </div>
                  </TableCell>
                </TableRow>
              )) : (
                  <TableRow>
                      <TableCell colSpan={4} className="text-center">No tasks assigned to this member.</TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogBody>
    </>
  );
}
