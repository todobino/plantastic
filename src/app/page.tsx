import GanttasticApp from "@/components/ganttastic-app";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <SidebarProvider>
      <main>
        <GanttasticApp />
      </main>
    </SidebarProvider>
  );
}
