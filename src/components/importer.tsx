
'use client';

import { useState, useTransition } from 'react';
import type { Task, Project, ExtractedProjectOutput, ExtractedTask } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { FileUp, Sparkles, Wand2, FilePlus2 } from 'lucide-react';
import { runExtractProjectFromFile } from '@/lib/actions';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Label } from './ui/label';

type ImporterProps = {
  onImport: (project: Project, tasks: Task[]) => void;
  onClose: () => void;
};

enum Stage {
  Choice,
  Upload,
  Processing,
  Review,
  Finished,
}

export default function Importer({ onImport, onClose }: ImporterProps) {
  const [stage, setStage] = useState<Stage>(Stage.Choice);
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [extractedData, setExtractedData] = useState<ExtractedProjectOutput | null>(null);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent(e.target?.result as string);
      };
      reader.readAsText(selectedFile);
    }
  };
  
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
       setFile(droppedFile);
       const reader = new FileReader();
       reader.onload = (e) => {
         setFileContent(e.target?.result as string);
       };
       reader.readAsText(droppedFile);
    }
  }
  
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }
  
  const createManualProject = () => {
    const newProject: Project = {
        id: `proj-${Date.now()}`,
        name: 'Untitled Project',
        description: 'A new project created manually.',
    };
    onImport(newProject, []);
    onClose();
  }

  const handleProcessFile = () => {
    if (!file || !fileContent) {
      setError('Please select a file to process.');
      return;
    }
    setError(null);
    setStage(Stage.Processing);
    startTransition(async () => {
      try {
        const fileType = file.type === 'text/csv' ? 'csv' : 'text';
        const result = await runExtractProjectFromFile({ fileContent, fileType });
        setExtractedData(result);
        setStage(Stage.Review);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        setStage(Stage.Upload);
      }
    });
  };

  const handleUpdateProjectName = (name: string) => {
    if (extractedData) {
      setExtractedData({ ...extractedData, projectName: name });
    }
  };

  const handleUpdateTask = (updatedTask: ExtractedTask) => {
    if (extractedData) {
        const newTasks = extractedData.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
        setExtractedData({ ...extractedData, tasks: newTasks });
    }
  }

  const handleFinishImport = () => {
    if (!extractedData) return;
    
    const newProject: Project = {
        id: `proj-${Date.now()}`,
        name: extractedData.projectName,
        description: extractedData.projectDescription,
    };
    
    // Convert string dates to Date objects
    const newTasks: Task[] = extractedData.tasks.map(t => ({
        ...t,
        start: new Date(t.startDate),
        end: new Date(t.endDate),
        color: '#3b82f6' // default color for imported tasks
    }));

    onImport(newProject, newTasks);
    setStage(Stage.Finished);
  };

  const renderContent = () => {
    switch (stage) {
      case Stage.Choice:
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-center">
                <Card className="hover:border-primary hover:shadow-lg transition-all cursor-pointer h-full flex flex-col" onClick={createManualProject}>
                    <CardHeader>
                        <FilePlus2 className="h-10 w-10 text-primary mb-2" />
                        <CardTitle>Create Manually</CardTitle>
                        <CardDescription>Start with a blank canvas and build your project from scratch.</CardDescription>
                    </CardHeader>
                </Card>
                <Card className="hover:border-primary hover:shadow-lg transition-all cursor-pointer h-full flex flex-col" onClick={() => setStage(Stage.Upload)}>
                    <CardHeader>
                        <Sparkles className="h-10 w-10 text-primary mb-2" />
                        <CardTitle>Import with AI</CardTitle>
                        <CardDescription>Upload a CSV or text file and let AI build your project plan automatically.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
      case Stage.Upload:
        return (
          <div className="flex flex-col items-center justify-center gap-4 h-full">
            <div 
              className="w-full p-10 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-primary"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <FileUp className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Drag & drop a CSV or text file here, or click to select a file.
              </p>
               <input id="file-upload" type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
            </div>
            {file && <p className="text-sm font-medium">Selected file: {file.name}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
             <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={() => setStage(Stage.Choice)}>Back</Button>
                <Button onClick={handleProcessFile} disabled={!file || isPending}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Process with AI
                </Button>
            </div>
          </div>
        );
        
      case Stage.Processing:
        return (
            <div className="flex flex-col items-center justify-center gap-4 h-full">
                <Wand2 className="h-12 w-12 text-primary animate-pulse" />
                <p className="text-lg font-medium">Analyzing your document...</p>
                <p className="text-sm text-muted-foreground">The AI is extracting tasks, dates, and milestones.</p>
                <div className="w-full space-y-4 mt-8">
                    <Skeleton className="h-8 w-3/4 mx-auto" />
                    <Skeleton className="h-4 w-1/2 mx-auto" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                </div>
            </div>
        )

      case Stage.Review:
        if (!extractedData) return null;
        return (
          <div className="h-full flex flex-col gap-4">
            <div className="space-y-1">
                <Label htmlFor="project-name-review">Project Name</Label>
                <Input
                    id="project-name-review"
                    value={extractedData.projectName}
                    onChange={(e) => handleUpdateProjectName(e.target.value)}
                    className="text-lg font-semibold"
                />
            </div>
            <p className="text-sm text-muted-foreground">{extractedData.projectDescription}</p>
            <h4 className="font-semibold mt-2">Extracted Tasks ({extractedData.tasks.length})</h4>
            <ScrollArea className="flex-grow border rounded-md p-2">
                <div className="space-y-4">
                    {extractedData.tasks.map((task) => (
                        <Card key={task.id} className="p-3">
                           <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                <Label>Task Name</Label>
                                <Input value={task.name} onChange={e => handleUpdateTask({...task, name: e.target.value})} />
                             </div>
                              <div className="space-y-1">
                                <Label>Milestone</Label>
                                <Input value={task.milestone || ''} onChange={e => handleUpdateTask({...task, milestone: e.target.value})} />
                             </div>
                             <div className="col-span-2 space-y-1">
                                <Label>Description</Label>
                                <Textarea value={task.description || ''} onChange={e => handleUpdateTask({...task, description: e.target.value})} rows={2} />
                             </div>
                             <div className="space-y-1">
                                <Label>Start Date</Label>
                                <Input type="date" value={task.startDate} onChange={e => handleUpdateTask({...task, startDate: e.target.value})} />
                             </div>
                             <div className="space-y-1">
                                <Label>End Date</Label>
                                <Input type="date" value={task.endDate} onChange={e => handleUpdateTask({...task, endDate: e.target.value})} />
                             </div>
                           </div>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
             <div className="flex justify-between items-center pt-4 mt-auto">
                <Button variant="outline" onClick={() => setStage(Stage.Upload)}>Back</Button>
                <Button onClick={handleFinishImport}>
                  Finish Import
                </Button>
            </div>
          </div>
        );
        case Stage.Finished:
            return <div className="text-center"><p>Project imported successfully!</p></div>
    }
  };

  return <div className="h-full">{renderContent()}</div>;
}
