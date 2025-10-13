
'use client';

import GanttasticApp from "@/components/ganttastic-app";
import ProjectSidebar from "@/components/project-sidebar";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon">
        <ProjectSidebar onProjectChange={() => {}} currentProjectName="Ganttastic Plan" />
      </Sidebar>
      <SidebarInset>
        <GanttasticApp />
      </SidebarInset>
    </SidebarProvider>
  );
}
