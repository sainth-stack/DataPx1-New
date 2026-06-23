import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { adminApi, type UserRecord, type OrganizationRecord, type RoleRecord } from "@/lib/api/admin";

const statuses: UserRecord["status"][] = ["Active", "Inactive"];

const statusColor: Record<UserRecord["status"], string> = {
  Active: "bg-success/10 text-success border-success/20",
  Inactive: "bg-muted text-muted-foreground",
};

const emptyForm = { name: "", email: "", password: "", organizationId: "", role: "", status: "Active" as UserRecord["status"] };

export default function Users() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { terminateUserSessions } = useAuth();

  const [page] = useState(1);
  const [sortKey] = useState("username");
  const [sortAsc] = useState(true);
  const perPage = 50;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await adminApi.listUsers({
        page,
        page_size: perPage,
        sort: sortKey,
        direction: sortAsc ? "asc" : "desc",
      });
      setUsers(items);
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, sortKey, sortAsc]);

  const loadDropdowns = useCallback(async () => {
    try {
      const [orgsRes, rolesRes] = await Promise.all([
        adminApi.listOrganizations({ page: 1, page_size: 100 }),
        adminApi.listRoles({ page: 1, page_size: 100 }),
      ]);
      setOrganizations(orgsRes.items);
      setRoles(rolesRes.items);
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadDropdowns();
  }, [loadDropdowns]);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setDialogMode("add");
    setDialogOpen(true);
  };

  const openEdit = (u: UserRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      organizationId: u.organizationId ?? "",
      role: u.role !== "—" ? u.role : "",
      status: u.status,
    });
    setEditId(u.id);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email || !form.organizationId || !form.role) {
      toast.error("Please fill all required fields");
      return;
    }
    if (dialogMode === "add" && !form.password) {
      toast.error("Password is required for new users");
      return;
    }
    setSaving(true);
    try {
      if (dialogMode === "add") {
        await adminApi.createUser({
          username: form.name,
          email: form.email,
          password: form.password,
          organization: form.organizationId,
          roles: form.role,
        });
        toast.success(`User "${form.name}" added`);
      } else if (editId) {
        await adminApi.updateUser(editId, {
          username: form.name,
          email: form.email,
          password: form.password || undefined,
          status: form.status === "Active",
          organization: form.organizationId,
          role: form.role,
        });
        toast.success(`User "${form.name}" updated`);
      }
      setDialogOpen(false);
      await loadUsers();
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const user = users.find((u) => u.id === id);
    try {
      await adminApi.deleteUser(id);
      setDeleteConfirm(null);
      if (user) {
        terminateUserSessions(user.email.toLowerCase());
        toast.success(`User "${user.name}" removed and sessions terminated`);
      }
      await loadUsers();
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users…"
            className="pl-9 rounded-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openAdd} className="rounded-button">
          <Plus className="mr-2 h-4 w-4" /> Add User
        </Button>
      </div>

      <DataTable<UserRecord>
        columns={[
          { key: "_no", header: "S.No", width: 64, render: (_v, _r, i) => i + 1 },
          {
            key: "name",
            header: "Name",
            render: (v, u) => (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold shrink-0">
                  {(u as UserRecord).name.split(" ").map((n: string) => n[0]).join("")}
                </div>
                <span className="font-medium">{String(v)}</span>
              </div>
            ),
          },
          { key: "email", header: "Email" },
          { key: "role", header: "Title", render: (v) => <span className="text-muted-foreground">{String(v ?? "")}</span> },
          { key: "lastActive", header: "Last Active", render: (v) => <span className="text-muted-foreground">{String(v ?? "")}</span> },
          {
            key: "status",
            header: "Status",
            render: (v) => <Badge variant="outline" className={statusColor[v as UserRecord["status"]]}>{String(v)}</Badge>,
          },
          {
            key: "_actions",
            header: "",
            width: 110,
            render: (_v, u) => (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-accent" onClick={(e) => openEdit(u as UserRecord, e)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirm((u as UserRecord).id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ),
          },
        ] as ColumnDef<UserRecord>[]}
        rows={filtered}
        loading={loading}
        emptyMessage="No users found."
        getRowKey={(u) => u.id}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialogMode === "add" ? "Add New User" : "Edit User"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="john@datapx1.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="rounded-input"
                />
              </div>
            </div>
            {dialogMode === "add" && (
              <div className="space-y-2">
                <Label>Password <span className="text-destructive">*</span></Label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="rounded-input"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization <span className="text-destructive">*</span></Label>
                <Select value={form.organizationId} onValueChange={(v) => setForm({ ...form, organizationId: v })}>
                  <SelectTrigger className="rounded-input"><SelectValue placeholder="Select organization" /></SelectTrigger>
                  <SelectContent>
                    {organizations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title <span className="text-destructive">*</span></Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger className="rounded-input"><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as UserRecord["status"] })}>
                <SelectTrigger className="rounded-input"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-button" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-button" onClick={handleSave} disabled={saving}>
              {dialogMode === "add" ? "Add User" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{users.find((u) => u.id === deleteConfirm)?.name}</strong>? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" className="rounded-button" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-button" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
