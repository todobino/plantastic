
'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import type { Task, Milestone, Project } from '@/types';
import { addDays, differenceInDays, format, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addWeeks, subWeeks, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import ProjectEditor from './project-editor';
import { Separator } from './ui/separator';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { GanttasticListView } from './ganttastic-list-view';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';


const isWeekend = (d: Date) => {
  const day = d.getDay(); // 0 Sun .. 6 Sat
  return day === 0 || day === 6;
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


const ROW_HEIGHT = 40; // height of a task row in pixels
const BAR_HEIGHT = 32; // height of a task bar
const BAR_TOP_MARGIN = (ROW_HEIGHT - BAR_HEIGHT) / 2;
const HEADER_HEIGHT = 80;

export default function GanttasticChart({ tasks, project, onTaskClick, onAddTaskClick, onProjectUpdate, onReorderTasks, onTaskUpdate }: GanttasticChartProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const wasDraggedRef = useRef(false);
  const [view, setView] = useState<'timeline' | 'list'>('timeline');

  const [dragState, setDragState] = useState<{
    id: string | null;
    startX: number;
    startLeftPx: number;
    previewDeltaPx: number;
  }>({ id: null, startX: 0, startLeftPx: 0, previewDeltaPx: 0 });

  const [resizeState, setResizeState] = useState<{
    id: string | null;
    edge: 'left' | 'right' | null;
    startX: number;
  }>({ id: null, edge: null, startX: 0 });
  
  const [hoverTaskId, setHoverTaskId] = useState<string | null>(null);

  const [linkDraft, setLinkDraft] = useState<{
    fromTaskId: string | null;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  }>({ fromTaskId: null, fromX: 0, fromY: 0, toX: 0, toY: 0 });
  
  const [panState, setPanState] = useState<{
    isPanning: boolean;
    startX: number;
    startScrollLeft: number;
  }>({ isPanning: false, startX: 0, startScrollLeft: 0 });



  const dragging = dragState.id !== null;

  const { dayWidth, projectStart, projectEnd, totalDays, timeline, taskPositions, getHeaderGroups } = useMemo(() => {
    const today = startOfDay(new Date());
    let projectStart: Date;
    let projectEnd: Date;
    const viewMode = 'month';

    if (tasks.length === 0) {
        projectStart = startOfWeek(startOfMonth(today));
        projectEnd = endOfWeek(endOfMonth(today));
    } else {
        const startDates = tasks.map(t => startOfDay(t.start));
        const endDates = tasks.map(t => startOfDay(t.end));
        projectStart = new Date(Math.min(...startDates.map(d => d.getTime())));
        projectEnd = new Date(Math.max(...endDates.map(d => d.getTime())));
    }
    
    projectStart = addDays(projectStart, -14);
    projectEnd = addDays(projectEnd, 14);

    const dayWidth = 40;

    const timeline = eachDayOfInterval({ start: projectStart, end: projectEnd });
    const totalDays = timeline.length;

    const taskPositions = new Map<string, { x: number; y: number; width: number; s: Date; e: Date }>();
    tasks.forEach((task, index) => {
        const s = startOfDay(task.start);
        const e = startOfDay(task.end);
        const offset = differenceInDays(s, projectStart);
        const durationCalendar = differenceInDays(e, s); // includes weekends visually
        taskPositions.set(task.id, {
            x: offset * dayWidth,
            y: index * ROW_HEIGHT,
            width: (durationCalendar + 1) * dayWidth,
            s, e
        });
    });

    const getHeaderGroups = () => {
        const groups: { label: string, days: number }[] = [];
        let currentMonth = -1;

        timeline.forEach(day => {
            if (day.getMonth() !== currentMonth) {
                currentMonth = day.getMonth();
                const monthStart = startOfMonth(day);
                const monthEnd = endOfMonth(day);
                const daysInMonth = differenceInDays(monthEnd, day < monthStart ? monthStart : day) + 1;
                groups.push({ label: format(day, 'MMMM yyyy'), days: daysInMonth });
            }
        });

        if (groups.length > 0) {
            const totalGroupedDays = groups.reduce((acc, g) => acc + g.days, 0);
            if (totalGroupedDays > totalDays) {
                groups[groups.length - 1].days -= (totalGroupedDays - totalDays);
            }
        }

        return groups;
    }


    return { dayWidth, projectStart, projectEnd, totalDays, timeline, taskPositions, getHeaderGroups };
  }, [tasks]);

  const headerGroups = getHeaderGroups();

  const pxPerDay = dayWidth;

  // Gap-aware FS router: S (tight), 90° (≈1 cell), gentle diagonal (wide)
  const routeFS = (sx: number, sy: number, tx: number, ty: number) => {
    const gap = tx - sx;                 // px between bar edges
    const cell = pxPerDay;               // px per day cell
    const EPS = 2;                       // rounding tolerance
    const dir = ty >= sy ? 1 : -1;

    // helper: smooth cubic connector
    const cubic = (strength = 0.45) => {
      const dx = Math.max(gap, 0);
      const lead = Math.max(8, Math.min(cell / 2, dx * strength));
      const c1x = sx + lead;
      const c2x = tx - lead;
      return `M ${sx} ${sy} C ${c1x} ${sy}, ${c2x} ${ty}, ${tx} ${ty}`;
    };

    // 1) Butt-to-butt (adjacent): swoopy S (no vertical)
    if (gap <= EPS) {
      return cubic(0.6); // more pronounced curve
    }

    // 2) ~1 cell gap: clean right angle
    if (gap >= cell * 0.7 && gap <= cell * 1.3) {
      const lead = Math.min(cell / 2, Math.max(10, gap / 2 - 3));
      const outX = sx + lead;
      return `M ${sx} ${sy} H ${outX} V ${ty} H ${tx}`;
    }

    // 3) Wider gaps: single gentle diagonal/curve (no extra elbows)
    if (gap < cell * 2.2) {
      return cubic(0.35); // mild curvature for 1–2 cells
    }

    // 3b) Very wide: straight diagonal looks best
    return `M ${sx} ${sy} L ${tx} ${ty}`;
  };

  const dateToX = (d: Date) => differenceInDays(startOfDay(d), startOfDay(projectStart)) * pxPerDay;
  const xToDayDelta = (xPx: number) => Math.round(xPx / pxPerDay);

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

  const minStartAllowed = (task: Task) => {
    if (!task.dependencies.length) return projectStart;
    const latestPredEnd = new Date(Math.max(...task.dependencies
      .map(id => tasks.find(t => t.id === id))
      .filter((t): t is Task => !!t)!.map(t => startOfDay((t as Task).end).getTime())));
    return addDays(startOfDay(latestPredEnd), 1);
  };
    
  const onBarPointerDown = (e: React.PointerEvent<HTMLDivElement>, task: Task, currentLeftPx: number) => {
    wasDraggedRef.current = false;
    (e.target as Element).setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    setDragState({ id: task.id, startX: e.clientX, startLeftPx: currentLeftPx, previewDeltaPx: 0 });
  };
  
  const onBarPointerMove = (e: React.PointerEvent<HTMLDivElement>, task: Task) => {
    if (dragState.id !== task.id) return;

    if (Math.abs(e.clientX - dragState.startX) > 2) {
        wasDraggedRef.current = true;
    }

    const pos = taskPositions.get(task.id);
    if (!pos) return;

    const rawDeltaPx = e.clientX - dragState.startX;
    
    const minStart = minStartAllowed(task);
    const minLeftPx = dateToX(minStart);
    const desiredLeftPx = dragState.startLeftPx + rawDeltaPx;
    const clampedLeftPx = Math.max(desiredLeftPx, minLeftPx);

    const snapDeltaPx = xToDayDelta(clampedLeftPx - dragState.startLeftPx) * pxPerDay;
    
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
  
    const calDelta = xToDayDelta(dragState.previewDeltaPx);
  
    if (calDelta !== 0) {
      const minStart = minStartAllowed(task);
      const proposedStart = addDays(pos.s, calDelta);
      const newStart = proposedStart < minStart ? minStart : proposedStart;
      const duration = Math.max(0, differenceInDays(pos.e, pos.s));
      const newEnd = addDays(newStart, duration);
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

  const onLeftHandleDown = (e: React.PointerEvent, task: Task) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    setResizeState({ id: task.id, edge: 'left', startX: e.clientX });
  };

  const onRightHandleDown = (e: React.PointerEvent, task: Task) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    setResizeState({ id: task.id, edge: 'right', startX: e.clientX });
  };

  const onResizeMove = (e: React.PointerEvent, task: Task) => {
    if (resizeState.id !== task.id || !resizeState.edge) return;
    const deltaPx = e.clientX - resizeState.startX;
    setDragState(s => ({ ...s, previewDeltaPx: Math.round(deltaPx / pxPerDay) * pxPerDay }));
  };
  
  const onResizeUp = (e: React.PointerEvent, task: Task) => {
    if (resizeState.id !== task.id || !resizeState.edge) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    document.body.style.userSelect = '';
  
    const pos = taskPositions.get(task.id);
    if (!pos) { setResizeState({ id: null, edge: null, startX: 0 }); setDragState(s => ({...s, previewDeltaPx:0})); return; }
  
    const dayDelta = xToDayDelta(dragState.previewDeltaPx);
    let newStart = pos.s;
    let newEnd = pos.e;
  
    if (resizeState.edge === 'left' && dayDelta !== 0) {
      newStart = addDays(pos.s, dayDelta);
      const minStart = minStartAllowed(task);
      if (newStart < minStart) newStart = minStart;
      if (newStart > newEnd) newStart = newEnd;
    }
    if (resizeState.edge === 'right' && dayDelta !== 0) {
      newEnd = addDays(pos.e, dayDelta);
      if (newEnd < newStart) newEnd = newStart;
    }
  
    if (newStart.getTime() !== task.start.getTime() || newEnd.getTime() !== task.end.getTime()) {
      onTaskUpdate({ ...task, start: newStart, end: newEnd });
    }
  
    setResizeState({ id: null, edge: null, startX: 0 });
    setDragState(s => ({ ...s, previewDeltaPx: 0 }));
  };

  const hitStartDot = (x:number, y:number) => {
    const R = 10;
    for (const task of tasks) {
      const pos = taskPositions.get(task.id);
      if (!pos) continue;
      const cx = pos.x;
      const cy = pos.y + BAR_TOP_MARGIN + BAR_HEIGHT/2;
      const dx = x - cx, dy = y - cy;
      if ((dx*dx + dy*dy) <= R*R) return { taskId: task.id, cx, cy };
    }
    return null;
  };
  
  useEffect(() => {
    if (!linkDraft.fromTaskId) return;

    const onMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const svg = timelineRef.current.querySelector('svg') as SVGSVGElement;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      setLinkDraft(ld => ({ ...ld,
        toX: e.clientX - rect.left + timelineRef.current!.scrollLeft,
        toY: e.clientY - rect.top
      }));
    };

    const onUp = () => {
      const hit = hitStartDot(linkDraft.toX, linkDraft.toY);
      if (hit && hit.taskId !== linkDraft.fromTaskId) {
        const target = tasks.find(t => t.id === hit.taskId)!;
        if (!target.dependencies.includes(linkDraft.fromTaskId!)) {
          onTaskUpdate({ ...target, dependencies: [...target.dependencies, linkDraft.fromTaskId!] });
        }
      }
      setLinkDraft({ fromTaskId: null, fromX: 0, fromY: 0, toX: 0, toY: 0 });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [linkDraft.fromTaskId, linkDraft.toX, linkDraft.toY, tasks, onTaskUpdate]);

  const previewOffsets = useMemo(() => {
    const m = new Map<string, number>();
    if (!dragging && !resizeState.id) return m;
  
    const seedId = resizeState.id ?? dragState.id!;
    const base = taskPositions.get(seedId);
    if (!base) return m;
  
    const dayDelta = xToDayDelta(dragState.previewDeltaPx);
  
    let seedStart = base.s;
    let seedEnd = base.e;
  
    if (resizeState.id === seedId) {
      if (resizeState.edge === 'left') seedStart = addDays(base.s, dayDelta);
      else if (resizeState.edge === 'right') seedEnd = addDays(base.e, dayDelta);
    } else if (dragging) {
      seedStart = addDays(base.s, dayDelta);
      seedEnd = addDays(base.e, dayDelta);
    }
    
    const seedTask = tasks.find(t => t.id === seedId);
    if(seedTask){
        const minStart = minStartAllowed(seedTask);
        if (seedStart < minStart) {
          const fixDays = differenceInDays(minStart, seedStart);
          seedStart = addDays(seedStart, fixDays);
          seedEnd = addDays(seedEnd, fixDays);
        }
    }
  
    m.set(seedId, differenceInDays(seedStart, base.s) * pxPerDay);
  
    const q: string[] = [seedId];
    const visited = new Set<string>([seedId]);
  
    while (q.length > 0) {
      const u = q.shift()!;
      const successors = successorsById.get(u) || [];
  
      for (const vId of successors) {
        if (visited.has(vId)) continue;
        
        const vPos = taskPositions.get(vId);
        const vTask = tasks.find(t => t.id === vId);
        if (!vPos || !vTask) continue;
  
        const latestPredEnd = new Date(Math.max(...vTask.dependencies.map(pId => {
          const pPos = taskPositions.get(pId)!;
          let pEnd = pPos.e;
          if (m.has(pId)) {
             const pOffsetDays = (m.get(pId) ?? 0) / pxPerDay;
             pEnd = addDays(pPos.e, pOffsetDays);
          } else if(pId === seedId && resizeState.id === seedId && resizeState.edge === 'right') {
            pEnd = addDays(pPos.e, dayDelta);
          }
          return startOfDay(pEnd).getTime();
        })));
  
        const newStart = addDays(startOfDay(latestPredEnd), 1);
        const newOffsetPx = differenceInDays(newStart, vPos.s) * pxPerDay;
        
        if (newOffsetPx > (m.get(vId) ?? -1)) {
          m.set(vId, newOffsetPx);
          visited.add(vId);
          q.push(vId);
        }
      }
    }
    return m;
  }, [dragging, resizeState.id, resizeState.edge, dragState.previewDeltaPx, tasks, taskPositions, pxPerDay, successorsById, minStartAllowed]);
  
  const getVisualPos = (id: string) => {
    const p = taskPositions.get(id);
    if (!p) return null;
  
    let left = p.x;
    let width = p.width;
  
    const offset = previewOffsets.get(id) ?? 0;
    left += offset;
  
    if (resizeState.id === id) {
      if (resizeState.edge === 'left') {
        const resizeDelta = dragState.previewDeltaPx + offset - (previewOffsets.get(id) ?? 0);
        left += resizeDelta
        width -= resizeDelta;
      } else if (resizeState.edge === 'right') {
        width += dragState.previewDeltaPx;
      }
    }
    return { left, right: left + width, cy: p.y + BAR_TOP_MARGIN + BAR_HEIGHT / 2 };
  };

  const handleTodayClick = () => {
    const scroller = timelineRef.current;
    if (!scroller) return;

    const todayX = dateToX(new Date());
    const scrollerWidth = scroller.clientWidth;
    
    const scrollTo = todayX - (scrollerWidth / 2) + (dayWidth / 2);
    
    scroller.scrollTo({
      left: scrollTo,
      behavior: 'smooth'
    });
  };
  
    const handlePanStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    // Only pan if not clicking a task bar or handle
    if ((e.target as HTMLElement).closest('[data-task-bar="true"]')) return;

    e.preventDefault();
    e.stopPropagation();
    document.body.style.cursor = 'grabbing';
    setPanState({
      isPanning: true,
      startX: e.clientX,
      startScrollLeft: timelineRef.current.scrollLeft,
    });
  };

  const handlePanMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panState.isPanning || !timelineRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const x = e.clientX;
    const walk = (x - panState.startX);
    timelineRef.current.scrollLeft = panState.startScrollLeft - walk;
  };

  const handlePanEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panState.isPanning) return;
    document.body.style.cursor = 'default';
    setPanState({ isPanning: false, startX: 0, startScrollLeft: 0 });
  };


  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex flex-row items-center justify-between border-b bg-background z-10 py-4 px-4 md:px-6">
        <div className="flex items-center gap-4">
            <Tabs value={view} onValueChange={(v) => setView(v as 'timeline' | 'list')}>
                <TabsList>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                    <TabsTrigger value="list">List</TabsTrigger>
                </TabsList>
            </Tabs>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Project Details
                </Button>
              </DialogTrigger>
              <DialogContent>
                <ProjectEditor project={project} onProjectUpdate={onProjectUpdate} />
              </DialogContent>
            </Dialog>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleTodayClick}>
                Today
            </Button>
            <Button size="sm" onClick={onAddTaskClick}>
                <Plus />
                Add Task
            </Button>
        </div>
      </div>
      <div className="flex-grow flex overflow-hidden">
        {view === 'timeline' ? (
          <div className="grid grid-cols-12 w-full h-full">
            <div className="col-span-3 border-r overflow-y-auto">
              <div style={{ height: `${HEADER_HEIGHT}px`}} className="sticky top-0 bg-background z-40 py-2 font-semibold text-sm flex items-center justify-between pb-3 p-4 border-b">
                <span>Tasks & Milestones</span>
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
              <div className='relative'>
                {tasks.map((task, index) => (
                  <div 
                    key={task.id} 
                    style={{height: `${ROW_HEIGHT}px`}} 
                    className="group w-full text-sm hover:bg-secondary flex items-center gap-2 cursor-pointer px-4 border-b"
                    onClick={() => onTaskClick(task)}
                  >
                    <span className="truncate flex-1">{task.name}</span>
                    <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </div>
                ))}
              </div>
            </div>

            <div ref={timelineRef} className="col-span-9 overflow-auto">
              <div 
                  className={cn(
                    "relative",
                    panState.isPanning && "cursor-grabbing"
                  )}
                  onPointerDown={handlePanStart}
                  onPointerMove={handlePanMove}
                  onPointerUp={handlePanEnd}
                  onPointerLeave={handlePanEnd}
                  onPointerCancel={handlePanEnd}
              >
                <div style={{ width: `${totalDays * dayWidth}px`, height: `${HEADER_HEIGHT}px` }} className="sticky top-0 bg-background z-40 flex flex-col">
                  <div className="flex">
                      {headerGroups.map((group, index) => (
                          <div key={index} className="text-center font-semibold text-sm py-1 border-b border-r" style={{ width: `${group.days * dayWidth}px`}}>
                              <span className="truncate px-2">{group.label}</span>
                          </div>
                      ))}
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}>
                      {timeline.map(day => {
                          const weekend = isWeekend(day);
                          const today = isToday(day);
                          return (
                            <div key={day.toString()} className={cn(
                              "text-center text-xs py-1 border-r border-b relative h-[40px] flex flex-col justify-center",
                              weekend && "bg-zinc-100 dark:bg-zinc-900/40",
                              today && "bg-primary text-primary-foreground font-bold"
                            )}>
                              <div>{format(day, 'dd')}</div>
                              <div className={cn("text-muted-foreground", today && "text-primary-foreground/80")}>{format(day, 'E')}</div>
                            </div>
                          );
                      })}
                  </div>
                </div>

                <div style={{ width: `${totalDays * dayWidth}px`, height: `${tasks.length * ROW_HEIGHT}px` }} className="relative">
                  <div className="absolute top-0 left-0 w-full h-full grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}>
                    {timeline.map((day, i) => (
                      <div key={`bg-${i}`} className={cn("border-r h-full", isWeekend(day) && "bg-zinc-100 dark:bg-zinc-900/40")}></div>
                    ))}
                  </div>
                  <div className="absolute top-0 left-0 w-full h-full">
                    {tasks.map((_task, i) => (
                      <div key={`row-bg-${i}`} className="border-b" style={{ height: `${ROW_HEIGHT}px` }}></div>
                    ))}
                  </div>
                  
                  <div
                      className="absolute top-0 bottom-0 w-0.5 bg-black dark:bg-slate-500 z-30"
                      style={{ left: `${dateToX(new Date()) + dayWidth / 2}px` }}
                  />

                  <svg className="absolute top-0 left-0 w-full h-full z-30 pointer-events-none">
                    {tasks.map((task) => {
                      const toV = getVisualPos(task.id);
                      if (!toV) return null;

                      const deps = Array.from(new Set(task.dependencies.filter(d => d !== task.id)));

                      return deps.map(depId => {
                        const fromV = getVisualPos(depId);
                        if (!fromV) return null;

                        const sx = fromV.right;
                        const sy = fromV.cy;
                        const tx = toV.left;
                        const ty = toV.cy;

                        const d = routeFS(sx, sy, tx, ty);

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

                    {linkDraft.fromTaskId && (() => {
                      const fromPos = taskPositions.get(linkDraft.fromTaskId);
                      if (!fromPos) return null;
                      const fromV = getVisualPos(linkDraft.fromTaskId);
                      if (!fromV) return null;
                      const d = routeFS(fromV.right, fromV.cy, linkDraft.toX, linkDraft.toY);
                      return (
                        <g>
                          <path d={d} stroke="hsl(var(--muted-foreground))" strokeWidth="2" fill="none"
                            strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity="0.6" />
                          <circle cx={fromV.right} cy={fromV.cy} r={3.5} fill="hsl(var(--foreground))" />
                        </g>
                      );
                    })()}
                  </svg>
                  
                  {tasks.map((task, index) => {
                    const pos = taskPositions.get(task.id);
                    if(!pos) return null;

                    const isDraggingThis = dragState.id === task.id && !resizeState.edge;
                    const isResizingThis = resizeState.id === task.id;
                    const vPos = getVisualPos(task.id);
                    if(!vPos) return null;

                    return (
                        <TooltipProvider key={task.id} delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                data-task-bar="true"
                                onPointerDown={(e) => onBarPointerDown(e, task, pos.x)}
                                onPointerMove={(e) => {
                                isResizingThis ? onResizeMove(e, task) : onBarPointerMove(e, task)
                                }}
                                onPointerUp={(e) => {
                                isResizingThis ? onResizeUp(e, task) : onBarPointerUp(e, task)
                                }}
                                onPointerCancel={(e) => {
                                isResizingThis ? onResizeUp(e, task) : onBarPointerUp(e, task)
                                }}
                                onMouseEnter={() => setHoverTaskId(task.id)}
                                onMouseLeave={() => setHoverTaskId(cur => cur === task.id ? null : cur)}
                                onClick={() => handleBarClick(task)}
                                className={cn(
                                "absolute rounded-md hover:brightness-110 transition-all cursor-grab active:cursor-grabbing flex items-center px-2 overflow-hidden shadow z-20",
                                isDraggingThis && "opacity-90"
                                )}
                                style={{
                                top: `${pos.y + BAR_TOP_MARGIN}px`,
                                left: `${vPos.left}px`,
                                width: `${vPos.right - vPos.left}px`,
                                height: `${BAR_HEIGHT}px`,
                                willChange: "transform,width,left",
                                backgroundColor: task.color || 'hsl(var(--primary))'
                                }}
                              >
                                <span className="relative text-primary-foreground text-xs font-medium truncate z-10">{task.name}</span>
                                
                                <div
                                  className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
                                  onPointerDown={(e)=>onLeftHandleDown(e, task)}
                                />
                                <div
                                  className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
                                  onPointerDown={(e)=>onRightHandleDown(e, task)}
                                />

                                  <div
                                    className={cn("absolute -left-1.5 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity", hoverTaskId === task.id ? "opacity-100" : "opacity-0")}
                                  >
                                    <div className="relative w-3 h-3">
                                      <span className="absolute inset-0 rounded-full bg-foreground/90 scale-100 transition-transform"></span>
                                    </div>
                                  </div>
                                  <div
                                    className={cn("absolute -right-1.5 top-1/2 -translate-y-1/2 transition-opacity", hoverTaskId === task.id ? "opacity-100" : "opacity-0")}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      const fromV = getVisualPos(task.id);
                                      if (!fromV) return;
                                      const sx = fromV.right;
                                      const sy = fromV.cy;
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
                              <p>Duration: {differenceInDays(pos.e, pos.s) + 1} day(s)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <GanttasticListView tasks={tasks} onTaskClick={onTaskClick} />
        )}
      </div>
    </div>
  );
}
