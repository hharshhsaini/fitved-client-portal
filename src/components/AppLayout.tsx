import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { MobileBottomNav } from "./MobileBottomNav";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col min-h-0">
          <TopBar />
          {/* pb-24 gives clearance for the fixed bottom nav on mobile */}
          <main className="flex-1 overflow-auto pb-24 md:pb-0 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-6xl animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <MobileBottomNav />
    </SidebarProvider>
  );
}
