
'use client';

import { useMemo, useState, useRef, useCallback, useEffect, PointerEvent as ReactPointerEvent } from 'react';
import type { Task, Milestone, Project } from '@/types';
import { addDays, differenceInDays, format, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ArrowDown } from 'lucide-react';
import AppHeader from "./app-header";
import { TimelineTaskList } from './timeline-task-list';
import { TimelineCalendarView } from './timeline-calendar-view';
import { ListView } from './list-view';
import { Button } from './ui/button';
import { MONTH_ROW_HEIGHT } from '@/lib/utils';


const ROW_HEIGHT = 40; 
const BAR_HEIGHT = 28;

type TimelineViewProps = {
    tasks: Task[];
    setTasks: (tasks: Task[]) => void;
    project: Project;
    onTaskClick: (task: Task) => void;
    onAddTaskClick: () => void;
    onAddCategoryClick: () => void;
    onProjectUpdate: (project: Project) => void;
    onReorderTasks: (reorderedTasks: Task[]) => void;
    onTaskUpdate: (task: Task) => void;
    onNewProjectClick: () => void;
    onTeamClick: () => void;
};


export default function TimelineView({ tasks, setTasks, project, onTaskClick, onAddTaskClick, onAddCategoryClick, onProjectUpdate, onReorderTasks, onTaskUpdate, onNewProjectClick, onTeamClick }: TimelineViewProps) {
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

  const dragging = dragState.id !== null;

  const displayTasks = useMemo(() => {
    const flatList: Task[] = [];
    const taskMap = new Map(tasks.map(t => [t.id, t]));

    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.type === 'category' && b.type !== 'category') return -1;
        if (a.type !== 'category' && b.type === 'category') return 1;
        return (a.start?.getTime() || 0) - (b.start?.getTime() || 0);
    });

    const taskToChildren = new Map<string, Task[]>();
    sortedTasks.forEach(task => {
        if (task.parentId) {
            if (!taskToChildren.has(task.parentId)) {
                taskToChildren.set(task.parentId, []);
            }
            taskToChildren.get(task.parentId)!.push(task);
        }
    });

    const topLevelTasks = sortedTasks.filter(t => !t.parentId || !taskMap.has(t.parentId));

    const addTaskRecursive = (task: Task, level: number) => {
        flatList.push({ ...task, milestone: `${level}` }); 
        if (task.type === 'category' && task.isExpanded) {
            const children = (taskToChildren.get(task.id) || []).sort((a,b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0));
            children.forEach(child => addTaskRecursive(child, level + 1));
        }
    }

    topLevelTasks.forEach(task => addTaskRecursive(task, 0));
    return flatList;
  }, [tasks]);

  const { dayWidth, projectStart, projectEnd, totalDays, timeline, taskPositions, getHeaderGroups } = useMemo(() => {
    const today = startOfDay(new Date());
    let projectStart: Date;
    let projectEnd: Date;
    
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const taskToChildren = new Map<string, Task[]>();
    tasks.forEach(task => {
        if (task.parentId && taskMap.has(task.parentId)) {
            if (!taskToChildren.has(task.parentId)) {
                taskToChildren.set(task.parentId, []);
            }
            taskToChildren.get(task.parentId)!.push(task);
        }
    });

    const getCategoryDates = (categoryId: string): { start: Date | null, end: Date | null } => {
        const children = taskToChildren.get(categoryId) || [];
        if (children.length === 0) return { start: null, end: null };

        let minStart: Date | null = null;
        let maxEnd: Date | null = null;

        children.forEach(child => {
            let childStart = child.start;
            let childEnd = child.end;
            if (child.type === 'category') {
                const { start, end } = getCategoryDates(child.id);
                childStart = start;
                childEnd = end;
            }

            if (childStart) {
                if (!minStart || childStart < minStart) {
                    minStart = childStart;
                }
            }
            if (childEnd) {
                if (!maxEnd || childEnd > maxEnd) {
                    maxEnd = childEnd;
                }
            }
        });
        return { start: minStart, end: maxEnd };
    };

    const allTasks = displayTasks.map(t => {
      if (t.type === 'category') {
        const { start, end } = getCategoryDates(t.id);
        return { ...t, start, end };
      }
      return t;
    }).filter(t => t.start && t.end);


    if (allTasks.length === 0) {
        projectStart = startOfWeek(startOfMonth(today));
        projectEnd = endOfWeek(endOfMonth(today));
    } else {
        const startDates = allTasks.map(t => startOfDay(t.start!));
        const endDates = allTasks.map(t => startOfDay(t.end!));
        projectStart = new Date(Math.min(...startDates.map(d => d.getTime())));
        projectEnd = new Date(Math.max(...endDates.map(d => d.getTime())));
    }
    
    projectStart = addDays(projectStart, -365 * 2);
    projectEnd = addDays(projectEnd, 365 * 2);

    const dayWidth = 40;

    const timeline = eachDayOfInterval({ start: projectStart, end: projectEnd });
    const totalDays = timeline.length;

    const taskPositions = new Map<string, { x: number; y: number; width: number; s: Date; e: Date }>();
    displayTasks.forEach((task, index) => {
        let s: Date | undefined | null = task.start;
        let e: Date | undefined | null = task.end;

        if (task.type === 'category') {
            const { start, end } = getCategoryDates(task.id);
            s = start;
            e = end;
        }

        if (s && e) {
            const startOfDay_s = startOfDay(s);
            const startOfDay_e = startOfDay(e);
            const offset = differenceInDays(startOfDay_s, projectStart);
            const durationCalendar = differenceInDays(startOfDay_e, startOfDay_s);
            taskPositions.set(task.id, {
                x: offset * dayWidth,
                y: index * ROW_HEIGHT,
                width: (durationCalendar + 1) * dayWidth,
                s: startOfDay_s, 
                e: startOfDay_e
            });
        }
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
  }, [displayTasks, tasks]);

  const headerGroups = getHeaderGroups();

  const pxPerDay = dayWidth;

  const routeFS = (sx: number, sy: number, tx: number, ty: number) => {
    const gap = tx - sx;                 
    const cell = pxPerDay;              
    const EPS = 2;                       
    const dir = ty >= sy ? 1 : -1;

    const cubic = (strength = 0.45) => {
      const dx = Math.max(gap, 0);
      const lead = Math.max(8, Math.min(cell / 2, dx * strength));
      const c1x = sx + lead;
      const c2x = tx - lead;
      return `M ${sx} ${sy} C ${c1x} ${sy}, ${c2x} ${ty}, ${tx} ${ty}`;
    };

    if (gap <= EPS) {
      return cubic(0.6);
    }

    if (gap >= cell * 0.7 && gap <= cell * 1.3) {
      const lead = Math.min(cell / 2, Math.max(10, gap / 2 - 3));
      const outX = sx + lead;
      return `M ${sx} ${sy} H ${outX} V ${ty} H ${tx}`;
    }

    if (gap < cell * 2.2) {
      return cubic(0.35);
    }

    return `M ${sx} ${sy} L ${tx} ${ty}`;
  };

  const dateToX = useCallback((d: Date) => differenceInDays(startOfDay(d), startOfDay(projectStart)) * pxPerDay, [projectStart, pxPerDay]);
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
    if (!task.dependencies.length) return null;
    const latestPredEnd = new Date(Math.max(...task.dependencies
      .map(id => tasks.find(t => t.id === id))
      .filter((t): t is Task => !!t && !!t.end)!.map(t => startOfDay((t as Task).end!).getTime())));
    return addDays(startOfDay(latestPredEnd), 1);
  };
    
  const onBarPointerDown = (e: React.PointerEvent<HTMLDivElement>, task: Task, currentLeftPx: number) => {
    if(task.type === 'category') return;
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
    const minLeftPx = minStart ? dateToX(minStart) : -Infinity;
    const desiredLeftPx = dragState.startLeftPx + rawDeltaPx;
    const clampedLeftPx = Math.max(desiredLeftPx, minLeftPx);

    const snapDeltaPx = xToDayDelta(clampedLeftPx - dragState.startLeftPx) * pxPerDay;
    
    const scroller = timelineRef.current; 
    if (scroller) {
      const margin = 40;
      if (e.clientX > scroller.getBoundingClientRect().right - margin) scroller.scrollLeft += pxPerDay;
      else if (e.clientX < scroller.getBoundingClientRect().left - margin) scroller.scrollLeft -= pxPerDay;
    }
  
    setDragState(s => ({ ...s, previewDeltaPx: snapDeltaPx }));
  };
  
  const onBarPointerUp = (e: React.PointerEvent<HTMLDivElement>, task: Task) => {
    if (dragState.id !== task.id) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    document.body.style.userSelect = '';
  
    const pos = taskPositions.get(task.id);
    if (!pos || !task.start || !task.end) return;
  
    const calDelta = xToDayDelta(dragState.previewDeltaPx);
  
    if (calDelta !== 0) {
      const minStart = minStartAllowed(task);
      const proposedStart = addDays(pos.s, calDelta);
      const newStart = (minStart && proposedStart < minStart) ? minStart : proposedStart;
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
    if(task.type === 'category') return;
    (e.target as Element).setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    setResizeState({ id: task.id, edge: 'left', startX: e.clientX });
  };

  const onRightHandleDown = (e: React.PointerEvent, task: Task) => {
    e.stopPropagation();
    if(task.type === 'category') return;
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
    if (resizeState.id !== task.id || !resizeState.edge || !task.start || !task.end) return;
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
      if (minStart && newStart < minStart) newStart = minStart;
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
    setDragState(s => ({ s, previewDeltaPx: 0 }));
  };

  const hitStartDot = (x:number, y:number) => {
    const R = 10;
    for (const task of tasks) {
      const pos = taskPositions.get(task.id);
      if (!pos) continue;
      const cx = pos.x;
      const cy = pos.y + (ROW_HEIGHT - BAR_HEIGHT) / 2 + BAR_HEIGHT/2;
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
    const seedTask = tasks.find(t => t.id === seedId);
    if (!base || !seedTask || !seedTask.start) return m;
  
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
    
    const minStart = minStartAllowed(seedTask);
    if(minStart && seedStart < minStart){
      const fixDays = differenceInDays(minStart, seedStart);
      seedStart = addDays(seedStart, fixDays);
      seedEnd = addDays(seedEnd, fixDays);
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
        
        if (newOffsetPx > (m.get(vId) ?? -Infinity)) {
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
    
    const task = tasks.find(t => t.id === id);
    const isCategory = task?.type === 'category';

    const barHeight = isCategory ? 14 : BAR_HEIGHT;
    const topMargin = isCategory ? (ROW_HEIGHT - 14) / 2 : (ROW_HEIGHT - BAR_HEIGHT) / 2;
    const cy = p.y + topMargin + barHeight / 2;

    return { left, right: left + width, cy };
  };

  const handleTodayClick = useCallback(() => {
    const scroller = timelineRef.current;
    if (!scroller) return;

    const todayX = dateToX(new Date());
    const scrollerWidth = scroller.clientWidth;
    
    const scrollTo = todayX - (scrollerWidth / 2) + (dayWidth / 2);
    
    scroller.scrollTo({
      left: scrollTo,
      behavior: 'smooth'
    });
  }, [dateToX, dayWidth]);
  
  useEffect(() => {
    const scroller = timelineRef.current;
    if (scroller && totalDays > 0) {
        const todayX = dateToX(new Date());
        const scrollerWidth = scroller.clientWidth;
        const scrollTo = todayX - scrollerWidth / 2 + dayWidth / 2;
        scroller.scrollTo({ left: scrollTo, behavior: 'auto' });
    }
  }, [project.id, dateToX, dayWidth, totalDays]);
  
  const toggleCategory = (categoryId: string) => {
    setTasks(tasks.map(t => 
        t.id === categoryId ? { ...t, isExpanded: !t.isExpanded } : t
    ));
  }
  
  const getTaskColor = useCallback((task: Task) => {
    if (task.type === 'category') {
        return task.color || 'hsl(var(--secondary))';
    }
    if (task.parentId) {
        const parent = tasks.find(t => t.id === task.parentId);
        return parent?.color || 'hsl(var(--primary))';
    }
    return 'hsl(var(--primary))';
  }, [tasks]);

  const justTasks = useMemo(() => displayTasks.filter(t => t.type === 'task'), [displayTasks]);

  return (
    <div className="w-full h-full flex flex-col">
      <AppHeader
        project={project}
        onProjectUpdate={onProjectUpdate}
        view={view}
        onViewChange={setView}
        onTeamClick={onTeamClick}
        onNewProjectClick={onNewProjectClick}
      />
      <div className="flex-grow flex overflow-hidden relative">
        {view === 'timeline' ? (
          <div className="relative w-full h-full">
            <div className="grid grid-cols-12 w-full h-full">
                <TimelineTaskList 
                    displayTasks={displayTasks}
                    justTasks={justTasks}
                    onAddTaskClick={onAddTaskClick}
                    onAddCategoryClick={onAddCategoryClick}
                    toggleCategory={toggleCategory}
                    onTaskClick={onTaskClick}
                    getTaskColor={getTaskColor}
                />
                <TimelineCalendarView 
                    timeline={timeline}
                    totalDays={totalDays}
                    dayWidth={dayWidth}
                    headerGroups={headerGroups}
                    displayTasks={displayTasks}
                    tasks={tasks}
                    taskPositions={taskPositions}
                    linkDraft={linkDraft}
                    onBarPointerDown={onBarPointerDown}
                    onBarPointerMove={onBarPointerMove}
                    onBarPointerUp={onBarPointerUp}
                    onResizeMove={onResizeMove}
                    onResizeUp={onResizeUp}
                    handleBarClick={handleBarClick}
                    onLeftHandleDown={onLeftHandleDown}
                    onRightHandleDown={onRightHandleDown}
                    setHoverTaskId={setHoverTaskId}
                    getVisualPos={getVisualPos}
                    getTaskColor={getTaskColor}
                    dateToX={dateToX}
                    routeFS={routeFS}
                    setLinkDraft={setLinkDraft}
                    hoverTaskId={hoverTaskId}
                    isResizingThis={(task: Task) => resizeState.id === task.id}
                    isDraggingThis={(task: Task) => dragState.id === task.id && !resizeState.edge}
                    timelineRef={timelineRef}
                />
            </div>
            <Button
                variant="secondary"
                onClick={handleTodayClick}
                className="absolute left-[calc(25%+1rem)] top-2.5 z-50 py-1 h-auto"
                style={{top: `calc(${MONTH_ROW_HEIGHT / 2}px - 0.875rem)`}}
            >
              Today
              <ArrowDown className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ) : (
          <ListView tasks={tasks} onTaskClick={onTaskClick} />
        )}
      </div>
    </div>
  );
}

    
