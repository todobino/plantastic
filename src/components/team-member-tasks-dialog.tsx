
'use client';

import type { TeamMember, Task } from '@/types';
import { Button } from './ui/button';
import { DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Trash2 } from 'lucide-react';

type TeamMemberTasksDialogProps = {
  member: TeamMember;
  tasks: Task[];
  onDelete: (e: React.MouseEvent) => void;
};

export default function TeamMemberTasksDialog({ member, tasks, onDelete }: TeamMemberTasksDialogProps) {

  const getPriorityBadgeVariant = (priority: Task['priority']) => {
    switch (priority) {
        case 'high': return 'destructive';
        case 'medium': return 'secondary';
        case 'low': return 'outline';
        default: return 'secondary';
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{member.name}'s Tasks</CardTitle>
        <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Member
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%] border-r">Task</TableHead>
                <TableHead className="border-r">Due Date</TableHead>
                <TableHead className="border-r">Priority</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.length > 0 ? tasks.map(task => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium border-r">{task.name}</TableCell>
                  <TableCell className="border-r">{task.end ? format(task.end, 'MMM d, yyyy') : '-'}</TableCell>
                  <TableCell className="border-r">
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
      </CardContent>
    </Card>
  );
}
