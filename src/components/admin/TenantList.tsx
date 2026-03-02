import { useState } from "react";
import { motion } from "framer-motion";
import { Store, Search, Plus, ToggleLeft, ToggleRight, Pencil, Eye, Trash2, MoreHorizontal, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TenantForm from "./TenantForm";
import TenantDetails from "./TenantDetails";
import TenantAdminManager from "./TenantAdminManager";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  owner_id: string | null;
}

interface TenantListProps {
  tenants: Tenant[];
  userId: string;
  onRefresh: () => void;
}

const TenantList = ({ tenants, userId, onRefresh }: TenantListProps) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [detailsTenant, setDetailsTenant] = useState<Tenant | null>(null);
  const [adminTenant, setAdminTenant] = useState<Tenant | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()) ||
      (t.email && t.email.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter =
      filter === "all" || (filter === "active" && t.is_active) || (filter === "inactive" && !t.is_active);
    return matchesSearch && matchesFilter;
  });

  const toggleTenant = async (id: string, active: boolean) => {
    const { error } = await supabase
      .from("tenants")
      .update({ is_active: !active })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Tenant ${active ? "deactivated" : "activated"}`);
      onRefresh();
    }
  };

  const deleteTenant = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    const { error } = await supabase.from("tenants").delete().eq("id", deleteDialog.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Tenant deleted");
      setDeleteDialog(null);
      onRefresh();
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditTenant(tenant);
    setFormOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{tenants.length} total tenants</p>
        </div>
        <Button
          onClick={() => { setEditTenant(null); setFormOpen(true); }}
          className="teal-gradient text-primary-foreground transition-all duration-200 active:scale-95 shadow-teal-sm hover:shadow-teal-md gap-2"
        >
          <Plus className="w-4 h-4" /> Add Tenant
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, slug, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground shadow-teal-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl shadow-teal-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="table-header text-left p-4">Salon</th>
                <th className="table-header text-left p-4 hidden md:table-cell">Slug</th>
                <th className="table-header text-left p-4 hidden lg:table-cell">Contact</th>
                <th className="table-header text-center p-4">Status</th>
                <th className="table-header text-left p-4 hidden xl:table-cell">Created</th>
                <th className="table-header text-center p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tenant, i) => (
                <motion.tr
                  key={tenant.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Store className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <span className="font-semibold text-sm text-foreground block">{tenant.name}</span>
                        {tenant.address && (
                          <span className="text-xs text-muted-foreground">{tenant.address}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground hidden md:table-cell font-mono">{tenant.slug}</td>
                  <td className="p-4 hidden lg:table-cell">
                    <div className="text-sm text-muted-foreground">
                      {tenant.email && <p>{tenant.email}</p>}
                      {tenant.phone && <p className="text-xs">{tenant.phone}</p>}
                      {!tenant.email && !tenant.phone && <p>—</p>}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        tenant.is_active
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {tenant.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground hidden xl:table-cell">
                    {new Date(tenant.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setDetailsTenant(tenant)}>
                          <Eye className="w-4 h-4 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(tenant)}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit Tenant
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAdminTenant(tenant)}>
                          <UserPlus className="w-4 h-4 mr-2" /> Manage Admins
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleTenant(tenant.id, tenant.is_active)}>
                          {tenant.is_active ? (
                            <><ToggleLeft className="w-4 h-4 mr-2" /> Deactivate</>
                          ) : (
                            <><ToggleRight className="w-4 h-4 mr-2" /> Activate</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteDialog(tenant)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete Tenant
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-muted-foreground text-sm">
                    {search || filter !== "all" ? "No tenants match your filters." : "No tenants yet. Create your first tenant!"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialogs */}
      <TenantForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditTenant(null); }}
        tenant={editTenant}
        userId={userId}
        onSuccess={onRefresh}
      />

      {detailsTenant && (
        <TenantDetails
          open={!!detailsTenant}
          onOpenChange={(open) => { if (!open) setDetailsTenant(null); }}
          tenant={detailsTenant}
        />
      )}

      {adminTenant && (
        <TenantAdminManager
          open={!!adminTenant}
          onOpenChange={(open) => { if (!open) setAdminTenant(null); }}
          tenant={adminTenant}
        />
      )}

      <AlertDialog open={!!deleteDialog} onOpenChange={(open) => { if (!open) setDeleteDialog(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteDialog?.name}</strong> and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteTenant} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default TenantList;
