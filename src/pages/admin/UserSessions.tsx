import { useMemo, useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Search, PowerOff, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi, type SessionRecord } from "@/lib/api/admin";

function formatRelative(value: string): string {
  if (!value || value === "—") return "—";
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return value;
  const diff = Math.max(0, Date.now() - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatAbsolute(value: string): string {
  if (!value || value === "—") return "—";
  const ts = new Date(value);
  return Number.isNaN(ts.getTime()) ? value : ts.toLocaleString();
}

function shortDevice(info: string): string {
  if (!info || info === "—") return "—";
  if (info.includes("Chrome")) return "Chrome";
  if (info.includes("Firefox")) return "Firefox";
  if (info.includes("Safari")) return "Safari";
  if (info.includes("Edg")) return "Edge";
  return info.slice(0, 24);
}

function initials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export default function UserSessions() {
  const { sessionId } = useAuth();
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<SessionRecord | null>(null);
  const [terminating, setTerminating] = useState(false);

  const [page] = useState(1);
  const [sortKey] = useState("id");
  const [sortAsc] = useState(false);
  const perPage = 50;

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const { items, activeCount: count } = await adminApi.listSessions({
        page,
        page_size: perPage,
        sort: sortKey,
        direction: sortAsc ? "asc" : "desc",
      });
      const active = items.filter((s) => s.status === "active" || s.logoutTime == null);
      setSessions(active);
      setActiveCount(count ?? active.length);
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, sortKey, sortAsc]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filtered = useMemo(
    () =>
      sessions.filter((s) =>
        `${s.userName} ${s.userEmail} ${s.orgName}`.toLowerCase().includes(search.toLowerCase())
      ),
    [sessions, search]
  );

  const doTerminate = async (s: SessionRecord) => {
    setTerminating(true);
    try {
      await adminApi.terminateSession(s.id);
      toast.success(`Terminated session for ${s.userName}`);
      setConfirm(null);
      await loadSessions();
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    } finally {
      setTerminating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Active Sessions</h2>
          <p className="text-xs text-muted-foreground">
            One user = one active login. Terminating a session signs the user out immediately.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            {activeCount} active
          </Badge>
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search sessions…"
              className="pl-9 rounded-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Card className="rounded-card overflow-hidden border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Login</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Device</TableHead>
              <TableHead className="w-32 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading sessions…
                </TableCell>
              </TableRow>
            ) : filtered.map((s) => {
              const isSelf = s.id === sessionId;
              return (
                <TableRow key={s.id} className="hover:bg-muted/20">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold shrink-0">
                        {initials(s.userName)}
                      </div>
                      <span>{s.userName}</span>
                      {isSelf && (
                        <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent border-accent/30">
                          You
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.userEmail}</TableCell>
                  <TableCell className="text-muted-foreground">{s.orgName}</TableCell>
                  <TableCell className="text-xs font-mono" title={formatAbsolute(s.loginTime)}>
                    {formatRelative(s.loginTime)}
                  </TableCell>
                  <TableCell className="text-xs font-mono" title={formatAbsolute(s.loginTime)}>
                    {formatRelative(s.loginTime)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{shortDevice(s.deviceInfo)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-button text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setConfirm(s)}
                    >
                      <PowerOff className="mr-1.5 h-3.5 w-3.5" /> Terminate
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No active sessions.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!confirm} onOpenChange={() => setConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" /> Terminate session?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{confirm?.userName}</strong> will be signed out immediately from their device.
          </p>
          <DialogFooter>
            <Button variant="outline" className="rounded-button" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              className="rounded-button"
              onClick={() => confirm && doTerminate(confirm)}
              disabled={terminating}
            >
              Terminate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
