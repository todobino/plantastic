
'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
import type { Task, Milestone, Project } from '@/types';
import { addDays, differenceInDays, format, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addWeeks, subWeeks } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import ProjectEditor from './project-editor';
import { Separator } from './ui/separator';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';

// ---- Business-day helpers ----
const isWeekend = (d: Date) => {
  const day = d.getDay(); // 0 Sun .. 6 Sat
  return day === 0 || day === 6;
};

const nextBusinessDay = (d: Date) => {
  let x = startOfDay(d);
  while (isWeekend(x)) x = addDays(x, 1);
  return x;
};

// Inclusive business days between two dates (assumes start<=end)
const businessDaysInclusive = (start: Date, end: Date) => {
  let s = startOfDay(start);
  let e = startOfDay(end);
  if (e < s) return 0;
  let count = 0;
  for (let d = s; d <= e; d = addDays(d, 1)) if (!isWeekend(d)) count++;
  return count;
};

// Add N business days (n>=0). If n=0 returns the same day.
const addBusinessDaysIncl = (start: Date, n: number) => {
  let d = startOfDay(start);
  // Adjust for starting on a non-business day if needed, though normalize should handle this.
  let current = d;
  if(n <= 0) return current;

  let remaining = n;
  while(remaining > 0) {
      current = addDays(current, 1);
      if (!isWeekend(current)) {
          remaining--;
      }
  }
  return current;
};


