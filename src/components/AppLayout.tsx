import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { VectorAIAssistant } from "@/components/VectorAIAssistant";
import { SidebarStateProvider, useSidebarState } from "@/hooks/use-sidebar-state";
import { MachineScopeProvider } from "@/contexts/MachineScopeContext";
import { DatasetProvider } from "@/contexts/DatasetContext";

function LayoutInner() {
  const { collapsed } = useSidebarState();

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div
        className="flex flex-1 flex-col transition-all duration-200"
        style={{ marginLeft: collapsed ? 56 : 240 }}
      >
        <AppHeader />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      <VectorAIAssistant />
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarStateProvider>
      <DatasetProvider>
        <MachineScopeProvider>
          <LayoutInner />
        </MachineScopeProvider>
      </DatasetProvider>
    </SidebarStateProvider>
  );
}
