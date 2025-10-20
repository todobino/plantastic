
import {
  useRef,
  useState,
  useCallback,
  PointerEvent as ReactPointerEvent,
  useEffect,
} from "react";
import {
  cn,
  isWeekend,
  HEADER_HEIGHT,
  ROW_HEIGHT,
  DAY_ROW_HEIGHT,
  MONTH_ROW_HEIGHT,
  BAR_HEIGHT,
  BAR_TOP_MARGIN,
  CATEGORY_BAR_HEIGHT,
  hexToRgba,
} from "@/lib/utils";
import { Task } from "@/types";
import { addDays, differenceInDays, format, isToday, startOfDay } from "date-fns";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Button } from "./ui/button";

type TimelineCalendarViewProps = {
  timeline: Date[];
  totalDays: number;
  dayWidth: number;
  headerGroups: { label: string; days: number, startDay: Date }[];
  displayTasks: (Task & { milestone?: string })[];
  tasks: Task[];
  taskPositions: Map<
    string,
    { x: number; y: number; width: number; s: Date; e: Date }
  >;
  onBarPointerDown: (e: ReactPointerEvent<HTMLDivElement>, task: Task, currentLeftPx: number) => void;
  onBarPointerMove: (e: ReactPointerEvent<HTMLDivElement>, task: Task) => void;
  onBarPointerUp: (e: ReactPointerEvent<HTMLDivElement>, task: Task) => void;
  onResizeMove: (e: ReactPointerEvent<HTMLDivElement>, task: Task) => void;
  onResizeUp: (e: ReactPointerEvent<HTMLDivElement>, task: Task) => void;
  handleBarClick: (task: Task) => void;
  onLeftHandleDown: (e: ReactPointerEvent, task: Task) => void;
  onRightHandleDown: (e: ReactPointerEvent, task: Task) => void;
  getVisualPos: (id: string) => { left: number; right: number; cy: number } | null;
  getTaskColor: (task: Task) => string;
  dateToX: (d: Date) => number;
  routeFS: (sx: number, sy: number, tx: number, ty: number) => string;
  isResizingThis: (task: Task) => boolean;
  isDraggingThis: (task: Task) => boolean;
  timelineRef: React.RefObject<HTMLDivElement>;
  onTodayClick: () => void;
};

