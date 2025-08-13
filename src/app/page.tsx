import GanttasticApp from "@/components/ganttastic-app";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function Home() {
  return (
    <SidebarProvider>
      <main className="flex w-full min-w-0 overflow-x-clip">
        <div className="flex-1 min-w-0">
          <GanttasticApp />
        </div>
      </main>
    </SidebarProvider>
  );
}
