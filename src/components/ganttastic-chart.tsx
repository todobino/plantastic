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

export default function GanttasticChart({ tasks, onTaskClick }: GanttasticChartProps) {
  const { projectStart, projectEnd, totalDays, timeline } = useMemo(() => {
    if (tasks.length === 0) {
      const today = startOfDay(new Date());
      return {
        projectStart: today,
        projectEnd: addDays(today, 30),
        totalDays: 31,
        timeline: Array.from({ length: 31 }, (_, i) => addDays(today, i)),
      };
    }

    const startDates = tasks.map(t => startOfDay(t.start));
    const endDates = tasks.map(t => startOfDay(t.end));

    const projectStart = new Date(Math.min(...startDates.map(d => d.getTime())));
    const projectEnd = new Date(Math.max(...endDates.map(d => d.getTime())));
    const totalDays = differenceInDays(projectEnd, projectStart) + 1;

    const timeline = Array.from({ length: totalDays }, (_, i) => addDays(projectStart, i));
    
    return { projectStart, projectEnd, totalDays, timeline };
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
            <div className="sticky top-0 bg-card z-10 py-2 font-semibold text-sm">Task Name</div>
            <div className='flex flex-col gap-2 pt-2'>
              {tasks.map(task => (
                <div key={task.id} className="text-sm p-2 rounded-md hover:bg-secondary transition-colors truncate cursor-pointer" onClick={() => onTaskClick(task)}>
                  {task.name}
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Timeline */}
          <div className="col-span-9 overflow-x-auto">
             <ScrollArea className="w-full h-full">
              <div style={{ width: `${totalDays * DAY_WIDTH}px` }} className="relative">
                {/* Timeline Header */}
                <div className="sticky top-0 bg-card z-10 grid" style={{ gridTemplateColumns: `repeat(${totalDays}, ${DAY_WIDTH}px)` }}>
                  {timeline.map(day => (
                    <div key={day.toString()} className="text-center text-xs py-2 border-r border-b">
                      <div>{format(day, 'dd')}</div>
                      <div className="text-muted-foreground">{format(day, 'E')}</div>
                    </div>
                  ))}
                </div>

                {/* Grid Background & Task Bars */}
                <div className="relative grid" style={{ gridTemplateColumns: `repeat(${totalDays}, ${DAY_WIDTH}px)` }}>
                  {/* Background Grid Lines */}
                  {timeline.map((day, i) => (
                     <div key={`bg-${i}`} className="border-r h-full" style={{ height: `${tasks.length * 40}px` }}></div>
                  ))}

                  {/* Task Bars */}
                  {tasks.map((task, index) => {
                    const offset = differenceInDays(startOfDay(task.start), projectStart) + 1;
                    const duration = differenceInDays(startOfDay(task.end), startOfDay(task.start)) + 1;
                    const isOutside = offset < 1 || offset > totalDays;

                    if (isOutside) return null;

                    return (
                      <TooltipProvider key={task.id} delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              onClick={() => onTaskClick(task)}
                              className="absolute h-8 rounded-md bg-primary/80 hover:bg-primary transition-all duration-200 cursor-pointer flex items-center px-2 overflow-hidden shadow"
                              style={{
                                top: `${index * 40 + 4}px`, // 40px per row, 4px top margin
                                gridColumn: `${offset} / span ${duration}`,
                                width: `${duration * DAY_WIDTH - 4}px`,
                                left: `${(offset - 1) * DAY_WIDTH + 2}px`,
                              }}
                            >
                              <div className="absolute top-0 left-0 h-full bg-primary rounded-md" style={{ width: `${task.progress}%` }}></div>
                              <span className="relative text-primary-foreground text-xs font-medium truncate z-10">{task.name}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-card border-primary">
                            <p className="font-bold">{task.name}</p>
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
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