export function TimelineCalendarView({
  timeline,
  totalDays,
  dayWidth,
  headerGroups,
  displayTasks,
  tasks,
  taskPositions,
  onBarPointerDown,
  onBarPointerMove,
  onBarPointerUp,
  onResizeMove,
  onResizeUp,
  handleBarClick,
  onLeftHandleDown,
  onRightHandleDown,
  getVisualPos,
  getTaskColor,
  dateToX,
  routeFS,
isResizingThis,
  isDraggingThis,
  timelineRef,
  onTodayClick
}: TimelineCalendarViewProps) {
  const [panState, setPanState] = useState<{
    isPanning: boolean;
    startX: number;
    startScrollLeft: number;
  }>({ isPanning: false, startX: 0, startScrollLeft: 0 });

  const monthLabelsContainerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const scroller = timelineRef.current;
    if (!scroller) return;

    const handleScroll = () => {
      setScrollLeft(scroller.scrollLeft);
    };

    scroller.addEventListener('scroll', handleScroll);
    return () => scroller.removeEventListener('scroll', handleScroll);
  }, [timelineRef]);


  const handlePanStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    if ((e.target as HTMLElement).closest("[data-task-bar=\"true\"]") || (e.target as HTMLElement).closest("[data-today-button]")) return;

    e.preventDefault();
    e.stopPropagation();
    document.body.style.cursor = "grabbing";
    setPanState({
      isPanning: true,
      startX: e.clientX,
      startScrollLeft: timelineRef.current.scrollLeft,
    });
  };

  const handlePanMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!panState.isPanning || !timelineRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const x = e.clientX;
    const walk = x - panState.startX;
    timelineRef.current.scrollLeft = panState.startScrollLeft - walk;
  };

  const handlePanEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!panState.isPanning) return;
    document.body.style.cursor = "default";
    setPanState({ isPanning: false, startX: 0, startScrollLeft: 0 });
  };
  
  const countTasksInCategory = (categoryId: string, allTasks: Task[]): number => {
    let count = 0;
    const children = allTasks.filter(t => t.parentId === categoryId);
    for (const child of children) {
      if (child.type === 'task') {
        count++;
      } else if (child.type === 'category') {
        count += countTasksInCategory(child.id, allTasks);
      }
    }
    return count;
  };


  return (
    <div ref={timelineRef} className="col-span-9 overflow-auto relative">
      <div
        className={cn("relative", panState.isPanning && "cursor-grabbing")}
        onPointerDown={handlePanStart}
        onPointerMove={handlePanMove}
        onPointerUp={handlePanEnd}
        onPointerLeave={handlePanEnd}
        onPointerCancel={handlePanEnd}
      >
        <div
          style={{ width: `${totalDays * dayWidth}px`, height: `${HEADER_HEIGHT}px` }}
          className="sticky top-0 bg-background z-40"
        >
          <Button
              data-today-button
              onClick={onTodayClick}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 py-1 h-auto"
              style={{top: `calc(${MONTH_ROW_HEIGHT / 2}px)`}}
          >
            Today
          </Button>
          <div className="relative h-full" ref={monthLabelsContainerRef}>
            <div
              className="flex relative border-b"
              style={{ height: `${MONTH_ROW_HEIGHT}px`, paddingLeft: "100px" }}
            >
              {headerGroups.map((group, index) => {
                const groupStartX = dateToX(group.startDay);
                
                return (
                  <div
                    key={index}
                    className="font-semibold text-sm flex items-center justify-center h-full absolute top-0 border-r"
                    style={{
                        left: `${groupStartX}px`,
                        width: `${group.days * dayWidth}px`,
                    }}
                  >
                    <span 
                      className="truncate bg-secondary text-secondary-foreground rounded-md px-2 py-1"
                    >
                      {group.label}
                    </span>
                  </div>
                )
              })}
            </div>
            <div
              className="grid border-b"
              style={{
                gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)`,
                height: `${DAY_ROW_HEIGHT}px`,
              }}
            >
              {timeline.map((day) => {
                const weekend = isWeekend(day);
                const today = isToday(day);
                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "text-center text-xs border-r relative flex flex-col justify-center",
                      weekend && "bg-zinc-100 dark:bg-zinc-900/40",
                      today && "bg-primary text-primary-foreground font-bold"
                    )}
                  >
                    <div>{format(day, "dd")}</div>
                    <div
                      className={cn(
                        today ? "text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {format(day, "E")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div
          style={{
            width: `${totalDays * dayWidth}px`,
            height: `${displayTasks.length * ROW_HEIGHT}px`,
          }}
          className="relative"
        >
          <div
            className="absolute top-0 left-0 w-full h-full grid pointer-events-none"
            style={{ gridTemplateColumns: `repeat(${totalDays}, ${dayWidth}px)` }}
          >
            {timeline.map((day, i) => (
              <div
                key={`bg-${i}`}
                className={cn(
                  "border-r h-full",
                  isWeekend(day) && "bg-zinc-100 dark:bg-zinc-900/40"
                )}
              ></div>
            ))}
          </div>
          <div className="absolute top-0 left-0 w-full h-full">
            {displayTasks.map((_task, i) => (
              <div
                key={`row-bg-${i}`}
                className="border-b"
                style={{ height: `${ROW_HEIGHT}px` }}
              ></div>
            ))}
          </div>

          <div
            className="absolute top-0 bottom-0 w-0.5 bg-black dark:bg-slate-500 z-30"
            style={{ left: `${dateToX(new Date()) + dayWidth / 2}px` }}
          />

          <svg className="absolute top-0 left-0 w-full h-full z-30 pointer-events-none">
            {tasks.map((task) => {
              if (task.type === "category" || !task.start) return null;
              const toV = getVisualPos(task.id);
              if (!toV) return null;

              const deps = Array.from(
                new Set(task.dependencies.filter((d) => d !== task.id))
              );

              return deps.map((depId) => {
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
          </svg>

          {displayTasks.map((task) => {
            const pos = taskPositions.get(task.id);
            if (!pos) return null;

            const vPos = getVisualPos(task.id);
            if (!vPos) return null;
            
            const isPlaceholder = task.id === 'placeholder';

            const isCategory = task.type === "category";
            const barHeight = isCategory ? CATEGORY_BAR_HEIGHT : BAR_HEIGHT;
            const topMargin = isCategory
              ? (ROW_HEIGHT - barHeight) / 2
              : BAR_TOP_MARGIN;
            
            const categoryStyle = isCategory && task.color ? {
                backgroundColor: hexToRgba(task.color, 0.15),
                color: task.color,
                border: `2px solid ${task.color}`
            } : {
                backgroundColor: getTaskColor(task),
                color: isCategory ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--primary-foreground))'
            };


            return (
              <TooltipProvider key={task.id} delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      data-task-bar="true"
                      onPointerDown={(e) => onBarPointerDown(e, task, pos.x)}
                      onPointerMove={(e) => {
                        isResizingThis(task)
                          ? onResizeMove(e, task)
                          : onBarPointerMove(e, task);
                      }}
                      onPointerUp={(e) => {
                        isResizingThis(task)
                          ? onResizeUp(e, task)
                          : onBarPointerUp(e, task);
                      }}
                      onPointerCancel={(e) => {
                        isResizingThis(task)
                          ? onResizeUp(e, task)
                          : onBarPointerUp(e, task);
                      }}
                      onClick={() => handleBarClick(task)}
                      className={cn(
                        "absolute rounded-md hover:brightness-110 transition-all flex items-center px-2 overflow-hidden shadow z-20",
                        isCategory
                          ? "cursor-default"
                          : "cursor-grab active:cursor-grabbing",
                        isDraggingThis(task) && "opacity-90",
                        isPlaceholder && "opacity-50 border-dashed border-2 border-muted-foreground bg-transparent"
                      )}
                      style={{
                        top: `${pos.y + topMargin}px`,
                        left: `${vPos.left}px`,
                        width: `${vPos.right - vPos.left}px`,
                        height: `${barHeight}px`,
                        willChange: "transform,width,left",
                        ...(!isPlaceholder && categoryStyle),
                      }}
                    >
                      {!isCategory && !isPlaceholder && <div
                        className={cn(
                          "absolute -left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-bl-full rounded-tl-full",
                          "bg-primary-foreground"
                        )}
                      />}
                      <span
                        className={cn(
                          "relative text-xs font-semibold truncate z-10",
                          isCategory && 'font-semibold',
                          isPlaceholder && "text-muted-foreground"
                        )}
                      >
                        {task.name}
                      </span>
                      {!isCategory && !isPlaceholder && <div
                        className={cn(
                          "absolute -right-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-br-full rounded-tr-full",
                          "bg-primary-foreground"
                        )}
                      />}

                      {!isPlaceholder && <div
                        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
                        onPointerDown={(e) => onLeftHandleDown(e, task)}
                      />}
                      {!isPlaceholder && <div
                        className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
                        onPointerDown={(e) => onRightHandleDown(e, task)}
                      />}

                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-card border">
                    <p className="font-bold">{task.name}</p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                    {pos.s && pos.e && (
                      <>
                        <p>Start: {format(pos.s, "MMM d, yyyy")}</p>
                        <p>End: {format(pos.e, "MMM d, yyyy")}</p>
                        <p>
                          Duration: {differenceInDays(pos.e, pos.s) + 1} day(s)
                        </p>
                      </>
                    )}
                    {task.type === 'category' && (
                        <p>Tasks: {countTasksInCategory(task.id, tasks)}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>
    </div>
  );
}
