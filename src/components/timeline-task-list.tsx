
import {
  ChevronDown,
  ChevronRight,
  CirclePlus,
  CornerDownRight,
  DiamondPlus,
  FolderPlus,
  Pencil,
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

type TimelineTaskListProps = {
  displayTasks: (Task & { milestone?: string })[];
  justTasks: Task[];
  onAddTaskClick: () => void;
  onAddCategoryClick: () => void;
  toggleCategory: (id: string) => void;
  onTaskClick: (task: Task) => void;
  getTaskColor: (task: Task) => string;
};

export function TimelineTaskList({
  displayTasks,
  justTasks,
  onAddTaskClick,
  onAddCategoryClick,
  toggleCategory,
  onTaskClick,
  getTaskColor,
}: TimelineTaskListProps) {
  return (
    <div className="col-span-3 border-r overflow-y-auto shadow-md z-20">
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
            ID
          </div>
          <div className="flex-grow text-center h-full flex items-center justify-center">
            Name
          </div>
        </div>
      </div>
      <div className="relative">
        {displayTasks.map((task) => {
          const level = parseInt(task.milestone || "0", 10);
          const isCategory = task.type === "category";
          let taskIndex = -1;
          if (!isCategory) {
            taskIndex = justTasks.findIndex((t) => t.id === task.id);
          }
          return (
            <div
              key={task.id}
              style={{ height: `${ROW_HEIGHT}px` }}
              className="group w-full text-sm flex items-center border-b"
            >
              <div
                style={{width: `${DAY_ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px`}}
                className="flex-shrink-0 text-center text-muted-foreground border-r h-full flex items-center justify-center cursor-pointer hover:bg-secondary"
                onClick={(e) => {
                  if (isCategory) {
                    e.stopPropagation();
                    toggleCategory(task.id);
                  }
                }}
              >
                {isCategory ? (
                  <div className="p-1">
                    {task.isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                ) : taskIndex > -1 ? (
                  taskIndex + 1
                ) : (
                  ""
                )}
              </div>
              <div
                className={cn(
                  "flex-grow h-full cursor-pointer pr-2 group-hover:bg-secondary",
                  isCategory ? "pl-2" : "pl-0"
                )}
                onClick={() => onTaskClick(task)}
              >
                <div
                  className="flex items-center gap-2 h-full"
                  style={!isCategory && level ? { paddingLeft: `${level * 1.5}rem` } : undefined}
                >
                  {!isCategory && (
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

                  <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 ml-auto" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
