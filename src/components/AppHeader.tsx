import { useState, useEffect, useCallback } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { isDatasetScopedRoute } from "@/contexts/DatasetContext";
import { DatasetSelector } from "@/components/DatasetSelector";
import aiPrioriLogo from "@/assets/aipriori-logo.png";

const routeNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/data-ingestion": "Data Ingestion",
  "/data-preparation": "Data Preparation",
  "/data-processing": "Data Processing",
  "/digital-twin": "Digital Twin",
  "/vector-ai": "Vector Agents",
  "/bot": "Vector Agents",
  "/data-quality": "Data Quality Assessment",
  "/data-modelling": "Data Modelling",
  "/reports": "Reports",
  "/admin": "Administration",
};

const segmentLabels: Record<string, string> = {
  bot: "Vector Agents",
  "vector-ai": "Vector Agents",
};

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const breadcrumbParts = location.pathname.split("/").filter(Boolean);
  const showDatasetSelector = isDatasetScopedRoute(location.pathname);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const roleLabel = user
    ? Array.isArray(user.role) ? user.role[0] : user.role ?? "User"
    : null;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b bg-card px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {user && roleLabel && (
            <Badge variant="secondary" className="hidden sm:inline-flex text-[11px] shrink-0">
              {roleLabel}
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            className="hidden gap-2 text-muted-foreground sm:flex"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="text-xs">Search…</span>
            <kbd className="ml-4 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
          </Button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <img src={aiPrioriLogo} alt="AI Priori" className="h-7 sm:h-8 w-auto object-contain mr-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="User menu">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "#2a4a6a" }}
                >
                  {user?.username ? user.username.slice(0, 2).toUpperCase() : "?"}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user?.username}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex h-9 items-center justify-between gap-3 border-b bg-card px-4 sm:px-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-none min-w-0">
          <Link to="/dashboard" className="hover:text-foreground transition-colors shrink-0">
            Home
          </Link>
          {breadcrumbParts.map((part, i) => (
            <span key={i} className="flex items-center gap-1 shrink-0">
              <ChevronRight className="h-3 w-3" />
              <span className={i === breadcrumbParts.length - 1 ? "text-foreground font-medium" : ""}>
                {routeNames["/" + breadcrumbParts.slice(0, i + 1).join("/")] || segmentLabels[part] || part.replace(/-/g, " ")}
              </span>
            </span>
          ))}
        </div>
        {showDatasetSelector && <DatasetSelector compact className="shrink-0" />}
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Search Datapx1</DialogTitle>
          </DialogHeader>
          <Input placeholder="Type to search machines, datasets, reports…" autoFocus />
          <div className="py-8 text-center text-sm text-muted-foreground">
            Start typing to search across the platform
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
