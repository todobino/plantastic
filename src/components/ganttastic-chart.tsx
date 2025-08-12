
'use client';

import { useMemo } from 'react';
import type { Task } from '@/types';
import { addDays, differenceInDays, format, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type GanttasticChartProps = {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
};

const DAY_WIDTH = 40; // width of a day column in pixels
const ROW_HEIGHT = 40; // height of a task row in pixels
const BAR_HEIGHT = 32; // height of a task bar
const BAR_TOP_MARGIN = (ROW_HEIGHT - BAR_HEIGHT) / 2;
const HEADER_HEIGHT = 48;

export default function GanttasticChart({ tasks, onTaskClick }: GanttasticChartProps) {
  const { projectStart, projectEnd, totalDays, timeline, taskPositions } = useMemo(() => {
    if (tasks.length === 0) {
      const today = startOfDay(new Date());
      return {
        projectStart: today,
        projectEnd: addDays(today, 30),
        totalDays: 31,
        timeline: Array.from({ length: 31 }, (_, i) => addDays(today, i)),
        taskPositions: new Map(),
      };
    }

    const startDates = tasks.map(t => startOfDay(t.start));
    const endDates = tasks.map(t => startOfDay(t.end));

    const projectStart = new Date(Math.min(...startDates.map(d => d.getTime())));
    const projectEnd = new Date(Math.max(...endDates.map(d => d.getTime())));
    const totalDays = differenceInDays(projectEnd, projectStart) + 1;

    const timeline = Array.from({ length: totalDays }, (_, i) => addDays(projectStart, i));
    
    const taskPositions = new Map<string, { x: number; y: number; width: number }>();
    tasks.forEach((task, index) => {
        const offset = differenceInDays(startOfDay(task.start), projectStart);
        const duration = differenceInDays(startOfDay(task.end), startOfDay(task.start)) + 1;
        const isOutside = offset < 0 || offset >= totalDays;

        if (isOutside) return;

        taskPositions.set(task.id, {
            x: offset * DAY_WIDTH,
            y: index * ROW_HEIGHT,
            width: duration * DAY_WIDTH,
        });
    });

    return { projectStart, projectEnd, totalDays, timeline, taskPositions };
  }, [tasks]);

  return (
    <Card className="w-full h-full overflow-hidden flex flex-col shadow-lg border-2">
      <CardHeader>
        <CardTitle>Project Timeline</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex overflow-hidden">
        <div className="grid grid-cols-12 w-full h-full">
          {/* Task List */}
          <div className="col-span-3 border-r pr-2 overflow-y-auto">
            <div style={{ height: `${HEADER_HEIGHT}px`}} className="sticky top-0 bg-card z-10 py-2 font-semibold text-sm flex items-end pb-3">Task Name</div>
            <div style={{ height: `${tasks.length * ROW_HEIGHT}px`}} className='relative'>
              {tasks.map((task, index) => (
                <div key={task.id} style={{top: `${index * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px`}} className="absolute w-full text-sm p-2 rounded-md hover:bg-secondary transition-colors truncate cursor-pointer flex items-center border-b" onClick={() => onTaskClick(task)}>
                  {task.name}
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Timeline */}
          <div className="col-span-9 overflow-auto">
             <div className="relative">
              <div style={{ width: `${totalDays * DAY_WIDTH}px`, height: `${HEADER_HEIGHT}px` }} className="sticky top-0 bg-card z-20 grid" style={{ gridTemplateColumns: `repeat(${totalDays}, ${DAY_WIDTH}px)` }}>
                {timeline.map(day => (
                  <div key={day.toString()} className="text-center text-xs py-2 border-r border-b">
                    <div>{format(day, 'dd')}</div>
                    <div className="text-muted-foreground">{format(day, 'E')}</div>
                  </div>
                ))}
              </div>

              <div style={{ width: `${totalDays * DAY_WIDTH}px`, height: `${tasks.length * ROW_HEIGHT}px` }} className="relative">
                {/* Grid Background */}
                <div className="absolute top-0 left-0 w-full h-full grid" style={{ gridTemplateColumns: `repeat(${totalDays}, ${DAY_WIDTH}px)` }}>
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
