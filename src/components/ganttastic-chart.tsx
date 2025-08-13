
'use client';

import { useMemo, useState } from 'react';
import type { Task, Milestone } from '@/types';
import { addDays, differenceInDays, format, startOfDay, differenceInBusinessDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import MilestoneEditor from './milestone-editor';
import { Separator } from './ui/separator';


type GanttasticChartProps = {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTaskClick: () => void;
  projectName: string;
};

type ViewMode = 'day' | 'week' | 'month';

const ROW_HEIGHT = 40; // height of a task row in pixels
const BAR_HEIGHT = 32; // height of a task bar
const BAR_TOP_MARGIN = (ROW_HEIGHT - BAR_HEIGHT) / 2;
const HEADER_HEIGHT = 48;

export default function GanttasticChart({ tasks, onTaskClick, onAddTaskClick, projectName }: GanttasticChartProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const { dayWidth, projectStart, projectEnd, totalDays, timeline, taskPositions, getHeaderGroups } = useMemo(() => {
    const today = startOfDay(new Date());
    let projectStart: Date;
    let projectEnd: Date;
    let dayWidth: number;

    if (tasks.length === 0) {
      projectStart = startOfWeek(startOfMonth(today));
      projectEnd = endOfWeek(endOfMonth(today));
    } else {
      const startDates = tasks.map(t => startOfDay(t.start));
      const endDates = tasks.map(t => startOfDay(t.end));
      projectStart = new Date(Math.min(...startDates.map(d => d.getTime())));
      projectEnd = new Date(Math.max(...endDates.map(d => d.getTime())));
    }

    // Add padding around the project dates
    projectStart = addDays(projectStart, -14);
    projectEnd = addDays(projectEnd, 14);

    switch(viewMode) {
      case 'week':
        dayWidth = 20;
        break;
      case 'month':
        dayWidth = 40;
        break;
      case 'day':
      default:
        dayWidth = 60;
        break;
    }

    const timeline = eachDayOfInterval({ start: projectStart, end: projectEnd });
    const totalDays = timeline.length;

    const taskPositions = new Map<string, { x: number; y: number; width: number }>();
    tasks.forEach((task, index) => {
        const offset = differenceInDays(startOfDay(task.start), projectStart);
        const duration = differenceInDays(startOfDay(task.end), startOfDay(task.start)) + 1;
        
        taskPositions.set(task.id, {
            x: offset * dayWidth,
            y: index * ROW_HEIGHT,
            width: duration * dayWidth,
        });
    });

    const getHeaderGroups = () => {
        if (viewMode === 'day') {
            return [{ label: '', days: totalDays }]; // No grouping for day view
        }
        const groups: { label: string, days: number }[] = [];
        let currentMonth = -1;
        let currentWeek = -1;

        timeline.forEach(day => {
            if (viewMode === 'month') {
                if (day.getMonth() !== currentMonth) {
                    currentMonth = day.getMonth();
                    const monthStart = startOfMonth(day);
                    const monthEnd = endOfMonth(day);
                    const daysInMonth = differenceInDays(monthEnd, day < monthStart ? monthStart : day) + 1;
                    groups.push({ label: format(day, 'MMMM yyyy'), days: daysInMonth });
                }
            } else if (viewMode === 'week') {
                 if (startOfWeek(day).getTime() !== currentWeek) {
                    currentWeek = startOfWeek(day).getTime();
                    const weekEnd = endOfWeek(day);
                    const daysInWeek = differenceInDays(weekEnd, day) + 1;
                    groups.push({ label: `Week of ${format(day, 'MMM d')}`, days: Math.min(daysInWeek, 7) });
                 }
            }
        });

        // Adjust last group to not overflow
        if (groups.length > 0) {
            const totalGroupedDays = groups.reduce((acc, g) => acc + g.days, 0);
            if (totalGroupedDays > totalDays) {
                groups[groups.length - 1].days -= (totalGroupedDays - totalDays);
            }
        }

        return groups;
    }


    return { dayWidth, projectStart, projectEnd, totalDays, timeline, taskPositions, getHeaderGroups };
  }, [tasks, viewMode]);

  const headerGroups = getHeaderGroups();

  return (
    <Card className="w-full h-full overflow-hidden flex flex-col shadow-lg border-2">
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <CardTitle>{projectName}</CardTitle>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit Milestones</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <MilestoneEditor milestones={milestones} setMilestones={setMilestones} />
            </DialogContent>
          </Dialog>
        </div>
        <div className="flex items-center gap-2">
            <Button variant={viewMode === 'day' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('day')}>Day</Button>
            <Button variant={viewMode === 'week' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('week')}>Week</Button>
            <Button variant={viewMode === 'month' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('month')}>Month</Button>
            
            <Separator orientation="vertical" className="h-6" />

            <Button size="sm" onClick={onAddTaskClick}>
                <Plus />
                Add Task
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex overflow-hidden">
        <div className="grid grid-cols-12 w-full h-full">
          {/* Task List */}
          <div className="col-span-3 border-r pr-2 overflow-y-auto">
            <div style={{ height: `${HEADER_HEIGHT}px`}} className="sticky top-0 bg-card z-10 py-2 font-semibold text-sm flex items-end pb-3">Task Name</div>
            <div style={{ height: `${tasks.length * ROW_HEIGHT}px`}} className='relative'>
              {tasks.map((task, index) => (
                <div key={task.id} style={{top: `${index * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px`}} className="absolute w-full text-sm p-2 rounded-md hover:bg-secondary transition-colors truncate cursor-pointer flex items-center" onClick={() => onTaskClick(task)}>
                  {task.name}
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Timeline */}
          <div className="col-span-9 overflow-auto">
             <div className="relative">
              <div style={{ width: `${totalDays * dayWidth}px`, minHeight: `${HEADER_HEIGHT}px` }} className="sticky top-0 bg-card z-20">
                 {viewMode !== 'day' && (
                    <div className="flex">
                        {headerGroups.map((group, index) => (
                            <div key={index} className="text-center font-semibold text-sm py-1 border-b border-r" style={{ width: `${group.days * dayWidth}px`}}>
                                {group.label}
                            </div>
                        ))}
                    </div>
                 )}
                <div className="grid" style={{ gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}>
                    {timeline.map(day => (
                      <div key={day.toString()} className="text-center text-xs py-1 border-r border-b">
                        <div>{format(day, viewMode === 'month' ? 'dd' : 'd')}</div>
                        <div className="text-muted-foreground">{format(day, 'E')}</div>
                      </div>
                    ))}
                </div>
              </div>

              <div style={{ width: `${totalDays * dayWidth}px`, height: `${tasks.length * ROW_HEIGHT}px` }} className="relative">
                {/* Grid Background */}
                <div className="absolute top-0 left-0 w-full h-full grid" style={{ gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}>
                  {timeline.map((day, i) => (
                     <div key={`bg-${i}`} className="border-r h-full"></div>
                  ))}
                </div>
                <div className="absolute top-0 left-0 w-full h-full">
                   {tasks.map((_task, i) => (
                    <div key={`row-bg-${i}`} className="border-b" style={{ height: `${ROW_HEIGHT}px` }}></div>
                  ))}
                </div>
                
                {/* Dependency Lines */}
                <svg className="absolute top-0 left-0 w-full h-full z-10 pointer-events-none">
                  <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--accent))" />
                    </marker>
                  </defs>
                  {tasks.map(task => {
                    const toPos = taskPositions.get(task.id);
                    if (!toPos) return null;

                    return task.dependencies.map(depId => {
                      const fromPos = taskPositions.get(depId);
                      if (!fromPos) return null;

                      const fromX = fromPos.x + fromPos.width;
                      const fromY = fromPos.y + BAR_TOP_MARGIN + BAR_HEIGHT / 2;
                      const toX = toPos.x;
                      const toY = toPos.y + BAR_TOP_MARGIN + BAR_HEIGHT / 2;

                      const isOffscreen = fromX < 0 || toX < 0;
                      if(isOffscreen) return null;

                      // Simple straight line for now
                      if (fromX < toX - 10) {
                        return (
                           <path
                            key={`${depId}-${task.id}`}
                            d={`M ${fromX} ${fromY} C ${fromX + 20} ${fromY}, ${toX - 20} ${toY}, ${toX - 8} ${toY}`}
                            stroke="hsl(var(--accent))"
                            strokeWidth="2"
                            fill="none"
                            markerEnd="url(#arrow)"
                          />
                        )
                      }
                      
                      // Elbow connection
                       return (
                          <path
                            key={`${depId}-${task.id}`}
                            d={`M ${fromX} ${fromY} H ${fromX + 10} V ${(toY + fromY)/2} H ${toX - 10} V ${toY} H ${toX - 8}`}
                            stroke="hsl(var(--accent))"
                            strokeWidth="2"
                            fill="none"
                            markerEnd="url(#arrow)"
                          />
                        );
                    })
                  })}
                </svg>

                {/* Task Bars */}
                {tasks.map((task, index) => {
                  const pos = taskPositions.get(task.id);
                  if(!pos) return null;
                  const duration = differenceInBusinessDays(task.end, task.start);


                  return (
                      <TooltipProvider key={task.id} delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              onClick={() => onTaskClick(task)}
                              className="absolute h-8 rounded-md bg-primary/80 hover:bg-primary transition-all duration-200 cursor-pointer flex items-center px-2 overflow-hidden shadow z-20"
                              style={{
                                top: `${pos.y + BAR_TOP_MARGIN}px`,
                                left: `${pos.x + 2}px`,
                                width: `${pos.width - 4}px`,
                                height: `${BAR_HEIGHT}px`
                              }}
                            >
                              <div className="absolute top-0 left-0 h-full bg-primary rounded-md" style={{ width: `${task.progress}%` }}></div>
                              <span className="relative text-primary-foreground text-xs font-medium truncate z-10">{task.name}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-card border-primary">
                            <p className="font-bold">{task.name}</p>
                            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                            <p>Start: {format(task.start, 'MMM d, yyyy')}</p>
                            <p>End: {format(task.end, 'MMM d, yyyy')}</p>
                            <p>Duration: {duration} day{duration === 1 ? '' : 's'}</p>
                            <p>Progress: {task.progress}%</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
