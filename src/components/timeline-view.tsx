
'use client';

import { useMemo, useState, useRef, useCallback, useEffect, PointerEvent as ReactPointerEvent } from 'react';
import type { Task, Milestone, Project, TeamMember } from '@/types';
import { addDays, differenceInDays, format, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from 'date-fns';
import AppHeader from "./app-header";
import { TimelineTaskList, DraggableTaskRow, TaskRow } from './timeline-task-list';
import { TimelineCalendarView } from './timeline-calendar-view';
import { ListView } from './list-view';
import { Button } from './ui/button';
import { MONTH_ROW_HEIGHT } from '@/lib/utils';
import TeamView from './team-view';
import { DndContext, DragOverlay, closestCenter, MouseSensor, TouchSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';


const ROW_HEIGHT = 40; 
const BAR_HEIGHT = 28;

type TimelineViewProps = {
    tasks: Task[];
    setTasks: (tasks: Task[]) => void;
    project: Project;
    teamMembers: TeamMember[];
    setTeamMembers: (teamMembers: TeamMember[]) => void;
    onTaskClick: (task: Task) => void;
    onAddTaskClick: () => void;
    onAddCategoryClick: () => void;
    onProjectUpdate: (project: Project) => void;
    onReorderTasks: (reorderedTasks: Task[]) => void;
    onTaskUpdate: (task: Task) => void;
    onQuickAddTask: (categoryId: string, taskName: string, duration: number) => void;
    onAssigneeClick: (member: TeamMember) => void;
};


export default function TimelineView({ tasks, setTasks, project, teamMembers, setTeamMembers, onTaskClick, onAddTaskClick, onAddCategoryClick, onProjectUpdate, onReorderTasks, onTaskUpdate, onQuickAddTask, onAssigneeClick }: TimelineViewProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const wasDraggedRef = useRef(false);
  const wasResizedRef = useRef(false);
  const [view, setView] = useState<'timeline' | 'list' | 'team'>('timeline');
  const [openQuickAddId, setOpenQuickAddId] = useState<string | null>(null);
  const [placeholderTask, setPlaceholderTask] = useState<Task | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [currentMonthLabel, setCurrentMonthLabel] = useState('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeTaskIndex, setActiveTaskIndex] = useState(-1);

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
  
  const dragging = dragState.id !== null;

  const displayTasks = useMemo(() => {
    const flatList: Task[] = [];
    const allTasks = placeholderTask ? [...tasks, placeholderTask] : tasks;
    const taskMap = new Map(allTasks.map(t => [t.id, t]));

    // Use a stable sort that respects the current order for tasks with same start date
    const sortedMap = new Map<string | null, Task[]>();
    allTasks.forEach(task => {
        const parentId = task.parentId || null;
        if (!sortedMap.has(parentId)) {
            sortedMap.set(parentId, []);
        }
        sortedMap.get(parentId)!.push(task);
    });

    const addTaskRecursive = (task: Task, level: number) => {
        flatList.push({ ...task, milestone: `${level}` }); 
        if (task.type === 'category' && task.isExpanded) {
            const children = sortedMap.get(task.id) || [];
            children.forEach(child => addTaskRecursive(child, level + 1));
        }
    }

    const topLevelTasks = sortedMap.get(null) || [];
    topLevelTasks.forEach(task => addTaskRecursive(task, 0));

    return flatList;
  }, [tasks, placeholderTask]);

  const { dayWidth, projectStart, projectEnd, totalDays, timeline, taskPositions, getHeaderGroups } = useMemo(() => {
    const today = startOfDay(new Date());
    let viewStartDate: Date;
    let viewEndDate: Date;

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

    const allTasksWithDates = tasks.map(t => {
      if (t.type === 'category') {
        const { start, end } = getCategoryDates(t.id);
        return { ...t, start, end };
      }
      return t;
    }).filter(t => t.start && t.end);

    let effectiveProjectStart = project.startDate;
    let effectiveProjectEnd = project.endDate;

    if (!effectiveProjectStart || !effectiveProjectEnd) {
      if (allTasksWithDates.length > 0) {
        effectiveProjectStart = new Date(Math.min(...allTasksWithDates.map(t => t.start!.getTime())));
        effectiveProjectEnd = new Date(Math.max(...allTasksWithDates.map(t => t.end!.getTime())));
      } else {
        effectiveProjectStart = startOfMonth(today);
        effectiveProjectEnd = endOfMonth(today);
      }
    }
    
    viewStartDate = subDays(effectiveProjectStart, 7);
    viewEndDate = addDays(effectiveProjectEnd, 7);

    const dayWidth = 40;

    const timeline = eachDayOfInterval({ start: viewStartDate, end: viewEndDate });
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
            const offset = differenceInDays(startOfDay_s, viewStartDate);
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
        const groups: { label: string, days: number, startDay: Date }[] = [];
        if (timeline.length === 0) return groups;

        let currentMonth = -1;
        let currentGroup: { label: string, days: number, startDay: Date } | null = null;

        timeline.forEach((day) => {
            const month = day.getMonth();
            if (month !== currentMonth) {
                if (currentGroup) {
                    groups.push(currentGroup);
                }
                currentMonth = month;
                currentGroup = {
                    label: format(day, 'MMMM yyyy'),
                    days: 1,
                    startDay: day,
                };
            } else if (currentGroup) {
                currentGroup.days++;
            }
        });
        if (currentGroup) {
            groups.push(currentGroup);
        }
        return groups;
    }

    return { dayWidth, projectStart: viewStartDate, projectEnd: viewEndDate, totalDays, timeline, taskPositions, getHeaderGroups };
  }, [tasks, project.startDate, project.endDate, displayTasks]);

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

  const dateToX = useCallback((d: Date) => {
    if (!timeline || timeline.length === 0) return 0;
    return differenceInDays(startOfDay(d), startOfDay(timeline[0])) * pxPerDay;
  }, [timeline, pxPerDay]);

  const xToDayDelta = (xPx: number) => Math.round(xPx / pxPerDay);

  const successorsById = useMemo(() => {
    const m = new Map<string, string[]>();
    tasks.forEach(t => {
      (t.dependencies || []).forEach(dep => {
        if (!m.has(dep)) m.set(dep, []);
        m.get(dep)!.push(t.id);
      });
    });
    return m;
  }, [tasks]);

  const minStartAllowed = (task: Task) => {
    if (!task.dependencies || task.dependencies.length === 0) return null;
    const latestPredEnd = new Date(Math.max(...task.dependencies
      .map(id => tasks.find(t => t.id === id))
      .filter((t): t is Task => !!t && !!t.end)!.map(t => startOfDay((t as Task).end!).getTime())));
    return addDays(startOfDay(latestPredEnd), 1);
  };
    
  const onBarPointerDown = (e: React.PointerEvent<HTMLDivElement>, task: Task, currentLeftPx: number) => {
    if(task.type === 'category' || task.id === 'placeholder') return;
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
    const isResizing = !!resizeState.id;
    if (isResizing) {
      onResizeUp(e, task);
      return;
    }
    
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
    if (!wasDraggedRef.current && !wasResizedRef.current) {
        if(task.id === 'placeholder') return;
        onTaskClick(task);
    }
    wasResizedRef.current = false;
  }

  const onLeftHandleDown = (e: React.PointerEvent, task: Task) => {
    e.stopPropagation();
    if(task.type === 'category' || task.id === 'placeholder') return;
    wasResizedRef.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    setResizeState({ id: task.id, edge: 'left', startX: e.clientX });
  };

  const onRightHandleDown = (e: React.PointerEvent, task: Task) => {
    e.stopPropagation();
    if(task.type === 'category' || task.id === 'placeholder') return;
    wasResizedRef.current = true;
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
    setTimeout(() => { wasResizedRef.current = false; }, 0);
  };

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
  
        const latestPredEnd = new Date(Math.max(...(vTask.dependencies || []).map(pId => {
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
  }, [dragging, resizeState.id, resizeState.edge, dragState.previewDeltaPx, tasks, taskPositions, pxPerDay, successorsById, minStartAllowed, dateToX]);
  
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
    
    const task = displayTasks.find(t => t.id === id);
    const isCategory = task?.type === 'category';

    const barHeight = isCategory ? 14 : BAR_HEIGHT;
    const topMargin = isCategory ? (ROW_HEIGHT - 14) / 2 : (ROW_HEIGHT - BAR_HEIGHT) / 2;
    const cy = p.y + topMargin + barHeight / 2;

    return { left, right: left + width, cy };
  };

  const handleTodayClick = useCallback(() => {
    const scroller = timelineRef.current;
    if (!scroller || !timeline || timeline.length === 0) return;

    const todayX = dateToX(new Date());
    const scrollerWidth = scroller.clientWidth;
    
    const scrollTo = todayX - (scrollerWidth / 2) + (dayWidth / 2);
    
    scroller.scrollTo({
      left: scrollTo,
      behavior: 'smooth'
    });
  }, [dateToX, dayWidth, timeline]);
  
  useEffect(() => {
    const scroller = timelineRef.current;
    if (scroller) {
        const todayX = dateToX(new Date());
        const scrollerWidth = scroller.clientWidth;
        const scrollTo = todayX - scrollerWidth / 2 + dayWidth / 2;
        scroller.scrollTo({ left: scrollTo, behavior: 'auto' });
    }
  }, [project.id, dateToX, dayWidth]);
  
  const toggleCategory = (categoryId: string) => {
    setTasks(tasks.map(t => 
        t.id === categoryId ? { ...t, isExpanded: !t.isExpanded } : t
    ));
  }
  
  const getTaskColor = useCallback((task: Task) => {
    if (task.id === 'placeholder') {
        return 'hsl(var(--muted-foreground))';
    }
    if (task.type === 'category') {
        return task.color || 'hsl(var(--secondary))';
    }
    if (task.parentId) {
        const parent = tasks.find(t => t.id === task.parentId);
        return parent?.color || 'hsl(var(--primary))';
    }
    return 'hsl(var(--primary))';
  }, [tasks]);

  
  const handleSetOpenQuickAddId = (id: string | null) => {
    if (id) {
        const categoryTasks = tasks.filter(t => t.parentId === id && t.type === 'task' && t.end);
        const lastTask = categoryTasks.sort((a, b) => b.end!.getTime() - a.end!.getTime())[0];
        
        const startDate = lastTask ? addDays(startOfDay(lastTask.end!), 1) : startOfDay(new Date());
        const endDate = addDays(startDate, 0);

        setPlaceholderTask({
            id: 'placeholder',
            name: 'New Task',
            start: startDate,
            end: endDate,
            dependencies: [],
            type: 'task',
            parentId: id,
        });

    } else {
        setPlaceholderTask(null);
    }
    setOpenQuickAddId(id);
  }
  
  const handleQuickAddTask = (categoryId: string, taskName: string, duration: number) => {
    setPlaceholderTask(null);
    onQuickAddTask(categoryId, taskName, duration);
  };

  const handleTimelineScroll = useCallback((scrollLeft: number) => {
    const scroller = timelineRef.current;
    if (!scroller || !timeline || timeline.length === 0) return;

    const scrollOffset = 200; // This should be a bit less than the task list width
    const centerDate = addDays(timeline[0], (scrollLeft + scrollOffset) / dayWidth);
    const newLabel = format(centerDate, 'MMMM yyyy');

    if (newLabel !== currentMonthLabel) {
      setCurrentMonthLabel(newLabel);
    }
  }, [timeline, dayWidth, currentMonthLabel]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = displayTasks.find(t => t.id === active.id);
    if (task) {
      setActiveTask(task);
      setActiveTaskIndex(displayTasks.findIndex(t => t.id === active.id));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    setActiveTaskIndex(-1);
    const { active, over } = event;
  
    if (!over || active.id === over.id) {
      return;
    }
  
    const activeTask = tasks.find(t => t.id === active.id);
    const overTask = tasks.find(t => t.id === over.id);
    
    if (!activeTask || !overTask) return;

    const oldIndexInFull = tasks.findIndex(t => t.id === active.id);
    const newIndexInFull = tasks.findIndex(t => t.id === over.id);

    const reorderedTasks = arrayMove(tasks, oldIndexInFull, newIndexInFull);
    
    const overTaskInDisplay = displayTasks.find(t => t.id === over.id);
    const activeTaskInDisplay = displayTasks.find(t => t.id === active.id);

    let newParentId = activeTaskInDisplay?.parentId || null;
    
    if (overTaskInDisplay?.type === 'category') {
        newParentId = overTaskInDisplay.id;
    } else {
        newParentId = overTaskInDisplay?.parentId || null;
    }

    const finalTasks = reorderedTasks.map(t => {
      if (t.id === active.id) {
        return { ...t, parentId: newParentId };
      }
      return t;
    });

    onReorderTasks(finalTasks);
  };
  
  const taskNumbering = useMemo(() => {
    const numbering = new Map<string, number>();
    let taskCounter = 1;
    displayTasks.forEach((task) => {
      if (task.type === 'task') {
        numbering.set(task.id, taskCounter++);
      }
    });
    return numbering;
  }, [displayTasks]);



  const renderCurrentView = () => {
    switch (view) {
        case 'timeline':
            if (!timeline || timeline.length === 0) return null;
            return (
                <div className="relative w-full h-full grid grid-cols-[300px_1fr] overflow-hidden">
                    <div className="flex flex-col h-full overflow-hidden">
                        <DndContext 
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            modifiers={[restrictToVerticalAxis]}
                        >
                            <SortableContext items={displayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                                <TimelineTaskList 
                                    displayTasks={displayTasks}
                                    onAddTaskClick={onAddTaskClick}
                                    onAddCategoryClick={onAddCategoryClick}
                                    toggleCategory={toggleCategory}
                                    onTaskClick={onTaskClick}
                                    getTaskColor={getTaskColor}
                                    onQuickAddTask={handleQuickAddTask}
                                    openQuickAddId={openQuickAddId}
                                    setOpenQuickAddId={handleSetOpenQuickAddId}
                                    taskNumbering={taskNumbering}
                                />
                            </SortableContext>
                            <DragOverlay>
                              {activeTask && (
                                  <TaskRow
                                      task={activeTask}
                                      onTaskClick={() => {}}
                                      toggleCategory={() => {}}
                                      getTaskColor={getTaskColor}
                                      onQuickAddTask={() => {}}
                                      openQuickAddId={null}
                                      setOpenQuickAddId={() => {}}
                                      isOverlay
                                      taskNumbering={taskNumbering}
                                  />
                              )}
                            </DragOverlay>
                        </DndContext>
                    </div>
                    <TimelineCalendarView 
                        timeline={timeline}
                        totalDays={totalDays}
                        dayWidth={dayWidth}
                        headerGroups={headerGroups}
                        displayTasks={displayTasks}
                        tasks={tasks}
                        taskPositions={taskPositions}
                        onBarPointerDown={onBarPointerDown}
                        onBarPointerMove={onBarPointerMove}
                        onBarPointerUp={onBarPointerUp}
                        onResizeMove={onResizeMove}
                        onResizeUp={onResizeUp}
                        handleBarClick={handleBarClick}
                        onLeftHandleDown={onLeftHandleDown}
                        onRightHandleDown={onRightHandleDown}
                        getVisualPos={getVisualPos}
                        getTaskColor={getTaskColor}
                        routeFS={routeFS}
                        isResizingThis={(task: Task) => resizeState.id === task.id}
                        isDraggingThis={(task: Task) => dragState.id === task.id && !resizeState.edge}
                        timelineRef={timelineRef}
                        onTodayClick={handleTodayClick}
                        hoveredTaskId={hoveredTaskId}
                        setHoveredTaskId={setHoveredTaskId}
                        currentMonthLabel={currentMonthLabel}
                        onScroll={handleTimelineScroll}
                    />
                </div>
            );
        case 'list':
            return <ListView tasks={tasks} teamMembers={teamMembers} onTaskClick={onTaskClick} onAssigneeClick={onAssigneeClick} taskNumbering={taskNumbering} />;
        case 'team':
            return <TeamView teamMembers={teamMembers} setTeamMembers={setTeamMembers} tasks={tasks} onTaskUpdate={onTaskUpdate} onTaskClick={onTaskClick} />;
        default:
            return null;
    }
  }


  return (
    <div className="w-full h-full flex flex-col">
      <AppHeader
        project={project}
        onProjectUpdate={onProjectUpdate}
        view={view}
        onViewChange={setView}
      />
      <div className="flex-grow flex overflow-hidden relative">
        {renderCurrentView()}
      </div>
    </div>
  );
}
