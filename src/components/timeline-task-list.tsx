
import {
  ChevronDown,
  ChevronRight,
  CirclePlus,
  CornerDownRight,
  DiamondPlus,
  FolderPlus,
  GripVertical,
  Pencil,
  Plus,
} from "lucide-react";
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";
import { Button } from "./ui/button";
import { hexToRgba, cn, HEADER_HEIGHT, MONTH_ROW_HEIGHT, DAY_ROW_HEIGHT, ROW_HEIGHT } from "@/lib/utils";
import { Task } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import QuickTaskForm from "./quick-task-form";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type TimelineTaskListProps = {
  displayTasks: (Task & { milestone?: string })[];
  onAddTaskClick: () => void;
  onAddCategoryClick: () => void;
  toggleCategory: (id: string) => void;
  onTaskClick: (task: Task) => void;
  getTaskColor: (task: Task) => string;
  onQuickAddTask: (categoryId: string, taskName: string, duration: number) => void;
  openQuickAddId: string | null;
  setOpenQuickAddId: (id: string | null) => void;
  isOverlay?: boolean;
};

export function DraggableTaskRow({ task, index, onTaskClick, toggleCategory, getTaskColor, openQuickAddId, setOpenQuickAddId, onQuickAddTask }: {
    task: Task;
    index: number;
    onTaskClick: (task: Task) => void;
    toggleCategory: (id: string) => void;
    getTaskColor: (task: Task) => string;
    onQuickAddTask: (categoryId: string, taskName: string, duration: number) => void;
    openQuickAddId: string | null;
    setOpenQuickAddId: (id: string | null) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: 'task', task } });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    return (
        <div ref={setNodeRef} style={style} className={cn("touch-none", isDragging && "opacity-0")}>
            <TaskRow 
              task={task} 
              index={index}
              onTaskClick={onTaskClick}
              toggleCategory={toggleCategory}
              getTaskColor={getTaskColor}
              onQuickAddTask={onQuickAddTask}
              openQuickAddId={openQuickAddId}
              setOpenQuickAddId={setOpenQuickAddId}
              dragAttributes={attributes} 
              dragListeners={listeners} />
        </div>
    );
}

export function TaskRow({
  task,
  index,
  onTaskClick,
  toggleCategory,
  getTaskColor,
  onQuickAddTask,
  openQuickAddId,
  setOpenQuickAddId,
  isOverlay = false,
  dragAttributes,
  dragListeners,
}: {
  task: Task & { milestone?: string };
  index: number;
  onTaskClick: (task: Task) => void;
  toggleCategory: (id: string) => void;
  getTaskColor: (task: Task) => string;
  onQuickAddTask: (categoryId: string, taskName: string, duration: number) => void;
  openQuickAddId: string | null;
  setOpenQuickAddId: (id: string | null) => void;
  isOverlay?: boolean;
  dragAttributes?: any;
  dragListeners?: any;
}) {
    const level = parseInt(task.milestone || "0", 10);
    const isCategory = task.type === "category";

    return (
        <div
            style={{ height: `${ROW_HEIGHT}px` }}
            className={cn(
                "group/task-row w-full text-sm flex items-center border-b",
                isOverlay && "bg-background shadow-xl"
            )}
        >
            <div
                style={{width: `${DAY_ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px`}}
                className="flex-shrink-0 text-center text-muted-foreground border-r h-full flex items-center justify-center group/handle"
            >
                {isCategory ? (
                    <div className="p-1 cursor-pointer hover:bg-secondary rounded-md" onClick={(e) => { e.stopPropagation(); toggleCategory(task.id); }}>
                        {task.isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </div>
                ) : (
                    <span {...dragListeners} {...dragAttributes} className={cn("w-full h-full flex items-center justify-center cursor-grab", isOverlay && "cursor-grabbing")}>
                        <span className="group-hover/handle:hidden">{index + 1}</span>
                        <GripVertical className="h-5 w-5 text-muted-foreground hidden group-hover/handle:block" />
                    </span>
                )}
            </div>
            <div
            className={cn(
                "flex-grow h-full cursor-pointer pr-2 group-hover/task-row:bg-secondary",
                !isCategory && !task.parentId && "pl-4",
                isCategory && "pl-4"
            )}
            onClick={() => onTaskClick(task)}
            >
            <div
                className="flex items-center gap-2 h-full"
                style={!isCategory && level > 0 ? { paddingLeft: `${level * 1.5}rem` } : undefined}
            >
                {!isCategory && level > 0 && (
                <CornerDownRight
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: getTaskColor(task) }}
                />
                )}

                {isCategory ? (
                <span
                    className="px-2 py-0.5 rounded-md font-semibold"
                    style={{
                    color: task.color || "hsl(var(--foreground))",
                    backgroundColor: task.color
                        ? hexToRgba(task.color, 0.15)
                        : "transparent",
                    }}
                >
                    {task.name}
                </span>
                ) : (
                <span className="truncate flex-1">{task.name}</span>
                )}
                {isCategory && !isOverlay ? (
                    <Popover open={openQuickAddId === task.id} onOpenChange={(isOpen) => setOpenQuickAddId(isOpen ? task.id : null)}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-auto opacity-0 group-hover/task-row:opacity-100"
                            onClick={(e) => {
                                e.stopPropagation();
                            }}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" className="w-80" onClick={(e) => e.stopPropagation()}>
                        <QuickTaskForm 
                            categoryId={task.id}
                            onAddTask={onQuickAddTask} 
                            onClose={() => setOpenQuickAddId(null)}
                        />
                    </PopoverContent>
                </Popover>
                ) : !isOverlay && (
                <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover/task-row:opacity-100 ml-auto" />
                )}
            </div>
            </div>
        </div>
    );
}

export function TimelineTaskList({
  displayTasks,
  onAddTaskClick,
  onAddCategoryClick,
  toggleCategory,
  onTaskClick,
  getTaskColor,
  onQuickAddTask,
  openQuickAddId,
  setOpenQuickAddId,
}: TimelineTaskListProps) {
  return (
    <div className="border-r shadow-md z-20 bg-background">
      <div
        style={{ height: `${HEADER_HEIGHT}px` }}
        className="sticky top-0 bg-background z-40 flex flex-col border-b"
      >
        <div
          style={{ height: `${MONTH_ROW_HEIGHT}px` }}
          className="flex items-center justify-between p-4 border-b"
        >
          <span className="font-semibold text-sm">Tasks</span>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onAddTaskClick}
                  >
                    <CirclePlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>New Task</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onAddCategoryClick}
                  >
                    <FolderPlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>New Category</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {}}
                  >
                    <DiamondPlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>New Milestone</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div
          style={{ height: `${DAY_ROW_HEIGHT}px` }}
          className="flex items-center text-xs font-medium text-muted-foreground"
        >
          <div style={{width: `${DAY_ROW_HEIGHT}px`, height: `${DAY_ROW_HEIGHT}px`}} className="flex-shrink-0 text-center border-r h-full flex items-center justify-center">
            #
          </div>
          <div className="flex-grow text-left h-full flex items-center justify-start pl-2">
            Name
          </div>
        </div>
      </div>
      <div className="relative">
        {displayTasks.map((task, index) => (
            <DraggableTaskRow 
                key={task.id}
                task={task}
                index={index}
                onTaskClick={onTaskClick}
                toggleCategory={toggleCategory}
                getTaskColor={getTaskColor}
                onQuickAddTask={onQuickAddTask}
                openQuickAddId={openQuickAddId}
                setOpenQuickAddId={setOpenQuickAddId}
            />
        ))}
      </div>
    </div>
  );
}
