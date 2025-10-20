
'use client';

import { useState } from 'react';
import GanttasticApp from "@/components/ganttastic-app";
import AppSidebar from "@/components/app-sidebar";

export default function Home() {
    const [currentProject, setCurrentProject] = useState('Plandalf Plan');
    const [isImporterOpen, setImporterOpen] = useState(false);

    return (
        <main className="flex h-screen w-full">
            <div className="w-[240px] border-r flex flex-col">
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
                />
            </div>
        </main>
    );
}
