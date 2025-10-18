
'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import type { Task, Milestone, Project } from '@/types';
import { addDays, differenceInDays, format, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addWeeks, subWeeks, isToday } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, GripVertical, Download, ChevronDown, ChevronRight, Folder, FolderOpen, GanttChartSquare, FolderPlus, DiamondPlus, CirclePlus, ChevronsUpDown, List, GanttChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import ProjectEditor from './project-editor';
import { Separator } from './ui/separator';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { GanttasticListView } from './ganttastic-list-view';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import AppHeader from './app-header';


const isWeekend = (d: Date) => {
  const day = d.getDay(); // 0 Sun .. 6 Sat
  return day === 0 || day === 6;
};

type GanttasticChartProps = {
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
};


const ROW_HEIGHT = 40; // height of a task row in pixels
const BAR_HEIGHT = 28; // height of a task bar
const CATEGORY_BAR_HEIGHT = 14;
const BAR_TOP_MARGIN = (ROW_HEIGHT - BAR_HEIGHT) / 2;
const MONTH_ROW_HEIGHT = 32;
const DAY_ROW_HEIGHT = 40;
const HEADER_HEIGHT = MONTH_ROW_HEIGHT + DAY_ROW_HEIGHT;

export default function GanttasticChart({ tasks, setTasks, project, onTaskClick, onAddTaskClick, onAddCategoryClick, onProjectUpdate, onReorderTasks, onTaskUpdate, onNewProjectClick }: GanttasticChartProps) {
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
        flatList.push({ ...task, milestone: `${level}` }); // Using milestone to store level for indentation
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
    if (!task.dependencies.length) return null; // No dependencies, no minimum start
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

    const barHeight = isCategory ? CATEGORY_BAR_HEIGHT : BAR_HEIGHT;
    const topMargin = isCategory ? (ROW_HEIGHT - barHeight) / 2 : BAR_TOP_MARGIN;
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
  }, [project.id]);
  
    const handlePanStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
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
        onTodayClick={handleTodayClick}
        onAddTaskClick={onAddTaskClick}
      />
      <div className="flex-grow flex overflow-hidden">
        {view === 'timeline' ? (
          <div className="grid grid-cols-12 w-full h-full">
            <div className="col-span-3 border-r overflow-y-auto shadow-md z-20">
              <div
                style={{ height: `${HEADER_HEIGHT}px` }}
                className="sticky top-0 bg-background z-40 flex flex-col border-b"
              >
                <div style={{ height: `${MONTH_ROW_HEIGHT}px` }} className="flex items-center justify-between p-4 border-b">
                  <span className="font-semibold text-sm">Tasks</span>
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="default" size="sm" className="h-7 px-2">
                            <Plus className="h-3 w-3 mr-1" />
                            <span className="text-xs">Add</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={onAddTaskClick}>
                            <CirclePlus className="mr-2 h-4 w-4" />
                            New Task
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={onAddCategoryClick}>
                            <FolderPlus className="mr-2 h-4 w-4" />
                            New Category
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div style={{ height: `${DAY_ROW_HEIGHT}px`}} className="grid grid-cols-5 items-center text-xs font-medium text-muted-foreground">
                    <div className="col-span-1 text-center border-r h-full flex items-center justify-center">ID</div>
                    <div className="col-span-4 text-center h-full flex items-center justify-center">Name</div>
                </div>
              </div>
              <div className='relative'>
                {displayTasks.map((task) => {
                  const level = parseInt(task.milestone || '0', 10);
                  const isCategory = task.type === 'category';
                  let taskIndex = -1;
                  if (!isCategory) {
                      taskIndex = justTasks.findIndex(t => t.id === task.id);
                  }
                  return (
                    <div 
                      key={task.id} 
                      style={{height: `${ROW_HEIGHT}px`}} 
                      className="group w-full text-sm hover:bg-secondary grid grid-cols-5 items-center cursor-pointer border-b"
                      onClick={() => onTaskClick(task)}
                    >
                      <div className="col-span-1 text-center text-muted-foreground border-r h-full flex items-center justify-center">
                          {!isCategory ? taskIndex + 1 : ''}
                      </div>
                      <div className="col-span-4 flex items-center gap-2" style={{ paddingLeft: `${level * 1.5 + 0.25}rem`}}>
                         {task.type === 'category' ? (
                            <button onClick={(e) => { e.stopPropagation(); toggleCategory(task.id); }} className="p-1 -ml-1">
                            {task.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                        ) : <div className="w-5" />}

                        {task.type === 'category' ? (
                            task.isExpanded ? <FolderOpen className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4 text-primary" />
                        ) : null}

                        <span className="truncate flex-1">{task.name}</span>
                        <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 mr-4" />
                      </div>
                    </div>
                  )
                })}
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
                 <div
                  style={{ width: `${totalDays * dayWidth}px`, height: `${HEADER_HEIGHT}px` }}
                  className="sticky top-0 bg-background z-40 border-b"
                >
                  <div className="border-b">
                    <div className="flex border-b" style={{ height: `${MONTH_ROW_HEIGHT}px` }}>
                        {headerGroups.map((group, index) => (
                            <div key={index} className="text-center font-semibold text-sm flex items-center justify-center border-r" style={{ width: `${group.days * dayWidth}px`}}>
                                <span className="truncate px-2">{group.label}</span>
                            </div>
                        ))}
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)`, height: `${DAY_ROW_HEIGHT}px` }}>
                        {timeline.map(day => {
                            const weekend = isWeekend(day);
                            const today = isToday(day);
                            return (
                              <div key={day.toString()} className={cn(
                                "text-center text-xs border-r relative flex flex-col justify-center",
                                weekend && "bg-zinc-100 dark:bg-zinc-900/40",
                                today && "bg-primary text-primary-foreground font-bold"
                              )}>
                                <div>{format(day, 'dd')}</div>
                                <div className={cn(today ? "text-primary-foreground" : "text-muted-foreground")}>{format(day, 'E')}</div>
                              </div>
                            );
                        })}
                    </div>
                  </div>
                </div>

                <div style={{ width: `${totalDays * dayWidth}px`, height: `${displayTasks.length * ROW_HEIGHT}px` }} className="relative">
                  <div className="absolute top-0 left-0 w-full h-full grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}>
                    {timeline.map((day, i) => (
                      <div key={`bg-${i}`} className={cn("border-r h-full", isWeekend(day) && "bg-zinc-100 dark:bg-zinc-900/40")}></div>
                    ))}
                  </div>
                  <div className="absolute top-0 left-0 w-full h-full">
                    {displayTasks.map((_task, i) => (
                      <div key={`row-bg-${i}`} className="border-b" style={{ height: `${ROW_HEIGHT}px` }}></div>
                    ))}
                  </div>
                  
                  <div
                      className="absolute top-0 bottom-0 w-0.5 bg-black dark:bg-slate-500 z-30"
                      style={{ left: `${dateToX(new Date()) + dayWidth / 2}px` }}
                  />

                  <svg className="absolute top-0 left-0 w-full h-full z-30 pointer-events-none">
                    {tasks.map((task) => {
                      if (task.type === 'category' || !task.start) return null;
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
                  
                  {displayTasks.map((task, index) => {
                    const pos = taskPositions.get(task.id);
                    if(!pos) return null;

                    const isDraggingThis = dragState.id === task.id && !resizeState.edge;
                    const isResizingThis = resizeState.id === task.id;
                    const vPos = getVisualPos(task.id);
                    if(!vPos) return null;
                    
                    const isCategory = task.type === 'category';
                    const barHeight = isCategory ? CATEGORY_BAR_HEIGHT : BAR_HEIGHT;
                    const topMargin = isCategory ? (ROW_HEIGHT - barHeight) / 2 : BAR_TOP_MARGIN;

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
                                "absolute rounded-md hover:brightness-110 transition-all flex items-center px-2 overflow-hidden shadow z-20",
                                isCategory ? "cursor-default" : "cursor-grab active:cursor-grabbing",
                                isDraggingThis && "opacity-90"
                                )}
                                style={{
                                top: `${pos.y + topMargin}px`,
                                left: `${vPos.left}px`,
                                width: `${vPos.right - vPos.left}px`,
                                height: `${barHeight}px`,
                                willChange: "transform,width,left",
                                backgroundColor: getTaskColor(task),
                                }}
                              >
                               <div
                                  className={cn(
                                      "absolute -left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-bl-full rounded-tl-full",
                                      isCategory ? "bg-secondary-foreground" : "bg-primary-foreground"
                                  )}
                                />
                                <span className={cn(
                                  "relative text-xs font-medium truncate z-10",
                                  isCategory ? "text-secondary-foreground" : "text-primary-foreground"
                                )}>{task.name}</span>
                                <div
                                  className={cn(
                                      "absolute -right-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-br-full rounded-tr-full",
                                      isCategory ? "bg-secondary-foreground" : "bg-primary-foreground"
                                  )}
                                />
                                
                                <div
                                  className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
                                  onPointerDown={(e)=>onLeftHandleDown(e, task)}
                                />
                                <div
                                  className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
                                  onPointerDown={(e)=>onRightHandleDown(e, task)}
                                />

                                  {!isCategory && (
                                    <>
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
                                    </>
                                  )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-card border-primary">
                              <p className="font-bold">{task.name}</p>
                              {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}
                              {pos.s && pos.e && (
                                <>
                                  <p>Start: {format(pos.s, 'MMM d, yyyy')}</p>
                                  <p>End: {format(pos.e, 'MMM d, yyyy')}</p>
                                  <p>Duration: {differenceInDays(pos.e, pos.s) + 1} day(s)</p>
                                </>
                              )}
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

    

    












    








