import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function ChatLayout() {
  // Get sidebar state from localStorage
  const getSidebarState = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_state") === "true";
    }
    return true;
  };

  return (
    <DataStreamProvider>
      <SidebarProvider defaultOpen={getSidebarState()}>
        <AppSidebar user={undefined} />
        <SidebarInset>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </DataStreamProvider>
  );
}
