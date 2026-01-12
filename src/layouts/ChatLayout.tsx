import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

// Default user for internal app (no auth required)
const DEFAULT_USER = {
  id: "default-user-id",
  email: "user@desert-services.com",
  type: "regular" as const,
};

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
        <AppSidebar user={DEFAULT_USER} />
        <SidebarInset>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </DataStreamProvider>
  );
}
