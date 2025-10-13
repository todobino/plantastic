
'use client';

import { useState } from 'react';
import GanttasticApp from "@/components/ganttastic-app";
import ProjectSidebar from "@/components/project-sidebar";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Home() {
    const [currentProject, setCurrentProject] = useState('Ganttastic Plan');
    return (
        <main className="flex h-screen w-full">
            <div className="w-[320px] border-r flex flex-col">
                <ProjectSidebar
                    currentProjectName={currentProject}
                    onProjectChange={setCurrentProject}
                />
            </div>
            <div className="flex-1">
                <GanttasticApp />
            </div>
        </main>
    );
}
