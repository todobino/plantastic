
'use client';

import { useState } from 'react';
import GanttasticApp from "@/components/ganttastic-app";
import AppSidebar from "@/components/app-sidebar";

export default function Home() {
    const [currentProject, setCurrentProject] = useState('Plantastic Plan');
    const [isImporterOpen, setImporterOpen] = useState(false);

    return (
        <main className="flex h-screen w-full">
            <div className="w-[280px] border-r flex flex-col">
                <AppSidebar
                    currentProjectName={currentProject}
                    onProjectChange={setCurrentProject}
                    onNewProjectClick={() => setImporterOpen(true)}
                />
            </div>
            <div className="flex-1">
                <GanttasticApp
                    isImporterOpen={isImporterOpen}
                    setImporterOpen={setImporterOpen}
                    currentProjectName={currentProject}
                    onProjectNameChange={setCurrentProject}
                />
            </div>
        </main>
    );
}