// Normalize task: move start off weekend and recompute end preserving business duration
const normalizeTaskSpan = (start: Date, end: Date) => {
  const s = nextBusinessDay(start);
  const bd = Math.max(1, businessDaysInclusive(start, end));
  const e = addBusinessDaysIncl(s, bd - 1);
  return { s, e, bd };
};


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

  const [hoverTaskId, setHoverTaskId] = useState<string | null>(null);

  const [linkDraft, setLinkDraft] = useState<{
    fromTaskId: string | null;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  }>({ fromTaskId: null, fromX: 0, fromY: 0, toX: 0, toY: 0 });


  const dragging = dragState.id !== null;

  const { dayWidth, projectStart, projectEnd, totalDays, timeline, taskPositions, getHeaderGroups } = useMemo(() => {
    const today = startOfDay(new Date());
    let projectStart: Date;
    let projectEnd: Date;
    let dayWidth: number;

    if (tasks.length === 0) {
        if (viewMode === 'week') {
            projectStart = startOfWeek(subWeeks(today, 6));
            projectEnd = endOfWeek(addWeeks(today, 6));
        } else {
            projectStart = startOfWeek(startOfMonth(today));
            projectEnd = endOfWeek(endOfMonth(today));
        }
    } else {
        const startDates = tasks.map(t => startOfDay(t.start));
        const endDates = tasks.map(t => startOfDay(t.end));
        projectStart = new Date(Math.min(...startDates.map(d => d.getTime())));
        projectEnd = new Date(Math.max(...endDates.map(d => d.getTime())));
    }
    
    if (viewMode !== 'week') {
      // Add padding around the project dates for non-week views
      projectStart = addDays(projectStart, -14);
      projectEnd = addDays(projectEnd, 14);
    } else {
        const minProjectStart = startOfWeek(subWeeks(today, 6));
        const maxProjectEnd = endOfWeek(addWeeks(today, 6));
        projectStart = new Date(Math.min(projectStart.getTime(), minProjectStart.getTime()));
        projectEnd = new Date(Math.max(projectEnd.getTime(), maxProjectEnd.getTime()));
    }


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

    const taskPositions = new Map<string, { x: number; y: number; width: number; s: Date; e: Date; bd: number }>();
    tasks.forEach((task, index) => {
        const { s, e, bd } = normalizeTaskSpan(task.start, task.end);
        const offset = differenceInDays(startOfDay(s), projectStart);
        const durationCalendar = differenceInDays(startOfDay(e), startOfDay(s)); // includes weekends visually
        taskPositions.set(task.id, {
            x: offset * dayWidth,
            y: index * ROW_HEIGHT,
            width: (durationCalendar + 1) * dayWidth,
            s, e, bd
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

  const taskDurationDays = (t: Task) => {
    const pos = taskPositions.get(t.id);
    return pos ? pos.bd : 1;
  }

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
    const taskPos = taskPositions.get(task.id);
    if (!taskPos) return { minStart: projectStart, maxStart: projectEnd };

    const preds = task.dependencies
      .map(id => taskPositions.get(id))
      .filter(Boolean) as {e: Date}[];

    const succs = (successorsById.get(task.id) || [])
      .map(id => taskPositions.get(id))
      .filter(Boolean) as {s: Date}[];

    const leftBoundStartDate = preds.length
      ? addDays(startOfDay(new Date(Math.max(...preds.map(p => p.e.getTime())))), 1)
      : startOfDay(projectStart);

    const rightLimitStartDate = succs.length
      ? addDays(
          startOfDay(new Date(Math.min(...succs.map(s => s.s.getTime())))),
          -(taskPos.bd)
        )
      : startOfDay(projectEnd);

    return {
      minStart: nextBusinessDay(leftBoundStartDate),
      maxStart: rightLimitStartDate, // This can be a weekend, nextBusinessDay will fix it
    };
  }, [taskPositions, projectStart, projectEnd, successorsById]);
    
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
  
    const pos = taskPositions.get(task.id);
    if (!pos) return;
  
    // how many calendar days did we slide?
    const calDelta = xToDayDelta(dragState.previewDeltaPx);
  
    if (calDelta !== 0) {
      // candidate start in calendar days, then snap to next business day
      const candStart = addDays(pos.s, calDelta);
      const newStart = nextBusinessDay(candStart);
      // preserve business duration
      const newEnd = addBusinessDaysIncl(newStart, pos.bd - 1);
      onTaskUpdate({ ...task, start: newStart, end: newEnd });
    }
  
    setDragState({ id: null, startX: 0, startLeftPx: 0, previewDeltaPx: 0 });
    setTimeout(() => { wasDraggedRef.current = false; }, 0);
  };
  
  const handleBarClick = (task: Task) => {
    if (!wasDraggedRef.current) {
        onTaskClick(task);
    }
  }

  const orthPath = (sx:number, sy:number, tx:number, ty:number) => {
    const R = 10;                  // corner radius
    const minRun = 16;             // min horizontal before first turn
    let mx = (sx + tx) / 2;
    if (mx < sx + R + 4) mx = sx + R + 4;
    if (mx > tx - R - 4) mx = tx - R - 4;
    const dir:1|-1 = ty >= sy ? 1 : -1;
    return [
      `M ${sx} ${sy}`,
      `H ${mx - R}`,
      `Q ${mx} ${sy} ${mx} ${sy + dir*R}`,
      `V ${ty - dir*R}`,
      `Q ${mx} ${ty} ${mx + R} ${ty}`,
      `H ${tx}`
    ].join(' ');
  };
  
  // proximity hit-test for dropping on a start-dot
  const hitStartDot = (x:number, y:number) => {
    const R = 10; // px radius to snap
    for (const task of tasks) {
      const pos = taskPositions.get(task.id);
      if (!pos) continue;
      const cx = pos.x + 2; // left edge dot
      const cy = pos.y + BAR_TOP_MARGIN + BAR_HEIGHT/2;
      const dx = x - cx, dy = y - cy;
      if ((dx*dx + dy*dy) <= R*R) return { taskId: task.id, cx, cy };
    }
    return null;
  };


  return (
    <Card className="w-full h-full overflow-hidden flex flex-col shadow-lg border-2">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-background z-50">
        <div className="flex items-center gap-2">
          <Dialog>
              <DialogTrigger asChild>
                <div className="flex items-center gap-2 group cursor-pointer">
                  <CardTitle className="group-hover:underline">{project.name}</CardTitle>
                  <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </DialogTrigger>
              <DialogContent>
                <ProjectEditor project={project} onProjectUpdate={onProjectUpdate} />
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
      <CardContent className="flex-grow flex overflow-hidden p-0">
        <div className="grid grid-cols-12 w-full h-full">
          {/* Task List */}
          <div className="col-span-3 border-r pr-2 overflow-y-auto">
            <div style={{ height: `${HEADER_HEIGHT}px`}} className="sticky top-0 bg-card z-40 py-2 font-semibold text-sm flex items-center justify-between pb-3 p-4">
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
            <div style={{ height: `${tasks.length * ROW_HEIGHT}px`}} className='relative px-4'>
              {tasks.map((task, index) => (
                <div 
                  key={task.id} 
                  style={{top: `${index * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px`}} 
                  className="group absolute w-full text-sm rounded-md hover:bg-secondary flex items-center gap-2 cursor-pointer -ml-2 pl-2 pr-4"
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
              <div style={{ width: `${totalDays * dayWidth}px`, minHeight: `${HEADER_HEIGHT}px` }} className="sticky top-0 bg-card z-40">
                 {viewMode !== 'day' && (
                    <div className="flex">
                        {headerGroups.map((group, index) => (
                            <div key={index} className="text-center font-semibold text-sm py-1 border-b border-r" style={{ width: `${group.days * dayWidth}px`}}>
                                <span className="truncate px-2">{group.label}</span>
                            </div>
                        ))}
                    </div>
                 )}
                <div className="grid" style={{ gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}>
                    {timeline.map(day => {
                        const weekend = isWeekend(day);
                        return (
                          <div key={day.toString()} className={cn(
                            "text-center text-xs py-1 border-r border-b",
                            weekend && "bg-muted/30"
                          )}>
                            <div>{format(day, viewMode === 'month' ? 'dd' : 'd')}</div>
                            <div className="text-muted-foreground">{format(day, 'E')}</div>
                          </div>
                        );
                    })}
                </div>
              </div>

              <div style={{ width: `${totalDays * dayWidth}px`, height: `${tasks.length * ROW_HEIGHT}px` }} className="relative">
                {/* Grid Background */}
                <div className="absolute top-0 left-0 w-full h-full grid" style={{ gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}>
                  {timeline.map((day, i) => (
                     <div key={`bg-${i}`} className={cn("border-r h-full", isWeekend(day) && "bg-muted/20")}></div>
                  ))}
                </div>
                <div className="absolute top-0 left-0 w-full h-full">
                   {tasks.map((_task, i) => (
                    <div key={`row-bg-${i}`} className="border-b" style={{ height: `${ROW_HEIGHT}px` }}></div>
                  ))}
                </div>
                
                {/* Dependency Lines (existing + preview) */}
                <svg
                  className="absolute top-0 left-0 w-full h-full z-30"
                  onMouseMove={e => {
                    if (!linkDraft.fromTaskId || !timelineRef.current) return;
                    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                    setLinkDraft(ld => ({ ...ld, toX: e.clientX - rect.left + timelineRef.current!.scrollLeft, toY: e.clientY - rect.top }));
                  }}
                  onMouseUp={() => {
                    if (!linkDraft.fromTaskId) return;
                    const hit = hitStartDot(linkDraft.toX, linkDraft.toY);
                    if (hit && hit.taskId !== linkDraft.fromTaskId) {
                      // create Finish->Start: fromTask finishes -> hit.taskId starts
                      const target = tasks.find(t => t.id === hit.taskId)!;
                      if (!target.dependencies.includes(linkDraft.fromTaskId)) {
                        onTaskUpdate({ ...target, dependencies: [...target.dependencies, linkDraft.fromTaskId] });
                      }
                    }
                    setLinkDraft({ fromTaskId: null, fromX: 0, fromY: 0, toX: 0, toY: 0 });
                  }}
                  onMouseLeave={() => {
                    if (linkDraft.fromTaskId) setLinkDraft({ fromTaskId: null, fromX: 0, fromY: 0, toX: 0, toY: 0 });
                  }}
                >
                  {/* existing links */}
                  {tasks.map((task) => {
                    const toPos = taskPositions.get(task.id);
                    if (!toPos) return null;
                    const toLeftEdge = toPos.x + 2;
                    const ty = toPos.y + BAR_TOP_MARGIN + BAR_HEIGHT/2;

                    // guard: unique deps, no self
                    const deps = Array.from(new Set(task.dependencies.filter(d => d !== task.id)));

                    return deps.map(depId => {
                      const fromPos = taskPositions.get(depId);
                      if (!fromPos) return null;

                      const fromRightEdge = fromPos.x + fromPos.width - 2;
                      const sy = fromPos.y + BAR_TOP_MARGIN + BAR_HEIGHT/2;

                      const sx = fromRightEdge;   // dot center on predecessor end
                      const tx = toLeftEdge;      // dot center on successor start

                      const d = orthPath(sx, sy, tx, ty);

                      return (
                        <g key={`${depId}-${task.id}`}>
                          <path
                            d={d}
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            opacity="0.9"
                          />
                          <circle cx={sx} cy={sy} r={3.5} fill="hsl(var(--foreground))" />
                          <circle cx={tx} cy={ty} r={3.5} fill="hsl(var(--foreground))" />
                        </g>
                      );
                    });
                  })}

                  {/* live preview while dragging from a dot */}
                  {linkDraft.fromTaskId && (() => {
                    const fromPos = taskPositions.get(linkDraft.fromTaskId);
                    if (!fromPos) return null;
                    const sy = fromPos.y + BAR_TOP_MARGIN + BAR_HEIGHT/2;
                    const sx = fromPos.x + fromPos.width - 2; // right dot
                    const d = orthPath(sx, sy, linkDraft.toX, linkDraft.toY);
                    return (
                      <g>
                        <path d={d} stroke="hsl(var(--muted-foreground))" strokeWidth="2" fill="none"
                          strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity="0.6" />
                        <circle cx={sx} cy={sy} r={3.5} fill="hsl(var(--foreground))" />
                      </g>
                    );
                  })()}
                </svg>

                {/* Task Bars */}
                {tasks.map((task, index) => {
                  const pos = taskPositions.get(task.id);
                  if(!pos) return null;
                  const duration = pos.bd;
                  
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
                               onMouseEnter={() => setHoverTaskId(task.id)}
                               onMouseLeave={() => setHoverTaskId(cur => cur === task.id ? null : cur)}
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
                              
                                {/* terminal dots (hidden until hover) */}
                                <div
                                  className={cn("absolute -left-1.5 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity", hoverTaskId === task.id ? "opacity-100" : "opacity-0")}
                                >
                                  <div className="relative w-3 h-3">
                                    <span className="absolute inset-0 rounded-full bg-foreground/90 scale-100 transition-transform"></span>
                                  </div>
                                </div>
                                <div
                                  className={cn("absolute -right-1.5 top-1/2 -translate-y-1/2 transition-opacity", hoverTaskId === task.id ? "opacity-100" : "opacity-0")}
                                  // this one is interactive: start link drag from END dot
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const sx = pos.x + pos.width - 2;
                                    const sy = pos.y + BAR_TOP_MARGIN + BAR_HEIGHT/2;
                                    const svg = (timelineRef.current!.querySelector('svg') as SVGSVGElement);
                                    const rect = svg.getBoundingClientRect();
                                    setLinkDraft({
                                      fromTaskId: task.id,
                                      fromX: sx,
                                      fromY: sy,
                                      toX: e.clientX - rect.left + timelineRef.current!.scrollLeft,
                                      toY: e.clientY - rect.top
                                    });
                                  }}
                                >
                                  <div className="relative w-3 h-3 cursor-crosshair">
                                    <span className="absolute inset-0 rounded-full bg-foreground/90 scale-100 hover:scale-110 transition-transform"></span>
                                  </div>
                                </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-card border-primary">
                            <p className="font-bold">{task.name}</p>
                            {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                            <p>Start: {format(pos.s, 'MMM d, yyyy')}</p>
                            <p>End: {format(pos.e, 'MMM d, yyyy')}</p>
                            <p>Duration: {duration} business day{duration === 1 ? '' : 's'}</p>
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

