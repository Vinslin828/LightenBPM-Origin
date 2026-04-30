import { useAtom } from "jotai";
import { sidebarCollapsedAtom } from "@/store/atoms";
import { Sidebar } from "@/components/sidebar";
import { Header } from "./Header";
import { cn } from "@/utils/cn";

interface LayoutProps {
  children: React.ReactNode;
  hideSidebar?: boolean;
}

export const Layout = ({ children, hideSidebar = false }: LayoutProps) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);

  return (
    <div className="h-screen flex flex-col overflow-auto">
      <Header />

      <div className="flex bg-gray-3 flex-1">
        {!hideSidebar && <Sidebar />} {/* Corrected logic */}
        <div
          className={cn(
            "flex-1 flex flex-col transition-all duration-300",
            hideSidebar ? "ml-0" : sidebarCollapsed ? "ml-16" : "ml-64", // Conditional margin
          )}
        >
          {/* Header Bar */}

          {/* Main content */}
          <main
            className={cn(
              "h-[calc(100dvh-44px)]",
              hideSidebar && "w-dvw",
              !hideSidebar && sidebarCollapsed && "w-[calc(100dvw-64px)]",
              !hideSidebar && !sidebarCollapsed && "w-[calc(100dvw-256px)]",
            )}
          >
            {children}
          </main>
        </div>
        {/* Mobile overlay */}
        {!sidebarCollapsed && !hideSidebar && (
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
      </div>
    </div>
  );
};
