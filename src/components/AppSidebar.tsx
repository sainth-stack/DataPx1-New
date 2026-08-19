import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Database, LayoutDashboard, Boxes, Shield,
  ChevronLeft, ChevronRight, ArrowLeft, Building2, Users, ShieldCheck, Clock, LogOut, FlaskConical, FileText,
  Workflow, Sparkles, Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/hooks/use-sidebar-state";
import { useAuth } from "@/contexts/AuthContext";
import { DatapxLogo } from "@/components/DatapxLogo";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

const mainNavItems = [
  { title: "Digital Twin", path: "/digital-twin", icon: Network, disabled: false },
  { title: "Data Preparation", path: "/data-preparation", icon: FlaskConical, disabled: false },
  { title: "Data Ingestion", path: "/data-ingestion", icon: Database, disabled: false },
  { title: "Data Processing", path: "/data-processing", icon: Workflow, disabled: false },
  { title: "Data Quality Assessment", path: "/data-quality", icon: ShieldCheck, disabled: false },
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard, disabled: false },
  { title: "Data Modelling", path: "/data-modelling", icon: Boxes, disabled: false },
  { title: "Vector Agents", path: "/vector-ai", icon: Sparkles, disabled: false },
  { title: "Reports", path: "/reports", icon: FileText, disabled: false },
  { title: "Administration", path: "/admin", icon: Shield, disabled: false },
];

const adminNavItems = [
  { title: "Tenants", path: "/admin/tenants", icon: Building2 },
  { title: "Organizations", path: "/admin/organizations", icon: Building2 },
  { title: "User Roles", path: "/admin/user-roles", icon: ShieldCheck },
  { title: "Users", path: "/admin/users", icon: Users },
  { title: "User Sessions", path: "/admin/user-sessions", icon: Clock },
];



export function AppSidebar() {
  const { collapsed, toggle } = useSidebarState();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isAdminRoute = location.pathname.startsWith("/admin");
  const navItems = isAdminRoute ? adminNavItems : mainNavItems;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col transition-all duration-200 rounded-[10px]",
        collapsed ? "w-sidebar-collapsed" : "w-sidebar-expanded"
      )}
      style={{ background: "#1a2a3a" }}
    >
      {/* Logo header */}
      <div
        className={cn(
          "flex items-center border-b border-white/[0.06]",
          collapsed ? "justify-center px-2 h-20" : "justify-start px-4 h-20"
        )}
        style={{ borderRadius: "10px 10px 0 0" }}
      >
        <DatapxLogo collapsed={collapsed} />
      </div>

      {/* User Profile */}
      <div className={cn(
        "border-b border-white/[0.06] px-3 py-3",
        collapsed ? "flex justify-center" : "flex items-center gap-3"
      )}>
        <div className="relative h-9 w-9 shrink-0">
          <div className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "#2a4a6a" }}>
            {user?.username ? user.username.slice(0, 2).toUpperCase() : "?"}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 bg-emerald-400" style={{ borderColor: "#1a2a3a" }} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white truncate">{user?.username || "Guest"}</p>
            <p className="text-[11px] truncate" style={{ color: "#7a9ab5" }}>
              {Array.isArray(user?.role) ? user.role[0] : user?.role ?? ""}
            </p>
          </div>
        )}
      </div>

      {/* Back button for admin */}
      {isAdminRoute && (
        <div className="px-2 pt-3 pb-1">
          <button
            onClick={() => navigate("/dashboard")}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors w-full hover:bg-white/[0.06]"
            )}
            style={{ color: "#8aaec8" }}
            title="Back to Home"
          >
            <ArrowLeft className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Back to Home</span>}
          </button>
        </div>
      )}

      <nav className="flex-1 space-y-[2px] px-2 py-3 overflow-y-auto">
        <TooltipProvider>
          {navItems.map((item) => {
            const active = isAdminRoute
              ? location.pathname === item.path
              : location.pathname.startsWith(item.path);
            
            if (item.disabled) {
              return (
                <UITooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150 cursor-not-allowed opacity-50"
                      )}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        color: "#6a8aa8",
                      }}
                    >
                      <item.icon
                        className="h-[18px] w-[18px] shrink-0"
                        style={{ color: "#6a8aa8" }}
                      />
                      {!collapsed && <span>{item.title}</span>}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-card border">
                    <div className="text-xs">
                      <p className="font-semibold mb-1">Coming Soon</p>
                      <p className="text-muted-foreground">This feature is currently in development</p>
                    </div>
                  </TooltipContent>
                </UITooltip>
              );
            }
            
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.title}
                className={cn(
                  "group flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-150",
                  active ? "font-bold text-white" : "hover:bg-white/[0.05]"
                )}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  ...(active
                    ? { background: "#2a4a6a", color: "#ffffff" }
                    : { color: "#8aaec8" }),
                }}
              >
                <item.icon
                  className="h-[18px] w-[18px] shrink-0"
                  style={{ color: active ? "#ffffff" : "#8aaec8" }}
                />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </TooltipProvider>
      </nav>

      {/* Sign Out */}
      <button
        onClick={handleLogout}
        className={cn(
          "flex items-center gap-3 border-t border-white/[0.06] px-4 py-3 text-sm font-medium transition-colors hover:bg-white/[0.06]",
          collapsed ? "justify-center px-2" : ""
        )}
        style={{ color: "#8aaec8" }}
        title="Sign Out"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!collapsed && <span>Sign Out</span>}
      </button>

      <button
        onClick={toggle}
        className="flex h-10 items-center justify-center border-t border-white/[0.06] transition-colors"
        style={{ color: "#8aaec8" }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}
