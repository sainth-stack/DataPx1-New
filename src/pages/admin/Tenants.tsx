import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/DataTable";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { adminApi, type TenantRecord } from "@/lib/api/admin";

const types = ["ai-priori", "customer"];
type SortKey = "id" | "name" | "type";

const emptyForm = { name: "", type: "", timeout: "30" };
const perPage = 10;

export default function Tenants() {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const { items, pagination } = await adminApi.listTenants({
        page,
        page_size: perPage,
        sort: sortKey,
        direction: sortAsc ? "asc" : "desc",
      });
      setTenants(items);
      setTotalPages(pagination.total_pages);
      setTotalRecords(pagination.total_records);
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, sortKey, sortAsc]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  const filtered = tenants.filter(
    (t) => t.name.toLowerCase().includes(search.toLowerCase()) || t.type.toLowerCase().includes(search.toLowerCase())
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
    setPage(1);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setDialogMode("add");
    setDialogOpen(true);
  };

  const openEdit = (t: TenantRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setForm({ name: t.name, type: t.type, timeout: String(t.timeout ?? 30) });
    setEditId(t.id);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.type) {
      toast.error("Please fill all required fields");
      return;
    }
    setSaving(true);
    try {
      if (dialogMode === "add") {
        await adminApi.createTenant({ name: form.name, type: form.type, timeout: form.timeout });
        toast.success(`Tenant "${form.name}" added successfully`);
      } else if (editId !== null) {
        await adminApi.updateTenant(editId, { name: form.name, type: form.type, timeout: form.timeout });
        toast.success(`Tenant "${form.name}" updated successfully`);
      }
      setDialogOpen(false);
      await loadTenants();
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const tenant = tenants.find((t) => t.id === id);
    try {
      await adminApi.deleteTenant(id);
      setDeleteConfirm(null);
      toast.success(`Tenant "${tenant?.name}" deleted`);
      await loadTenants();
    } catch (err) {
      toast.error(adminApi.extractMessage(err));
    }
  };

  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(page * perPage, totalRecords);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tenants…" className="pl-9 rounded-input" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openAdd} className="rounded-button">
          <Plus className="mr-2 h-4 w-4" /> Add Tenant
        </Button>
      </div>

      <DataTable<TenantRecord>
        columns={[
          { key: "_no", header: "S.No", width: 80, sortable: true, render: (_v, _r, i) => rangeStart + i },
          { key: "name", header: "Name", sortable: true, render: (v) => <span className="font-medium">{String(v)}</span> },
          { key: "type", header: "Type", sortable: true, render: (v) => <Badge variant="outline" className="bg-muted/50">{String(v)}</Badge> },
          {
            key: "_actions",
            header: "",
            width: 120,
            render: (_v, t) => (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-accent" onClick={(e) => openEdit(t as TenantRecord, e)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteConfirm((t as TenantRecord).id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ),
          },
        ] as ColumnDef<TenantRecord>[]}
        rows={filtered}
        loading={loading}
        emptyMessage="No tenants found."
        getRowKey={(t) => t.id}
        pagination={{
          page: page - 1,
          pageSize: perPage,
          total: totalRecords,
          onPageChange: (p) => setPage(p + 1),
          pageSizeOptions: [10],
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{dialogMode === "add" ? "Add New Tenant" : "Edit Tenant"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Tenant name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-input" />
            </div>
            <div className="space-y-2">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="rounded-input"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Session timeout (minutes)</Label>
              <Input
                type="number"
                value={form.timeout}
                onChange={(e) => setForm({ ...form, timeout: e.target.value })}
                className="rounded-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-button" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-button" onClick={handleSave} disabled={saving}>{dialogMode === "add" ? "Add Tenant" : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete Tenant</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{tenants.find((t) => t.id === deleteConfirm)?.name}</strong>? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" className="rounded-button" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-button" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
