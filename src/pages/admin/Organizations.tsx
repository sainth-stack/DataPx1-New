import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { adminApi, type OrganizationRecord, type TenantRecord } from "@/lib/api/admin";

const emptyForm = { name: "", tenantId: "" };

export default function Organizations() {
  const [orgs, setOrgs] = useState<OrganizationRecord[]>([]);
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [form, setForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [page] = useState(1);
  const [sortKey] = useState("name");
  const [sortAsc] = useState(true);
  const perPage = 50;

  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await adminApi.listOrganizations({
        page,
        page_size: perPage,
        sort: sortKey,
        direction: sortAsc ? "asc" : "desc",
      });
      setOrgs(items);
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, sortKey, sortAsc]);

  const loadTenants = useCallback(async () => {
    try {
      const { items } = await adminApi.listTenants({ page: 1, page_size: 200 });
      setTenants(items);
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    }
  }, []);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const filtered = orgs.filter(
    (o) => o.name.toLowerCase().includes(search.toLowerCase()) || o.tenantName.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setForm({ ...emptyForm, tenantId: tenants[0] ? String(tenants[0].id) : "" });
    setLogoFile(null);
    setEditId(null);
    setDialogMode("add");
    setDialogOpen(true);
  };

  const openEdit = (o: OrganizationRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({ name: o.name, tenantId: o.tenantId });
    setLogoFile(null);
    setEditId(o.id);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.tenantId) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      const tenantId = Number(form.tenantId);
      if (dialogMode === "add") {
        await adminApi.createOrganization({ tenant_id: tenantId, name: form.name, logo: logoFile ?? undefined });
        toast.success(`Organization "${form.name}" added successfully`);
      } else if (editId !== null) {
        await adminApi.updateOrganization(editId, { tenant_id: tenantId, name: form.name, logo: logoFile ?? undefined });
        toast.success(`Organization "${form.name}" updated successfully`);
      }
      setDialogOpen(false);
      await loadOrganizations();
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const org = orgs.find((o) => o.id === id);
    try {
      await adminApi.deleteOrganization(id);
      setDeleteConfirm(null);
      toast.success(`Organization "${org?.name}" deleted`);
      await loadOrganizations();
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search organizations…" className="pl-9 rounded-input" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openAdd} className="rounded-button" disabled={saving || tenants.length === 0}>
          <Plus className="mr-2 h-4 w-4" /> Add Organization
        </Button>
      </div>

      <DataTable<OrganizationRecord>
        columns={[
          { key: "_no", header: "S.No", width: 80, render: (_v, _r, i) => i + 1 },
          { key: "name", header: "Name", render: (v) => <span className="font-medium">{String(v)}</span> },
          { key: "tenantName", header: "Tenant" },
          {
            key: "_actions",
            header: "",
            width: 120,
            render: (_v, o) => (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-accent" onClick={(e) => openEdit(o, e)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(o.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ),
          },
        ] as ColumnDef<OrganizationRecord>[]}
        rows={filtered}
        loading={loading}
        emptyMessage="No organizations found."
        getRowKey={(o) => o.id}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{dialogMode === "add" ? "Add New Organization" : "Edit Organization"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Organization name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-input" />
            </div>
            <div className="space-y-2">
              <Label>Tenant <span className="text-destructive">*</span></Label>
              <Select value={form.tenantId} onValueChange={(v) => setForm({ ...form, tenantId: v })}>
                <SelectTrigger className="rounded-input"><SelectValue placeholder="Select tenant" /></SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Logo (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                className="rounded-input"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-button" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-button" onClick={handleSave} disabled={saving}>{dialogMode === "add" ? "Add Organization" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Organization</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{orgs.find((o) => o.id === deleteConfirm)?.name}</strong>? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" className="rounded-button" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-button" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
