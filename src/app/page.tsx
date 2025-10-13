

'use client';

import GanttasticApp from "@/components/ganttastic-app";
import ProjectSidebar from "@/components/project-sidebar";
import { Sidebar, SidebarInset } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <>
      <Sidebar side="left" collapsible="icon">
        <ProjectSidebar onProjectChange={() => {}} currentProjectName="Ganttastic Plan" />
      </Sidebar>
      <SidebarInset>
        <GanttasticApp />
      </SidebarInset>
    </>
  );
}
