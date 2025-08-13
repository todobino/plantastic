
'use client';

import { useMemo, useState, DragEvent, useRef, useCallback } from 'react';
import type { Task, Milestone, Project } from '@/types';
import { addDays, differenceInDays, format, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import ProjectEditor from './project-editor';
import { Separator } from './ui/separator';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';


type GanttasticChartProps = {
  tasks: Task[];
  project: Project;
  onTaskClick: (task: Task) => void;
  onAddTaskClick: () => void;
  onProjectUpdate: (project: Project) => void;
  onReorderTasks: (reorderedTasks: Task[]) => void;
  onTaskUpdate: (task: Task) => void;
};

type ViewMode = 'day' | 'week' | 'month';

const ROW_HEIGHT = 40; // height of a task row in pixels
const BAR_HEIGHT = 32; // height of a task bar
const BAR_TOP_MARGIN = (ROW_HEIGHT - BAR_HEIGHT) / 2;
const HEADER_HEIGHT = 48;

export default function GanttasticChart({ tasks, project, onTaskClick, onAddTaskClick, onProjectUpdate, onReorderTasks, onTaskUpdate }: GanttasticChartProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const wasDraggedRef = useRef(false);

  const [dragState, setDragState] = useState<{
    id: string | null;
    startX: number;
    startLeftPx: number;
    previewDeltaPx: number;
  }>({ id: null, startX: 0, startLeftPx: 0, previewDeltaPx: 0 });

  const dragging = dragState.id !== null;

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

  const pxPerDay = dayWidth;

  const dateToX = (d: Date) => differenceInDays(startOfDay(d), startOfDay(projectStart)) * pxPerDay;
  const xToDayDelta = (xPx: number) => Math.round(xPx / pxPerDay);

  const taskDurationDays = (t: Task) =>
    Math.max(1, differenceInDays(startOfDay(t.end), startOfDay(t.start)) + 1);

  // Build reverse deps once
  const successorsById = useMemo(() => {
    const m = new Map<string, string[]>();
    tasks.forEach(t => {
      t.dependencies.forEach(dep => {
        if (!m.has(dep)) m.set(dep, []);
        m.get(dep)!.push(t.id);
      });
    });
    return m;
  }, [tasks]);

  // Compute draggable bounds for a task (in dates)
  const getTaskBounds = useCallback((task: Task) => {
    const preds = task.dependencies
      .map(id => tasks.find(t => t.id === id))
      .filter(Boolean) as Task[];
    const succs = (successorsById.get(task.id) || [])
      .map(id => tasks.find(t => t.id === id))
      .filter(Boolean) as Task[];

    const leftBoundStartDate = preds.length
      ? addDays(startOfDay(new Date(Math.max(...preds.map(p => startOfDay(p.end).getTime())))), 1)
      : startOfDay(projectStart);

    const rightLimitStartDate = succs.length
      ? addDays(
          startOfDay(new Date(Math.min(...succs.map(s => startOfDay(s.start).getTime())))),
          -taskDurationDays(task)
        )
      : startOfDay(projectEnd); // can slide to the padding

    return {
      minStart: leftBoundStartDate,
      maxStart: rightLimitStartDate,
    };
  }, [tasks, projectStart, projectEnd, successorsById, taskDurationDays]);
    
  const onBarPointerDown = (e: React.PointerEvent<HTMLDivElement>, task: Task, currentLeftPx: number) => {
    wasDraggedRef.current = false;
    (e.target as Element).setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    setDragState({ id: task.id, startX: e.clientX, startLeftPx: currentLeftPx, previewDeltaPx: 0 });
  };
  
  const onBarPointerMove = (e: React.PointerEvent<HTMLDivElement>, task: Task) => {
    if (dragState.id !== task.id) return;
  
    // delta in pixels
    const rawDeltaPx = e.clientX - dragState.startX;
    
    if (Math.abs(rawDeltaPx) > 2) { // Threshold to consider it a drag
        wasDraggedRef.current = true;
    }
  
    // compute pixel bounds from date bounds
    const { minStart, maxStart } = getTaskBounds(task);
  
    const minLeftPx = dateToX(minStart);
    const maxLeftPx = dateToX(maxStart);

    let nextLeftPx = dragState.startLeftPx + rawDeltaPx;

    if (maxStart < minStart) {
       nextLeftPx = dragState.startLeftPx;
    } else {
       nextLeftPx = Math.max(minLeftPx, Math.min(maxLeftPx, nextLeftPx));
    }
  
    // snap to day grid in preview
    const snapDeltaPx = xToDayDelta(nextLeftPx - dragState.startLeftPx) * pxPerDay;
  
    // auto-scroll when near edges
    const scroller = timelineRef.current; 
    if (scroller) {
      const margin = 40;
      if (e.clientX > scroller.getBoundingClientRect().right - margin) scroller.scrollLeft += pxPerDay;
      else if (e.clientX < scroller.getBoundingClientRect().left + margin) scroller.scrollLeft -= pxPerDay;
    }
  
    setDragState(s => ({ ...s, previewDeltaPx: snapDeltaPx }));
  };
  
  const onBarPointerUp = (e: React.PointerEvent<HTMLDivElement>, task: Task) => {
    if (dragState.id !== task.id) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    document.body.style.userSelect = '';
  
    const dayDelta = xToDayDelta(dragState.previewDeltaPx);
  
    if (dayDelta !== 0) {
      const dur = taskDurationDays(task);
      const newStart = startOfDay(addDays(task.start, dayDelta));
      const newEnd = startOfDay(addDays(newStart, dur - 1));
      onTaskUpdate({ ...task, start: newStart, end: newEnd });
    }
  
    setDragState({ id: null, startX: 0, startLeftPx: 0, previewDeltaPx: 0 });
    
    // Use a timeout to reset the dragged flag, so the click event has time to fire (or not)
    setTimeout(() => {
        wasDraggedRef.current = false;
    }, 0);
  };
  
  const handleBarClick = (task: Task) => {
    if (!wasDraggedRef.current) {
        onTaskClick(task);
    }
  }


  return (
    <Card className="w-full h-full overflow-hidden flex flex-col shadow-lg border-2">
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <div>
             <div className="flex items-center gap-2 group">
              <CardTitle className="group-hover:underline">{project.name}</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit Project</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <ProjectEditor project={project} onProjectUpdate={onProjectUpdate} />
                </DialogContent>
              </Dialog>
            </div>
            {tasks.length === 0 ? (
                <CardDescription>No Start, No End</CardDescription>
            ) : (
                <CardDescription>{format(projectStart, "MMM d, yyyy")} - {format(projectEnd, "MMM d, yyyy")}</CardDescription>
            )}
          </div>
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
            <div style={{ height: `${HEADER_HEIGHT}px`}} className="sticky top-0 bg-card z-10 py-2 font-semibold text-sm flex items-center justify-between pb-3">
              <span>Tasks &amp; Milestones</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Plus className="h-4 w-4" />
                      <span className="sr-only">Add</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onAddTaskClick}>New Task</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => alert('Milestone functionality coming soon!')}>
                      New Milestone
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div style={{ height: `${tasks.length * ROW_HEIGHT}px`}} className='relative'>
              {tasks.map((task, index) => (
                <div 
                  key={task.id} 
                  style={{top: `${index * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px`}} 
                  className="group absolute w-full text-sm p-2 rounded-md hover:bg-secondary flex items-center gap-2 cursor-pointer"
                  onClick={() => onTaskClick(task)}
                >
                  <span className="truncate flex-1">{task.name}</span>
                  <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Timeline */}
          <div ref={timelineRef} className="col-span-9 overflow-auto">
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
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
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
                            stroke="hsl(var(--primary))"
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
                            stroke="hsl(var(--primary))"
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
                  const duration = differenceInDays(task.end, task.start) + 1;
                  
                  const isDragging = dragState.id === task.id;

                  return (
                      <TooltipProvider key={task.id} delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                               onPointerDown={(e) => onBarPointerDown(e, task, pos.x + 2)}
                               onPointerMove={(e) => onBarPointerMove(e, task)}
                               onPointerUp={(e) => onBarPointerUp(e, task)}
                               onPointerCancel={(e) => onBarPointerUp(e, task)}
                               onClick={() => handleBarClick(task)}
                               className={cn(
                                "absolute rounded-md bg-primary/80 hover:bg-primary transition-[background-color] cursor-grab active:cursor-grabbing flex items-center px-2 overflow-hidden shadow z-20",
                                isDragging && "opacity-90"
                               )}
                               style={{
                                top: `${pos.y + BAR_TOP_MARGIN}px`,
                                left: `${pos.x + 2}px`,
                                width: `${pos.width - 4}px`,
                                height: `${BAR_HEIGHT}px`,
                                transform: `translateX(${isDragging ? dragState.previewDeltaPx : 0}px)`,
                                willChange: "transform",
                               }}
                            >
                              <div className="absolute top-0 left-0 h-full bg-primary/60 rounded-md" style={{ width: `${task.progress}%` }}></div>
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
