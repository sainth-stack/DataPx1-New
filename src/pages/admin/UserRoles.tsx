import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { adminApi, type RoleRecord, type OrganizationRecord } from "@/lib/api/admin";

const adminModules = ["Tenant", "Organization", "Users", "Roles", "Sessions"];
const adminActions = ["Read", "Create", "Write", "Delete"];
const appModules = ["Home", "Data Analysis", "Visualizations", "Missing Value Treatment", "AI Models", "KPI"];

function permKey(module: string, action: string) {
  return `${module.toLowerCase().replace(/ /g, "_")}_${action}`;
}

export default function UserRoles() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [roleName, setRoleName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [page] = useState(1);
  const [sortKey] = useState("id");
  const [sortAsc] = useState(true);
  const perPage = 50;

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await adminApi.listRoles({
        page,
        page_size: perPage,
        sort: sortKey,
        direction: sortAsc ? "asc" : "desc",
      });
      setRoles(items);
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, sortKey, sortAsc]);

  const loadOrganizations = useCallback(async () => {
    try {
      const { items } = await adminApi.listOrganizations({ page: 1, page_size: 100 });
      setOrganizations(items);
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const filtered = roles.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const togglePerm = (key: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openAdd = () => {
    setRoleName("");
    setOrganizationId("");
    setSelectedPerms(new Set());
    setEditId(null);
    setDialogMode("add");
    setDialogOpen(true);
  };

  const openEdit = (role: RoleRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setRoleName(role.name);
    setOrganizationId(role.organizationId);
    setSelectedPerms(new Set(role.permissions));
    setEditId(role.id);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!roleName) {
      toast.error("Please enter a role name");
      return;
    }
    if (!organizationId) {
      toast.error("Please select an organization");
      return;
    }
    const perms = Array.from(selectedPerms).join(",");
    setSaving(true);
    try {
      if (dialogMode === "add") {
        await adminApi.createRole({ name: roleName, permissions: perms, organization: organizationId });
        toast.success(`Role "${roleName}" added successfully`);
      } else if (editId !== null) {
        await adminApi.updateRole(editId, { permissions: perms, organization_id: organizationId });
        toast.success(`Role "${roleName}" updated successfully`);
      }
      setDialogOpen(false);
      await loadRoles();
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const role = roles.find((r) => r.id === id);
    try {
      await adminApi.deleteRole(id);
      setDeleteConfirm(null);
      toast.success(`Role "${role?.name}" deleted`);
      await loadRoles();
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search roles…" className="pl-9 rounded-input" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openAdd} className="rounded-button">
          <Plus className="mr-2 h-4 w-4" /> Add Role
        </Button>
      </div>

      <Card className="rounded-card overflow-hidden border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-20">S.No</TableHead>
              <TableHead>Role Name</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading roles…</TableCell></TableRow>
            ) : filtered.map((role, i) => (
              <TableRow key={role.id} className="hover:bg-muted/20">
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5 max-w-lg">
                    {role.permissions.slice(0, 6).map((p) => (
                      <Badge key={p} variant="outline" className="bg-accent/5 text-accent border-accent/20 text-xs font-normal">{p}</Badge>
                    ))}
                    {role.permissions.length > 6 && (
                      <Badge variant="outline" className="bg-muted text-muted-foreground text-xs">+{role.permissions.length - 6} more</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-accent" onClick={(e) => openEdit(role, e)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(role.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No roles found.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-end gap-4 border-t px-4 py-3 text-sm text-muted-foreground">
          <span>1-{filtered.length} of {filtered.length} items</span>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{dialogMode === "add" ? "Add New Role" : "Edit Role"}</DialogTitle></DialogHeader>
          <div className="space-y-6 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role Name <span className="text-destructive">*</span></Label>
                <Input
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="Enter role name"
                  className="rounded-input"
                  disabled={dialogMode === "edit"}
                />
              </div>
              <div className="space-y-2">
                <Label>Organization <span className="text-destructive">*</span></Label>
                <Select value={organizationId} onValueChange={setOrganizationId}>
                  <SelectTrigger className="rounded-input"><SelectValue placeholder="Select organization" /></SelectTrigger>
                  <SelectContent>
                    {organizations.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Permissions <span className="text-destructive">*</span></Label>

              <div className="mt-4">
                <h4 className="text-sm font-semibold">Admin Screens</h4>
                <p className="text-xs text-muted-foreground mb-3">These screens require full permissions management</p>
                <Card className="rounded-card overflow-hidden border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Module</TableHead>
                        {adminActions.map((a) => <TableHead key={a} className="text-center w-20">{a}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {adminModules.map((mod) => (
                        <TableRow key={mod} className="hover:bg-muted/20">
                          <TableCell className="font-medium text-sm">{mod}</TableCell>
                          {adminActions.map((action) => {
                            const key = permKey(mod, action);
                            return (
                              <TableCell key={action} className="text-center">
                                <Checkbox checked={selectedPerms.has(key)} onCheckedChange={() => togglePerm(key)} className="mx-auto" />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              <div className="mt-6">
                <h4 className="text-sm font-semibold">Application Screens</h4>
                <p className="text-xs text-muted-foreground mb-3">These screens only require Read/access permission</p>
                <Card className="rounded-card overflow-hidden border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Module</TableHead>
                        <TableHead className="text-center w-24">Access</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appModules.map((mod) => {
                        const key = permKey(mod, "Access");
                        return (
                          <TableRow key={mod} className="hover:bg-muted/20">
                            <TableCell className="font-medium text-sm">{mod}</TableCell>
                            <TableCell className="text-center">
                              <Checkbox checked={selectedPerms.has(key)} onCheckedChange={() => togglePerm(key)} className="mx-auto" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" className="rounded-button" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-button" onClick={handleSave} disabled={saving}>{dialogMode === "add" ? "Add Role" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Role</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{roles.find((r) => r.id === deleteConfirm)?.name}</strong>? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" className="rounded-button" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-button" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
